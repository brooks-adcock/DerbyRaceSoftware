#!/bin/bash
# Basic SD Card Preparation - SSH-ready Pi with no project code
# For testing clean SSH connectivity
#
# Usage: ./prepare_basic_sd.sh

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

set -a
source "$ENV_FILE"
set +a

# Validate required WiFi vars
MISSING_VARS=""
[ -z "$DEV_WIFI_SSID" ] && MISSING_VARS="$MISSING_VARS DEV_WIFI_SSID"
[ -z "$DEV_WIFI_PASSWORD" ] && MISSING_VARS="$MISSING_VARS DEV_WIFI_PASSWORD"

if [ -n "$MISSING_VARS" ]; then
    echo -e "${RED}Error: Missing required variables in .env:${NC}"
    echo "  $MISSING_VARS"
    exit 1
fi

# Defaults
PI_HOSTNAME="${PI_HOSTNAME:-track-controller}"
PI_USER="${PI_USER:-pi}"
PI_PASSWORD="${PI_PASSWORD:-pi}"
KEYBOARD_LAYOUT="${KEYBOARD_LAYOUT:-dvorak}"

# ============================================
# Find OS Image
# ============================================

OS_IMAGE=$(find "$OS_DIR" -maxdepth 1 \( -name "*.img" -o -name "*.img.xz" \) 2>/dev/null | head -1)

if [ -z "$OS_IMAGE" ] || [ ! -f "$OS_IMAGE" ]; then
    echo -e "${RED}Error: No OS image found in $OS_DIR${NC}"
    echo "Download Raspberry Pi OS Lite (64-bit) and place it in:"
    echo "  $OS_DIR/"
    exit 1
fi

# ============================================
# Interactive Disk Selection
# ============================================

echo ""
echo -e "${CYAN}=========================================="
echo "Basic SD Card Preparation (No Project Code)"
echo "==========================================${NC}"
echo ""
echo -e "${YELLOW}Please insert the SD card now.${NC}"
echo ""
read -p "Press ENTER when the SD card is inserted..." _

echo ""
echo "Scanning for disks..."
sleep 2

DISKS=()
while IFS= read -r line; do
    disk_path=$(echo "$line" | awk '{print $1}')
    if [[ "$disk_path" == "/dev/disk0" ]] || [[ "$disk_path" == "/dev/disk1" ]]; then
        continue
    fi
    DISKS+=("$disk_path")
done < <(diskutil list | grep -E "^/dev/disk[0-9]+")

if [ ${#DISKS[@]} -eq 0 ]; then
    echo -e "${RED}No removable disks found!${NC}"
    exit 1
fi

echo ""
echo "Available disks:"
for i in "${!DISKS[@]}"; do
    disk="${DISKS[$i]}"
    disk_info=$(diskutil info "$disk" 2>/dev/null | grep -E "(Device / Media Name|Disk Size)" | head -2)
    disk_name=$(echo "$disk_info" | grep "Device / Media Name" | cut -d':' -f2 | xargs)
    disk_size=$(echo "$disk_info" | grep "Disk Size" | cut -d':' -f2 | cut -d'(' -f1 | xargs)
    echo -e "  ${GREEN}[$((i+1))]${NC} $disk - ${disk_name:-Unknown} (${disk_size:-Unknown})"
done

echo ""
read -p "Enter the number of the SD card disk [1-${#DISKS[@]}]: " disk_choice

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
echo "Keyboard:     $KEYBOARD_LAYOUT"
echo "WiFi:         $DEV_WIFI_SSID"
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
echo "Step 2: Flashing OS image..."
RAW_DISK="${DISK/disk/rdisk}"

if [[ "$OS_IMAGE" == *.xz ]]; then
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

BOOT_VOLUME=""
for vol in /Volumes/bootfs /Volumes/boot; do
    if [ -d "$vol" ]; then
        BOOT_VOLUME="$vol"
        break
    fi
done

if [ -z "$BOOT_VOLUME" ]; then
    echo -e "${RED}Error: Could not find boot partition${NC}"
    ls /Volumes/
    exit 1
fi

echo "Found boot partition: $BOOT_VOLUME"

# ============================================
# Configure the Pi (Basics Only)
# ============================================

echo ""
echo "Step 4: Enabling SSH..."
touch "$BOOT_VOLUME/ssh"

echo ""
echo "Step 5: Configuring WiFi..."
mkdir -p "$BOOT_VOLUME/basic-setup"

cat > "$BOOT_VOLUME/basic-setup/dev-wifi.nmconnection" << EOF
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

echo ""
echo "Step 6: Configuring user ($PI_USER)..."
ENCRYPTED_PW=$(openssl passwd -6 "$PI_PASSWORD")
echo "$PI_USER:$ENCRYPTED_PW" > "$BOOT_VOLUME/userconf.txt"

echo ""
echo "Step 7: Creating firstrun script..."
cat > "$BOOT_VOLUME/firstrun.sh" << FIRSTRUN
#!/bin/bash
exec >> /var/log/firstrun.log 2>&1
echo "\$(date): First boot script starting..."

BOOT=/boot/firmware
[ ! -d "\$BOOT/basic-setup" ] && BOOT=/boot

# Enable WiFi
echo "\$(date): Enabling WiFi (country=US)..."
raspi-config nonint do_wifi_country US
rfkill unblock wifi
sleep 2

# Install WiFi connection
echo "\$(date): Installing WiFi connection..."
if [ -d "\$BOOT/basic-setup" ]; then
    cp "\$BOOT/basic-setup/"*.nmconnection /etc/NetworkManager/system-connections/
    chmod 600 /etc/NetworkManager/system-connections/*.nmconnection
    nmcli connection reload
    sleep 3
    nmcli device wifi rescan
    sleep 2
    nmcli --wait 30 connection up "$DEV_WIFI_SSID" || true
fi

# Set keyboard to dvorak
echo "\$(date): Setting keyboard to $KEYBOARD_LAYOUT..."
if [ "$KEYBOARD_LAYOUT" = "dvorak" ]; then
    sed -i 's/XKBLAYOUT=.*/XKBLAYOUT="us"/' /etc/default/keyboard
    sed -i 's/XKBVARIANT=.*/XKBVARIANT="dvorak"/' /etc/default/keyboard
    grep -q "XKBVARIANT" /etc/default/keyboard || echo 'XKBVARIANT="dvorak"' >> /etc/default/keyboard
    dpkg-reconfigure -f noninteractive keyboard-configuration
    setupcon --force || true
fi

# Set locale
raspi-config nonint do_change_locale en_US.UTF-8

# Set hostname
hostnamectl set-hostname $PI_HOSTNAME
grep -q "$PI_HOSTNAME" /etc/hosts || echo "127.0.0.1 $PI_HOSTNAME" >> /etc/hosts

# Ensure SSH is running
systemctl enable ssh
systemctl start ssh

# Clean up cmdline.txt
sed -i 's| systemd.run=[^ ]*||g; s| systemd.run_success_action=[^ ]*||g' \$BOOT/cmdline.txt

# Clean up
rm -rf \$BOOT/basic-setup
rm -f \$BOOT/firstrun.sh

echo "\$(date): First boot complete! Rebooting..."
sleep 2
reboot
FIRSTRUN
chmod +x "$BOOT_VOLUME/firstrun.sh"

# Modify cmdline.txt
if [ -f "$BOOT_VOLUME/cmdline.txt" ]; then
    CMDLINE=$(cat "$BOOT_VOLUME/cmdline.txt" | tr '\n' ' ' | sed 's/ quiet//g; s/ splash//g')
    echo "${CMDLINE} systemd.run=/boot/firmware/firstrun.sh systemd.run_success_action=none" > "$BOOT_VOLUME/cmdline.txt"
fi

# ============================================
# Done
# ============================================

echo ""
echo "Step 8: Ejecting disk..."
sync
diskutil eject "$DISK"

echo ""
echo -e "${GREEN}=========================================="
echo "Basic SD Card Ready!"
echo "==========================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Insert SD card into Pi"
echo "  2. Power on and wait ~2-3 minutes"
echo "  3. SSH: ssh $PI_USER@$PI_HOSTNAME.local"
echo "     Password: $PI_PASSWORD"
echo ""
echo "WiFi: $DEV_WIFI_SSID"
echo "Keyboard: $KEYBOARD_LAYOUT"
echo ""
