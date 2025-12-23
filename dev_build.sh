#!/bin/bash

if ! colima status &> /dev/null; then
    echo "❌ Colima is not running. Starting colima..."
    colima start
fi

docker compose -f docker-compose.dev.yml build

