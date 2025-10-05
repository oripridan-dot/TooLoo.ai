const fs = require('fs').promises;
const path = require('path');

/**
 * Trainer - Manage training data from real-world examples
 * 
 * Purpose: Learn from best-in-class apps to generate higher quality prototypes
 */
class Trainer {
  constructor() {
    this.trainingDir = path.join(process.cwd(), 'simulator', 'training');
    this.dataFile = path.join(this.trainingDir, 'training-data.json');
    this.data = {};
  }

  /**
   * Initialize training system and load existing data
   */
  async initialize() {
    await fs.mkdir(this.trainingDir, { recursive: true });
    
    // Load existing training data or create default
    this.data = await this.loadData();
    
    console.log(`📚 Training Manager initialized with ${this.getExampleCount()} examples`);
  }

  /**
   * Load training data from disk
   * @private
   */
  async loadData() {
    try {
      const content = await fs.readFile(this.dataFile, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.log('📝 No existing training data, creating defaults...');
      return this.getDefaultTrainingData();
    }
  }

  /**
   * Default training examples (best-in-class apps)
   * @private
   */
  getDefaultTrainingData() {
    return {
      'task-manager': {
        name: 'Linear-style Task Manager',
        description: 'Clean, keyboard-first task management with excellent UX',
        patterns: {
          layout: 'Sidebar navigation + main content area + command palette (cmd+k)',
          colors: '#5E6AD2 (primary purple), #E5E5E5 (neutral gray), clean white background',
          interactions: 'Keyboard shortcuts everywhere, drag-drop tasks, inline editing, instant search'
        },
        referenceUrl: 'https://linear.app',
        category: 'productivity',
        quality: 'world-class'
      },
      'music-collab': {
        name: 'Splice-style Music Collaboration',
        description: 'Audio file management with waveform visualization and real-time collaboration',
        patterns: {
          layout: 'File browser sidebar + large waveform viewer + playback controls bottom',
          colors: '#09B6F2 (cyan accent), #1A1A1A (dark theme), vibrant waveforms',
          interactions: 'Drag-drop upload, waveform scrubbing, real-time audio preview, collaborative editing'
        },
        referenceUrl: 'https://splice.com',
        category: 'music-tools',
        quality: 'world-class'
      },
      'email-client': {
        name: 'Superhuman-style Email Client',
        description: 'Fast, keyboard-driven email with exceptional attention to detail',
        patterns: {
          layout: 'Three-column layout: folders, thread list, email content',
          colors: 'Clean whites, subtle grays, accent color for important actions',
          interactions: 'Vim-like keyboard shortcuts, instant search, split inbox, email scheduling'
        },
        referenceUrl: 'https://superhuman.com',
        category: 'productivity',
        quality: 'world-class'
      },
      'developer-docs': {
        name: 'Stripe-style Documentation',
        description: 'Beautiful, interactive API documentation with code examples',
        patterns: {
          layout: 'Sticky sidebar navigation + main content + live code examples on right',
          colors: '#635BFF (Stripe purple), clean white background, syntax-highlighted code',
          interactions: 'Tabbed code examples (multiple languages), copy buttons, search with shortcuts'
        },
        referenceUrl: 'https://stripe.com/docs',
        category: 'developer-tools',
        quality: 'world-class'
      },
      'landing-page': {
        name: 'Vercel-style Landing Page',
        description: 'Modern, minimal landing page with smooth animations',
        patterns: {
          layout: 'Hero section + features grid + testimonials + CTA',
          colors: 'Black background, white text, subtle gradients, neon accents',
          interactions: 'Smooth scroll animations, hover effects, gradient text, video backgrounds'
        },
        referenceUrl: 'https://vercel.com',
        category: 'marketing',
        quality: 'world-class'
      }
    };
  }

  /**
   * Save training data to disk
   * @private
   */
  async saveData() {
    await fs.writeFile(
      this.dataFile, 
      JSON.stringify(this.data, null, 2), 
      'utf8'
    );
  }

  /**
   * Add new training example
   */
  async addExample(key, example) {
    this.data[key] = {
      ...example,
      addedAt: new Date().toISOString()
    };
    
    await this.saveData();
    console.log(`✅ Added training example: ${key}`);
  }

  /**
   * Find best matching training example for a description
   */
  findBestMatch(description, inspiration) {
    const desc = description.toLowerCase();
    
    // 1. Check if inspiration is directly specified
    if (inspiration && this.data[inspiration]) {
      console.log(`🎯 Using specified inspiration: ${this.data[inspiration].name}`);
      return this.data[inspiration];
    }
    
    // 2. Match by keywords
    const keywordMap = {
      'task-manager': ['task', 'project', 'todo', 'kanban', 'board'],
      'music-collab': ['music', 'audio', 'sound', 'collab', 'waveform'],
      'email-client': ['email', 'inbox', 'message', 'mail'],
      'developer-docs': ['docs', 'documentation', 'api', 'reference'],
      'landing-page': ['landing', 'homepage', 'marketing', 'hero']
    };
    
    for (const [key, keywords] of Object.entries(keywordMap)) {
      if (keywords.some(kw => desc.includes(kw))) {
        console.log(`🎯 Auto-matched to: ${this.data[key].name}`);
        return this.data[key];
      }
    }
    
    console.log('ℹ️  No specific match found, using general best practices');
    return null;
  }

  /**
   * Get all training examples
   */
  getAllExamples() {
    return this.data;
  }

  /**
   * Get examples by category
   */
  getByCategory(category) {
    return Object.entries(this.data)
      .filter(([_, example]) => example.category === category)
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {});
  }

  /**
   * Get count of training examples
   */
  getExampleCount() {
    return Object.keys(this.data).length;
  }

  /**
   * Export training data as JSON
   */
  async export() {
    return JSON.stringify(this.data, null, 2);
  }

  /**
   * Import training data from JSON
   */
  async import(jsonData) {
    try {
      const imported = JSON.parse(jsonData);
      this.data = { ...this.data, ...imported };
      await this.saveData();
      
      console.log(`✅ Imported ${Object.keys(imported).length} training examples`);
      return true;
    } catch (error) {
      console.error('❌ Import failed:', error);
      return false;
    }
  }
}

module.exports = Trainer;
