import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { EventBus } from '../lib/event-bus.js';
import { RepositoryManager } from '../lib/repository-manager.js';
import { CodeAnalyzer } from '../lib/code-analyzer.js';
import { ContextIndexer } from '../lib/context-indexer.js';
import { ExternalAPIClient } from '../lib/external-api-client.js';

const PORT = process.env.CONTEXT_PORT || 3020;
const app = express();

let eventBus;
let repositoryManager;
let codeAnalyzer;
let contextIndexer;
let apiClient;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'context-service',
    port: PORT,
    uptime: process.uptime(),
    repositories: repositoryManager ? repositoryManager.getCacheStats().repositoriesLoaded : 0,
  });
});

app.post('/api/v1/context/load-repo', async (req, res) => {
  try {
    const { owner, repo } = req.body;
    if (!owner || !repo) {
      return res.status(400).json({ error: 'owner and repo required' });
    }

    const repoInfo = await repositoryManager.loadRepository(owner, repo, apiClient);

    if (eventBus) {
      await eventBus.emit({
        type: 'context.repository-loaded',
        aggregateId: `${owner}/${repo}`,
        data: { owner, repo, language: repoInfo.language },
      });
    }

    res.json({
      status: 'loaded',
      repository: repoInfo.key,
      language: repoInfo.language,
      branches: repoInfo.branches.length,
      loadedAt: new Date(repoInfo.loadedAt).toISOString(),
    });
  } catch (error) {
    console.error('Repository load error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/context/repo/:owner/:repo/info', (req, res) => {
  try {
    const { owner, repo } = req.params;
    const repoInfo = repositoryManager.getRepositoryInfo(owner, repo);

    if (!repoInfo) {
      return res.status(404).json({ error: 'Repository not loaded' });
    }

    res.json({
      key: repoInfo.key,
      description: repoInfo.description,
      language: repoInfo.language,
      stars: repoInfo.stars,
      branches: repoInfo.branches,
      topics: repoInfo.topics,
    });
  } catch (error) {
    console.error('Get repo info error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/context/repo/:owner/:repo/file/:filePath(*)', async (req, res) => {
  try {
    const { owner, repo, filePath } = req.params;

    const content = await repositoryManager.getFileContent(owner, repo, filePath, apiClient);

    const analysis = codeAnalyzer.analyzeFile(filePath, content);

    res.json({
      file: filePath,
      owner,
      repo,
      language: analysis.language,
      metrics: analysis.metrics,
      complexity: analysis.complexity,
      quality: analysis.quality,
      contentLength: content.length,
    });
  } catch (error) {
    console.error('Get file error:', error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.post('/api/v1/context/analyze', (req, res) => {
  try {
    const { content, fileName } = req.body;
    if (!content || !fileName) {
      return res.status(400).json({ error: 'content and fileName required' });
    }

    const analysis = codeAnalyzer.analyzeFile(fileName, content);

    res.json(analysis);
  } catch (error) {
    console.error('Code analysis error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/context/index/:owner/:repo', (req, res) => {
  try {
    const { owner, repo } = req.params;
    const repositoryKey = `${owner}/${repo}`;

    const index = contextIndexer.createIndex(repositoryKey);

    res.json({
      status: 'created',
      indexId: index.id,
      repository: repositoryKey,
      createdAt: new Date(index.createdAt).toISOString(),
    });
  } catch (error) {
    console.error('Index creation error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/context/index/:owner/:repo/document', (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { fileName, content, language, type } = req.body;

    if (!fileName || !content) {
      return res.status(400).json({ error: 'fileName and content required' });
    }

    const repositoryKey = `${owner}/${repo}`;
    const document = contextIndexer.addDocument(repositoryKey, {
      fileName,
      content,
      language,
      type,
    });

    res.json({
      status: 'indexed',
      documentId: document.id,
      fileName: document.fileName,
      tokens: document.tokens.length,
    });
  } catch (error) {
    console.error('Document indexing error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/context/search/:owner/:repo', (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { q, limit } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'query required' });
    }

    const repositoryKey = `${owner}/${repo}`;
    const results = contextIndexer.search(repositoryKey, q, parseInt(limit) || 10);

    res.json(results);
  } catch (error) {
    console.error('Search error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/context/search/:owner/:repo/language/:language', (req, res) => {
  try {
    const { owner, repo, language } = req.params;
    const { limit } = req.query;

    const repositoryKey = `${owner}/${repo}`;
    const results = contextIndexer.searchByLanguage(repositoryKey, language, parseInt(limit) || 20);

    res.json(results);
  } catch (error) {
    console.error('Language search error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/context/index/:owner/:repo/stats', (req, res) => {
  try {
    const { owner, repo } = req.params;
    const repositoryKey = `${owner}/${repo}`;

    const stats = contextIndexer.getIndexStatistics(repositoryKey);

    if (!stats) {
      return res.status(404).json({ error: 'Index not found' });
    }

    res.json(stats);
  } catch (error) {
    console.error('Stats error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/context/indexes', (req, res) => {
  try {
    const indexes = contextIndexer.listIndexes();
    res.json({ indexes, count: indexes.length });
  } catch (error) {
    console.error('List indexes error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/v1/context/index/:owner/:repo', (req, res) => {
  try {
    const { owner, repo } = req.params;
    const repositoryKey = `${owner}/${repo}`;

    const result = contextIndexer.deleteIndex(repositoryKey);

    res.json(result);
  } catch (error) {
    console.error('Delete index error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/system/status', (req, res) => {
  res.json({
    service: 'context-service',
    status: 'ready',
    components: {
      repositoryManager: repositoryManager ? 'initialized' : 'not-initialized',
      codeAnalyzer: codeAnalyzer ? 'initialized' : 'not-initialized',
      contextIndexer: contextIndexer ? 'initialized' : 'not-initialized',
      apiClient: apiClient ? 'initialized' : 'not-initialized',
      eventBus: eventBus ? 'connected' : 'disconnected',
    },
    uptime: process.uptime(),
  });
});

app.use((err, req, res) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

async function initializeService() {
  try {
    eventBus = new EventBus();
    repositoryManager = new RepositoryManager();
    codeAnalyzer = new CodeAnalyzer();
    contextIndexer = new ContextIndexer();
    apiClient = new ExternalAPIClient();

    apiClient.setGitHubToken(process.env.GITHUB_API_TOKEN);

    console.log('✓ Service components initialized');
  } catch (error) {
    console.error('Initialization error:', error);
    process.exit(1);
  }
}

async function startServer() {
  await initializeService();

  const server = app.listen(PORT, () => {
    console.log(`Context Service running on port ${PORT}`);
    console.log('Available endpoints:');
    console.log('  Repository: /api/v1/context/repo/*');
    console.log('  Analysis: /api/v1/context/analyze');
    console.log('  Indexing: /api/v1/context/index/*');
    console.log('  Search: /api/v1/context/search/*');
    console.log('  System: /api/v1/system/status');
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export default app;
