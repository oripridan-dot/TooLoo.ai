/**
 * Integration Tests for Reports Server
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = 'http://127.0.0.1:3008';

// Helper function to make HTTP requests
async function makeRequest(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, options);
  
  if (!response.ok && response.status !== 404 && response.status !== 400) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  
  return response;
}

test('Server health check', async () => {
  const response = await makeRequest('/health');
  const data = await response.json();
  
  assert.equal(response.status, 200);
  assert.equal(data.status, 'healthy');
  assert.equal(data.service, 'reports-server');
  assert.ok(data.uptime >= 0);
});

test('Multi-cohort comparison endpoint', async () => {
  const response = await makeRequest('/api/v1/reports/cohort-comparison?cohortA=grp1&cohortB=grp2');
  const data = await response.json();
  
  assert.equal(response.status, 200);
  assert.ok(data.cohortA);
  assert.ok(data.cohortB);
  assert.ok(data.comparison);
  assert.ok(data.metadata);
  assert.ok(data.metadata.responseTimeMs < 2000, 'Response time should be < 2 seconds');
});

test('Multi-cohort comparison requires both parameters', async () => {
  const response = await makeRequest('/api/v1/reports/cohort-comparison?cohortA=grp1');
  
  assert.equal(response.status, 400);
  const data = await response.json();
  assert.ok(data.error);
});

test('Trend analysis endpoint', async () => {
  const response = await makeRequest('/api/v1/reports/trends?period=30d&cohortId=grp1');
  const data = await response.json();
  
  assert.equal(response.status, 200);
  assert.ok(data.trends);
  assert.ok(data.anomalies);
  assert.ok(data.anomalies.specificity >= 95, 'Anomaly detection specificity should be >= 95%');
  assert.ok(data.metadata.responseTimeMs < 2000, 'Response time should be < 2 seconds');
});

test('Trend analysis handles different periods', async () => {
  const periods = ['7d', '30d', '90d'];
  
  for (const period of periods) {
    const response = await makeRequest(`/api/v1/reports/trends?period=${period}`);
    const data = await response.json();
    
    assert.equal(response.status, 200);
    assert.equal(data.period, period);
  }
});

test('Learning velocity prediction endpoint', async () => {
  const response = await makeRequest('/api/v1/reports/predict-velocity?cohortId=grp1&forecastDays=30');
  const data = await response.json();
  
  assert.equal(response.status, 200);
  assert.ok(data.prediction);
  assert.ok(data.currentVelocity);
  assert.ok(data.metadata.responseTimeMs < 2000, 'Response time should be < 2 seconds');
  
  // Check prediction accuracy requirement
  if (data.prediction.accuracy !== null) {
    assert.ok(data.prediction.accuracy >= 75, `Prediction accuracy ${data.prediction.accuracy}% should be >= 75%`);
  }
});

test('Cost-benefit analysis POST endpoint', async () => {
  const workflow = {
    workflowId: 'test-workflow-1',
    timeSavedHours: 15,
    qualityImprovementPercent: 20,
    errorReductionPercent: 25,
    aiCostDollars: 8,
    humanHourlyRate: 50,
    tasksCompleted: 10
  };
  
  const response = await makeRequest('/api/v1/reports/cost-benefit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workflow)
  });
  
  const data = await response.json();
  
  assert.equal(response.status, 200);
  assert.equal(data.workflowId, 'test-workflow-1');
  assert.ok(data.analysis);
  assert.ok(data.analysis.roi !== undefined);
  assert.ok(data.analysis.roiCategory);
  assert.ok(data.metadata.responseTimeMs < 2000, 'Response time should be < 2 seconds');
});

test('Cost-benefit analysis GET endpoint', async () => {
  const response = await makeRequest('/api/v1/reports/cost-benefit/workflow-123');
  const data = await response.json();
  
  assert.equal(response.status, 200);
  assert.equal(data.workflowId, 'workflow-123');
  assert.ok(data.analysis);
  assert.ok(data.workflow);
});

test('Peer profiles - list all', async () => {
  const response = await makeRequest('/api/v1/reports/peer-profiles');
  const data = await response.json();
  
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(data.profiles));
  assert.ok(data.count !== undefined);
  assert.ok(data.metadata.responseTimeMs < 2000, 'Response time should be < 2 seconds');
});

test('Peer profiles - create and retrieve', async () => {
  const profile = {
    peerId: 'test-peer-1',
    name: 'Test Peer',
    skillLevel: 'intermediate',
    avgAccuracy: 0.87,
    tasksCompleted: 25
  };
  
  // Create profile
  const createResponse = await makeRequest('/api/v1/reports/peer-profiles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile)
  });
  
  const createData = await createResponse.json();
  
  assert.equal(createResponse.status, 200);
  assert.equal(createData.success, true);
  assert.equal(createData.profile.peerId, 'test-peer-1');
  assert.ok(createData.metadata.responseTimeMs < 2000, 'Response time should be < 2 seconds');
  
  // Retrieve profile
  const getResponse = await makeRequest('/api/v1/reports/peer-profiles/test-peer-1');
  const getData = await getResponse.json();
  
  assert.equal(getResponse.status, 200);
  assert.equal(getData.profile.peerId, 'test-peer-1');
  assert.equal(getData.profile.name, 'Test Peer');
});

test('Peer profiles - update existing', async () => {
  const profile = {
    peerId: 'test-peer-2',
    name: 'Test Peer 2',
    skillLevel: 'beginner'
  };
  
  // Create
  await makeRequest('/api/v1/reports/peer-profiles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile)
  });
  
  // Update
  const updatedProfile = { ...profile, skillLevel: 'advanced' };
  const updateResponse = await makeRequest('/api/v1/reports/peer-profiles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedProfile)
  });
  
  const updateData = await updateResponse.json();
  
  assert.equal(updateResponse.status, 200);
  assert.equal(updateData.action, 'updated');
  assert.equal(updateData.profile.skillLevel, 'advanced');
});

test('Peer profiles - delete', async () => {
  const profile = {
    peerId: 'test-peer-delete',
    name: 'To Be Deleted'
  };
  
  // Create
  await makeRequest('/api/v1/reports/peer-profiles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile)
  });
  
  // Delete
  const deleteResponse = await makeRequest('/api/v1/reports/peer-profiles/test-peer-delete', {
    method: 'DELETE'
  });
  
  const deleteData = await deleteResponse.json();
  
  assert.equal(deleteResponse.status, 200);
  assert.equal(deleteData.success, true);
  assert.equal(deleteData.action, 'deleted');
  
  // Verify it's gone
  const getResponse = await makeRequest('/api/v1/reports/peer-profiles/test-peer-delete');
  assert.equal(getResponse.status, 404);
});

test('Dashboard endpoint', async () => {
  const response = await makeRequest('/api/v1/reports/dashboard?cohortId=grp1');
  const data = await response.json();
  
  assert.equal(response.status, 200);
  assert.ok(data.overview);
  assert.ok(data.trends);
  assert.ok(data.prediction);
  assert.ok(data.anomalies);
  assert.ok(data.metadata.responseTimeMs < 2000, 'Response time should be < 2 seconds');
});

test('All endpoints respond within 2 seconds', async () => {
  const endpoints = [
    '/health',
    '/api/v1/reports/cohort-comparison?cohortA=g1&cohortB=g2',
    '/api/v1/reports/trends?period=30d',
    '/api/v1/reports/predict-velocity?cohortId=g1',
    '/api/v1/reports/cost-benefit/workflow-1',
    '/api/v1/reports/peer-profiles',
    '/api/v1/reports/dashboard?cohortId=g1'
  ];
  
  for (const endpoint of endpoints) {
    const startTime = Date.now();
    const response = await makeRequest(endpoint);
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    assert.ok(responseTime < 2000, `${endpoint} took ${responseTime}ms, should be < 2000ms`);
  }
});
