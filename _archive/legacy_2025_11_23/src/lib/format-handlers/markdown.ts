export default function markdown(content /*, opts */) {
  // Return markdown as-is with minor normalization
  const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
  return { ok: true, format: 'markdown', text };
}
