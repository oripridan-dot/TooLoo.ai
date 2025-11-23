// @version 2.1.28
/**
 * ChatGPT/Claude JSON Export Parser
 * Parses conversation exports and extracts prompts
 */

class ChatParser {
  /**
   * Parse ChatGPT or Claude JSON export
   */
  static parseExport(jsonData) {
    try {
      const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;

      // ChatGPT format
      if (Array.isArray(data)) {
        return this.parseChatGPT(data);
      }

      // Claude format (if wrapped in object)
      if (data.conversations) {
        return this.parseClaude(data);
      }

      // Generic format
      if (data.messages) {
        return this.parseGeneric(data);
      }

      return [];
    } catch (error) {
      console.error('Error parsing JSON:', error);
      return [];
    }
  }

  /**
   * Parse ChatGPT export (array of messages)
   */
  static parseChatGPT(messages) {
    return messages
      .filter(m => m.role === 'user' && m.content && m.content.trim())
      .map(m => ({
        role: 'user',
        content: m.content.trim(),
        source: 'ChatGPT'
      }));
  }

  /**
   * Parse Claude export
   */
  static parseClaude(data) {
    const prompts = [];

    if (data.conversations && Array.isArray(data.conversations)) {
      data.conversations.forEach(conv => {
        if (conv.messages && Array.isArray(conv.messages)) {
          conv.messages.forEach(m => {
            if (m.role === 'user' && m.content) {
              prompts.push({
                role: 'user',
                content: m.content.trim(),
                source: 'Claude'
              });
            }
          });
        }
      });
    }

    return prompts;
  }

  /**
   * Parse generic message format
   */
  static parseGeneric(data) {
    const messages = data.messages || [];
    return messages
      .filter(m => m.role === 'user' && m.content)
      .map(m => ({
        role: 'user',
        content: m.content.trim(),
        source: 'Unknown'
      }));
  }

  /**
   * Extract first user message (for quick analysis)
   */
  static getFirstPrompt(jsonData) {
    const prompts = this.parseExport(jsonData);
    return prompts.length > 0 ? prompts[0].content : null;
  }

  /**
   * Extract all user prompts from conversation
   */
  static getAllPrompts(jsonData) {
    return this.parseExport(jsonData).map(m => m.content);
  }
}

// Export for both ES6 modules and browser global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ChatParser };
} else if (typeof window !== 'undefined') {
  window.ChatParser = ChatParser;
}
