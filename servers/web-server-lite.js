// Lightweight web server for Render free tier
// Serves static assets only, no heavy dependencies
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Static web assets
const webDir = path.join(process.cwd(), 'web-app');
app.use(express.static(webDir));

// Root route - serve Control Room
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'web-app', 'control-room-home.html'));
});

// Referral page
app.get('/referral', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'web-app', 'referral.html'));
});

// Feedback page
app.get('/feedback', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'web-app', 'feedback.html'));
});

// Legal pages
app.get('/BETA-DISCLAIMER.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'web-app', 'BETA-DISCLAIMER.html'));
});

app.get('/PRIVACY-POLICY.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'web-app', 'PRIVACY-POLICY.html'));
});

app.get('/TERMS-OF-SERVICE.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'web-app', 'TERMS-OF-SERVICE.html'));
});

// Feedback submission endpoint
app.post('/api/v1/feedback/submit', (req, res) => {
  try {
    const { type, subject, description, email } = req.body;
    const timestamp = new Date().toISOString();
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    const feedbackData = {
      timestamp,
      type,
      subject,
      description,
      email: email || 'anonymous',
      userAgent
    };

    const feedbackDir = path.join(process.cwd(), 'feedback-logs');
    if (!fs.existsSync(feedbackDir)) {
      fs.mkdirSync(feedbackDir, { recursive: true });
    }

    const filename = path.join(feedbackDir, `feedback-${Date.now()}.json`);
    fs.writeFileSync(filename, JSON.stringify(feedbackData, null, 2));

    res.json({ ok: true, message: 'Feedback received', feedbackId: Date.now() });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Simple health check
app.get('/health', (req, res) => {
  res.json({ ok: true, status: 'healthy', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 TooLoo.ai Web Server running on port ${PORT}`);
});
