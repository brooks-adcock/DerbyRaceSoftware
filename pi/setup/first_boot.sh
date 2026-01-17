#!/bin/bash
# Pinewood Derby Track Controller - First Boot Setup Script
# Run this on a fresh Raspberry Pi OS Lite installation

set -e  # Exit on any error

echo "=========================================="
echo "Pinewood Derby Track Controller Setup"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}Please do not run as root. Run as the 'pi' user.${NC}"
    exit 1
fi

INSTALL_DIR="$HOME/track-api"

echo ""
echo "Step 1: Updating system packages..."
sudo apt update && sudo apt upgrade -y

echo ""
echo "Step 2: Installing required system packages..."
sudo apt install -y \
    python3-pip \
    python3-venv \
    python3-dev \
    libgpiod2 \
    git

echo ""
echo "Step 3: Setting up application directory..."
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# Check if code files exist
if [ ! -f "main.py" ]; then
    echo -e "${RED}Error: Code files not found in $INSTALL_DIR${NC}"
    echo "Please copy the code files first:"
    echo "  scp -r pi/code/* pi/requirements.txt pi@track-controller.local:~/track-api/"
    exit 1
fi

echo ""
echo "Step 4: Creating Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

echo ""
echo "Step 5: Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Install RPi.GPIO for real hardware
echo ""
echo "Step 6: Installing Raspberry Pi GPIO library..."
pip install RPi.GPIO || echo "Note: RPi.GPIO install failed (expected if not on real Pi)"

echo ""
echo "Step 7: Installing systemd service..."
sudo cp setup/track-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable track-api

echo ""
echo "Step 8: Starting the service..."
sudo systemctl start track-api

# Wait a moment for service to start
sleep 2

echo ""
echo "Step 9: Verifying installation..."
if curl -s http://localhost:8000/health > /dev/null; then
    echo -e "${GREEN}✓ Track Controller API is running!${NC}"
    echo ""
    curl -s http://localhost:8000/health | python3 -m json.tool
else
    echo -e "${RED}✗ Service failed to start. Check logs:${NC}"
    echo "  sudo journalctl -u track-api -f"
    exit 1
fi

echo ""
echo "=========================================="
echo -e "${GREEN}Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "The Track Controller is now running and will start automatically on boot."
echo ""
echo "Useful commands:"
echo "  View logs:      sudo journalctl -u track-api -f"
echo "  Restart:        sudo systemctl restart track-api"
echo "  Stop:           sudo systemctl stop track-api"
echo "  Health check:   curl http://track-controller.local:8000/health"
echo ""
