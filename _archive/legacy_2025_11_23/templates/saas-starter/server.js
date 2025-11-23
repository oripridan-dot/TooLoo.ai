const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// --- Placeholder: Database Connection ---
// const mongoose = require('mongoose');
// mongoose.connect(process.env.MONGO_URI);

// --- Placeholder: Stripe Integration ---
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.post('/api/subscribe', async (req, res) => {
  // Placeholder for Stripe subscription logic
  res.json({ success: true, message: 'Subscription endpoint ready' });
});

// Serve Frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 SaaS Starter running on http://localhost:${PORT}`);
});
