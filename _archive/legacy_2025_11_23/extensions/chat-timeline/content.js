/**
 * ChatTimeline Content Script (Clean Refactor)
 * Provides resilient, host-adaptive conversation timeline with segmentation,
 * dropdown AI responses, auto-refresh, and lightweight analytics.
 */

class ChatTimelineInjector {
  constructor() {
    this.segments = [];
    this.messages = [];
    this.isActive = false;
    this.isPremium = false;
    this.API_BASE = 'http://localhost:3001/api/v1'; // future: configurable
    this.sidebarIntegrated = false;
    this.logPrefix = '[Timeline]';
    this.maxStoredSessions = 30;
  }

  async init() {
    try {
      this.isPremium = await this.checkPremiumStatus();
      this.platform = this.detectPlatform();
      if (!this.platform) return console.debug(this.logPrefix, 'Unsupported host');
      // Add host class for theming (used by theme override CSS files)
      try { document.body.classList.add(this.platform === 'chatgpt' ? 'chatgpt-host' : 'claude-host'); } catch(_) {}
      // Delay injection until required container exists (especially ChatGPT lazy load)
      await this.waitForPlatformMount();
      this.injectTimelineUI();
      this.addToggleButton();
      this.integrateIfHostSupports();
      this.startConversationMonitoring();
      this.messages = this.extractMessages(); // pre-warm
      this.loadPersisted();
      console.debug(this.logPrefix, 'Initialized for platform:', this.platform);
    } catch (e) {
      console.warn('ChatTimeline init failed', e);
    }
  }

  checkPremiumStatus() {
    return new Promise((resolve) => {
      try {
        chrome.storage?.sync?.get(['isPremium'], (r) => {
          if (typeof r?.isPremium === 'boolean') {
            resolve(r.isPremium);
          } else {
            const local = localStorage.getItem('timeline_premium');
            resolve(local === '1');
          }
        });
      } catch (_) { resolve(false); }
    });
  }

  detectPlatform() {
    const h = location.hostname;
    if (h.includes('openai.com') || h.includes('chatgpt.com')) return 'chatgpt';
    if (h.includes('claude.ai')) return 'claude';
    return null;
  }

  async waitForPlatformMount(timeoutMs = 8000) {
    if (this.platform === 'claude') return; // Claude ready quickly
    if (this.platform !== 'chatgpt') return;
    const start = performance.now();
    const selectors = [
      'nav[aria-label="Chat history"]',
      'nav[class*="flex"][class*="flex-col"]',
      'aside[class*="flex"]',
      'button[aria-label*="New chat" i]',
      'aside'
    ];
    while (performance.now() - start < timeoutMs) {
      // Check if any selector matches OR if we can find the sidebar
      if (selectors.some(sel => document.querySelector(sel)) || this.findChatGPTSidebar()) {
        console.debug(this.logPrefix, 'ChatGPT platform mounted');
        return;
      }
      await new Promise(r => setTimeout(r, 200));
    }
    console.warn(this.logPrefix, 'ChatGPT platform mount timeout');
  }

  injectTimelineUI() {
    if (document.getElementById('chat-timeline-container')) return; // already injected
    const el = document.createElement('div');
    el.id = 'chat-timeline-container';
    el.className = this.platform === 'chatgpt' ? 'chat-timeline-sidebar-mode chat-timeline-hidden' : 'chat-timeline-hidden';
    el.innerHTML = `
      <div class="timeline-header">
        <h3>📍 Conversation Timeline</h3>
        <div class="timeline-controls">
          <button class="history-btn" id="history-btn" title="View saved timelines">🕓</button>
          ${!this.isPremium ? '<button class="upgrade-btn" id="upgrade-btn">⭐ Upgrade</button>' : '<button class="upgrade-btn premium-badge" disabled>⭐ Premium</button>'}
          <button class="close-btn" id="timeline-close">✕</button>
        </div>
      </div>
      <div class="timeline-content">
        <div class="loading-state" id="timeline-loading">
          <div class="spinner"></div>
          <p>Analyzing conversation...</p>
        </div>
        <div class="segments-list" id="segments-list"></div>
        <div class="timeline-footer">
          <div class="branding">
            <span>Powered by <strong>ChatTimeline</strong></span>
            ${!this.isPremium ? '<p class="upgrade-text">🎯 Upgrade for templates & export</p>' : ''}
          </div>
        </div>
      </div>`;
    if (this.platform === 'chatgpt') {
      const hostSidebar = this.findChatGPTSidebar();
      if (hostSidebar) {
        hostSidebar.setAttribute('data-has-timeline', 'true');
        hostSidebar.insertBefore(el, hostSidebar.firstChild);
        this.sidebarIntegrated = true;
      } else {
        document.body.appendChild(el);
      }
    } else {
      document.body.appendChild(el);
    }

    el.querySelector('#timeline-close')?.addEventListener('click', () => this.hideTimeline());
    const upgradeBtn = el.querySelector('#upgrade-btn');
    if (upgradeBtn && !this.isPremium) upgradeBtn.addEventListener('click', () => this.showUpgradeModal());
    el.querySelector('#history-btn')?.addEventListener('click', () => this.showHistoryModal());
  }

  addToggleButton() {
    if (document.getElementById('timeline-toggle')) return;
    if (this.platform === 'chatgpt') {
      // Create dual toggle (Chats / Timeline) to mirror native look
      const hostSidebar = this.findChatGPTSidebar();
      if (hostSidebar && !hostSidebar.querySelector('.timeline-mode-toggle')) {
        const bar = document.createElement('div');
        bar.className = 'timeline-mode-toggle';
        bar.innerHTML = `
          <button class="mode-btn active" data-mode="timeline">Timeline</button>
          <button class="mode-btn" data-mode="chats">Chats</button>`;
        hostSidebar.insertBefore(bar, hostSidebar.firstChild?.nextSibling || hostSidebar.firstChild);
        bar.addEventListener('click', (e) => {
          const btn = e.target.closest('button.mode-btn');
          if (!btn) return;
          bar.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
          if (btn.dataset.mode === 'timeline') {
            this.showTimeline();
          } else {
            this.hideTimeline();
          }
        });
      }
    } else {
      const btn = document.createElement('button');
      btn.id = 'timeline-toggle';
      btn.className = 'timeline-toggle-btn';
      btn.textContent = '📍 Timeline';
      btn.addEventListener('click', () => this.isActive ? this.hideTimeline() : this.showTimeline());
      const container = document.querySelector('main') || document.body;
      container.appendChild(btn);
    }
  }

  integrateIfHostSupports() {
    if (this.platform !== 'chatgpt') return;
    if (!this.sidebarIntegrated) return;
    // Hide timeline by default while user in Chats mode
    const timelineContainer = document.getElementById('chat-timeline-container');
    if (timelineContainer) timelineContainer.classList.add('chat-timeline-hidden');
  }

  findChatGPTSidebar() {
    // Try multiple strategies to find ChatGPT's sidebar
    const candidates = [
      // Strategy 1: Direct aria-label match (most reliable)
      'nav[aria-label="Chat history"]',
      // Strategy 2: Look for nav with specific structure
      'nav[class*="flex"][class*="flex-col"]',
      // Strategy 3: Find aside container
      'aside[class*="flex"]',
      'aside',
      // Strategy 4: Look for the history sidebar by common classes
      'div[class*="overflow-y-auto"][class*="flex-col"]',
      // Strategy 5: Find by new chat button parent
      () => {
        const newChatBtn = document.querySelector('button[aria-label*="New chat" i], button[aria-label*="new chat" i]');
        return newChatBtn?.closest('nav, aside, div[class*="flex-col"]');
      }
    ];

    for (const sel of candidates) {
      let el;
      if (typeof sel === 'function') {
        el = sel();
      } else {
        el = document.querySelector(sel);
      }
      // Ensure element exists, is visible, and has sidebar-like width (between 200-400px)
      if (el && el.offsetWidth >= 200 && el.offsetWidth <= 400 && el.offsetHeight > 400) {
        console.debug(this.logPrefix, 'Found ChatGPT sidebar:', el);
        return el;
      }
    }
    console.warn(this.logPrefix, 'Could not find ChatGPT sidebar');
    return null;
  }

  async showTimeline() {
    this.isActive = true;
    const c = document.getElementById('chat-timeline-container');
    if (!c) return;
    c.classList.remove('chat-timeline-hidden');
    c.classList.add('chat-timeline-visible');
    const t = document.getElementById('timeline-toggle');
    if (t) t.textContent = '✕ Close Timeline';
    await this.processConversation();
  }

  hideTimeline() {
    this.isActive = false;
    const c = document.getElementById('chat-timeline-container');
    if (c) {
      c.classList.add('chat-timeline-hidden');
      c.classList.remove('chat-timeline-visible');
    }
    const t = document.getElementById('timeline-toggle');
    if (t) t.textContent = '📍 Timeline';
  }

  async processConversation() {
    const loader = document.getElementById('timeline-loading');
    const list = document.getElementById('segments-list');
    if (!loader || !list) return;
    loader.style.display = 'block';
    list.style.display = 'none';

    try {
      this.messages = this.extractMessages();
      if (!this.messages.length) { this.showEmptyState(); return; }

      // Try API segmentation first; fallback to local heuristic
      this.segments = await this.tryApiSegmentation(this.messages) || this.localSegment(this.messages);
  this.renderTimeline();
  this.sendBadgeUpdate();
      console.debug(this.logPrefix, `Rendered ${this.segments.length} segments from ${this.messages.length} messages`);

      // Experimental: parallel thread insight (non-blocking)
      this.computeParallelThreads();
      this.persistSession();
      this.trimStoredSessions();
    } catch (e) {
      console.warn('Segmentation failed – fallback rendering', e);
      this.segments = this.localSegment(this.messages);
  this.renderTimeline();
  this.sendBadgeUpdate();
    }
  }

  async tryApiSegmentation(messages) {
    try {
      const resp = await fetch(`${this.API_BASE}/segment`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages }) });
      if (!resp.ok) return null;
      const data = await resp.json();
      if (Array.isArray(data?.segments)) return data.segments.map(s => ({ ...s, responses: [] }));
      return null;
    } catch { return null; }
  }

  localSegment(messages) {
    const segments = [];
    let current = { start: 0, end: 0, title: '💬 Opening', summary: '', messageCount: 0, responses: [] };
    const flush = () => {
      if (current.messageCount > 0) {
        current.summary = current.summary || this.buildSummary(messages.slice(current.start, current.end + 1));
        segments.push({ ...current });
      }
    };
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      if (i === 0) {
        current.start = 0; current.end = 0; current.messageCount = 1; current.title = this.deriveTitle(m, 0); current.summary = m.content.slice(0, 140); continue;
      }
      const prev = messages[i - 1];
      const boundary = (m.role === 'user' && prev.role === 'assistant');
      if (boundary && current.messageCount >= 3) { flush(); current = { start: i, end: i, title: this.deriveTitle(m, segments.length), summary: m.content.slice(0, 140), messageCount: 1, responses: [] }; }
      else { current.end = i; current.messageCount++; }
      if (m.role === 'assistant') current.responses.push(this.truncate(m.content, 100));
    }
    flush();
    return segments;
  }

  deriveTitle(message, idx) {
    const txt = message.content.toLowerCase();
    if (txt.includes('plan')) return '🗺️ Planning';
    if (txt.includes('error') || txt.includes('fix')) return '🔧 Troubleshooting';
    if (txt.includes('idea') || txt.includes('brainstorm')) return '💡 Ideation';
    if (txt.includes('code')) return '🧩 Coding';
    return `Segment ${idx + 1}`;
  }

  buildSummary(msgs) {
    const userParts = msgs.filter(m => m.role === 'user').map(m => m.content).join(' ').slice(0, 160);
    return userParts || this.truncate(msgs[0].content, 160);
  }

  truncate(text, n) { return !text || text.length <= n ? text : text.slice(0, n).trim() + '…'; }

  extractMessages() {
    const out = [];
    if (this.platform === 'chatgpt') {
      document.querySelectorAll('[data-message-author-role]')
        .forEach(el => { const role = el.getAttribute('data-message-author-role'); const content = (el.querySelector('.prose') || el).textContent.trim(); if (content) out.push({ role, content }); });
    } else if (this.platform === 'claude') {
      document.querySelectorAll('[data-testid^="conversation-message"], .font-user-message, .font-claude-message')
        .forEach(el => { const isUser = el.classList.contains('font-user-message') || el.getAttribute('data-testid')?.includes('user'); const role = isUser ? 'user' : 'assistant'; const content = el.textContent.trim(); if (content) out.push({ role, content }); });
    }
    return out;
  }

  renderTimeline() {
    const loader = document.getElementById('timeline-loading');
    const list = document.getElementById('segments-list');
    if (!loader || !list) { return; }
    loader.style.display = 'none';
    list.style.display = 'block';
    if (!this.segments.length) { this.showEmptyState(); return; }

    // Defensive: ensure segments array
    if (!Array.isArray(this.segments)) this.segments = [];
    list.innerHTML = this.segments.map((seg, i) => {
      const responses = seg.responses?.length ? `
        <div class="segment-responses">
          <button class="dropdown-btn" onclick="this.nextElementSibling.classList.toggle('open')">Show ${seg.responses.length} responses ▼</button>
          <div class="dropdown-content">${seg.responses.map((r, idx) => `<div class=\"response-card\"><span class=\"response-number\">${idx + 1}</span><span class=\"response-text\">${r}</span></div>`).join('')}</div>
        </div>` : '';
      return `<div class="timeline-segment host-style" data-idx="${i}">
        <div class="segment-header"><span class="segment-number">${i + 1}</span><h4 class="segment-title">${seg.title}</h4></div>
        <div class="segment-meta"><span class="message-range">${seg.messageCount} msgs</span></div>
        <p class="segment-summary">${this.truncate(seg.summary || '', 180)}</p>
        ${responses}
        <button class="jump-btn" onclick="chatTimeline.jumpToSegment(${seg.start})">📍 Jump</button>
      </div>`;
    }).join('');

    // Analytics block
    list.innerHTML += `<div class="analytics-sidebar"><h4>📊 Insights & Suggestions</h4><ul>
      <li><strong>Pattern:</strong> ${this.analyzePatterns()}</li>
      <li><strong>Tip:</strong> ${this.suggestImprovement()}</li>
    </ul></div>`;

    // Add export controls if premium
    if (this.isPremium) {
      const analytics = list.querySelector('.analytics-sidebar');
      if (analytics) {
        const div = document.createElement('div');
        div.className = 'export-actions';
        div.innerHTML = `<button class="export-btn" onclick="chatTimeline.exportMarkdown()">MD</button><button class="export-btn" onclick="chatTimeline.exportJSON()">JSON</button>`;
        analytics.appendChild(div);
      }
    }

    if (!this.isPremium && this.segments.length > 2) {
      list.innerHTML += `<div class="premium-teaser"><h4>🎯 Want More?</h4><ul>
        <li>Export & Templates</li><li>Real-time refresh</li><li>Analytics history</li><li>Custom naming</li>
      </ul><button class="upgrade-cta" onclick="chatTimeline.showUpgradeModal()">⭐ Upgrade - $19/mo</button></div>`;
    }
  }

  computeParallelThreads() {
    try {
      if (!window.ParallelThreadDetector) return;
      const detector = new window.ParallelThreadDetector();
      const { threads, confidence } = detector.analyze(this.messages);
      if (!threads.length) return;
      const existing = document.querySelector('.analytics-sidebar ul');
      if (existing) {
        const li = document.createElement('li');
        li.innerHTML = `<strong>Threads:</strong> ${threads.map(t => `${t.label} (${t.count})`).join(', ')} <span style="opacity:.6">${Math.round(confidence*100)}% conf.</span>`;
        existing.appendChild(li);
      }
      this.renderThreadLanes(threads);
    } catch (e) {
      console.debug(this.logPrefix, 'Thread detection skipped', e.message);
    }
  }

  // -------- Persistence & Export (Premium-Oriented) --------
  persistSession() {
    try {
      const key = this.sessionStorageKey();
      const payload = { ts: Date.now(), segments: this.segments, messages: this.messages.slice(-200) };
      localStorage.setItem(key, JSON.stringify(payload));
    } catch (_) {}
  }

  loadPersisted() {
    try {
      const raw = localStorage.getItem(this.sessionStorageKey());
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Array.isArray(data?.segments) && data.segments.length) {
        this.segments = data.segments;
        this.renderTimeline();
      }
    } catch (_) {}
  }

  sessionStorageKey() {
    const convoId = (location.pathname || '').replace(/[^a-z0-9]+/gi,'_').slice(0,60);
    return `timeline_cache_${this.platform}_${convoId}`;
  }

  exportMarkdown() {
    if (!this.isPremium) return this.showUpgradeModal();
    const lines = ['# Conversation Timeline',''];
    this.segments.forEach((s,i)=>{
      lines.push(`## ${i+1}. ${s.title}`);
      lines.push(`- Messages: ${s.start+1}–${s.end+1}`);
      lines.push('');
      lines.push(s.summary||'');
      lines.push('');
    });
    this.triggerDownload(new Blob([lines.join('\n')], {type:'text/markdown'}), 'timeline.md');
  }

  exportJSON() {
    if (!this.isPremium) return this.showUpgradeModal();
    const blob = new Blob([JSON.stringify({ segments: this.segments, messages: this.messages }, null, 2)], {type:'application/json'});
    this.triggerDownload(blob, 'timeline.json');
  }

  triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 2000);
  }

  // -------- Premium Upgrade Simulation --------
  simulateUpgrade() {
    try {
      this.isPremium = true;
      localStorage.setItem('timeline_premium','1');
      chrome?.storage?.sync?.set?.({ isPremium: true }, ()=>{});
      this.closeUpgradeModal();
      this.rebuildUIAfterUpgrade();
    } catch (e) { console.warn('Upgrade simulation failed', e); }
  }

  rebuildUIAfterUpgrade() {
    const container = document.getElementById('chat-timeline-container');
    if (!container) return;
    container.remove();
    this.injectTimelineUI();
    if (this.isActive) this.renderTimeline();
  }

  // -------- History / Session Management --------
  listStoredSessions() {
    const out = [];
    for (let i=0;i<localStorage.length;i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('timeline_cache_'+this.platform+'_')) {
        try {
          const data = JSON.parse(localStorage.getItem(k));
          if (data?.segments) out.push({ key:k, ts:data.ts, count:data.segments.length, title:data.segments[0]?.title || 'Conversation' });
        } catch(_){}
      }
    }
    return out.sort((a,b)=>b.ts-a.ts);
  }

  trimStoredSessions() {
    const sessions = this.listStoredSessions();
    if (sessions.length <= this.maxStoredSessions) return;
    sessions.slice(this.maxStoredSessions).forEach(s => localStorage.removeItem(s.key));
  }

  showHistoryModal() {
    if (document.querySelector('.timeline-history-modal')) return;
    const sessions = this.listStoredSessions();
    const modal = document.createElement('div');
    modal.className = 'timeline-history-modal';
    const rows = sessions.map(s => `<tr data-key="${s.key}"><td>${new Date(s.ts).toLocaleString()}</td><td>${s.title}</td><td>${s.count}</td><td><button class="load-session-btn">Load</button></td></tr>`).join('') || '<tr><td colspan="4" style="text-align:center;">No saved sessions yet</td></tr>';
    modal.innerHTML = `<div class="history-inner"><h3>Saved Timelines</h3><table><thead><tr><th>Saved</th><th>Title</th><th>Segments</th><th></th></tr></thead><tbody>${rows}</tbody></table><div class="history-actions"><button class="close-history">Close</button></div></div>`;
    document.body.appendChild(modal);
    modal.querySelector('.close-history').addEventListener('click', () => modal.remove());
    modal.querySelectorAll('tr[data-key]').forEach(tr => {
      tr.querySelector('.load-session-btn').addEventListener('click', () => {
        const key = tr.getAttribute('data-key');
        const raw = localStorage.getItem(key);
        if (raw) {
          try { const data = JSON.parse(raw); this.segments = data.segments || []; this.messages = data.messages || []; this.renderTimeline(); modal.remove(); }
          catch(_){}
        }
      });
    });
  }

  renderThreadLanes(threads) {
    try {
      const analytics = document.querySelector('.analytics-sidebar');
      if (!analytics) return;
      let lanes = analytics.querySelector('.thread-lanes');
      if (!lanes) {
        lanes = document.createElement('div');
        lanes.className = 'thread-lanes';
        analytics.appendChild(lanes);
      }
      const total = this.messages.length || 1;
      lanes.innerHTML = threads.map(t => {
        const left = (t.span[0]/total)*100;
        const width = ((t.span[1]-t.span[0]+1)/total)*100;
        return `<div class="thread-lane" title="${t.label}"><div class="thread-bar" style="left:${left}%;width:${width}%;"></div><span class="thread-label">${t.label}</span></div>`;
      }).join('');
    } catch (_) {}
  }

  analyzePatterns() {
    const users = this.messages.filter(m => m.role === 'user').length;
    const ai = this.messages.length - users;
    if (!this.messages.length) return 'No data yet';
    if (users > ai * 1.4) return 'High questioning frequency';
    if (ai > users * 1.6) return 'Long AI monologues';
    return 'Balanced turn-taking';
  }

  suggestImprovement() {
    if (this.messages.length < 4) return 'Add more depth to get insights';
    if (this.segments.length > 6) return 'Consider summarizing mid-chat';
    return 'Ask for alternatives to enrich output';
  }

  jumpToSegment(startIdx) {
    const elements = this.getMessageElements();
    if (elements[startIdx]) {
      elements[startIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });
      elements[startIdx].style.outline = '2px solid #f59e0b';
      setTimeout(() => { elements[startIdx].style.outline = ''; }, 1800);
    }
  }

  getMessageElements() {
    if (this.platform === 'chatgpt') return document.querySelectorAll('[data-message-author-role]');
    if (this.platform === 'claude') return document.querySelectorAll('[data-testid^="conversation-message"], .font-user-message, .font-claude-message');
    return [];
  }

  showEmptyState() {
    const loader = document.getElementById('timeline-loading');
    const list = document.getElementById('segments-list');
    if (loader) loader.style.display = 'none';
    if (list) {
      list.style.display = 'block';
      list.innerHTML = `<div class="empty-state"><h4>💬 Start a conversation!</h4><p>Your timeline will appear here.</p><p class="tip">Tip: Works best after a few exchanges.</p></div>`;
    }
    this.sendBadgeUpdate();
  }

  showErrorState() {
    const loader = document.getElementById('timeline-loading');
    const list = document.getElementById('segments-list');
    if (loader) loader.style.display = 'none';
    if (list) {
      list.style.display = 'block';
      list.innerHTML = `<div class="error-state"><h4>⚠️ Timeline Unavailable</h4><p>Could not analyze this conversation.</p><button class="retry-btn" onclick="chatTimeline.processConversation()">🔄 Try Again</button></div>`;
    }
  }

  showUpgradeModal() {
    if (document.querySelector('.upgrade-modal')) return;
    const modal = document.createElement('div');
    modal.className = 'upgrade-modal';
    modal.innerHTML = `<div class="upgrade-modal-content"><h2>🚀 ChatTimeline Premium</h2>
      <div class="feature-comparison"><div class="free-features"><h3>Free</h3><ul><li>Basic navigation</li><li>Segmentation</li><li>Jump links</li></ul></div>
      <div class="premium-features"><h3>Premium</h3><ul><li>Export & templates</li><li>Realtime updates</li><li>Analytics history</li><li>Custom naming</li></ul></div></div>
      <div class="pricing"><div class="price-tag"><span class="price">$19</span><span class="period">/mo</span></div><p class="guarantee">30‑day refund guarantee</p></div>
      <div class="modal-actions"><button class="upgrade-now-btn" onclick="chatTimeline.goToCheckout()">⭐ Upgrade Now</button><button class="maybe-later-btn" onclick="chatTimeline.closeUpgradeModal()">Maybe Later</button></div>
      <button class="close-modal" onclick="chatTimeline.closeUpgradeModal()">✕</button></div>`;
    document.body.appendChild(modal);
  }

  closeUpgradeModal() { document.querySelector('.upgrade-modal')?.remove(); }
  goToCheckout() { window.open('https://chattimeline.com/upgrade', '_blank'); }

  startConversationMonitoring() {
    const observer = new MutationObserver(muts => {
      if (!this.isActive) return;
      let changed = false;
      for (const m of muts) {
        if (m.addedNodes.length) { changed = true; break; }
      }
      if (changed) {
        clearTimeout(this.updateTimeout);
        this.updateTimeout = setTimeout(() => this.processConversation(), 1000);
      }
    });
    const container = document.querySelector('main') || document.body;
    observer.observe(container, { childList: true, subtree: true });
    console.debug(this.logPrefix, 'Monitoring conversation mutations');
  }
}

// Bootstrap
const chatTimeline = new ChatTimelineInjector();
chatTimeline.init();
window.chatTimeline = chatTimeline;

// --- Badge Update Helper ---
ChatTimelineInjector.prototype.sendBadgeUpdate = function() {
  try {
    const accent = this.platform === 'chatgpt' ? '#10a37f' : (this.platform === 'claude' ? '#5b5bd6' : '#6b7280');
    chrome.runtime?.sendMessage?.({ action: 'updateBadge', conversationLength: this.messages.length, accent });
  } catch (_) {}
};