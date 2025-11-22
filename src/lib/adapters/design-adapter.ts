/**
 * Design Adapter - Figma integration
 * Enables design system workflows: list files, export assets, access components
 */

import { BaseAdapter } from './base-adapter.js';
import fetch from 'node-fetch';

export class DesignAdapter extends BaseAdapter {
  constructor(config = {}) {
    super('design', config);
    
    this.metadata.authentication = 'api-key';
    this.metadata.capabilities = [
      'list-files',
      'get-file',
      'get-components',
      'export-assets',
      'get-styles',
      'get-file-history'
    ];
    this.metadata.scopes = ['files:read', 'components:read'];
    
    this.figmaApiBase = 'https://api.figma.com/v1';
    this.figmaToken = config.figma_token;
    
    // Cache for API responses (1 hour expiry)
    this.cache = new Map();
    this.cacheExpiry = 3600000;
  }

  /**
   * Initialize Figma adapter
   */
  async initialize(config) {
    this.config = { ...this.config, ...config };
    this.figmaToken = this.config.figma_token;
    this.validateConfig();
    
    // Test connection
    try {
      await this.testConnection();
      this._markReady();
    } catch (err) {
      this._recordError(err);
      throw err;
    }
  }

  /**
   * Validate Figma configuration
   */
  validateConfig() {
    if (!this.figmaToken) {
      throw new Error('Design (Figma): API token required (figma_token)');
    }
  }

  /**
   * Test connection to Figma API
   */
  async testConnection() {
    try {
      const data = await this._call('/me');
      return data;
    } catch (err) {
      throw new Error(`Figma connection failed: ${err.message}`);
    }
  }

  /**
   * Make API call to Figma
   */
  async _call(endpoint, method = 'GET', body = null) {
    const url = `${this.figmaApiBase}${endpoint}`;
    const options = {
      method,
      headers: {
        'X-Figma-Token': this.figmaToken,
        'Content-Type': 'application/json'
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Figma API error ${response.status}: ${error.message || response.statusText}`);
      }
      
      return await response.json();
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get cached data or call API
   */
  async _cachedCall(cacheKey, endpoint, method = 'GET') {
    // Check cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() < cached.expiresAt) {
        return cached.data;
      } else {
        this.cache.delete(cacheKey);
      }
    }
    
    // Call API
    const data = await this._call(endpoint, method);
    
    // Cache result
    this.cache.set(cacheKey, {
      data,
      expiresAt: Date.now() + this.cacheExpiry
    });
    
    return data;
  }

  /**
   * List Figma files in a team
   */
  async listFiles(teamId) {
    const cacheKey = `files-${teamId}`;
    const data = await this._cachedCall(cacheKey, `/teams/${teamId}/files`);
    return data.files || [];
  }

  /**
   * Get file details and structure
   */
  async getFile(fileId, opts = {}) {
    const params = new URLSearchParams();
    if (opts.depth) params.append('depth', opts.depth);
    if (opts.geometry) params.append('geometry', opts.geometry);
    if (opts.pluginData) params.append('plugin_data', opts.pluginData);
    
    const endpoint = `/files/${fileId}${params.toString() ? '?' + params.toString() : ''}`;
    const cacheKey = `file-${fileId}-${JSON.stringify(opts)}`;
    
    return this._cachedCall(cacheKey, endpoint);
  }

  /**
   * Get file components library
   */
  async getComponents(fileId) {
    const cacheKey = `components-${fileId}`;
    const data = await this._cachedCall(cacheKey, `/files/${fileId}/components`);
    return data.components || {};
  }

  /**
   * Get file styles
   */
  async getStyles(fileId) {
    const cacheKey = `styles-${fileId}`;
    const data = await this._cachedCall(cacheKey, `/files/${fileId}/styles`);
    return data.styles || [];
  }

  /**
   * Export assets (images) from file
   */
  async exportAssets(fileId, nodeIds, opts = {}) {
    const format = opts.format || 'png';
    const scale = opts.scale || 1;
    const svgIncludeId = opts.svgIncludeId || true;
    const svgSimplifyStroke = opts.svgSimplifyStroke || false;
    
    const params = new URLSearchParams();
    params.append('ids', nodeIds.join(','));
    params.append('format', format);
    params.append('scale', scale);
    params.append('svg_include_id', svgIncludeId);
    params.append('svg_simplify_stroke', svgSimplifyStroke);
    
    try {
      const data = await this._call(`/files/${fileId}/export?${params.toString()}`);
      return data;
    } catch (err) {
      this._recordError(err);
      throw err;
    }
  }

  /**
   * Get file version history
   */
  async getFileHistory(fileId, opts = {}) {
    const params = new URLSearchParams();
    if (opts.limit) params.append('limit', opts.limit);
    
    const endpoint = `/files/${fileId}/versions${params.toString() ? '?' + params.toString() : ''}`;
    const cacheKey = `history-${fileId}`;
    
    return this._cachedCall(cacheKey, endpoint);
  }

  /**
   * Get connected services (for analytics)
   */
  async connect() {
    try {
      const user = await this.testConnection();
      return {
        status: 'connected',
        user: user.id,
        authenticated: true
      };
    } catch (err) {
      return {
        status: 'error',
        error: err.message
      };
    }
  }

  /**
   * Execute design actions
   */
  async executeAction(action, params) {
    try {
      switch (action) {
        case 'list-files':
          return await this.listFiles(params.teamId);
        
        case 'get-file':
          return await this.getFile(params.fileId, params.opts);
        
        case 'get-components':
          return await this.getComponents(params.fileId);
        
        case 'get-styles':
          return await this.getStyles(params.fileId);
        
        case 'export':
          return await this.exportAssets(params.fileId, params.nodeIds, params.opts);
        
        case 'history':
          return await this.getFileHistory(params.fileId, params.opts);
        
        default:
          throw new Error(`Unknown design action: ${action}`);
      }
    } catch (err) {
      this._recordError(err);
      throw err;
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

export default DesignAdapter;
