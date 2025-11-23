// Real-World Conversation Import Parser
// Supports multiple chat export formats for cognitive analysis testing
// Privacy-first: processes locally, no data upload required

import fs from 'fs';
import path from 'path';

/**
 * Universal conversation parser supporting multiple export formats
 * @param {string} filePath - Path to conversation export file
 * @param {string} format - Format type: 'discord', 'slack', 'whatsapp', 'telegram', 'plain'
 * @returns {Object} Standardized conversation object
 */
function parseConversationFile(filePath, format = 'auto') {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Auto-detect format if not specified
  if (format === 'auto') {
    format = detectFormat(content, filePath);
  }
  
  switch (format) {
    case 'discord':
      return parseDiscordExport(content);
    case 'slack':
      return parseSlackExport(content);
    case 'whatsapp':
      return parseWhatsAppExport(content);
    case 'telegram':
      return parseTelegramExport(content);
    case 'plain':
      return parsePlainText(content);
    case 'json':
      return parseJSONConversation(content);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

/**
 * Auto-detect conversation format from content and filename
 */
function detectFormat(content, filePath) {
  const filename = path.basename(filePath).toLowerCase();
  
  // File extension hints
  if (filename.endsWith('.json')) {
    // Check if it's a known JSON format
    try {
      const data = JSON.parse(content);
      if (data.messages && Array.isArray(data.messages)) return 'json';
      if (data.guild && data.channels) return 'discord';
      if (data.version && data.type === 'message') return 'slack';
    } catch (e) {
      // Fall through to content analysis
    }
  }
  
  // Content pattern matching
  if (content.includes('Discord Chat Export')) return 'discord';
  if (content.includes('[') && content.includes('] ') && content.includes(': ')) return 'whatsapp';
  if (content.match(/\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2} - /)) return 'whatsapp';
  if (content.includes('"ts":') && content.includes('"user":')) return 'slack';
  if (content.includes('Telegram Desktop')) return 'telegram';
  
  // Default to plain text
  return 'plain';
}

/**
 * Parse Discord chat export (DiscordChatExporter JSON format)
 */
function parseDiscordExport(content) {
  try {
    const data = JSON.parse(content);
    
    const messages = data.messages.map((msg, index) => ({
      id: msg.id || `discord_${index}`,
      timestamp: msg.timestamp || msg.timestampEdited,
      author: msg.author?.name || msg.author?.username || 'Unknown',
      authorId: msg.author?.id,
      content: msg.content || '',
      type: 'message',
      platform: 'discord',
      channel: data.channel?.name,
      guild: data.guild?.name
    })).filter(msg => msg.content.trim().length > 0);
    
    return {
      messages,
      metadata: {
        platform: 'discord',
        channel: data.channel?.name || 'Unknown',
        guild: data.guild?.name || 'Unknown',
        dateRange: getDateRange(messages),
        participantCount: new Set(messages.map(m => m.authorId)).size,
        messageCount: messages.length,
        format: 'discord'
      },
      segments: [] // Will be populated by segmenter
    };
  } catch (error) {
    throw new Error(`Failed to parse Discord export: ${error.message}`);
  }
}

/**
 * Parse Slack export (JSON format)
 */
function parseSlackExport(content) {
  try {
    const lines = content.split('\n').filter(line => line.trim());
    const messages = [];
    
    for (const line of lines) {
      try {
        const msg = JSON.parse(line);
        if (msg.type === 'message' && msg.text) {
          messages.push({
            id: msg.ts || `slack_${messages.length}`,
            timestamp: new Date(parseFloat(msg.ts) * 1000).toISOString(),
            author: msg.user_profile?.display_name || msg.user || 'Unknown',
            authorId: msg.user,
            content: msg.text,
            type: 'message',
            platform: 'slack',
            channel: msg.channel_name
          });
        }
      } catch (e) {
        // Skip malformed lines
        continue;
      }
    }
    
    return {
      messages,
      metadata: {
        platform: 'slack',
        channel: messages[0]?.channel || 'Unknown',
        dateRange: getDateRange(messages),
        participantCount: new Set(messages.map(m => m.authorId)).size,
        messageCount: messages.length,
        format: 'slack'
      },
      segments: []
    };
  } catch (error) {
    throw new Error(`Failed to parse Slack export: ${error.message}`);
  }
}

/**
 * Parse WhatsApp chat export
 */
function parseWhatsAppExport(content) {
  const lines = content.split('\n').filter(line => line.trim());
  const messages = [];
  
  // WhatsApp format: [DD/MM/YYYY, HH:MM:SS] Author: Message
  const whatsappRegex = /^\[(\d{1,2}\/\d{1,2}\/\d{4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?)\]\s+([^:]+):\s+(.+)$/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(whatsappRegex);
    
    if (match) {
      const [, date, time, author, content] = match;
      
      // Parse timestamp
      const [day, month, year] = date.split('/');
      const timestamp = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${time}`).toISOString();
      
      messages.push({
        id: `whatsapp_${i}`,
        timestamp,
        author: author.trim(),
        authorId: author.trim().toLowerCase().replace(/\s+/g, '_'),
        content: content.trim(),
        type: 'message',
        platform: 'whatsapp'
      });
    }
    // Handle multi-line messages
    else if (messages.length > 0 && line.trim()) {
      messages[messages.length - 1].content += '\n' + line.trim();
    }
  }
  
  return {
    messages,
    metadata: {
      platform: 'whatsapp',
      dateRange: getDateRange(messages),
      participantCount: new Set(messages.map(m => m.authorId)).size,
      messageCount: messages.length,
      format: 'whatsapp'
    },
    segments: []
  };
}

/**
 * Parse Telegram export (JSON format)
 */
function parseTelegramExport(content) {
  try {
    const data = JSON.parse(content);
    
    const messages = data.messages
      .filter(msg => msg.type === 'message' && (msg.text || msg.text_entities))
      .map((msg, index) => {
        let content = '';
        if (typeof msg.text === 'string') {
          content = msg.text;
        } else if (msg.text_entities) {
          content = msg.text_entities.map(entity => entity.text || '').join('');
        }
        
        return {
          id: msg.id || `telegram_${index}`,
          timestamp: msg.date,
          author: msg.from || 'Unknown',
          authorId: msg.from_id || msg.from,
          content,
          type: 'message',
          platform: 'telegram'
        };
      })
      .filter(msg => msg.content.trim().length > 0);
    
    return {
      messages,
      metadata: {
        platform: 'telegram',
        chat: data.name || 'Unknown',
        dateRange: getDateRange(messages),
        participantCount: new Set(messages.map(m => m.authorId)).size,
        messageCount: messages.length,
        format: 'telegram'
      },
      segments: []
    };
  } catch (error) {
    throw new Error(`Failed to parse Telegram export: ${error.message}`);
  }
}

/**
 * Parse plain text conversation
 */
function parsePlainText(content) {
  const lines = content.split('\n').filter(line => line.trim());
  const messages = [];
  
  // Try to detect common patterns
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Pattern: "Author: Message"
    const colonMatch = line.match(/^([^:]+):\s*(.+)$/);
    if (colonMatch) {
      const [, author, content] = colonMatch;
      messages.push({
        id: `plain_${i}`,
        timestamp: new Date().toISOString(), // No timestamp available
        author: author.trim(),
        authorId: author.trim().toLowerCase().replace(/\s+/g, '_'),
        content: content.trim(),
        type: 'message',
        platform: 'plain'
      });
    }
    // Pattern: treat each line as a message from unknown author
    else {
      messages.push({
        id: `plain_${i}`,
        timestamp: new Date().toISOString(),
        author: 'Unknown',
        authorId: 'unknown',
        content: line,
        type: 'message',
        platform: 'plain'
      });
    }
  }
  
  return {
    messages,
    metadata: {
      platform: 'plain',
      dateRange: getDateRange(messages),
      participantCount: new Set(messages.map(m => m.authorId)).size,
      messageCount: messages.length,
      format: 'plain'
    },
    segments: []
  };
}

/**
 * Parse pre-formatted JSON conversation
 */
function parseJSONConversation(content) {
  try {
    const data = JSON.parse(content);
    
    // Validate required structure
    if (!data.messages || !Array.isArray(data.messages)) {
      throw new Error('Invalid JSON format: missing messages array');
    }
    
    // Standardize message format
    const messages = data.messages.map((msg, index) => ({
      id: msg.id || `json_${index}`,
      timestamp: msg.timestamp || msg.ts || new Date().toISOString(),
      author: msg.author || msg.user || msg.sender || 'Unknown',
      authorId: msg.authorId || msg.userId || msg.senderId || msg.author || 'unknown',
      content: msg.content || msg.text || msg.message || '',
      type: msg.type || 'message',
      platform: msg.platform || 'json'
    }));
    
    return {
      messages,
      metadata: {
        platform: data.platform || 'json',
        dateRange: getDateRange(messages),
        participantCount: new Set(messages.map(m => m.authorId)).size,
        messageCount: messages.length,
        format: 'json',
        ...data.metadata
      },
      segments: data.segments || []
    };
  } catch (error) {
    throw new Error(`Failed to parse JSON conversation: ${error.message}`);
  }
}

/**
 * Calculate date range from messages
 */
function getDateRange(messages) {
  if (messages.length === 0) return null;
  
  const timestamps = messages
    .map(m => new Date(m.timestamp))
    .filter(d => !isNaN(d.getTime()))
    .sort((a, b) => a - b);
  
  if (timestamps.length === 0) return null;
  
  return {
    start: timestamps[0].toISOString(),
    end: timestamps[timestamps.length - 1].toISOString(),
    duration: timestamps[timestamps.length - 1] - timestamps[0]
  };
}

/**
 * Validate parsed conversation for quality
 */
function validateConversation(conversation) {
  const issues = [];
  
  if (!conversation.messages || conversation.messages.length === 0) {
    issues.push('No messages found');
  }
  
  if (conversation.messages.length < 3) {
    issues.push('Too few messages for meaningful analysis (minimum 3)');
  }
  
  const emptyMessages = conversation.messages.filter(m => !m.content.trim()).length;
  if (emptyMessages > conversation.messages.length * 0.5) {
    issues.push('High percentage of empty messages');
  }
  
  const uniqueAuthors = new Set(conversation.messages.map(m => m.authorId)).size;
  if (uniqueAuthors < 2) {
    issues.push('Conversation appears to be from single participant');
  }
  
  return {
    valid: issues.length === 0,
    issues,
    quality: calculateQualityScore(conversation)
  };
}

/**
 * Calculate conversation quality score (0-1)
 */
function calculateQualityScore(conversation) {
  let score = 0;
  
  // Message count (up to 0.3)
  const messageScore = Math.min(conversation.messages.length / 20, 1) * 0.3;
  score += messageScore;
  
  // Participant diversity (up to 0.3)
  const uniqueAuthors = new Set(conversation.messages.map(m => m.authorId)).size;
  const participantScore = Math.min(uniqueAuthors / 3, 1) * 0.3;
  score += participantScore;
  
  // Content richness (up to 0.2)
  const avgLength = conversation.messages.reduce((sum, m) => sum + m.content.length, 0) / conversation.messages.length;
  const contentScore = Math.min(avgLength / 50, 1) * 0.2;
  score += contentScore;
  
  // Platform metadata (up to 0.2)
  const metadataScore = conversation.metadata.dateRange ? 0.2 : 0.1;
  score += metadataScore;
  
  return Math.round(score * 100) / 100;
}

export { 
  parseConversationFile,
  detectFormat,
  validateConversation,
  calculateQualityScore
};