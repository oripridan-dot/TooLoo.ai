#!/bin/bash

# TooLoo.ai Personal Quick Start
# Simple setup for your personal AI development assistant

set -e

echo "🚀 TooLoo.ai Personal Assistant Setup"
echo "====================================="
echo ""

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version $NODE_VERSION found. Please upgrade to Node.js 18+."
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Create directories
mkdir -p logs
echo "✅ Created log directory"

# Check environment file
if [ ! -f .env ]; then
    echo "📄 No .env file found. Please create one with your API keys:"
    echo ""
    echo "   # Free tier (recommended to start)"
    echo "   HF_API_KEY=your_hugging_face_token"
    echo ""  
    echo "   # Paid providers (optional, choose your favorites)"
    echo "   DEEPSEEK_API_KEY=your_deepseek_key"
    echo "   OPENAI_API_KEY=your_openai_key"
    echo "   ANTHROPIC_API_KEY=your_claude_key"
    echo ""
    echo "💡 At minimum, get a free Hugging Face token at: https://huggingface.co/settings/tokens"
    echo ""
    read -p "Press Enter when you've created your .env file..."
fi

# Install simple dependencies for the API server
echo "📦 Installing minimal dependencies..."
if [ ! -d "node_modules" ]; then
    npm init -y > /dev/null 2>&1
    npm install express cors socket.io dotenv --silent
fi

# Setup web app if not exists
if [ ! -d "web-app/node_modules" ]; then
    echo "📦 Setting up web interface..."
    cd web-app
    npm install --silent
    cd ..
fi

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "🚀 To start TooLoo.ai:"
echo "   1. Start the API server: node simple-api-server.js"
echo "   2. In another terminal, start the web app: cd web-app && npm run dev"
echo "   3. Open: http://localhost:5173"
echo ""
echo "💡 Or run both with: ./start-personal.sh"
echo ""