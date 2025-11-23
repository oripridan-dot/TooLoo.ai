# TooLoo.ai Deployment Guide

## Quick Start

### Prerequisites
- Node.js 18+ and npm 8+
- Git
- Your AI provider API keys

### 1. Clone and Setup
```bash
git clone https://github.com/oripridan-dot/TooLoo.ai.git
cd TooLoo.ai
chmod +x start.sh
./start.sh
```

### 2. Configuration
Edit `.env` file with your API keys:
```env
OPENAI_API_KEY=your_openai_key_here
CLAUDE_API_KEY=your_claude_key_here  
GEMINI_API_KEY=your_gemini_key_here
DEEPSEEK_API_KEY=your_deepseek_key_here
```

### 3. Access
- **Web Interface**: http://localhost:3000
- **API Server**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## Production Deployment

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### PM2 Deployment
```bash
# Install PM2 globally
npm install -g pm2

# Build for production
npm run build

# Start with PM2
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# Auto-start on system boot
pm2 startup
pm2 save
```

### Environment Variables

#### Required
- `OPENAI_API_KEY` - OpenAI API key
- `CLAUDE_API_KEY` - Anthropic Claude API key
- `GEMINI_API_KEY` - Google Gemini API key
- `DEEPSEEK_API_KEY` - DeepSeek API key

#### Optional
- `PORT` - API server port (default: 3001)
- `HOST` - Server host (default: localhost)
- `DATABASE_URL` - SQLite database path (default: sqlite:./data/tooloo.db)
- `CORS_ORIGIN` - Frontend URL (default: http://localhost:3000)
- `LOG_LEVEL` - Logging level (default: info)

## Architecture Overview

```
TooLoo.ai/
├── packages/
│   ├── core/          # Shared types and utilities
│   ├── engine/        # AI orchestration engine
│   ├── api/           # Express server + assistant
│   └── web/           # React frontend
├── docs/              # Documentation
└── deploy/            # Deployment configs
```

## Features

### 🤖 Multi-Provider AI Orchestration
- Intelligent routing across OpenAI, Claude, Gemini, DeepSeek
- Performance-based provider selection
- Automatic fallback and retry mechanisms

### 💬 Conversational Assistant  
- Intent classification and intelligent routing
- Context-aware conversation management
- Real-time WebSocket communication

### 🚀 Code Execution Engine
- Secure VM2 sandboxed execution
- Performance metrics and complexity analysis
- JavaScript/TypeScript support

### 📊 Real-Time Analytics
- Provider performance monitoring
- Response time tracking
- Success rate analytics

### 🔒 Security Features
- Input validation and sanitization
- Secure code execution boundaries
- CORS and security headers

## API Endpoints

### Chat
- `POST /api/chat` - Send message to assistant
- `GET /api/conversations/:id` - Get conversation
- `GET /api/conversations` - List conversations

### Monitoring
- `GET /health` - Health check
- `GET /api/stats` - Provider statistics

### WebSocket Events
- `chat:message` - Send message
- `chat:response` - Receive response
- `chat:typing` - Typing indicator
- `chat:error` - Error handling

## Troubleshooting

### Common Issues

1. **API Keys Not Working**
   - Verify keys are correct in `.env`
   - Check key permissions and quotas
   - Ensure provider endpoints are accessible

2. **Build Failures**
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Check TypeScript version compatibility
   - Verify all dependencies are installed

3. **WebSocket Connection Issues**
   - Check firewall settings
   - Verify CORS configuration
   - Ensure both frontend and backend are running

4. **Performance Issues**
   - Monitor provider response times
   - Check database connection
   - Review memory usage

### Support
- GitHub Issues: https://github.com/oripridan-dot/TooLoo.ai/issues
- Documentation: https://github.com/oripridan-dot/TooLoo.ai/docs