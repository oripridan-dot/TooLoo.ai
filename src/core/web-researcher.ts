/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TooLoo.ai - Web Researcher
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Enables TooLoo to research the real web for industry best practices,
 * documentation, and inspiration.
 *
 * Uses multiple strategies:
 * 1. GitHub API for code examples and patterns
 * 2. DuckDuckGo for general web search (no API key needed)
 * 3. Direct documentation fetching
 *
 * @version Genesis
 * @born 2025-12-16
 */

import { EventEmitter } from 'events';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: 'github' | 'web' | 'documentation';
}

export interface GitHubRepo {
  name: string;
  fullName: string;
  description: string;
  url: string;
  stars: number;
  language: string;
  topics: string[];
}

export interface GitHubCodeResult {
  repository: string;
  path: string;
  url: string;
  content: string;
}

export interface ResearchResult {
  query: string;
  results: WebSearchResult[];
  codeExamples: GitHubCodeResult[];
  topRepos: GitHubRepo[];
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEB RESEARCHER
// ═══════════════════════════════════════════════════════════════════════════════

export class WebResearcher extends EventEmitter {
  private githubToken: string | null;
  private cache: Map<string, { result: ResearchResult; timestamp: number }> = new Map();
  private cacheTimeout = 30 * 60 * 1000; // 30 minutes

  constructor() {
    super();
    this.githubToken = process.env['GITHUB_TOKEN'] || null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MAIN RESEARCH FUNCTION
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Research a topic across multiple sources
   */
  async research(
    query: string,
    options?: {
      includeCode?: boolean;
      maxResults?: number;
      languages?: string[];
    }
  ): Promise<ResearchResult> {
    this.emit('research:start', { query });

    // Check cache
    const cached = this.cache.get(query);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      this.emit('research:cached', { query });
      return cached.result;
    }

    const maxResults = options?.maxResults || 10;
    const results: WebSearchResult[] = [];
    const codeExamples: GitHubCodeResult[] = [];
    const topRepos: GitHubRepo[] = [];

    // 1. Search GitHub for repositories
    try {
      const repos = await this.searchGitHubRepos(query, options?.languages);
      topRepos.push(...repos.slice(0, 5));

      // Add repo results to web results
      repos.forEach((repo) => {
        results.push({
          title: repo.name,
          url: repo.url,
          snippet: repo.description || 'No description',
          source: 'github',
        });
      });
    } catch (error) {
      console.warn('[WebResearcher] GitHub repo search failed:', error);
    }

    // 2. Search GitHub for code examples
    if (options?.includeCode !== false) {
      try {
        const code = await this.searchGitHubCode(query, options?.languages);
        codeExamples.push(...code.slice(0, 5));
      } catch (error) {
        console.warn('[WebResearcher] GitHub code search failed:', error);
      }
    }

    // 3. Search DuckDuckGo for general web results
    try {
      const webResults = await this.searchWeb(query);
      results.push(...webResults.slice(0, maxResults - results.length));
    } catch (error) {
      console.warn('[WebResearcher] Web search failed:', error);
    }

    const result: ResearchResult = {
      query,
      results: results.slice(0, maxResults),
      codeExamples,
      topRepos,
      timestamp: new Date().toISOString(),
    };

    // Cache the result
    this.cache.set(query, { result, timestamp: Date.now() });

    this.emit('research:complete', { query, resultCount: results.length });
    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GITHUB SEARCH
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Search GitHub repositories
   */
  async searchGitHubRepos(query: string, languages?: string[]): Promise<GitHubRepo[]> {
    let searchQuery = query;
    if (languages && languages.length > 0) {
      searchQuery += ` language:${languages[0]}`;
    }

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'TooLoo-AI-Research',
    };

    if (this.githubToken) {
      headers['Authorization'] = `token ${this.githubToken}`;
    }

    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}&sort=stars&order=desc&per_page=10`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();

    return (data.items || []).map((item: any) => ({
      name: item.name,
      fullName: item.full_name,
      description: item.description,
      url: item.html_url,
      stars: item.stargazers_count,
      language: item.language,
      topics: item.topics || [],
    }));
  }

  /**
   * Search GitHub code
   */
  async searchGitHubCode(query: string, languages?: string[]): Promise<GitHubCodeResult[]> {
    let searchQuery = query;
    if (languages && languages.length > 0) {
      searchQuery += ` language:${languages[0]}`;
    }

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'TooLoo-AI-Research',
    };

    if (this.githubToken) {
      headers['Authorization'] = `token ${this.githubToken}`;
    }

    const url = `https://api.github.com/search/code?q=${encodeURIComponent(searchQuery)}&per_page=10`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      // Code search requires authentication
      if (response.status === 401 || response.status === 403) {
        console.warn('[WebResearcher] GitHub code search requires authentication');
        return [];
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();

    const results: GitHubCodeResult[] = [];
    for (const item of (data.items || []).slice(0, 5)) {
      results.push({
        repository: item.repository?.full_name || 'unknown',
        path: item.path,
        url: item.html_url,
        content: '', // Would need another API call to get content
      });
    }

    return results;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // WEB SEARCH
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Search the web using DuckDuckGo (no API key needed)
   */
  async searchWeb(query: string): Promise<WebSearchResult[]> {
    // Use DuckDuckGo Instant Answer API
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'TooLoo-AI-Research' },
      });

      if (!response.ok) {
        throw new Error(`DuckDuckGo API error: ${response.status}`);
      }

      const data = await response.json();
      const results: WebSearchResult[] = [];

      // Abstract (main result)
      if (data.Abstract) {
        results.push({
          title: data.Heading || query,
          url: data.AbstractURL || '',
          snippet: data.Abstract,
          source: 'web',
        });
      }

      // Related topics
      if (data.RelatedTopics) {
        for (const topic of data.RelatedTopics.slice(0, 5)) {
          if (topic.Text && topic.FirstURL) {
            results.push({
              title: topic.Text.split(' - ')[0] || topic.Text.slice(0, 50),
              url: topic.FirstURL,
              snippet: topic.Text,
              source: 'web',
            });
          }
        }
      }

      return results;
    } catch (error) {
      console.warn('[WebResearcher] DuckDuckGo search failed:', error);
      return [];
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DOCUMENTATION FETCHING
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Fetch documentation from a URL
   */
  async fetchDocumentation(url: string): Promise<string> {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'TooLoo-AI-Research' },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const json = await response.json();
        return JSON.stringify(json, null, 2);
      }

      const text = await response.text();

      // If HTML, try to extract main content
      if (contentType.includes('text/html')) {
        // Simple extraction - get text between common content markers
        const bodyMatch = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch) {
          // Strip HTML tags
          return bodyMatch[1]
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 10000); // Limit size
        }
      }

      return text.slice(0, 10000);
    } catch (error) {
      throw new Error(`Failed to fetch documentation: ${error}`);
    }
  }

  /**
   * Fetch a GitHub README
   */
  async fetchGitHubReadme(owner: string, repo: string): Promise<string> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3.raw',
      'User-Agent': 'TooLoo-AI-Research',
    };

    if (this.githubToken) {
      headers['Authorization'] = `token ${this.githubToken}`;
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/readme`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    return response.text();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SPECIALIZED RESEARCH
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Research best practices for a specific technology
   */
  async researchBestPractices(technology: string): Promise<ResearchResult> {
    const query = `${technology} best practices patterns`;
    return this.research(query, { includeCode: true });
  }

  /**
   * Research how to implement something
   */
  async researchImplementation(feature: string, language?: string): Promise<ResearchResult> {
    const query = `how to implement ${feature}${language ? ` in ${language}` : ''}`;
    return this.research(query, {
      includeCode: true,
      languages: language ? [language] : undefined,
    });
  }

  /**
   * Research industry leaders in a domain
   */
  async researchIndustryLeaders(domain: string): Promise<GitHubRepo[]> {
    const query = `${domain} awesome`;
    return this.searchGitHubRepos(query);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { entries: number; oldestEntry: string | null } {
    let oldest: number | null = null;
    for (const [, value] of this.cache) {
      if (oldest === null || value.timestamp < oldest) {
        oldest = value.timestamp;
      }
    }

    return {
      entries: this.cache.size,
      oldestEntry: oldest ? new Date(oldest).toISOString() : null,
    };
  }

  /**
   * Check if GitHub token is available
   */
  hasGitHubToken(): boolean {
    return this.githubToken !== null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════════

export const webResearcher = new WebResearcher();
export default webResearcher;
