/**
 * Figma Adapter - Handles Figma API integration and design token extraction
 * Extracts colors, typography, spacing, shadows, and components from Figma files
 */

import https from 'https';

export class FigmaAdapter {
  constructor(apiToken) {
    if (!apiToken) {
      throw new Error('Figma API token is required');
    }
    this.apiToken = apiToken;
    this.baseUrl = 'https://api.figma.com/v1';
  }

  /**
   * Extract file key from Figma URL
   * Supports formats:
   * - https://figma.com/file/ABC123XYZ/MyDesignSystem
   * - https://www.figma.com/file/ABC123XYZ/MyDesignSystem
   * - https://figma.com/design/ABC123XYZ/MyDesignSystem
   */
  extractFileKey(figmaUrl) {
    const match = figmaUrl.match(/figma\.com\/(file|design)\/([A-Za-z0-9]+)/);
    if (!match) {
      throw new Error('Invalid Figma URL format. Expected: https://figma.com/file/FILE_KEY/...');
    }
    return match[2];
  }

  /**
   * Make authenticated request to Figma API
   */
  async makeRequest(path) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.figma.com',
        path,
        method: 'GET',
        headers: {
          'X-Figma-Token': this.apiToken,
        },
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error(`Failed to parse Figma API response: ${e.message}`));
            }
          } else if (res.statusCode === 403) {
            reject(new Error('Invalid Figma API token or insufficient permissions'));
          } else if (res.statusCode === 404) {
            reject(new Error('Figma file not found. Check the URL and permissions.'));
          } else {
            reject(new Error(`Figma API error (${res.statusCode}): ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Network error connecting to Figma API: ${error.message}`));
      });

      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Figma API request timeout (30s)'));
      });

      req.end();
    });
  }

  /**
   * Fetch file structure from Figma
   */
  async fetchFile(fileKey) {
    const path = `/v1/files/${fileKey}`;
    return await this.makeRequest(path);
  }

  /**
   * Extract color from Figma paint object
   */
  extractColor(paint) {
    if (!paint || paint.type !== 'SOLID') {
      return null;
    }

    const { r, g, b, a = 1 } = paint.color;
    
    // Convert to hex if fully opaque
    if (a === 1) {
      const toHex = (val) => Math.round(val * 255).toString(16).padStart(2, '0');
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
    }
    
    // Return rgba for transparent colors
    return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
  }

  /**
   * Extract design tokens from Figma file
   */
  extractDesignTokens(fileData) {
    const tokens = {
      colors: {},
      typography: {},
      spacing: {},
      shadows: {},
    };

    // Helper to traverse nodes recursively
    const traverseNode = (node, depth = 0) => {
      if (!node) return;

      // Extract colors from fills
      if (node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
        const color = this.extractColor(node.fills[0]);
        if (color && node.name) {
          // Use node name as color key (clean up the name)
          const colorKey = node.name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
          tokens.colors[colorKey] = color;
        }
      }

      // Extract typography from text nodes
      if (node.type === 'TEXT' && node.style) {
        const { fontSize, fontWeight, fontFamily, lineHeightPx } = node.style;
        const typographyKey = node.name.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        
        tokens.typography[typographyKey] = {
          fontSize: fontSize || 16,
          fontWeight: fontWeight || 400,
          fontFamily: fontFamily || 'sans-serif',
          lineHeight: lineHeightPx || Math.round(fontSize * 1.5),
        };
      }

      // Extract spacing from layout constraints
      if (node.layoutMode === 'HORIZONTAL' || node.layoutMode === 'VERTICAL') {
        const spacing = node.itemSpacing || node.paddingLeft || node.paddingTop;
        if (spacing && spacing > 0) {
          const spacingKey = `spacing-${spacing}`;
          tokens.spacing[spacingKey] = spacing;
        }
      }

      // Extract shadows from effects
      if (node.effects && Array.isArray(node.effects)) {
        node.effects.forEach((effect) => {
          if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
            const shadowKey = node.name?.toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '') || `shadow-${Object.keys(tokens.shadows).length}`;
            
            tokens.shadows[shadowKey] = {
              offsetX: effect.offset?.x || 0,
              offsetY: effect.offset?.y || 0,
              blur: effect.radius || 0,
              spread: effect.spread || 0,
              color: this.extractColor(effect.color) || 'rgba(0,0,0,0.1)',
              type: effect.type === 'INNER_SHADOW' ? 'inset' : 'drop',
            };
          }
        });
      }

      // Recurse into children
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(child => traverseNode(child, depth + 1));
      }
    };

    // Start traversal from document root
    if (fileData.document) {
      traverseNode(fileData.document);
    }

    // Normalize spacing values (common scales)
    const normalizedSpacing = {};
    const commonSizes = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
    const spacingValues = Object.values(tokens.spacing).sort((a, b) => a - b);
    const uniqueSpacing = [...new Set(spacingValues)];
    
    uniqueSpacing.forEach((value, index) => {
      if (index < commonSizes.length) {
        normalizedSpacing[commonSizes[index]] = value;
      } else {
        normalizedSpacing[`spacing-${value}`] = value;
      }
    });
    
    tokens.spacing = Object.keys(normalizedSpacing).length > 0 
      ? normalizedSpacing 
      : { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 }; // defaults

    return tokens;
  }

  /**
   * Extract components from Figma file
   */
  extractComponents(fileData) {
    const components = [];
    const componentMap = new Map();

    // Helper to find component definitions and instances
    const traverseNode = (node) => {
      if (!node) return;

      // Component definition (master component)
      if (node.type === 'COMPONENT') {
        const component = {
          id: node.id,
          name: node.name,
          description: node.description || '',
          instances: [],
          properties: {
            width: node.absoluteBoundingBox?.width || 0,
            height: node.absoluteBoundingBox?.height || 0,
          },
        };
        componentMap.set(node.id, component);
        components.push(component);
      }

      // Component instance
      if (node.type === 'INSTANCE' && node.componentId) {
        const component = componentMap.get(node.componentId);
        if (component) {
          component.instances.push({
            id: node.id,
            name: node.name,
            position: {
              x: node.absoluteBoundingBox?.x || 0,
              y: node.absoluteBoundingBox?.y || 0,
            },
          });
        }
      }

      // Recurse into children
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(traverseNode);
      }
    };

    // Start traversal
    if (fileData.document) {
      traverseNode(fileData.document);
    }

    return components;
  }

  /**
   * Import and process Figma design system
   */
  async importDesignSystem(figmaUrl) {
    try {
      const fileKey = this.extractFileKey(figmaUrl);
      const fileData = await this.fetchFile(fileKey);

      const tokens = this.extractDesignTokens(fileData);
      const components = this.extractComponents(fileData);

      return {
        ok: true,
        design_system: {
          ...tokens,
          components,
        },
        metadata: {
          fileName: fileData.name,
          fileKey,
          lastModified: fileData.lastModified,
          version: fileData.version,
        },
      };
    } catch (error) {
      return {
        ok: false,
        error: error.message,
      };
    }
  }
}

export default FigmaAdapter;
