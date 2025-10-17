# Local Development (macOS / Apple Silicon)

This guide gets TooLoo.ai running locally at `http://127.0.0.1:3000` with one command.

## Prerequisites
- Node.js >= 18 (install via Homebrew or nvm)
- Git + GitHub account (GitHub Desktop is fine)

## One‑command start

```bash
# From anywhere on your Mac (uses ~/Documents/Github/TooLoo by default)
bash -c "$(curl -fsSL https://raw.githubusercontent.com/oripridan-dot/TooLoo.ai/segmentation-engine/scripts/setup-local-macos.sh)"
```

Or, inside the repo:

```bash
npm run local:start
```

This will:
- Clone/update the repo into `~/Documents/Github/TooLoo` (override with `TOOLOO_LOCAL_DIR`)
- Install dependencies
- Start the web server and orchestrator
- Open Control Room + TooLoo Chat in your default browser

## Stop everything

```bash
npm run local:stop
```

This calls `/system/stop`, then stops the local web server.

## Custom path

```bash
TOOLOO_LOCAL_DIR="$HOME/Documents/Custom/TooLoo" npm run local:start
```

## Troubleshooting
- Port busy: change `WEB_PORT=3001 npm run local:start` and visit `http://127.0.0.1:3001`.
- Node version: `node -v` should be 18+. Install with `brew install node@18 && brew link --overwrite --force node@18`.
- Nothing opens: navigate to `http://127.0.0.1:3000/control-room` and `http://127.0.0.1:3000/tooloo-chat` manually.
- Logs: check `.local-run/web.log` in your local repo folder.

## GitHub Desktop
- Clone to `~/Documents/Github/TooLoo` (or your preferred path)
- Set Remote: `origin https://github.com/oripridan-dot/TooLoo.ai.git`
- Use Desktop to commit/push; run the app from Terminal with the commands above.
