#!/bin/bash

# TooLoo.ai Quick Start Script
# This script helps you get TooLoo.ai up and running quickly

set -e

echo "🚀 TooLoo.ai Quick Start"
echo "========================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "📄 Creating .env file from example..."
    cp .env.example .env
    echo "⚠️  Please edit .env file and add your AI provider API keys:"
    echo "   - OPENAI_API_KEY"
    echo "   - CLAUDE_API_KEY" 
    echo "   - GEMINI_API_KEY"
    echo "   - DEEPSEEK_API_KEY"
    echo ""
    read -p "Press Enter when you've added your API keys..."
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build all packages
echo "🔨 Building packages..."
npm run build

# Create data directory
mkdir -p data logs

# Start development servers
echo "🌟 Starting TooLoo.ai..."
echo "API Server will run on: http://localhost:3001"
echo "Web Interface will run on: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

npm run dev