#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"
LOG_FILE="$LOG_DIR/docker.log"

echo "" >> "$LOG_FILE"
echo "================================================================================" >> "$LOG_FILE"
echo "=== STOP: $(date)" >> "$LOG_FILE"
echo "================================================================================" >> "$LOG_FILE"

docker compose -f docker-compose.dev.yml down

echo "✅ Services stopped"

