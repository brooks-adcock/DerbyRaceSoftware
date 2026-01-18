# Pinewood Derby Track Controller - Hardware Setup

## Components

### 1. Servo Controller: PCA9685 16-Channel PWM Driver
**Amazon B07H9ZTWNC**

| Spec | Value |
|------|-------|
| Channels | 16 PWM outputs |
| Interface | I2C (address 0x40 default) |
| PWM Resolution | 12-bit (4096 steps) |
| PWM Frequency | 24-1526 Hz (50Hz for servos) |
| Operating Voltage | 3.3V or 5V logic |
| Servo Power | Separate V+ terminal (5-6V for servos) |

**Why this board:** Offloads PWM generation from the Pi's CPU, provides clean servo signals, and frees up GPIO pins for sensors.

#### Wiring to Raspberry Pi

| PCA9685 Pin | Pi Pin | GPIO |
|-------------|--------|------|
| VCC | Pin 1 | 3.3V |
| GND | Pin 6 | Ground |
| SDA | Pin 3 | GPIO 2 (SDA1) |
| SCL | Pin 5 | GPIO 3 (SCL1) |
| V+ | **External 5-6V** | Servo power (NOT from Pi) |

⚠️ **Important:** Use an external 5V power supply for V+ (servo power). Do NOT power servos from the Pi's 5V pin—it can't supply enough current and may brown out the Pi.

---

### 2. Gate Servo: Hitec HS-422
**Amazon B0006O3XKO**

| Spec | Value |
|------|-------|
| Type | Standard analog servo |
| Torque | 45.8 oz-in (3.3 kg-cm) @ 4.8V |
| Speed | 0.21 sec/60° @ 4.8V |
| Voltage | 4.8V - 6.0V |
| Pulse Width | 900µs - 2100µs |
| Neutral | 1500µs |

**Why this servo:** Reliable, plenty of torque for a gate mechanism, well-documented pulse widths.

#### Wiring to PCA9685

| Servo Wire | PCA9685 Terminal |
|------------|------------------|
| Brown (GND) | GND row |
| Red (V+) | V+ row |
| Yellow (Signal) | **Channel 0** PWM |

#### Gate Positions (Calibrate via API)

The actual angles depend on your track geometry. Use the API to calibrate:

| Position | Default | Description |
|----------|---------|-------------|
| **UP** (holding) | 90° | Cars held at start |
| **DOWN** (released) | 0° | Gate drops, cars roll |

**Calibration API:**
```bash
# Test a specific angle
curl -X POST http://track-controller.local:8000/servo/test \
  -H "Content-Type: application/json" \
  -d '{"angle": 45}'

# Once you find the right angles, save them:
curl -X POST http://track-controller.local:8000/servo/calibration \
  -H "Content-Type: application/json" \
  -d '{"up_angle": 85, "down_angle": 15}'

# Check current calibration
curl http://track-controller.local:8000/servo/calibration
```

**Race Sequence:**
1. Gate starts in **UP** position (servo at calibrated up_angle)
2. On "GO" command, gate moves to **DOWN** position (calibrated down_angle)
3. **START TIME is recorded** when gate drops
4. Cars race down track...

---

### 3. Finish Line Sensors: DFRobot SEN0503 (x4)
**Mouser 426-SEN0503**

| Spec | Value |
|------|-------|
| Type | Infrared break-beam (through-beam) |
| Detection Range | 50cm max |
| Response Time | < 2ms |
| Operating Voltage | 3.3V - 5V |
| Output | Digital (HIGH = beam intact, LOW = beam broken) |
| Output Type | NPN open-collector |

**Why these sensors:** Fast response time (~2ms), 3.3V compatible, perfect for detecting fast-moving pinewood derby cars.

#### Wiring to Raspberry Pi

Each SEN0503 has 3 wires:

| Wire Color | Connection |
|------------|------------|
| Red | 3.3V (Pi Pin 1 or 17) |
| Black | GND (Pi Pin 6, 9, 14, 20, 25, 30, 34, 39) |
| Yellow/Signal | GPIO (see below) |

#### GPIO Pin Assignments

| Lane | GPIO Pin | Pi Pin | Wire Color Suggestion |
|------|----------|--------|----------------------|
| Lane 1 | GPIO 17 | Pin 11 | White |
| Lane 2 | GPIO 27 | Pin 13 | Blue |
| Lane 3 | GPIO 22 | Pin 15 | Green |
| Lane 4 | GPIO 23 | Pin 16 | Yellow |

⚠️ **Pull-ups Required:** Enable internal pull-ups on each GPIO pin. The SEN0503 output goes LOW when the beam is broken.

---

## Complete Wiring Diagram

```
                    RASPBERRY PI 4/5
                    ┌─────────────────────────────────────┐
                    │  Pin 1 (3.3V) ──────┬──── PCA9685 VCC
                    │  Pin 2 (5V)         │     (also powers sensors)
                    │  Pin 3 (GPIO2/SDA) ─┼──── PCA9685 SDA
                    │  Pin 4 (5V)         │
                    │  Pin 5 (GPIO3/SCL) ─┼──── PCA9685 SCL
                    │  Pin 6 (GND) ───────┼──── PCA9685 GND
                    │  ...                │     (common ground)
                    │  Pin 11 (GPIO17) ───┼──── Lane 1 Sensor
                    │  Pin 13 (GPIO27) ───┼──── Lane 2 Sensor
                    │  Pin 15 (GPIO22) ───┼──── Lane 3 Sensor
                    │  Pin 16 (GPIO23) ───┼──── Lane 4 Sensor
                    │  ...                │
                    └─────────────────────────────────────┘

                    PCA9685 SERVO DRIVER
                    ┌─────────────────────────────────────┐
                    │  V+ ←── External 5V Power Supply    │
                    │  GND ←── Common Ground              │
                    │                                     │
                    │  Channel 0 ──── HS-422 Servo        │
                    │    (PWM)        (Yellow wire)       │
                    └─────────────────────────────────────┘

                    EXTERNAL POWER
                    ┌─────────────────────────────────────┐
                    │  5V 2A DC Adapter                   │
                    │    └── V+ to PCA9685 V+ terminal    │
                    │    └── GND to common ground         │
                    └─────────────────────────────────────┘
```

---

## Power Requirements

| Component | Voltage | Current (max) |
|-----------|---------|---------------|
| Raspberry Pi 4/5 | 5V USB-C | 3A |
| PCA9685 Logic | 3.3V (from Pi) | 10mA |
| HS-422 Servo | 5-6V (external) | 500mA peak |
| SEN0503 Sensors (x4) | 3.3V | 20mA each |

**Recommended Power Setup:**
- Pi: Official 5V/3A USB-C power supply
- Servo: Separate 5V/2A DC adapter to PCA9685 V+ terminal
- Sensors: Powered from Pi's 3.3V rail (plenty of headroom)

---

## Race Timing Sequence

```
TIME ─────────────────────────────────────────────────────────►

1. READY STATE
   Gate: UP (90°)
   Sensors: Monitoring (all HIGH)

2. "GO" COMMAND RECEIVED
   ├── Gate: Move to DOWN (0°)
   └── START_TIME = time.monotonic_ns()  ◄── TIMING STARTS HERE

3. CARS RACING
   Gate: DOWN
   Sensors: Waiting for triggers...

4. CAR CROSSES FINISH LINE
   Sensor goes LOW (beam broken)
   └── FINISH_TIME[lane] = time.monotonic_ns()
   └── ELAPSED_MS = (FINISH_TIME - START_TIME) / 1_000_000

5. ALL CARS FINISHED (or timeout)
   Gate: Return to UP
   └── Results saved & broadcast
```

---

## Software Configuration

The GPIO pins and servo settings are configured in the systemd service file and can be overridden:

```bash
# /etc/systemd/system/track-api.service
Environment="NUM_TRACKS=4"
Environment="SERVO_CHANNEL=0"
Environment="SERVO_UP_ANGLE=90"
Environment="SERVO_DOWN_ANGLE=0"
Environment="SENSOR_PIN_1=17"
Environment="SENSOR_PIN_2=27"
Environment="SENSOR_PIN_3=22"
Environment="SENSOR_PIN_4=23"
```

---

## Testing Checklist

### Before First Race

- [ ] PCA9685 detected: `sudo i2cdetect -y 1` (should show 0x40)
- [ ] Servo moves smoothly between UP and DOWN positions
- [ ] All 4 sensors trigger when beam is broken (test with finger)
- [ ] API health check returns correct track count
- [ ] WebSocket connection stable

### Test Commands

```bash
# Check I2C devices
sudo i2cdetect -y 1

# Test gate via API
curl -X POST http://track-controller.local:8000/gate \
  -H "Content-Type: application/json" \
  -d '{"is_down": true}'

# Run a test heat
curl -X POST http://track-controller.local:8000/race/run \
  -H "Content-Type: application/json" \
  -d '{"heat_id": "test-001", "occupied_lanes": [1, 2, 3, 4]}'
```

---

## Troubleshooting

| Issue | Likely Cause | Fix |
|-------|--------------|-----|
| Servo jitters/buzzes | Insufficient power | Use dedicated 5V supply for V+ |
| Servo doesn't move | I2C not enabled | Run `sudo raspi-config` → Interface → I2C |
| Sensors always LOW | Misaligned beam | Realign emitter/receiver pair |
| Sensors always HIGH | Wiring issue | Check 3.3V, GND, and signal connections |
| Erratic timing | Ambient IR interference | Shield sensors from sunlight/fluorescent lights |
| I2C errors | Bad connection | Check SDA/SCL wiring, try shorter cables |

---

## Parts List Summary

| Qty | Item | Source | Notes |
|-----|------|--------|-------|
| 1 | Raspberry Pi 4B (2GB+) | — | Or Pi 5 |
| 1 | PCA9685 16-Ch PWM Driver | Amazon B07H9ZTWNC | I2C servo controller |
| 1 | Hitec HS-422 Servo | Amazon B0006O3XKO | Gate mechanism |
| 4 | DFRobot SEN0503 Sensors | Mouser 426-SEN0503 | Finish line |
| 1 | 5V 2A DC Adapter | — | Servo power |
| 1 | 5V 3A USB-C Adapter | — | Pi power |
| 1 | 32GB microSD (High Endurance) | — | Samsung PRO Endurance |
| — | Jumper wires, connectors | — | For wiring |
