#!/bin/bash
# Deploy script - run from your development machine to push code to the Pi
# Usage: ./setup/deploy.sh [hostname]

set -e

PI_HOST="${1:-track-controller.local}"
PI_USER="pi"
REMOTE_DIR="~/track-api"

echo "Deploying to $PI_USER@$PI_HOST..."

# Create remote directory
ssh "$PI_USER@$PI_HOST" "mkdir -p $REMOTE_DIR/setup"

# Copy code files
echo "Copying code files..."
scp -r code/* "$PI_USER@$PI_HOST:$REMOTE_DIR/"
scp requirements.txt "$PI_USER@$PI_HOST:$REMOTE_DIR/"
scp -r setup/* "$PI_USER@$PI_HOST:$REMOTE_DIR/setup/"

echo ""
echo "Files deployed successfully!"
echo ""
echo "Next steps on the Pi:"
echo "  ssh $PI_USER@$PI_HOST"
echo "  cd $REMOTE_DIR"
echo "  chmod +x setup/first_boot.sh"
echo "  ./setup/first_boot.sh"
