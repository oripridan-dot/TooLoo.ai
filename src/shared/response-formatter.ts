// @version 3.3.209
/**
 * Response Formatter
 * 
 * Intelligently formats chat responses based on context, task type, and content.
 * Ensures responses are:
 * - Well-organized with clear highlights and structure
 * - Contextually appropriate (technical vs creative vs conversational)
 * - Easy to read with proper visual hierarchy
 * - Consistent in style across different response types
 * 
 * @module shared/response-formatter
 */

// ============================================================================
// TYPES
// ============================================================================

export type ResponseContext = 
  | 'technical'      // Code, system, architecture discussions
  | 'creative'       // Creative writing, brainstorming
  | 'quick'          // Short, direct answers
  | 'conversational' // General chat, explanations
  | 'structured'     // Data, lists, organized information
  | 'execution'      // Code execution results
  | 'error'          // Error responses
  | 'status';        // System status updates

export interface ResponseSection {
  type: 'highlight' | 'detail' | 'code' | 'warning' | 'success' | 'error' | 'info' | 'list' | 'table';
  icon?: string;
  title?: string;
  content: string;
  priority: number; // Higher = shown first
  collapsible?: boolean;
  collapsed?: boolean;
}

export interface FormattedResponse {
  sections: ResponseSection[];
  summary?: string;
  metadata?: {
    provider?: string;
    latency?: number;
    context?: ResponseContext;
    confidence?: number;
  };
}

export interface FormatOptions {
  context: ResponseContext;
  maxLength?: number;
  includeMetadata?: boolean;
  preserveMarkdown?: boolean;
  highlightKeyPoints?: boolean;
  showProviderInfo?: boolean;
}

// ============================================================================
// RESPONSE ANALYZER
// ============================================================================

class ResponseAnalyzer {
  /**
   * Detect the natural context of a response
   */
  detectContext(content: string, userMessage?: string): ResponseContext {
    const lower = content.toLowerCase();
    const userLower = (userMessage || '').toLowerCase();
    
    // Check for code/technical content
    if (this.hasCodeBlocks(content) || /```|function |class |import |export |const |let |var /.test(content)) {
      return 'technical';
    }
    
    // Check for execution results
    if (/output:|result:|executed|running|stdout|stderr/i.test(content)) {
      return 'execution';
    }
    
    // Check for errors
    if (/error:|failed|exception|traceback|cannot|unable to/i.test(lower) && content.length < 1000) {
      return 'error';
    }
    
    // Check for structured data
    if (this.hasStructuredData(content)) {
      return 'structured';
    }
    
    // Check user intent
    if (/creative|brainstorm|imagine|story|write/i.test(userLower)) {
      return 'creative';
    }
    
    // Short responses are quick
    if (content.length < 200 && !this.hasCodeBlocks(content)) {
      return 'quick';
    }
    
    return 'conversational';
  }
  
  hasCodeBlocks(content: string): boolean {
    return /```[\s\S]*?```/.test(content);
  }
  
  hasStructuredData(content: string): boolean {
    // Check for tables, JSON, or heavy list usage
    return /\|.*\|.*\|/m.test(content) || // Markdown tables
           /^\s*[-*]\s+.+$/m.test(content) && (content.match(/^\s*[-*]\s+/gm)?.length || 0) > 3 || // Lists
           /^\s*\d+\.\s+/m.test(content) && (content.match(/^\s*\d+\.\s+/gm)?.length || 0) > 3; // Numbered lists
  }
  
  /**
   * Extract key points from content
   */
  extractKeyPoints(content: string): string[] {
    const keyPoints: string[] = [];
    
    // Extract bold text as key points
    const boldMatches = content.match(/\*\*([^*]+)\*\*/g);
    if (boldMatches) {
      for (const match of boldMatches.slice(0, 5)) {
        const text = match.replace(/\*\*/g, '').trim();
        if (text.length > 3 && text.length < 100) {
          keyPoints.push(text);
        }
      }
    }
    
    // Extract headers as key points
    const headerMatches = content.match(/^#+\s+(.+)$/gm);
    if (headerMatches) {
      for (const match of headerMatches.slice(0, 5)) {
        const text = match.replace(/^#+\s+/, '').trim();
        if (text.length > 3 && text.length < 100) {
          keyPoints.push(text);
        }
      }
    }
    
    // Extract emoji-prefixed lines (often highlights)
    const emojiLines = content.match(/^[🎯⚡✅🚀💡🔑📌✨🌟]+ .+$/gm);
    if (emojiLines) {
      for (const line of emojiLines.slice(0, 5)) {
        if (line.length < 100) {
          keyPoints.push(line);
        }
      }
    }
    
    return [...new Set(keyPoints)]; // Deduplicate
  }
  
  /**
   * Extract code blocks from content
   */
  extractCodeBlocks(content: string): Array<{ language: string; code: string }> {
    const blocks: Array<{ language: string; code: string }> = [];
    const regex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      blocks.push({
        language: match[1] || 'text',
        code: match[2].trim(),
      });
    }
    
    return blocks;
  }
  
  /**
   * Detect warnings, errors, and successes in content
   */
  detectAlerts(content: string): Array<{ type: 'warning' | 'error' | 'success'; text: string }> {
    const alerts: Array<{ type: 'warning' | 'error' | 'success'; text: string }> = [];
    
    // Warning patterns
    const warningPatterns = [
      /⚠️?\s*(.+)/g,
      /warning:?\s*(.+)/gi,
      /note:?\s*(.+)/gi,
      /caution:?\s*(.+)/gi,
    ];
    
    // Error patterns  
    const errorPatterns = [
      /❌\s*(.+)/g,
      /error:?\s*(.+)/gi,
      /failed:?\s*(.+)/gi,
    ];
    
    // Success patterns
    const successPatterns = [
      /✅\s*(.+)/g,
      /success:?\s*(.+)/gi,
      /completed:?\s*(.+)/gi,
    ];
    
    for (const pattern of warningPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        alerts.push({ type: 'warning', text: match[1].trim() });
      }
    }
    
    for (const pattern of errorPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        alerts.push({ type: 'error', text: match[1].trim() });
      }
    }
    
    for (const pattern of successPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        alerts.push({ type: 'success', text: match[1].trim() });
      }
    }
    
    return alerts;
  }
}

// ============================================================================
// RESPONSE FORMATTER
// ============================================================================

export class ResponseFormatter {
  private analyzer: ResponseAnalyzer;
  
  constructor() {
    this.analyzer = new ResponseAnalyzer();
  }
  
  /**
   * Format a response based on context and content
   */
  format(content: string, options: Partial<FormatOptions> = {}): FormattedResponse {
    const context = options.context || this.analyzer.detectContext(content);
    
    switch (context) {
      case 'technical':
        return this.formatTechnical(content, options);
      case 'creative':
        return this.formatCreative(content, options);
      case 'quick':
        return this.formatQuick(content, options);
      case 'execution':
        return this.formatExecution(content, options);
      case 'error':
        return this.formatError(content, options);
      case 'structured':
        return this.formatStructured(content, options);
      case 'status':
        return this.formatStatus(content, options);
      default:
        return this.formatConversational(content, options);
    }
  }
  
  /**
   * Format technical responses (code, architecture, etc.)
   */
  private formatTechnical(content: string, _options: Partial<FormatOptions>): FormattedResponse {
    const sections: ResponseSection[] = [];
    const codeBlocks = this.analyzer.extractCodeBlocks(content);
    const keyPoints = this.analyzer.extractKeyPoints(content);
    const alerts = this.analyzer.detectAlerts(content);
    
    // Remove code blocks from content for separate handling
    let textContent = content;
    for (const block of codeBlocks) {
      textContent = textContent.replace(new RegExp('```' + block.language + '?\\n' + this.escapeRegex(block.code) + '\\n```', 'g'), '');
    }
    textContent = textContent.trim();
    
    // Add key points highlight at top
    if (keyPoints.length > 0) {
      sections.push({
        type: 'highlight',
        icon: '🎯',
        title: 'Key Points',
        content: keyPoints.map(p => `• ${p}`).join('\n'),
        priority: 100,
      });
    }
    
    // Add alerts
    for (const alert of alerts) {
      sections.push({
        type: alert.type,
        icon: alert.type === 'error' ? '❌' : alert.type === 'warning' ? '⚠️' : '✅',
        content: alert.text,
        priority: alert.type === 'error' ? 95 : alert.type === 'warning' ? 90 : 85,
      });
    }
    
    // Add explanation text
    if (textContent.length > 10) {
      sections.push({
        type: 'detail',
        icon: '📝',
        title: 'Explanation',
        content: textContent,
        priority: 50,
      });
    }
    
    // Add code blocks
    for (let i = 0; i < codeBlocks.length; i++) {
      const block = codeBlocks[i];
      sections.push({
        type: 'code',
        icon: '💻',
        title: `Code${codeBlocks.length > 1 ? ` (${block.language})` : ''}`,
        content: '```' + block.language + '\n' + block.code + '\n```',
        priority: 40 - i,
        collapsible: block.code.split('\n').length > 20,
      });
    }
    
    return {
      sections: sections.sort((a, b) => b.priority - a.priority),
      metadata: { context: 'technical' },
    };
  }
  
  /**
   * Format creative responses
   */
  private formatCreative(content: string, _options: Partial<FormatOptions>): FormattedResponse {
    const sections: ResponseSection[] = [];
    
    // Creative content is mostly free-flowing, minimal structure
    sections.push({
      type: 'detail',
      icon: '✨',
      content: content,
      priority: 100,
    });
    
    return {
      sections,
      metadata: { context: 'creative' },
    };
  }
  
  /**
   * Format quick, concise responses
   */
  private formatQuick(content: string, _options: Partial<FormatOptions>): FormattedResponse {
    return {
      sections: [{
        type: 'detail',
        content: content,
        priority: 100,
      }],
      metadata: { context: 'quick' },
    };
  }
  
  /**
   * Format execution results
   */
  private formatExecution(content: string, _options: Partial<FormatOptions>): FormattedResponse {
    const sections: ResponseSection[] = [];
    const codeBlocks = this.analyzer.extractCodeBlocks(content);
    const alerts = this.analyzer.detectAlerts(content);
    
    // Check for success/failure
    const isSuccess = /success|completed|✅/i.test(content) && !/error|failed|❌/i.test(content);
    const isError = /error|failed|exception|❌/i.test(content);
    
    // Status banner
    if (isSuccess) {
      sections.push({
        type: 'success',
        icon: '✅',
        title: 'Execution Successful',
        content: 'Code executed successfully',
        priority: 100,
      });
    } else if (isError) {
      sections.push({
        type: 'error',
        icon: '❌',
        title: 'Execution Failed',
        content: 'Code execution encountered an error',
        priority: 100,
      });
    }
    
    // Output sections
    if (codeBlocks.length > 0) {
      for (const block of codeBlocks) {
        sections.push({
          type: 'code',
          icon: '📤',
          title: 'Output',
          content: '```' + block.language + '\n' + block.code + '\n```',
          priority: 80,
        });
      }
    }
    
    // Add any alerts
    for (const alert of alerts) {
      if (sections.find(s => s.content.includes(alert.text))) continue; // Avoid duplicates
      sections.push({
        type: alert.type,
        icon: alert.type === 'error' ? '❌' : alert.type === 'warning' ? '⚠️' : '✅',
        content: alert.text,
        priority: 60,
      });
    }
    
    // Remaining text
    let remainingText = content;
    for (const block of codeBlocks) {
      remainingText = remainingText.replace(new RegExp('```' + block.language + '?\\n[\\s\\S]*?```', 'g'), '');
    }
    remainingText = remainingText.replace(/^(✅|❌|⚠️)\s*.+$/gm, '').trim();
    
    if (remainingText.length > 10) {
      sections.push({
        type: 'info',
        content: remainingText,
        priority: 40,
      });
    }
    
    return {
      sections: sections.sort((a, b) => b.priority - a.priority),
      metadata: { context: 'execution' },
    };
  }
  
  /**
   * Format error responses
   */
  private formatError(content: string, _options: Partial<FormatOptions>): FormattedResponse {
    const sections: ResponseSection[] = [];
    
    // Error banner
    sections.push({
      type: 'error',
      icon: '❌',
      title: 'Error',
      content: content,
      priority: 100,
    });
    
    // Try to extract helpful info
    const suggestion = this.extractSuggestion(content);
    if (suggestion) {
      sections.push({
        type: 'info',
        icon: '💡',
        title: 'Suggestion',
        content: suggestion,
        priority: 80,
      });
    }
    
    return {
      sections,
      metadata: { context: 'error' },
    };
  }
  
  /**
   * Format structured data responses
   */
  private formatStructured(content: string, _options: Partial<FormatOptions>): FormattedResponse {
    const sections: ResponseSection[] = [];
    const keyPoints = this.analyzer.extractKeyPoints(content);
    
    // Key points summary
    if (keyPoints.length > 0) {
      sections.push({
        type: 'highlight',
        icon: '📋',
        title: 'Summary',
        content: keyPoints.map(p => `• ${p}`).join('\n'),
        priority: 100,
      });
    }
    
    // Main content
    sections.push({
      type: 'detail',
      content: content,
      priority: 50,
    });
    
    return {
      sections,
      metadata: { context: 'structured' },
    };
  }
  
  /**
   * Format status updates
   */
  private formatStatus(content: string, _options: Partial<FormatOptions>): FormattedResponse {
    const sections: ResponseSection[] = [];
    
    // Status indicator
    const isHealthy = /healthy|running|active|ready|✅/i.test(content);
    const isWarning = /warning|degraded|slow|⚠️/i.test(content);
    const isError = /error|failed|offline|❌/i.test(content);
    
    sections.push({
      type: isError ? 'error' : isWarning ? 'warning' : 'success',
      icon: isError ? '❌' : isWarning ? '⚠️' : '✅',
      title: 'System Status',
      content: content,
      priority: 100,
    });
    
    return {
      sections,
      metadata: { context: 'status' },
    };
  }
  
  /**
   * Format conversational responses
   */
  private formatConversational(content: string, _options: Partial<FormatOptions>): FormattedResponse {
    const sections: ResponseSection[] = [];
    const keyPoints = this.analyzer.extractKeyPoints(content);
    const alerts = this.analyzer.detectAlerts(content);
    const codeBlocks = this.analyzer.extractCodeBlocks(content);
    
    // If there are key points, highlight them
    if (keyPoints.length >= 2) {
      sections.push({
        type: 'highlight',
        icon: '💡',
        title: 'Key Takeaways',
        content: keyPoints.slice(0, 5).map(p => `• ${p}`).join('\n'),
        priority: 100,
      });
    }
    
    // Add any alerts
    for (const alert of alerts) {
      sections.push({
        type: alert.type,
        icon: alert.type === 'error' ? '❌' : alert.type === 'warning' ? '⚠️' : '✅',
        content: alert.text,
        priority: 90,
      });
    }
    
    // Main content
    let mainContent = content;
    
    // Don't duplicate highlighted key points
    if (keyPoints.length >= 2) {
      // Keep the full content but it will appear after highlights
    }
    
    sections.push({
      type: 'detail',
      content: mainContent,
      priority: 50,
    });
    
    return {
      sections: sections.sort((a, b) => b.priority - a.priority),
      metadata: { context: 'conversational' },
    };
  }
  
  // ============================================================================
  // UTILITIES
  // ============================================================================
  
  private extractSuggestion(errorContent: string): string | null {
    // Look for "try", "suggestion", "hint", "solution" patterns
    const patterns = [
      /(?:try|suggest|hint|solution|fix):?\s*(.+)/i,
      /you (?:can|should|might|could)\s+(.+)/i,
    ];
    
    for (const pattern of patterns) {
      const match = errorContent.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return null;
  }
  
  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  /**
   * Convert formatted response to markdown string
   */
  toMarkdown(formatted: FormattedResponse): string {
    const parts: string[] = [];
    
    for (const section of formatted.sections) {
      if (section.title) {
        const icon = section.icon || '';
        parts.push(`${icon} **${section.title}**`);
      }
      
      if (section.type === 'highlight') {
        parts.push(`> ${section.content.split('\n').join('\n> ')}`);
      } else if (section.type === 'warning') {
        parts.push(`> ⚠️ ${section.content}`);
      } else if (section.type === 'error') {
        parts.push(`> ❌ ${section.content}`);
      } else if (section.type === 'success') {
        parts.push(`> ✅ ${section.content}`);
      } else {
        parts.push(section.content);
      }
      
      parts.push(''); // Empty line between sections
    }
    
    return parts.join('\n').trim();
  }
  
  /**
   * Convert formatted response to HTML string
   */
  toHTML(formatted: FormattedResponse): string {
    const parts: string[] = [];
    
    parts.push('<div class="formatted-response">');
    
    for (const section of formatted.sections) {
      const typeClass = `response-section response-${section.type}`;
      parts.push(`<div class="${typeClass}">`);
      
      if (section.title) {
        parts.push(`<h4>${section.icon || ''} ${section.title}</h4>`);
      }
      
      // Convert markdown content to basic HTML
      let content = section.content
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
      
      parts.push(`<div class="section-content">${content}</div>`);
      parts.push('</div>');
    }
    
    parts.push('</div>');
    
    return parts.join('\n');
  }
}

// Export singleton instance
export const responseFormatter = new ResponseFormatter();
