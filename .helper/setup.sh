#!/bin/bash

set -e

echo "=== Environment Setup ==="

# Check if MacPorts is installed
if ! command -v port &> /dev/null; then
    echo "❌ MacPorts is not installed."
    echo "Please install MacPorts from: https://www.macports.org/install.php"
    echo "After installation, run this script again."
    exit 1
fi

echo "✅ MacPorts is installed"

# List of required packages
PACKAGES=("colima" "docker" "docker-compose-plugin")

for pkg in "${PACKAGES[@]}"; do
    if port installed "$pkg" 2>/dev/null | grep -q "$pkg"; then
        echo "✅ $pkg is already installed"
    else
        echo "📦 Installing $pkg..."
        sudo port install "$pkg"
        echo "✅ $pkg installed"
    fi
done

echo ""
echo "=== Project Configuration ==="

COMPOSE_FILE="$(dirname "$0")/../docker-compose.dev.yml"
CURRENT_NAME=$(grep -m1 "^name:" "$COMPOSE_FILE" | awk '{print $2}')

if [ "$CURRENT_NAME" = "template" ]; then
    echo "Project name is still 'template'. Let's set a proper name."
    read -p "Enter project name: " PROJECT_NAME
    
    # Make docker-legal: lowercase, replace spaces/special chars with hyphens, remove invalid chars
    PROJECT_NAME=$(echo "$PROJECT_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | sed 's/[^a-z0-9_-]//g')
    
    if [ -z "$PROJECT_NAME" ]; then
        echo "❌ Invalid project name. Keeping 'template'."
    else
        sed -i '' "s/^name: template$/name: $PROJECT_NAME/" "$COMPOSE_FILE"
        echo "✅ Project name set to: $PROJECT_NAME"
    fi
else
    echo "✅ Project name: $CURRENT_NAME"
fi

echo ""
echo "=== Setup Complete ==="
echo "Run 'colima start' to start the container runtime."

