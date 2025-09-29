# TooLoo.ai Usage Guide

TooLoo.ai is your personal AI development assistant that can help you build applications and manage your projects.

## How to Run

### Single Command Start
```bash
./run.sh
```
This will build the web app and start the server in production mode.

### Alternative Start Commands
```bash
# Production mode (API serving SPA)
npm run start:prod

# Development mode (API + Vite dev server)
npm run start:all
```

## Accessing the App

### In GitHub Codespaces
Open this URL in your browser:
```
https://CODESPACE_NAME-3001.app.github.dev
```
Replace `CODESPACE_NAME` with your actual Codespace name.

### Local Development
Open http://localhost:3001 in your browser.

## Filesystem Commands

TooLoo.ai can manage files and projects for you using these commands:

- `list files` or `ls` — Show workspace contents
- `create project [name]` — Create a new project
- `read file [path]` — View a file
- `write file [path] with content ...` — Create/overwrite a file
- `append to [path]: ...` — Append content to a file
- `delete file [path]` — Delete a file
- `search files for "term"` — Find text across files

## API Endpoints

- Health check: `/api/v1/health`
- System status: `/api/v1/system/status`
- Generate content: `/api/v1/generate` (POST)

## Customization

To use offline mode (no external API calls):
```bash
OFFLINE_ONLY=true npm run start:prod
```

To change the port:
```bash
PORT=8080 npm run start:prod
```