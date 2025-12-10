// @version 3.3.374
// TooLoo.ai Visual Cortex 2.0 Module Index
// Re-exports all Visual Cortex 2.0 functionality
// v3.3.374: Added multi-format visual artifacts support

export {
  VisualCortex2,
  visualCortex2,
  animationEngine,
  dataVizEngine,
  svgGenerationEngine,
  type DesignTokens,
  type DesignSystem,
  type ComponentSpec,
  type VisualCortex2Request,
  type VisualCortex2Response,
  type VisualCortex2RequestType,
  type DataPoint,
  type DataSeries,
  type ChartOptions,
} from './visual-cortex-2.js';

export {
  VisualArtifactOptimizer,
  visualOptimizer,
  LRUCache,
  PRECOMPUTED_TEMPLATES,
  type OptimizationOptions,
  type GenerationRequest,
  type GenerationResult,
} from './visual-artifact-optimizer.js';

// v3.3.374: Multi-format visual artifacts
export {
  type VisualFormat,
  type VisualArtifact,
  type VisualMetadata,
  type VisualStyle,
  type SVGContent,
  type ASCIIContent,
  type MarkdownTableContent,
  type MermaidContent,
  type ChartContent,
  type EmojiContent,
  type CodeArtContent,
  type TerminalContent,
  type MathContent,
  type GradientCardContent,
  type ComparisonContent,
  type TimelineContent,
  type TreeContent,
  type TreeNode,
  type MatrixContent,
  type StatsCardContent,
  FORMAT_CAPABILITIES,
  FORMAT_KEYWORDS,
  suggestFormat,
  createVisualArtifact,
  generateASCIIBox,
  generateASCIITree,
  generateASCIIProgress,
  generateEmojiStatus,
  generateEmojiScene,
} from './visual-formats.js';

export { SVGBuilder } from '../creative/svg-generation-engine.js';

// Re-export the singleton for default import
import { visualCortex2 as vc2 } from './visual-cortex-2.js';
export default vc2;