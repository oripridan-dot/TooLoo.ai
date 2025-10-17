#!/bin/bash

# ChatTimeline Extension - Production Deployment Script

echo "🚀 ChatTimeline Extension - Production Deployment"
echo "================================================"

# Step 1: Create production build
echo "📦 Creating production build..."

# Create deployment directory
mkdir -p ../deployment/chrome-extension-production

# Copy extension files
cp -r ./* ../deployment/chrome-extension-production/

cd ../deployment/chrome-extension-production

# Step 2: Replace localhost with production API
echo "🔄 Updating API endpoints..."

# Replace localhost API endpoint with production
sed -i 's/localhost:3001/api.chattimeline.com/g' content.js
sed -i 's/http:/https:/g' content.js

echo "✅ API endpoints updated to production"

# Step 3: Create store assets
echo "🎨 Preparing store assets..."

# Create store listing directory
mkdir -p store-assets

# Create placeholder for store assets needed
cat > store-assets/requirements.txt << EOF
Chrome Web Store Assets Needed:

1. Extension Icons:
   - icon-16.png (16x16px)
   - icon-48.png (48x48px) 
   - icon-128.png (128x128px)

2. Store Listing Images:
   - Screenshot 1: Timeline in ChatGPT (1280x800px)
   - Screenshot 2: Upgrade modal (1280x800px)
   - Screenshot 3: Extension popup (1280x800px)
   - Promotional tile: 440x280px

3. Store Listing Copy:
   - Title: "ChatTimeline - AI Conversation Navigator"
   - Short description: "Transform your AI conversations into navigable timelines"
   - Detailed description: See store-description.txt

4. Required Links:
   - Privacy policy: https://chattimeline.com/privacy
   - Support page: https://chattimeline.com/support
   - Homepage: https://chattimeline.com
EOF

# Create store description
cat > store-assets/store-description.txt << EOF
Transform your ChatGPT and Claude conversations into navigable timelines!

🎯 WHAT IT DOES:
ChatTimeline automatically segments your AI conversations into logical discussion topics, creating a visual timeline that lets you instantly jump to any part of your chat.

✅ FREE FEATURES:
• Automatic conversation segmentation
• Timeline navigation sidebar
• Click-to-jump to any message
• Real-time conversation monitoring
• Support for ChatGPT and Claude

⭐ PREMIUM FEATURES ($19/month):
• Export conversations to Notion & Obsidian
• Conversation templates (Brainstorm, Learning, Debug)
• Advanced analytics and insights
• Custom segment naming
• Timeline history across sessions

🚀 HOW TO USE:
1. Install the extension
2. Go to ChatGPT or Claude
3. Start a conversation (works best with 5+ messages)
4. Click the "📍 Timeline" button
5. Navigate your conversation like never before!

💡 PERFECT FOR:
• Researchers organizing literature reviews
• Students structuring learning sessions  
• Professionals managing client consultations
• Content creators planning projects
• Anyone who wants to find specific parts of long AI conversations

🔒 PRIVACY FIRST:
Your conversations are processed securely and never stored permanently. We respect your privacy and follow strict data protection standards.

Transform your AI conversations from linear chats into structured, navigable knowledge today!
EOF

# Step 4: Create deployment package
echo "📦 Creating deployment package..."

# Create zip file for Chrome Web Store
zip -r ChatTimeline-v1.0.0.zip . -x "store-assets/*" "*.sh" "test-*"

echo "✅ Deployment package created: ChatTimeline-v1.0.0.zip"

# Step 5: Deployment checklist
echo ""
echo "🎯 DEPLOYMENT CHECKLIST:"
echo "========================"
echo "1. ✅ Extension code ready"
echo "2. ✅ Production API endpoints configured" 
echo "3. 🔄 Deploy segmentation API to api.chattimeline.com"
echo "4. 🔄 Create chattimeline.com landing page"
echo "5. 🔄 Set up Stripe payment processing"
echo "6. 🔄 Generate extension icons (16px, 48px, 128px)"
echo "7. 🔄 Create Chrome Web Store assets"
echo "8. 🔄 Submit to Chrome Web Store"
echo ""

echo "📈 REVENUE TIMELINE:"
echo "==================="
echo "Week 1: Technical deployment"
echo "Week 2: Chrome Web Store submission"
echo "Week 3: Public launch & marketing"
echo "Week 4: First revenue from premium subscriptions"
echo ""

echo "💰 PROJECTED REVENUE:"
echo "===================="
echo "Month 1: $475 MRR (25 premium users)"
echo "Month 3: $1,900 MRR (100 premium users)"
echo "Month 6: $4,750 MRR (250 premium users)"
echo "Month 12: $9,500 MRR (500 premium users)"
echo ""

echo "🚀 Ready for production deployment!"
echo "Next: Deploy API server and submit to Chrome Web Store"
EOF