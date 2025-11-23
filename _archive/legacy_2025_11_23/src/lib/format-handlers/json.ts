export default function jsonHandler(content /*, opts */) {
  try {
    if (typeof content === 'string') {
      // try parse
      const parsed = JSON.parse(content);
      return { ok: true, format: 'json', text: JSON.stringify(parsed, null, 2), json: parsed };
    }
    return { ok: true, format: 'json', text: JSON.stringify(content, null, 2), json: content };
  } catch (e) {
    // fallback: return as text
    return { ok: false, error: 'invalid json', raw: String(content) };
  }
}
