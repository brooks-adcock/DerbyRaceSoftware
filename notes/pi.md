# Raspberry Pi Notes

> **Keep Updated:** When learning new Pi-specific quirks, say "update pi notes" to add them here.

## OS Info
- Running: Raspberry Pi OS Trixie (Debian 13, 64-bit Lite)
- Uses NetworkManager (not wpa_supplicant)

## Keyboard Layout

`localectl list-keymaps` doesn't work on Pi OS Lite (no keymap files installed).

### Set Dvorak manually:
```bash
sudo sed -i 's/XKBLAYOUT=.*/XKBLAYOUT="us"/' /etc/default/keyboard
sudo sed -i 's/XKBVARIANT=.*/XKBVARIANT="dvorak"/' /etc/default/keyboard
sudo dpkg-reconfigure -f noninteractive keyboard-configuration
sudo setupcon --force
```

### Or via raspi-config:
Localisation Options → Keyboard → Generic 104-key → Other → English (US) → English (US, Dvorak)

## Servo Control (curl commands)

```bash
# Test servo at specific angle (0-180)
curl -X POST http://localhost:8000/servo/test -H "Content-Type: application/json" -d '{"angle": 45}'

# Get calibration
curl http://localhost:8000/servo/calibration

# Set calibration
curl -X POST http://localhost:8000/servo/calibration -H "Content-Type: application/json" -d '{"up_angle": 90, "down_angle": 0}'

# Control gate
curl -X POST http://localhost:8000/gate -H "Content-Type: application/json" -d '{"is_down": true}'
```

## Useful Debug Commands

```bash
# Service logs
sudo journalctl -u track-api -f

# Setup logs
cat /var/log/firstrun.log
cat /var/log/track-api-setup.log

# Check service status
sudo systemctl status track-api

# Restart service
sudo systemctl restart track-api
```

## Default Credentials
- User: `pi`
- Password: `pi`

## Network Discovery

```bash
# Find Pi on network via mDNS
ping track-controller.local

# Or scan network
nmap -sn 192.168.1.0/24 | grep -i raspberry

# Check mDNS registration
avahi-browse -art | grep track-controller
```

## I2C (Servo Controller)

```bash
# Verify PCA9685 is detected (should show 0x40)
sudo i2cdetect -y 1

# If not detected, enable I2C
sudo raspi-config  # Interface Options → I2C → Enable
```

## Race API Quick Reference

```bash
# Health check
curl http://track-controller.local:8000/health

# Start a race
curl -X POST http://track-controller.local:8000/race/run \
  -H "Content-Type: application/json" \
  -d '{"heat_id": "heat-001", "occupied_lanes": [1, 2, 3, 4]}'

# Get last result
curl http://track-controller.local:8000/history/last
```
