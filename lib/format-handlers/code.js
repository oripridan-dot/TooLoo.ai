export default function code(content, opts = {}) {
  const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
  // Try to detect language from opts or first line shebang
  let lang = opts.language || '';
  const firstLine = (text.split('\n')[0]||'').trim();
  if (!lang && firstLine.startsWith('//') && firstLine.includes('language:')) {
    lang = firstLine.split('language:')[1].trim();
  }
  // Wrap in fenced code block
  return { ok: true, format: 'code', text: '```' + (lang||'') + '\n' + text + '\n```', language: lang };
}
