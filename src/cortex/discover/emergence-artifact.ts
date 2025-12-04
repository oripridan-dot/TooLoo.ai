// @version 1.0.0
export type ArtifactType =
  | 'pattern'
  | 'capability'
  | 'optimization'
  | 'prompt_template'
  | 'configuration'
  | 'knowledge'
  | 'insight';
export type ArtifactStatus =
  | 'detected'
  | 'testing'
  | 'validated'
  | 'integrated'
  | 'rejected'
  | 'archived';

export interface EmergenceArtifact {
  id: string;
  type: ArtifactType;
  status: ArtifactStatus;
  title: string;
  description: string;
  confidence: number;
  evidence: ArtifactEvidence[];
  validationResults?: ValidationResult;
  impact: 'low' | 'medium' | 'high';
  affectedAreas: string[];
  payload: ArtifactPayload;
  sourceSignals: string[];
  parentArtifact?: string;
  childArtifacts: string[];
  detectedAt: Date;
  validatedAt?: Date;
  integratedAt?: Date;
  tags: string[];
  metadata: Record<string, unknown>;
}

export interface ArtifactEvidence {
  type: 'observation' | 'experiment' | 'external_data' | 'user_feedback';
  description: string;
  data: unknown;
  timestamp: Date;
  confidence: number;
}

export interface ValidationResult {
  success: boolean;
  method: 'sandbox' | 'a_b_test' | 'simulation' | 'expert_review';
  findings: string;
  metrics: Record<string, number>;
  testedAt: Date;
}

export interface ArtifactPayload {
  type: ArtifactType;
  pattern?: { trigger: string; action: string; outcome: string };
  capability?: { name: string; description: string; implementation?: string };
  optimization?: {
    target: string;
    before: Record<string, number>;
    after: Record<string, number>;
    method: string;
  };
  promptTemplate?: { template: string; variables: string[]; bestFor: string[] };
  configuration?: { key: string; value: unknown; context: string };
  knowledge?: { claim: string; sources: string[]; validatedBy: string };
  insight?: { observation: string; implications: string[]; actionable: boolean };
}

export function createEmergenceArtifact(
  type: ArtifactType,
  title: string,
  description: string,
  payload: Partial<ArtifactPayload>,
  options: {
    confidence?: number;
    impact?: 'low' | 'medium' | 'high';
    affectedAreas?: string[];
    sourceSignals?: string[];
    tags?: string[];
  } = {}
): EmergenceArtifact {
  return {
    id: `artifact-${type}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    type,
    status: 'detected',
    title,
    description,
    confidence: options.confidence ?? 0.5,
    evidence: [],
    impact: options.impact ?? 'medium',
    affectedAreas: options.affectedAreas ?? [],
    payload: { type, ...payload },
    sourceSignals: options.sourceSignals ?? [],
    childArtifacts: [],
    detectedAt: new Date(),
    tags: options.tags ?? [],
    metadata: {},
  };
}
