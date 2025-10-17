# TooLoo.ai Quick Start

One-command launch for dev container, local machine, or Codespaces.

## Launch TooLoo

```bash
./launch-tooloo.sh
```

This will:
- ✅ Start the web server (port 3000)
- ✅ Boot the orchestrator and all services
- ✅ Auto-open the Hub in your browser
- ✅ Show service status and logs

## What You Get

- **TooLoo Hub**: Natural conversation + idea → execution flow
- **Conversation Intelligence**: Auto-segments chat, extracts patterns, shows traits, generates next steps
- **UI Control**: TooLoo can adjust the interface (lean/detailed modes, system checks)
- **Multi-Engine**: Segmentation, training, meta-learning, budget, coaching, product dev, reports, capabilities

## Access Points

Once running:
- 🏠 **Hub**: http://127.0.0.1:3000/
- 🎛️ **Control Room**: http://127.0.0.1:3000/control-room
- 💬 **Chat**: http://127.0.0.1:3000/tooloo-chat

## Configuration

### Local AI (Ollama)

Set these before launching for local, private chat:
```bash
export ENABLE_OLLAMA=true
export OLLAMA_MODEL="llama3.2:latest"
./launch-tooloo.sh
```

### Cloud AI Providers

For Claude, OpenAI, or Gemini:
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."
export GEMINI_API_KEY="..."
./launch-tooloo.sh
```

## Stop Services

```bash
pkill -f "node servers/"
```

Or press `Ctrl+C` if the launcher is still running in your terminal.

## Logs

```bash
tail -f /tmp/tooloo-web.log
tail -f /tmp/tooloo-orch.log
```

## Troubleshooting

### Port already in use
The launcher auto-cleans ports. If issues persist:
```bash
lsof -ti:3000 | xargs kill -9
./launch-tooloo.sh
```

### Services not starting
Check orchestrator log:
```bash
cat /tmp/tooloo-orch.log
```

Restart manually:
```bash
node servers/orchestrator.js &
```

### API errors (502)
Restart orchestrator via web API:
```bash
curl -X POST http://127.0.0.1:3000/system/start \
  -H 'Content-Type: application/json' \
  -d '{"autoOpen":false}'
```

## Remote/Codespaces

The launcher detects Codespaces and shows the correct forwarded URL.  
Make sure port 3000 is set to **Public** in VS Code's Ports panel.

## What's Next?

1. Open the Hub
2. Start a conversation: "Help me launch a landing page in 10 days"
3. Watch:
   - Structured, hierarchical replies
   - Real-time conversation analysis (segments, patterns, traits)
   - Auto-generated next steps
   - Optional UI tweaks from TooLoo

Enjoy your lean, mean, natural AI co-pilot! 🚀
