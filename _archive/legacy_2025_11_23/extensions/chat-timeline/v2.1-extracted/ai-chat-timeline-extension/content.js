// AI Chat Timeline Navigator - Content Script
// Detects chat platform and injects timeline UI

class ChatTimelineNavigator {
  constructor() {
    this.platform = this.detectPlatform();
    this.segments = [];
    this.timelineVisible = true;
    this.observer = null;
    this.lastMessageCount = 0;
    this.templateEngine = null; // Will be initialized after loading template-engine.js
    this.init();
  }

  detectPlatform() {
    const hostname = window.location.hostname;
    if (hostname.includes('openai.com') || hostname.includes('chatgpt.com')) {
      return 'chatgpt';
    } else if (hostname.includes('claude.ai')) {
      return 'claude';
    }
    return null;
  }

  init() {
    if (!this.platform) return;
    
    console.log('[Timeline] Initializing for platform:', this.platform);
    
    // Wait for page to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  setup() {
    // Inject timeline UI
    this.injectTimelineContainer();
    
    // Start observing for new messages
    setTimeout(() => {
      this.startObserving();
      this.analyzeConversation();
    }, 2000);
  }

  injectTimelineContainer() {
    // Find the existing left sidebar
    const existingSidebar = this.findExistingSidebar();
    
    if (existingSidebar) {
      // Replace the sidebar content with our timeline
      this.replaceSidebar(existingSidebar);
    } else {
      // Fallback: inject our own sidebar
      this.createNewSidebar();
    }
  }

  findExistingSidebar() {
    // ChatGPT selectors
    const chatgptSidebar = document.querySelector('nav') || 
                          document.querySelector('[class*="sidebar"]') ||
                          document.querySelector('aside');
    
    if (chatgptSidebar && this.platform === 'chatgpt') {
      return chatgptSidebar;
    }

    // Claude selectors
    const claudeSidebar = document.querySelector('[class*="Sidebar"]') ||
                         document.querySelector('aside') ||
                         document.querySelector('nav');
    
    if (claudeSidebar && this.platform === 'claude') {
      return claudeSidebar;
    }

    return null;
  }

  replaceSidebar(existingSidebar) {
    // Store original sidebar content
    this.originalSidebarContent = existingSidebar.innerHTML;
    
    // Create toggle between chat history and timeline
    const container = document.createElement('div');
    container.id = 'ai-timeline-container';
    container.className = 'ai-timeline-sidebar-replacement';
    container.innerHTML = `
      <div class="ai-timeline-view-toggle">
        <button class="view-toggle-btn active" data-view="timeline">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM1.5 8a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0z"/>
            <path d="M8 3.5a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-.5.5H4a.5.5 0 0 1 0-1h3.5V4a.5.5 0 0 1 .5-.5z"/>
          </svg>
          Timeline
        </button>
        <button class="view-toggle-btn" data-view="chats">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2.678 11.894a1 1 0 0 1 .287.801 10.97 10.97 0 0 1-.398 2c1.395-.323 2.247-.697 2.634-.893a1 1 0 0 1 .71-.074A8.06 8.06 0 0 0 8 14c3.996 0 7-2.807 7-6 0-3.192-3.004-6-7-6S1 4.808 1 8c0 1.468.617 2.83 1.678 3.894zm-.493 3.905a21.682 21.682 0 0 1-.713.129c-.2.032-.352-.176-.273-.362a9.68 9.68 0 0 0 .244-.637l.003-.01c.248-.72.45-1.548.524-2.319C.743 11.37 0 9.76 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7-3.582 7-8 7a9.06 9.06 0 0 1-2.347-.306c-.52.263-1.639.742-3.468 1.105z"/>
          </svg>
          Chats
        </button>
      </div>

      <div class="ai-timeline-content active">
        <div class="ai-timeline-header">
          <div class="ai-timeline-title">
            <span>Conversation Timeline</span>
          </div>
          <div class="ai-timeline-controls">
            <button id="ai-timeline-template" class="ai-timeline-btn-small" title="Templates">
              ✨
            </button>
            <button id="ai-timeline-refresh" class="ai-timeline-btn-small" title="Refresh">
              ↻
            </button>
          </div>
        </div>
        <div id="ai-timeline-segments" class="ai-timeline-segments">
          <div class="ai-timeline-loading">Start a conversation to see the timeline</div>
        </div>
      </div>

      <div class="ai-chats-content" style="display: none;">
        ${this.originalSidebarContent}
      </div>
    `;

    // Replace existing sidebar
    existingSidebar.innerHTML = '';
    existingSidebar.appendChild(container);

    this.attachEventListeners();
    this.attachViewToggleListeners();
  }

  createNewSidebar() {
    // Fallback: create our own sidebar if we can't find existing one
    const container = document.createElement('div');
    container.id = 'ai-timeline-container';
    container.className = 'ai-timeline-sidebar-new';
    container.innerHTML = `
      <div class="ai-timeline-header">
        <div class="ai-timeline-title">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM1.5 8a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0z"/>
            <path d="M8 3.5a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-.5.5H4a.5.5 0 0 1 0-1h3.5V4a.5.5 0 0 1 .5-.5z"/>
          </svg>
          Timeline
        </div>
        <div class="ai-timeline-controls">
          <button id="ai-timeline-template" class="ai-timeline-btn" title="Templates">
            ✨
          </button>
          <button id="ai-timeline-refresh" class="ai-timeline-btn" title="Refresh">
            ↻
          </button>
          <button id="ai-timeline-toggle" class="ai-timeline-btn" title="Close">
            ✕
          </button>
        </div>
      </div>
      <div id="ai-timeline-segments" class="ai-timeline-segments">
        <div class="ai-timeline-loading">Start a conversation to see the timeline</div>
      </div>
    `;

    document.body.prepend(container);
    this.attachEventListeners();
  }

  attachEventListeners() {
    document.getElementById('ai-timeline-template')?.addEventListener('click', () => {
      this.showTemplateSelector();
    });

    document.getElementById('ai-timeline-refresh')?.addEventListener('click', () => {
      this.analyzeConversation();
    });

    document.getElementById('ai-timeline-toggle')?.addEventListener('click', () => {
      this.toggleTimeline();
    });
  }

  attachViewToggleListeners() {
    const toggleBtns = document.querySelectorAll('.view-toggle-btn');
    toggleBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = e.currentTarget.dataset.view;
        this.switchView(view);
      });
    });
  }

  switchView(view) {
    const timelineContent = document.querySelector('.ai-timeline-content');
    const chatsContent = document.querySelector('.ai-chats-content');
    const toggleBtns = document.querySelectorAll('.view-toggle-btn');

    if (view === 'timeline') {
      timelineContent.style.display = 'flex';
      chatsContent.style.display = 'none';
      toggleBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === 'timeline');
      });
    } else {
      timelineContent.style.display = 'none';
      chatsContent.style.display = 'block';
      toggleBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === 'chats');
      });
    }
  }

  toggleTimeline() {
    this.timelineVisible = !this.timelineVisible;
    const container = document.getElementById('ai-timeline-container');
    if (this.timelineVisible) {
      container.classList.remove('collapsed');
    } else {
      container.classList.add('collapsed');
    }
  }

  startObserving() {
    const chatContainer = this.getChatContainer();
    if (!chatContainer) {
      console.log('[Timeline] Chat container not found, retrying...');
      this.retryCount = (this.retryCount || 0) + 1;
      if (this.retryCount < 10) {
        setTimeout(() => this.startObserving(), 1000);
      } else {
        console.log('[Timeline] Max retries reached. Using document.body as fallback.');
        this.observeContainer(document.body);
      }
      return;
    }

    console.log('[Timeline] Starting to observe chat container');
    this.observeContainer(chatContainer);
  }

  observeContainer(container) {
    this.observer = new MutationObserver((mutations) => {
      const currentCount = this.getMessages().length;
      if (currentCount !== this.lastMessageCount) {
        this.lastMessageCount = currentCount;
        console.log('[Timeline] Message count changed:', currentCount);
        // Debounce analysis
        clearTimeout(this.analysisTimeout);
        this.analysisTimeout = setTimeout(() => {
          this.analyzeConversation();
        }, 1000);
      }
    });

    this.observer.observe(container, {
      childList: true,
      subtree: true
    });
  }

  getChatContainer() {
    if (this.platform === 'chatgpt') {
      return document.querySelector('main') || document.querySelector('[role="main"]');
    } else if (this.platform === 'claude') {
      // Try multiple selectors for Claude
      const selectors = [
        'main',
        '[role="main"]',
        '[class*="conversation"]',
        '[class*="ChatPage"]',
        'body' // Fallback to body if nothing else works
      ];
      
      for (const selector of selectors) {
        const container = document.querySelector(selector);
        if (container) {
          console.log('[Timeline] Found container with selector:', selector);
          return container;
        }
      }
    }
    return document.body; // Ultimate fallback
  }

  getMessages() {
    let messages = [];
    
    if (this.platform === 'chatgpt') {
      const messageElements = document.querySelectorAll('[data-message-author-role]');
      messages = Array.from(messageElements).map((el, index) => ({
        role: el.getAttribute('data-message-author-role'),
        content: el.textContent.trim().substring(0, 500),
        element: el,
        index: index
      }));
    } else if (this.platform === 'claude') {
      // Try multiple methods to find Claude messages
      let messageElements = [];
      
      // Method 1: Look for common message patterns
      messageElements = document.querySelectorAll('[class*="Message"], [data-test-render-count]');
      
      // Method 2: If that fails, look for any content blocks
      if (messageElements.length === 0) {
        messageElements = document.querySelectorAll('p, div[class*="content"]');
      }
      
      // Method 3: Look for specific text patterns (user vs assistant)
      messages = Array.from(messageElements).map((el, index) => {
        const text = el.textContent.trim();
        if (text.length < 10) return null; // Skip very short content
        
        // Try to determine if it's a user or assistant message
        const parentText = el.parentElement?.textContent || '';
        const isUser = parentText.toLowerCase().includes('you') || 
                       el.className.includes('user') ||
                       el.closest('[class*="user"]');
        
        return {
          role: isUser ? 'user' : 'assistant',
          content: text.substring(0, 500),
          element: el,
          index: index
        };
      }).filter(m => m !== null);
      
      console.log('[Timeline] Found', messages.length, 'messages on Claude');
    }

    return messages.filter(m => m.content && m.content.length > 10);
  }

  analyzeConversation() {
    const messages = this.getMessages();
    
    if (messages.length === 0) {
      this.renderSegments([]);
      return;
    }

    console.log('[Timeline] Analyzing', messages.length, 'messages');

    // Simple client-side segmentation based on patterns
    this.segments = this.segmentMessages(messages);
    this.renderSegments(this.segments);
  }

  segmentMessages(messages) {
    const segments = [];
    let currentSegment = null;
    const SEGMENT_SIZE = 4; // Group every N messages

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      
      // Start new segment every SEGMENT_SIZE messages or at topic changes
      if (i === 0 || i % SEGMENT_SIZE === 0) {
        if (currentSegment) {
          segments.push(currentSegment);
        }
        
        currentSegment = {
          title: this.generateSegmentTitle(msg.content, i),
          startIndex: i,
          endIndex: i,
          messages: [msg],
          type: this.detectSegmentType(msg.content)
        };
      } else {
        currentSegment.endIndex = i;
        currentSegment.messages.push(msg);
      }
    }

    if (currentSegment) {
      segments.push(currentSegment);
    }

    return segments;
  }

  generateSegmentTitle(content, index) {
    // Extract first sentence or meaningful phrase
    const firstSentence = content.split(/[.!?]/)[0].trim();
    let title = firstSentence.substring(0, 60);
    
    if (title.length < 10) {
      title = `Discussion Point ${Math.floor(index / 4) + 1}`;
    }
    
    return title + (firstSentence.length > 60 ? '...' : '');
  }

  detectSegmentType(content) {
    const lower = content.toLowerCase();
    
    if (lower.match(/\b(how|what|why|explain|tell me)\b/)) return 'question';
    if (lower.match(/\b(code|function|class|def|const|let)\b/)) return 'code';
    if (lower.match(/\b(idea|think|brainstorm|concept)\b/)) return 'idea';
    if (lower.match(/\b(problem|error|bug|issue|fix)\b/)) return 'problem';
    if (lower.match(/\b(thanks|thank you|great|perfect)\b/)) return 'conclusion';
    
    return 'discussion';
  }

  getSegmentIcon(type) {
    const icons = {
      question: '❓',
      code: '💻',
      idea: '💡',
      problem: '🔧',
      conclusion: '✅',
      discussion: '💬'
    };
    return icons[type] || '💬';
  }

  renderSegments(segments) {
    const container = document.getElementById('ai-timeline-segments');
    
    if (segments.length === 0) {
      container.innerHTML = '<div class="ai-timeline-empty">Start a conversation to see the timeline</div>';
      return;
    }

    container.innerHTML = segments.map((segment, index) => `
      <div class="ai-timeline-segment" data-segment-index="${index}" data-type="${segment.type}">
        <div class="ai-timeline-segment-marker">
          <span class="ai-timeline-segment-icon">${this.getSegmentIcon(segment.type)}</span>
        </div>
        <div class="ai-timeline-segment-content">
          <div class="ai-timeline-segment-title">${segment.title}</div>
          <div class="ai-timeline-segment-meta">${segment.messages.length} messages</div>
        </div>
      </div>
    `).join('');

    // Add click handlers
    container.querySelectorAll('.ai-timeline-segment').forEach((el, index) => {
      el.addEventListener('click', () => {
        this.jumpToSegment(segments[index]);
      });
    });
  }

  jumpToSegment(segment) {
    const firstMessage = segment.messages[0];
    if (firstMessage && firstMessage.element) {
      firstMessage.element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      
      // Highlight effect
      firstMessage.element.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
      setTimeout(() => {
        firstMessage.element.style.backgroundColor = '';
      }, 2000);
    }
  }

  showTemplateSelector() {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.id = 'template-selector-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      z-index: 9999999;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.3s ease;
    `;

    modal.innerHTML = `
      <div style="
        background: white;
        border-radius: 20px;
        padding: 32px;
        max-width: 600px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: slideInUp 0.4s ease;
      ">
        <h2 style="
          margin: 0 0 8px 0;
          font-size: 24px;
          color: #1a1a1a;
          font-weight: 700;
        ">✨ Choose Your Mode</h2>
        <p style="
          margin: 0 0 24px 0;
          color: #666;
          font-size: 14px;
        ">Transform your conversation with structured cognitive workflows</p>
        
        <div class="template-grid" style="
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        ">
          <div class="template-option" data-template="learning-mode" style="
            background: linear-gradient(135deg, rgba(67, 233, 123, 0.1) 0%, rgba(56, 249, 215, 0.1) 100%);
            border: 2px solid rgba(67, 233, 123, 0.3);
            border-radius: 16px;
            padding: 20px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s ease;
          ">
            <div style="font-size: 40px; margin-bottom: 12px;">🎓</div>
            <div style="font-weight: 700; margin-bottom: 4px; color: #1a1a1a;">Learning Mode</div>
            <div style="font-size: 12px; color: #666;">Master any topic systematically</div>
          </div>

          <div class="template-option" data-template="brainstorm-mode" style="
            background: linear-gradient(135deg, rgba(250, 112, 154, 0.1) 0%, rgba(254, 225, 64, 0.1) 100%);
            border: 2px solid rgba(250, 112, 154, 0.3);
            border-radius: 16px;
            padding: 20px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s ease;
          ">
            <div style="font-size: 40px; margin-bottom: 12px;">💡</div>
            <div style="font-weight: 700; margin-bottom: 4px; color: #1a1a1a;">Brainstorm Mode</div>
            <div style="font-size: 12px; color: #666;">Generate and refine ideas</div>
          </div>

          <div class="template-option" data-template="debug-mode" style="
            background: linear-gradient(135deg, rgba(79, 172, 254, 0.1) 0%, rgba(0, 242, 254, 0.1) 100%);
            border: 2px solid rgba(79, 172, 254, 0.3);
            border-radius: 16px;
            padding: 20px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s ease;
          ">
            <div style="font-size: 40px; margin-bottom: 12px;">🔧</div>
            <div style="font-weight: 700; margin-bottom: 4px; color: #1a1a1a;">Debug Mode</div>
            <div style="font-size: 12px; color: #666;">Systematic problem solving</div>
          </div>

          <div class="template-option" data-template="coming-soon" style="
            background: rgba(0, 0, 0, 0.05);
            border: 2px solid rgba(0, 0, 0, 0.1);
            border-radius: 16px;
            padding: 20px;
            text-align: center;
            cursor: not-allowed;
            opacity: 0.6;
          ">
            <div style="font-size: 40px; margin-bottom: 12px;">✍️</div>
            <div style="font-weight: 700; margin-bottom: 4px; color: #1a1a1a;">Writing Mode</div>
            <div style="font-size: 12px; color: #666;">Coming soon...</div>
          </div>
        </div>

        <button id="close-template-modal" style="
          width: 100%;
          padding: 12px;
          background: rgba(0, 0, 0, 0.05);
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          color: #666;
        ">Close</button>
      </div>
    `;

    document.body.appendChild(modal);

    // Add hover effects
    modal.querySelectorAll('.template-option').forEach(option => {
      option.addEventListener('mouseenter', (e) => {
        if (!e.target.dataset.template.includes('coming-soon')) {
          e.target.style.transform = 'translateY(-4px) scale(1.02)';
          e.target.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)';
        }
      });
      option.addEventListener('mouseleave', (e) => {
        e.target.style.transform = 'translateY(0) scale(1)';
        e.target.style.boxShadow = 'none';
      });
    });

    // Add click handlers
    modal.querySelectorAll('.template-option').forEach(option => {
      option.addEventListener('click', (e) => {
        const template = e.currentTarget.dataset.template;
        if (template && !template.includes('coming-soon')) {
          this.activateTemplate(template);
          modal.remove();
        }
      });
    });

    document.getElementById('close-template-modal').addEventListener('click', () => {
      modal.remove();
    });

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  activateTemplate(templateId) {
    // Show notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      z-index: 9999999;
      font-size: 14px;
      font-weight: 600;
      animation: slideInRight 0.3s ease;
    `;
    
    const templateNames = {
      'learning-mode': '🎓 Learning Mode',
      'brainstorm-mode': '💡 Brainstorm Mode',
      'debug-mode': '🔧 Debug Mode'
    };

    notification.textContent = `${templateNames[templateId]} Activated!`;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);

    // Update timeline header to show active template
    const header = document.querySelector('.ai-timeline-title');
    if (header) {
      header.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM1.5 8a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0z"/>
        </svg>
        ${templateNames[templateId]} Active
      `;
    }

    console.log(`[Timeline] Template activated: ${templateId}`);
    // In the full version, this would initialize the template engine
  }
}

// Initialize when page loads
console.log('[Timeline] Extension loaded');
const navigator = new ChatTimelineNavigator();

// Make navigator globally accessible
window.chatTimelineNavigator = navigator;

// Initialize template engine after a short delay
setTimeout(() => {
  if (typeof TemplateEngine !== 'undefined') {
    window.templateEngine = new TemplateEngine(navigator);
    console.log('[Templates] Template engine initialized');
  }
}, 2000);
