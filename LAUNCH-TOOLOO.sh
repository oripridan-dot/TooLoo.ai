#!/usr/bin/env bash
set -euo pipefail

echo "Launching TooLoo.ai..."

# Make 5173 public in Codespaces (prevents 401)
if [[ -n "${CODESPACES-}" && -n "${CODESPACE_NAME-}" ]]; then
  gh codespace ports visibility 5173:public -c "$CODESPACE_NAME" >/dev/null 2>&1 || true
fi

pkill -f "node|vite" >/dev/null 2>&1 || true
npm run dev &

sleep 4

if [[ -n "${CODESPACES-}" && -n "${CODESPACE_NAME-}" ]]; then
  URL="https://${CODESPACE_NAME}-5173.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}/"
  echo "Opening $URL"
  "$BROWSER" "$URL" >/dev/null 2>&1 || true
else
  "$BROWSER" "http://localhost:5173" >/dev/null 2>&1 || true
fi

# Execute this in your terminal to fix everything
cd /workspaces/TooLoo.ai && \
chmod +x LAUNCH-TOOLOO.sh && \
npm install && \
cd web-app && \
npm install && \
npm install --save-dev vitest@latest @vitejs/plugin-react@latest jsdom@latest && \
cd .. && \
./LAUNCH-TOOLOO.sh