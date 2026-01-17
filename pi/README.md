# Pinewood Derby Track Controller (Raspberry Pi)

Headless Raspberry Pi API for controlling the race gate, reading finish sensors, and reporting heat results.

## Recommended Hardware

- **Raspberry Pi 4B** (2GB+ RAM) or **Pi Zero 2 W** for compact installs
- **High-endurance SD card** (Samsung PRO Endurance 32GB recommended)
- Servo motor for gate control
- Finish line sensors (IR break-beam or laser)

---

## Quick Start (One Command Setup)

### Prerequisites

1. Download **Raspberry Pi OS Lite (64-bit)** from:
   https://www.raspberrypi.com/software/operating-systems/

2. Place the image (`.img` or `.img.xz`) in the `pi/os/` directory
   - Keep the original filename (e.g., `2025-12-04-raspios-trixie-arm64-lite.img.xz`)

3. Create your configuration file:
   ```bash
   cd pi
   cp env.template .env
   # Edit .env with your WiFi credentials
   ```

### Flash & Configure SD Card

```bash
cd pi/setup
chmod +x prepare_sd.sh
./prepare_sd.sh
```

The script will:
- Prompt you to insert the SD card
- Scan and list available disks for you to choose
- Flash the OS image
- Enable SSH
- Configure **both** WiFi networks (dev + venue)
- Set up the `pi` user
- Copy all track controller code
- Configure auto-setup on first boot

### Boot the Pi

1. Insert SD card into Raspberry Pi
2. Connect power
3. Wait ~3-5 minutes for first boot setup
4. Verify: `curl http://track-controller.local:8000/health`

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check, returns track count and gate status |
| GET | `/gate` | Get current gate position |
| POST | `/gate` | Set gate up/down (`{"is_down": true}`) |
| POST | `/race/run` | Start a heat (`{"heat_id": "...", "occupied_lanes": [1,2,3]}`) |
| GET | `/history` | Get past heat results (`?limit=100`) |
| GET | `/history/{heat_id}` | Get specific heat result |
| GET | `/history/last` | Get most recent heat result |
| WS | `/ws/results` | WebSocket for real-time race results |

### Example: Run a Race

```bash
curl -X POST http://track-controller.local:8000/race/run \
  -H "Content-Type: application/json" \
  -d '{"heat_id": "heat-001", "occupied_lanes": [1, 2, 3, 4]}'
```

Response:
```json
{
  "heat_id": "heat-001",
  "started_at": "2024-01-15T10:30:00",
  "finished_at": "2024-01-15T10:30:04",
  "lane_results": [
    {"lane_number": 1, "finish_time_ms": 2847.32, "place": 1, "is_dnf": false},
    {"lane_number": 2, "finish_time_ms": 3102.45, "place": 2, "is_dnf": false},
    {"lane_number": 3, "finish_time_ms": 3256.78, "place": 3, "is_dnf": false},
    {"lane_number": 4, "finish_time_ms": 3401.12, "place": 4, "is_dnf": false}
  ],
  "is_complete": true
}
```

---

## Local Development (Mock Mode)

For UI development without a physical Pi:

```bash
cd pi
docker build -f Dockerfile.dev -t track-api-dev .
docker run -p 8000:8000 track-api-dev
```

Or without Docker:

```bash
cd pi/code
export MOCK_HARDWARE=1
export NUM_TRACKS=4
pip install -r ../requirements.txt
uvicorn main:app --reload --port 8000
```

Mock mode simulates races with random finish times (2.5-4.5 seconds).

---

## Stability Features

| Feature | Implementation |
|---------|----------------|
| Auto-restart on crash | systemd `Restart=always` with 3s delay |
| Network discovery | Zeroconf/mDNS (`track-controller.local`) |
| Result persistence | JSON file (last 1000 heats) |
| State recovery | `GET /history/{heat_id}` to re-fetch results |
| Selective sensing | Only waits for `occupied_lanes` sensors |
| Atomic writes | Temp file + rename for crash safety |

---

## Hardware Configuration

GPIO pins are configurable via environment variables in the systemd service:

| Variable | Default | Description |
|----------|---------|-------------|
| `NUM_TRACKS` | 4 | Number of lanes |
| `SERVO_PIN` | 18 | GPIO pin for gate servo |
| `SENSOR_PIN_1` | 17 | GPIO pin for lane 1 sensor |
| `SENSOR_PIN_2` | 27 | GPIO pin for lane 2 sensor |
| `SENSOR_PIN_3` | 22 | GPIO pin for lane 3 sensor |
| `SENSOR_PIN_4` | 23 | GPIO pin for lane 4 sensor |

Edit `/etc/systemd/system/track-api.service` to change these.

---

## Troubleshooting

**Can't find Pi on network:**
```bash
# Try direct IP scan
nmap -sn 192.168.1.0/24 | grep -i raspberry

# Or check your router's DHCP client list
```

**Service not running:**
```bash
ssh pi@track-controller.local
sudo systemctl status track-api
sudo journalctl -u track-api -f
```

**Restart the service:**
```bash
sudo systemctl restart track-api
```

**Check setup logs (first boot):**
```bash
cat /var/log/track-api-setup.log
```

---

## File Structure

```
pi/
├── os/
│   └── *.img[.xz]          # Raspberry Pi OS image (you provide)
├── code/
│   ├── main.py             # FastAPI application
│   ├── models.py           # Pydantic schemas
│   ├── hardware.py         # GPIO/Mock hardware interface
│   ├── storage.py          # JSON file history
│   └── discovery.py        # Zeroconf/mDNS
├── setup/
│   ├── prepare_sd.sh       # Interactive SD card setup
│   ├── track-api.service   # systemd unit file
│   └── first_boot.sh       # Manual setup (alternative)
├── env.template            # WiFi config template
├── .env                    # Your WiFi config (git-ignored)
├── Dockerfile.dev          # Local development container
├── requirements.txt        # Python dependencies
└── README.md               # This file
```
