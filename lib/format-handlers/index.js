import markdown from './markdown.js';
import code from './code.js';
import jsonHandler from './json.js';
import csv from './csv.js';

export { markdown, code, jsonHandler, csv };

export function convert(format, content, opts = {}) {
  const fmt = (format || '').toLowerCase();
  switch (fmt) {
    case 'markdown':
    case 'md':
      return markdown(content, opts);
    case 'code':
    case 'codeblock':
      return code(content, opts);
    case 'json':
      return jsonHandler(content, opts);
    case 'csv':
      return csv(content, opts);
    default:
      // default: return as plain text
      return { ok: true, format: 'text', text: String(content) };
  }
}
