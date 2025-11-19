#!/usr/bin/env node

/**
 * Advanced ML Clustering Engine
 * 
 * Features:
 * 1. K-Means Clustering - Group tokens by similarity
 * 2. Hierarchical Clustering - Tree-based token relationships
 * 3. Dimensionality Reduction - PCA for visualization
 * 4. Archetype Detection - Identify design system categories
 */

export class DesignMLClustering {
  constructor() {
    this.clusters = new Map();
    this.archetypes = [];
    this.models = new Map();
  }

  /**
   * PHASE 1: K-MEANS CLUSTERING
   * Group design tokens into semantic families
   */

  /**
   * K-Means clustering for token grouping
   * @param {Array} tokens - Design tokens to cluster
   * @param {number} k - Number of clusters (default: auto)
   * @returns {Object} Cluster results with assignments and centroids
   */
  kMeansClustering(tokens, k = null) {
    if (!tokens || tokens.length === 0) {
      return { error: 'No tokens provided' };
    }

    // Auto-detect optimal k using elbow method
    if (!k) {
      k = this._autoDetectK(tokens);
    }

    // Convert tokens to feature vectors
    const vectors = tokens.map(token => this._tokenToVector(token));

    // Initialize centroids
    let centroids = this._initCentroids(vectors, k);
    let assignments = new Array(vectors.length).fill(0);
    let converged = false;
    let iterations = 0;
    const maxIterations = 100;

    // K-Means iterations
    while (!converged && iterations < maxIterations) {
      // Assign tokens to nearest centroid
      const newAssignments = vectors.map(vector => 
        this._findNearestCentroid(vector, centroids)
      );

      // Check convergence
      converged = JSON.stringify(assignments) === JSON.stringify(newAssignments);
      assignments = newAssignments;

      // Recalculate centroids
      centroids = this._recalculateCentroids(vectors, assignments, k);
      iterations++;
    }

    // Build cluster groups
    const clusterGroups = new Map();
    for (let i = 0; i < tokens.length; i++) {
      const clusterId = assignments[i];
      if (!clusterGroups.has(clusterId)) {
        clusterGroups.set(clusterId, []);
      }
      clusterGroups.get(clusterId).push(tokens[i]);
    }

    return {
      k,
      iterations,
      converged,
      clusters: Array.from(clusterGroups.entries()).map(([id, items]) => ({
        id,
        tokens: items,
        size: items.length,
        centroid: centroids[id],
        silhouetteScore: this._calculateSilhouetteScore(vectors, assignments, id)
      })),
      quality: this._calculateClusteringQuality(vectors, assignments, centroids)
    };
  }

  _tokenToVector(token) {
    // Convert token to numerical vector
    const vector = [];

    // Color tokens
    if (token.hex) {
      const rgb = this._hexToRgb(token.hex);
      vector.push(...rgb.map(v => v / 255)); // Normalize to 0-1
    } else if (token.value) {
      // Numeric token (spacing, size)
      const val = parseInt(token.value);
      vector.push(val / 100); // Normalize
    } else {
      vector.push(0, 0, 0);
    }

    // Name features (simplified encoding)
    if (token.name) {
      const nameLength = token.name.length / 50; // Normalize length
      const hasNumbering = token.name.match(/\d/) ? 1 : 0;
      vector.push(nameLength, hasNumbering);
    }

    return vector;
  }

  _autoDetectK(tokens) {
    // Use elbow method with simplified calculation
    // For design systems, typically 3-7 clusters
    const suggested = Math.ceil(Math.sqrt(tokens.length / 2));
    return Math.max(3, Math.min(suggested, 7));
  }

  _initCentroids(vectors, k) {
    const centroids = [];
    const vectorLength = vectors[0].length;

    // K-means++ initialization
    centroids.push(vectors[Math.floor(Math.random() * vectors.length)]);

    for (let i = 1; i < k; i++) {
      let maxDist = -1;
      let nextCentroid = null;

      for (const vector of vectors) {
        let minDist = Infinity;
        for (const centroid of centroids) {
          const dist = this._euclideanDistance(vector, centroid);
          minDist = Math.min(minDist, dist);
        }

        if (minDist > maxDist) {
          maxDist = minDist;
          nextCentroid = vector;
        }
      }

      if (nextCentroid) {
        centroids.push(nextCentroid);
      }
    }

    return centroids;
  }

  _findNearestCentroid(vector, centroids) {
    let minDist = Infinity;
    let nearest = 0;

    for (let i = 0; i < centroids.length; i++) {
      const dist = this._euclideanDistance(vector, centroids[i]);
      if (dist < minDist) {
        minDist = dist;
        nearest = i;
      }
    }

    return nearest;
  }

  _recalculateCentroids(vectors, assignments, k) {
    const newCentroids = [];
    const vectorLength = vectors[0].length;

    for (let i = 0; i < k; i++) {
      const clusterVectors = vectors.filter((_, idx) => assignments[idx] === i);

      if (clusterVectors.length === 0) {
        // Empty cluster - reinitialize
        newCentroids.push(vectors[Math.floor(Math.random() * vectors.length)]);
      } else {
        // Calculate mean
        const centroid = new Array(vectorLength).fill(0);
        for (const vector of clusterVectors) {
          for (let j = 0; j < vectorLength; j++) {
            centroid[j] += vector[j];
          }
        }
        for (let j = 0; j < vectorLength; j++) {
          centroid[j] /= clusterVectors.length;
        }
        newCentroids.push(centroid);
      }
    }

    return newCentroids;
  }

  _euclideanDistance(v1, v2) {
    let sum = 0;
    for (let i = 0; i < v1.length; i++) {
      sum += Math.pow(v1[i] - v2[i], 2);
    }
    return Math.sqrt(sum);
  }

  _calculateSilhouetteScore(vectors, assignments, clusterId) {
    const clusterIndices = assignments
      .map((c, i) => c === clusterId ? i : -1)
      .filter(i => i !== -1);

    if (clusterIndices.length < 2) return 0;

    let totalScore = 0;

    for (const i of clusterIndices) {
      // Distance to other points in same cluster
      let intraClusterDist = 0;
      let count = 0;

      for (const j of clusterIndices) {
        if (i !== j) {
          intraClusterDist += this._euclideanDistance(vectors[i], vectors[j]);
          count++;
        }
      }

      const a = count > 0 ? intraClusterDist / count : 0;

      // Distance to nearest cluster
      let minInterClusterDist = Infinity;

      for (let c = 0; c < Math.max(...assignments) + 1; c++) {
        if (c === clusterId) continue;

        const otherIndices = assignments
          .map((cl, idx) => cl === c ? idx : -1)
          .filter(idx => idx !== -1);

        if (otherIndices.length === 0) continue;

        let interClusterDist = 0;
        for (const j of otherIndices) {
          interClusterDist += this._euclideanDistance(vectors[i], vectors[j]);
        }

        const b = interClusterDist / otherIndices.length;
        minInterClusterDist = Math.min(minInterClusterDist, b);
      }

      if (minInterClusterDist === Infinity) {
        minInterClusterDist = a;
      }

      const silhouette = (minInterClusterDist - a) / Math.max(a, minInterClusterDist);
      totalScore += silhouette;
    }

    return (totalScore / clusterIndices.length).toFixed(2);
  }

  _calculateClusteringQuality(vectors, assignments, centroids) {
    let totalWithinSSE = 0;
    const k = Math.max(...assignments) + 1;

    for (let i = 0; i < vectors.length; i++) {
      const centroid = centroids[assignments[i]];
      const dist = this._euclideanDistance(vectors[i], centroid);
      totalWithinSSE += dist * dist;
    }

    // Normalize by k
    return (totalWithinSSE / (k * vectors.length)).toFixed(3);
  }

  /**
   * PHASE 2: HIERARCHICAL CLUSTERING
   * Build dendrogram of token relationships
   */

  /**
   * Hierarchical agglomerative clustering
   * @param {Array} tokens - Tokens to cluster
   * @returns {Object} Dendogram structure
   */
  hierarchicalClustering(tokens) {
    if (tokens.length < 2) {
      return { error: 'At least 2 tokens required' };
    }

    // Limit to 10 tokens to avoid performance issues
    const limitedTokens = tokens.slice(0, 10);

    // Initialize single-token clusters
    let clusters = limitedTokens.map((token, i) => ({
      id: i,
      tokens: [token],
      children: [],
      distance: 0,
      height: 0
    }));

    const dendrogram = [];
    let maxIterations = Math.min(20, clusters.length - 1);

    // Agglomerative merging
    while (clusters.length > 1 && maxIterations-- > 0) {
      // Find closest pair (optimized)
      let minDist = Infinity;
      let pair = [0, 1];

      for (let i = 0; i < Math.min(clusters.length, 5); i++) {
        for (let j = i + 1; j < Math.min(clusters.length, i + 5); j++) {
          const dist = this._clusterDistance(clusters[i], clusters[j]);
          if (dist < minDist) {
            minDist = dist;
            pair = [i, j];
          }
        }
      }

      // Merge closest clusters
      const [i, j] = pair.sort((a, b) => b - a);
      const c1 = clusters[i];
      const c2 = clusters[j];

      const merged = {
        id: `merged-${Date.now()}-${Math.random()}`,
        tokens: [...c1.tokens, ...c2.tokens],
        children: [c1, c2],
        distance: minDist,
        height: Math.max(c1.height, c2.height) + minDist
      };

      clusters.splice(j, 1);
      clusters.splice(i, 1);
      clusters.push(merged);
      dendrogram.push(merged);
    }

    return {
      root: clusters[0],
      dendrogram,
      depth: clusters[0].height,
      leaves: limitedTokens.length
    };
  }

  _clusterDistance(c1, c2) {
    // Use average linkage
    let totalDist = 0;
    let count = 0;

    for (const t1 of c1.tokens) {
      for (const t2 of c2.tokens) {
        const v1 = this._tokenToVector(t1);
        const v2 = this._tokenToVector(t2);
        totalDist += this._euclideanDistance(v1, v2);
        count++;
      }
    }

    return count > 0 ? totalDist / count : 0;
  }

  /**
   * PHASE 3: DIMENSIONALITY REDUCTION
   * PCA for visualization of high-dimensional token space
   */

  /**
   * Principal Component Analysis for 2D visualization
   * @param {Array} tokens - Tokens to project
   * @returns {Object} 2D coordinates for visualization
   */
  pcaVisualization(tokens) {
    const vectors = tokens.map(t => this._tokenToVector(t));

    // Normalize vectors
    const normalized = this._normalizeVectors(vectors);

    // Calculate covariance matrix
    const cov = this._covarianceMatrix(normalized);

    // Get eigenvalues and eigenvectors
    const { eigenvalues, eigenvectors } = this._eigenDecomposition(cov);

    // Project onto top 2 principal components
    const projected = normalized.map(vector => {
      const pc1 = this._dotProduct(vector, eigenvectors[0]);
      const pc2 = this._dotProduct(vector, eigenvectors[1]);
      return { x: pc1, y: pc2 };
    });

    // Scale for visualization
    const scaled = this._scaleProjection(projected);

    return {
      projection: tokens.map((token, i) => ({
        token: token.name || token.hex,
        x: scaled[i].x,
        y: scaled[i].y,
        cluster: this._estimateCluster(token)
      })),
      explained: {
        pc1: eigenvalues[0].toFixed(3),
        pc2: eigenvalues[1].toFixed(3),
        total: (eigenvalues[0] + eigenvalues[1]).toFixed(3)
      }
    };
  }

  _normalizeVectors(vectors) {
    const mean = new Array(vectors[0].length).fill(0);
    const std = new Array(vectors[0].length).fill(0);

    // Calculate mean
    for (const v of vectors) {
      for (let i = 0; i < v.length; i++) {
        mean[i] += v[i];
      }
    }
    for (let i = 0; i < mean.length; i++) {
      mean[i] /= vectors.length;
    }

    // Calculate std dev
    for (const v of vectors) {
      for (let i = 0; i < v.length; i++) {
        std[i] += Math.pow(v[i] - mean[i], 2);
      }
    }
    for (let i = 0; i < std.length; i++) {
      std[i] = Math.sqrt(std[i] / vectors.length);
    }

    // Normalize
    return vectors.map(v => 
      v.map((val, i) => std[i] > 0 ? (val - mean[i]) / std[i] : 0)
    );
  }

  _covarianceMatrix(vectors) {
    const n = vectors[0].length;
    const cov = Array(n).fill(0).map(() => Array(n).fill(0));

    for (const v of vectors) {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          cov[i][j] += v[i] * v[j];
        }
      }
    }

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        cov[i][j] /= vectors.length;
      }
    }

    return cov;
  }

  _eigenDecomposition(matrix) {
    // Simplified eigendecomposition using power iteration
    const n = matrix.length;
    const eigenvalues = [];
    const eigenvectors = [];

    let A = matrix.map(row => [...row]);

    for (let k = 0; k < Math.min(2, n); k++) {
      let v = new Array(n).fill(1).map(() => Math.random());
      
      for (let iter = 0; iter < 20; iter++) {
        const Av = new Array(n).fill(0);
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            Av[i] += A[i][j] * v[j];
          }
        }

        const norm = Math.sqrt(Av.reduce((a, b) => a + b * b, 0));
        v = Av.map(x => x / norm);
      }

      const Av = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          Av[i] += A[i][j] * v[j];
        }
      }

      const lambda = this._dotProduct(v, Av);
      eigenvalues.push(Math.abs(lambda));
      eigenvectors.push(v);

      // Deflation
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          A[i][j] -= lambda * v[i] * v[j];
        }
      }
    }

    return { eigenvalues, eigenvectors };
  }

  _dotProduct(v1, v2) {
    return v1.reduce((sum, val, i) => sum + val * v2[i], 0);
  }

  _scaleProjection(points) {
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    return points.map(p => ({
      x: ((p.x - minX) / rangeX) * 100,
      y: ((p.y - minY) / rangeY) * 100
    }));
  }

  _estimateCluster(token) {
    if (token.hex) return 'color';
    if (token.value) return 'spacing';
    if (token.size) return 'typography';
    return 'other';
  }

  /**
   * PHASE 4: ARCHETYPE DETECTION
   * Identify design system type and characteristics
   */

  /**
   * Detect design system archetype
   * @param {Object} system - Design system
   * @returns {Object} Archetype classification
   */
  detectArchetype(system) {
    const features = this._extractSystemFeatures(system);
    
    return {
      primaryArchetype: this._classifyArchetype(features),
      secondaryArchetypes: this._findSimilarArchetypes(features),
      characteristics: {
        complexity: this._assessComplexity(features),
        maturity: this._assessMaturity(features),
        standardization: this._assessStandardization(features),
        scalability: this._assessScalability(features)
      },
      recommendations: this._generateArchetypeRecommendations(features)
    };
  }

  _extractSystemFeatures(system) {
    return {
      colorCount: Object.keys(system.colors || {}).length,
      typographyCount: (system.typography || []).length,
      spacingCount: Object.keys(system.spacing || {}).length,
      componentCount: Object.keys(system.components || {}).length,
      hasSemanticColors: Object.keys(system.colors || {}).some(c => 
        /primary|secondary|success|error|warning|info/i.test(c)
      ),
      hasBaseSpacing: Object.keys(system.spacing || {}).some(s =>
        /base|unit|xs/.test(s)
      ),
      documentationLevel: system.metadata?.estimatedDesignMaturity || 0
    };
  }

  _classifyArchetype(features) {
    // Enterprise: Large, comprehensive, documented
    if (features.colorCount >= 12 && features.componentCount >= 20 && features.documentationLevel >= 75) {
      return 'enterprise';
    }

    // Minimal: Small, lean, focused
    if (features.colorCount <= 6 && features.componentCount <= 10 && features.documentationLevel <= 40) {
      return 'minimal';
    }

    // Semantic: Well-named, organized, consistent
    if (features.hasSemanticColors && features.hasBaseSpacing && features.documentationLevel >= 60) {
      return 'semantic';
    }

    // Flexible: High component count, many variations
    if (features.componentCount > 25) {
      return 'flexible';
    }

    // Standard: Balanced, well-rounded
    return 'standard';
  }

  _findSimilarArchetypes(features) {
    const archetypes = [
      { name: 'enterprise', score: this._scoreEnterprise(features) },
      { name: 'minimal', score: this._scoreMinimal(features) },
      { name: 'semantic', score: this._scoreSemantic(features) },
      { name: 'flexible', score: this._scoreFlexible(features) },
      { name: 'standard', score: this._scoreStandard(features) }
    ];

    return archetypes
      .sort((a, b) => b.score - a.score)
      .slice(1, 3)
      .map(a => ({ name: a.name, confidence: a.score }));
  }

  _scoreEnterprise(f) {
    return (f.colorCount / 20) * (f.componentCount / 50) * (f.documentationLevel / 100) * 100;
  }

  _scoreMinimal(f) {
    return ((6 - Math.min(f.colorCount, 6)) / 6) * ((10 - Math.min(f.componentCount, 10)) / 10) * 100;
  }

  _scoreSemantic(f) {
    return (f.hasSemanticColors ? 50 : 0) + (f.hasBaseSpacing ? 30 : 0) + (f.documentationLevel / 2);
  }

  _scoreFlexible(f) {
    return (f.componentCount / 50) * 100;
  }

  _scoreStandard() {
    return 100; // Neutral score
  }

  _assessComplexity(features) {
    const total = features.colorCount + features.typographyCount + 
                  features.spacingCount + features.componentCount;
    
    if (total <= 20) return 'low';
    if (total <= 50) return 'medium';
    return 'high';
  }

  _assessMaturity(features) {
    return features.documentationLevel >= 70 ? 'mature' : 'developing';
  }

  _assessStandardization(features) {
    const score = (features.hasSemanticColors ? 1 : 0) + 
                  (features.hasBaseSpacing ? 1 : 0);
    return score >= 2 ? 'high' : 'low';
  }

  _assessScalability(features) {
    if (features.componentCount < 5) return 'limited';
    if (features.componentCount < 15) return 'moderate';
    return 'high';
  }

  _generateArchetypeRecommendations(features) {
    const recs = [];

    if (!features.hasSemanticColors) {
      recs.push('Introduce semantic color naming (primary, secondary, success, error)');
    }

    if (!features.hasBaseSpacing) {
      recs.push('Define a base spacing unit (e.g., 4px or 8px)');
    }

    if (features.documentationLevel < 70) {
      recs.push('Increase documentation to improve design system maturity');
    }

    return recs;
  }

  /**
   * Helper methods
   */

  _hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [0, 0, 0];
  }
}

export default DesignMLClustering;
