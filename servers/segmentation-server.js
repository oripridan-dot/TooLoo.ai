import express from 'express';
import OpenAI from 'openai';

/**
 * Segmentation Server - Semantic Segmentation with Embeddings
 * 
 * Provides advanced semantic segmentation using:
 * - Embeddings-based clustering (OpenAI text-embedding-3-small)
 * - Multi-turn context preservation
 * - Trait extraction and profiling
 * - Cross-conversation linking
 * - Confidence scoring for boundaries
 */

class SemanticSegmentationEngine {
  constructor(options = {}) {
    this.openai = options.openai || null;
    this.embeddingModel = options.embeddingModel || 'text-embedding-3-small';
    this.similarityThreshold = options.similarityThreshold || 0.7;
    this.maxSegmentSize = options.maxSegmentSize || 5; // messages per segment
    this.cache = new Map(); // Simple in-memory cache for embeddings
  }

  /**
   * Generate embedding for text using OpenAI
   */
  async generateEmbedding(text) {
    if (!this.openai) {
      throw new Error('OpenAI client not configured');
    }

    // Check cache first
    const cacheKey = `emb:${text}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await this.openai.embeddings.create({
        model: this.embeddingModel,
        input: text,
      });
      
      const embedding = response.data[0].embedding;
      this.cache.set(cacheKey, embedding);
      return embedding;
    } catch (error) {
      console.error('Error generating embedding:', error.message);
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    // Handle zero vectors to prevent division by zero
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    // Use small epsilon for floating-point precision
    if (denominator < 1e-10) {
      return 0;
    }

    return dotProduct / denominator;
  }

  /**
   * Extract traits from message content using pattern matching and semantic analysis
   */
  async extractTraits(messages) {
    const traits = {
      interests: [],
      skills: [],
      preferences: [],
      topics: [],
      sentiment: 'neutral'
    };

    // Pattern-based trait extraction
    const patterns = {
      interests: /\b(interested in|want to learn|curious about|love|enjoy)\s+([^.,!?]+)/gi,
      skills: /\b(expert in|know|proficient in|experienced with)\s+([^.,!?]+)/gi,
      preferences: /\b(prefer|like|dislike|hate)\s+([^.,!?]+)/gi,
    };

    for (const msg of messages) {
      const content = msg.content || '';
      
      // Extract using patterns
      for (const [category, pattern] of Object.entries(patterns)) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const trait = match[2].trim().toLowerCase();
          if (trait && !traits[category].includes(trait)) {
            traits[category].push(trait);
          }
        }
      }

      // Extract topics using simple keyword extraction
      const words = content.toLowerCase().split(/\s+/);
      const topicKeywords = words.filter(w => 
        w.length > 4 && 
        !['about', 'would', 'could', 'should', 'there', 'their', 'those'].includes(w)
      );
      
      for (const topic of topicKeywords) {
        if (!traits.topics.includes(topic)) {
          traits.topics.push(topic);
        }
      }

      // Simple sentiment analysis
      const positiveWords = ['great', 'good', 'love', 'excellent', 'wonderful', 'amazing'];
      const negativeWords = ['bad', 'hate', 'terrible', 'awful', 'horrible', 'poor'];
      
      const lowerContent = content.toLowerCase();
      const hasPositive = positiveWords.some(w => lowerContent.includes(w));
      const hasNegative = negativeWords.some(w => lowerContent.includes(w));
      
      if (hasPositive && !hasNegative) traits.sentiment = 'positive';
      else if (hasNegative && !hasPositive) traits.sentiment = 'negative';
    }

    // Limit array sizes
    traits.interests = traits.interests.slice(0, 10);
    traits.skills = traits.skills.slice(0, 10);
    traits.preferences = traits.preferences.slice(0, 10);
    traits.topics = traits.topics.slice(0, 15);

    return traits;
  }

  /**
   * Perform semantic segmentation on messages
   */
  async segmentMessages(messages) {
    if (!messages || messages.length === 0) {
      return { segments: [], traits: {}, performance: {} };
    }

    const startTime = Date.now();
    const segments = [];
    let currentSegment = {
      messages: [],
      embedding: null,
      topics: [],
      confidence: 0,
      startIndex: 0,
      endIndex: 0
    };

    // Generate embeddings for all messages
    const messageEmbeddings = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const text = `${msg.role}: ${msg.content}`;
      
      try {
        const embedding = await this.generateEmbedding(text);
        messageEmbeddings.push({ index: i, embedding, message: msg });
      } catch (error) {
        console.error(`Error embedding message ${i}:`, error.message);
        // Use null for failed embeddings
        messageEmbeddings.push({ index: i, embedding: null, message: msg });
      }
    }

    // Segment based on semantic similarity
    for (let i = 0; i < messageEmbeddings.length; i++) {
      const current = messageEmbeddings[i];
      
      if (current.embedding === null) {
        // Skip messages without embeddings
        continue;
      }

      if (currentSegment.messages.length === 0) {
        // Start new segment
        currentSegment.messages.push(current.message);
        currentSegment.embedding = current.embedding;
        currentSegment.startIndex = i;
        currentSegment.endIndex = i;
      } else {
        // Check similarity with current segment
        const similarity = this.cosineSimilarity(
          current.embedding,
          currentSegment.embedding
        );

        const shouldCreateNewSegment = 
          similarity < this.similarityThreshold ||
          currentSegment.messages.length >= this.maxSegmentSize;

        if (shouldCreateNewSegment) {
          // Finalize current segment
          currentSegment.confidence = this.calculateSegmentConfidence(currentSegment);
          currentSegment.topics = await this.extractTopicsFromSegment(currentSegment);
          segments.push({ ...currentSegment });

          // Start new segment
          currentSegment = {
            messages: [current.message],
            embedding: current.embedding,
            topics: [],
            confidence: 0,
            startIndex: i,
            endIndex: i
          };
        } else {
          // Add to current segment and update embedding (weighted average)
          currentSegment.messages.push(current.message);
          currentSegment.endIndex = i;
          
          // Update segment embedding as weighted average
          const weight = 1 / currentSegment.messages.length;
          currentSegment.embedding = currentSegment.embedding.map((val, idx) => 
            val * (1 - weight) + current.embedding[idx] * weight
          );
        }
      }
    }

    // Add final segment if not empty
    if (currentSegment.messages.length > 0) {
      currentSegment.confidence = this.calculateSegmentConfidence(currentSegment);
      currentSegment.topics = await this.extractTopicsFromSegment(currentSegment);
      segments.push(currentSegment);
    }

    // Extract overall traits
    const traits = await this.extractTraits(messages);

    // Cross-conversation linking
    const crossConversationLinks = this.findCrossConversationLinks(segments);

    const performance = {
      processingTime: Date.now() - startTime,
      messageCount: messages.length,
      segmentCount: segments.length
    };

    return {
      segments: segments.map(seg => ({
        messages: seg.messages,
        topics: seg.topics,
        confidence: seg.confidence,
        startIndex: seg.startIndex,
        endIndex: seg.endIndex,
        messageCount: seg.messages.length
      })),
      traits,
      crossConversationLinks,
      performance
    };
  }

  /**
   * Calculate confidence score for a segment
   */
  calculateSegmentConfidence(segment) {
    if (segment.messages.length === 0) return 0;
    
    // Base confidence on segment size and coherence
    const sizeScore = Math.min(segment.messages.length / this.maxSegmentSize, 1);
    const coherenceScore = 0.8; // Placeholder - would be calculated from similarity scores
    
    return parseFloat((sizeScore * 0.4 + coherenceScore * 0.6).toFixed(2));
  }

  /**
   * Extract topics from a segment
   */
  async extractTopicsFromSegment(segment) {
    const topics = new Set();
    
    for (const msg of segment.messages) {
      const content = (msg.content || '').toLowerCase();
      const words = content.split(/\s+/).filter(w => w.length > 4);
      
      // Simple topic extraction - take meaningful words
      words.slice(0, 5).forEach(w => topics.add(w));
    }
    
    return Array.from(topics).slice(0, 5);
  }

  /**
   * Find links between segments across conversations
   */
  findCrossConversationLinks(segments) {
    const links = [];
    
    // Compare each segment with others
    for (let i = 0; i < segments.length; i++) {
      for (let j = i + 1; j < segments.length; j++) {
        const segA = segments[i];
        const segB = segments[j];
        
        if (!segA.embedding || !segB.embedding) continue;
        
        const similarity = this.cosineSimilarity(segA.embedding, segB.embedding);
        
        if (similarity > this.similarityThreshold) {
          links.push({
            segment1: i,
            segment2: j,
            similarity: similarity.toFixed(3),
            commonTopics: this.findCommonTopics(segA.topics, segB.topics)
          });
        }
      }
    }
    
    return links;
  }

  /**
   * Find common topics between two segments
   */
  findCommonTopics(topicsA, topicsB) {
    return topicsA.filter(t => topicsB.includes(t));
  }
}

// Express server setup
const app = express();
app.use(express.json());

const PORT = process.env.SEGMENTATION_PORT || 3007;

// Initialize OpenAI client if API key is available
let openaiClient = null;
if (process.env.OPENAI_API_KEY) {
  openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

const segmentationEngine = new SemanticSegmentationEngine({
  openai: openaiClient,
  similarityThreshold: 0.7,
  maxSegmentSize: 5
});

// Health check endpoint
app.get('/api/v1/segmentation/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'semantic-segmentation',
    openaiConfigured: !!openaiClient,
    version: '1.0.0'
  });
});

// Main segmentation endpoint
app.post('/api/v1/segmentation/analyze', async (req, res) => {
  try {
    const { messages, options = {} } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'messages array is required'
      });
    }

    if (!openaiClient) {
      return res.status(503).json({
        error: 'Service not configured',
        message: 'OpenAI API key not configured. Set OPENAI_API_KEY environment variable.'
      });
    }

    // Validate messages format
    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        return res.status(400).json({
          error: 'Invalid message format',
          message: 'Each message must have role and content fields'
        });
      }
    }

    // Perform segmentation
    const result = await segmentationEngine.segmentMessages(messages);

    // Check performance requirement (< 500ms)
    if (result.performance.processingTime > 500) {
      console.warn(`Performance threshold exceeded: ${result.performance.processingTime}ms`);
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Segmentation error:', error);
    res.status(500).json({
      error: 'Segmentation failed',
      message: error.message
    });
  }
});

// Start server only if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, () => {
    console.log(`🧠 Semantic Segmentation Server running on port ${PORT}`);
    console.log(`📊 OpenAI configured: ${!!openaiClient}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/v1/segmentation/health`);
  });
}

export { SemanticSegmentationEngine, app };
