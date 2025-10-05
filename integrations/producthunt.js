/**
 * Market Intelligence API - Product Hunt Integration
 * 
 * Fetches trending products, categories, and maker insights from Product Hunt.
 * Used to validate idea potential and discover market opportunities.
 */

export class ProductHuntAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.producthunt.com/v2/api/graphql';
  }

  /**
   * Get trending products by category
   * @param {Object} options - Query options
   * @param {string} options.category - Product category (e.g., 'SaaS', 'AI', 'Productivity')
   * @param {number} options.limit - Number of results (default: 10)
   * @returns {Promise<Array>} Trending products with votes, comments, pricing
   */
  async getTrendingProducts({ category = null, limit = 10 } = {}) {
    const query = `
      query {
        posts(first: ${limit}, order: VOTES) {
          edges {
            node {
              id
              name
              tagline
              description
              votesCount
              commentsCount
              website
              topics {
                edges {
                  node {
                    name
                  }
                }
              }
            }
          }
        }
      }
    `;

    try {
      const response = await this._makeRequest(query);
      const products = response.data.posts.edges.map(edge => ({
        id: edge.node.id,
        name: edge.node.name,
        tagline: edge.node.tagline,
        description: edge.node.description,
        votes: edge.node.votesCount,
        comments: edge.node.commentsCount,
        url: edge.node.website,
        categories: edge.node.topics.edges.map(t => t.node.name)
      }));

      // Filter by category if provided
      if (category) {
        return products.filter(p => 
          p.categories.some(c => c.toLowerCase().includes(category.toLowerCase()))
        );
      }

      return products;
    } catch (error) {
      console.error('Product Hunt API error:', error);
      return [];
    }
  }

  /**
   * Search products by keyword
   * @param {string} keyword - Search term
   * @returns {Promise<Array>} Matching products
   */
  async searchProducts(keyword) {
    const query = `
      query {
        posts(searchQuery: "${keyword}", first: 10) {
          edges {
            node {
              id
              name
              tagline
              votesCount
              website
            }
          }
        }
      }
    `;

    try {
      const response = await this._makeRequest(query);
      return response.data.posts.edges.map(edge => ({
        name: edge.node.name,
        tagline: edge.node.tagline,
        votes: edge.node.votesCount,
        url: edge.node.website
      }));
    } catch (error) {
      console.error('Product Hunt search error:', error);
      return [];
    }
  }

  /**
   * Get popular categories and their growth
   * @returns {Promise<Array>} Categories with product counts
   */
  async getPopularCategories() {
    // Simplified: In real implementation, would aggregate from multiple queries
    const categories = [
      'SaaS', 'AI', 'Productivity', 'Developer Tools', 'Design Tools',
      'Marketing', 'Analytics', 'E-commerce', 'Education', 'Health & Fitness'
    ];

    return categories.map(category => ({
      name: category,
      // In real API, would fetch actual counts
      productCount: Math.floor(Math.random() * 100) + 50,
      trending: Math.random() > 0.5
    }));
  }

  /**
   * Analyze market opportunity for an idea
   * @param {Object} idea - Idea object with problem/solution
   * @returns {Promise<Object>} Market analysis
   */
  async analyzeOpportunity(idea) {
    const keywords = this._extractKeywords(idea);
    const competitors = await this.searchProducts(keywords.join(' '));

    return {
      competitors: competitors.slice(0, 5),
      competitorCount: competitors.length,
      marketSaturation: competitors.length > 20 ? 'high' : competitors.length > 10 ? 'medium' : 'low',
      topCompetitor: competitors[0] || null,
      recommendation: this._generateRecommendation(competitors.length)
    };
  }

  /**
   * Private: Make GraphQL request to Product Hunt API
   */
  async _makeRequest(query) {
    const response = await fetch(this.baseURL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      throw new Error(`Product Hunt API error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Private: Extract keywords from idea
   */
  _extractKeywords(idea) {
    const text = `${idea.title} ${idea.problem?.description || ''} ${idea.solution?.description || ''}`;
    // Simplified keyword extraction
    return text.toLowerCase().split(' ').filter(word => word.length > 4).slice(0, 5);
  }

  /**
   * Private: Generate recommendation based on competition
   */
  _generateRecommendation(competitorCount) {
    if (competitorCount === 0) {
      return 'Untapped market - validate demand before building';
    } else if (competitorCount < 5) {
      return 'Low competition - good opportunity if you can differentiate';
    } else if (competitorCount < 15) {
      return 'Moderate competition - focus on unique value proposition';
    } else {
      return 'High competition - need strong differentiation or niche focus';
    }
  }
}

export default ProductHuntAPI;
