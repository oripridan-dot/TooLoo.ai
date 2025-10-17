# TooLoo.ai Quick Start Guide

## 🚀 One-Click Startup

### Option 1: Auto-Start Script (Recommended)
```bash
npm run start:auto
# OR
./start-tooloo.sh
```
This will:
- Start the web server
- Launch all microservices via orchestrator
- Auto-open Control Room in your browser
- Pre-arm training, meta-learning, and coaching systems

### Option 2: Manual Start
```bash
npm start
# OR
node servers/orchestrator.js
```
Then open: http://127.0.0.1:3000/control-room

## 🎯 Control Room Features

### Status Banner
- **Green/Red dots**: Live health of Training, Meta, Budget, Coach, Cup services
- **Coach pill**: Click to toggle Auto‑Coach On/Off
- **Web port**: Shows current web server port

### Quick Actions
- **🚀 Start System**: Launch orchestrator and all services
- **⚡ Boost x5**: Run 5 rapid training rounds for quick progress
- **▶️ Run Training Round**: Manual single round
- **⛔ Stop All**: Gracefully shut down all services

### Auto-Coach Settings
Click **⚙️ Settings** in Meta-Learning panel to tune:
- **Min Avg Mastery**: Threshold to trigger meta-learning (60-90%)
- **Max Below 80%**: How many domains can be under 80% (1-6)
- **Aggressive Mode**: 2x training rounds when avg mastery < 50%

### Provider Cup
- Live scoreboard of AI provider performance
- Run mini competitions via **🏆 Run Mini-Cup**

## 📊 Learning Acceleration

The system includes several speed optimizations:
1. **Fast coaching cycles**: 1-second intervals vs 2-second default
2. **Aggressive mode**: 2x rounds when warming up (avg < 50%)
3. **Boost button**: Ad-hoc 5-round bursts
4. **Persistent settings**: Coach tuning survives restarts

## 🔄 Workflow

1. **Start**: `npm run start:auto` (auto-opens Control Room)
2. **Monitor**: Watch status banner and training progress
3. **Accelerate**: Use Boost x5 for quick fundamentals lift
4. **Tune**: Adjust coach settings for your learning pace
5. **Meta-Ready**: Auto‑Coach triggers meta-learning when thresholds met

All services pre-arm on startup - the system is ready to learn immediately!