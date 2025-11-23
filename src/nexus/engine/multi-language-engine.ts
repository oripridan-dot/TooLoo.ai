// @version 2.1.28
/**
 * Multi-Language Emotion Detection Engine
 * Extends emotion detection to support 5+ languages
 * Auto-detects language and provides culture-aware emotion analysis
 */

export default class MultiLanguageEngine {
  constructor() {
    this.supportedLanguages = ['en', 'es', 'fr', 'de', 'zh', 'pt'];
    this.emotionMaps = this.initializeEmotionMaps();
    this.intensityPatterns = this.initializeIntensityPatterns();
    this.translations = this.initializeTranslations();
    this.detectionCache = new Map();
  }

  /**
   * Initialize emotion maps for each language
   */
  initializeEmotionMaps() {
    return {
      en: {
        joy: ['happy', 'pleased', 'delighted', 'thrilled', 'great', 'wonderful', 'fantastic', 'excellent'],
        sadness: ['sad', 'unhappy', 'depressed', 'miserable', 'down', 'awful', 'terrible', 'horrible'],
        anger: ['angry', 'furious', 'enraged', 'mad', 'irritated', 'annoyed', 'upset', 'furious'],
        fear: ['scared', 'frightened', 'terrified', 'afraid', 'anxious', 'nervous', 'worried', 'panicked'],
        surprise: ['surprised', 'shocked', 'astonished', 'amazed', 'stunned', 'taken aback', 'floored'],
        disgust: ['disgusted', 'repulsed', 'appalled', 'revolted', 'sickened', 'disgusting', 'gross'],
        trust: ['trust', 'confident', 'secure', 'safe', 'assured', 'comfortable', 'belief'],
        anticipation: ['excited', 'anticipating', 'looking forward', 'eager', 'hopeful', 'optimistic']
      },
      es: {
        joy: ['feliz', 'contento', 'alegre', 'emocionado', 'encantado', 'fantástico', 'maravilloso'],
        sadness: ['triste', 'infeliz', 'deprimido', 'miserable', 'abatido', 'awful', 'terrible'],
        anger: ['enojado', 'furioso', 'iracundo', 'molesto', 'irritado', 'furioso', 'enojadísimo'],
        fear: ['asustado', 'aterrado', 'temeroso', 'ansioso', 'nervioso', 'preocupado', 'pánico'],
        surprise: ['sorprendido', 'asombrado', 'pasmado', 'impactado', 'atónito', 'sobresaltado'],
        disgust: ['disgustado', 'repugnado', 'asqueado', 'repelido', 'nauseabundo', 'repugnante'],
        trust: ['confianza', 'confiado', 'seguro', 'tranquilo', 'cómodo', 'creencia'],
        anticipation: ['emocionado', 'esperanzado', 'entusiasmado', 'optimista', 'anhelante']
      },
      fr: {
        joy: ['heureux', 'content', 'joyeux', 'enchanté', 'ravi', 'fantastique', 'merveilleux'],
        sadness: ['triste', 'malheureux', 'déprimé', 'misérable', 'abattu', 'affreux', 'horrible'],
        anger: ['en colère', 'furieux', 'colérique', 'irrité', 'agacé', 'furibond', 'enragé'],
        fear: ['peur', 'effrayé', 'terrifié', 'apeuré', 'anxieux', 'nerveux', 'paniqué'],
        surprise: ['surpris', 'étonné', 'stupéfait', 'abasourdi', 'interloqué', 'choqué'],
        disgust: ['dégoûté', 'répugné', 'écœuré', 'repoussé', 'révulsé', 'répugnant'],
        trust: ['confiance', 'confiant', 'sûr', 'rassuré', 'à l\'aise', 'confortable'],
        anticipation: ['enthousiaste', 'impatient', 'optimiste', 'espérant', 'impatient', 'hâte']
      },
      de: {
        joy: ['glücklich', 'froh', 'freude', 'erfreut', 'begeistert', 'fantastisch', 'wunderbar'],
        sadness: ['traurig', 'unglücklich', 'niedergeschlagen', 'depressiv', 'trübsinn', 'furchtbar'],
        anger: ['wütend', 'zornig', 'erbost', 'verärgert', 'gereizt', 'furor', 'tobsucht'],
        fear: ['angst', 'verängstigt', 'erschrocken', 'beängstigt', 'ängstlich', 'nervös', 'panik'],
        surprise: ['überrascht', 'erstaunt', 'verblüfft', 'schockiert', 'sprachlos', 'fassungslos'],
        disgust: ['ekel', 'angewidert', 'abgestoßen', 'widerwille', 'grauen', 'ekelhaft'],
        trust: ['vertrauen', 'vertrauend', 'sicher', 'zuversicht', 'behaglichkeit', 'wohlbefinden'],
        anticipation: ['aufgeregt', 'hoffnungsvoll', 'ungeduldig', 'optimistisch', 'erwartung', 'sehnsuch']
      },
      zh: {
        joy: ['高兴', '开心', '愉快', '快乐', '欢喜', '极好', '太棒'],
        sadness: ['悲伤', '伤心', '沮丧', '绝望', '痛苦', '可怕', '糟糕'],
        anger: ['生气', '愤怒', '恼怒', '烦恼', '不满', '狂怒', '暴怒'],
        fear: ['害怕', '恐惧', '惊恐', '担心', '紧张', '焦虑', '惊慌'],
        surprise: ['惊讶', '惊奇', '震惊', '惊愕', '目瞪口呆', '震撼', '傻眼'],
        disgust: ['厌恶', '讨厌', '厌烦', '反感', '恶心', '令人厌恶', '糟糕'],
        trust: ['信任', '信心', '安心', '有把握', '舒适', '信念', '依赖'],
        anticipation: ['期待', '兴奋', '热切', '渴望', '希望', '乐观', '急不可耐']
      },
      pt: {
        joy: ['feliz', 'contente', 'alegre', 'emocionado', 'encantado', 'fantástico', 'maravilhoso'],
        sadness: ['triste', 'infeliz', 'deprimido', 'miserável', 'abatido', 'horrível', 'terrível'],
        anger: ['raiva', 'furioso', 'irado', 'irritado', 'enfurecido', 'enraivecido', 'colérico'],
        fear: ['medo', 'assustado', 'aterrado', 'medroso', 'ansioso', 'nervoso', 'pânico'],
        surprise: ['surpreso', 'espantado', 'chocado', 'assombrado', 'perplexo', 'estupefato'],
        disgust: ['nojento', 'repugnante', 'desagradável', 'repelido', 'asqueado', 'repugnância'],
        trust: ['confiança', 'confiante', 'seguro', 'tranquilo', 'confortável', 'crença'],
        anticipation: ['entusiasmado', 'esperançoso', 'ansioso', 'otimista', 'anelante', 'ávido']
      }
    };
  }

  /**
   * Initialize intensity patterns for each language
   */
  initializeIntensityPatterns() {
    return {
      en: {
        intensifiers: ['very', 'extremely', 'absolutely', 'really', 'so', 'incredibly', 'amazingly'],
        diminishers: ['somewhat', 'a bit', 'slightly', 'kind of', 'sort of', 'kinda', 'rather'],
        exclamations: ['!', '!!!', '!!', 'omg', 'oh my god', 'wow', 'yay', 'no way'],
        caps: true,
        repeatedChars: true
      },
      es: {
        intensifiers: ['muy', 'extremadamente', 'absolutamente', 'realmente', 'increíblemente', 'asombrosamente'],
        diminishers: ['algo', 'un poco', 'levemente', 'medio', 'bastante', 'un tanto'],
        exclamations: ['!', '!!!', '¡ay!', '¡dios mío!', '¡vaya!', '¡hurra!'],
        caps: true,
        repeatedChars: true
      },
      fr: {
        intensifiers: ['très', 'extrêmement', 'absolument', 'vraiment', 'incroyablement', 'étonnamment'],
        diminishers: ['un peu', 'légèrement', 'plutôt', 'quelque peu', 'passablement', 'assez'],
        exclamations: ['!', '!!!', 'mon dieu', 'oh la la', 'ouah', 'hourra'],
        caps: true,
        repeatedChars: true
      },
      de: {
        intensifiers: ['sehr', 'äußerst', 'absolut', 'wirklich', 'unglaublich', 'erstaunlich'],
        diminishers: ['etwas', 'ein bisschen', 'leicht', 'irgendwie', 'ziemlich', 'recht'],
        exclamations: ['!', '!!!', 'mein gott', 'ach je', 'wow', 'hurra'],
        caps: true,
        repeatedChars: true
      },
      zh: {
        intensifiers: ['非常', '极其', '完全', '实际上', '不可思议地', '惊人地'],
        diminishers: ['有点', '稍微', '略有', '有些', '相当', '差不多'],
        exclamations: ['!', '!!!', '天哪', '哎呀', '哇', '耶'],
        caps: false,
        repeatedChars: true
      },
      pt: {
        intensifiers: ['muito', 'extremamente', 'absolutamente', 'realmente', 'incrivelmente', 'surpreendentemente'],
        diminishers: ['um pouco', 'ligeiramente', 'levemente', 'mais ou menos', 'bastante', 'meio'],
        exclamations: ['!', '!!!', 'meu deus', 'uau', 'eba', 'hurra'],
        caps: true,
        repeatedChars: true
      }
    };
  }

  /**
   * Initialize translations for emotion labels
   */
  initializeTranslations() {
    return {
      es: {
        emotion: 'emoción',
        primary: 'primaria',
        secondary: 'secundaria',
        sentiment: 'sentimiento',
        intensity: 'intensidad',
        positive: 'positivo',
        negative: 'negativo',
        neutral: 'neutral'
      },
      fr: {
        emotion: 'émotion',
        primary: 'primaire',
        secondary: 'secondaire',
        sentiment: 'sentiment',
        intensity: 'intensité',
        positive: 'positif',
        negative: 'négatif',
        neutral: 'neutre'
      },
      de: {
        emotion: 'gefühl',
        primary: 'primär',
        secondary: 'sekundär',
        sentiment: 'stimmung',
        intensity: 'intensität',
        positive: 'positiv',
        negative: 'negativ',
        neutral: 'neutral'
      },
      zh: {
        emotion: '情感',
        primary: '主要',
        secondary: '次要',
        sentiment: '感受',
        intensity: '强度',
        positive: '正面',
        negative: '负面',
        neutral: '中性'
      },
      pt: {
        emotion: 'emoção',
        primary: 'primária',
        secondary: 'secundária',
        sentiment: 'sentimento',
        intensity: 'intensidade',
        positive: 'positivo',
        negative: 'negativo',
        neutral: 'neutro'
      }
    };
  }

  /**
   * Detect language from text
   */
  detectLanguage(text) {
    // Simple language detection based on common words and patterns
    const lowerText = text.toLowerCase();

    // Spanish patterns
    if (/\b(hola|gracias|como|que|donde|cuando|por que|muy|es)\b/.test(lowerText)) {
      return 'es';
    }

    // French patterns
    if (/\b(bonjour|merci|comment|quel|ou|quand|pourquoi|tres|est)\b/.test(lowerText)) {
      return 'fr';
    }

    // German patterns
    if (/\b(hallo|danke|wie|was|wo|wann|warum|sehr|ist)\b/.test(lowerText)) {
      return 'de';
    }

    // Mandarin patterns (basic)
    if (/[\u4e00-\u9fff]/.test(text)) {
      return 'zh';
    }

    // Portuguese patterns
    if (/\b(olá|obrigado|como|que|onde|quando|por que|muito|é)\b/.test(lowerText)) {
      return 'pt';
    }

    // Default to English
    return 'en';
  }

  /**
   * Analyze emotion for a specific language
   */
  analyzeEmotionForLanguage(text, language = 'en') {
    const emotionMap = this.emotionMaps[language] || this.emotionMaps['en'];
    const patterns = this.intensityPatterns[language] || this.intensityPatterns['en'];
    const lowerText = text.toLowerCase();

    let emotions = {
      detected: {},
      scores: {}
    };

    // Detect emotions by matching keywords
    for (const [emotion, keywords] of Object.entries(emotionMap)) {
      let score = 0;
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          score++;
        }
      }
      if (score > 0) {
        emotions.detected[emotion] = score;
        emotions.scores[emotion] = Math.min(score / keywords.length, 1.0);
      }
    }

    // Calculate primary and secondary emotions
    const sorted = Object.entries(emotions.scores)
      .sort((a, b) => b[1] - a[1]);

    const primary = sorted.length > 0 ? sorted[0][0] : 'neutral';
    const secondary = sorted.slice(1, 3).map(([emotion]) => emotion);

    // Calculate intensity
    const intensity = this.calculateIntensity(text, patterns);

    // Determine sentiment
    const sentiment = this.determineSentiment(primary, intensity);

    return {
      language,
      primary,
      secondary,
      sentiment,
      intensity,
      confidence: sorted.length > 0 ? sorted[0][1] : 0.3,
      emotionScores: emotions.scores,
      detectedEmotions: Object.keys(emotions.detected)
    };
  }

  /**
   * Calculate intensity level
   */
  calculateIntensity(text, patterns) {
    let intensity = 0.5; // Base intensity
    const lowerText = text.toLowerCase();

    // Check for intensifiers
    if (patterns.intensifiers) {
      for (const intensifier of patterns.intensifiers) {
        if (lowerText.includes(intensifier)) {
          intensity += 0.15;
        }
      }
    }

    // Check for diminishers
    if (patterns.diminishers) {
      for (const diminisher of patterns.diminishers) {
        if (lowerText.includes(diminisher)) {
          intensity -= 0.15;
        }
      }
    }

    // Check for exclamations
    if (patterns.exclamations && /!{2,}/.test(text)) {
      intensity += 0.2;
    }

    // Check for capitals
    if (patterns.caps) {
      const capsCount = (text.match(/[A-Z]/g) || []).length;
      if (capsCount > text.length * 0.3) {
        intensity += 0.15;
      }
    }

    // Check for repeated characters
    if (patterns.repeatedChars && /(.)\1{2,}/.test(text)) {
      intensity += 0.1;
    }

    return Math.min(Math.max(intensity, 0), 1.0);
  }

  /**
   * Determine sentiment from primary emotion
   */
  determineSentiment(emotion, intensity) {
    const posEmotions = ['joy', 'trust', 'anticipation'];
    const negEmotions = ['sadness', 'anger', 'fear', 'disgust'];

    if (posEmotions.includes(emotion)) {
      return intensity > 0.6 ? 'very positive' : 'positive';
    } else if (negEmotions.includes(emotion)) {
      return intensity > 0.6 ? 'very negative' : 'negative';
    } else {
      return 'neutral';
    }
  }

  /**
   * Main method: Analyze emotion with automatic language detection
   */
  analyzeEmotion(text, preferredLanguage = null) {
    // Determine language
    const language = preferredLanguage || this.detectLanguage(text);

    // Check if language is supported
    if (!this.supportedLanguages.includes(language)) {
      return this.analyzeEmotionForLanguage(text, 'en'); // Fallback to English
    }

    // Analyze emotion for the detected language
    return this.analyzeEmotionForLanguage(text, language);
  }

  /**
   * Translate analysis result to another language
   */
  translateAnalysis(analysis, targetLanguage) {
    if (!this.translations[targetLanguage]) {
      return analysis; // Return original if translation not available
    }

    const trans = this.translations[targetLanguage];
    const emotionName = this.translateEmotionName(analysis.primary, analysis.language, targetLanguage);

    return {
      ...analysis,
      _translated: {
        primary_label: emotionName,
        sentiment_label: trans[analysis.sentiment] || analysis.sentiment,
        language_from: analysis.language,
        language_to: targetLanguage
      }
    };
  }

  /**
   * Translate emotion name to another language
   */
  translateEmotionName(emotionName, fromLanguage = 'en', toLanguage = 'en') {
    if (fromLanguage === toLanguage) {
      return emotionName;
    }

    const emotionMap = this.emotionMaps[toLanguage];
    if (emotionMap && emotionMap[emotionName]) {
      return emotionMap[emotionName][0]; // Return first keyword as translation
    }

    return emotionName;
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages() {
    return this.supportedLanguages;
  }

  /**
   * Get language name in English and native
   */
  getLanguageInfo() {
    return {
      en: { name: 'English', native: 'English' },
      es: { name: 'Spanish', native: 'Español' },
      fr: { name: 'French', native: 'Français' },
      de: { name: 'German', native: 'Deutsch' },
      zh: { name: 'Mandarin Chinese', native: '普通话' },
      pt: { name: 'Portuguese', native: 'Português' }
    };
  }

  /**
   * Clear detection cache
   */
  clearCache() {
    this.detectionCache.clear();
    return { success: true, message: 'Cache cleared' };
  }
}
