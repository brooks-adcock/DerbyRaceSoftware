"""Hardware interface for GPIO, servo, and sensor control.

Supports both real Raspberry Pi hardware and mock mode for local development.
"""

import os
import asyncio
import random
from typing import List, Optional, Callable
from datetime import datetime
from models import HeatSetup, LaneResult, HeatResult

# Constants
DEFAULT_GATE_UP_POSITION = 90
DEFAULT_GATE_DOWN_POSITION = 0
SENSOR_TIMEOUT_SEC = 30.0  # Max time to wait for all cars to finish


class HardwareInterface:
    """Base hardware interface - subclassed for real/mock implementations."""
    
    def __init__(self, num_tracks: int = 4):
        self.num_tracks = num_tracks
        self.is_gate_down = False
        self.current_heat: Optional[HeatSetup] = None
        self._result_callback: Optional[Callable] = None
    
    def setResultCallback(self, callback: Callable):
        """Set callback function to be called when race results are ready."""
        self._result_callback = callback
    
    def setGate(self, is_down: bool):
        """Set gate position (up or down)."""
        raise NotImplementedError
    
    def prepareRace(self, setup: HeatSetup):
        """Prepare for a race with given configuration."""
        self.current_heat = setup
    
    async def runRace(self) -> HeatResult:
        """Execute the race and return results."""
        raise NotImplementedError
    
    def getStatus(self) -> dict:
        """Get current hardware status."""
        return {
            "num_tracks": self.num_tracks,
            "is_gate_down": self.is_gate_down,
            "current_heat_id": self.current_heat.heat_id if self.current_heat else None,
        }


class MockHardware(HardwareInterface):
    """Mock hardware for local development and testing."""
    
    def setGate(self, is_down: bool):
        self.is_gate_down = is_down
        position = "DOWN" if is_down else "UP"
        print(f"[MOCK] Gate moved to {position}")
    
    async def runRace(self) -> HeatResult:
        """Simulate a race with random finish times."""
        if not self.current_heat:
            raise ValueError("No heat configured - call prepareRace first")
        
        started_at = datetime.now()
        
        # Simulate gate drop
        self.setGate(True)
        print(f"[MOCK] Race started for heat {self.current_heat.heat_id}")
        
        # Simulate race duration (2-5 seconds typical)
        await asyncio.sleep(random.uniform(2.0, 5.0))
        
        # Generate mock results for occupied lanes only
        lane_results: List[LaneResult] = []
        finish_times = []
        
        for lane in self.current_heat.occupied_lanes:
            # Random finish time between 2.5 and 4.5 seconds
            finish_time = random.uniform(2500, 4500)
            finish_times.append((lane, finish_time))
        
        # Sort by finish time to assign places
        finish_times.sort(key=lambda x: x[1])
        
        for place, (lane, finish_time) in enumerate(finish_times, start=1):
            lane_results.append(LaneResult(
                lane_number=lane,
                finish_time_ms=round(finish_time, 2),
                place=place,
                is_dnf=False,
            ))
        
        # Add empty results for unoccupied lanes
        occupied_set = set(self.current_heat.occupied_lanes)
        for lane in range(1, self.num_tracks + 1):
            if lane not in occupied_set:
                lane_results.append(LaneResult(
                    lane_number=lane,
                    finish_time_ms=None,
                    place=None,
                    is_dnf=False,
                ))
        
        # Sort by lane number for consistent output
        lane_results.sort(key=lambda x: x.lane_number)
        
        result = HeatResult(
            heat_id=self.current_heat.heat_id,
            started_at=started_at,
            finished_at=datetime.now(),
            lane_results=lane_results,
            is_complete=True,
        )
        
        # Raise gate back up
        self.setGate(False)
        print(f"[MOCK] Race complete: {result}")
        
        return result


class RealHardware(HardwareInterface):
    """Real Raspberry Pi hardware interface using GPIO."""
    
    def __init__(self, num_tracks: int = 4):
        super().__init__(num_tracks)
        self._initGpio()
    
    def _initGpio(self):
        """Initialize GPIO pins for servo and sensors."""
        try:
            import RPi.GPIO as GPIO
            self.GPIO = GPIO
            GPIO.setmode(GPIO.BCM)
            
            # Servo pin (configurable via env)
            self.servo_pin = int(os.environ.get("SERVO_PIN", 18))
            GPIO.setup(self.servo_pin, GPIO.OUT)
            self.servo_pwm = GPIO.PWM(self.servo_pin, 50)  # 50Hz for servo
            self.servo_pwm.start(0)
            
            # Sensor pins (one per lane, configurable via env)
            # Default: GPIO 17, 27, 22, 23 for lanes 1-4
            default_sensor_pins = [17, 27, 22, 23]
            self.sensor_pins = []
            for i in range(self.num_tracks):
                pin = int(os.environ.get(f"SENSOR_PIN_{i+1}", default_sensor_pins[i]))
                self.sensor_pins.append(pin)
                GPIO.setup(pin, GPIO.IN, pull_up_down=GPIO.PUD_UP)
            
            print(f"GPIO initialized: servo={self.servo_pin}, sensors={self.sensor_pins}")
            
        except ImportError:
            raise RuntimeError("RPi.GPIO not available - are you running on a Raspberry Pi?")
    
    def _setServoAngle(self, angle: int):
        """Set servo to specific angle (0-180)."""
        duty = 2 + (angle / 18)
        self.servo_pwm.ChangeDutyCycle(duty)
        asyncio.get_event_loop().call_later(0.5, lambda: self.servo_pwm.ChangeDutyCycle(0))
    
    def setGate(self, is_down: bool):
        """Move the gate servo."""
        angle = DEFAULT_GATE_DOWN_POSITION if is_down else DEFAULT_GATE_UP_POSITION
        self._setServoAngle(angle)
        self.is_gate_down = is_down
        print(f"Gate moved to {'DOWN' if is_down else 'UP'} (angle={angle})")
    
    async def runRace(self) -> HeatResult:
        """Run a race, monitoring sensors for finish times."""
        if not self.current_heat:
            raise ValueError("No heat configured - call prepareRace first")
        
        started_at = datetime.now()
        occupied_lanes = set(self.current_heat.occupied_lanes)
        
        # Track finish times
        finish_times = {}
        lanes_finished = set()
        
        # Drop the gate
        self.setGate(True)
        race_start_time = asyncio.get_event_loop().time()
        print(f"Race started for heat {self.current_heat.heat_id}")
        
        # Monitor sensors until all occupied lanes finish or timeout
        while len(lanes_finished) < len(occupied_lanes):
            elapsed = asyncio.get_event_loop().time() - race_start_time
            
            if elapsed > SENSOR_TIMEOUT_SEC:
                print(f"Race timeout after {SENSOR_TIMEOUT_SEC}s")
                break
            
            # Check each occupied lane's sensor
            for i, lane in enumerate(range(1, self.num_tracks + 1)):
                if lane in occupied_lanes and lane not in lanes_finished:
                    # Sensor triggered = LOW (break beam)
                    if self.GPIO.input(self.sensor_pins[i]) == self.GPIO.LOW:
                        finish_time_ms = elapsed * 1000
                        finish_times[lane] = finish_time_ms
                        lanes_finished.add(lane)
                        print(f"Lane {lane} finished at {finish_time_ms:.2f}ms")
            
            await asyncio.sleep(0.001)  # 1ms polling
        
        # Build results
        lane_results: List[LaneResult] = []
        
        # Sort finished lanes by time for place assignment
        sorted_finishes = sorted(finish_times.items(), key=lambda x: x[1])
        place_map = {lane: place for place, (lane, _) in enumerate(sorted_finishes, start=1)}
        
        for lane in range(1, self.num_tracks + 1):
            if lane in occupied_lanes:
                if lane in finish_times:
                    lane_results.append(LaneResult(
                        lane_number=lane,
                        finish_time_ms=round(finish_times[lane], 2),
                        place=place_map[lane],
                        is_dnf=False,
                    ))
                else:
                    # DNF - didn't finish in time
                    lane_results.append(LaneResult(
                        lane_number=lane,
                        finish_time_ms=None,
                        place=None,
                        is_dnf=True,
                    ))
            else:
                # Unoccupied lane
                lane_results.append(LaneResult(
                    lane_number=lane,
                    finish_time_ms=None,
                    place=None,
                    is_dnf=False,
                ))
        
        # Raise gate
        self.setGate(False)
        
        result = HeatResult(
            heat_id=self.current_heat.heat_id,
            started_at=started_at,
            finished_at=datetime.now(),
            lane_results=lane_results,
            is_complete=True,
        )
        
        print(f"Race complete: {result}")
        return result
    
    def cleanup(self):
        """Clean up GPIO on shutdown."""
        self.servo_pwm.stop()
        self.GPIO.cleanup()


def MakeHardware(num_tracks: int = 4) -> HardwareInterface:
    """Factory method to create appropriate hardware interface."""
    if os.environ.get("MOCK_HARDWARE") == "1":
        print("Using MOCK hardware interface")
        return MockHardware(num_tracks)
    
    try:
        print("Attempting to use REAL hardware interface")
        return RealHardware(num_tracks)
    except RuntimeError as e:
        print(f"Failed to init real hardware: {e}, falling back to mock")
        return MockHardware(num_tracks)
