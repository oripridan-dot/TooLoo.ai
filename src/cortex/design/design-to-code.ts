// @version 3.3.220
// TooLoo.ai Design Cortex - Design to Code Engine
// Transforms Figma designs into production-ready code

import { bus } from '../../core/event-bus.js';
import {
  FigmaNode,
  DesignContext,
  ComponentAnalysis,
  DesignToken,
  figmaBridge,
} from './figma-bridge.js';

/**
 * Code generation options
 */
export interface CodeGenOptions {
  framework: 'react' | 'vue' | 'svelte' | 'html';
  styling: 'tailwind' | 'css-modules' | 'styled-components' | 'emotion' | 'inline';
  typescript: boolean;
  componentLibrary?: 'shadcn' | 'radix' | 'chakra' | 'mantine' | 'custom';
  designSystemPath?: string;
  includeTests: boolean;
  includeStorybook: boolean;
}

/**
 * Generated component output
 */
export interface GeneratedComponent {
  name: string;
  code: string;
  types?: string;
  styles?: string;
  test?: string;
  story?: string;
  dependencies: string[];
  qualityScore: number;
  figmaSource: {
    fileId: string;
    nodeId: string;
    url: string;
  };
}

/**
 * Generation result
 */
export interface GenerationResult {
  components: GeneratedComponent[];
  sharedStyles?: string;
  designTokens?: string;
  indexFile?: string;
  totalQualityScore: number;
  warnings: GenerationWarning[];
  suggestions: GenerationSuggestion[];
}

export interface GenerationWarning {
  type: 'accessibility' | 'performance' | 'compatibility' | 'design-system';
  severity: 'low' | 'medium' | 'high';
  message: string;
  componentName?: string;
  autoFixAvailable: boolean;
}

export interface GenerationSuggestion {
  type: 'optimization' | 'best-practice' | 'alternative';
  message: string;
  componentName?: string;
  codeChange?: { before: string; after: string };
}

/**
 * Design to Code Engine
 * TooLoo's intelligent code generation from Figma designs
 */
export class DesignToCodeEngine {
  private static instance: DesignToCodeEngine;

  private constructor() {
    this.setupEventListeners();
  }

  static getInstance(): DesignToCodeEngine {
    if (!this.instance) {
      this.instance = new DesignToCodeEngine();
    }
    return this.instance;
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    bus.on('design:generate', async (event) => {
      try {
        const { context, options } = event.payload;
        const result = await this.generate(context, options);
        bus.publish('cortex', 'design:generated', { result });
      } catch (error) {
        bus.publish('cortex', 'design:error', { error: String(error) });
      }
    });
  }

  /**
   * Generate code from design context
   */
  async generate(
    context: DesignContext,
    options: CodeGenOptions
  ): Promise<GenerationResult> {
    const components: GeneratedComponent[] = [];
    const warnings: GenerationWarning[] = [];
    const suggestions: GenerationSuggestion[] = [];

    // Generate each component
    for (const [key, analysis] of context.componentMap) {
      const generated = await this.generateComponent(analysis, context, options);
      components.push(generated);

      // Collect warnings and suggestions
      warnings.push(...this.analyzeForWarnings(generated, analysis));
      suggestions.push(...this.generateSuggestions(generated, analysis));
    }

    // Generate shared resources
    const sharedStyles = this.generateSharedStyles(context.designTokens, options);
    const designTokens = this.generateDesignTokensFile(context.designTokens, options);
    const indexFile = this.generateIndexFile(components, options);

    // Calculate total quality score
    const totalQualityScore = components.length > 0
      ? components.reduce((sum, c) => sum + c.qualityScore, 0) / components.length
      : 0;

    return {
      components,
      sharedStyles,
      designTokens,
      indexFile,
      totalQualityScore,
      warnings,
      suggestions,
    };
  }

  /**
   * Generate a single component
   */
  private async generateComponent(
    analysis: ComponentAnalysis,
    context: DesignContext,
    options: CodeGenOptions
  ): Promise<GeneratedComponent> {
    const componentName = this.sanitizeComponentName(analysis.name);

    // Generate code based on framework
    const code = this.generateComponentCode(analysis, options, componentName);
    
    // Generate types if TypeScript
    const types = options.typescript
      ? this.generateTypeDefinitions(analysis, componentName)
      : undefined;

    // Generate styles based on styling option
    const styles = this.generateStyles(analysis, options, componentName);

    // Generate test if requested
    const test = options.includeTests
      ? this.generateTest(analysis, options, componentName)
      : undefined;

    // Generate Storybook story if requested
    const story = options.includeStorybook
      ? this.generateStory(analysis, options, componentName)
      : undefined;

    // Calculate quality score
    const qualityScore = this.calculateQualityScore(analysis, code);

    return {
      name: componentName,
      code,
      types,
      styles,
      test,
      story,
      dependencies: this.extractDependencies(options),
      qualityScore,
      figmaSource: {
        fileId: context.file.name, // Would need actual file ID
        nodeId: analysis.figmaId,
        url: `https://figma.com/file/${context.file.name}?node-id=${analysis.figmaId}`,
      },
    };
  }

  /**
   * Generate component code
   */
  private generateComponentCode(
    analysis: ComponentAnalysis,
    options: CodeGenOptions,
    componentName: string
  ): string {
    switch (options.framework) {
      case 'react':
        return this.generateReactComponent(analysis, options, componentName);
      case 'vue':
        return this.generateVueComponent(analysis, options, componentName);
      case 'svelte':
        return this.generateSvelteComponent(analysis, options, componentName);
      case 'html':
        return this.generateHtmlComponent(analysis, options, componentName);
      default:
        return this.generateReactComponent(analysis, options, componentName);
    }
  }

  /**
   * Generate React component
   */
  private generateReactComponent(
    analysis: ComponentAnalysis,
    options: CodeGenOptions,
    componentName: string
  ): string {
    const ts = options.typescript;
    const propsType = `${componentName}Props`;
    const { type, accessibility, props } = analysis;

    // Build imports
    const imports: string[] = ["import React from 'react';"];
    
    if (options.styling === 'styled-components') {
      imports.push("import styled from 'styled-components';");
    } else if (options.styling === 'emotion') {
      imports.push("import { css } from '@emotion/react';");
    } else if (options.styling === 'css-modules') {
      imports.push(`import styles from './${componentName}.module.css';`);
    }

    // Build props interface
    const propsInterface = ts ? this.buildPropsInterface(props, propsType) : '';

    // Build component body based on type
    const componentBody = this.buildComponentBody(type, options, analysis);

    // Build the component
    const typeAnnotation = ts ? `: React.FC<${propsType}>` : '';
    
    return `${imports.join('\n')}

${propsInterface}
/**
 * ${componentName} Component
 * Generated from Figma design by TooLoo Copilot
 * 
 * @component
 * @example
 * <${componentName} />
 */
export const ${componentName}${typeAnnotation} = ({
${props.map(p => `  ${p.name}${p.required ? '' : ` = ${JSON.stringify(p.defaultValue)}`},`).join('\n')}
}) => {
  return (
${componentBody}
  );
};

${componentName}.displayName = '${componentName}';

export default ${componentName};
`;
  }

  /**
   * Build props interface
   */
  private buildPropsInterface(props: ComponentAnalysis['props'], typeName: string): string {
    const propLines = props.map(prop => {
      const optional = prop.required ? '' : '?';
      return `  /** ${prop.description} */\n  ${prop.name}${optional}: ${prop.type};`;
    });

    return `export interface ${typeName} {
${propLines.join('\n')}
}
`;
  }

  /**
   * Build component body based on type
   */
  private buildComponentBody(
    type: ComponentAnalysis['type'],
    options: CodeGenOptions,
    analysis: ComponentAnalysis
  ): string {
    const className = this.getClassName(analysis.name, options);

    switch (type) {
      case 'button':
        return this.buildButtonBody(className, analysis, options);
      case 'input':
        return this.buildInputBody(className, analysis, options);
      case 'card':
        return this.buildCardBody(className, analysis, options);
      case 'navigation':
        return this.buildNavigationBody(className, analysis, options);
      default:
        return this.buildGenericBody(className, analysis, options);
    }
  }

  /**
   * Build button component body
   */
  private buildButtonBody(
    className: string,
    analysis: ComponentAnalysis,
    options: CodeGenOptions
  ): string {
    const { accessibility } = analysis;
    const tailwind = options.styling === 'tailwind';

    const baseClasses = tailwind
      ? 'px-6 py-3 font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
      : '';

    const variantClasses = tailwind
      ? `{variant === 'primary' ? 'bg-indigo-500 hover:bg-indigo-600 text-white focus:ring-indigo-500' : ''} {variant === 'secondary' ? 'bg-gray-200 hover:bg-gray-300 text-gray-900 focus:ring-gray-500' : ''} {variant === 'ghost' ? 'bg-transparent hover:bg-gray-100 text-gray-700 focus:ring-gray-500' : ''}`
      : '';

    return `    <button
      className={\`${baseClasses} ${variantClasses} \${className ?? ''}\`}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
      ${accessibility.ariaLabel ? `aria-label="${accessibility.ariaLabel}"` : ''}
    >
      {loading ? (
        <span className="inline-flex items-center">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading...
        </span>
      ) : (
        children
      )}
    </button>`;
  }

  /**
   * Build input component body
   */
  private buildInputBody(
    className: string,
    analysis: ComponentAnalysis,
    options: CodeGenOptions
  ): string {
    const tailwind = options.styling === 'tailwind';

    const inputClasses = tailwind
      ? 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors'
      : '';

    const labelClasses = tailwind
      ? 'block text-sm font-medium text-gray-700 mb-2'
      : '';

    return `    <div className={\`\${className ?? ''}\`}>
      {label && (
        <label htmlFor={id} className="${labelClasses}">
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="${inputClasses}"
        aria-describedby={error ? \`\${id}-error\` : undefined}
      />
      {error && (
        <p id={\`\${id}-error\`} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>`;
  }

  /**
   * Build card component body
   */
  private buildCardBody(
    className: string,
    analysis: ComponentAnalysis,
    options: CodeGenOptions
  ): string {
    const tailwind = options.styling === 'tailwind';

    const cardClasses = tailwind
      ? 'bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow'
      : '';

    return `    <div 
      className={\`${cardClasses} \${onClick ? 'cursor-pointer' : ''} \${className ?? ''}\`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {title && (
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>`;
  }

  /**
   * Build navigation component body
   */
  private buildNavigationBody(
    className: string,
    analysis: ComponentAnalysis,
    options: CodeGenOptions
  ): string {
    const tailwind = options.styling === 'tailwind';

    const navClasses = tailwind
      ? 'flex items-center space-x-8'
      : '';

    return `    <nav 
      className={\`${navClasses} \${className ?? ''}\`}
      aria-label={ariaLabel}
    >
      {children}
    </nav>`;
  }

  /**
   * Build generic component body
   */
  private buildGenericBody(
    className: string,
    analysis: ComponentAnalysis,
    options: CodeGenOptions
  ): string {
    return `    <div className={\`\${className ?? ''}\`}>
      {children}
    </div>`;
  }

  /**
   * Get className based on styling option
   */
  private getClassName(name: string, options: CodeGenOptions): string {
    switch (options.styling) {
      case 'css-modules':
        return `styles.${this.kebabCase(name)}`;
      case 'tailwind':
        return '';
      default:
        return this.kebabCase(name);
    }
  }

  /**
   * Generate Vue component
   */
  private generateVueComponent(
    analysis: ComponentAnalysis,
    options: CodeGenOptions,
    componentName: string
  ): string {
    // Simplified Vue generation
    return `<template>
  <div class="${this.kebabCase(componentName)}">
    <slot></slot>
  </div>
</template>

<script${options.typescript ? ' lang="ts"' : ''}>
export default {
  name: '${componentName}',
};
</script>

<style scoped>
.${this.kebabCase(componentName)} {
  /* TODO: Add styles from Figma */
}
</style>
`;
  }

  /**
   * Generate Svelte component
   */
  private generateSvelteComponent(
    analysis: ComponentAnalysis,
    options: CodeGenOptions,
    componentName: string
  ): string {
    return `<script${options.typescript ? ' lang="ts"' : ''}>
  // ${componentName} Component
  // Generated from Figma design by TooLoo Copilot
</script>

<div class="${this.kebabCase(componentName)}">
  <slot></slot>
</div>

<style>
  .${this.kebabCase(componentName)} {
    /* TODO: Add styles from Figma */
  }
</style>
`;
  }

  /**
   * Generate HTML component
   */
  private generateHtmlComponent(
    analysis: ComponentAnalysis,
    options: CodeGenOptions,
    componentName: string
  ): string {
    return `<!-- ${componentName} Component -->
<!-- Generated from Figma design by TooLoo Copilot -->

<div class="${this.kebabCase(componentName)}">
  <!-- Component content -->
</div>

<style>
  .${this.kebabCase(componentName)} {
    /* TODO: Add styles from Figma */
  }
</style>
`;
  }

  /**
   * Generate type definitions
   */
  private generateTypeDefinitions(
    analysis: ComponentAnalysis,
    componentName: string
  ): string {
    return this.buildPropsInterface(analysis.props, `${componentName}Props`);
  }

  /**
   * Generate styles
   */
  private generateStyles(
    analysis: ComponentAnalysis,
    options: CodeGenOptions,
    componentName: string
  ): string | undefined {
    if (options.styling === 'tailwind' || options.styling === 'inline') {
      return undefined;
    }

    const className = this.kebabCase(componentName);

    return `.${className} {
  /* Base styles */
  position: relative;
  display: flex;
  
  /* TODO: Add extracted styles from Figma */
}

.${className}:hover {
  /* Hover state */
}

.${className}:focus {
  /* Focus state */
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.${className}:disabled {
  /* Disabled state */
  opacity: 0.5;
  cursor: not-allowed;
}
`;
  }

  /**
   * Generate test file
   */
  private generateTest(
    analysis: ComponentAnalysis,
    options: CodeGenOptions,
    componentName: string
  ): string {
    const ts = options.typescript;

    return `import { render, screen, fireEvent } from '@testing-library/react';
import { ${componentName} } from './${componentName}';

describe('${componentName}', () => {
  it('renders without crashing', () => {
    render(<${componentName} />);
  });

  it('renders children correctly', () => {
    render(<${componentName}>Test Content</${componentName}>);
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<${componentName} className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  ${analysis.type === 'button' ? `
  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<${componentName} onClick={handleClick}>Click me</${componentName}>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<${componentName} disabled>Disabled</${componentName}>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
  ` : ''}
  
  // Accessibility tests
  it('meets accessibility requirements', () => {
    const { container } = render(<${componentName} />);
    // Note: Add axe-core for full accessibility testing
    expect(container.firstChild).toBeInTheDocument();
  });
});
`;
  }

  /**
   * Generate Storybook story
   */
  private generateStory(
    analysis: ComponentAnalysis,
    options: CodeGenOptions,
    componentName: string
  ): string {
    const ts = options.typescript;

    return `import type { Meta, StoryObj } from '@storybook/react';
import { ${componentName} } from './${componentName}';

const meta${ts ? ': Meta<typeof ' + componentName + '>' : ''} = {
  title: 'Components/${componentName}',
  component: ${componentName},
  tags: ['autodocs'],
  argTypes: {
    ${analysis.props.map(p => `${p.name}: { description: '${p.description}' },`).join('\n    ')}
  },
};

export default meta;
type Story = StoryObj<typeof ${componentName}>;

export const Default${ts ? ': Story' : ''} = {
  args: {
    ${analysis.props.filter(p => p.required).map(p => `${p.name}: ${JSON.stringify(p.defaultValue || 'Example')},`).join('\n    ')}
  },
};

${analysis.variants.map(v => `
export const ${this.sanitizeComponentName(v.name)}${ts ? ': Story' : ''} = {
  args: {
    ...Default.args,
    ${Object.entries(v.props).map(([k, val]) => `${k}: ${JSON.stringify(val)},`).join('\n    ')}
  },
};
`).join('')}
`;
  }

  /**
   * Generate shared styles from design tokens
   */
  private generateSharedStyles(
    tokens: DesignToken[],
    options: CodeGenOptions
  ): string {
    const colorTokens = tokens.filter(t => t.type === 'color');
    const spacingTokens = tokens.filter(t => t.type === 'spacing');
    const typographyTokens = tokens.filter(t => t.type === 'typography');

    return `:root {
  /* Colors */
${colorTokens.map(t => `  --color-${this.kebabCase(t.name)}: ${t.value};`).join('\n')}

  /* Spacing */
${spacingTokens.map(t => `  --spacing-${this.kebabCase(t.name)}: ${t.value};`).join('\n')}

  /* Typography */
${typographyTokens.map(t => `  --font-${this.kebabCase(t.name)}: ${typeof t.value === 'object' ? JSON.stringify(t.value) : t.value};`).join('\n')}
}
`;
  }

  /**
   * Generate design tokens file
   */
  private generateDesignTokensFile(
    tokens: DesignToken[],
    options: CodeGenOptions
  ): string {
    if (options.typescript) {
      return `// Design Tokens
// Generated from Figma by TooLoo Copilot

export const colors = {
${tokens.filter(t => t.type === 'color').map(t => `  ${this.camelCase(t.name)}: '${t.value}',`).join('\n')}
} as const;

export const spacing = {
${tokens.filter(t => t.type === 'spacing').map(t => `  ${this.camelCase(t.name)}: '${t.value}',`).join('\n')}
} as const;

export const typography = {
${tokens.filter(t => t.type === 'typography').map(t => `  ${this.camelCase(t.name)}: ${JSON.stringify(t.value)},`).join('\n')}
} as const;

export type ColorToken = keyof typeof colors;
export type SpacingToken = keyof typeof spacing;
export type TypographyToken = keyof typeof typography;
`;
    }

    return `// Design Tokens
// Generated from Figma by TooLoo Copilot

export const colors = {
${tokens.filter(t => t.type === 'color').map(t => `  ${this.camelCase(t.name)}: '${t.value}',`).join('\n')}
};

export const spacing = {
${tokens.filter(t => t.type === 'spacing').map(t => `  ${this.camelCase(t.name)}: '${t.value}',`).join('\n')}
};

export const typography = {
${tokens.filter(t => t.type === 'typography').map(t => `  ${this.camelCase(t.name)}: ${JSON.stringify(t.value)},`).join('\n')}
};
`;
  }

  /**
   * Generate index file
   */
  private generateIndexFile(
    components: GeneratedComponent[],
    options: CodeGenOptions
  ): string {
    return `// Components Index
// Generated from Figma by TooLoo Copilot

${components.map(c => `export { ${c.name} } from './${c.name}';`).join('\n')}
${options.typescript ? components.map(c => `export type { ${c.name}Props } from './${c.name}';`).join('\n') : ''}
`;
  }

  /**
   * Extract dependencies
   */
  private extractDependencies(options: CodeGenOptions): string[] {
    const deps: string[] = ['react'];

    if (options.typescript) deps.push('typescript', '@types/react');
    if (options.styling === 'styled-components') deps.push('styled-components');
    if (options.styling === 'emotion') deps.push('@emotion/react', '@emotion/styled');
    if (options.styling === 'tailwind') deps.push('tailwindcss');
    if (options.componentLibrary === 'shadcn') deps.push('@shadcn/ui');
    if (options.componentLibrary === 'radix') deps.push('@radix-ui/react-primitive');
    if (options.componentLibrary === 'chakra') deps.push('@chakra-ui/react');
    if (options.includeTests) deps.push('@testing-library/react', 'jest');
    if (options.includeStorybook) deps.push('@storybook/react');

    return deps;
  }

  /**
   * Analyze for warnings
   */
  private analyzeForWarnings(
    generated: GeneratedComponent,
    analysis: ComponentAnalysis
  ): GenerationWarning[] {
    const warnings: GenerationWarning[] = [];

    // Check accessibility - warn if keyboard navigation is disabled
    if (!analysis.accessibility.keyboardNavigation) {
      warnings.push({
        type: 'accessibility',
        severity: 'medium',
        message: `Component ${analysis.name} may need keyboard navigation support.`,
        componentName: generated.name,
        autoFixAvailable: false,
      });
    }

    // Warn if no aria-label for interactive components
    if (analysis.type === 'button' && !analysis.accessibility.ariaLabel) {
      warnings.push({
        type: 'accessibility',
        severity: 'low',
        message: `Consider adding aria-label for better accessibility.`,
        componentName: generated.name,
        autoFixAvailable: true,
      });
    }

    return warnings;
  }

  /**
   * Generate suggestions
   */
  private generateSuggestions(
    generated: GeneratedComponent,
    analysis: ComponentAnalysis
  ): GenerationSuggestion[] {
    const suggestions: GenerationSuggestion[] = [];

    if (analysis.type === 'button' && !analysis.props.some(p => p.name === 'loading')) {
      suggestions.push({
        type: 'best-practice',
        message: 'Consider adding a loading state for better UX during async operations',
        componentName: generated.name,
      });
    }

    return suggestions;
  }

  /**
   * Calculate quality score
   */
  private calculateQualityScore(analysis: ComponentAnalysis, code: string): number {
    let score = 100;

    // Deduct for missing accessibility
    if (!analysis.accessibility.ariaLabel) score -= 5;
    if (!analysis.accessibility.keyboardNavigation) score -= 10;

    // Deduct for complexity
    const lines = code.split('\n').length;
    if (lines > 100) score -= 10;
    if (lines > 200) score -= 20;

    return Math.max(0, Math.min(100, score)) / 100;
  }

  /**
   * Utility: Sanitize component name
   */
  private sanitizeComponentName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Utility: Convert to kebab-case
   */
  private kebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  /**
   * Utility: Convert to camelCase
   */
  private camelCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
      .replace(/^[A-Z]/, c => c.toLowerCase());
  }
}

// Export singleton
export const designToCode = DesignToCodeEngine.getInstance();
