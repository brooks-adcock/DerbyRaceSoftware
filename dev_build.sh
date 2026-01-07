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

# Get specific service if provided
SERVICE=$1

if [ -n "$SERVICE" ]; then
    echo "🏗️ Rebuilding specific service: $SERVICE"
    echo "=== BUILD SERVICE ($SERVICE): $(date)" >> "$LOG_FILE"
    
    # Stop and remove the service and its anonymous volumes (like node_modules)
    docker compose -f docker-compose.dev.yml rm -fs "$SERVICE" -v
    
    # Fresh build with no cache
    docker compose -f docker-compose.dev.yml build "$SERVICE" --no-cache
else
    echo "🏗️ Rebuilding all services"
    echo "=== BUILD ALL: $(date)" >> "$LOG_FILE"
    
    # Remove project's containers, locally-built images, and ALL anonymous volumes
    docker compose -f docker-compose.dev.yml down --rmi local -v
    
    # Fresh build with no cache
    docker compose -f docker-compose.dev.yml build --no-cache
fi

