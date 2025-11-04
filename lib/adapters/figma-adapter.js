/**
 * Figma API Adapter
 * Interfaces with Figma REST API to extract design tokens, components, and styles
 * Supports: Files, Components, Styles, Variables, Assets
 */

import fetch from 'node-fetch';

export class FigmaAdapter {
  constructor(apiToken) {
    this.apiToken = apiToken || process.env.FIGMA_API_TOKEN;
    this.baseUrl = 'https://api.figma.com/v1';
    if (!this.apiToken) {
      console.warn('⚠️ Figma API token not configured. Set FIGMA_API_TOKEN in .env');
    }
  }

  /**
   * Extract file ID from Figma URL
   * Supports: /file/{FILE_ID}/... and figma.com/file/FILE_ID
   */
  extractFileId(figmaUrl) {
    if (!figmaUrl) return null;
    const match = figmaUrl.match(/\/file\/([a-z0-9]+)/i);
    return match ? match[1] : null;
  }

  /**
   * Fetch file metadata and structure from Figma API
   */
  async getFileMetadata(fileId) {
    if (!this.apiToken) throw new Error('Figma API token not configured');
    if (!fileId) throw new Error('File ID required');

    try {
      const res = await fetch(`${this.baseUrl}/files/${fileId}`, {
        headers: { 'X-FIGMA-TOKEN': this.apiToken }
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(`Figma API error ${res.status}: ${JSON.stringify(err)}`);
      }

      const data = await res.json();
      return {
        id: data.id,
        name: data.name,
        version: data.version,
        role: data.role,
        editorType: data.editorType,
        lastModified: data.lastModified,
        thumbnailUrl: data.thumbnailUrl,
        pages: data.document?.children?.map(page => ({ id: page.id, name: page.name })) || []
      };
    } catch (err) {
      throw new Error(`Failed to fetch Figma file: ${err.message}`);
    }
  }

  /**
   * Fetch design tokens (colors, typography, effects, etc.) from Figma
   */
  async getDesignTokens(fileId) {
    if (!this.apiToken) throw new Error('Figma API token not configured');
    if (!fileId) throw new Error('File ID required');

    try {
      // Fetch styles from the file
      const res = await fetch(`${this.baseUrl}/files/${fileId}/styles`, {
        headers: { 'X-FIGMA-TOKEN': this.apiToken }
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch styles: ${res.status}`);
      }

      const data = await res.json();
      const styles = data.meta?.styles || [];

      // Organize styles by type
      const tokens = {
        colors: [],
        typography: [],
        effects: [],
        grids: []
      };

      styles.forEach(style => {
        if (style.styleType === 'FILL' || style.styleType === 'STROKE') {
          tokens.colors.push({
            name: style.name,
            description: style.description,
            id: style.id,
            type: style.styleType
          });
        } else if (style.styleType === 'TEXT') {
          tokens.typography.push({
            name: style.name,
            description: style.description,
            id: style.id,
            type: style.styleType
          });
        } else if (style.styleType === 'EFFECT') {
          tokens.effects.push({
            name: style.name,
            description: style.description,
            id: style.id,
            type: style.styleType
          });
        } else if (style.styleType === 'GRID') {
          tokens.grids.push({
            name: style.name,
            description: style.description,
            id: style.id,
            type: style.styleType
          });
        }
      });

      return tokens;
    } catch (err) {
      throw new Error(`Failed to extract design tokens: ${err.message}`);
    }
  }

  /**
   * Fetch components from Figma file
   */
  async getComponents(fileId) {
    if (!this.apiToken) throw new Error('Figma API token not configured');
    if (!fileId) throw new Error('File ID required');

    try {
      const res = await fetch(`${this.baseUrl}/files/${fileId}/components`, {
        headers: { 'X-FIGMA-TOKEN': this.apiToken }
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch components: ${res.status}`);
      }

      const data = await res.json();
      const components = data.meta?.components || [];

      // Extract component info
      return components.map(comp => ({
        id: comp.id,
        name: comp.name,
        description: comp.description,
        createdAt: comp.created_at,
        updatedAt: comp.updated_at,
        remote: comp.remote,
        documentationLinks: comp.documentation_links || []
      }));
    } catch (err) {
      throw new Error(`Failed to extract components: ${err.message}`);
    }
  }

  /**
   * Fetch detailed node information (including styles, colors, typography)
   */
  async getNodeWithChildren(fileId, nodeId) {
    if (!this.apiToken) throw new Error('Figma API token not configured');
    if (!fileId || !nodeId) throw new Error('File ID and Node ID required');

    try {
      const res = await fetch(`${this.baseUrl}/files/${fileId}/nodes?ids=${nodeId}`, {
        headers: { 'X-FIGMA-TOKEN': this.apiToken }
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch node: ${res.status}`);
      }

      const data = await res.json();
      return data.nodes?.[nodeId] || null;
    } catch (err) {
      throw new Error(`Failed to fetch node details: ${err.message}`);
    }
  }

  /**
   * Parse design tokens into TooLoo design system format
   */
  parseTokensToDesignSystem(figmaTokens, componentsList) {
    const designSystem = {
      colors: {},
      typography: {},
      spacing: {},
      components: {},
      patterns: {},
      guidelines: {}
    };

    // Parse color tokens
    if (figmaTokens.colors && figmaTokens.colors.length > 0) {
      figmaTokens.colors.forEach((token) => {
        const slug = token.name.toLowerCase().replace(/\s+/g, '-');
        designSystem.colors[slug] = {
          id: token.id,
          name: token.name,
          description: token.description || '',
          source: 'figma',
          tokenType: token.type
        };
      });
    }

    // Parse typography tokens
    if (figmaTokens.typography && figmaTokens.typography.length > 0) {
      figmaTokens.typography.forEach((token) => {
        const slug = token.name.toLowerCase().replace(/\s+/g, '-');
        designSystem.typography[slug] = {
          id: token.id,
          name: token.name,
          description: token.description || '',
          source: 'figma',
          tokenType: token.type
        };
      });
    }

    // Add components
    if (componentsList && componentsList.length > 0) {
      componentsList.forEach(comp => {
        const slug = comp.name.toLowerCase().replace(/\s+/g, '-');
        designSystem.components[slug] = {
          id: comp.id,
          name: comp.name,
          description: comp.description || '',
          source: 'figma',
          documentationLinks: comp.documentationLinks || []
        };
      });
    }

    // Default spacing if not provided
    designSystem.spacing = {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px',
      '2xl': '48px'
    };

    // Guidelines
    designSystem.guidelines = {
      source: 'figma',
      importedAt: new Date().toISOString(),
      design_approach: 'Imported from Figma design system',
      spacing: 'Use spacing scale consistently',
      typography: 'Use defined font families and sizes',
      colors: 'Always use design tokens for colors',
      accessibility: 'Ensure WCAG 2.1 AA compliance',
      responsive: 'Mobile-first design approach'
    };

    return designSystem;
  }

  /**
   * Full import flow: fetch metadata, tokens, and components
   */
  async importDesignSystem(figmaUrl, apiToken = null) {
    if (apiToken) {
      this.apiToken = apiToken;
    }

    if (!this.apiToken) {
      throw new Error('Figma API token required for import');
    }

    const fileId = this.extractFileId(figmaUrl);
    if (!fileId) {
      throw new Error('Invalid Figma URL. Expected format: https://figma.com/file/{FILE_ID}');
    }

    try {
      // Fetch all data in parallel
      const [metadata, tokens, components] = await Promise.all([
        this.getFileMetadata(fileId),
        this.getDesignTokens(fileId),
        this.getComponents(fileId)
      ]);

      // Parse into TooLoo design system format
      const designSystem = this.parseTokensToDesignSystem(tokens, components);

      return {
        ok: true,
        fileId,
        metadata,
        designSystem,
        tokensCount: {
          colors: tokens.colors?.length || 0,
          typography: tokens.typography?.length || 0,
          effects: tokens.effects?.length || 0,
          grids: tokens.grids?.length || 0,
          components: components?.length || 0
        },
        source: 'figma'
      };
    } catch (err) {
      throw new Error(`Design system import failed: ${err.message}`);
    }
  }

  /**
   * Validate Figma API token
   */
  async validateToken(token = null) {
    const testToken = token || this.apiToken;
    if (!testToken) {
      return { ok: false, valid: false, error: 'No token provided' };
    }

    try {
      const res = await fetch(`${this.baseUrl}/me`, {
        headers: { 'X-FIGMA-TOKEN': testToken }
      });

      if (res.ok) {
        const data = await res.json();
        return { ok: true, valid: true, userId: data.id, email: data.email };
      } else {
        return { ok: false, valid: false, error: `HTTP ${res.status}` };
      }
    } catch (err) {
      return { ok: false, valid: false, error: err.message };
    }
  }
}

export default new FigmaAdapter();
