// Design Integration Service - TooLoo's Design & Production Teammate
// Handles: Design system learning, UI component generation, design-to-code conversion
// Supports: Figma imports, design consistency checks, responsive design validation

import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import environmentHub from '../engine/environment-hub.js';
import FigmaAdapter from '../lib/adapters/figma-adapter.js';

class DesignIntegrationServer {
  constructor() {
    this.app = express();
    this.port = process.env.DESIGN_PORT || 3014;
    this.repoRoot = process.cwd();
    this.designDir = path.join(this.repoRoot, 'data', 'design-system');
    
    this.designSystem = {
      colors: {},
      typography: {},
      spacing: {},
      components: {},
      patterns: {},
      guidelines: {}
    };

    this.setupMiddleware();
    this.setupRoutes();
    this.initializeStorage();
    
    environmentHub.registerComponent('designIntegrationServer', this, [
      'design-system-management', 'ui-component-generation', 'design-to-code', 'design-validation'
    ]);
  }

  async initializeStorage() {
    try {
      await fs.mkdir(this.designDir, { recursive: true });
      await this.loadDesignSystem();
    } catch (err) {
      console.warn('⚠️ Design storage init failed:', err.message);
    }
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json({ limit: '100mb' }));
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        service: 'design-integration',
        status: 'healthy',
        designSystemLoaded: Object.keys(this.designSystem.colors).length > 0,
        capabilities: [
          'design-system-management',
          'ui-component-generation', 
          'design-to-code',
          'design-validation',
          'figma-integration'
        ]
      });
    });

    // Upload and learn design system
    this.app.post('/api/v1/design/learn-system', async (req, res) => {
      try {
        const { colors, typography, spacing, components, guidelines } = req.body;

        if (colors) this.designSystem.colors = colors;
        if (typography) this.designSystem.typography = typography;
        if (spacing) this.designSystem.spacing = spacing;
        if (components) this.designSystem.components = components;
        if (guidelines) this.designSystem.guidelines = guidelines;

        await this.saveDesignSystem();

        res.json({
          ok: true,
          message: 'Design system learned',
          system: {
            colors: Object.keys(this.designSystem.colors).length,
            typography: Object.keys(this.designSystem.typography).length,
            spacing: Object.keys(this.designSystem.spacing).length,
            components: Object.keys(this.designSystem.components).length
          }
        });
      } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
      }
    });

    // Get current design system
    this.app.get('/api/v1/design/system', (req, res) => {
      res.json({
        ok: true,
        system: this.designSystem
      });
    });

    // Generate UI component from description
    this.app.post('/api/v1/design/generate-component', async (req, res) => {
      try {
        const { name, description, variant = 'react', withTest = true } = req.body;

        const component = this.generateComponent(name, description, variant);
        const test = withTest ? this.generateComponentTest(name, component) : null;

        res.json({
          ok: true,
          component: {
            name,
            description,
            variant,
            code: component,
            testCode: test,
            designTokens: this.getRelevantTokens(description),
            accessibility: this.generateA11yChecklist(name)
          }
        });
      } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
      }
    });

    // Design-to-Code conversion
    this.app.post('/api/v1/design/convert-to-code', async (req, res) => {
      try {
        const { 
          designDescription, 
          targetFramework = 'react',
          responsive = true,
          includeStyles = true 
        } = req.body;

        const code = this.designToCode(
          designDescription, 
          targetFramework, 
          responsive,
          includeStyles
        );

        res.json({
          ok: true,
          code: {
            component: code.component,
            styles: code.styles,
            responsive: code.responsive,
            framework: targetFramework,
            designTokensUsed: code.tokensUsed
          }
        });
      } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
      }
    });

    // Design validation & QA
    this.app.post('/api/v1/design/validate', async (req, res) => {
      try {
        const { design, checks = ['accessibility', 'consistency', 'responsive'] } = req.body;

        const validation = {
          design,
          issues: [],
          suggestions: [],
          score: 0
        };

        if (checks.includes('accessibility')) {
          validation.issues.push(...this.checkAccessibility(design));
        }
        if (checks.includes('consistency')) {
          validation.issues.push(...this.checkConsistency(design));
        }
        if (checks.includes('responsive')) {
          validation.issues.push(...this.checkResponsive(design));
        }

        validation.score = Math.max(0, 100 - validation.issues.length * 10);

        res.json({
          ok: true,
          validation
        });
      } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
      }
    });

    // Figma import - Real Figma API integration
    this.app.post('/api/v1/design/import-figma', async (req, res) => {
      try {
        const { figmaUrl, apiToken } = req.body;

        if (!figmaUrl) {
          return res.status(400).json({ ok: false, error: 'figmaUrl required' });
        }

        // Use provided token or fallback to env token
        const token = apiToken || process.env.FIGMA_API_TOKEN;
        const adapter = new FigmaAdapter(token);

        // Validate token first
        const validation = await adapter.validateToken(token);
        if (!validation.valid) {
          return res.status(401).json({
            ok: false,
            error: 'Invalid or missing Figma API token',
            details: validation.error,
            hint: 'Provide apiToken in request body or set FIGMA_API_TOKEN in .env'
          });
        }

        // Import design system from Figma
        const result = await adapter.importDesignSystem(figmaUrl, token);

        // Learn the design system into this server
        this.designSystem = result.designSystem;
        await this.saveDesignSystem();

        res.json({
          ok: true,
          message: 'Design system imported from Figma',
          fileId: result.fileId,
          metadata: result.metadata,
          tokensImported: result.tokensCount,
          designSystem: {
            colors: Object.keys(result.designSystem.colors).length,
            typography: Object.keys(result.designSystem.typography).length,
            components: Object.keys(result.designSystem.components).length,
            spacing: Object.keys(result.designSystem.spacing).length
          },
          source: 'figma'
        });
      } catch (err) {
        console.error('Figma import error:', err.message);
        res.status(500).json({ ok: false, error: err.message });
      }
    });

    // Generate complete design system
    this.app.post('/api/v1/design/generate-system', async (req, res) => {
      try {
        const { brandName, brandColors, typography } = req.body;

        const system = {
          brand: brandName,
          colors: this.generateColorPalette(brandColors),
          typography: this.generateTypography(typography),
          spacing: this.generateSpacing(),
          components: this.generateDefaultComponents(),
          guidelines: this.generateGuidelines()
        };

        this.designSystem = system;
        await this.saveDesignSystem();

        res.json({
          ok: true,
          message: 'Design system generated',
          system: {
            brand: system.brand,
            elementsCount: Object.keys(system.components).length,
            colorCount: Object.keys(system.colors).length
          }
        });
      } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
      }
    });

    // Export design system as code
    this.app.get('/api/v1/design/export', async (req, res) => {
      try {
        const format = req.query.format || 'json'; // json, tailwind, scss, css-vars

        let exported;
        switch (format) {
        case 'tailwind':
          exported = this.exportAsTailwind();
          res.set('Content-Type', 'text/plain');
          break;
        case 'scss':
          exported = this.exportAsSCSS();
          res.set('Content-Type', 'text/x-scss');
          break;
        case 'css-vars':
          exported = this.exportAsCSVars();
          res.set('Content-Type', 'text/css');
          break;
        default:
          exported = JSON.stringify(this.designSystem, null, 2);
          res.set('Content-Type', 'application/json');
        }

        res.send(exported);
      } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
      }
    });
  }

  // Component Generation
  generateComponent(name, description, variant = 'react') {
    if (variant === 'react') {
      return `
import React, { useState } from 'react';

/**
 * ${name} Component
 * ${description}
 * 
 * Design System: Enforces brand colors, typography, and spacing
 */
export const ${this.toPascalCase(name)} = ({ 
  variant = 'primary',
  size = 'md',
  disabled = false,
  children,
  ...props 
}) => {
  return (
    <div 
      className={\`
        component-${name.toLowerCase()}
        variant-\${variant}
        size-\${size}
        \${disabled ? 'disabled' : ''}
      \`}
      role="button"
      aria-disabled={disabled}
      {...props}
    >
      {children}
    </div>
  );
};

export default ${this.toPascalCase(name)};
      `;
    }
    return `// ${name} component in ${variant}`;
  }

  generateComponentTest(name, component) {
    return `
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ${this.toPascalCase(name)} from './${name}';

describe('${this.toPascalCase(name)} Component', () => {
  test('renders with default props', () => {
    render(<${this.toPascalCase(name)} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  test('supports disabled state', () => {
    render(<${this.toPascalCase(name)} disabled />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
  });

  test('supports size variants', () => {
    render(<${this.toPascalCase(name)} size="lg" />);
    const element = screen.getByRole('button');
    expect(element).toHaveClass('size-lg');
  });

  test('applies custom className', () => {
    render(<${this.toPascalCase(name)} className="custom" />);
    expect(screen.getByRole('button')).toHaveClass('custom');
  });
});
    `;
  }

  designToCode(description, framework, responsive, includeStyles) {
    const component = `
/**
 * Generated from design: ${description}
 * Framework: ${framework}
 * Responsive: ${responsive}
 */

export const GeneratedComponent = (props) => {
  return (
    <div className="generated-component">
      {/* Design-generated content */}
      {/* Uses design tokens for colors, spacing, typography */}
      <h1>Generated Component</h1>
      <p>${description}</p>
    </div>
  );
};
    `;

    const styles = includeStyles ? `
/* Auto-generated styles from design */
.generated-component {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  color: var(--color-text);
  background: var(--color-background);
  border-radius: var(--border-radius);
}

.generated-component h1 {
  font-family: var(--font-heading);
  font-size: var(--font-size-lg);
  font-weight: 700;
}

.generated-component p {
  font-family: var(--font-body);
  font-size: var(--font-size-md);
  line-height: 1.5;
}

${responsive ? `
@media (max-width: 768px) {
  .generated-component {
    flex-direction: column;
    padding: var(--spacing-md);
    gap: var(--spacing-sm);
  }
}
` : ''}
    ` : '';

    return {
      component,
      styles,
      responsive,
      tokensUsed: ['spacing-md', 'spacing-lg', 'color-text', 'color-background', 'border-radius', 'font-heading', 'font-body']
    };
  }

  // Validation checks
  checkAccessibility(design) {
    const issues = [];
    if (!design.includes('aria-')) issues.push('Missing ARIA attributes');
    if (!design.includes('role=')) issues.push('Missing semantic roles');
    if (!design.includes('alt=')) issues.push('Missing alt text for images');
    return issues;
  }

  checkConsistency(design) {
    const issues = [];
    // Check if design uses design system colors
    const usesTokens = design.includes('var(--color') || design.includes('token');
    if (!usesTokens) issues.push('Not using design tokens - may violate brand consistency');
    return issues;
  }

  checkResponsive(design) {
    const issues = [];
    if (!design.includes('media') && !design.includes('@media')) {
      issues.push('No responsive breakpoints defined');
    }
    return issues;
  }

  // Export formats
  exportAsTailwind() {
    return `
module.exports = {
  theme: {
    extend: {
      colors: ${JSON.stringify(this.designSystem.colors, null, 2)},
      typography: ${JSON.stringify(this.designSystem.typography, null, 2)},
      spacing: ${JSON.stringify(this.designSystem.spacing, null, 2)},
    },
  },
};
    `;
  }

  exportAsSCSS() {
    let scss = '// TooLoo Design System - SCSS Variables\n\n';
    
    Object.entries(this.designSystem.colors).forEach(([name, value]) => {
      scss += `$color-${name}: ${value};\n`;
    });

    scss += '\n';
    Object.entries(this.designSystem.spacing).forEach(([name, value]) => {
      scss += `$spacing-${name}: ${value};\n`;
    });

    return scss;
  }

  exportAsCSVars() {
    let css = ':root {\n';
    
    Object.entries(this.designSystem.colors).forEach(([name, value]) => {
      css += `  --color-${name}: ${value};\n`;
    });

    Object.entries(this.designSystem.spacing).forEach(([name, value]) => {
      css += `  --spacing-${name}: ${value};\n`;
    });

    css += '}\n';
    return css;
  }

  // Helper methods
  generateColorPalette(brandColor) {
    return {
      primary: brandColor || '#3b82f6',
      secondary: '#64748b',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      text: '#1f2937',
      background: '#ffffff'
    };
  }

  generateTypography(typography) {
    return {
      heading: typography?.heading || 'Inter, sans-serif',
      body: typography?.body || 'Inter, sans-serif',
      mono: 'Fira Code, monospace'
    };
  }

  generateSpacing() {
    return {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px',
      '2xl': '48px'
    };
  }

  generateDefaultComponents() {
    return {
      button: { states: ['primary', 'secondary'], sizes: ['sm', 'md', 'lg'] },
      card: { withBorder: true, withShadow: true },
      input: { types: ['text', 'email', 'password'] },
      modal: { animated: true },
      dropdown: { multiselect: false }
    };
  }

  generateGuidelines() {
    return {
      spacing: 'Use spacing scale consistently',
      typography: 'Use defined font families and sizes',
      colors: 'Always use design tokens for colors',
      accessibility: 'Ensure WCAG 2.1 AA compliance',
      responsive: 'Mobile-first design approach'
    };
  }

  getRelevantTokens(description) {
    // Simple token matching based on description
    const tokens = [];
    if (description.toLowerCase().includes('primary')) tokens.push('color-primary');
    if (description.toLowerCase().includes('large')) tokens.push('spacing-lg', 'font-size-lg');
    if (description.toLowerCase().includes('small')) tokens.push('spacing-sm', 'font-size-sm');
    return tokens.length > 0 ? tokens : ['spacing-md', 'color-text'];
  }

  generateA11yChecklist(name) {
    return [
      '✓ Add aria-label for screen readers',
      '✓ Ensure keyboard navigation support',
      '✓ Maintain color contrast ratio > 4.5:1',
      '✓ Support focus states visually',
      '✓ Test with accessibility tools'
    ];
  }

  toPascalCase(str) {
    return str
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  async saveDesignSystem() {
    const path_str = path.join(this.designDir, 'system.json');
    await fs.writeFile(path_str, JSON.stringify(this.designSystem, null, 2));
  }

  async loadDesignSystem() {
    try {
      const path_str = path.join(this.designDir, 'system.json');
      const data = await fs.readFile(path_str, 'utf8');
      this.designSystem = JSON.parse(data);
    } catch (err) {
      // Use defaults if not found
    }
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`🎨 Design Integration Server running on port ${this.port}`);
      console.log('📐 Capabilities: Design System | UI Components | Design-to-Code | Validation');
      console.log('🚀 Ready to be your ultimate design & production teammate');
    });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new DesignIntegrationServer();
  server.start();
}

export { DesignIntegrationServer };
