#!/bin/bash
# GITHUB_INTEGRATION_QUICKSTART.sh
# Copy-paste these commands to activate GitHub integration in 5 minutes

echo "GitHub Integration Quick Start"
echo "=============================="
echo ""
echo "Step 1: Create GitHub Token"
echo "  1a. Open: https://github.com/settings/tokens/new"
echo "  1b. Select scopes: repo + read:org"
echo "  1c. Click 'Generate token'"
echo "  1d. Copy the token (looks like: ghp_xxxx...)"
echo ""
read -p "Press ENTER when you have your GitHub token..."
echo ""

echo "Step 2: Update .env file"
echo "  Opening .env for editing..."
echo ""
echo "  Find this line (around line 7):"
echo "    GITHUB_TOKEN=ghp_placeholder_your_token_here"
echo ""
echo "  Replace with your actual token:"
echo "    GITHUB_TOKEN=ghp_your_token_here"
echo ""
echo "  Keep these lines as-is:"
echo "    GITHUB_REPO=oripridan-dot/TooLoo.ai"
echo "    SCHEDULE_GITHUB_ISSUES=false"
echo ""
nano .env
echo ""

echo "Step 3: Restart System"
echo "  Running: npm run clean && npm run dev"
echo "  (This will take 40-60 seconds)"
echo ""
npm run clean
npm run dev &
sleep 5
echo ""

echo "Step 4: Verify Installation"
echo "  Running: npm run test:github"
echo ""
npm run test:github
echo ""

echo "✅ GitHub Integration Setup Complete!"
echo ""
echo "Your AI providers now have access to your GitHub repository."
echo "They can:"
echo "  • Reference issues in recommendations"
echo "  • Understand your project architecture"
echo "  • Suggest code-aware improvements"
echo "  • Answer specific questions about your repo"
echo ""
echo "Try asking in Providers Arena:"
echo '  "Based on my recent GitHub issues, what should be top priorities?"'
echo ""
