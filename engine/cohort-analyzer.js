/**
 * Cohort Analyzer Engine
 * Phase 2: Cohort Discovery & Trait Extraction
 * 
 * Clusters users into cohorts based on behavioral traits extracted from
 * conversation segmentation. Enables per-cohort optimization in Phase 2 Sprint 2+.
 */

const fs = require('fs').promises;
const path = require('path');

const COHORTS_PATH = path.join(__dirname, '..', 'data', 'segmentation', 'cohorts.json');
const MIN_COHORT_SIZE = 2;
const TRAIT_WEIGHTS = {
  learningVelocity: 0.25,
  domainAffinity: 0.2,
  interactionFrequency: 0.2,
  feedbackResponsiveness: 0.2,
  retentionStrength: 0.15,
};

/**
 * Load cohorts from persistent storage
 */
async function loadCohorts() {
  try {
    const data = await fs.readFile(COHORTS_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.warn('[cohort-analyzer] No cohorts file found, initializing empty');
    return {
      metadata: {
        version: '2.0',
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        totalCohorts: 0,
        discoveryMethod: 'trait-clustering',
      },
      cohorts: [],
    };
  }
}

/**
 * Persist cohorts to storage with atomic write
 */
async function saveCohorts(cohortData) {
  try {
    const tmpPath = COHORTS_PATH + '.tmp';
    await fs.writeFile(tmpPath, JSON.stringify(cohortData, null, 2), 'utf8');
    await fs.rename(tmpPath, COHORTS_PATH);
    return true;
  } catch (err) {
    console.error('[cohort-analyzer] Failed to save cohorts:', err.message);
    return false;
  }
}

/**
 * Extract traits from a single user conversation history
 * Returns normalized trait vector {learningVelocity, domainAffinity, ...}
 */
async function extractUserTraits(userId, conversationHistory) {
  const traits = {
    learningVelocity: 0,
    domainAffinity: 0,
    interactionFrequency: 0,
    feedbackResponsiveness: 0,
    retentionStrength: 0,
  };

  if (!conversationHistory || conversationHistory.length === 0) {
    return traits;
  }

  // Learning Velocity: Growth rate of capability adoption
  const capabilityProgression = conversationHistory.filter(
    (c) => c.type === 'training' || c.type === 'workflow'
  );
  traits.learningVelocity = Math.min(1, capabilityProgression.length / 50); // Normalize to 50 conversations

  // Domain Affinity: Concentration in specific domains
  const domains = {};
  conversationHistory.forEach((c) => {
    if (c.domain) {
      domains[c.domain] = (domains[c.domain] || 0) + 1;
    }
  });
  const domainValues = Object.values(domains);
  traits.domainAffinity =
    domainValues.length > 0 ? Math.max(...domainValues) / conversationHistory.length : 0;

  // Interaction Frequency: Regularity of engagement
  // (Simplified: frequency relative to time window)
  traits.interactionFrequency = Math.min(1, conversationHistory.length / 100); // Normalize

  // Feedback Responsiveness: Rate of acting on suggestions
  const feedbackActions = conversationHistory.filter(
    (c) => c.type === 'feedback' && c.actionTaken === true
  );
  traits.feedbackResponsiveness =
    conversationHistory.length > 0 ? feedbackActions.length / conversationHistory.length : 0;

  // Retention Strength: Reuse of previously learned capabilities
  const previousCapabilities = new Set();
  let reusedCapabilities = 0;
  conversationHistory.forEach((c) => {
    if (c.type === 'training' && c.capabilityId) {
      if (previousCapabilities.has(c.capabilityId)) {
        reusedCapabilities++;
      }
      previousCapabilities.add(c.capabilityId);
    }
  });
  traits.retentionStrength =
    previousCapabilities.size > 0 ? reusedCapabilities / previousCapabilities.size : 0;

  return traits;
}

/**
 * Calculate Euclidean distance between two trait vectors
 */
function traitDistance(traits1, traits2) {
  let sumSquares = 0;
  Object.keys(TRAIT_WEIGHTS).forEach((key) => {
    const diff = (traits1[key] || 0) - (traits2[key] || 0);
    sumSquares += diff * diff * TRAIT_WEIGHTS[key];
  });
  return Math.sqrt(sumSquares);
}

/**
 * K-means clustering with automatic k detection (3-5 cohorts recommended)
 */
async function clusterUsersByTraits(userTraitsMap, targetCohorts = 4) {
  const users = Object.entries(userTraitsMap);
  if (users.length < MIN_COHORT_SIZE) {
    console.warn(
      `[cohort-analyzer] Insufficient users (${users.length}) for clustering, need ${MIN_COHORT_SIZE}`
    );
    return [];
  }

  const k = Math.min(targetCohorts, Math.ceil(users.length / MIN_COHORT_SIZE));
  const maxIterations = 10;
  let centroids = [];
  let clusters = [];

  // Initialize centroids with k-means++
  centroids.push(users[Math.floor(Math.random() * users.length)][1]);
  for (let i = 1; i < k; i++) {
    const distances = users.map(([, traits]) => {
      const minDist = Math.min(...centroids.map((c) => traitDistance(traits, c)));
      return minDist * minDist;
    });
    const totalDist = distances.reduce((a, b) => a + b, 0);
    let pick = Math.random() * totalDist;
    for (let j = 0; j < distances.length; j++) {
      pick -= distances[j];
      if (pick <= 0) {
        centroids.push(users[j][1]);
        break;
      }
    }
  }

  // K-means iterations
  for (let iter = 0; iter < maxIterations; iter++) {
    clusters = Array(k)
      .fill(null)
      .map(() => []);

    // Assign users to nearest centroid
    users.forEach(([userId, traits]) => {
      let minDist = Infinity;
      let clusterIdx = 0;
      centroids.forEach((centroid, idx) => {
        const dist = traitDistance(traits, centroid);
        if (dist < minDist) {
          minDist = dist;
          clusterIdx = idx;
        }
      });
      clusters[clusterIdx].push([userId, traits]);
    });

    // Remove empty clusters
    clusters = clusters.filter((c) => c.length > 0);

    // Recompute centroids
    const newCentroids = clusters.map((cluster) => {
      const avgTraits = {};
      Object.keys(TRAIT_WEIGHTS).forEach((key) => {
        avgTraits[key] =
          cluster.reduce((sum, [, traits]) => sum + (traits[key] || 0), 0) / cluster.length;
      });
      return avgTraits;
    });

    // Check convergence
    let converged = true;
    for (let i = 0; i < newCentroids.length; i++) {
      if (traitDistance(centroids[i] || {}, newCentroids[i]) > 0.01) {
        converged = false;
        break;
      }
    }
    centroids = newCentroids;
    if (converged) break;
  }

  return clusters;
}

/**
 * Generate cohort metadata from cluster
 */
function generateCohortMetadata(clusterUsers, cohortId) {
  const traits = clusterUsers.map(([, t]) => t);
  const avgTraits = {};
  Object.keys(TRAIT_WEIGHTS).forEach((key) => {
    avgTraits[key] = traits.reduce((sum, t) => sum + (t[key] || 0), 0) / traits.length;
  });

  // Determine cohort archetype based on dominant traits
  let archetype = 'Generalist';
  const sorted = Object.entries(avgTraits).sort((a, b) => b[1] - a[1]);
  if (sorted[0][0] === 'learningVelocity') archetype = 'Fast Learner';
  else if (sorted[0][0] === 'domainAffinity') archetype = 'Specialist';
  else if (sorted[0][0] === 'interactionFrequency') archetype = 'Power User';
  else if (sorted[0][0] === 'retentionStrength') archetype = 'Long-term Retainer';

  return {
    id: cohortId,
    archetype,
    size: clusterUsers.length,
    avgTraits,
    userIds: clusterUsers.map(([id]) => id),
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Discover cohorts from user conversation segmentation
 * Input: { userId: [ conversations ] }
 */
async function discoverCohorts(userConversationMap) {
  console.log('[cohort-analyzer] Starting cohort discovery...');

  // Extract traits for all users
  const userTraitsMap = {};
  for (const [userId, conversations] of Object.entries(userConversationMap)) {
    userTraitsMap[userId] = await extractUserTraits(userId, conversations);
  }

  console.log(`[cohort-analyzer] Extracted traits for ${Object.keys(userTraitsMap).length} users`);

  // Cluster by traits
  const clusters = await clusterUsersByTraits(userTraitsMap);
  console.log(`[cohort-analyzer] Discovered ${clusters.length} cohorts`);

  // Generate cohort metadata
  const cohorts = clusters.map((cluster, idx) =>
    generateCohortMetadata(cluster, `cohort-${Date.now()}-${idx}`)
  );

  // Persist to storage
  const cohortData = await loadCohorts();
  cohortData.cohorts = cohorts;
  cohortData.metadata.totalCohorts = cohorts.length;
  cohortData.metadata.lastUpdated = new Date().toISOString();

  const saved = await saveCohorts(cohortData);
  if (saved) {
    console.log('[cohort-analyzer] Cohorts persisted successfully');
  }

  return cohorts;
}

/**
 * Get cohort for a specific user
 */
async function getUserCohort(userId) {
  const cohortData = await loadCohorts();
  const userCohort = cohortData.cohorts.find((c) => c.userIds.includes(userId));
  return userCohort || null;
}

/**
 * Get all cohorts
 */
async function getAllCohorts() {
  const cohortData = await loadCohorts();
  return cohortData.cohorts;
}

module.exports = {
  discoverCohorts,
  getUserCohort,
  getAllCohorts,
  extractUserTraits,
  traitDistance,
  loadCohorts,
  saveCohorts,
};
