import path from 'path';

export function setupDashboardRoutes(app) {
  // Serve main dashboard
  app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'web-app', 'outcomes-dashboard.html'));
  });

  // Dashboard configuration
  app.get('/api/v1/dashboard/config', (req, res) => {
    res.json({
      title: 'TooLoo.ai Outcomes',
      version: '2.0.0',
      features: {
        metrics: true,
        backlog: true,
        analysis: true,
        benchmarks: true,
        auto_teach: true,
        modalities: false
      },
      refresh_interval: 30000,
      api_base: process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001'
    });
  });

  // Dashboard widgets data
  app.get('/api/v1/dashboard/widgets', (req, res) => {
    res.json({
      summary: {
        total_sessions: 156,
        accuracy_trend: '+5.2%',
        knowledge_items: 2847,
        active_benchmarks: 3
      },
      alerts: [
        { type: 'info', message: 'New benchmark run completed', timestamp: Date.now() - 300000 },
        { type: 'success', message: 'Auto-teach improved health domain accuracy', timestamp: Date.now() - 1800000 }
      ]
    });
  });
}