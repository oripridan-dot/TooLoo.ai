Single-origin mode is enabled. The API serves the built SPA on the same port.

Open this Codespaces URL in the browser:
- https://${CODESPACE_NAME}-3001.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}

Health:
- https://${CODESPACE_NAME}-3001.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}/api/v1/health

If 502 persists:
- Ensure the forwarding link shows "Open in Browser" for port 3001
- Try reopening the port panel and toggling public/private
- Restart the server: npm run start:prod
