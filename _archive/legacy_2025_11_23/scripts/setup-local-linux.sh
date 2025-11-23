#!/bin/bash
# setup-local-linux.sh: Bootstrap TooLoo.ai local dev on Linux
set -e

# Update and install essentials
sudo apt update && sudo apt install -y curl git build-essential xdg-utils

# Install nvm + Node (if not present)
if ! command -v nvm &>/dev/null; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
fi
nvm install 20
nvm use 20

# Install project deps
cd "$(dirname "$0")/.."
npm install

# Start web server and orchestrator
node servers/web-server.js &
sleep 2
curl -s -X POST http://127.0.0.1:${WEB_PORT:-3000}/system/start -H 'Content-Type: application/json' -d '{"autoOpen":false}'

# Open Control Room in browser
xdg-open "http://127.0.0.1:${WEB_PORT:-3000}/control-room" &

echo "TooLoo.ai local dev setup complete. Control Room should be open."
