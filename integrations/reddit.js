/**
 * Market Intelligence API - Reddit Integration
 * 
 * Monitors entrepreneurship and startup subreddits for problems, trends, and opportunities.
 * Discovers real pain points people are discussing.
 */

export class RedditAPI {
  constructor(clientId, clientSecret) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.baseURL = 'https://oauth.reddit.com';
    this.accessToken = null;
  }

  /**
   * Initialize and get OAuth token
   */
  async authenticate() {
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    
    try {
      const response = await fetch('https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
      });

      const data = await response.json();
      this.accessToken = data.access_token;
    } catch (error) {
      console.error('Reddit authentication error:', error);
    }
  }

  /**
   * Search for problem discussions
   * @param {Object} options - Search options
   * @param {Array<string>} options.keywords - Problem keywords (e.g., ['pain point', 'frustrating'])
   * @param {Array<string>} options.subreddits - Target subreddits (default: entrepreneurship subs)
   * @returns {Promise<Array>} Discussions about problems/pain points
   */
  async searchProblems({ keywords = ['pain point', 'frustrating', 'wish there was'], subreddits = ['Entrepreneur', 'startups', 'SaaS', 'SmallBusiness'] } = {}) {
    if (!this.accessToken) await this.authenticate();

    const problems = [];

    for (const subreddit of subreddits) {
      for (const keyword of keywords) {
        try {
          const posts = await this._searchSubreddit(subreddit, keyword);
          problems.push(...posts);
        } catch (error) {
          console.error(`Error searching r/${subreddit}:`, error);
        }
      }
    }

    // Remove duplicates and sort by score
    const unique = [...new Map(problems.map(p => [p.id, p])).values()];
    return unique.sort((a, b) => b.score - a.score).slice(0, 20);
  }

  /**
   * Get trending discussions in startup subreddits
   * @param {string} timeframe - 'day', 'week', 'month', 'year'
   * @returns {Promise<Array>} Hot topics
   */
  async getTrendingTopics(timeframe = 'week') {
    if (!this.accessToken) await this.authenticate();

    const subreddits = ['Entrepreneur', 'startups', 'SaaS', 'indiehackers'];
    const trending = [];

    for (const subreddit of subreddits) {
      try {
        const response = await fetch(
          `${this.baseURL}/r/${subreddit}/top/.json?t=${timeframe}&limit=10`,
          {
            headers: { 'Authorization': `Bearer ${this.accessToken}` }
          }
        );

        const data = await response.json();
        const posts = data.data.children.map(child => ({
          id: child.data.id,
          title: child.data.title,
          subreddit: subreddit,
          score: child.data.score,
          comments: child.data.num_comments,
          url: `https://reddit.com${child.data.permalink}`,
          text: child.data.selftext
        }));

        trending.push(...posts);
      } catch (error) {
        console.error(`Error fetching trending from r/${subreddit}:`, error);
      }
    }

    return trending.sort((a, b) => b.score - a.score);
  }

  /**
   * Analyze sentiment and extract insights from discussions
   * @param {Array} discussions - Array of discussion objects
   * @returns {Object} Aggregated insights
   */
  analyzeDiscussions(discussions) {
    const insights = {
      totalDiscussions: discussions.length,
      averageEngagement: discussions.reduce((sum, d) => sum + d.score, 0) / discussions.length,
      commonThemes: this._extractThemes(discussions),
      topProblems: discussions.slice(0, 5).map(d => ({
        problem: d.title,
        engagement: d.score,
        url: d.url
      }))
    };

    return insights;
  }

  /**
   * Find validated business ideas (products people are already paying for)
   * @returns {Promise<Array>} Validated ideas with revenue mentions
   */
  async findValidatedIdeas() {
    if (!this.accessToken) await this.authenticate();

    const keywords = ['making $', 'monthly revenue', 'MRR', 'paying customers'];
    const subreddits = ['SaaS', 'indiehackers', 'Entrepreneur'];
    
    const validated = [];

    for (const subreddit of subreddits) {
      for (const keyword of keywords) {
        try {
          const posts = await this._searchSubreddit(subreddit, keyword);
          validated.push(...posts);
        } catch (error) {
          console.error(`Error searching r/${subreddit}:`, error);
        }
      }
    }

    return validated.sort((a, b) => b.score - a.score).slice(0, 10);
  }

  /**
   * Private: Search specific subreddit
   */
  async _searchSubreddit(subreddit, query) {
    const response = await fetch(
      `${this.baseURL}/r/${subreddit}/search/.json?q=${encodeURIComponent(query)}&limit=25&sort=top&t=month`,
      {
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      }
    );

    const data = await response.json();
    
    return data.data.children.map(child => ({
      id: child.data.id,
      title: child.data.title,
      subreddit: subreddit,
      score: child.data.score,
      comments: child.data.num_comments,
      url: `https://reddit.com${child.data.permalink}`,
      text: child.data.selftext,
      createdAt: new Date(child.data.created_utc * 1000)
    }));
  }

  /**
   * Private: Extract common themes from discussions
   */
  _extractThemes(discussions) {
    const allText = discussions.map(d => `${d.title} ${d.text || ''}`).join(' ').toLowerCase();
    
    // Simplified theme extraction (in production, would use NLP)
    const themes = {
      'automation': (allText.match(/automat/g) || []).length,
      'time-saving': (allText.match(/time|fast|quick/g) || []).length,
      'integration': (allText.match(/integrat|connect/g) || []).length,
      'analytics': (allText.match(/analytic|data|metric/g) || []).length,
      'pricing': (allText.match(/pric|cost|expens/g) || []).length
    };

    return Object.entries(themes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([theme, count]) => ({ theme, mentions: count }));
  }
}

export default RedditAPI;
