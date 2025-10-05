#!/bin/bash

# TooLoo CLI Demo Script
# Demonstrates all CLI capabilities

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              🧠 TooLoo CLI Demo                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# 1. Health Check
echo "1️⃣  Checking API Health..."
echo "   Command: npm run tooloo -- --health"
echo ""
npm run tooloo -- --health
echo ""
read -p "Press Enter to continue..."
echo ""

# 2. Simple Request
echo "2️⃣  Simple Request Example"
echo "   Command: npm run tooloo \"explain what TooLoo.ai does\""
echo ""
npm run tooloo "explain what TooLoo.ai does in one sentence"
echo ""
read -p "Press Enter to continue..."
echo ""

# 3. Code Generation
echo "3️⃣  Code Generation Example"
echo "   Command: npm run tooloo \"create a JavaScript function to reverse a string\""
echo ""
npm run tooloo "create a JavaScript function to reverse a string"
echo ""
read -p "Press Enter to continue..."
echo ""

# 4. Different Provider
echo "4️⃣  Using Different AI Provider"
echo "   Command: TOOLOO_PROVIDER=claude npm run tooloo \"explain recursion\""
echo ""
TOOLOO_PROVIDER=claude npm run tooloo "explain recursion in simple terms"
echo ""
read -p "Press Enter to continue..."
echo ""

# 5. Interactive Mode Info
echo "5️⃣  Interactive Mode"
echo "   Command: npm run tooloo -- --interactive"
echo ""
echo "   In interactive mode, you can have a conversation:"
echo "   🧠 TooLoo> create a function"
echo "   🧠 TooLoo> optimize it"
echo "   🧠 TooLoo> add error handling"
echo "   🧠 TooLoo> exit"
echo ""
echo "   Try it yourself! (Press Ctrl+C to exit demo first)"
echo ""

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                   Demo Complete! 🎉                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Quick Commands:"
echo "  npm run tooloo \"your request\""
echo "  npm run tooloo -- --help"
echo "  npm run tooloo -- --health"
echo "  npm run tooloo -- --interactive"
echo ""
