const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * Feedback - Collect feedback from real users testing prototypes
 * 
 * Purpose: Get real-world validation before building actual products
 */
class Feedback {
  constructor() {
    this.dataDir = path.join(process.cwd(), 'data', 'feedback');
    this.shareLinksFile = path.join(this.dataDir, 'share-links.json');
    this.shareLinks = {};
  }

  /**
   * Initialize feedback system
   */
  async initialize() {
    await fs.mkdir(this.dataDir, { recursive: true });
    
    // Load existing share links
    try {
      const content = await fs.readFile(this.shareLinksFile, 'utf8');
      this.shareLinks = JSON.parse(content);
    } catch {
      this.shareLinks = {};
    }
    
    console.log('📝 Feedback system initialized');
  }

  /**
   * Collect feedback from a user
   */
  async collect(feedback) {
    const { projectId, userId, rating, comments, timestamp } = feedback;
    
    // Validate input
    if (!projectId || !userId || rating === undefined) {
      throw new Error('Missing required feedback fields');
    }
    
    // Save to project-specific JSON file
    const filename = path.join(this.dataDir, `${projectId}.json`);
    
    let existing = [];
    try {
      const content = await fs.readFile(filename, 'utf8');
      existing = JSON.parse(content);
    } catch {
      // File doesn't exist yet, that's okay
    }
    
    existing.push({
      userId,
      rating: parseInt(rating),
      comments: comments || '',
      timestamp: timestamp || new Date().toISOString(),
      userAgent: feedback.userAgent || 'unknown',
      ipHash: feedback.ipHash || 'unknown'
    });
    
    await fs.writeFile(filename, JSON.stringify(existing, null, 2), 'utf8');
    
    console.log(`✅ Feedback collected for project: ${projectId} (Rating: ${rating}/5)`);
    
    return true;
  }

  /**
   * Get all feedback for a project
   */
  async get(projectId) {
    try {
      const filename = path.join(this.dataDir, `${projectId}.json`);
      const content = await fs.readFile(filename, 'utf8');
      const feedback = JSON.parse(content);
      
      // Calculate statistics
      const totalFeedback = feedback.length;
      const avgRating = feedback.reduce((sum, f) => sum + f.rating, 0) / totalFeedback;
      
      // Rating distribution
      const distribution = [1, 2, 3, 4, 5].map(rating => ({
        rating,
        count: feedback.filter(f => f.rating === rating).length
      }));
      
      // Recent comments
      const recentComments = feedback
        .filter(f => f.comments && f.comments.length > 0)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10);
      
      return {
        projectId,
        totalFeedback,
        averageRating: avgRating.toFixed(1),
        distribution,
        recentComments,
        allFeedback: feedback.sort((a, b) => 
          new Date(b.timestamp) - new Date(a.timestamp)
        )
      };
    } catch (error) {
      // No feedback yet
      return {
        projectId,
        totalFeedback: 0,
        averageRating: 0,
        distribution: [1, 2, 3, 4, 5].map(rating => ({ rating, count: 0 })),
        recentComments: [],
        allFeedback: []
      };
    }
  }

  /**
   * Generate shareable link for real user testing
   */
  async generateShareLink(projectId, prototypeUrl, expiresInDays = 7) {
    // Generate unique share token
    const shareToken = crypto.randomBytes(16).toString('hex');
    
    const shareLink = {
      token: shareToken,
      projectId,
      prototypeUrl,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString(),
      views: 0,
      feedbackCount: 0
    };
    
    // Store share link
    this.shareLinks[shareToken] = shareLink;
    await fs.writeFile(
      this.shareLinksFile, 
      JSON.stringify(this.shareLinks, null, 2), 
      'utf8'
    );
    
    console.log(`🔗 Generated share link: ${shareToken} (expires in ${expiresInDays} days)`);
    
    return {
      shareUrl: `${process.env.PUBLIC_URL || 'http://localhost:5173'}/test/${shareToken}`,
      shareToken,
      expiresAt: shareLink.expiresAt,
      projectId
    };
  }

  /**
   * Get share link details
   */
  async getShareLink(token) {
    const link = this.shareLinks[token];
    
    if (!link) {
      return null;
    }
    
    // Check if expired
    if (new Date(link.expiresAt) < new Date()) {
      return { expired: true };
    }
    
    return link;
  }

  /**
   * Increment view count for share link
   */
  async incrementViews(token) {
    if (this.shareLinks[token]) {
      this.shareLinks[token].views++;
      await fs.writeFile(
        this.shareLinksFile, 
        JSON.stringify(this.shareLinks, null, 2), 
        'utf8'
      );
    }
  }

  /**
   * Increment feedback count for share link
   */
  async incrementFeedback(token) {
    if (this.shareLinks[token]) {
      this.shareLinks[token].feedbackCount++;
      await fs.writeFile(
        this.shareLinksFile, 
        JSON.stringify(this.shareLinks, null, 2), 
        'utf8'
      );
    }
  }

  /**
   * Get summary of all feedback across projects
   */
  async getSummary() {
    try {
      const files = await fs.readdir(this.dataDir);
      const jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'share-links.json');
      
      let totalFeedback = 0;
      let totalRating = 0;
      const projects = [];
      
      for (const file of jsonFiles) {
        const projectId = file.replace('.json', '');
        const data = await this.get(projectId);
        
        totalFeedback += data.totalFeedback;
        totalRating += parseFloat(data.averageRating) * data.totalFeedback;
        
        projects.push({
          projectId,
          totalFeedback: data.totalFeedback,
          averageRating: data.averageRating
        });
      }
      
      return {
        totalProjects: projects.length,
        totalFeedback,
        overallRating: totalFeedback > 0 ? (totalRating / totalFeedback).toFixed(1) : 0,
        projects: projects.sort((a, b) => b.totalFeedback - a.totalFeedback)
      };
    } catch (error) {
      return {
        totalProjects: 0,
        totalFeedback: 0,
        overallRating: 0,
        projects: []
      };
    }
  }
}

module.exports = Feedback;
