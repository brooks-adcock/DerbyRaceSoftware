#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="$SCRIPT_DIR/logs/docker.log"

if [ ! -f "$LOG_FILE" ]; then
    echo "Waiting for logs to be created..."
    touch "$LOG_FILE"
fi

tail -f "$LOG_FILE"

