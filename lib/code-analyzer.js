export class CodeAnalyzer {
  constructor() {
    this.languageExtensions = {
      javascript: ['.js', '.jsx', '.ts', '.tsx'],
      python: ['.py'],
      java: ['.java'],
      csharp: ['.cs'],
      ruby: ['.rb'],
      php: ['.php'],
      go: ['.go'],
      rust: ['.rs'],
      cpp: ['.cpp', '.cc', '.cxx', '.h'],
      c: ['.c', '.h'],
      html: ['.html', '.htm'],
      css: ['.css', '.scss', '.sass'],
      json: ['.json'],
      markdown: ['.md', '.markdown'],
      yaml: ['.yml', '.yaml'],
    };

    this.complexityPatterns = {
      cyclomaticLow: { regex: /if|else|case|catch/g, weight: 1 },
      cyclomaticMedium: { regex: /for|while|do|try/g, weight: 1 },
      cyclomaticHigh: { regex: /&&|\|\||\?/g, weight: 0.5 },
    };
  }

  detectLanguage(filePath) {
    const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();

    for (const [language, extensions] of Object.entries(this.languageExtensions)) {
      if (extensions.includes(ext)) {
        return language;
      }
    }

    return 'unknown';
  }

  analyzeCode(content) {
    const lines = content.split('\n');

    let complexityScore = 0;
    for (const [, pattern] of Object.entries(this.complexityPatterns)) {
      const matches = content.match(pattern.regex);
      if (matches) {
        complexityScore += matches.length * pattern.weight;
      }
    }

    const metrics = {
      lineCount: lines.length,
      codeLines: lines.filter((l) => l.trim() && !l.trim().startsWith('//')).length,
      commentLines: lines.filter((l) => l.trim().startsWith('//') || l.trim().startsWith('#')).length,
      blankLines: lines.filter((l) => !l.trim()).length,
      averageLineLength:
        lines.length > 0
          ? Math.round(content.length / lines.length)
          : 0,
      complexity: Math.min(Math.round(complexityScore / 10) + 1, 10),
    };

    return metrics;
  }

  analyzeFile(fileName, content) {
    const language = this.detectLanguage(fileName);
    const metrics = this.analyzeCode(content);

    return {
      file: fileName,
      language,
      metrics,
      complexity: {
        score: metrics.complexity,
        level: this.getComplexityLevel(metrics.complexity),
      },
      quality: {
        commentRatio: metrics.codeLines > 0 ? 
          (metrics.commentLines / metrics.codeLines * 100).toFixed(1) + '%' : 
          '0%',
        maintainability: this.calculateMaintainability(metrics),
      },
    };
  }

  getComplexityLevel(score) {
    if (score <= 2) return 'low';
    if (score <= 5) return 'medium';
    if (score <= 8) return 'high';
    return 'critical';
  }

  calculateMaintainability(metrics) {
    let score = 100;

    if (metrics.averageLineLength > 120) score -= 10;
    if (metrics.complexity > 7) score -= 15;
    if (metrics.commentRatio < 5 && metrics.codeLines > 100) score -= 10;
    if (metrics.lineCount > 500) score -= 20;

    return Math.max(score, 0);
  }

  analyzeRepository(files) {
    const analysis = {
      totalFiles: files.length,
      filesByLanguage: {},
      filesByComplexity: { low: 0, medium: 0, high: 0, critical: 0 },
      averageComplexity: 0,
      totalLines: 0,
      files: [],
    };

    let complexitySum = 0;

    for (const file of files) {
      const fileAnalysis = this.analyzeFile(file.name, file.content || '');
      analysis.files.push(fileAnalysis);

      const language = fileAnalysis.language;
      if (!analysis.filesByLanguage[language]) {
        analysis.filesByLanguage[language] = 0;
      }
      analysis.filesByLanguage[language]++;

      const level = fileAnalysis.complexity.level;
      analysis.filesByComplexity[level]++;

      analysis.totalLines += fileAnalysis.metrics.lineCount;
      complexitySum += fileAnalysis.complexity.score;
    }

    if (analysis.totalFiles > 0) {
      analysis.averageComplexity = (complexitySum / analysis.totalFiles).toFixed(1);
    }

    return analysis;
  }

  identifyImportedLibraries(content) {
    const imports = new Set();

    const jsImports = content.match(/(?:import|require)\s+(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]/g);
    if (jsImports) {
      jsImports.forEach((imp) => {
        const match = imp.match(/['"]([^'"]+)['"]/);
        if (match) imports.add(match[1]);
      });
    }

    const pythonImports = content.match(/(?:import|from)\s+(?:[\w.]+)/g);
    if (pythonImports) {
      pythonImports.forEach((imp) => {
        const parts = imp.split(/\s+/);
        if (parts.length > 1) imports.add(parts[parts.length - 1]);
      });
    }

    return Array.from(imports);
  }

  identifyPatterns(content) {
    const patterns = {
      singleton: /class\s+\w+\s*{[\s\S]*?static\s+getInstance/i.test(content),
      factory: /function\s+\w*[Ff]actory\s*\(|class\s+\w*[Ff]actory/i.test(content),
      observer: /addEventListener|subscribe|\.on\(/i.test(content),
      builder: /class\s+\w*[Bb]uilder[\s{]|\.builder\(\)/i.test(content),
      decorator: /@|def\s+\w+\(.*\):|function\s+\w+\(func\)/i.test(content),
      mvc: /controller|model|view|route/i.test(content) && 
            /app\.|express|django|rails/i.test(content),
    };

    return Object.entries(patterns)
      .filter(([, present]) => present)
      .map(([pattern]) => pattern);
  }

  getSecurityConcerns(content) {
    const concerns = [];

    if (/eval\s*\(|exec\s*\(|Function\s*\(/i.test(content)) {
      concerns.push('Dynamic code execution detected');
    }
    if (/sql\s+query|\.query\(.*\+/i.test(content)) {
      concerns.push('Potential SQL injection vulnerability');
    }
    if (/password|secret|token|key/i.test(content)) {
      concerns.push('Potential hardcoded credentials');
    }
    if (/localhost|127\.0\.0\.1|192\.168/i.test(content)) {
      concerns.push('Hardcoded IP addresses or localhost references');
    }

    return concerns;
  }

  summarizeAnalysis(analysis) {
    const languages = Object.entries(analysis.filesByLanguage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([lang, count]) => `${lang} (${count})`)
      .join(', ');

    return {
      totalFiles: analysis.totalFiles,
      topLanguages: languages,
      averageComplexity: analysis.averageComplexity,
      totalLines: analysis.totalLines,
      averageLinesPerFile: Math.round(analysis.totalLines / Math.max(analysis.totalFiles, 1)),
      complexityDistribution: analysis.filesByComplexity,
      highComplexityFiles: analysis.files
        .filter((f) => f.complexity.level === 'high' || f.complexity.level === 'critical')
        .map((f) => f.file),
    };
  }
}

export default CodeAnalyzer;
