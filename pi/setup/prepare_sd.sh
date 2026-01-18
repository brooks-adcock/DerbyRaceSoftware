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
PI_PASSWORD="${PI_PASSWORD:-pi}"
NUM_TRACKS="${NUM_TRACKS:-4}"
KEYBOARD_LAYOUT="${KEYBOARD_LAYOUT:-us}"

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
echo "Keyboard:     $KEYBOARD_LAYOUT"
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
echo "Step 5: Configuring WiFi (NetworkManager for Trixie)..."
# Create NetworkManager connection files for Trixie
mkdir -p "$BOOT_VOLUME/track-api/nm-connections"

cat > "$BOOT_VOLUME/track-api/nm-connections/dev-wifi.nmconnection" << EOF
[connection]
id=$DEV_WIFI_SSID
type=wifi
autoconnect=true
autoconnect-priority=100

[wifi]
mode=infrastructure
ssid=$DEV_WIFI_SSID

[wifi-security]
key-mgmt=wpa-psk
psk=$DEV_WIFI_PASSWORD

[ipv4]
method=auto

[ipv6]
method=auto
EOF

cat > "$BOOT_VOLUME/track-api/nm-connections/venue-wifi.nmconnection" << EOF
[connection]
id=$VENUE_WIFI_SSID
type=wifi
autoconnect=true
autoconnect-priority=50

[wifi]
mode=infrastructure
ssid=$VENUE_WIFI_SSID

[wifi-security]
key-mgmt=wpa-psk
psk=$VENUE_WIFI_PASSWORD

[ipv4]
method=auto

[ipv6]
method=auto
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

# Write config file with keyboard layout
echo "KEYBOARD_LAYOUT=$KEYBOARD_LAYOUT" > "$BOOT_VOLUME/track-api/setup.conf"

echo ""
echo "Step 8: Creating first-boot setup script..."
cat > "$BOOT_VOLUME/track-api/setup_on_boot.sh" << 'SETUP_SCRIPT'
#!/bin/bash
# This script runs once on first boot to set up the track controller
LOG="/var/log/track-api-setup.log"
exec > >(tee -a $LOG) 2>&1

echo "$(date): Starting track-api setup..."

# Find boot partition location first (needed to load config)
BOOT_DIR="/boot/firmware"
[ -d "/boot/track-api" ] && BOOT_DIR="/boot"

# Load config
source "$BOOT_DIR/track-api/setup.conf" 2>/dev/null || true
KEYBOARD_LAYOUT="${KEYBOARD_LAYOUT:-us}"

# Set locale
echo "$(date): Setting locale..."
raspi-config nonint do_change_locale en_US.UTF-8

# Set keyboard layout
echo "$(date): Setting keyboard layout ($KEYBOARD_LAYOUT)..."
if [ "$KEYBOARD_LAYOUT" = "dvorak" ]; then
    sed -i 's/XKBLAYOUT=.*/XKBLAYOUT="us"/' /etc/default/keyboard
    sed -i 's/XKBVARIANT=.*/XKBVARIANT="dvorak"/' /etc/default/keyboard
    # If XKBVARIANT line doesn't exist, add it
    grep -q "XKBVARIANT" /etc/default/keyboard || echo 'XKBVARIANT="dvorak"' >> /etc/default/keyboard
    dpkg-reconfigure -f noninteractive keyboard-configuration
    setupcon --force || true
    echo "$(date): Keyboard set to US Dvorak"
else
    raspi-config nonint do_configure_keyboard us
    echo "$(date): Keyboard set to US QWERTY"
fi

# Enable WiFi (set country code and unblock)
echo "$(date): Enabling WiFi..."
raspi-config nonint do_wifi_country US
rfkill unblock wifi

# First: Install NetworkManager WiFi connections
echo "$(date): Configuring WiFi connections..."
if [ -d "$BOOT_DIR/track-api/nm-connections" ]; then
    cp "$BOOT_DIR/track-api/nm-connections/"*.nmconnection /etc/NetworkManager/system-connections/
    chmod 600 /etc/NetworkManager/system-connections/*.nmconnection
    nmcli connection reload
    echo "$(date): WiFi configured, waiting for connection..."
fi

# Wait for network (up to 60 seconds)
for i in {1..30}; do
    if ping -c1 -W2 8.8.8.8 &>/dev/null; then
        echo "$(date): Network connected!"
        break
    fi
    echo "$(date): Waiting for network... ($i/30)"
    sleep 2
done

# Install dependencies
apt-get update
apt-get install -y python3-pip python3-venv python3-dev i2c-tools avahi-daemon

# Ensure avahi (mDNS) is running for .local resolution
systemctl enable avahi-daemon
systemctl start avahi-daemon

# Ensure SSH is enabled
systemctl enable ssh
systemctl start ssh

# Clear any firewall rules that might block incoming
nft flush ruleset 2>/dev/null || true

# Enable I2C interface for PCA9685 servo driver
raspi-config nonint do_i2c 0

# Move code from boot partition to home directory
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

# Set hostname and update /etc/hosts
hostnamectl set-hostname track-controller
grep -q "track-controller" /etc/hosts || echo "127.0.0.1 track-controller" >> /etc/hosts

# Clean up boot partition
rm -rf "$BOOT_DIR/track-api"

echo "$(date): Track-api setup complete!"
SETUP_SCRIPT
chmod +x "$BOOT_VOLUME/track-api/setup_on_boot.sh"

echo ""
echo "Step 9: Configuring automated first-boot..."

# Create systemd service for track-api setup
cat > "$BOOT_VOLUME/track-api/track-api-setup.service" << 'EOF'
[Unit]
Description=Track API First Boot Setup
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/home/pi/track-api/setup_on_boot.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

# Create firstrun script that runs via cmdline.txt
cat > "$BOOT_VOLUME/firstrun.sh" << 'FIRSTRUN'
#!/bin/bash
exec >> /var/log/firstrun.log 2>&1
echo "$(date): First boot script starting..."

# Find boot partition
BOOT=/boot/firmware
[ ! -d "$BOOT/track-api" ] && BOOT=/boot

# CRITICAL: Enable WiFi first (set country and unblock)
echo "$(date): Enabling WiFi (country=US)..."
raspi-config nonint do_wifi_country US
rfkill unblock wifi
sleep 2

# Install NetworkManager WiFi connections
echo "$(date): Installing WiFi connections..."
if [ -d "$BOOT/track-api/nm-connections" ]; then
    cp "$BOOT/track-api/nm-connections/"*.nmconnection /etc/NetworkManager/system-connections/
    chmod 600 /etc/NetworkManager/system-connections/*.nmconnection
    nmcli connection reload
    sleep 3
    # Try to connect
    nmcli device wifi rescan
    sleep 2
    nmcli --wait 30 connection up "$(ls $BOOT/track-api/nm-connections/ | head -1 | sed 's/.nmconnection//')" || true
fi

# Copy code to home directory
echo "$(date): Copying track-api to home..."
mkdir -p /home/pi/track-api
cp -r "$BOOT/track-api/"* /home/pi/track-api/
chown -R pi:pi /home/pi/track-api
chmod +x /home/pi/track-api/setup_on_boot.sh

# Install and start the setup service
echo "$(date): Installing track-api-setup service..."
cp /home/pi/track-api/track-api-setup.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable track-api-setup
systemctl start track-api-setup &

# Clean up cmdline.txt
echo "$(date): Cleaning up cmdline.txt..."
sed -i 's| systemd.run=[^ ]*||g; s| systemd.run_success_action=[^ ]*||g' $BOOT/cmdline.txt

# Remove firstrun script
rm -f $BOOT/firstrun.sh

echo "$(date): First boot script complete! Rebooting..."
sleep 2
reboot
FIRSTRUN
chmod +x "$BOOT_VOLUME/firstrun.sh"

# Modify cmdline.txt to run firstrun.sh on boot
if [ -f "$BOOT_VOLUME/cmdline.txt" ]; then
    CMDLINE=$(cat "$BOOT_VOLUME/cmdline.txt" | tr '\n' ' ' | sed 's/ quiet//g; s/ splash//g')
    echo "${CMDLINE} systemd.run=/boot/firmware/firstrun.sh systemd.run_success_action=none" > "$BOOT_VOLUME/cmdline.txt"
    echo "Added systemd.run to cmdline.txt"
fi

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
echo "  2. Connect power (HDMI optional for monitoring)"
echo "  3. Wait ~5-10 minutes for automated setup"
echo "  4. Access API: http://$PI_HOSTNAME.local:8000/health"
echo ""
echo "Debug commands (if needed):"
echo "  SSH: ssh $PI_USER@$PI_HOSTNAME.local (pw: $PI_PASSWORD)"
echo "  Logs: cat /var/log/firstrun.log"
echo "        cat /var/log/track-api-setup.log"
echo "        sudo journalctl -u track-api -f"
echo ""
echo "Configured WiFi: $DEV_WIFI_SSID (priority), $VENUE_WIFI_SSID (fallback)"
echo ""
echo -e "${YELLOW}Remember to change the default password!${NC}"
