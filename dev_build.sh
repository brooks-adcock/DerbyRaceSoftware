#!/bin/bash

if ! colima status &> /dev/null; then
    echo "❌ Colima is not running. Starting colima..."
    colima start
fi

# Remove this project's containers and locally-built images
docker compose -f docker-compose.dev.yml down --rmi local

# Fresh build with no cache
docker compose -f docker-compose.dev.yml build --no-cache

