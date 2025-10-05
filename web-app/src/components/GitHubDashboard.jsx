import React, { useState, useEffect } from 'react';
import { GitBranch, GitCommit, GitPullRequest, GitMerge, AlertCircle, CheckCircle, XCircle, Clock, Activity, Code, Settings } from 'lucide-react';

const GitHubDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [config, setConfig] = useState(null);
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState(null);
  const [branches, setBranches] = useState([]);
  const [commits, setCommits] = useState([]);
  const [pullRequests, setPullRequests] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchGitHubData();
  }, []);

  const fetchGitHubData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch configuration
      const configRes = await fetch('/api/v1/github/config');
      const configData = await configRes.json();
      setConfig(configData.data);

      if (!configData.data?.configured) {
        setError('GitHub not configured. Please add GITHUB_TOKEN to .env');
        setLoading(false);
        return;
      }

      // Fetch stats
      const statsRes = await fetch('/api/v1/github/stats');
      const statsData = await statsRes.json();
      setStats(statsData.data);

      // Fetch activity
      const activityRes = await fetch('/api/v1/github/activity');
      const activityData = await activityRes.json();
      setActivity(activityData.data);

      // Fetch branches
      const branchesRes = await fetch('/api/v1/github/branches');
      const branchesData = await branchesRes.json();
      setBranches(branchesData.data || []);

      // Fetch commits
      const commitsRes = await fetch('/api/v1/github/commits?perPage=10');
      const commitsData = await commitsRes.json();
      setCommits(commitsData.data || []);

      // Fetch pull requests
      const prsRes = await fetch('/api/v1/github/pulls?state=all&perPage=10');
      const prsData = await prsRes.json();
      setPullRequests(prsData.data || []);

      // Fetch issues
      const issuesRes = await fetch('/api/v1/github/issues?state=all&perPage=10');
      const issuesData = await issuesRes.json();
      setIssues(issuesData.data || []);

      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getStateIcon = (state) => {
    switch (state) {
      case 'open': return <AlertCircle className="w-4 h-4 text-green-500" />;
      case 'closed': return <CheckCircle className="w-4 h-4 text-purple-500" />;
      case 'merged': return <GitMerge className="w-4 h-4 text-purple-500" />;
      default: return <XCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Clock className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading GitHub data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">GitHub Connection Error</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchGitHubData}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Activity className="w-6 h-6 text-blue-500" />
              GitHub Integration
            </h1>
            {config && (
              <p className="text-sm text-gray-600 mt-1">
                Connected as <span className="font-semibold">{config.user?.login}</span> • {config.defaultRepo}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {config?.authenticated && (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                Authenticated
              </span>
            )}
            {config?.autoCommit && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                Auto-commit ON
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4 border-b border-gray-200">
          {['overview', 'commits', 'branches', 'pulls', 'issues'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Stars</p>
                    <p className="text-2xl font-bold text-gray-800">{stats?.repository?.stars || 0}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-yellow-500" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Branches</p>
                    <p className="text-2xl font-bold text-gray-800">{stats?.branches || 0}</p>
                  </div>
                  <GitBranch className="w-8 h-8 text-green-500" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Open PRs</p>
                    <p className="text-2xl font-bold text-gray-800">{stats?.openPullRequests || 0}</p>
                  </div>
                  <GitPullRequest className="w-8 h-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Open Issues</p>
                    <p className="text-2xl font-bold text-gray-800">{stats?.openIssues || 0}</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
              </div>
            </div>

            {/* Repository Info */}
            {stats?.repository && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Repository Information</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium">{stats.repository.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Language</p>
                    <p className="font-medium">{stats.repository.language}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Default Branch</p>
                    <p className="font-medium">{stats.repository.defaultBranch}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Visibility</p>
                    <p className="font-medium">{stats.repository.private ? 'Private' : 'Public'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Created</p>
                    <p className="font-medium">{new Date(stats.repository.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Last Updated</p>
                    <p className="font-medium">{new Date(stats.repository.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Commits */}
            {stats?.recentCommits && stats.recentCommits.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Commits</h2>
                <div className="space-y-3">
                  {stats.recentCommits.map((commit, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded">
                      <GitCommit className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate">{commit.message}</p>
                        <p className="text-sm text-gray-600">
                          {commit.author} • <code className="text-xs bg-gray-200 px-1 rounded">{commit.sha}</code> • {formatTimeAgo(commit.date)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'commits' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Commit History</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {commits.map((commit) => (
                <div key={commit.sha} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start gap-3">
                    <GitCommit className="w-5 h-5 text-gray-400 mt-1" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800">{commit.commit.message.split('\n')[0]}</p>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                        <span>{commit.commit.author.name}</span>
                        <span>•</span>
                        <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{commit.sha.substring(0, 7)}</code>
                        <span>•</span>
                        <span>{formatTimeAgo(commit.commit.author.date)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'branches' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Branches</h2>
              <span className="text-sm text-gray-600">{branches.length} branches</span>
            </div>
            <div className="divide-y divide-gray-200">
              {branches.map((branch) => (
                <div key={branch.name} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <GitBranch className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-800">{branch.name}</p>
                        <p className="text-sm text-gray-600">
                          <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{branch.commit.sha.substring(0, 7)}</code>
                        </p>
                      </div>
                    </div>
                    {branch.protected && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Protected</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'pulls' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Pull Requests</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {pullRequests.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <GitPullRequest className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No pull requests found</p>
                </div>
              ) : (
                pullRequests.map((pr) => (
                  <div key={pr.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start gap-3">
                      {getStateIcon(pr.state)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800">
                          #{pr.number} {pr.title}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                          <span>{pr.user.login}</span>
                          <span>•</span>
                          <span>{pr.head.ref} → {pr.base.ref}</span>
                          <span>•</span>
                          <span>{formatTimeAgo(pr.created_at)}</span>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        pr.state === 'open' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {pr.state}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'issues' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Issues</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {issues.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No issues found</p>
                </div>
              ) : (
                issues.filter(issue => !issue.pull_request).map((issue) => (
                  <div key={issue.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start gap-3">
                      {getStateIcon(issue.state)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800">
                          #{issue.number} {issue.title}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                          <span>{issue.user.login}</span>
                          <span>•</span>
                          <span>{formatTimeAgo(issue.created_at)}</span>
                          {issue.labels.length > 0 && (
                            <>
                              <span>•</span>
                              <div className="flex gap-1">
                                {issue.labels.slice(0, 3).map((label) => (
                                  <span 
                                    key={label.id}
                                    className="text-xs px-2 py-0.5 rounded"
                                    style={{ 
                                      backgroundColor: `#${label.color}33`,
                                      color: `#${label.color}`
                                    }}
                                  >
                                    {label.name}
                                  </span>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        issue.state === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {issue.state}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Rate Limit Info */}
      {config?.rateLimit && (
        <div className="bg-gray-100 border-t border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>API Rate Limit: {config.rateLimit.remaining} / {config.rateLimit.limit} remaining</span>
            <span>Resets: {new Date(config.rateLimit.reset).toLocaleTimeString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GitHubDashboard;
