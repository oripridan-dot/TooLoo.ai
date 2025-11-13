/**
 * Response Visual Formatter
 * Enhances readability with structured formatting, visual hierarchy, and typography
 * Generates rich markdown/HTML with proper spacing, emphasis, and visual flow
 */

class ResponseVisualFormatter {
  /**
   * Format response with visual hierarchy and structure
   */
  formatResponse(content, options = {}) {
    const {
      type = 'standard', // 'standard', 'technical', 'strategic', 'creative'
      provider = null,
      quality = 85,
      showMetrics = true
    } = options;

    let formatted = '';

    // Add quality indicator badge
    if (showMetrics) {
      formatted += this.createQualityBadge(quality);
    }

    // Format based on content type
    if (type === 'technical') {
      formatted += this.formatTechnical(content);
    } else if (type === 'strategic') {
      formatted += this.formatStrategic(content);
    } else if (type === 'creative') {
      formatted += this.formatCreative(content);
    } else {
      formatted += this.formatStandard(content);
    }

    // Add attribution
    if (provider) {
      formatted += this.createAttribution(provider, quality);
    }

    return formatted;
  }

  /**
   * Standard format with clear sections
   */
  formatStandard(content) {
    return `
${this.createSectionBreak()}

${content}

${this.createSectionBreak()}
`;
  }

  /**
   * Technical format with code-friendly structure
   */
  formatTechnical(content) {
    // Split into sections if possible
    const sections = this.extractSections(content);
    
    let formatted = '\n';
    
    if (sections.problem) {
      formatted += `## 🎯 Problem\n${sections.problem}\n\n`;
    }
    
    if (sections.rootCause) {
      formatted += `## 🔍 Root Cause\n${sections.rootCause}\n\n`;
    }
    
    if (sections.solution) {
      formatted += `## ✅ Solution\n${sections.solution}\n\n`;
    }
    
    if (sections.steps) {
      formatted += `## 📋 Steps\n${this.createNumberedList(sections.steps)}\n\n`;
    }
    
    if (sections.codeExample) {
      formatted += `## 💻 Example\n\`\`\`\n${sections.codeExample}\n\`\`\`\n\n`;
    }
    
    if (sections.expected) {
      formatted += `## 🎁 Expected Result\n${sections.expected}\n\n`;
    }

    return formatted || `\n${content}\n`;
  }

  /**
   * Strategic format with insight emphasis
   */
  formatStrategic(content) {
    const insights = this.extractInsights(content);
    
    let formatted = '\n';
    
    formatted += `## 💡 Key Insight\n> ${insights[0] || content.substring(0, 150)}\n\n`;
    
    if (insights.length > 1) {
      formatted += `## 📊 Supporting Insights\n`;
      insights.slice(1).forEach((insight, i) => {
        formatted += `${i + 1}. **${insight}**\n`;
      });
      formatted += '\n';
    }
    
    formatted += `## 🎯 Recommendation\n${this.extractRecommendation(content)}\n`;

    return formatted;
  }

  /**
   * Creative format with emphasis on originality
   */
  formatCreative(content) {
    const ideas = this.extractIdeas(content);
    
    let formatted = '\n';
    
    formatted += `## 🚀 Core Ideas\n`;
    ideas.slice(0, 3).forEach((idea, i) => {
      formatted += `${i + 1}. **${idea}** – brings fresh perspective\n`;
    });
    formatted += '\n';
    
    formatted += `## 💭 Why This Works\n${this.extractRationale(content)}\n\n`;
    
    formatted += `## ⚡ Quick Win\n${this.extractQuickWin(content)}\n`;

    return formatted;
  }

  /**
   * Extract problem/solution/steps from content
   */
  extractSections(content) {
    const sections = {
      problem: '',
      rootCause: '',
      solution: '',
      steps: '',
      codeExample: '',
      expected: ''
    };

    // Simple pattern matching
    const problemMatch = content.match(/(?:problem|issue|error)[:—]?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n\n|root cause|solution|$)/i);
    if (problemMatch) sections.problem = problemMatch[1].trim();

    const rootMatch = content.match(/(?:root cause|cause)[:—]?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n\n|solution|$)/i);
    if (rootMatch) sections.rootCause = rootMatch[1].trim();

    const solutionMatch = content.match(/(?:solution)[:—]?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n\n|steps|expected|$)/i);
    if (solutionMatch) sections.solution = solutionMatch[1].trim();

    const stepsMatch = content.match(/(?:steps|instructions)[:—]?\s*((?:\d+\.|[-•])\s*.+(?:\n(?:\d+\.|[-•])\s*.+)*)/i);
    if (stepsMatch) sections.steps = stepsMatch[1].trim();

    const codeMatch = content.match(/(?:code|example|implementation)[:—]?\s*```[\s\S]*?```/i);
    if (codeMatch) sections.codeExample = codeMatch[0].trim();

    const expectedMatch = content.match(/(?:expected|result)[:—]?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n\n|$)/i);
    if (expectedMatch) sections.expected = expectedMatch[1].trim();

    return sections;
  }

  /**
   * Extract key insights from content
   */
  extractInsights(content) {
    const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 30);
    return sentences.slice(0, 3);
  }

  /**
   * Extract main recommendation
   */
  extractRecommendation(content) {
    const recMatch = content.match(/(?:recommend|suggest|should|i would)(?:\s+[a-z]+)*[:—]?\s*([^\n]+(?:\n[^\n]+)?)/i);
    if (recMatch) return recMatch[1].trim();
    
    // Fallback: last substantive sentence
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 40);
    return sentences[sentences.length - 1]?.trim() || 'Review implementation and monitor outcomes.';
  }

  /**
   * Extract ideas from creative content
   */
  extractIdeas(content) {
    const parts = content.split(/[.!?]+/);
    return parts
      .map(p => p.trim())
      .filter(p => p.length > 20)
      .slice(0, 5);
  }

  /**
   * Extract rationale for creative ideas
   */
  extractRationale(content) {
    const match = content.match(/(?:why|because|reason)(?:\s+[a-z]+)*[:—]?\s*([^\n]+(?:\n[^\n]+)?)/i);
    if (match) return match[1].trim();
    return 'Combines fresh perspective with practical implementation.';
  }

  /**
   * Extract quick win from content
   */
  extractQuickWin(content) {
    const match = content.match(/(?:quick win|immediate|first step)[:—]?\s*([^\n]+(?:\n[^\n]+)?)/i);
    if (match) return match[1].trim();
    
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 30);
    return sentences[0]?.trim() || 'Start with the most impactful suggestion and iterate.';
  }

  /**
   * Create numbered list with proper formatting
   */
  createNumberedList(steps) {
    let list = '';
    
    if (typeof steps === 'string') {
      list = steps.split('\n').map((step, i) => {
        step = step.replace(/^\d+\.\s*/, '').replace(/^[-•]\s*/, '');
        return `${i + 1}. ${step}`;
      }).join('\n');
    } else if (Array.isArray(steps)) {
      list = steps.map((step, i) => `${i + 1}. ${step}`).join('\n');
    }
    
    return list;
  }

  /**
   * Create quality badge with visual indicator
   */
  createQualityBadge(quality) {
    const percentage = Math.min(Math.max(quality, 0), 100);
    const stars = Math.ceil(percentage / 20);
    const starDisplay = '⭐'.repeat(stars) + '☆'.repeat(5 - stars);
    
    let badge = '';
    if (percentage >= 85) {
      badge = `> ### ⚡ **Premium Response** (${percentage}% quality)`;
    } else if (percentage >= 70) {
      badge = `> ### 📊 **Good Response** (${percentage}% quality)`;
    } else {
      badge = `> ### 📝 **Response** (${percentage}% quality)`;
    }
    
    return badge + '\n';
  }

  /**
   * Create section break for visual separation
   */
  createSectionBreak() {
    return '---';
  }

  /**
   * Create attribution with provider and quality
   */
  createAttribution(provider, quality) {
    const providerName = this.getProviderName(provider);
    const confidence = quality >= 85 ? '✓ High confidence' : quality >= 70 ? 'Moderate confidence' : 'Review recommended';
    
    return `\n---\n\n> **${providerName}** via TooLoo.ai  \n> ${confidence} • Quality: ${quality}/100\n`;
  }

  /**
   * Get friendly provider name
   */
  getProviderName(provider) {
    const names = {
      'claude': 'Claude (Anthropic)',
      'gemini': 'Gemini (Google)',
      'openai': 'GPT-4 (OpenAI)',
      'gpt-4': 'GPT-4 (OpenAI)',
      'gpt-3.5': 'GPT-3.5 (OpenAI)',
    };
    return names[provider?.toLowerCase()] || 'AI Assistant';
  }

  /**
   * Format multi-provider unified response with comparison view
   */
  formatUnifiedResponse(query, enhancedResponses, showComparison = false) {
    let output = `\n# 🎯 TooLoo.ai Unified Intelligence\n`;
    output += `**Query:** ${query}\n\n`;

    // Main synthesized answer
    output += `## 💎 Synthesized Answer\n`;
    output += `${enhancedResponses.synthesis || enhancedResponses.main}\n\n`;

    // Provider insights if multiple responses
    if (Object.keys(enhancedResponses).length > 2 && showComparison) {
      output += `## 🔬 Provider Insights\n`;
      
      Object.entries(enhancedResponses).forEach(([provider, response]) => {
        if (provider !== 'synthesis' && provider !== 'main') {
          output += `### ${this.getProviderName(provider)}\n`;
          output += `${response.substring(0, 300)}...\n\n`;
        }
      });
    }

    // Key takeaways
    output += `## 📌 Key Takeaways\n`;
    output += `• Focused, actionable guidance\n`;
    output += `• Synthesized from multiple expert perspectives\n`;
    output += `• Ready to implement immediately\n\n`;

    output += `---\n_Delivered by TooLoo.ai_`;

    return output;
  }

  /**
   * Strip formatting for plain text (logging, storage)
   */
  stripFormatting(formattedText) {
    return formattedText
      .replace(/#+\s+/g, '') // Remove headers
      .replace(/[*_`]/g, '') // Remove emphasis
      .replace(/>\s+/g, '') // Remove blockquotes
      .replace(/[-•]\s+/g, '') // Remove lists
      .replace(/\n{2,}/g, '\n') // Normalize whitespace
      .trim();
  }
}

export default ResponseVisualFormatter;
