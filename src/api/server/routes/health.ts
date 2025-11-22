import express from 'express';

export function setupHealthRoutes(app) {
  // Health check endpoint
  app.get('/api/v1/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      time: new Date().toISOString(),
      version: '2.0.0',
      modules: ['server', 'skills', 'evaluation', 'auto-teach', 'store']
    });
  });

  // System status with more detail
  app.get('/api/v1/system/status', (req, res) => {
    res.json({
      status: 'operational',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      platform: process.platform,
      node: process.version,
      architecture: 'modular-v2',
      capabilities: {
        segmentation: true,
        analysis: true,
        benchmarks: true,
        auto_teach: true,
        modalities: {
          vision: false,
          audio_in: false,
          voice_out: false
        }
      }
    });
  });
}