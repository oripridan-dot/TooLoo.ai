/**
 * @tooloo/api - Routes Index
 * Export all route factories
 *
 * @version 2.1.0
 */

export { createHealthRouter } from './health.js';
export { createChatRouter } from './chat.js';
export { createSkillsRouter } from './skills.js';
export { createProjectsRouter } from './projects.js';
export { createCapabilitiesRouter } from './capabilities.js';
export { createVisualsRouter } from './visuals.js';
export { createSystemRouter } from './system.js';
export { createEnginesRouter } from './engines.js';
export { createImplementationRouter } from './implementation.js';
export { createObservatoryRouter, trackRequest, addAlert, addInsight } from './observatory.js';
export { createOrchestratorRouter } from './orchestrator.js';
export { createVisionRouter } from './vision.js';
export { createGenesisRouter } from './genesis.js';
