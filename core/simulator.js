const fs = require('fs').promises;
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

/**
 * Simulator - Generate interactive HTML prototypes before building real code
 * 
 * Purpose: Test UX/feel without coding, iterate quickly, approve designs first
 */
class Simulator {
  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp', 'prototypes');
    this.anthropic = new Anthropic({ 
      apiKey: process.env.ANTHROPIC_API_KEY 
    });
  }

  /**
   * Generate interactive HTML prototype
   * @param {string} description - User's description of what to build
   * @param {string} inspiration - Reference app (e.g., 'linear', 'splice')
   * @param {Object} trainer - Training data manager
   * @param {Function} progressCallback - Optional callback for progress updates
   * @returns {Object} - { url, filepath, inspiration, timestamp }
   */
  async generate(description, inspiration, trainer, progressCallback = null) {
    console.log(`🎬 Generating prototype for: "${description}"`);
    
    // Create temp directory if it doesn't exist
    await fs.mkdir(this.tempDir, { recursive: true });
    
    try {
      // 1. Find matching training example
      if (progressCallback) {
        progressCallback({ phase: 'analyzing', progress: 20, message: 'Analyzing request and finding best practices...' });
      }
      const trainingExample = trainer ? trainer.findBestMatch(description, inspiration) : null;
      
      // 2. Build enhanced prompt with training data
      if (progressCallback) {
        progressCallback({ phase: 'planning', progress: 40, message: 'Planning prototype structure...' });
      }
      const prompt = this.buildPrompt(description, trainingExample);
      
      // 3. Generate HTML prototype with Claude
      if (progressCallback) {
        progressCallback({ phase: 'generating', progress: 60, message: 'Generating interactive prototype...' });
      }
      const html = await this.generateHTML(prompt);
      
      // 4. Save prototype to disk
      if (progressCallback) {
        progressCallback({ phase: 'finalizing', progress: 80, message: 'Saving prototype...' });
      }
      const filename = `proto-${Date.now()}.html`;
      const filepath = path.join(this.tempDir, filename);
      await fs.writeFile(filepath, html, 'utf8');
      
      if (progressCallback) {
        progressCallback({ phase: 'complete', progress: 100, message: 'Prototype ready!' });
      }
      
      console.log(`✅ Prototype saved: ${filename}`);
      
      return {
        url: `/temp/prototypes/${filename}`,
        filepath,
        inspiration: trainingExample?.name || 'Custom',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Simulation failed:', error);
      throw error;
    }
  }

  /**
   * Build prompt with training data context
   * @private
   */
  buildPrompt(description, trainingExample) {
    const context = trainingExample ? `

📚 TRAINING REFERENCE: ${trainingExample.name}
Description: ${trainingExample.description}

Design Patterns:
- Layout: ${trainingExample.patterns.layout}
- Color Scheme: ${trainingExample.patterns.colors}
- Interactions: ${trainingExample.patterns.interactions}
- Reference URL: ${trainingExample.referenceUrl}

Use this as INSPIRATION to match the quality and polish level.
` : '';

    return `Generate a FULLY INTERACTIVE HTML prototype for:

"${description}"
${context}

CRITICAL REQUIREMENTS:
1. Single HTML file with inline CSS and JavaScript (use Tailwind CDN only)
2. MUST be fully interactive - buttons click, inputs work, animations run smoothly
3. Use realistic mock data (no "Lorem Ipsum" or placeholder text)
4. Match professional app quality (like Linear, Superhuman, or Stripe)
5. Include smooth CSS animations and transitions (60fps)
6. Responsive design that works on mobile and desktop
7. Dark mode support (if applicable to the design)
8. Add keyboard shortcuts and document them at the bottom

FORBIDDEN:
- Do NOT use placeholder text like "Coming soon" or "Feature goes here"
- Do NOT include TODO comments or incomplete sections
- Do NOT use generic Lorem Ipsum data
- Do NOT output explanations or markdown - ONLY HTML code

OUTPUT: The complete HTML code only, nothing else.`;
  }

  /**
   * Generate HTML using Claude Sonnet 4
   * @private
   */
  async generateHTML(prompt) {
    console.log('🤖 Calling Claude Sonnet 4 for prototype generation...');
    
    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    let html = response.content[0].text;
    
    // Clean up markdown code fences if present
    html = html.replace(/```html\n?/g, '').replace(/```\n?$/g, '').trim();
    
    console.log(`✅ Generated ${html.length} characters of HTML`);
    
    return html;
  }

  /**
   * List all generated prototypes
   */
  async listPrototypes() {
    try {
      const files = await fs.readdir(this.tempDir);
      const htmlFiles = files.filter(f => f.endsWith('.html'));
      
      const prototypes = await Promise.all(
        htmlFiles.map(async (filename) => {
          const filepath = path.join(this.tempDir, filename);
          const stats = await fs.stat(filepath);
          
          return {
            filename,
            url: `/temp/prototypes/${filename}`,
            created: stats.birthtime,
            size: stats.size
          };
        })
      );
      
      return prototypes.sort((a, b) => b.created - a.created);
    } catch (error) {
      console.warn('⚠️  Could not list prototypes:', error.message);
      return [];
    }
  }

  /**
   * Delete old prototypes (cleanup)
   */
  async cleanup(olderThanDays = 7) {
    try {
      const files = await fs.readdir(this.tempDir);
      const cutoffDate = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
      
      let deletedCount = 0;
      
      for (const filename of files) {
        const filepath = path.join(this.tempDir, filename);
        const stats = await fs.stat(filepath);
        
        if (stats.birthtime < cutoffDate) {
          await fs.unlink(filepath);
          deletedCount++;
        }
      }
      
      console.log(`🗑️  Cleaned up ${deletedCount} old prototypes`);
      return deletedCount;
      
    } catch (error) {
      console.warn('⚠️  Cleanup failed:', error.message);
      return 0;
    }
  }
}

module.exports = Simulator;
