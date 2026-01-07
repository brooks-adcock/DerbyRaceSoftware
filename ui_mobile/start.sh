#!/bin/sh
# Dependencies are now installed during build
# Start expo. Metro/Web will be on 8081 inside the container.
# Docker maps host 8081 -> container 8081 (for Native)
# Docker maps host 3001 -> container 8081 (for Web)
npx expo start --tunnel
