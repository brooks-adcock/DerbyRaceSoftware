#!/bin/bash
# Pinewood Derby Track Controller - SD Card Preparation Script
# Flashes OS image and pre-configures everything for zero-touch Pi boot
#
# Usage: ./prepare_sd.sh
# Configuration is loaded from ../env.template (copy to ../.env first)

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PI_DIR="$(dirname "$SCRIPT_DIR")"
OS_DIR="$PI_DIR/os"
ENV_FILE="$PI_DIR/.env"

# ============================================
# Load Configuration
# ============================================

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: Configuration file not found${NC}"
    echo ""
    echo "Please create your .env file:"
    echo "  cp $PI_DIR/env.template $ENV_FILE"
    echo "  # Then edit $ENV_FILE with your WiFi credentials"
    exit 1
fi

# Source the env file
set -a
source "$ENV_FILE"
set +a

# Validate required variables
MISSING_VARS=""
[ -z "$DEV_WIFI_SSID" ] && MISSING_VARS="$MISSING_VARS DEV_WIFI_SSID"
[ -z "$DEV_WIFI_PASSWORD" ] && MISSING_VARS="$MISSING_VARS DEV_WIFI_PASSWORD"
[ -z "$VENUE_WIFI_SSID" ] && MISSING_VARS="$MISSING_VARS VENUE_WIFI_SSID"
[ -z "$VENUE_WIFI_PASSWORD" ] && MISSING_VARS="$MISSING_VARS VENUE_WIFI_PASSWORD"

if [ -n "$MISSING_VARS" ]; then
    echo -e "${RED}Error: Missing required variables in .env:${NC}"
    echo "  $MISSING_VARS"
    exit 1
fi

# Defaults
PI_HOSTNAME="${PI_HOSTNAME:-track-controller}"
PI_USER="${PI_USER:-pi}"
PI_PASSWORD="${PI_PASSWORD:-pinewood2024}"
NUM_TRACKS="${NUM_TRACKS:-4}"

# ============================================
# Find OS Image
# ============================================

OS_IMAGE=$(find "$OS_DIR" -maxdepth 1 \( -name "*.img" -o -name "*.img.xz" \) 2>/dev/null | head -1)

if [ -z "$OS_IMAGE" ] || [ ! -f "$OS_IMAGE" ]; then
    echo -e "${RED}Error: No OS image found in $OS_DIR${NC}"
    echo "Download Raspberry Pi OS Lite (64-bit) and place it in:"
    echo "  $OS_DIR/"
    echo "Supported formats: .img, .img.xz"
    exit 1
fi

# ============================================
# Interactive Disk Selection
# ============================================

echo ""
echo -e "${CYAN}=========================================="
echo "Pinewood Derby SD Card Preparation"
echo "==========================================${NC}"
echo ""
echo -e "${YELLOW}Please insert the SD card now.${NC}"
echo ""
read -p "Press ENTER when the SD card is inserted..." _

echo ""
echo "Scanning for disks..."
sleep 2

# Get list of external/removable disks (exclude disk0 and disk1 which are typically system)
echo ""
echo "Available disks:"
echo "----------------"

# Build array of candidate disks
DISKS=()
while IFS= read -r line; do
    disk_path=$(echo "$line" | awk '{print $1}')
    # Skip system disks
    if [[ "$disk_path" == "/dev/disk0" ]] || [[ "$disk_path" == "/dev/disk1" ]]; then
        continue
    fi
    DISKS+=("$disk_path")
done < <(diskutil list | grep -E "^/dev/disk[0-9]+")

if [ ${#DISKS[@]} -eq 0 ]; then
    echo -e "${RED}No removable disks found!${NC}"
    echo "Make sure your SD card is properly inserted."
    exit 1
fi

# Display disks with details
for i in "${!DISKS[@]}"; do
    disk="${DISKS[$i]}"
    # Get disk info
    disk_info=$(diskutil info "$disk" 2>/dev/null | grep -E "(Device / Media Name|Disk Size)" | head -2)
    disk_name=$(echo "$disk_info" | grep "Device / Media Name" | cut -d':' -f2 | xargs)
    disk_size=$(echo "$disk_info" | grep "Disk Size" | cut -d':' -f2 | cut -d'(' -f1 | xargs)
    
    echo -e "  ${GREEN}[$((i+1))]${NC} $disk"
    echo "      Name: ${disk_name:-Unknown}"
    echo "      Size: ${disk_size:-Unknown}"
    echo ""
done

# Let user select
echo ""
read -p "Enter the number of the SD card disk [1-${#DISKS[@]}]: " disk_choice

# Validate choice
if ! [[ "$disk_choice" =~ ^[0-9]+$ ]] || [ "$disk_choice" -lt 1 ] || [ "$disk_choice" -gt ${#DISKS[@]} ]; then
    echo -e "${RED}Invalid selection.${NC}"
    exit 1
fi

DISK="${DISKS[$((disk_choice-1))]}"

# ============================================
# Confirmation
# ============================================

echo ""
echo "=========================================="
echo "Configuration Summary"
echo "=========================================="
echo ""
echo "OS Image:     $(basename "$OS_IMAGE")"
echo "Target Disk:  $DISK"
echo ""
echo "Pi Hostname:  $PI_HOSTNAME"
echo "Pi User:      $PI_USER"
echo "Tracks:       $NUM_TRACKS"
echo ""
echo "WiFi Networks:"
echo "  1. Dev:   $DEV_WIFI_SSID"
echo "  2. Venue: $VENUE_WIFI_SSID"
echo ""
echo -e "${YELLOW}WARNING: This will ERASE all data on $DISK${NC}"
echo ""
read -p "Type 'YES' to continue: " confirm

if [ "$confirm" != "YES" ]; then
    echo "Aborted."
    exit 1
fi

# ============================================
# Flash the Image
# ============================================

echo ""
echo "Step 1: Unmounting disk..."
diskutil unmountDisk "$DISK" || true

echo ""
echo "Step 2: Flashing OS image (this takes a few minutes)..."
RAW_DISK="${DISK/disk/rdisk}"

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

# Find the boot partition
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

# ============================================
# Configure the Pi
# ============================================

echo ""
echo "Step 4: Enabling SSH..."
touch "$BOOT_VOLUME/ssh"

echo ""
echo "Step 5: Configuring WiFi (both networks)..."
cat > "$BOOT_VOLUME/wpa_supplicant.conf" << EOF
country=US
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1

# Development network (priority 1 - preferred when available)
network={
    ssid="$DEV_WIFI_SSID"
    psk="$DEV_WIFI_PASSWORD"
    key_mgmt=WPA-PSK
    priority=1
}

# Venue network (priority 2 - fallback)
network={
    ssid="$VENUE_WIFI_SSID"
    psk="$VENUE_WIFI_PASSWORD"
    key_mgmt=WPA-PSK
    priority=2
}
EOF

echo ""
echo "Step 6: Configuring default user..."
ENCRYPTED_PW=$(openssl passwd -6 "$PI_PASSWORD")
echo "$PI_USER:$ENCRYPTED_PW" > "$BOOT_VOLUME/userconf.txt"

echo ""
echo "Step 7: Copying track controller code..."
mkdir -p "$BOOT_VOLUME/track-api"
cp -r "$PI_DIR/code/"* "$BOOT_VOLUME/track-api/"
cp "$PI_DIR/requirements.txt" "$BOOT_VOLUME/track-api/"
cp "$SCRIPT_DIR/track-api.service" "$BOOT_VOLUME/track-api/"

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
apt-get install -y python3-pip python3-venv python3-dev i2c-tools

# Enable I2C interface for PCA9685 servo driver
raspi-config nonint do_i2c 0

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
pip install adafruit-circuitpython-pca9685 || true
pip install adafruit-circuitpython-motor || true
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

echo ""
echo "Step 9: Configuring first-boot hook..."
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

cat > "$BOOT_VOLUME/firstrun.sh" << 'FIRSTRUN'
#!/bin/bash
# Enable the setup service on first boot
cp /boot/firmware/track-api/track-api-setup.service /etc/systemd/system/ 2>/dev/null || \
cp /boot/track-api/track-api-setup.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable track-api-setup
FIRSTRUN
chmod +x "$BOOT_VOLUME/firstrun.sh"

# ============================================
# Done
# ============================================

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
echo "Configured WiFi networks:"
echo "  - $DEV_WIFI_SSID (dev - priority)"
echo "  - $VENUE_WIFI_SSID (venue - fallback)"
echo ""
echo -e "${YELLOW}Remember to change the default password!${NC}"
