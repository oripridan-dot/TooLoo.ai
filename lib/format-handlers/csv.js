function toCsvArray(rows) {
  if (!Array.isArray(rows)) return null;
  const headers = Array.from(rows.reduce((acc, r) => { Object.keys(r||{}).forEach(k=>acc.add(k)); return acc; }, new Set()));
  const lines = [headers.join(',')];
  for (const r of rows) {
    const vals = headers.map(h => {
      const v = (r && r[h] != null) ? String(r[h]) : '';
      // escape quotes
      if (v.includes(',') || v.includes('"') || v.includes('\n')) return '"' + v.replace(/"/g, '""') + '"';
      return v;
    });
    lines.push(vals.join(','));
  }
  return lines.join('\n');
}

export default function csv(content /*, opts */) {
  try {
    let rows = content;
    if (typeof content === 'string') {
      // try JSON parse
      try { rows = JSON.parse(content); } catch { rows = null; }
    }
    const csvText = toCsvArray(rows) || String(content);
    return { ok: true, format: 'csv', text: csvText };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
