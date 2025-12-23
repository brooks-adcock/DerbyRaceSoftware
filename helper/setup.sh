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
PACKAGES=("colima" "docker" "docker-compose")

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
echo "=== Setup Complete ==="
echo "Run 'colima start' to start the container runtime."

