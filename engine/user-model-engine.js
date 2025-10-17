import { promises as fs } from 'fs';
import path from 'path';

/**
 * User Model Engine - Phase 2 Evolution Component
 * Deep behavioral modeling and personalization across all conversations
 */
export default class UserModelEngine {
  constructor(options = {}) {
    this.workspaceRoot = options.workspaceRoot || process.cwd();
    this.dataDir = path.join(this.workspaceRoot, 'data', 'user-models');
    this.modelsFile = path.join(this.dataDir, 'user-models.json');
    this.behaviorFile = path.join(this.dataDir, 'behavior-patterns.json');
    this.skillFile = path.join(this.dataDir, 'skill-progression.json');
    
    // Deep user modeling structures
    this.userModels = new Map();
    this.behaviorPatterns = {
      communicationStyle: new Map(),
      learningPreferences: new Map(),
      problemSolvingApproach: new Map(),
      codeStyle: new Map(),
      projectPatterns: new Map()
    };
    
    this.skillProgression = {
      languages: new Map(),
      frameworks: new Map(),
      concepts: new Map(),
      complexity: new Map()
    };
    
    this.loadUserModels();
  }

  async loadUserModels() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      
      // Load user models
      try {
        const modelsData = await fs.readFile(this.modelsFile, 'utf8');
        const models = JSON.parse(modelsData);
        this.userModels = new Map(models.userModels || []);
      } catch (error) {
        console.log('No existing user models found, starting fresh');
      }
      
      // Load behavior patterns
      try {
        const behaviorData = await fs.readFile(this.behaviorFile, 'utf8');
        const behavior = JSON.parse(behaviorData);
        Object.keys(this.behaviorPatterns).forEach(key => {
          this.behaviorPatterns[key] = new Map(behavior[key] || []);
        });
      } catch (error) {
        console.log('No existing behavior patterns found, starting fresh');
      }
      
      // Load skill progression
      try {
        const skillData = await fs.readFile(this.skillFile, 'utf8');
        const skills = JSON.parse(skillData);
        Object.keys(this.skillProgression).forEach(key => {
          this.skillProgression[key] = new Map(skills[key] || []);
        });
      } catch (error) {
        console.log('No existing skill progression found, starting fresh');
      }
      
    } catch (error) {
      console.warn('Could not load user models:', error.message);
    }
  }

  /**
   * CORE USER MODELING - Deep behavioral analysis
   */
  async analyzeUserBehavior(userId, conversationData) {
    let userModel = this.userModels.get(userId) || this.createNewUserModel(userId);
    
    // Analyze communication patterns
    const communication = this.analyzeCommunicationStyle(conversationData);
    userModel.communication = this.mergeBehaviorData(userModel.communication, communication);
    
    // Analyze learning preferences  
    const learning = this.analyzeLearningPreferences(conversationData);
    userModel.learning = this.mergeBehaviorData(userModel.learning, learning);
    
    // Analyze problem-solving approach
    const problemSolving = this.analyzeProblemSolvingApproach(conversationData);
    userModel.problemSolving = this.mergeBehaviorData(userModel.problemSolving, problemSolving);
    
    // Update user model
    userModel.lastUpdate = new Date().toISOString();
    userModel.totalInteractions++;
    this.userModels.set(userId, userModel);
    
    return userModel;
  }

  createNewUserModel(userId) {
    return {
      id: userId,
      created: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      totalInteractions: 0,
      communication: {
        preferredDetailLevel: 'medium',
        codePreference: 'examples',
        responseStyle: 'conversational',
        technicalComfort: 0.5
      },
      learning: {
        learningSpeed: 'medium',
        preferredComplexity: 'gradual',
        bestTeachingMethods: [],
        strugglingConcepts: []
      },
      problemSolving: {
        approach: 'systematic',
        patience: 'medium',
        debugging: 'guided',
        independence: 0.5
      },
      skills: {
        languages: new Map(),
        frameworks: new Map(),
        experience: 'intermediate'
      },
      patterns: {
        commonProjects: [],
        typicalWorkflow: [],
        frequentChallenges: []
      }
    };
  }

  analyzeCommunicationStyle(conversationData) {
    const { messages = [], userFeedback = '', responseTime = 0 } = conversationData;
    
    const analysis = {
      preferredDetailLevel: this.inferDetailLevel(messages),
      codePreference: this.inferCodePreference(messages),
      responseStyle: this.inferResponseStyle(messages),
      technicalComfort: this.inferTechnicalComfort(messages)
    };
    
    return analysis;
  }

  analyzeLearningPreferences(conversationData) {
    const { messages = [], successRate = 0, retryCount = 0 } = conversationData;
    
    return {
      learningSpeed: successRate > 0.8 ? 'fast' : successRate > 0.5 ? 'medium' : 'slow',
      preferredComplexity: retryCount > 2 ? 'simple' : 'gradual',
      bestTeachingMethods: this.inferTeachingMethods(messages),
      strugglingConcepts: this.inferStruggling(messages)
    };
  }

  analyzeProblemSolvingApproach(conversationData) {
    const { messages = [], problemType = '', timeToSolution = 0 } = conversationData;
    
    return {
      approach: this.inferApproach(messages),
      patience: timeToSolution > 1800 ? 'high' : timeToSolution > 600 ? 'medium' : 'low',
      debugging: this.inferDebuggingStyle(messages),
      independence: this.inferIndependence(messages)
    };
  }

  /**
   * PROACTIVE SUGGESTIONS - Based on user model and context
   */
  generateProactiveSuggestions(userId, currentContext) {
    const userModel = this.userModels.get(userId);
    if (!userModel) return [];
    
    const suggestions = [];
    
    // Based on past projects
    const projectSuggestions = this.suggestBasedOnProjects(userModel, currentContext);
    suggestions.push(...projectSuggestions);
    
    // Based on skill gaps
    const skillSuggestions = this.suggestBasedOnSkills(userModel, currentContext);
    suggestions.push(...skillSuggestions);
    
    // Based on common challenges
    const challengeSuggestions = this.suggestBasedOnChallenges(userModel, currentContext);
    suggestions.push(...challengeSuggestions);
    
    return suggestions.sort((a, b) => b.relevance - a.relevance);
  }

  suggestBasedOnProjects(userModel, context) {
    const { commonProjects = [] } = userModel.patterns;
    const suggestions = [];
    
    commonProjects.forEach(project => {
      if (this.isContextRelevant(project, context)) {
        suggestions.push({
          type: 'project_pattern',
          title: `Based on your ${project.type} work`,
          suggestion: `You might want to consider ${project.nextSteps?.join(', ')}`,
          relevance: 0.8,
          reasoning: `Similar to your previous ${project.name} project`
        });
      }
    });
    
    return suggestions;
  }

  suggestBasedOnSkills(userModel, context) {
    const suggestions = [];
    const { languages = new Map(), frameworks = new Map() } = userModel.skills;
    
    // Suggest complementary technologies
    languages.forEach((proficiency, lang) => {
      const complements = this.getComplementaryTech(lang);
      complements.forEach(tech => {
        suggestions.push({
          type: 'skill_enhancement',
          title: `Since you know ${lang}`,
          suggestion: `You might enjoy learning ${tech.name}`,
          relevance: proficiency * tech.synergy,
          reasoning: `${tech.reason}`
        });
      });
    });
    
    return suggestions;
  }

  suggestBasedOnChallenges(userModel, context) {
    const { strugglingConcepts = [] } = userModel.learning;
    const suggestions = [];
    
    strugglingConcepts.forEach(concept => {
      if (this.isConceptRelevant(concept, context)) {
        suggestions.push({
          type: 'challenge_support',
          title: `Help with ${concept.name}`,
          suggestion: `Let's break down ${concept.name} step by step`,
          relevance: 0.9,
          reasoning: `You've mentioned difficulty with this before`
        });
      }
    });
    
    return suggestions;
  }

  /**
   * ADAPTIVE COMPLEXITY SCALING - Adjust based on user growth
   */
  getAdaptiveComplexity(userId, topic) {
    const userModel = this.userModels.get(userId);
    if (!userModel) return 'medium';
    
    const skillLevel = this.getSkillLevel(userModel, topic);
    const learningSpeed = userModel.learning.learningSpeed;
    const comfort = userModel.communication.technicalComfort;
    
    // Calculate appropriate complexity
    let complexity = 0.5; // baseline medium
    
    if (skillLevel === 'expert') complexity += 0.3;
    else if (skillLevel === 'beginner') complexity -= 0.3;
    
    if (learningSpeed === 'fast') complexity += 0.2;
    else if (learningSpeed === 'slow') complexity -= 0.2;
    
    complexity += comfort * 0.3;
    
    // Map to complexity levels
    if (complexity > 0.8) return 'advanced';
    if (complexity > 0.6) return 'intermediate';
    if (complexity > 0.4) return 'basic';
    return 'simple';
  }

  /**
   * CONTEXT BRIDGING - Connect related conversations
   */
  findRelatedConversations(userId, currentContext) {
    const userModel = this.userModels.get(userId);
    if (!userModel) return [];
    
    const { commonProjects = [], typicalWorkflow = [] } = userModel.patterns;
    const related = [];
    
    // Find conversations with similar topics
    commonProjects.forEach(project => {
      if (this.hasTopicOverlap(project.topics, currentContext.topics)) {
        related.push({
          type: 'project',
          title: project.name,
          relevance: this.calculateTopicSimilarity(project.topics, currentContext.topics),
          context: project.context,
          outcomes: project.outcomes
        });
      }
    });
    
    return related.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * HELPER METHODS - Inference and analysis
   */
  inferDetailLevel(messages) {
    const avgLength = messages.reduce((sum, msg) => sum + msg.content?.length || 0, 0) / messages.length;
    return avgLength > 200 ? 'detailed' : avgLength > 100 ? 'medium' : 'brief';
  }

  inferCodePreference(messages) {
    const codeRequests = messages.filter(msg => 
      msg.content?.includes('example') || 
      msg.content?.includes('code') ||
      msg.content?.includes('show me')
    ).length;
    return codeRequests > messages.length * 0.5 ? 'examples' : 'concepts';
  }

  inferTechnicalComfort(messages) {
    const techTerms = ['async', 'promise', 'closure', 'middleware', 'api', 'database'];
    const techUsage = messages.filter(msg => 
      techTerms.some(term => msg.content?.toLowerCase().includes(term))
    ).length;
    return Math.min(techUsage / messages.length * 2, 1);
  }

  getComplementaryTech(language) {
    const complements = {
      'javascript': [
        { name: 'TypeScript', synergy: 0.9, reason: 'Adds type safety to your JS skills' },
        { name: 'React', synergy: 0.8, reason: 'Popular framework for JS developers' }
      ],
      'python': [
        { name: 'FastAPI', synergy: 0.8, reason: 'Modern Python web framework' },
        { name: 'pandas', synergy: 0.7, reason: 'Data manipulation in Python' }
      ],
      'react': [
        { name: 'Next.js', synergy: 0.9, reason: 'Full-stack React framework' },
        { name: 'TypeScript', synergy: 0.8, reason: 'Better React development experience' }
      ]
    };
    return complements[language.toLowerCase()] || [];
  }

  mergeBehaviorData(existing, newData) {
    return { ...existing, ...newData };
  }

  isContextRelevant(project, context) {
    return project.topics?.some(topic => 
      context.topics?.includes(topic) || 
      context.technology?.includes(topic)
    );
  }

  isConceptRelevant(concept, context) {
    return context.topics?.includes(concept.name) || 
           context.challenges?.includes(concept.name);
  }

  getSkillLevel(userModel, topic) {
    const skills = userModel.skills.languages.get(topic) || 
                  userModel.skills.frameworks.get(topic);
    if (!skills) return 'beginner';
    return skills.level || 'intermediate';
  }

  hasTopicOverlap(topics1, topics2) {
    return topics1?.some(t1 => topics2?.some(t2 => 
      t1.toLowerCase().includes(t2.toLowerCase()) ||
      t2.toLowerCase().includes(t1.toLowerCase())
    ));
  }

  calculateTopicSimilarity(topics1, topics2) {
    if (!topics1 || !topics2) return 0;
    const overlap = topics1.filter(t1 => 
      topics2.some(t2 => t1.toLowerCase() === t2.toLowerCase())
    ).length;
    return overlap / Math.max(topics1.length, topics2.length);
  }

  /**
   * PUBLIC API - Phase 2 capabilities
   */
  async updateUserModel(userId, conversationData) {
    return await this.analyzeUserBehavior(userId, conversationData);
  }

  getProactiveSuggestions(userId, context) {
    return this.generateProactiveSuggestions(userId, context);
  }

  getAdaptiveSettings(userId, topic) {
    return {
      complexity: this.getAdaptiveComplexity(userId, topic),
      userModel: this.userModels.get(userId),
      relatedContext: this.findRelatedConversations(userId, { topics: [topic] })
    };
  }

  getUserInsights(userId) {
    const userModel = this.userModels.get(userId);
    if (!userModel) return null;
    
    return {
      profile: userModel,
      strengths: this.identifyStrengths(userModel),
      growthAreas: this.identifyGrowthAreas(userModel),
      recommendations: this.getPersonalizedRecommendations(userModel)
    };
  }

  identifyStrengths(userModel) {
    const strengths = [];
    
    if (userModel.communication.technicalComfort > 0.7) {
      strengths.push('Strong technical communication');
    }
    
    if (userModel.learning.learningSpeed === 'fast') {
      strengths.push('Quick learner');
    }
    
    if (userModel.problemSolving.patience === 'high') {
      strengths.push('Persistent problem solver');
    }
    
    return strengths;
  }

  identifyGrowthAreas(userModel) {
    const areas = [];
    
    if (userModel.communication.technicalComfort < 0.3) {
      areas.push('Technical vocabulary development');
    }
    
    if (userModel.learning.strugglingConcepts.length > 3) {
      areas.push('Foundational concepts reinforcement');
    }
    
    return areas;
  }

  getPersonalizedRecommendations(userModel) {
    const recommendations = [];
    
    // Based on learning style
    if (userModel.learning.preferredComplexity === 'gradual') {
      recommendations.push('Break complex topics into smaller steps');
    }
    
    // Based on communication style
    if (userModel.communication.codePreference === 'examples') {
      recommendations.push('Always include practical examples');
    }
    
    return recommendations;
  }
}