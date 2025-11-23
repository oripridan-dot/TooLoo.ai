#!/usr/bin/env node

import DesignMLClustering from './lib/design-ml-clustering.js';

const mlClustering = new DesignMLClustering();

const tokens = [
  { name: 'color1', hex: '#FF0000' },
  { name: 'color2', hex: '#00FF00' },
  { name: 'color3', hex: '#0000FF' }
];

console.log('Testing K-means...');
const kmeansResult = mlClustering.kMeansClustering(tokens, 2);
console.log('✅ K-means done:', kmeansResult.clusters.length);

console.log('\nTesting Hierarchical...');
try {
  const hier = mlClustering.hierarchicalClustering(tokens);
  console.log('✅ Hierarchical done:', hier.leaves);
} catch (e) {
  console.log('❌ Error:', e.message);
}

console.log('\nTesting PCA...');
const pca = mlClustering.pcaVisualization(tokens);
console.log('✅ PCA done:', pca.projection.length);

console.log('\nAll tests completed!');
