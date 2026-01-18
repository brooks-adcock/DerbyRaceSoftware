"""Pinewood Derby Track Controller API.

FastAPI server for controlling the race gate, reading sensors, and reporting results.
"""

import os
import json
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from typing import List, Optional

from models import HeatSetup, HeatResult, GatePosition, HealthResponse, ServoCalibration, ServoTestRequest
from storage import HistoryManager
from hardware import MakeHardware
from discovery import registerService, unregisterService

# Configuration from environment
NUM_TRACKS = int(os.environ.get("NUM_TRACKS", 4))
API_PORT = int(os.environ.get("API_PORT", 8000))

# Global state
history_manager = HistoryManager()
hardware = None
active_websockets: List[WebSocket] = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle management."""
    global hardware
    
    # Startup
    hardware = MakeHardware(NUM_TRACKS)
    registerService(NUM_TRACKS, API_PORT)
    print(f"Track Controller API started with {NUM_TRACKS} tracks")
    
    yield
    
    # Shutdown
    unregisterService()
    if hasattr(hardware, "cleanup"):
        hardware.cleanup()
    print("Track Controller API shut down")


app = FastAPI(
    title="Pinewood Derby Track Controller",
    description="API for controlling race gate and reading finish sensors",
    version="1.0.0",
    lifespan=lifespan,
)


# ----- Health & Discovery -----

@app.get("/health", response_model=HealthResponse)
def healthCheck():
    """Health check endpoint for service discovery."""
    return HealthResponse(
        status="healthy",
        num_tracks=hardware.num_tracks,
        is_gate_down=hardware.is_gate_down,
        current_heat_id=hardware.current_heat.heat_id if hardware.current_heat else None,
    )


# ----- Gate Control -----

@app.get("/gate")
def getGatePosition():
    """Get current gate position."""
    return {"is_gate_down": hardware.is_gate_down}


@app.post("/gate")
def setGatePosition(position: GatePosition):
    """Set gate position (up or down)."""
    hardware.setGate(position.is_down)
    return {"is_gate_down": hardware.is_gate_down}


# ----- Servo Calibration -----

@app.get("/servo/calibration")
def getServoCalibration():
    """Get current servo angle calibration."""
    return hardware.getCalibration()


@app.post("/servo/calibration")
def setServoCalibration(calibration: ServoCalibration):
    """
    Set servo angle calibration.
    
    Angles depend on your track geometry:
    - up_angle: Angle when gate holds cars (before race)
    - down_angle: Angle when gate releases cars (race start)
    """
    return hardware.setCalibration(calibration.up_angle, calibration.down_angle)


@app.post("/servo/test")
def testServoAngle(request: ServoTestRequest):
    """
    Move servo to a specific angle for testing/calibration.
    
    Use this to find the correct up_angle and down_angle for your track.
    Angle range: 0-180 degrees.
    """
    hardware.testServoAngle(request.angle)
    return {"angle": request.angle, "message": f"Servo moved to {request.angle}°"}


# ----- Race Execution -----

@app.post("/race/run")
async def runRace(setup: HeatSetup):
    """
    Start a race heat.
    
    Accepts heat_id and occupied_lanes, drops the gate, monitors sensors,
    and returns results. Results are also broadcast via WebSocket and persisted.
    """
    # Validate lanes
    for lane in setup.occupied_lanes:
        if lane < 1 or lane > hardware.num_tracks:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid lane {lane}. Must be 1-{hardware.num_tracks}"
            )
    
    # Prepare and run the race
    hardware.prepareRace(setup)
    result = await hardware.runRace()
    
    # Persist result
    result_dict = result.model_dump(mode="json")
    history_manager.saveHeat(result_dict)
    
    # Broadcast to WebSocket clients
    await broadcastResult(result_dict)
    
    return result_dict


async def broadcastResult(result: dict):
    """Broadcast race result to all connected WebSocket clients."""
    message = json.dumps({"type": "race_result", "data": result})
    disconnected = []
    
    for ws in active_websockets:
        try:
            await ws.send_text(message)
        except Exception:
            disconnected.append(ws)
    
    # Clean up disconnected clients
    for ws in disconnected:
        active_websockets.remove(ws)


# ----- History / State Recovery -----

@app.get("/history")
def getHistory(limit: int = 100):
    """Get recent heat results for state recovery."""
    heats = history_manager.getHeats(limit)
    return {"heats": heats, "count": len(heats)}


@app.get("/history/{heat_id}")
def getHeatById(heat_id: str):
    """Get a specific heat result by ID."""
    heat = history_manager.getHeatById(heat_id)
    if not heat:
        raise HTTPException(status_code=404, detail=f"Heat {heat_id} not found")
    return heat


@app.get("/history/last")
def getLastHeat():
    """Get the most recent heat result."""
    heat = history_manager.getLastHeat()
    if not heat:
        raise HTTPException(status_code=404, detail="No heats recorded yet")
    return heat


# ----- WebSocket for Real-time Results -----

@app.websocket("/ws/results")
async def resultsWebsocket(websocket: WebSocket):
    """
    WebSocket endpoint for real-time race results.
    
    Clients connect here to receive race results as they complete.
    Also supports ping/pong for connection health.
    """
    await websocket.accept()
    active_websockets.append(websocket)
    print(f"WebSocket client connected. Total clients: {len(active_websockets)}")
    
    try:
        while True:
            # Handle incoming messages (ping/pong, etc.)
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                msg_type = message.get("type")
                
                if msg_type == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
                elif msg_type == "get_status":
                    status = hardware.getStatus()
                    await websocket.send_text(json.dumps({"type": "status", "data": status}))
                    
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({"type": "error", "message": "Invalid JSON"}))
                
    except WebSocketDisconnect:
        pass
    finally:
        if websocket in active_websockets:
            active_websockets.remove(websocket)
        print(f"WebSocket client disconnected. Total clients: {len(active_websockets)}")


# ----- Manual Entry Point (for direct python execution) -----

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=API_PORT)
