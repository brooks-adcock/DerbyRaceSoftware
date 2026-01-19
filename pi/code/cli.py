#!/usr/bin/env python3
"""CLI tool for the Pi Track Controller API.

Usage:
    # Start server (uses real hardware on Pi, or --mock for local dev)
    python cli.py serve
    python cli.py serve --mock
    
    # In another terminal, run commands:
    python cli.py health
    python cli.py gate up|down
    python cli.py race <heat_id> <lanes>   # e.g., race heat-1 1,2,3,4
    python cli.py servo test <angle>
    python cli.py servo calibrate <up> <down>
    python cli.py history
"""

import argparse
import sys
import os
import json
import httpx

DEFAULT_HOST = "http://localhost:8000"


def getClient():
    """Get HTTP client with base URL from env or default."""
    base_url = os.environ.get("PI_API_URL", DEFAULT_HOST)
    return httpx.Client(base_url=base_url, timeout=60.0)


def cmdServe(args):
    """Start the API server."""
    if args.mock:
        os.environ["MOCK_HARDWARE"] = "1"
    os.environ["NUM_TRACKS"] = str(args.tracks)
    os.environ["API_PORT"] = str(args.port)
    
    import uvicorn
    from main import app
    
    mode = "MOCK" if args.mock else "REAL HARDWARE"
    print(f"\n🏎️  Starting Pi Track Controller ({mode})")
    print(f"   Tracks: {args.tracks}")
    print(f"   Port: {args.port}")
    print(f"   URL: http://localhost:{args.port}\n")
    
    uvicorn.run(app, host="0.0.0.0", port=args.port)


def cmdHealth(args):
    """Check API health."""
    with getClient() as client:
        r = client.get("/health")
        r.raise_for_status()
        data = r.json()
        print(json.dumps(data, indent=2))


def cmdGate(args):
    """Get or set gate position."""
    with getClient() as client:
        if args.position:
            is_down = args.position.lower() == "down"
            r = client.post("/gate", json={"is_down": is_down})
        else:
            r = client.get("/gate")
        r.raise_for_status()
        data = r.json()
        state = "DOWN" if data["is_gate_down"] else "UP"
        print(f"Gate: {state}")


def cmdRace(args):
    """Run a race heat."""
    lanes = [int(x.strip()) for x in args.lanes.split(",")]
    
    with getClient() as client:
        print(f"🏁 Starting race: heat={args.heat_id}, lanes={lanes}")
        r = client.post("/race/run", json={
            "heat_id": args.heat_id,
            "occupied_lanes": lanes
        })
        r.raise_for_status()
        result = r.json()
        
        print(f"\n📊 Results for {result['heat_id']}:")
        print("-" * 40)
        
        for lane in result["lane_results"]:
            if lane["finish_time_ms"] is not None:
                print(f"  Lane {lane['lane_number']}: {lane['finish_time_ms']:.2f}ms (#{lane['place']})")
            elif lane["is_dnf"]:
                print(f"  Lane {lane['lane_number']}: DNF")
            else:
                print(f"  Lane {lane['lane_number']}: --")
        print()


def cmdServo(args):
    """Servo test and calibration commands."""
    with getClient() as client:
        if args.servo_cmd == "test":
            r = client.post("/servo/test", json={"angle": args.angle})
            r.raise_for_status()
            print(f"Servo moved to {args.angle}°")
        
        elif args.servo_cmd == "calibrate":
            r = client.post("/servo/calibration", json={
                "up_angle": args.up_angle,
                "down_angle": args.down_angle
            })
            r.raise_for_status()
            data = r.json()
            print(f"Calibration set: UP={data['up_angle']}°, DOWN={data['down_angle']}°")
        
        elif args.servo_cmd == "status":
            r = client.get("/servo/calibration")
            r.raise_for_status()
            data = r.json()
            print(f"Calibration: UP={data['up_angle']}°, DOWN={data['down_angle']}°")


def cmdHistory(args):
    """Get race history."""
    with getClient() as client:
        r = client.get("/history", params={"limit": args.limit})
        r.raise_for_status()
        data = r.json()
        
        if not data["heats"]:
            print("No race history")
            return
        
        print(f"Last {len(data['heats'])} heats:")
        for heat in data["heats"]:
            print(f"  {heat['heat_id']} @ {heat['started_at']}")


def main():
    parser = argparse.ArgumentParser(
        description="Pi Track Controller CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    subparsers = parser.add_subparsers(dest="command", required=True)
    
    # serve
    p_serve = subparsers.add_parser("serve", help="Start API server")
    p_serve.add_argument("-p", "--port", type=int, default=8000, help="Port (default: 8000)")
    p_serve.add_argument("-t", "--tracks", type=int, default=4, help="Number of tracks (default: 4)")
    p_serve.add_argument("-m", "--mock", action="store_true", help="Use mock hardware (for local dev)")
    p_serve.set_defaults(func=cmdServe)
    
    # health
    p_health = subparsers.add_parser("health", help="Check API health")
    p_health.set_defaults(func=cmdHealth)
    
    # gate
    p_gate = subparsers.add_parser("gate", help="Get/set gate position")
    p_gate.add_argument("position", nargs="?", choices=["up", "down"], help="Set position")
    p_gate.set_defaults(func=cmdGate)
    
    # race
    p_race = subparsers.add_parser("race", help="Run a race heat")
    p_race.add_argument("heat_id", help="Heat identifier")
    p_race.add_argument("lanes", help="Comma-separated lane numbers (e.g., 1,2,3,4)")
    p_race.set_defaults(func=cmdRace)
    
    # servo
    p_servo = subparsers.add_parser("servo", help="Servo commands")
    servo_sub = p_servo.add_subparsers(dest="servo_cmd", required=True)
    
    p_servo_test = servo_sub.add_parser("test", help="Test servo at angle")
    p_servo_test.add_argument("angle", type=int, help="Angle (0-180)")
    
    p_servo_cal = servo_sub.add_parser("calibrate", help="Set calibration")
    p_servo_cal.add_argument("up_angle", type=int, help="UP angle (holding)")
    p_servo_cal.add_argument("down_angle", type=int, help="DOWN angle (released)")
    
    servo_sub.add_parser("status", help="Get calibration")
    
    p_servo.set_defaults(func=cmdServo)
    
    # history
    p_history = subparsers.add_parser("history", help="Get race history")
    p_history.add_argument("-l", "--limit", type=int, default=10, help="Max heats (default: 10)")
    p_history.set_defaults(func=cmdHistory)
    
    args = parser.parse_args()
    
    try:
        args.func(args)
    except httpx.ConnectError:
        print(f"❌ Cannot connect to API. Is the server running?")
        print(f"   Start with: python cli.py serve")
        sys.exit(1)
    except httpx.HTTPStatusError as e:
        print(f"❌ API error: {e.response.status_code}")
        print(f"   {e.response.text}")
        sys.exit(1)


if __name__ == "__main__":
    main()
