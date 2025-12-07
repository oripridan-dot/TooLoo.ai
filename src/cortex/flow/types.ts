// @version 3.3.215
// TooLoo Flow System - Core Types
// The unified thinking and creation model for TooLoo.ai

// ============================================================================
// FLOW SESSION - A complete project journey
// ============================================================================

export interface FlowSession {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  
  // Project phase
  phase: FlowPhase;
  
  // The thinking tree
  tree: ThinkingTree;
  
  // Accumulated decisions
  decisions: Decision[];
  
  // Extended knowledge from all interactions
  knowledge: ExtendedKnowledge;
  
  // Generated artifacts
  artifacts: FlowArtifact[];
  
  // Readiness across dimensions
  readiness: DimensionReadiness[];
  
  // Git integration (optional)
  git?: GitContext;
  
  // QA handoff status
  qa?: QAHandoff;
  
  // Session metadata
  metadata: {
    totalMessages: number;
    totalOptions: number;
    collectedCount: number;
    dismissedCount: number;
    branchCount: number;
  };
}

export type FlowPhase = 
  | 'discover'    // Understanding what to build
  | 'explore'     // Exploring dimensions and options
  | 'refine'      // Polishing collected items
  | 'build'       // Generating production outputs
  | 'validate'    // QA team validation
  | 'ship';       // Deployment

// ============================================================================
// THINKING TREE - The exploration structure
// ============================================================================

export interface ThinkingTree {
  root: ThinkingNode;
  currentPath: string[];  // IDs from root to current focus
}

export interface ThinkingNode {
  id: string;
  type: 'prompt' | 'dimension' | 'option' | 'branch';
  
  // Content
  content: NodeContent;
  
  // Conversation in this node
  messages: FlowMessage[];
  
  // Child explorations
  children: ThinkingNode[];
  
  // Status
  status: 'active' | 'collected' | 'dismissed' | 'archived';
  
  // If collected, the decision
  decision?: Decision;
  
  // Metadata
  createdAt: number;
  updatedAt: number;
}

export type NodeContent = 
  | { type: 'prompt'; text: string }
  | { type: 'dimension'; dimension: ThinkingDimension }
  | { type: 'option'; option: FlowOption }
  | { type: 'branch'; label: string; reason: string };

// ============================================================================
// THINKING DIMENSIONS - Multi-disciplinary awareness
// ============================================================================

export interface ThinkingDimension {
  id: string;
  type: DimensionType;
  
  // Display
  icon: string;
  title: string;
  question: string;           // The core question this dimension asks
  
  // Quick options (conversation starters)
  quickOptions: QuickOption[];
  
  // Relationships to other dimensions
  affects: DimensionRelation[];
  
  // Status
  status: DimensionStatus;
  confidence: number;         // 0-1
}

export type DimensionType =
  | 'design'        // Visual, UX, brand identity
  | 'technical'     // Architecture, stack, infrastructure
  | 'user'          // Who, personas, journeys
  | 'business'      // Revenue, market, positioning
  | 'ethical'       // Privacy, fairness, impact
  | 'operational'   // Team, timeline, resources
  | 'data'          // What to collect, how to use
  | 'ecosystem'     // Integrations, partnerships
  | 'legal'         // Compliance, terms, IP
  | 'competitive'   // Market analysis, differentiation
  | 'risk'          // What could go wrong
  | 'growth'        // Scaling, expansion
  | 'accessibility' // A11y considerations
  | 'security'      // Security architecture
  | 'custom';       // User-defined

export type DimensionStatus = 'not-started' | 'exploring' | 'decided' | 'revisit' | 'blocked';

export interface QuickOption {
  id: string;
  label: string;
  description?: string;
  implications: string[];
  icon?: string;
}

export interface DimensionRelation {
  dimensionType: DimensionType;
  relationship: 'requires' | 'conflicts' | 'informs' | 'blocks';
  description: string;
}

// ============================================================================
// FLOW OPTIONS - Interactive choices
// ============================================================================

export interface FlowOption {
  id: string;
  index: number;              // Option 1, 2, 3...
  
  // What this option represents
  type: OptionType;
  title: string;
  
  // TooLoo's brief insight
  insight: string;            // "Bold direction, high contrast"
  
  // Visual preview (if applicable)
  preview?: OptionPreview;
  
  // For non-visual options
  content?: {
    summary: string;
    details: string[];
    pros?: string[];
    cons?: string[];
  };
  
  // Metadata
  tags: string[];
  complexity: 'simple' | 'moderate' | 'complex';
  
  // Status
  status: 'presented' | 'exploring' | 'collected' | 'dismissed';
  dismissReason?: string;
  
  // If collected
  collectedAt?: number;
  collectedVersion?: number;
}

export type OptionType =
  | 'direction'     // High-level project direction
  | 'layout'        // UI layout
  | 'component'     // UI component
  | 'color'         // Color palette
  | 'typography'    // Font system
  | 'architecture'  // Technical architecture
  | 'feature'       // Feature specification
  | 'flow'          // User flow
  | 'data-model'    // Data structure
  | 'integration'   // Third-party integration
  | 'strategy'      // Business/operational strategy
  | 'concept'       // Abstract concept
  | 'custom';

export interface OptionPreview {
  type: 'component' | 'svg' | 'image' | 'code' | 'diagram';
  content: string;            // JSX/SVG/URL/code
  language?: string;          // For code
  thumbnail?: string;         // Quick preview
}

// ============================================================================
// DECISIONS - Collected insights
// ============================================================================

export interface Decision {
  id: string;
  dimensionType: DimensionType;
  
  // What was decided
  title: string;
  description: string;
  
  // Source
  sourceNodeId: string;
  sourceOptionId?: string;
  
  // Impact
  implications: string[];
  affectsDimensions: DimensionType[];
  
  // Status
  status: 'firm' | 'tentative' | 'revisiting';
  confidence: number;
  
  // History
  createdAt: number;
  revisedAt?: number;
  revisionHistory?: DecisionRevision[];
}

export interface DecisionRevision {
  timestamp: number;
  previousValue: string;
  reason: string;
}

// ============================================================================
// FLOW MESSAGES - Conversation in the tree
// ============================================================================

export interface FlowMessage {
  id: string;
  role: 'user' | 'tooloo';
  
  // Content
  content: string;
  
  // If TooLoo's response, structured data
  response?: FlowResponse;
  
  // Metadata
  timestamp: number;
  nodeId: string;             // Which node this message belongs to
}

export interface FlowResponse {
  // Brief spoken-style message
  message: string;
  
  // Options presented (if any)
  options?: FlowOption[];
  
  // Dimensions surfaced (if any)
  dimensions?: ThinkingDimension[];
  
  // Context awareness
  context: ResponseContext;
  
  // Proactive insights
  insights?: ResponseInsights;
  
  // Suggested actions
  actions?: ResponseAction[];
}

export interface ResponseContext {
  phase: FlowPhase;
  currentDimension?: DimensionType;
  collectionSummary: string;
  decisionCount: number;
}

export interface ResponseInsights {
  patterns?: string[];        // "You're drawn to minimal layouts"
  opportunities?: string[];   // "Option 3's colors would work with your layout"
  warnings?: string[];        // "This conflicts with your earlier decision"
  suggestions?: string[];     // "Consider exploring the business model"
}

export interface ResponseAction {
  id: string;
  label: string;
  type: 'primary' | 'secondary' | 'danger';
  action: ActionType;
  data?: Record<string, unknown>;
}

export type ActionType =
  | 'explore-dimension'
  | 'collect-option'
  | 'dismiss-option'
  | 'branch-exploration'
  | 'go-back'
  | 'change-phase'
  | 'export'
  | 'handoff-qa'
  | 'custom';

// ============================================================================
// EXTENDED KNOWLEDGE - Learning from all interactions
// ============================================================================

export interface ExtendedKnowledge {
  // Design preferences learned
  preferences: {
    category: string;
    values: string[];
    confidence: number;
  }[];
  
  // Patterns from exploration (even non-collected)
  explorationInsights: {
    nodeId: string;
    insight: string;
    source: 'refinement' | 'dismissal' | 'comparison';
  }[];
  
  // Constraints discovered
  constraints: {
    type: string;
    description: string;
    source: 'explicit' | 'inferred' | 'conflict';
    dimensionTypes: DimensionType[];
  }[];
  
  // Cross-dimension relationships discovered
  relationships: {
    from: { dimension: DimensionType; decision: string };
    to: { dimension: DimensionType; implication: string };
    type: 'enables' | 'blocks' | 'influences';
  }[];
}

// ============================================================================
// READINESS & HANDOFF
// ============================================================================

export interface DimensionReadiness {
  dimensionType: DimensionType;
  status: 'not-started' | 'exploring' | 'ready' | 'needs-attention' | 'blocked';
  decisionCount: number;
  openQuestions: string[];
  blockedBy?: DimensionType[];
}

export interface QAHandoff {
  status: 'pending' | 'in-progress' | 'passed' | 'failed' | 'needs-revision';
  handedOffAt?: number;
  completedAt?: number;
  
  // QA results
  results?: {
    testsRun: number;
    testsPassed: number;
    testsFailed: number;
    coverage?: number;
    issues: QAIssue[];
  };
  
  // Feedback from QA
  feedback?: string;
}

export interface QAIssue {
  id: string;
  severity: 'critical' | 'major' | 'minor' | 'suggestion';
  category: string;
  description: string;
  location?: string;
  suggestion?: string;
}

// ============================================================================
// GIT CONTEXT
// ============================================================================

export interface GitContext {
  repo: string;
  branch: string;
  baseBranch: string;
  commits: string[];
  prNumber?: number;
  prUrl?: string;
}

// ============================================================================
// ARTIFACTS
// ============================================================================

export interface FlowArtifact {
  id: string;
  type: ArtifactType;
  name: string;
  content: string;
  
  // Source
  sourceDimension: DimensionType;
  sourceDecisions: string[];      // Decision IDs
  
  // Metadata
  createdAt: number;
  version: string;
  
  // For code artifacts
  language?: string;
  path?: string;
}

export type ArtifactType =
  | 'component'       // React/Vue/etc component
  | 'style'           // CSS/Tailwind/etc
  | 'design-token'    // Design system tokens
  | 'spec'            // Specification document
  | 'diagram'         // Architecture/flow diagram
  | 'test'            // Test file
  | 'config'          // Configuration
  | 'documentation';  // README, guides

// ============================================================================
// DIMENSION TEMPLATES
// ============================================================================

export const DIMENSION_TEMPLATES: Record<DimensionType, Omit<ThinkingDimension, 'id' | 'status' | 'confidence'>> = {
  design: {
    type: 'design',
    icon: '🎨',
    title: 'Design',
    question: 'What should this look and feel like?',
    quickOptions: [
      { id: 'minimal', label: 'Minimal', implications: ['Clean interfaces', 'Focus on content', 'Less visual noise'] },
      { id: 'bold', label: 'Bold & Expressive', implications: ['Strong visual identity', 'Memorable', 'More design work'] },
      { id: 'playful', label: 'Playful', implications: ['Animations', 'Micro-interactions', 'Casual tone'] },
      { id: 'professional', label: 'Professional', implications: ['Trust signals', 'Conservative', 'Enterprise-friendly'] },
    ],
    affects: [
      { dimensionType: 'user', relationship: 'informs', description: 'Visual style should match user expectations' },
      { dimensionType: 'technical', relationship: 'informs', description: 'Complex visuals need appropriate tech stack' },
    ],
  },
  technical: {
    type: 'technical',
    icon: '🔧',
    title: 'Technical',
    question: 'How should this be built?',
    quickOptions: [
      { id: 'web-pwa', label: 'Web / PWA', implications: ['Cross-platform', 'Web technologies', 'Limited device access'] },
      { id: 'native', label: 'Native Apps', implications: ['Best performance', 'Full device access', 'Separate codebases'] },
      { id: 'hybrid', label: 'Hybrid (React Native)', implications: ['Shared code', 'Good performance', 'Some compromises'] },
      { id: 'serverless', label: 'Serverless', implications: ['Scale automatically', 'Pay per use', 'Vendor lock-in'] },
    ],
    affects: [
      { dimensionType: 'operational', relationship: 'informs', description: 'Tech choice affects team needs' },
      { dimensionType: 'ecosystem', relationship: 'informs', description: 'Some integrations need native access' },
    ],
  },
  user: {
    type: 'user',
    icon: '👤',
    title: 'User',
    question: 'Who is this really for?',
    quickOptions: [
      { id: 'consumers', label: 'Consumers', implications: ['B2C', 'Simple onboarding', 'Viral potential'] },
      { id: 'professionals', label: 'Professionals', implications: ['B2B potential', 'Productivity focus', 'Integrations'] },
      { id: 'developers', label: 'Developers', implications: ['Technical audience', 'API-first', 'Documentation critical'] },
      { id: 'enterprises', label: 'Enterprises', implications: ['B2B', 'Security focus', 'Compliance needs'] },
    ],
    affects: [
      { dimensionType: 'design', relationship: 'informs', description: 'User expectations shape visual design' },
      { dimensionType: 'business', relationship: 'informs', description: 'User type determines revenue model' },
    ],
  },
  business: {
    type: 'business',
    icon: '💼',
    title: 'Business',
    question: 'How does this become sustainable?',
    quickOptions: [
      { id: 'freemium', label: 'Freemium', implications: ['Free tier needed', 'Conversion optimization', 'Feature gating'] },
      { id: 'subscription', label: 'Subscription', implications: ['Recurring revenue', 'Retention focus', 'Value delivery'] },
      { id: 'one-time', label: 'One-time Purchase', implications: ['Higher price point', 'Less recurring', 'Updates strategy'] },
      { id: 'marketplace', label: 'Marketplace/Platform', implications: ['Two-sided market', 'Network effects', 'Complex'] },
    ],
    affects: [
      { dimensionType: 'user', relationship: 'informs', description: 'Model affects who you can reach' },
      { dimensionType: 'growth', relationship: 'informs', description: 'Revenue model shapes growth strategy' },
    ],
  },
  ethical: {
    type: 'ethical',
    icon: '⚖️',
    title: 'Ethical',
    question: 'What are the responsibility considerations?',
    quickOptions: [
      { id: 'privacy-first', label: 'Privacy-First', implications: ['Minimal data collection', 'User control', 'Trust building'] },
      { id: 'transparent', label: 'Radical Transparency', implications: ['Open algorithms', 'Clear data use', 'Public trust'] },
      { id: 'accessible', label: 'Accessibility-First', implications: ['WCAG compliance', 'Inclusive design', 'Wider reach'] },
      { id: 'sustainable', label: 'Sustainable', implications: ['Green hosting', 'Efficient code', 'Environmental impact'] },
    ],
    affects: [
      { dimensionType: 'data', relationship: 'requires', description: 'Ethics constrain data practices' },
      { dimensionType: 'legal', relationship: 'informs', description: 'Ethical stance affects compliance needs' },
    ],
  },
  operational: {
    type: 'operational',
    icon: '🚀',
    title: 'Operational',
    question: 'How will this actually get built and maintained?',
    quickOptions: [
      { id: 'solo', label: 'Solo/Small Team', implications: ['Limited scope', 'Focus critical', 'Automation needed'] },
      { id: 'startup', label: 'Startup Team', implications: ['Move fast', 'Iterate quickly', 'Technical debt OK'] },
      { id: 'agency', label: 'Agency/Contract', implications: ['Handoff needed', 'Documentation critical', 'Timeline fixed'] },
      { id: 'enterprise', label: 'Enterprise Team', implications: ['Process heavy', 'Governance', 'Scale built-in'] },
    ],
    affects: [
      { dimensionType: 'technical', relationship: 'informs', description: 'Team size affects tech choices' },
      { dimensionType: 'risk', relationship: 'informs', description: 'Resources affect risk tolerance' },
    ],
  },
  data: {
    type: 'data',
    icon: '📊',
    title: 'Data',
    question: 'What data matters and how will it be used?',
    quickOptions: [
      { id: 'minimal', label: 'Minimal Collection', implications: ['Privacy-friendly', 'Less analytics', 'Simpler compliance'] },
      { id: 'analytics', label: 'Analytics-Driven', implications: ['User insights', 'A/B testing', 'Privacy balance'] },
      { id: 'ai-powered', label: 'AI/ML Powered', implications: ['Training data needed', 'Personalization', 'Compute costs'] },
      { id: 'user-generated', label: 'User-Generated Content', implications: ['Moderation needed', 'Storage costs', 'Community'] },
    ],
    affects: [
      { dimensionType: 'ethical', relationship: 'requires', description: 'Data use must align with ethics' },
      { dimensionType: 'technical', relationship: 'informs', description: 'Data needs shape infrastructure' },
    ],
  },
  ecosystem: {
    type: 'ecosystem',
    icon: '🌍',
    title: 'Ecosystem',
    question: 'What does this connect to?',
    quickOptions: [
      { id: 'standalone', label: 'Standalone', implications: ['Self-contained', 'Full control', 'Build everything'] },
      { id: 'platform', label: 'Platform Integration', implications: ['Apple/Google ecosystem', 'Store requirements', 'Distribution'] },
      { id: 'api-first', label: 'API-First', implications: ['Developer ecosystem', 'Extensibility', 'Documentation'] },
      { id: 'aggregator', label: 'Aggregator', implications: ['Multiple integrations', 'Data normalization', 'Maintenance'] },
    ],
    affects: [
      { dimensionType: 'technical', relationship: 'informs', description: 'Integrations affect architecture' },
      { dimensionType: 'business', relationship: 'informs', description: 'Ecosystem position affects revenue' },
    ],
  },
  legal: {
    type: 'legal',
    icon: '📜',
    title: 'Legal',
    question: 'What are the compliance and legal requirements?',
    quickOptions: [
      { id: 'standard', label: 'Standard Terms', implications: ['Basic privacy policy', 'ToS', 'Cookie consent'] },
      { id: 'gdpr', label: 'GDPR Compliant', implications: ['EU users', 'Data rights', 'DPO potentially'] },
      { id: 'hipaa', label: 'HIPAA Compliant', implications: ['Health data', 'Strict requirements', 'Audits'] },
      { id: 'fintech', label: 'Financial Compliance', implications: ['KYC/AML', 'Regulatory reporting', 'Licensing'] },
    ],
    affects: [
      { dimensionType: 'data', relationship: 'requires', description: 'Compliance shapes data handling' },
      { dimensionType: 'operational', relationship: 'informs', description: 'Compliance needs resources' },
    ],
  },
  competitive: {
    type: 'competitive',
    icon: '🎯',
    title: 'Competitive',
    question: 'How does this stand out?',
    quickOptions: [
      { id: 'differentiate', label: 'Differentiate', implications: ['Unique features', 'Novel approach', 'Education needed'] },
      { id: 'better', label: 'Better Execution', implications: ['Proven market', 'Quality focus', 'Competitive pressure'] },
      { id: 'niche', label: 'Niche Focus', implications: ['Specific audience', 'Less competition', 'Smaller market'] },
      { id: 'disrupt', label: 'Disrupt', implications: ['New model', 'High risk', 'High reward'] },
    ],
    affects: [
      { dimensionType: 'business', relationship: 'informs', description: 'Position affects pricing and model' },
      { dimensionType: 'design', relationship: 'informs', description: 'Differentiation through design' },
    ],
  },
  risk: {
    type: 'risk',
    icon: '⚠️',
    title: 'Risk',
    question: 'What could go wrong?',
    quickOptions: [
      { id: 'technical', label: 'Technical Risks', implications: ['Scalability', 'Security', 'Dependencies'] },
      { id: 'market', label: 'Market Risks', implications: ['Timing', 'Competition', 'Adoption'] },
      { id: 'operational', label: 'Operational Risks', implications: ['Team', 'Funding', 'Timeline'] },
      { id: 'regulatory', label: 'Regulatory Risks', implications: ['Compliance changes', 'Licensing', 'Lawsuits'] },
    ],
    affects: [
      { dimensionType: 'operational', relationship: 'informs', description: 'Risk tolerance shapes approach' },
      { dimensionType: 'technical', relationship: 'informs', description: 'Risks influence architecture' },
    ],
  },
  growth: {
    type: 'growth',
    icon: '📈',
    title: 'Growth',
    question: 'How does this scale?',
    quickOptions: [
      { id: 'organic', label: 'Organic Growth', implications: ['Word of mouth', 'SEO', 'Slow but sustainable'] },
      { id: 'viral', label: 'Viral Mechanics', implications: ['Sharing built-in', 'Network effects', 'Rapid potential'] },
      { id: 'paid', label: 'Paid Acquisition', implications: ['Marketing budget', 'Measurable', 'CAC focus'] },
      { id: 'partnerships', label: 'Partnerships', implications: ['Channel partners', 'Integrations', 'Slower but defensible'] },
    ],
    affects: [
      { dimensionType: 'business', relationship: 'informs', description: 'Growth strategy affects unit economics' },
      { dimensionType: 'technical', relationship: 'informs', description: 'Scale needs appropriate architecture' },
    ],
  },
  accessibility: {
    type: 'accessibility',
    icon: '♿',
    title: 'Accessibility',
    question: 'How do we ensure everyone can use this?',
    quickOptions: [
      { id: 'wcag-a', label: 'WCAG A', implications: ['Basic accessibility', 'Minimum standard', 'Most users'] },
      { id: 'wcag-aa', label: 'WCAG AA', implications: ['Recommended level', 'Good coverage', 'Some effort'] },
      { id: 'wcag-aaa', label: 'WCAG AAA', implications: ['Highest standard', 'Maximum inclusion', 'Significant effort'] },
      { id: 'beyond', label: 'Beyond Compliance', implications: ['Assistive tech testing', 'User research', 'Inclusive design'] },
    ],
    affects: [
      { dimensionType: 'design', relationship: 'requires', description: 'A11y requirements shape design choices' },
      { dimensionType: 'technical', relationship: 'informs', description: 'A11y affects component architecture' },
    ],
  },
  security: {
    type: 'security',
    icon: '🔒',
    title: 'Security',
    question: 'How do we protect users and data?',
    quickOptions: [
      { id: 'standard', label: 'Standard Security', implications: ['HTTPS', 'Basic auth', 'Common practices'] },
      { id: 'enhanced', label: 'Enhanced Security', implications: ['2FA', 'Encryption at rest', 'Security audits'] },
      { id: 'enterprise', label: 'Enterprise Grade', implications: ['SSO/SAML', 'SOC2', 'Compliance frameworks'] },
      { id: 'zero-trust', label: 'Zero Trust', implications: ['Verify everything', 'Micro-segmentation', 'Complex'] },
    ],
    affects: [
      { dimensionType: 'technical', relationship: 'requires', description: 'Security shapes architecture' },
      { dimensionType: 'legal', relationship: 'informs', description: 'Security affects compliance' },
    ],
  },
  custom: {
    type: 'custom',
    icon: '✨',
    title: 'Custom',
    question: 'What else matters for this project?',
    quickOptions: [],
    affects: [],
  },
};
