#!/bin/bash
# Deploy script - run from your development machine to push code to the Pi
# Usage: ./setup/deploy.sh [hostname] [password]
# Example: ./setup/deploy.sh 192.168.1.106 pi

set -e

PI_HOST="${1:-track-controller.local}"
PI_PASS="${2:-pi}"
PI_USER="pi"
REMOTE_DIR="~/track-api"

# Use sshpass if password provided
if command -v sshpass &> /dev/null && [ -n "$PI_PASS" ]; then
    SSH_CMD="sshpass -p '$PI_PASS' ssh -o StrictHostKeyChecking=no"
    SCP_CMD="sshpass -p '$PI_PASS' scp -o StrictHostKeyChecking=no"
else
    SSH_CMD="ssh"
    SCP_CMD="scp"
fi

echo "Deploying to $PI_USER@$PI_HOST..."

# Create remote directory
eval "$SSH_CMD $PI_USER@$PI_HOST 'mkdir -p $REMOTE_DIR/setup'"

# Copy code files
echo "Copying code files..."
eval "$SCP_CMD -r code/* $PI_USER@$PI_HOST:$REMOTE_DIR/"
eval "$SCP_CMD requirements.txt $PI_USER@$PI_HOST:$REMOTE_DIR/"
eval "$SCP_CMD -r setup/* $PI_USER@$PI_HOST:$REMOTE_DIR/setup/"

echo ""
echo "Files deployed successfully!"

# Check if service exists and restart it
echo ""
echo "Restarting track-api service..."
eval "$SSH_CMD $PI_USER@$PI_HOST 'sudo systemctl restart track-api 2>/dev/null && echo Service restarted || echo Service not installed yet'"

# Wait and verify
sleep 2
echo ""
echo "Checking service status..."
eval "$SSH_CMD $PI_USER@$PI_HOST 'curl -s http://localhost:8000/health 2>/dev/null || echo API not responding'"

echo ""
echo "Done! If this is first deploy, run on Pi:"
echo "  cd $REMOTE_DIR && chmod +x setup/first_boot.sh && ./setup/first_boot.sh"
