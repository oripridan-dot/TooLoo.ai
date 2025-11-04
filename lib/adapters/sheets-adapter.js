import fetch from 'node-fetch';

export class GoogleSheetsAdapter {
  constructor() {
    this.baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  }

  async execute(action, params, tokenData) {
    const { token } = tokenData;

    switch (action) {
      case 'append-values':
        return this.appendValues(token, params);
      case 'get-values':
        return this.getValues(token, params);
      case 'create-sheet':
        return this.createSheet(token, params);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  async appendValues(token, { spreadsheetId, range, values }) {
    if (!spreadsheetId || !range || !values) throw new Error('spreadsheetId, range, values required');
    const r = await fetch(
      `${this.baseUrl}/${spreadsheetId}/values/${encodeURIComponent(range)}:append`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values })
      }
    );
    if (!r.ok) throw new Error(`Sheets API error: ${r.status}`);
    return r.json();
  }

  async getValues(token, { spreadsheetId, range }) {
    if (!spreadsheetId || !range) throw new Error('spreadsheetId, range required');
    const r = await fetch(`${this.baseUrl}/${spreadsheetId}/values/${encodeURIComponent(range)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!r.ok) throw new Error(`Sheets API error: ${r.status}`);
    return r.json();
  }

  async createSheet(token, { spreadsheetId, title }) {
    if (!spreadsheetId || !title) throw new Error('spreadsheetId, title required');
    const r = await fetch(`${this.baseUrl}/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [{ addSheet: { properties: { title } } }]
      })
    });
    if (!r.ok) throw new Error(`Sheets API error: ${r.status}`);
    return r.json();
  }
}

export default new GoogleSheetsAdapter();
