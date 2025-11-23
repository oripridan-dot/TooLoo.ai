import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RepositoryManager } from '../lib/repository-manager.js';
import { CodeAnalyzer } from '../lib/code-analyzer.js';
import { ContextIndexer } from '../lib/context-indexer.js';

describe('RepositoryManager', () => {
  let repoManager;
  let mockApiClient;

  beforeEach(() => {
    repoManager = new RepositoryManager();
    mockApiClient = {
      getGitHubRepository: vi.fn().mockResolvedValue({
        name: 'test-repo',
        description: 'Test repository',
        language: 'JavaScript',
        stars: 100,
        isPrivate: false,
        topics: ['test'],
        url: 'https://github.com/test/repo',
      }),
      getGitHubBranches: vi.fn().mockResolvedValue([
        { name: 'main', protected: true, commit: 'abc123' },
        { name: 'develop', protected: false, commit: 'def456' },
      ]),
    };
  });

  it('should load a repository', async () => {
    const result = await repoManager.loadRepository('user', 'repo', mockApiClient);

    expect(result.key).toBe('user/repo');
    expect(result.language).toBe('JavaScript');
    expect(result.branches).toHaveLength(2);
  });

  it('should cache loaded repositories', async () => {
    await repoManager.loadRepository('user', 'repo', mockApiClient);
    const cached = repoManager.getRepositoryInfo('user', 'repo');

    expect(cached).toBeDefined();
    expect(cached.key).toBe('user/repo');
  });

  it('should list cached repositories', async () => {
    await repoManager.loadRepository('user', 'repo1', mockApiClient);
    await repoManager.loadRepository('user', 'repo2', mockApiClient);

    const list = repoManager.listCachedRepositories();

    expect(list).toHaveLength(2);
  });

  it('should clear repository cache', async () => {
    await repoManager.loadRepository('user', 'repo', mockApiClient);
    const result = repoManager.clearRepositoryCache('user', 'repo');

    expect(result.status).toBe('cleared');
    expect(result.repo).toBe('user/repo');
  });

  it('should get cache statistics', async () => {
    await repoManager.loadRepository('user', 'repo', mockApiClient);
    const stats = repoManager.getCacheStats();

    expect(stats.repositoriesLoaded).toBe(1);
    expect(stats.filesCached).toBeGreaterThanOrEqual(0);
  });

  it('should get repository structure', async () => {
    const result = await repoManager.getRepositoryStructure('user', 'repo', mockApiClient);

    expect(result.repository).toBe('user/repo');
    expect(result.description).toBeDefined();
    expect(result.branches).toBeDefined();
  });
});

describe('CodeAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new CodeAnalyzer();
  });

  it('should detect JavaScript files', () => {
    expect(analyzer.detectLanguage('test.js')).toBe('javascript');
    expect(analyzer.detectLanguage('component.tsx')).toBe('javascript');
  });

  it('should detect Python files', () => {
    expect(analyzer.detectLanguage('script.py')).toBe('python');
  });

  it('should detect markdown files', () => {
    expect(analyzer.detectLanguage('README.md')).toBe('markdown');
  });

  it('should detect unknown languages', () => {
    expect(analyzer.detectLanguage('unknown.xyz')).toBe('unknown');
  });

  it('should analyze code complexity', () => {
    const code = `
      function test() {
        if (x > 0) {
          for (let i = 0; i < 10; i++) {
            while (true) {
              // code
            }
          }
        } else if (x < 0) {
          // code
        } else {
          // code
        }
      }
    `;

    const metrics = analyzer.analyzeCode(code);

    expect(metrics.complexity).toBeGreaterThan(1);
    expect(metrics.lineCount).toBeGreaterThan(0);
  });

  it('should analyze file with metrics', () => {
    const content = 'function hello() { return "world"; }';
    const result = analyzer.analyzeFile('test.js', content);

    expect(result.language).toBe('javascript');
    expect(result.metrics).toHaveProperty('lineCount');
    expect(result.metrics).toHaveProperty('complexity');
  });

  it('should calculate maintainability score', () => {
    const shortCode = 'function x() { return 1; }';
    const result = analyzer.analyzeFile('test.js', shortCode);

    expect(result.quality.maintainability).toBeGreaterThan(0);
    expect(result.quality.maintainability).toBeLessThanOrEqual(100);
  });

  it('should identify code patterns', () => {
    const codeWithObserver = 'element.addEventListener("click", callback);';
    const patterns = analyzer.identifyPatterns(codeWithObserver);

    expect(patterns).toContain('observer');
  });

  it('should identify security concerns', () => {
    const unsafeCode = 'eval(userInput);';
    const concerns = analyzer.getSecurityConcerns(unsafeCode);

    expect(concerns.length).toBeGreaterThan(0);
  });

  it('should analyze repository files', () => {
    const files = [
      { name: 'app.js', content: 'function app() {}' },
      { name: 'util.js', content: 'function util() {}' },
      { name: 'style.css', content: 'body { color: red; }' },
    ];

    const analysis = analyzer.analyzeRepository(files);

    expect(analysis.totalFiles).toBe(3);
    expect(analysis.filesByLanguage.javascript).toBe(2);
  });
});

describe('ContextIndexer', () => {
  let indexer;

  beforeEach(() => {
    indexer = new ContextIndexer();
  });

  it('should create an index', () => {
    const index = indexer.createIndex('user/repo');

    expect(index.repository).toBe('user/repo');
    expect(index.createdAt).toBeDefined();
  });

  it('should add documents to index', () => {
    indexer.createIndex('user/repo');
    const doc = indexer.addDocument('user/repo', {
      fileName: 'test.js',
      content: 'function test() {}',
      language: 'javascript',
    });

    expect(doc.id).toBeDefined();
    expect(doc.fileName).toBe('test.js');
  });

  it('should tokenize content', () => {
    const tokens = indexer.tokenizeContent('hello world function test');

    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens).toContain('hello');
    expect(tokens).toContain('world');
  });

  it('should filter common words from tokenization', () => {
    const tokens = indexer.tokenizeContent('the function is');

    expect(tokens).not.toContain('the');
    expect(tokens).not.toContain('is');
  });

  it('should search documents', () => {
    indexer.createIndex('user/repo');
    indexer.addDocument('user/repo', {
      fileName: 'test.js',
      content: 'async function fetchData() {}',
      language: 'javascript',
    });

    const results = indexer.search('user/repo', 'async fetch');

    expect(results.count).toBeGreaterThan(0);
  });

  it('should search by language', () => {
    indexer.createIndex('user/repo');
    indexer.addDocument('user/repo', {
      fileName: 'test.js',
      content: 'function test() {}',
      language: 'javascript',
    });
    indexer.addDocument('user/repo', {
      fileName: 'style.css',
      content: 'body { color: red; }',
      language: 'css',
    });

    const results = indexer.searchByLanguage('user/repo', 'javascript');

    expect(results.count).toBe(1);
  });

  it('should get index statistics', () => {
    indexer.createIndex('user/repo');
    indexer.addDocument('user/repo', {
      fileName: 'test.js',
      content: 'function test() {}',
      language: 'javascript',
    });

    const stats = indexer.getIndexStatistics('user/repo');

    expect(stats.documents).toBe(1);
    expect(stats.languages.javascript).toBe(1);
  });

  it('should list all indexes', () => {
    indexer.createIndex('user/repo1');
    indexer.createIndex('user/repo2');

    const indexes = indexer.listIndexes();

    expect(indexes).toHaveLength(2);
  });

  it('should delete index', () => {
    indexer.createIndex('user/repo');
    const result = indexer.deleteIndex('user/repo');

    expect(result.status).toBe('deleted');
    expect(result.existed).toBe(true);
  });

  it('should get specific document', () => {
    indexer.createIndex('user/repo');
    const doc = indexer.addDocument('user/repo', {
      fileName: 'test.js',
      content: 'function test() {}',
      language: 'javascript',
    });

    const retrieved = indexer.getDocument('user/repo', doc.id);

    expect(retrieved).toBeDefined();
    expect(retrieved.fileName).toBe('test.js');
  });

  it('should cache search results', () => {
    indexer.createIndex('user/repo');
    indexer.addDocument('user/repo', {
      fileName: 'test.js',
      content: 'function test() {}',
      language: 'javascript',
    });

    const result1 = indexer.search('user/repo', 'test');
    const result2 = indexer.search('user/repo', 'test');

    expect(result1).toEqual(result2);
  });

  it('should clear search cache', () => {
    const result = indexer.clearCache();

    expect(result.status).toBe('cleared');
    expect(result.cacheSize).toBe(0);
  });
});
