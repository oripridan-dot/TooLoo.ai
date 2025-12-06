// @version 3.3.11
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as cheerio from 'cheerio';

interface Source {
  id: string;
  url: string;
  content: string;
  timestamp: string;
  metadata: Record<string, any>;
}

interface Interaction {
  id: string;
  userMessage: string;
  assistantResponse: string;
  timestamp: string;
  success: boolean;
  metadata?: Record<string, any>;
}

interface SessionStats {
  totalSessions: number;
  successfulGenerations: number;
  failedGenerations: number;
  uniqueSessionIds: string[];
  providerUsage: Record<string, number>;
  lastUpdated: string;
}

interface LearningMemory {
  sources: Source[];
  interactions: Interaction[];
  vectors: any[];
  stats: SessionStats;
}

interface FetchOptions {
  timeout?: number;
  maxContentLength?: number;
  extractText?: boolean;
  followRedirects?: boolean;
}

export class Learner {
  private memoryPath: string;
  private memory: LearningMemory;
  private readonly DEFAULT_TIMEOUT = 15000; // 15 seconds
  private readonly MAX_CONTENT_LENGTH = 500000; // 500KB max

  constructor() {
    this.memoryPath = path.join(process.cwd(), 'data', 'memory', 'vectors.json');
    this.memory = {
      sources: [],
      interactions: [],
      vectors: [],
      stats: {
        totalSessions: 0,
        successfulGenerations: 0,
        failedGenerations: 0,
        uniqueSessionIds: [],
        providerUsage: {},
        lastUpdated: new Date().toISOString(),
      },
    };
    this.loadMemory();
  }

  private async loadMemory() {
    try {
      await fs.ensureDir(path.dirname(this.memoryPath));
      if (await fs.pathExists(this.memoryPath)) {
        const data = await fs.readJson(this.memoryPath);
        this.memory = {
          sources: data.sources || [],
          interactions: data.interactions || [],
          vectors: data.vectors || [],
          stats: data.stats || {
            totalSessions: 0,
            successfulGenerations: 0,
            failedGenerations: 0,
            uniqueSessionIds: [],
            providerUsage: {},
            lastUpdated: new Date().toISOString(),
          },
        };
      } else {
        await this.saveMemory();
      }
    } catch (error) {
      console.error('Failed to load learner memory:', error);
    }
  }

  private async saveMemory() {
    try {
      await fs.writeJson(this.memoryPath, this.memory, { spaces: 2 });
    } catch (error) {
      console.error('Failed to save learner memory:', error);
    }
  }

  /**
   * Fetch content from a URL with proper error handling and content extraction
   */
  private async fetchUrlContent(
    url: string,
    options: FetchOptions = {}
  ): Promise<{
    content: string;
    title?: string;
    contentType: string;
    length: number;
  }> {
    const {
      timeout = this.DEFAULT_TIMEOUT,
      maxContentLength = this.MAX_CONTENT_LENGTH,
      extractText = true,
      followRedirects = true,
    } = options;

    console.log(`[Learner] Fetching URL: ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        redirect: followRedirects ? 'follow' : 'manual',
        headers: {
          'User-Agent': 'TooLoo-Learner/3.3.0 (Knowledge Ingestion Bot)',
          Accept: 'text/html,application/json,text/plain,*/*',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || 'text/plain';
      const contentLength = parseInt(response.headers.get('content-length') || '0', 10);

      // Check content length before downloading
      if (contentLength > maxContentLength) {
        console.warn(`[Learner] Content too large (${contentLength} bytes), truncating...`);
      }

      const rawContent = await response.text();
      const truncatedContent = rawContent.slice(0, maxContentLength);

      let content = truncatedContent;
      let title: string | undefined;

      // Extract text from HTML if needed
      if (extractText && contentType.includes('text/html')) {
        const extracted = this.extractTextFromHtml(truncatedContent);
        content = extracted.text;
        title = extracted.title;
      } else if (contentType.includes('application/json')) {
        // Pretty-print JSON for readability
        try {
          const json = JSON.parse(truncatedContent);
          content = JSON.stringify(json, null, 2);
        } catch {
          content = truncatedContent;
        }
      }

      console.log(`[Learner] Fetched ${content.length} chars from ${url}`);

      return {
        content,
        title,
        contentType,
        length: content.length,
      };
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error(`Fetch timeout after ${timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Extract readable text from HTML using cheerio
   */
  private extractTextFromHtml(html: string): { text: string; title?: string } {
    try {
      const $ = cheerio.load(html);

      // Get title
      const title =
        $('title').first().text().trim() ||
        $('h1').first().text().trim() ||
        $('meta[property="og:title"]').attr('content');

      // Remove script, style, and other non-content elements
      $('script, style, nav, footer, header, aside, iframe, noscript').remove();

      // Get meta description
      const metaDesc =
        $('meta[name="description"]').attr('content') ||
        $('meta[property="og:description"]').attr('content') ||
        '';

      // Extract main content (prefer article, main, or body)
      let mainContent = '';
      const contentSelectors = [
        'article',
        'main',
        '.content',
        '#content',
        '.post',
        '.article',
        'body',
      ];

      for (const selector of contentSelectors) {
        const element = $(selector).first();
        if (element.length) {
          mainContent = element.text();
          break;
        }
      }

      // Clean up the text
      const cleanText = mainContent
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/\n\s*\n/g, '\n\n') // Normalize line breaks
        .trim();

      // Combine meta description with content
      const finalText = metaDesc ? `${metaDesc}\n\n${cleanText}` : cleanText;

      return {
        text: finalText.slice(0, this.MAX_CONTENT_LENGTH),
        title: title || undefined,
      };
    } catch (error) {
      console.warn('[Learner] HTML extraction failed, using raw text');
      return {
        text: html
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim(),
      };
    }
  }

  async ingestInteraction(
    userMessage: string,
    assistantResponse: string,
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; id: string }> {
    const id = uuidv4();

    // Determine if this was a successful interaction
    // Success = got a response without error indicators
    const isSuccess = Boolean(
      assistantResponse &&
      !assistantResponse.toLowerCase().includes('error') &&
      !assistantResponse.toLowerCase().includes('failed') &&
      assistantResponse.length > 10
    );

    const interaction: Interaction = {
      id,
      userMessage,
      assistantResponse,
      timestamp: new Date().toISOString(),
      success: isSuccess,
      metadata,
    };

    this.memory.interactions.push(interaction);

    // Update stats
    const sessionId = metadata?.['sessionId'] as string | undefined;
    if (sessionId && !this.memory.stats.uniqueSessionIds.includes(sessionId)) {
      this.memory.stats.uniqueSessionIds.push(sessionId);
      this.memory.stats.totalSessions = this.memory.stats.uniqueSessionIds.length;
    }

    if (isSuccess) {
      this.memory.stats.successfulGenerations++;
    } else {
      this.memory.stats.failedGenerations++;
    }

    // Track provider usage
    const provider = (metadata?.['provider'] as string) || 'unknown';
    this.memory.stats.providerUsage[provider] =
      (this.memory.stats.providerUsage[provider] || 0) + 1;
    this.memory.stats.lastUpdated = new Date().toISOString();

    // Keep only last 1000 interactions to prevent file bloat
    if (this.memory.interactions.length > 1000) {
      this.memory.interactions = this.memory.interactions.slice(-1000);
    }

    // Keep only last 100 session IDs
    if (this.memory.stats.uniqueSessionIds.length > 100) {
      this.memory.stats.uniqueSessionIds = this.memory.stats.uniqueSessionIds.slice(-100);
    }

    await this.saveMemory();
    return { success: true, id };
  }

  /**
   * Ingest content from a URL into the learning system
   */
  async ingest(
    url: string,
    options?: FetchOptions
  ): Promise<{
    success: boolean;
    id?: string;
    error?: string;
    metadata?: Record<string, any>;
  }> {
    try {
      // Validate URL
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch {
        return { success: false, error: 'Invalid URL format' };
      }

      // Only allow http/https
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return { success: false, error: `Unsupported protocol: ${parsedUrl.protocol}` };
      }

      // Fetch the content
      const { content, title, contentType, length } = await this.fetchUrlContent(url, options);

      if (!content || content.length < 50) {
        return { success: false, error: 'Content too short or empty' };
      }

      const id = uuidv4();
      const source: Source = {
        id,
        url,
        content,
        timestamp: new Date().toISOString(),
        metadata: {
          status: 'ingested',
          type: 'web',
          title: title || parsedUrl.hostname,
          contentType,
          contentLength: length,
          domain: parsedUrl.hostname,
          path: parsedUrl.pathname,
        },
      };

      this.memory.sources.push(source);

      // Keep only last 100 sources to prevent bloat
      if (this.memory.sources.length > 100) {
        this.memory.sources = this.memory.sources.slice(-100);
      }

      await this.saveMemory();

      console.log(`[Learner] ✅ Ingested "${title || url}" (${length} chars)`);

      return {
        success: true,
        id,
        metadata: source.metadata,
      };
    } catch (error: any) {
      console.error(`[Learner] ❌ Failed to ingest ${url}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Bulk ingest multiple URLs
   */
  async ingestBulk(urls: string[]): Promise<{
    successful: number;
    failed: number;
    results: Array<{ url: string; success: boolean; id?: string; error?: string }>;
  }> {
    const results: Array<{ url: string; success: boolean; id?: string; error?: string }> = [];
    let successful = 0;
    let failed = 0;

    for (const url of urls) {
      const result = await this.ingest(url);
      results.push({ url, ...result });

      if (result.success) {
        successful++;
      } else {
        failed++;
      }

      // Small delay between requests to be polite
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return { successful, failed, results };
  }

  async query(queryText: string): Promise<{ answer: string; sources: Source[] }> {
    // Simple keyword search simulation
    const keywords = queryText.toLowerCase().split(' ');
    const relevantSources = this.memory.sources.filter((source) =>
      keywords.some(
        (kw) => source.url.toLowerCase().includes(kw) || source.content.toLowerCase().includes(kw)
      )
    );

    // In a real system, this would use an LLM to generate an answer
    const answer =
      relevantSources.length > 0
        ? `Based on your sources, I found information related to "${queryText}" in ${relevantSources.length} documents.`
        : `I couldn't find any specific information about "${queryText}" in the ingested sources.`;

    return { answer, sources: relevantSources };
  }

  async listSources(): Promise<Source[]> {
    return this.memory.sources;
  }

  /**
   * Get real-time statistics from tracked interactions
   */
  getStats(): SessionStats {
    return this.memory.stats;
  }

  /**
   * Calculate real metrics for the dashboard
   */
  calculateMetrics(): {
    totalSessions: number;
    successfulGenerations: number;
    failedGenerations: number;
    firstTrySuccessRate: number;
    providerBreakdown: Record<string, number>;
  } {
    const total = this.memory.stats.successfulGenerations + this.memory.stats.failedGenerations;
    const successRate = total > 0 ? this.memory.stats.successfulGenerations / total : 0;

    return {
      totalSessions: this.memory.stats.totalSessions,
      successfulGenerations: this.memory.stats.successfulGenerations,
      failedGenerations: this.memory.stats.failedGenerations,
      firstTrySuccessRate: successRate,
      providerBreakdown: this.memory.stats.providerUsage,
    };
  }

  /**
   * Analyze repeated problems (same type of failures)
   */
  analyzeRepeatProblems(): {
    repeatRate: number;
    commonFailures: Array<{ pattern: string; count: number }>;
  } {
    const failures = this.memory.interactions.filter((i) => !i.success);
    const patterns: Record<string, number> = {};

    for (const failure of failures) {
      // Extract error pattern from response
      const errorMatch = failure.assistantResponse.match(/error[:\s]+([^.]+)/i);
      const pattern = errorMatch ? errorMatch[1]?.trim().substring(0, 50) : 'unknown';
      if (pattern) {
        patterns[pattern] = (patterns[pattern] || 0) + 1;
      }
    }

    const commonFailures = Object.entries(patterns)
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const total = this.memory.interactions.length;
    const repeatRate = total > 0 ? failures.length / total : 0;

    return { repeatRate, commonFailures };
  }

  /**
   * Delete a source by ID
   */
  async deleteSource(id: string): Promise<boolean> {
    const index = this.memory.sources.findIndex((s) => s.id === id);
    if (index !== -1) {
      this.memory.sources.splice(index, 1);
      await this.saveMemory();
      return true;
    }
    return false;
  }

  /**
   * Search sources by content or URL
   */
  searchSources(query: string, limit: number = 10): Source[] {
    const lowerQuery = query.toLowerCase();
    return this.memory.sources
      .filter(
        (s) =>
          s.url.toLowerCase().includes(lowerQuery) ||
          s.content.toLowerCase().includes(lowerQuery) ||
          (s.metadata['title'] && String(s.metadata['title']).toLowerCase().includes(lowerQuery))
      )
      .slice(0, limit);
  }
}

export const learner = new Learner();
