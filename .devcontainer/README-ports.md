# TooLoo.ai Port Configuration

All 16+ services are configured for Codespaces port forwarding in `devcontainer.json`.

## Web Services

- **3000**: Web Server (Control Room UI + API proxy)
- **3001**: Training Server
- **3002**: Meta Server
- **3003**: Budget Server
- **3004**: Coach Server
- **3005**: Cup Server
- **3006**: Product Development Server
- **3007**: Segmentation Server
- **3008**: Reports Server
- **3009**: Capabilities Server

## V3 Modern Architecture Services

- **3020**: Context Service
- **3100**: Orchestration Service
- **3123**: Orchestrator (master process)
- **3200**: Provider Service
- **3300**: Analytics Service
- **3400**: Integration Service

## Accessing Services

**Web UI:**

- https://${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}

**API Health Check:**

- https://${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}/api/v1/health

**Individual Service Health:**

- Replace `3000` with any service port above (e.g., `3001`, `3002`, etc.)
- Example: https://${CODESPACE_NAME}-3001.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}/health

## Troubleshooting

**If ports don't appear in the Ports panel:**

1. Refresh the Ports panel (icon at top)
2. Ensure services are running: `npm run dev`
3. Wait 5-8 seconds for orchestrator to spawn all services
4. Check actual ports: `lsof -i -P -n 2>/dev/null | grep LISTEN`

**If 502 error persists:**

- Ensure the service is responding: `curl http://127.0.0.1:3000/health`
- Try toggling public/private visibility in Ports panel
- Restart: `npm run dev`


