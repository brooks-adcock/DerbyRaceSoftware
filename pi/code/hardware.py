"""Hardware interface for PCA9685 servo driver, GPIO sensors.

Supports both real Raspberry Pi hardware and mock mode for local development.

Hardware:
- PCA9685 I2C PWM driver for servo control
- Hitec HS-422 servo for gate mechanism
- DFRobot SEN0503 IR break-beam sensors for finish line

Race sequence:
1. Gate starts UP (servo at ~90°) - cars held at start
2. On "GO", gate moves DOWN (servo at ~0°) - cars released
3. START_TIME recorded when gate drops
4. Sensors detect cars crossing finish line
5. FINISH_TIME = time since gate drop
"""

import os
import time
import asyncio
import random
from typing import List, Optional, Callable, Dict
from datetime import datetime
from models import HeatSetup, LaneResult, HeatResult

# Constants - Gate positions
SERVO_UP_ANGLE = int(os.environ.get("SERVO_UP_ANGLE", 90))    # Gate holding cars
SERVO_DOWN_ANGLE = int(os.environ.get("SERVO_DOWN_ANGLE", 0))  # Gate released
SERVO_CHANNEL = int(os.environ.get("SERVO_CHANNEL", 0))        # PCA9685 channel

# Timing
SENSOR_TIMEOUT_SEC = 30.0  # Max time to wait for all cars to finish
GATE_SETTLE_MS = 50        # Time to wait after gate drop before timing starts

# PCA9685 servo pulse widths (microseconds)
SERVO_MIN_PULSE = 900   # 0 degrees (HS-422 spec)
SERVO_MAX_PULSE = 2100  # 180 degrees (HS-422 spec)
SERVO_FREQ = 50         # 50Hz for standard servos


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
        """Set gate position (up=holding, down=released)."""
        raise NotImplementedError
    
    def raiseGate(self):
        """Raise gate to hold cars (UP position)."""
        self.setGate(is_down=False)
    
    def dropGate(self):
        """Drop gate to release cars (DOWN position)."""
        self.setGate(is_down=True)
    
    def prepareRace(self, setup: HeatSetup):
        """Prepare for a race with given configuration."""
        self.current_heat = setup
        # Ensure gate is UP before race
        self.raiseGate()
    
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
        position = "DOWN (released)" if is_down else "UP (holding)"
        print(f"[MOCK] Gate moved to {position}")
    
    async def runRace(self) -> HeatResult:
        """Simulate a race with random finish times."""
        if not self.current_heat:
            raise ValueError("No heat configured - call prepareRace first")
        
        started_at = datetime.now()
        
        # Drop the gate to release cars - START timing
        self.dropGate()
        start_time_ns = time.monotonic_ns()
        print(f"[MOCK] Race started for heat {self.current_heat.heat_id}")
        
        # Simulate race duration (2-5 seconds typical for pinewood derby)
        await asyncio.sleep(random.uniform(2.0, 4.0))
        
        # Generate mock results for occupied lanes only
        lane_results: List[LaneResult] = []
        finish_times: List[tuple] = []
        
        for lane in self.current_heat.occupied_lanes:
            # Random finish time between 2.5 and 4.5 seconds (typical derby times)
            finish_time_ms = random.uniform(2500, 4500)
            finish_times.append((lane, finish_time_ms))
        
        # Sort by finish time to assign places
        finish_times.sort(key=lambda x: x[1])
        
        for place, (lane, finish_time_ms) in enumerate(finish_times, start=1):
            lane_results.append(LaneResult(
                lane_number=lane,
                finish_time_ms=round(finish_time_ms, 2),
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
        
        # Raise gate back up for next heat
        self.raiseGate()
        print(f"[MOCK] Race complete: {result}")
        
        return result


class RealHardware(HardwareInterface):
    """Real Raspberry Pi hardware interface using PCA9685 + GPIO."""
    
    def __init__(self, num_tracks: int = 4):
        super().__init__(num_tracks)
        self.pca = None
        self.servo = None
        self.GPIO = None
        self.sensor_pins: List[int] = []
        self._initHardware()
    
    def _initHardware(self):
        """Initialize PCA9685 servo driver and GPIO sensors."""
        # Initialize I2C and PCA9685
        try:
            import board
            import busio
            from adafruit_pca9685 import PCA9685
            from adafruit_motor import servo as adafruit_servo
            
            i2c = busio.I2C(board.SCL, board.SDA)
            self.pca = PCA9685(i2c)
            self.pca.frequency = SERVO_FREQ
            
            # Create servo on configured channel
            self.servo = adafruit_servo.Servo(
                self.pca.channels[SERVO_CHANNEL],
                min_pulse=SERVO_MIN_PULSE,
                max_pulse=SERVO_MAX_PULSE,
            )
            
            print(f"PCA9685 initialized: channel={SERVO_CHANNEL}, freq={SERVO_FREQ}Hz")
            
        except ImportError as e:
            raise RuntimeError(f"PCA9685 libraries not available: {e}")
        except Exception as e:
            raise RuntimeError(f"Failed to initialize PCA9685: {e}")
        
        # Initialize GPIO for sensors
        try:
            import RPi.GPIO as GPIO
            self.GPIO = GPIO
            GPIO.setmode(GPIO.BCM)
            GPIO.setwarnings(False)
            
            # Sensor pins (one per lane, configurable via env)
            # Default: GPIO 17, 27, 22, 23 for lanes 1-4
            default_sensor_pins = [17, 27, 22, 23]
            self.sensor_pins = []
            
            for i in range(self.num_tracks):
                pin = int(os.environ.get(f"SENSOR_PIN_{i+1}", default_sensor_pins[i]))
                self.sensor_pins.append(pin)
                # SEN0503 is open-collector, needs pull-up
                # Output goes LOW when beam is broken
                GPIO.setup(pin, GPIO.IN, pull_up_down=GPIO.PUD_UP)
            
            print(f"GPIO sensors initialized: pins={self.sensor_pins}")
            
        except ImportError:
            raise RuntimeError("RPi.GPIO not available - are you running on a Raspberry Pi?")
        
        # Start with gate UP (holding position)
        self.raiseGate()
    
    def _setServoAngle(self, angle: int):
        """Set servo to specific angle (0-180)."""
        # Clamp angle to valid range
        angle = max(0, min(180, angle))
        self.servo.angle = angle
    
    def setGate(self, is_down: bool):
        """Move the gate servo."""
        angle = SERVO_DOWN_ANGLE if is_down else SERVO_UP_ANGLE
        self._setServoAngle(angle)
        self.is_gate_down = is_down
        state = "DOWN (released)" if is_down else "UP (holding)"
        print(f"Gate moved to {state} (angle={angle}°)")
    
    async def runRace(self) -> HeatResult:
        """Run a race, monitoring sensors for finish times.
        
        Timing starts when gate drops (cars released).
        Each sensor trigger records elapsed time from gate drop.
        """
        if not self.current_heat:
            raise ValueError("No heat configured - call prepareRace first")
        
        started_at = datetime.now()
        occupied_lanes = set(self.current_heat.occupied_lanes)
        
        # Track finish times (nanoseconds from start)
        finish_times_ns: Dict[int, int] = {}
        lanes_finished: set = set()
        
        # DROP THE GATE - this is when timing starts!
        self.dropGate()
        
        # Small delay for gate mechanism to fully open
        await asyncio.sleep(GATE_SETTLE_MS / 1000.0)
        
        # Record start time with high precision
        start_time_ns = time.monotonic_ns()
        print(f"Race started for heat {self.current_heat.heat_id} - timing started")
        
        # Monitor sensors until all occupied lanes finish or timeout
        timeout_ns = int(SENSOR_TIMEOUT_SEC * 1_000_000_000)
        
        while len(lanes_finished) < len(occupied_lanes):
            current_ns = time.monotonic_ns()
            elapsed_ns = current_ns - start_time_ns
            
            if elapsed_ns > timeout_ns:
                print(f"Race timeout after {SENSOR_TIMEOUT_SEC}s")
                break
            
            # Check each occupied lane's sensor
            for lane in occupied_lanes:
                if lane not in lanes_finished:
                    pin_index = lane - 1  # Convert 1-indexed lane to 0-indexed
                    if pin_index < len(self.sensor_pins):
                        # SEN0503: LOW = beam broken = car crossed
                        if self.GPIO.input(self.sensor_pins[pin_index]) == self.GPIO.LOW:
                            finish_times_ns[lane] = elapsed_ns
                            lanes_finished.add(lane)
                            finish_ms = elapsed_ns / 1_000_000
                            print(f"Lane {lane} finished at {finish_ms:.2f}ms")
            
            # 1ms polling interval for ~1ms precision
            await asyncio.sleep(0.001)
        
        # Build results
        lane_results: List[LaneResult] = []
        
        # Sort finished lanes by time for place assignment
        sorted_finishes = sorted(finish_times_ns.items(), key=lambda x: x[1])
        place_map = {lane: place for place, (lane, _) in enumerate(sorted_finishes, start=1)}
        
        for lane in range(1, self.num_tracks + 1):
            if lane in occupied_lanes:
                if lane in finish_times_ns:
                    finish_ms = finish_times_ns[lane] / 1_000_000
                    lane_results.append(LaneResult(
                        lane_number=lane,
                        finish_time_ms=round(finish_ms, 2),
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
        
        # Raise gate back to holding position
        self.raiseGate()
        
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
        """Clean up hardware on shutdown."""
        if self.pca:
            self.pca.deinit()
        if self.GPIO:
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
