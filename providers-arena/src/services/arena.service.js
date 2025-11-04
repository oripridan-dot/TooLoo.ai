import config from '../config/env.js';
import { openai, anthropic, gemini } from './providers/index.js';

class ArenaService {
  constructor() {
    this.tournaments = [];
    this.providers = this.initializeProviders();
  }

  initializeProviders() {
    const providers = {};
    
    if (config.OPENAI_API_KEY) {
      providers.openai = new openai(config.OPENAI_API_KEY);
    }
    
    if (config.ANTHROPIC_API_KEY) {
      providers.anthropic = new anthropic(config.ANTHROPIC_API_KEY);
    }
    
    if (config.GEMINI_API_KEY) {
      providers.gemini = new gemini(config.GEMINI_API_KEY);
    }
    
    return providers;
  }

  getAvailableProviders() {
    return Object.keys(this.providers);
  }

  async compareProviders(prompt, providerNames = []) {
    const selectedProviders = providerNames.length > 0 
      ? providerNames.filter(name => this.providers[name])
      : Object.keys(this.providers);
    
    const results = {};
    
    for (const providerName of selectedProviders) {
      try {
        const provider = this.providers[providerName];
        const startTime = Date.now();
        const response = await provider.generateResponse(prompt);
        const endTime = Date.now();
        
        results[providerName] = {
          response,
          responseTime: endTime - startTime,
          status: 'success'
        };
      } catch (error) {
        results[providerName] = {
          response: null,
          responseTime: null,
          status: 'error',
          error: error.message
        };
      }
    }
    
    return results;
  }

  createTournament(tournamentData) {
    const newTournament = {
      id: this.tournaments.length + 1,
      ...tournamentData,
    };
    this.tournaments.push(newTournament);
    return newTournament;
  }

  getTournaments() {
    return this.tournaments;
  }

  getTournamentById(id) {
    return this.tournaments.find(tournament => tournament.id === id);
  }

  updateTournament(id, updatedData) {
    const tournamentIndex = this.tournaments.findIndex(tournament => tournament.id === id);
    if (tournamentIndex === -1) {
      throw new Error('Tournament not found');
    }
    this.tournaments[tournamentIndex] = {
      ...this.tournaments[tournamentIndex],
      ...updatedData,
    };
    return this.tournaments[tournamentIndex];
  }

  deleteTournament(id) {
    const tournamentIndex = this.tournaments.findIndex(tournament => tournament.id === id);
    if (tournamentIndex === -1) {
      throw new Error('Tournament not found');
    }
    return this.tournaments.splice(tournamentIndex, 1)[0];
  }

  async getAggregatedResponse(prompt) {
    const selectedProviders = Object.keys(this.providers);
    const promises = selectedProviders.map(async (providerName) => {
      try {
        const provider = this.providers[providerName];
        const response = await provider.generateResponse(prompt);
        return {
          provider: providerName,
          response,
          success: true
        };
      } catch (error) {
        return {
          provider: providerName,
          error: error.message,
          success: false
        };
      }
    });

    const results = await Promise.allSettled(promises);
    const responses = results
      .filter(r => r.status === 'fulfilled' && r.value.success)
      .map(r => r.value);

    if (responses.length === 0) {
      throw new Error('No providers returned successful responses');
    }

    // Extract key sentences and bullets from all providers
    const keyBullets = this.extractKeyBullets(responses);
    const consensus = this.extractConsensus(responses);
    const insights = this.extractUniqueInsights(responses);

    return {
      aggregatedResponse: keyBullets, // Key sentences and bullets from all providers
      consensus,
      providerInsights: insights,
      providersUsed: responses.map(r => r.provider),
      totalProvidersQueried: selectedProviders.length,
      successfulProviders: responses.length,
      failedProviders: selectedProviders.length - responses.length,
      providers: responses.map(r => ({
        name: r.provider,
        response: r.response
      }))
    };
  }

  extractKeyBullets(responses) {
    const allBullets = [];
    
    responses.forEach((r) => {
      // Split by sentences
      const sentences = r.response.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      // Extract meaningful sentences (longer ones, typically 10+ words)
      const meaningfulSentences = sentences
        .filter(s => s.trim().split(' ').length >= 8)
        .slice(0, 3) // Take up to 3 key sentences per provider
        .map(s => s.trim());
      
      // Also extract any existing bullet points
      const bulletPoints = r.response
        .split('\n')
        .filter(line => line.trim().startsWith('*') || line.trim().startsWith('-') || line.trim().startsWith('•'))
        .map(line => line.trim().replace(/^[*\-•]\s*/, ''))
        .slice(0, 3);
      
      allBullets.push(...meaningfulSentences);
      allBullets.push(...bulletPoints);
    });

    // Remove duplicates and take top bullets
    const uniqueBullets = [...new Set(allBullets)].slice(0, 8);
    
    return {
      bullets: uniqueBullets,
      providerCount: responses.length,
      totalBulletsExtracted: allBullets.length
    };
  }

  extractConsensus(responses) {
    if (responses.length <= 1) return 'Single provider only';

    const texts = responses.map(r => r.response.toLowerCase());
    
    // Find commonly occurring phrases (simple consensus)
    const allWords = texts.join(' ').split(/\s+/);
    const wordFreq = {};
    
    allWords.forEach(word => {
      if (word.length > 5) { // Only meaningful words
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });

    // Get high-frequency meaningful terms
    const importantTerms = Object.entries(wordFreq)
      .filter(([, count]) => count >= Math.max(2, Math.ceil(responses.length / 2)))
      .map(([word]) => word)
      .slice(0, 5);

    return {
      agreement: responses.length > 1 ? 'Multiple sources agree' : 'Single source',
      keyTerms: importantTerms,
      diversity: responses.length
    };
  }

  extractUniqueInsights(responses) {
    if (responses.length <= 1) return [];

    const insights = [];
    
    // Extract last 1-2 sentences as unique insight from each provider
    responses.forEach((r) => {
      const sentences = r.response.split(/[.!?]+/).filter(s => s.trim());
      const uniqueSentences = sentences.slice(-2);
      
      insights.push({
        provider: r.provider,
        uniquePoint: uniqueSentences[0]?.trim() || ''
      });
    });

    return insights;
  }

  async getProviderHealth() {
    const healthChecks = Object.keys(this.providers).map(async (providerName) => {
      const provider = this.providers[providerName];
      const startTime = Date.now();
      try {
        await provider.generateResponse('Hello, are you working?');
        const endTime = Date.now();
        return {
          provider: providerName,
          status: 'operational',
          responseTime: endTime - startTime,
          success: true
        };
      } catch (error) {
        return {
          provider: providerName,
          status: 'failed',
          error: error.message,
          success: false
        };
      }
    });

    const results = await Promise.allSettled(healthChecks);
    return results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);
  }
}

export default ArenaService;