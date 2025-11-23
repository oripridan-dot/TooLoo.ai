// @version 2.1.28
/**
 * Markdown Renderer for TooLoo.ai
 * Converts markdown with emoji headers into beautiful HTML with visual hierarchy
 * Handles quality badges, code blocks, lists, emphasis, and provider attribution
 */

class MarkdownRenderer {
  constructor() {
    this.codeBlockCounter = 0;
  }

  /**
   * Main render function - convert markdown to HTML
   */
  render(markdownText) {
    if (!markdownText || typeof markdownText !== 'string') {
      return '<p>No content available</p>';
    }

    let html = markdownText;

    // 1. Protect code blocks (process them last)
    const codeBlocks = [];
    html = html.replace(/```[\s\S]*?```/g, (match) => {
      codeBlocks.push(match);
      return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
    });

    // 2. Process quality badges (### ⚡ **Premium Response** (92% quality))
    html = this.renderQualityBadges(html);

    // 3. Process headers with emoji (##, ###)
    html = this.renderHeaders(html);

    // 4. Process blockquotes (> text)
    html = this.renderBlockquotes(html);

    // 5. Process horizontal rules (---)
    html = this.renderHorizontalRules(html);

    // 6. Process bold and italic (**text**, *text*, __text__)
    html = this.renderEmphasis(html);

    // 7. Process numbered lists (1. 2. 3.)
    html = this.renderNumberedLists(html);

    // 8. Process bullet lists (- • *)
    html = this.renderBulletLists(html);

    // 9. Process inline code (`code`)
    html = this.renderInlineCode(html);

    // 10. Process line breaks
    html = this.renderLineBreaks(html);

    // 11. Restore and process code blocks
    html = this.renderCodeBlocks(html, codeBlocks);

    // 12. Wrap in container
    html = `<div class="markdown-content">${html}</div>`;

    return html;
  }

  /**
   * Render quality badges with color coding
   * ### ⚡ **Premium Response** (92% quality) → HTML badge
   */
  renderQualityBadges(html) {
    // Premium badge (85-100)
    html = html.replace(
      /### ⚡ \*\*Premium Response\*\* \((\d+)% quality\)/g,
      '<div class="quality-badge premium">⚡ <strong>Premium Response</strong> <span class="quality-score">$1% quality</span></div>'
    );

    // Good badge (70-84)
    html = html.replace(
      /### 📊 \*\*Good Response\*\* \((\d+)% quality\)/g,
      '<div class="quality-badge good">📊 <strong>Good Response</strong> <span class="quality-score">$1% quality</span></div>'
    );

    // Okay badge (55-69)
    html = html.replace(
      /### 📝 \*\*Response\*\* \((\d+)% quality\)/g,
      '<div class="quality-badge okay">📝 <strong>Response</strong> <span class="quality-score">$1% quality</span></div>'
    );

    return html;
  }

  /**
   * Render headers with emoji and styling
   * ## 🎯 Problem → <h2 class="section-header">🎯 Problem</h2>
   */
  renderHeaders(html) {
    // H3 headers (###)
    html = html.replace(/^### (.+)$/gm, '<h3 class="header-3">$1</h3>');

    // H2 headers (##) - section headers
    html = html.replace(/^## (.+)$/gm, '<h2 class="section-header">$1</h2>');

    // H1 headers (#)
    html = html.replace(/^# (.+)$/gm, '<h1 class="section-title">$1</h1>');

    return html;
  }

  /**
   * Render blockquotes with attribution styling
   * > **Claude (Anthropic)** via TooLoo.ai
   * > ✓ High confidence • Quality: 92/100
   */
  renderBlockquotes(html) {
    // Multi-line blockquotes
    html = html.replace(/^> (.+)$/gm, '<div class="blockquote-line">$1</div>');

    // Wrap consecutive blockquote lines in blockquote container
    html = html.replace(
      /(<div class="blockquote-line">[\s\S]*?<\/div>)(?=\n(?!<div class="blockquote-line">)|$)/g,
      '<blockquote class="attribution-block">$1</blockquote>'
    );

    return html;
  }

  /**
   * Render horizontal rules (---)
   */
  renderHorizontalRules(html) {
    html = html.replace(/^---$/gm, '<hr class="section-divider">');
    return html;
  }

  /**
   * Render bold and italic text
   * **bold** → <strong>bold</strong>
   * *italic* → <em>italic</em>
   */
  renderEmphasis(html) {
    // Bold (**text** or __text__)
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // Italic (*text* or _text_) - but not inside ** or __
    html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    html = html.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '<em>$1</em>');

    return html;
  }

  /**
   * Render numbered lists
   * 1. Item → <ol><li>Item</li></ol>
   */
  renderNumberedLists(html) {
    const lines = html.split('\n');
    let inList = false;
    let result = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^(\d+)\.\s+(.+)$/);

      if (match) {
        if (!inList) {
          result.push('<ol class="numbered-list">');
          inList = true;
        }
        result.push(`<li>${match[2]}</li>`);
      } else {
        if (inList) {
          result.push('</ol>');
          inList = false;
        }
        result.push(line);
      }
    }

    if (inList) {
      result.push('</ol>');
    }

    return result.join('\n');
  }

  /**
   * Render bullet lists
   * - Item → <ul><li>Item</li></ul>
   */
  renderBulletLists(html) {
    const lines = html.split('\n');
    let inList = false;
    let result = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^[-•*]\s+(.+)$/);

      if (match) {
        if (!inList) {
          result.push('<ul class="bullet-list">');
          inList = true;
        }
        result.push(`<li>${match[1]}</li>`);
      } else {
        if (inList) {
          result.push('</ul>');
          inList = false;
        }
        result.push(line);
      }
    }

    if (inList) {
      result.push('</ul>');
    }

    return result.join('\n');
  }

  /**
   * Render inline code (`code`)
   */
  renderInlineCode(html) {
    html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    return html;
  }

  /**
   * Render line breaks (double newline → paragraph)
   */
  renderLineBreaks(html) {
    // Split by double newlines
    html = html.split('\n\n')
      .map(block => {
        // Skip if already a block element
        if (block.match(/^<[hublod]|<div|<p|<blockquote|<ul|<ol/i)) {
          return block;
        }
        // Wrap in paragraph if it's text
        if (block.trim() && !block.match(/^<[^>]+>$/)) {
          return `<p>${block.trim()}</p>`;
        }
        return block;
      })
      .join('\n');

    return html;
  }

  /**
   * Render code blocks with syntax highlighting hints
   * ```language code ``` → <pre><code class="language">code</code></pre>
   */
  renderCodeBlocks(html, codeBlocks) {
    codeBlocks.forEach((codeBlock, index) => {
      const match = codeBlock.match(/```([a-z]*)\n([\s\S]*?)```/);
      const language = match ? match[1] || 'plaintext' : 'plaintext';
      const code = match ? match[2] : codeBlock.replace(/```/g, '');

      // Escape HTML characters
      const escaped = this.escapeHtml(code.trim());

      const html = `<pre class="code-block language-${language}"><code>${escaped}</code></pre>`;
      html = html.replace(`__CODE_BLOCK_${index}__`, html);
    });

    return html;
  }

  /**
   * Escape HTML special characters
   */
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, char => map[char]);
  }

  /**
   * Extract quality score from markdown
   * Returns number or null
   */
  extractQualityScore(markdown) {
    const match = markdown.match(/\((\d+)%\s+quality\)/);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Extract provider name from attribution
   */
  extractProvider(markdown) {
    const match = markdown.match(/\*\*([^*]+)\*\*.*via TooLoo\.ai/);
    return match ? match[1] : 'TooLoo.ai';
  }
}

// Export for use in browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MarkdownRenderer;
}
