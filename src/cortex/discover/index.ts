// @version 1.0.0
/**
 * DisCover Module
 * TooLoo.ai's self-aware emergence coordinator.
 *
 * DisCover orchestrates:
 * - Real-world data discovery (via Harvester)
 * - Emergence detection and refinement (via CuriosityEngine)
 * - Hypothesis testing (via Exploration Lab)
 * - Byproduct packaging (Emergence Artifacts)
 */

export { DisCoverAgent, discoverAgent } from './discover-agent.js';
export type { CuriositySignal, DiscoverPolicy } from './discover-agent.js';

export {
  createEmergenceArtifact,
  type EmergenceArtifact,
  type ArtifactType,
  type ArtifactStatus,
  type ArtifactPayload,
  type ArtifactEvidence,
  type ValidationResult,
} from './emergence-artifact.js';
