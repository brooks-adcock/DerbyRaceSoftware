#!/bin/bash
# Pinewood Derby Track Controller - SD Card Preparation Script
# Flashes OS image and pre-configures everything for zero-touch Pi boot
#
# Usage: ./prepare_sd.sh /dev/diskN [wifi_ssid] [wifi_password]
# Example: ./prepare_sd.sh /dev/disk4 "MyNetwork" "MyPassword123"

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PI_DIR="$(dirname "$SCRIPT_DIR")"
OS_DIR="$PI_DIR/os"

# Find the OS image (supports .img and .img.xz)
OS_IMAGE=$(find "$OS_DIR" -maxdepth 1 -name "*.img" -o -name "*.img.xz" 2>/dev/null | head -1)

# Configuration
PI_HOSTNAME="track-controller"
PI_USER="pi"
PI_PASSWORD="pinewood2024"  # Change this!
NUM_TRACKS=4

# Parse arguments
DISK="$1"
WIFI_SSID="$2"
WIFI_PASSWORD="$3"

if [ -z "$DISK" ]; then
    echo -e "${RED}Usage: $0 /dev/diskN [wifi_ssid] [wifi_password]${NC}"
    echo ""
    echo "Available disks:"
    diskutil list | grep -E "^/dev/disk"
    exit 1
fi

if [ -z "$OS_IMAGE" ] || [ ! -f "$OS_IMAGE" ]; then
    echo -e "${RED}Error: No OS image found in $OS_DIR${NC}"
    echo "Download Raspberry Pi OS Lite (64-bit) and place it in:"
    echo "  $OS_DIR/"
    echo "Supported formats: .img, .img.xz"
    exit 1
fi

echo "Found OS image: $(basename "$OS_IMAGE")"

# Safety check - don't flash system disk
if [ "$DISK" == "/dev/disk0" ] || [ "$DISK" == "/dev/disk1" ]; then
    echo -e "${RED}Error: Refusing to flash system disk $DISK${NC}"
    exit 1
fi

echo "=========================================="
echo "Pinewood Derby SD Card Preparation"
echo "=========================================="
echo ""
echo "Disk:     $DISK"
echo "Image:    $OS_IMAGE"
echo "Hostname: $PI_HOSTNAME"
echo "User:     $PI_USER"
[ -n "$WIFI_SSID" ] && echo "WiFi:     $WIFI_SSID"
echo ""
echo -e "${YELLOW}WARNING: This will ERASE all data on $DISK${NC}"
echo ""
read -p "Type 'YES' to continue: " confirm

if [ "$confirm" != "YES" ]; then
    echo "Aborted."
    exit 1
fi

# Unmount disk
echo ""
echo "Step 1: Unmounting disk..."
diskutil unmountDisk "$DISK" || true

# Flash the image
echo ""
echo "Step 2: Flashing OS image (this takes a few minutes)..."
RAW_DISK="${DISK/disk/rdisk}"  # Use raw disk for faster writes on macOS

if [[ "$OS_IMAGE" == *.xz ]]; then
    echo "Decompressing and flashing (xz compressed image)..."
    xzcat "$OS_IMAGE" | sudo dd of="$RAW_DISK" bs=4m status=progress
else
    sudo dd if="$OS_IMAGE" of="$RAW_DISK" bs=4m status=progress
fi
sync

echo ""
echo "Step 3: Waiting for boot partition to mount..."
sleep 3
diskutil mountDisk "$DISK"
sleep 2

# Find the boot partition (named 'bootfs' on recent Pi OS)
BOOT_VOLUME=""
for vol in /Volumes/bootfs /Volumes/boot; do
    if [ -d "$vol" ]; then
        BOOT_VOLUME="$vol"
        break
    fi
done

if [ -z "$BOOT_VOLUME" ]; then
    echo -e "${RED}Error: Could not find boot partition${NC}"
    echo "Available volumes:"
    ls /Volumes/
    exit 1
fi

echo "Found boot partition: $BOOT_VOLUME"

# Enable SSH
echo ""
echo "Step 4: Enabling SSH..."
touch "$BOOT_VOLUME/ssh"

# Configure WiFi (if provided)
if [ -n "$WIFI_SSID" ] && [ -n "$WIFI_PASSWORD" ]; then
    echo "Step 5: Configuring WiFi..."
    cat > "$BOOT_VOLUME/wpa_supplicant.conf" << EOF
country=US
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1

network={
    ssid="$WIFI_SSID"
    psk="$WIFI_PASSWORD"
    key_mgmt=WPA-PSK
}
EOF
else
    echo "Step 5: Skipping WiFi (no credentials provided)"
fi

# Create userconf for default user (Pi OS Bookworm style)
echo ""
echo "Step 6: Configuring default user..."
# Generate encrypted password
ENCRYPTED_PW=$(openssl passwd -6 "$PI_PASSWORD")
echo "$PI_USER:$ENCRYPTED_PW" > "$BOOT_VOLUME/userconf.txt"

# Copy track-api code to boot partition
echo ""
echo "Step 7: Copying track controller code..."
mkdir -p "$BOOT_VOLUME/track-api"
cp -r "$PI_DIR/code/"* "$BOOT_VOLUME/track-api/"
cp "$PI_DIR/requirements.txt" "$BOOT_VOLUME/track-api/"
cp "$SCRIPT_DIR/track-api.service" "$BOOT_VOLUME/track-api/"

# Create the firstrun setup script
echo ""
echo "Step 8: Creating first-boot setup script..."
cat > "$BOOT_VOLUME/track-api/setup_on_boot.sh" << 'SETUP_SCRIPT'
#!/bin/bash
# This script runs once on first boot to set up the track controller
LOG="/var/log/track-api-setup.log"
exec > >(tee -a $LOG) 2>&1

echo "$(date): Starting track-api setup..."

# Wait for network
sleep 10

# Install dependencies
apt-get update
apt-get install -y python3-pip python3-venv python3-dev

# Move code from boot partition to home directory
BOOT_DIR="/boot/firmware"
[ -d "/boot/track-api" ] && BOOT_DIR="/boot"

mkdir -p /home/pi/track-api
cp -r "$BOOT_DIR/track-api/"* /home/pi/track-api/
chown -R pi:pi /home/pi/track-api

# Create venv and install deps
sudo -u pi bash << 'VENV_SETUP'
cd /home/pi/track-api
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install RPi.GPIO || true
VENV_SETUP

# Install systemd service
cp /home/pi/track-api/track-api.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable track-api
systemctl start track-api

# Set hostname
hostnamectl set-hostname track-controller

# Remove setup script from boot partition
rm -rf "$BOOT_DIR/track-api"

# Remove from rc.local
sed -i '/setup_on_boot/d' /etc/rc.local

echo "$(date): Track-api setup complete!"
SETUP_SCRIPT
chmod +x "$BOOT_VOLUME/track-api/setup_on_boot.sh"

# Hook into rc.local for first boot execution
# We need to modify the rootfs partition for this, which requires the disk to be mounted
echo ""
echo "Step 9: Configuring first-boot hook..."

# Create a custom cmdline.txt with init script
# Actually, we'll use a simpler approach: create a systemd oneshot service
cat > "$BOOT_VOLUME/track-api/track-api-setup.service" << EOF
[Unit]
Description=Track API First Boot Setup
After=network-online.target
Wants=network-online.target
ConditionPathExists=/boot/firmware/track-api/setup_on_boot.sh

[Service]
Type=oneshot
ExecStart=/boot/firmware/track-api/setup_on_boot.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

# Create a script that will be sourced by firstrun
cat > "$BOOT_VOLUME/firstrun.sh" << 'FIRSTRUN'
#!/bin/bash
# Enable the setup service on first boot
cp /boot/firmware/track-api/track-api-setup.service /etc/systemd/system/ 2>/dev/null || \
cp /boot/track-api/track-api-setup.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable track-api-setup
FIRSTRUN
chmod +x "$BOOT_VOLUME/firstrun.sh"

# Eject disk
echo ""
echo "Step 10: Ejecting disk..."
sync
diskutil eject "$DISK"

echo ""
echo -e "${GREEN}=========================================="
echo "SD Card Preparation Complete!"
echo "==========================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Insert SD card into Raspberry Pi"
echo "  2. Connect power"
echo "  3. Wait ~3-5 minutes for first boot setup"
echo "  4. Access the API at: http://$PI_HOSTNAME.local:8000/health"
echo ""
echo "Credentials:"
echo "  SSH: ssh $PI_USER@$PI_HOSTNAME.local"
echo "  Password: $PI_PASSWORD"
echo ""
echo -e "${YELLOW}Remember to change the default password!${NC}"
