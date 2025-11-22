export class RepositoryManager {
  constructor(baseDir = '/tmp/repos') {
    this.baseDir = baseDir;
    this.repositories = new Map();
    this.fileCache = new Map();
    this.maxCacheSize = 1000;
  }

  async loadRepository(owner, repo, apiClient) {
    const repoKey = `${owner}/${repo}`;

    if (this.repositories.has(repoKey)) {
      return this.repositories.get(repoKey);
    }

    try {
      const repoData = await apiClient.getGitHubRepository(owner, repo);
      const repoInfo = {
        key: repoKey,
        owner,
        repo,
        url: repoData.url,
        description: repoData.description,
        language: repoData.language,
        stars: repoData.stars,
        isPrivate: repoData.isPrivate,
        topics: repoData.topics,
        files: [],
        branches: [],
        loadedAt: Date.now(),
      };

      const branches = await apiClient.getGitHubBranches(owner, repo);
      repoInfo.branches = branches.map((b) => ({
        name: b.name,
        isDefault: b.name === 'main' || b.name === 'master',
        commit: b.commit,
      }));

      this.repositories.set(repoKey, repoInfo);
      return repoInfo;
    } catch (error) {
      console.error(`Failed to load repository ${repoKey}:`, error.message);
      throw error;
    }
  }

  async getFileContent(owner, repo, filePath, apiClient) {
    const cacheKey = `${owner}/${repo}/${filePath}`;

    if (this.fileCache.has(cacheKey)) {
      return this.fileCache.get(cacheKey);
    }

    try {
      const content = await apiClient.getGitHubFileContent(owner, repo, filePath);

      if (this.fileCache.size >= this.maxCacheSize) {
        const firstKey = this.fileCache.keys().next().value;
        this.fileCache.delete(firstKey);
      }

      this.fileCache.set(cacheKey, content);
      return content;
    } catch (error) {
      console.error(`Failed to get file ${filePath}:`, error.message);
      throw error;
    }
  }

  async listDirectoryFiles(owner, repo, dirPath, apiClient) {
    try {
      const content = await this.getFileContent(owner, repo, dirPath, apiClient);

      if (typeof content !== 'string') {
        return { isDirectory: false, file: content };
      }

      const files = [];
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          files.push({
            name: line,
            path: dirPath ? `${dirPath}/${line}` : line,
          });
        }
      }

      return {
        isDirectory: true,
        directory: dirPath,
        files,
        count: files.length,
      };
    } catch (error) {
      console.error(`Failed to list directory ${dirPath}:`, error.message);
      throw error;
    }
  }

  async findFilesByExtension(owner, repo, extension, apiClient) {
    const repoKey = `${owner}/${repo}`;
    const repoInfo = this.repositories.get(repoKey);

    if (!repoInfo) {
      throw new Error(`Repository ${repoKey} not loaded`);
    }

    const foundFiles = [];

    try {
      await apiClient.getGitHubFileContent(owner, repo, 'README.md');
      console.log(`Found file for search in ${repoKey}`);
    } catch (error) {
      console.error(`File search in ${repoKey}:`, error.message);
    }

    return foundFiles;
  }

  getRepositoryInfo(owner, repo) {
    const repoKey = `${owner}/${repo}`;
    return this.repositories.get(repoKey) || null;
  }

  listCachedRepositories() {
    const repos = [];
    for (const [key, info] of this.repositories) {
      repos.push({
        key,
        language: info.language,
        stars: info.stars,
        branches: info.branches.length,
        loadedAt: new Date(info.loadedAt).toISOString(),
      });
    }
    return repos;
  }

  getCacheStats() {
    return {
      repositoriesLoaded: this.repositories.size,
      filesCached: this.fileCache.size,
      maxCacheSize: this.maxCacheSize,
      estimatedMemory: `${this.fileCache.size * 5}KB`,
    };
  }

  clearFileCache() {
    this.fileCache.clear();
    return { status: 'cleared', filesRemoved: this.fileCache.size };
  }

  clearRepositoryCache(owner, repo) {
    const repoKey = `${owner}/${repo}`;
    const existed = this.repositories.has(repoKey);
    this.repositories.delete(repoKey);

    const filesToClear = [];
    for (const [key] of this.fileCache) {
      if (key.startsWith(`${repoKey}/`)) {
        filesToClear.push(key);
        this.fileCache.delete(key);
      }
    }

    return { status: 'cleared', repo: repoKey, filesCleared: filesToClear.length, existed };
  }

  async getRepositoryStructure(owner, repo, apiClient) {
    const repoKey = `${owner}/${repo}`;
    let repoInfo = this.repositories.get(repoKey);

    if (!repoInfo) {
      repoInfo = await this.loadRepository(owner, repo, apiClient);
    }

    return {
      repository: repoKey,
      description: repoInfo.description,
      language: repoInfo.language,
      branches: repoInfo.branches,
      topics: repoInfo.topics,
      stars: repoInfo.stars,
      cacheStatus: 'loaded',
    };
  }
}

export default RepositoryManager;
