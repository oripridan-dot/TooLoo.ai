/**
 * Emotion Detection Engine
 * Analyzes emotional nuance, sentiment, and tone in user messages
 * Integrates with User Model Engine for personalized responses
 */

export default class EmotionDetectionEngine {
  constructor() {
    // Emotion lexicons and patterns
    this.emotionKeywords = {
      joy: ['happy', 'excited', 'delighted', 'fantastic', 'amazing', 'wonderful', 'love', 'brilliant'],
      sadness: ['sad', 'disappointed', 'unhappy', 'depressed', 'down', 'blue', 'terrible', 'awful'],
      anger: ['angry', 'furious', 'outraged', 'mad', 'irritated', 'frustrated', 'annoyed'],
      fear: ['scared', 'afraid', 'worried', 'anxious', 'nervous', 'terrified', 'concerned'],
      surprise: ['shocked', 'surprised', 'astonished', 'amazed', 'stunned', 'unexpected'],
      disgust: ['disgusted', 'gross', 'repulsed', 'nasty', 'horrible', 'yuck'],
      trust: ['confident', 'assured', 'believe', 'trust', 'certain', 'sure'],
      anticipation: ['excited', 'looking forward', 'can\'t wait', 'anticipating', 'expecting']
    };

    this.sentimentShifts = {
      intensifiers: ['very', 'extremely', 'absolutely', 'incredibly', 'totally', 'completely'],
      negations: ['not', 'no', 'never', 'hardly', 'barely', 'couldn\'t'],
      questions: ['?'],
      exclamations: ['!'],
      sarcasm: ['sure', 'right', 'yeah', 'great', 'oh sure']
    };

    this.nuancePatterns = {
      sarcasm: /^(sure|right|yeah|great|oh sure|obviously|clearly)/i,
      irony: /^(ironically|funny enough|interestingly)/i,
      metaphor: /\blike\s|as\s\w+\sas\b|\bmetaphorically/i,
      understatement: /^(somewhat|kind of|sort of|rather|quite)/i,
      exaggeration: /^(absolutely|completely|totally|literally)/i
    };
  }

  /**
   * Analyze emotional content in text
   */
  analyzeEmotion(text) {
    if (!text) {
      return {
        primary: 'neutral',
        secondary: [],
        sentiment: 'neutral',
        intensity: 0.5,
        confidence: 0
      };
    }

    const lowerText = text.toLowerCase();

    // Detect primary emotion
    const emotionScores = {};
    for (const [emotion, keywords] of Object.entries(this.emotionKeywords)) {
      emotionScores[emotion] = keywords.filter(kw => lowerText.includes(kw)).length;
    }

    const primary = Object.entries(emotionScores)
      .sort(([, a], [, b]) => b - a)
      .find(([, score]) => score > 0)?.[0] || 'neutral';

    // Detect secondary emotions
    const secondary = Object.entries(emotionScores)
      .filter(([emotion, score]) => emotion !== primary && score > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([emotion]) => emotion);

    // Calculate sentiment
    const sentiment = this.calculateSentiment(text);

    // Assess intensity
    const intensity = this.assessIntensity(text);

    // Detect nuance
    const nuance = this.detectNuance(text);

    // Calculate confidence
    const confidence = Math.min(0.99, Math.max(0.3, (emotionScores[primary] || 0) / Math.max(1, text.split(' ').length)));

    return {
      primary,
      secondary,
      sentiment,
      intensity,
      nuance,
      confidence,
      emotionScores,
      recommendations: this.generateEmotionalRecommendations(primary, sentiment, intensity)
    };
  }

  /**
   * Calculate sentiment (positive/negative/neutral)
   */
  calculateSentiment(text) {
    const lowerText = text.toLowerCase();

    const positiveWords = ['good', 'great', 'excellent', 'fantastic', 'love', 'amazing', 'wonderful', 'brilliant'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'disappointing', 'useless'];

    const posCount = positiveWords.filter(w => lowerText.includes(w)).length;
    const negCount = negativeWords.filter(w => lowerText.includes(w)).length;

    if (posCount > negCount + 1) return 'positive';
    if (negCount > posCount + 1) return 'negative';
    return 'neutral';
  }

  /**
   * Assess emotional intensity (0-1)
   */
  assessIntensity(text) {
    let intensity = 0.5; // baseline

    // Exclamation marks increase intensity
    const exclamations = (text.match(/!/g) || []).length;
    intensity += exclamations * 0.15;

    // Multiple question marks
    const questions = (text.match(/\?/g) || []).length;
    if (questions > 2) intensity += 0.2;

    // ALL CAPS words
    const capsWords = (text.match(/\b[A-Z]{3,}\b/g) || []).length;
    intensity += capsWords * 0.1;

    // Intensifier words
    const intensifiers = this.sentimentShifts.intensifiers.filter(i => text.toLowerCase().includes(i)).length;
    intensity += intensifiers * 0.1;

    // Negations
    const negations = this.sentimentShifts.negations.filter(n => text.toLowerCase().includes(n)).length;
    if (negations > 0) intensity += 0.1;

    return Math.min(1, intensity);
  }

  /**
   * Detect nuanced expression types
   */
  detectNuance(text) {
    for (const [nuanceType, pattern] of Object.entries(this.nuancePatterns)) {
      if (pattern.test(text)) {
        return nuanceType;
      }
    }
    return 'literal';
  }

  /**
   * Generate recommendations for responding to emotion
   */
  generateEmotionalRecommendations(emotion, sentiment, intensity) {
    const recommendations = [];

    // Tone recommendations
    if (emotion === 'anger' || emotion === 'frustration') {
      recommendations.push('Consider empathetic, calm tone');
      recommendations.push('Offer concrete solutions');
    } else if (emotion === 'fear') {
      recommendations.push('Provide reassurance and clarity');
      recommendations.push('Explain step-by-step process');
    } else if (emotion === 'sadness') {
      recommendations.push('Show empathy and understanding');
      recommendations.push('Offer supportive guidance');
    } else if (emotion === 'joy') {
      recommendations.push('Match enthusiasm level');
      recommendations.push('Reinforce positive momentum');
    }

    // Intensity recommendations
    if (intensity > 0.8) {
      recommendations.push('High emotional intensity - provide careful, detailed response');
    }

    // Sentiment-based recommendations
    if (sentiment === 'negative') {
      recommendations.push('Acknowledge concerns before providing solutions');
    }

    return recommendations;
  }

  /**
   * Detect sentiment shifts within longer text
   */
  analyzeSentimentArc(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());

    if (sentences.length < 2) {
      return { arc: 'flat', startSentiment: this.calculateSentiment(text) };
    }

    const sentiments = sentences.map(s => this.calculateSentiment(s));
    const start = sentiments[0];
    const end = sentiments[sentiments.length - 1];

    let arc = 'flat';
    if (sentiments.every(s => s === start)) {
      arc = 'flat';
    } else if (start === 'negative' && end === 'positive') {
      arc = 'improvement';
    } else if (start === 'positive' && end === 'negative') {
      arc = 'decline';
    } else if (sentiments.some(s => s !== start)) {
      arc = 'mixed';
    }

    return {
      arc,
      startSentiment: start,
      endSentiment: end,
      sentiments,
      sentences
    };
  }

  /**
   * User emotional state tracking for personalization
   */
  trackEmotionalState(userId, emotion, sentiment, timestamp = new Date().toISOString()) {
    return {
      userId,
      emotion,
      sentiment,
      timestamp,
      trackedAt: new Date().getTime()
    };
  }

  /**
   * Predict appropriate response tone based on detected emotion
   */
  suggestResponseTone(detectedEmotion) {
    const toneMap = {
      joy: 'uplifting, encouraging',
      sadness: 'empathetic, supportive',
      anger: 'calm, solution-focused',
      fear: 'reassuring, clear',
      surprise: 'engaging, informative',
      disgust: 'respectful, solution-oriented',
      trust: 'confident, knowledgeable',
      anticipation: 'collaborative, forward-looking',
      neutral: 'professional, balanced'
    };

    return toneMap[detectedEmotion] || toneMap.neutral;
  }
}
