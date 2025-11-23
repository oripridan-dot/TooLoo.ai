import fetch from 'node-fetch';

export class NotionAdapter {
  constructor() {
    this.baseUrl = 'https://api.notion.com/v1';
  }

  async execute(action, params, tokenData) {
    const { token } = tokenData;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    };

    switch (action) {
      case 'append-block':
        return this.appendBlock(headers, params);
      case 'get-databases':
        return this.getDatabases(headers);
      case 'create-page':
        return this.createPage(headers, params);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  async getDatabases(headers) {
    const r = await fetch(`${this.baseUrl}/search?filter={"property":"object","value":"database"}`, {
      headers,
      method: 'POST'
    });
    if (!r.ok) throw new Error(`Notion API error: ${r.status}`);
    return r.json();
  }

  async createPage(headers, { parent_id, properties }) {
    if (!parent_id || !properties) throw new Error('parent_id, properties required');
    const r = await fetch(`${this.baseUrl}/pages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ parent: { database_id: parent_id }, properties })
    });
    if (!r.ok) throw new Error(`Notion API error: ${r.status}`);
    return r.json();
  }

  async appendBlock(headers, { block_id, children }) {
    if (!block_id || !children) throw new Error('block_id, children required');
    const r = await fetch(`${this.baseUrl}/blocks/${block_id}/children`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ children })
    });
    if (!r.ok) throw new Error(`Notion API error: ${r.status}`);
    return r.json();
  }
}

export default new NotionAdapter();
