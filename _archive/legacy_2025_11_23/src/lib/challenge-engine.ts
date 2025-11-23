/**
 * Challenge Engine - Skill challenges and assessments
 * 
 * Manages:
 * - Challenge pool and selection
 * - Challenge execution and grading
 * - Feedback generation
 */

import { v4 as uuid } from 'uuid';

class ChallengeEngine {
  constructor(eventBus, config = {}) {
    this.eventBus = eventBus;
    this.config = {
      passingScore: config.passingScore || 70,
      difficultyLevels: ['easy', 'medium', 'hard'],
      ...config
    };

    // Challenge pool
    this.challenges = this.loadChallenges();
    this.activeChalls = new Map();  // challengeId -> challenge instance
  }

  /**
   * Load challenge definitions
   */
  loadChallenges() {
    return {
      javascript: {
        easy: [
          {
            id: 'js-easy-1',
            title: 'Variable Declaration',
            description: 'Declare a variable and assign a value',
            prompt: 'Show how to declare a variable in JavaScript and assign it a value.',
            expectedKeywords: ['let', 'const', 'var', 'assignment'],
            solution: 'let x = 5; // or const y = 10;'
          },
          {
            id: 'js-easy-2',
            title: 'Function Definition',
            description: 'Write a simple function',
            prompt: 'Write a function that takes two numbers and returns their sum.',
            expectedKeywords: ['function', 'return', 'parameters'],
            solution: 'function add(a, b) { return a + b; }'
          }
        ],
        medium: [
          {
            id: 'js-med-1',
            title: 'Array Methods',
            description: 'Use array methods to transform data',
            prompt: 'Use map() and filter() to process an array of numbers.',
            expectedKeywords: ['map', 'filter', 'array', 'function'],
            solution: 'arr.filter(x => x > 5).map(x => x * 2)'
          },
          {
            id: 'js-med-2',
            title: 'Async/Await',
            description: 'Use async/await for asynchronous operations',
            prompt: 'Write an async function that fetches data and processes it.',
            expectedKeywords: ['async', 'await', 'promise', 'fetch'],
            solution: 'async function getData() { const data = await fetch(...); }'
          }
        ],
        hard: [
          {
            id: 'js-hard-1',
            title: 'Closure Pattern',
            description: 'Implement a closure pattern',
            prompt: 'Create a function factory using closures for data encapsulation.',
            expectedKeywords: ['closure', 'function', 'scope', 'encapsulation'],
            solution: 'const createCounter = () => { let count = 0; return () => ++count; }'
          }
        ]
      },
      python: {
        easy: [
          {
            id: 'py-easy-1',
            title: 'Function Definition',
            description: 'Write a simple Python function',
            prompt: 'Write a function that prints "Hello, World!"',
            expectedKeywords: ['def', 'function', 'print'],
            solution: 'def hello():\n    print("Hello, World!")'
          }
        ],
        medium: [
          {
            id: 'py-med-1',
            title: 'List Comprehension',
            description: 'Use list comprehension',
            prompt: 'Create a list of squares using list comprehension.',
            expectedKeywords: ['comprehension', 'list', 'for', 'range'],
            solution: '[x**2 for x in range(10)]'
          }
        ],
        hard: [
          {
            id: 'py-hard-1',
            title: 'Decorator Pattern',
            description: 'Implement a decorator',
            prompt: 'Create a decorator that logs function calls.',
            expectedKeywords: ['decorator', 'function', 'wrapper'],
            solution: 'def log_calls(func):\n    def wrapper(*args):\n        print(f"Calling {func.__name__}")\n        return func(*args)\n    return wrapper'
          }
        ]
      }
    };
  }

  /**
   * Start a challenge
   */
  async startChallenge(userId, skill, difficulty = 'medium') {
    if (!userId || !skill) {
      throw new Error('userId and skill are required');
    }

    if (!this.config.difficultyLevels.includes(difficulty)) {
      throw new Error(`difficulty must be one of: ${this.config.difficultyLevels.join(', ')}`);
    }

    // Select challenge from pool
    const challengePool = this.challenges[skill.toLowerCase()];
    if (!challengePool || !challengePool[difficulty]) {
      throw new Error(`No challenges found for skill: ${skill}, difficulty: ${difficulty}`);
    }

    const challengeTemplates = challengePool[difficulty];
    const template = challengeTemplates[Math.floor(Math.random() * challengeTemplates.length)];

    const challengeId = uuid();
    const now = Date.now();

    const challenge = {
      challengeId,
      userId,
      skill,
      difficulty,
      template: template.id,
      title: template.title,
      prompt: template.prompt,
      expectedKeywords: template.expectedKeywords,
      solution: template.solution,
      startTime: now,
      endTime: null,
      response: null,
      grade: null,
      feedback: null,
      passed: null,
      status: 'active'
    };

    this.activeChalls.set(challengeId, challenge);

    // Emit event
    if (this.eventBus) {
      await this.eventBus.emit({
        type: 'challenge.started',
        aggregateId: challengeId,
        data: {
          userId,
          challengeId,
          skill,
          difficulty,
          title: template.title,
          timestamp: now
        }
      });
    }

    // Return challenge (without solution)
    return {
      challengeId,
      skill,
      difficulty,
      title: template.title,
      prompt: template.prompt,
      description: template.description
    };
  }

  /**
   * Grade a challenge response
   */
  async gradeChallenge(challengeId, response) {
    if (!challengeId || !response) {
      throw new Error('challengeId and response are required');
    }

    const challenge = this.activeChalls.get(challengeId);
    if (!challenge) {
      throw new Error(`Challenge ${challengeId} not found`);
    }

    if (challenge.status !== 'active') {
      throw new Error(`Challenge ${challengeId} is already graded`);
    }

    const now = Date.now();

    // Grade the response
    const grade = this.gradeResponse(response, challenge.expectedKeywords);
    const passed = grade >= this.config.passingScore;
    const feedback = this.generateFeedback(response, challenge, grade, passed);

    // Update challenge
    challenge.endTime = now;
    challenge.response = response;
    challenge.grade = grade;
    challenge.passed = passed;
    challenge.feedback = feedback;
    challenge.status = 'graded';

    // Emit event
    if (this.eventBus) {
      await this.eventBus.emit({
        type: 'challenge.completed',
        aggregateId: challengeId,
        data: {
          userId: challenge.userId,
          challengeId,
          skill: challenge.skill,
          difficulty: challenge.difficulty,
          grade,
          passed,
          duration: now - challenge.startTime,
          timestamp: now
        }
      });
    }

    return {
      challengeId,
      grade,
      passed,
      feedback,
      skill: challenge.skill,
      difficulty: challenge.difficulty
    };
  }

  /**
   * Grade response using keyword matching and analysis
   */
  gradeResponse(response, expectedKeywords) {
    if (!response || response.trim().length === 0) {
      return 0;
    }

    let score = 0;

    // 1. Length assessment (20 points)
    const length = response.length;
    if (length > 100) score += 20;
    else if (length > 50) score += 10;
    else if (length > 20) score += 5;

    // 2. Keyword matching (50 points)
    let keywordMatches = 0;
    const responseLower = response.toLowerCase();

    expectedKeywords.forEach(keyword => {
      if (responseLower.includes(keyword.toLowerCase())) {
        keywordMatches++;
      }
    });

    const keywordScore = Math.round((keywordMatches / expectedKeywords.length) * 50);
    score += keywordScore;

    // 3. Code quality (20 points)
    if (this.hasGoodCodeQuality(response)) {
      score += 20;
    } else if (this.hasBasicCodeQuality(response)) {
      score += 10;
    }

    // 4. Correctness bonus (10 points)
    if (this.appearsCorrect(response)) {
      score += 10;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Check for good code quality indicators
   */
  hasGoodCodeQuality(response) {
    return response.includes('{') && 
           response.includes('}') &&
           (response.includes('\n') || response.length > 100);
  }

  /**
   * Check for basic code quality
   */
  hasBasicCodeQuality(response) {
    return (response.includes('{') || response.includes('[')) &&
           response.split(' ').length > 5;
  }

  /**
   * Check if response appears correct (heuristic)
   */
  appearsCorrect(response) {
    const correctIndicators = [
      'return',
      'function',
      'class',
      'if',
      'else',
      'for',
      'while',
      '=',
      '=>'
    ];

    return correctIndicators.some(indicator => response.includes(indicator));
  }

  /**
   * Generate feedback for graded response
   */
  generateFeedback(response, challenge, grade, passed) {
    const feedback = {
      overall: passed ? 'Excellent work!' : 'Keep practicing!',
      score: grade,
      details: []
    };

    // Keyword feedback
    const keywordMatches = challenge.expectedKeywords.filter(kw =>
      response.toLowerCase().includes(kw.toLowerCase())
    );

    if (keywordMatches.length === challenge.expectedKeywords.length) {
      feedback.details.push('✓ All key concepts were included');
    } else {
      const missing = challenge.expectedKeywords.filter(kw =>
        !response.toLowerCase().includes(kw.toLowerCase())
      );
      feedback.details.push(`✗ Missing concepts: ${missing.join(', ')}`);
    }

    // Code quality feedback
    if (this.hasGoodCodeQuality(response)) {
      feedback.details.push('✓ Good code structure and formatting');
    } else if (!this.hasBasicCodeQuality(response)) {
      feedback.details.push('✗ Consider using proper code syntax and structure');
    }

    // Suggestion
    if (!passed && grade < this.config.passingScore - 20) {
      feedback.details.push(`💡 Tip: Review the ${challenge.skill} documentation and try again`);
    }

    return feedback;
  }

  /**
   * Get challenge by ID
   */
  getChallenge(challengeId) {
    return this.activeChalls.get(challengeId);
  }

  /**
   * Get stats
   */
  getStats() {
    let completed = 0;
    let passed = 0;

    for (const challenge of this.activeChalls.values()) {
      if (challenge.status === 'graded') {
        completed++;
        if (challenge.passed) {
          passed++;
        }
      }
    }

    return {
      activeChallenges: this.activeChalls.size,
      completedChallenges: completed,
      passedChallenges: passed,
      passRate: completed > 0 ? Math.round((passed / completed) * 100) : 0,
      timestamp: Date.now()
    };
  }
}

export default ChallengeEngine;
