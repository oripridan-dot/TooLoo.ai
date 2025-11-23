export class WritingModule {
  async analyze(text, opts = {}) {
    const tone = this.detectTone(text);
    const readability = this.analyzeReadability(text);
    const style = this.analyzeStyle(text);
    const engagement = this.scoreEngagement(text);
    const grammar = this.basicGrammarCheck(text);

    return {
      ok: true,
      tone,
      readability,
      style,
      engagement,
      grammar,
      suggestions: this.generateSuggestions(text, tone, readability),
      score: this.calculateOverallScore(readability, engagement)
    };
  }

  detectTone(text) {
    const formalWords = (text.match(/\b(therefore|however|moreover|thus)\b/gi) || []).length;
    const casualWords = (text.match(/\b(gonna|wanna|kinda|like|awesome)\b/gi) || []).length;
    const technicalTerms = (text.match(/\b(algorithm|framework|infrastructure)\b/gi) || []).length;
    const emotionalWords = (text.match(/\b(love|hate|amazing|terrible)\b/gi) || []).length;

    if (technicalTerms > formalWords) return 'technical';
    if (emotionalWords > 5) return 'emotional';
    if (casualWords > formalWords) return 'casual';
    if (formalWords > 3) return 'formal';
    return 'neutral';
  }

  analyzeReadability(text) {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgWordsPerSentence = words.length / (sentences.length || 1);
    const avgCharPerWord = words.reduce((a, w) => a + w.length, 0) / words.length;

    let gradeLevel = 0;
    if (avgWordsPerSentence > 20 || avgCharPerWord > 6) gradeLevel = 14;
    else if (avgWordsPerSentence > 15) gradeLevel = 12;
    else if (avgWordsPerSentence > 10) gradeLevel = 9;
    else gradeLevel = 6;

    const fleschScore = Math.max(0, Math.min(100, 206.835 - 1.015 * avgWordsPerSentence - 84.6 * (avgCharPerWord / 5)));

    return {
      fleschScore: Math.round(fleschScore),
      gradeLevel,
      avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
      wordCount: words.length,
      sentiment: fleschScore > 60 ? 'accessible' : 'complex'
    };
  }

  analyzeStyle(text) {
    const passiveVoice = (text.match(/\b(is|are|was|were)\s+\w+ed\b/gi) || []).length;
    const activeVoice = (text.match(/\b[A-Z]\w+\s+\w+(ed|s)\b/gi) || []).length;
    const adjectives = (text.match(/\b(very|really|quite|extremely)\b/gi) || []).length;
    const repetition = text.split(/\s+/).length - new Set(text.split(/\s+/)).size;

    return {
      passiveVoiceRatio: passiveVoice / (activeVoice + passiveVoice || 1),
      intensifiers: adjectives,
      wordRepetition: Math.round((repetition / text.split(/\s+/).length) * 100),
      recommendation: passiveVoice > activeVoice ? 'Use more active voice' : 'Good active voice usage'
    };
  }

  scoreEngagement(text) {
    const questions = (text.match(/\?/g) || []).length;
    const exclamations = (text.match(/!/g) || []).length;
    const shortSentences = (text.split(/[.!?]+/).filter(s => s.split(/\s+/).length < 5) || []).length;
    const totalSentences = (text.split(/[.!?]+/).filter(s => s.trim().length > 0) || []).length;

    const score = Math.min(10, (questions + exclamations * 2 + (shortSentences / totalSentences) * 5));
    return {
      score: Math.round(score * 10) / 10,
      questions,
      exclamations,
      shortSentenceRatio: Math.round((shortSentences / totalSentences) * 100)
    };
  }

  basicGrammarCheck(text) {
    const issues = [];
    if (text.match(/\bi\s+[a-z]/gi)) issues.push('Capitalize "I"');
    if (text.match(/\s{2,}/)) issues.push('Remove extra spaces');
    if (text.match(/\b(their|there)\b.*\b(their|there)\b/gi)) issues.push('Check there/their usage');
    if (text.match(/\b(your|you\'re)\b.*\b(your|you\'re)\b/gi)) issues.push('Check your/you\'re usage');
    return issues.slice(0, 5);
  }

  generateSuggestions(text, tone, readability) {
    const suggestions = [];
    if (readability.gradeLevel > 12) {
      suggestions.push('Simplify complex sentences');
    }
    if (readability.sentiment === 'complex') {
      suggestions.push('Break into shorter paragraphs');
    }
    if (tone === 'formal' && text.length < 500) {
      suggestions.push('Expand with more detail');
    }
    return suggestions;
  }

  calculateOverallScore(readability, engagement) {
    const r = readability.fleschScore / 100;
    const e = engagement.score / 10;
    return Math.round(((r + e) / 2) * 100);
  }

  adjustTone(text, newTone) {
    if (newTone === 'formal') {
      text = text.replace(/\bgonna\b/gi, 'going to');
      text = text.replace(/\bwanna\b/gi, 'want to');
      text = text.replace(/\byou\b/gi, 'one');
    } else if (newTone === 'casual') {
      text = text.replace(/\b(therefore|however)\b/gi, 'so');
      text = text.replace(/\b(subsequently|moreover)\b/gi, 'also');
    }
    return text;
  }
}

export default new WritingModule();
