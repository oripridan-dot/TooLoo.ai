export class DataModule {
  async analyze(data, opts = {}) {
    const rows = Array.isArray(data) ? data : this.parseData(data);
    const columns = this.extractColumns(rows);
    const stats = this.generateStats(rows, columns);
    const trends = this.detectTrends(rows, columns);
    return {
      ok: true,
      rows: rows.length,
      columns,
      stats,
      trends,
      charts: this.recommendCharts(rows, columns),
      anomalies: this.findAnomalies(rows, columns)
    };
  }

  parseData(input) {
    try {
      if (typeof input === 'string') {
        return JSON.parse(input);
      }
      return input;
    } catch {
      return [];
    }
  }

  extractColumns(rows) {
    if (!Array.isArray(rows) || rows.length === 0) return [];
    const firstRow = rows[0];
    if (typeof firstRow === 'object' && firstRow !== null) {
      return Object.keys(firstRow);
    }
    return [];
  }

  generateStats(rows, columns) {
    const stats = {};
    for (const col of columns) {
      const values = rows.map(r => r[col]).filter(v => typeof v === 'number');
      if (values.length === 0) continue;
      stats[col] = {
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        count: values.length
      };
    }
    return stats;
  }

  detectTrends(rows, columns) {
    const trends = [];
    for (const col of columns) {
      const values = rows.map(r => r[col]).filter(v => typeof v === 'number');
      if (values.length < 2) continue;
      const increasing = values[values.length - 1] > values[0];
      trends.push({ column: col, direction: increasing ? 'up' : 'down', strength: 'moderate' });
    }
    return trends;
  }

  recommendCharts(rows, columns) {
    const charts = [];
    if (columns.length > 0 && rows.length > 0) {
      if (columns.length >= 2) {
        charts.push({ type: 'scatter', x: columns[0], y: columns[1] });
      }
      charts.push({ type: 'bar', category: columns[0] });
      charts.push({ type: 'line', x: columns[0], y: columns.slice(1)[0] || columns[0] });
    }
    return charts;
  }

  findAnomalies(rows, columns) {
    const anomalies = [];
    const stats = this.generateStats(rows, columns);
    for (const col of columns) {
      if (!stats[col]) continue;
      const { avg } = stats[col];
      for (let i = 0; i < rows.length; i++) {
        const val = rows[i][col];
        if (typeof val === 'number' && Math.abs(val - avg) > avg) {
          anomalies.push({ row: i, column: col, value: val, type: 'outlier' });
        }
      }
    }
    return anomalies.slice(0, 5);
  }

  toCSV(rows) {
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const lines = [headers.join(',')];
    for (const row of rows) {
      const vals = headers.map(h => {
        const v = String(row[h] || '');
        if (v.includes(',') || v.includes('"')) return '"' + v.replace(/"/g, '""') + '"';
        return v;
      });
      lines.push(vals.join(','));
    }
    return lines.join('\n');
  }

  generateSQL(tableName, rows) {
    if (rows.length === 0) return '';
    const columns = Object.keys(rows[0]);
    const columnDef = columns.map(c => `${c} TEXT`).join(', ');
    const sql = [`CREATE TABLE ${tableName} (${columnDef});`];
    for (const row of rows) {
      const values = columns.map(c => `'${String(row[c] || '').replace(/'/g, "''")}'`).join(', ');
      sql.push(`INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values});`);
    }
    return sql.join('\n');
  }
}

export default new DataModule();
