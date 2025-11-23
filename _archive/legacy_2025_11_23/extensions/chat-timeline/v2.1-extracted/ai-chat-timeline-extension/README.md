# 🧠 AI Chat Timeline Navigator - Chrome Extension

## What It Does

Transforms your ChatGPT and Claude conversations into **visual, navigable timelines**. No more endless scrolling to find that specific discussion point.

### Key Features

- **Auto-segmentation**: Automatically divides conversations into logical topics
- **Visual Navigation**: Click any segment to jump directly to that part of the conversation
- **Smart Categorization**: Detects questions, code, ideas, problems, and conclusions
- **Real-time Updates**: Timeline updates as you chat
- **Beautiful UI**: Elegant floating sidebar with dark mode support
- **Zero Setup**: Just install and it works

## Installation Instructions

### Method 1: Load Unpacked Extension (For Testing)

1. **Download the extension folder** to your computer

2. **Open Chrome** and navigate to:
   ```
   chrome://extensions/
   ```

3. **Enable Developer Mode**
   - Toggle the switch in the top-right corner

4. **Click "Load unpacked"**
   - Select the `ai-chat-timeline-extension` folder
   - The extension icon should appear in your toolbar

5. **Visit ChatGPT or Claude**
   - Go to https://chat.openai.com or https://claude.ai
   - Start or continue a conversation
   - Timeline appears on the right side after a few seconds

### Method 2: Package as ZIP (For Sharing)

If you want to share with others:

```bash
cd ai-chat-timeline-extension
zip -r timeline-extension.zip . -x "*.DS_Store" -x "__MACOSX/*"
```

Others can then unzip and use Method 1 to install.

## How to Use

### First Time Setup
1. Install the extension (see above)
2. Visit ChatGPT (chat.openai.com) or Claude (claude.ai)
3. The timeline appears automatically on the right side

### Navigation
- **Click any segment** to jump to that part of the conversation
- **Hover over segments** to see them highlight
- **Use the refresh button** (↻) to re-analyze the conversation
- **Use the toggle button** (✓) to show/hide the timeline

### Segment Types
- 💡 **Idea** - Brainstorming and concepts
- ❓ **Question** - Questions and explanations
- 💻 **Code** - Programming discussions
- 🔧 **Problem** - Troubleshooting and debugging
- ✅ **Conclusion** - Resolutions and thanks
- 💬 **Discussion** - General conversation

## Technical Details

### Supported Platforms
- ✅ ChatGPT (chat.openai.com)
- ✅ ChatGPT (chatgpt.com)
- ✅ Claude (claude.ai)

### How It Works
1. **Detection**: Extension detects you're on a supported AI chat platform
2. **Observation**: Watches for new messages using MutationObserver
3. **Segmentation**: Groups messages into logical topics (client-side, no external API)
4. **Rendering**: Creates beautiful timeline UI
5. **Navigation**: Enables smooth scrolling to any segment

### Privacy & Security
- ✅ **No data sent externally** - All processing happens locally in your browser
- ✅ **No tracking** - We don't collect any analytics
- ✅ **No API keys required** - Pure client-side JavaScript
- ✅ **Open source** - You can inspect all the code

## Customization

### Adjusting Segment Size

Edit `content.js` line ~130:
```javascript
const SEGMENT_SIZE = 4; // Change this number (2-8 recommended)
```

### Changing Colors

Edit `timeline.css` to modify the gradient colors:
```css
.ai-timeline-segment[data-type="idea"] .ai-timeline-segment-marker {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}
```

## Troubleshooting

### Timeline doesn't appear
- Refresh the page
- Make sure you have at least 4 messages in the conversation
- Check that Developer Mode is enabled in chrome://extensions/
- Look for console errors (F12 → Console tab)

### Timeline is empty
- Start a new conversation or continue an existing one
- Click the refresh button (↻) in the timeline header
- Wait 2-3 seconds after sending messages

### Can't click segments
- Make sure the conversation has fully loaded
- Try refreshing the page
- Check that messages are visible on the page

## Development Roadmap

### Phase 1: MVP (Current) ✅
- [x] Basic segmentation
- [x] Visual timeline UI
- [x] Click-to-navigate
- [x] ChatGPT & Claude support
- [x] Auto-refresh on new messages

### Phase 2: Smart Features (Next)
- [ ] AI-powered segmentation (using Claude/GPT API)
- [ ] Custom segment naming
- [ ] Search within timeline
- [ ] Export timeline to markdown
- [ ] Keyboard shortcuts

### Phase 3: Templates (Future)
- [ ] Brainstorm mode
- [ ] Learning mode
- [ ] Debug mode
- [ ] Custom templates
- [ ] Template marketplace

## Contributing

Found a bug? Have an idea? 

1. Test the extension thoroughly
2. Document the issue or feature request
3. Share feedback with screenshots if possible

## Version History

### v1.0.0 (Current)
- Initial MVP release
- ChatGPT and Claude support
- Client-side segmentation
- Smooth navigation
- Dark mode support

## License

Built as an MVP for testing and feedback.

---

**Made with 🧠 by the Multi-Agent System**

*"Transforming linear chats into cognitive maps"*
