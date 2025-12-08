// @version 3.3.220
// TooLoo.ai Design Cortex - Index
// Central export for design intelligence capabilities

export * from './figma-bridge.js';
export * from './design-to-code.js';

// Re-export main instances
import { figmaBridge, FigmaBridge } from './figma-bridge.js';
import { designToCode, DesignToCodeEngine } from './design-to-code.js';

export { figmaBridge, designToCode, FigmaBridge, DesignToCodeEngine };

/**
 * Design Cortex Module
 * 
 * TooLoo's design intelligence capabilities:
 * 
 * - Figma Bridge: Connect to Figma API, parse designs, extract components
 * - Design to Code: Generate production-ready code from Figma designs
 * - Design Review: Analyze designs for accessibility and best practices
 * - Visual Diff: Create visual comparisons between design versions
 * - Living Design System: Maintain and evolve design tokens
 * 
 * Usage:
 * ```typescript
 * import { figmaBridge, designToCode } from './design/index.js';
 * 
 * // Initialize with Figma token
 * figmaBridge.initialize(process.env.FIGMA_ACCESS_TOKEN);
 * 
 * // Import a design
 * const context = await figmaBridge.importDesign('fileId');
 * 
 * // Generate code
 * const result = await designToCode.generate(context, {
 *   framework: 'react',
 *   styling: 'tailwind',
 *   typescript: true,
 *   includeTests: true,
 * });
 * ```
 */
