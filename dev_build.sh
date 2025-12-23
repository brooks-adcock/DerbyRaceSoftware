#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="$SCRIPT_DIR/logs/docker.log"

if ! colima status &> /dev/null; then
    echo "❌ Colima is not running. Starting colima..."
    colima start
fi

# Log separator
mkdir -p "$SCRIPT_DIR/logs"
echo "" >> "$LOG_FILE"
echo "================================================================================" >> "$LOG_FILE"
echo "=== BUILD STARTED: $(date)" >> "$LOG_FILE"
echo "================================================================================" >> "$LOG_FILE"

# Remove this project's containers and locally-built images
docker compose -f docker-compose.dev.yml down --rmi local

# Fresh build with no cache
docker compose -f docker-compose.dev.yml build --no-cache

