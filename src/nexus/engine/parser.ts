// @version 2.1.28
/**
 * Transcript Parser (Phase P1)
 * Deterministic, no external deps, ES module.
 *
 * Input: raw text transcript lines. Expected common format: "user: message" / "ai: message".
 * - Supports multi-line messages: lines without '<author>:' prefix are appended to previous message.
 * - Ignores blank/whitespace-only lines.
 * - Sampling: if message count exceeds maxMessages, truncates and flags metadata.truncated=true.
 * - Generates message ids m1..mN and preserves order.
 *
 * Output shape:
 * {
 *   messages: [{ id, author, content, index }],
 *   metadata: { lineCount, messageCount, charCount, truncated, reasons: [] }
 * }
 */

export function parse(rawText, options = {}) {
  const maxMessages = typeof options.maxMessages === 'number' ? options.maxMessages : 400;
  const lines = (rawText || '').replace(/\r\n?/g, '\n').split('\n');
  const messages = [];
  const meta = { lineCount: lines.length, messageCount: 0, charCount: 0, truncated: false, reasons: [] };

  if (!rawText || !rawText.trim()) {
    meta.reasons.push('EMPTY_INPUT');
    return { messages, metadata: meta };
  }

  const authorRegex = /^(user|ai)\s*:\s*(.*)$/i;
  let current = null;

  for (const lineRaw of lines) {
    const line = lineRaw.trim();
    if (!line) continue; // skip blank
    const match = line.match(authorRegex);
    if (match) {
      // start new message
      const author = match[1].toLowerCase();
      const content = match[2];
      current = { id: 'm' + (messages.length + 1), author, content, index: messages.length };
      messages.push(current);
      meta.charCount += content.length;
      if (messages.length >= maxMessages) {
        meta.truncated = true;
        meta.reasons.push('TRUNCATED_MAX_MESSAGES');
        break;
      }
    } else if (current) {
      // continuation of previous message
      current.content += ' ' + line;
      meta.charCount += line.length + 1;
    } else {
      // Orphan line without author before any message: treat as system message attributed to 'user'
      current = { id: 'm' + (messages.length + 1), author: 'user', content: line, index: messages.length };
      messages.push(current);
      meta.charCount += line.length;
    }
  }

  meta.messageCount = messages.length;
  return { messages, metadata: meta };
}

/** Simple helper to pretty print a summary (dev use) */
export function summarizeParse(result) {
  return {
    messageCount: result.metadata.messageCount,
    truncated: result.metadata.truncated,
    firstMessage: result.messages[0]?.content.slice(0, 60) || null,
    lastMessage: result.messages[result.messages.length - 1]?.content.slice(0, 60) || null
  };
}

// If invoked directly (manual debug):
if (import.meta.url === `file://${process.argv[1]}`) {
  const fs = await import('fs');
  const path = process.argv[2];
  if (!path) {
    console.error('Usage: node engine/parser.js <transcript.txt>');
    process.exit(1);
  }
  const raw = fs.readFileSync(path, 'utf8');
  const parsed = parse(raw, { maxMessages: 400 });
  console.log(JSON.stringify(summarizeParse(parsed), null, 2));
}
