#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"
LOG_FILE="$LOG_DIR/docker.log"

mkdir -p "$LOG_DIR"

if ! colima status &> /dev/null; then
    echo "❌ Colima is not running. Starting colima..."
    colima start
fi

# Log separator
echo "" >> "$LOG_FILE"
echo "================================================================================" >> "$LOG_FILE"
echo "=== START: $(date)" >> "$LOG_FILE"
echo "================================================================================" >> "$LOG_FILE"

docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml up -d

echo "✅ Services started in background"
echo "📄 Logs: $LOG_FILE"
echo "   ./dev_tail.sh"

# Follow logs to file (appends)
docker compose -f docker-compose.dev.yml logs -f >> "$LOG_FILE" 2>&1 &

