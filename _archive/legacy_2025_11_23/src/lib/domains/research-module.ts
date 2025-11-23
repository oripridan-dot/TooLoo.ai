export class ResearchModule {
  constructor() {
    this.factCheckCache = new Map();
    this.claimVerifications = new Map();
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
    this.googleFactCheckApiKey = process.env.GOOGLE_FACT_CHECK_API_KEY;
  }

  async analyze(text, opts = {}) {
    const citations = this.extractCitations(text);
    const claims = this.extractClaims(text);
    const tone = this.analyzeTone(text);
    
    // Optionally fact-check claims
    let verifiedClaims = claims;
    if (opts.factCheck) {
      verifiedClaims = await Promise.all(
        claims.map(c => this.factCheck(c.claim))
      );
    }

    return {
      ok: true,
      claims: verifiedClaims,
      citations,
      tone,
      academicScore: this.scoreAcademic(text),
      recommendations: this.getRecommendations(text)
    };
  }

  extractCitations(text) {
    const citations = [];
    const patterns = [
      /\((\w+,\s*\d{4})\)/g,
      /\[(\d+)\]/g,
      /https?:\/\/[^\s]+/g
    ];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text))) {
        citations.push(match[1]);
      }
    }
    return citations.slice(0, 10);
  }

  extractClaims(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    return sentences.slice(0, 5).map(s => ({ claim: s.trim(), strength: 'medium' }));
  }

  analyzeTone(text) {
    const formalWords = (text.match(/\b(therefore|however|moreover|thus|hence)\b/gi) || []).length;
    const casualWords = (text.match(/\b(gonna|wanna|kinda|like|you know)\b/gi) || []).length;
    const academicTerms = (text.match(/\b(research|study|analysis|methodology)\b/gi) || []).length;

    if (academicTerms > formalWords) return 'academic';
    if (casualWords > formalWords) return 'casual';
    if (formalWords > 3) return 'formal';
    return 'neutral';
  }

  scoreAcademic(text) {
    const factors = {
      hasCitations: this.extractCitations(text).length > 2 ? 2 : 0,
      hasMethodology: text.match(/methodology|approach|framework/gi) ? 2 : 0,
      formalTone: this.analyzeTone(text) === 'academic' ? 2 : 0,
      hasConclusion: text.match(/conclusion|findings|results/gi) ? 2 : 0,
      hasBibliography: text.match(/references|bibliography|works cited/gi) ? 2 : 0
    };
    return Object.values(factors).reduce((a, b) => a + b, 0) + '/10';
  }

  getRecommendations(text) {
    const recs = [];
    if (this.extractCitations(text).length === 0) {
      recs.push('Add citations to support claims');
    }
    if (text.length < 500) {
      recs.push('Expand content for better depth');
    }
    if (!text.match(/conclusion|summary/gi)) {
      recs.push('Add a conclusion section');
    }
    return recs;
  }

  generateBibliography(citations, style = 'APA') {
    const entries = [];
    for (const cite of citations) {
      if (style === 'APA') {
        entries.push(`Author, A. (${new Date().getFullYear()}). Title. Journal.`);
      } else if (style === 'MLA') {
        entries.push(`Author. "Title." Journal, ${new Date().getFullYear()}.`);
      }
    }
    return entries.join('\n');
  }

  /**
   * Fact-check a claim using Google Fact Check API or fallback heuristics
   * Results are cached for 24 hours to reduce API calls
   */
  async factCheck(claim) {
    if (!claim || claim.length < 5) {
      return { claim, verified: 'skipped', confidence: 0, reason: 'claim too short' };
    }

    // Check cache first
    const cacheKey = claim.toLowerCase().trim();
    const cached = this.factCheckCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return { ...cached.result, fromCache: true };
    }

    try {
      // Try Google Fact Check API if configured
      if (this.googleFactCheckApiKey) {
        const result = await this.checkViaGoogleFactCheck(claim);
        this.cacheResult(cacheKey, result);
        return result;
      }

      // Fallback: heuristic-based verification
      const result = this.heuristicFactCheck(claim);
      this.cacheResult(cacheKey, result);
      return result;
    } catch (error) {
      console.error(`Fact-check error for "${claim}":`, error.message);
      return {
        claim,
        verified: 'error',
        confidence: 0,
        error: error.message,
        reason: 'fact-check service unavailable'
      };
    }
  }

  async checkViaGoogleFactCheck(claim) {
    try {
      const response = await fetch(
        `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=${encodeURIComponent(claim)}&key=${this.googleFactCheckApiKey}`,
        { timeout: 10000 }
      );

      if (!response.ok) {
        throw new Error(`Google API error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.claims || data.claims.length === 0) {
        return {
          claim,
          verified: 'not-found',
          confidence: 0.3,
          source: 'google-fact-check',
          message: 'No fact-checks found for this claim'
        };
      }

      // Score claims based on agreement level
      const topClaim = data.claims[0];
      let verified = 'mixed';
      let confidence = 0.5;

      if (topClaim.claimReview && topClaim.claimReview.length > 0) {
        const verdicts = topClaim.claimReview.map(r => r.textualRating);
        const trueCount = verdicts.filter(v => v.toLowerCase().includes('true')).length;
        const falseCount = verdicts.filter(v => v.toLowerCase().includes('false')).length;

        if (trueCount > falseCount) {
          verified = 'likely-true';
          confidence = Math.min(trueCount / verdicts.length, 0.95);
        } else if (falseCount > trueCount) {
          verified = 'likely-false';
          confidence = Math.min(falseCount / verdicts.length, 0.95);
        }
      }

      return {
        claim,
        verified,
        confidence,
        source: 'google-fact-check',
        claimReviews: topClaim.claimReview ? topClaim.claimReview.length : 0,
        verdict: topClaim.claimReview?.[0]?.textualRating || 'unknown'
      };
    } catch (error) {
      console.warn(`Google Fact Check API error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Heuristic-based fact-checking when API is unavailable
   * Analyzes claim characteristics to estimate credibility
   */
  heuristicFactCheck(claim) {
    let confidence = 0.5;
    let verdict = 'unverified';
    const flags = [];

    // Check for sensationalism
    const sensationalWords = claim.match(/\b(shocking|unbelievable|incredible|secret|coverup|conspiracy)\b/gi);
    if (sensationalWords) {
      flags.push('sensational language detected');
      confidence -= 0.15;
    }

    // Check for hedging language (less credible)
    const hedgingWords = claim.match(/\b(might|could|probably|allegedly|supposedly)\b/gi);
    if (hedgingWords) {
      flags.push('hedging language detected');
      confidence -= 0.1;
    }

    // Check for specific, factual language (more credible)
    const specificityMarkers = claim.match(/\b(\d+%|\d{4}|date|study|research|found|showed)\b/gi);
    if (specificityMarkers && specificityMarkers.length > 2) {
      flags.push('specific factual language');
      confidence += 0.15;
    }

    // Check for proper nouns and citations
    const hasProperNouns = /[A-Z][a-z]+\s+[A-Z][a-z]+/.test(claim);
    if (hasProperNouns) {
      flags.push('contains proper nouns');
      confidence += 0.1;
    }

    // Check for URLs or source references
    if (claim.match(/https?:\/\/|see also|according to/gi)) {
      flags.push('includes potential source references');
      confidence += 0.15;
    }

    // Cap confidence at reasonable bounds
    confidence = Math.max(0.2, Math.min(0.8, confidence));

    if (confidence > 0.65) {
      verdict = 'likely-credible';
    } else if (confidence < 0.45) {
      verdict = 'likely-dubious';
    }

    return {
      claim,
      verified: verdict,
      confidence: Math.round(confidence * 100) / 100,
      source: 'heuristic-analysis',
      flags,
      note: 'Unverified heuristic analysis; API fact-checking recommended'
    };
  }

  cacheResult(key, result) {
    this.factCheckCache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  clearExpiredCache() {
    const now = Date.now();
    for (const [key, entry] of this.factCheckCache.entries()) {
      if (now - entry.timestamp > this.cacheExpiry) {
        this.factCheckCache.delete(key);
      }
    }
  }
}

export default new ResearchModule();
