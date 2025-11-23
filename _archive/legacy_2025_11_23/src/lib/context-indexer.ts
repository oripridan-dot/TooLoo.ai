import { v4 as uuidv4 } from 'uuid';

export class ContextIndexer {
  constructor() {
    this.indexes = new Map();
    this.searchCache = new Map();
    this.maxCacheSize = 500;
  }

  createIndex(repositoryKey) {
    const indexId = uuidv4();
    const index = {
      id: indexId,
      repository: repositoryKey,
      createdAt: Date.now(),
      documents: [],
      tokenMap: new Map(),
      metadata: {
        totalDocuments: 0,
        totalTokens: 0,
        lastUpdated: Date.now(),
      },
    };

    this.indexes.set(repositoryKey, index);
    return index;
  }

  addDocument(repositoryKey, document) {
    let index = this.indexes.get(repositoryKey);

    if (!index) {
      index = this.createIndex(repositoryKey);
    }

    const docWithId = {
      id: document.id || uuidv4(),
      fileName: document.fileName,
      content: document.content,
      language: document.language,
      type: document.type || 'file',
      metadata: document.metadata || {},
      indexedAt: Date.now(),
    };

    const tokens = this.tokenizeContent(document.content);
    docWithId.tokens = tokens;

    index.documents.push(docWithId);
    this.updateTokenMap(index, docWithId.id, tokens);

    index.metadata.totalDocuments = index.documents.length;
    index.metadata.totalTokens = index.tokenMap.size;
    index.metadata.lastUpdated = Date.now();

    return docWithId;
  }

  tokenizeContent(content) {
    const tokens = new Set();

    const words = content.toLowerCase().match(/\b[a-z0-9_-]+\b/g) || [];
    for (const word of words) {
      if (word.length > 2 && !this.isCommonWord(word)) {
        tokens.add(word);
      }
    }

    return Array.from(tokens);
  }

  isCommonWord(word) {
    const commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'from', 'up', 'about', 'into', 'through', 'is', 'are', 'was', 'were', 'be', 'been', 'be',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
      'can', 'must', 'let', 'function', 'return', 'class', 'const', 'let', 'var', 'if', 'else',
    ]);

    return commonWords.has(word);
  }

  updateTokenMap(index, docId, tokens) {
    for (const token of tokens) {
      if (!index.tokenMap.has(token)) {
        index.tokenMap.set(token, []);
      }
      const docs = index.tokenMap.get(token);
      if (!docs.includes(docId)) {
        docs.push(docId);
      }
    }
  }

  search(repositoryKey, query, limit = 10) {
    const cacheKey = `${repositoryKey}:${query}:${limit}`;

    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey);
    }

    const index = this.indexes.get(repositoryKey);
    if (!index) {
      return { query, results: [], count: 0, repository: repositoryKey };
    }

    const queryTokens = this.tokenizeContent(query);
    const docScores = new Map();

    for (const token of queryTokens) {
      const docs = index.tokenMap.get(token);
      if (docs) {
        for (const docId of docs) {
          docScores.set(docId, (docScores.get(docId) || 0) + 1);
        }
      }
    }

    const results = Array.from(docScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([docId]) => {
        const doc = index.documents.find((d) => d.id === docId);
        return {
          id: docId,
          fileName: doc.fileName,
          language: doc.language,
          matchScore: docScores.get(docId),
          preview: doc.content.substring(0, 200),
        };
      });

    const response = {
      query,
      results,
      count: results.length,
      repository: repositoryKey,
    };

    if (this.searchCache.size >= this.maxCacheSize) {
      const firstKey = this.searchCache.keys().next().value;
      this.searchCache.delete(firstKey);
    }

    this.searchCache.set(cacheKey, response);

    return response;
  }

  searchByType(repositoryKey, type, limit = 20) {
    const index = this.indexes.get(repositoryKey);
    if (!index) {
      return { type, results: [], count: 0 };
    }

    const results = index.documents
      .filter((d) => d.type === type)
      .slice(0, limit)
      .map((d) => ({
        id: d.id,
        fileName: d.fileName,
        language: d.language,
        type: d.type,
        indexedAt: new Date(d.indexedAt).toISOString(),
      }));

    return { type, results, count: results.length };
  }

  searchByLanguage(repositoryKey, language, limit = 20) {
    const index = this.indexes.get(repositoryKey);
    if (!index) {
      return { language, results: [], count: 0 };
    }

    const results = index.documents
      .filter((d) => d.language === language)
      .slice(0, limit)
      .map((d) => ({
        id: d.id,
        fileName: d.fileName,
        type: d.type,
        indexedAt: new Date(d.indexedAt).toISOString(),
      }));

    return { language, results, count: results.length };
  }

  getIndexStatistics(repositoryKey) {
    const index = this.indexes.get(repositoryKey);
    if (!index) {
      return null;
    }

    const languages = {};
    const types = {};

    for (const doc of index.documents) {
      languages[doc.language] = (languages[doc.language] || 0) + 1;
      types[doc.type] = (types[doc.type] || 0) + 1;
    }

    return {
      repository: repositoryKey,
      indexId: index.id,
      documents: index.metadata.totalDocuments,
      uniqueTokens: index.metadata.totalTokens,
      languages,
      types,
      createdAt: new Date(index.createdAt).toISOString(),
      lastUpdated: new Date(index.metadata.lastUpdated).toISOString(),
    };
  }

  listIndexes() {
    return Array.from(this.indexes.keys()).map((key) => {
      const index = this.indexes.get(key);
      return {
        repository: key,
        documents: index.metadata.totalDocuments,
        createdAt: new Date(index.createdAt).toISOString(),
      };
    });
  }

  deleteIndex(repositoryKey) {
    const existed = this.indexes.has(repositoryKey);
    this.indexes.delete(repositoryKey);

    const keysToDelete = [];
    for (const [key] of this.searchCache) {
      if (key.startsWith(`${repositoryKey}:`)) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      this.searchCache.delete(key);
    }

    return { status: 'deleted', repository: repositoryKey, existed };
  }

  clearCache() {
    this.searchCache.clear();
    return { status: 'cleared', cacheSize: 0 };
  }

  getDocument(repositoryKey, docId) {
    const index = this.indexes.get(repositoryKey);
    if (!index) {
      return null;
    }

    return index.documents.find((d) => d.id === docId) || null;
  }
}

export default ContextIndexer;
