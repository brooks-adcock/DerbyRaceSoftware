# Pinewood Derby Race Software

Complete race management system for Pinewood Derby events, featuring automatic timing hardware and a modern web UI.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           WEB UI (Next.js)                          │
│              Race management, registration, results display         │
│                         http://localhost:3000                       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP + WebSocket
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    TRACK CONTROLLER (Raspberry Pi)                  │
│           FastAPI server for gate control + finish sensors          │
│                   http://track-controller.local:8000                │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                         GPIO / I2C │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          PHYSICAL HARDWARE                          │
│         Gate servo (PCA9685) + IR break-beam sensors (x4)           │
└─────────────────────────────────────────────────────────────────────┘
```

## Components

| Directory | Description |
|-----------|-------------|
| `ui_web/` | Next.js web application for race management |
| `pi/` | Raspberry Pi track controller (FastAPI + GPIO) |
| `mechanical/` | 3D printable parts (STL files) for track hardware |
| `notes/` | Development notes and troubleshooting logs |

---

## Quick Start

### 1. Development Environment (UI Only)

```bash
# Start the web UI (mock hardware mode)
./dev_start.sh

# View logs
./dev_tail.sh

# Stop services
./dev_stop.sh
```

Access at http://localhost:3000

### 2. Full System with Pi Hardware

See [pi/README.md](pi/README.md) for hardware setup instructions.

---

## Development Scripts

| Script | Description |
|--------|-------------|
| `./dev_start.sh` | Start Docker services in background |
| `./dev_stop.sh` | Stop all Docker services |
| `./dev_build.sh` | Rebuild containers (fresh install) |
| `./dev_build.sh ui_web` | Rebuild specific service |
| `./dev_tail.sh` | Follow Docker logs |

---

## Web UI Pages

| Route | Purpose |
|-------|---------|
| `/` | Home / dashboard |
| `/register` | Car registration form |
| `/heats` | Heat management and race control |
| `/results` | Results leaderboard |
| `/public` | Spectator display (large screen) |
| `/admin` | System administration |
| `/health` | Hardware connection status |

---

## Track Controller API

The Raspberry Pi exposes a REST + WebSocket API:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check, track count, gate status |
| `/gate` | GET/POST | Gate position control |
| `/servo/calibration` | GET/POST | Servo angle calibration |
| `/servo/test` | POST | Test servo at specific angle |
| `/race/run` | POST | Start a heat (drops gate, monitors sensors) |
| `/history` | GET | Past heat results |
| `/ws/results` | WS | Real-time race results stream |
| `/ws/status` | WS | Live hardware status (20Hz) |

Full API documentation: [pi/README.md](pi/README.md)

---

## Hardware Components

| Component | Purpose |
|-----------|---------|
| Raspberry Pi 4B | Track controller |
| PCA9685 PWM Driver | Servo control via I2C |
| Hitec HS-5625MG Servo | Gate mechanism |
| DFRobot SEN0503 (x4) | Finish line IR sensors |

Detailed wiring and setup: [pi/HARDWARE.md](pi/HARDWARE.md)

---

## Tech Stack

- **Frontend:** Next.js 14, React, Tailwind CSS, Headless UI
- **Backend:** FastAPI (Python), Docker
- **Hardware:** Raspberry Pi OS, pigpio, adafruit-circuitpython-pca9685
- **Communication:** REST API, WebSockets, mDNS/Zeroconf

---

## Project Structure

```
RaceSoftware/
├── ui_web/
│   ├── code/              # Next.js application source
│   │   ├── src/app/       # Pages and API routes
│   │   ├── src/components/# React components
│   │   └── src/lib/       # Utilities and storage
│   ├── Dockerfile.dev     # Development container
│   └── start.sh           # Container entrypoint
├── pi/
│   ├── code/              # FastAPI application
│   │   ├── main.py        # API endpoints
│   │   ├── hardware.py    # GPIO/servo control
│   │   ├── models.py      # Pydantic schemas
│   │   └── storage.py     # Result persistence
│   ├── setup/             # SD card prep scripts
│   ├── HARDWARE.md        # Wiring diagrams
│   └── README.md          # Pi setup guide
├── mechanical/            # 3D printable parts (.stl)
├── docker-compose.dev.yml # Development stack
└── dev_*.sh               # Helper scripts
```

---

## Race Day Workflow

1. **Setup:** Connect Pi to venue WiFi, verify `/health` endpoint
2. **Registration:** Enter cars via `/register` page
3. **Generate Heats:** System creates balanced heat schedule
4. **Race:** Call cars to lanes, click "Start Race" on `/heats`
5. **Results:** Live times appear on `/public` display
6. **Finals:** Top cars race for placement

---

## Troubleshooting

**Can't connect to Pi:**
- Check Pi is on same network as your computer
- Try `ping track-controller.local`
- macOS Sequoia requires "Local Network" permission for Terminal

**Gate doesn't move:**
- Verify PCA9685 detected: `sudo i2cdetect -y 1`
- Check servo power supply (separate 5V, not from Pi)
- Test calibration: `curl -X POST .../servo/test -d '{"angle": 45}'`

**Sensors not triggering:**
- Realign IR emitter/receiver pairs
- Check 3.3V power to sensors
- Shield from ambient IR (sunlight, fluorescent lights)

See [notes/connection_mystery.md](notes/connection_mystery.md) for detailed network debugging.
