// @version 2.2.111
import React, { useState, useEffect } from "react";
import {
  Github,
  GitBranch,
  GitPullRequest,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";

const ControlRoom = () => {
  const [activeTab, setActiveTab] = useState("providers");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [providerData, setProviderData] = useState(null);
  const [systemData, setSystemData] = useState(null);
  const [githubData, setGithubData] = useState(null);

  const fetchProviderStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/providers/status");
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const json = await res.json();
      const status = json.data || json;

      setProviderData(status);
    } catch (e) {
      console.error("Provider fetch error:", e);
      setError(e.message);
      setProviderData({ providers: [], active: null });
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/system/awareness");
      const data = await res.json();
      setSystemData(data.content || data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchGithubStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const [healthRes, infoRes, issuesRes] = await Promise.all([
        fetch("/api/v1/github/health"),
        fetch("/api/v1/github/info"),
        fetch("/api/v1/github/issues?limit=5"),
      ]);

      const health = await healthRes.json();
      const info = await infoRes.json();
      const issues = await issuesRes.json();

      setGithubData({
        connected: health.ok && health.status === "connected",
        details: health.details,
        repo: info.info,
        issues: issues.issues || [],
      });
    } catch (e) {
      console.error("GitHub fetch error:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "providers") {
      fetchProviderStatus();
    } else if (activeTab === "system") {
      fetchSystemStatus();
    } else if (activeTab === "github") {
      fetchGithubStatus();
    }
  }, [activeTab]);

  const handleRestart = async () => {
    if (window.confirm("Are you sure you want to restart the Synapsys Core?")) {
      try {
        await fetch("/api/v1/system/restart", { method: "POST" });
        alert("Restart command sent.");
      } catch (e) {
        alert("Failed to send restart command.");
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col relative overflow-y-auto h-full">
      {/* Header */}
      <header className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-gray-900/30 sticky top-0 backdrop-blur z-10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-mono text-xs text-emerald-400">
            CONTROL ROOM // ACTIVE
          </span>
        </div>
        <div className="flex gap-4 items-center">
          <button
            onClick={handleRestart}
            className="px-3 py-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-500/30 rounded text-xs font-bold transition cursor-pointer"
          >
            RESTART SYSTEM
          </button>
        </div>
      </header>

      <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Tabs */}
        <div className="flex border-b border-white/10 mb-6">
          {["providers", "github", "system"].map((tab) => (
            <button
              key={tab}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition capitalize cursor-pointer ${
                activeTab === tab
                  ? "border-cyan-500 text-cyan-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "system" ? "System Internals" : tab}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="space-y-6">
          {loading && (
            <div className="text-center text-gray-500">Loading...</div>
          )}
          {error && <div className="text-red-400">Error: {error}</div>}

          {!loading && !error && activeTab === "providers" && providerData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {!providerData.providers ||
              providerData.providers.length === 0 ? (
                <div className="col-span-3 text-center text-gray-500 italic p-8 border border-white/5 rounded-lg">
                  No providers detected. Check system configuration.
                </div>
              ) : (
                providerData.providers.map((p) => {
                  const isOperational =
                    p.status === "Ready" || p.status === "Operational";
                  const colorClass = isOperational
                    ? "text-emerald-400"
                    : "text-yellow-400";
                  const borderColor =
                    p.id === providerData.active
                      ? "border-cyan-500/50"
                      : "border-white/10";

                  return (
                    <div
                      key={p.id}
                      className={`bg-gray-900/70 backdrop-blur border ${borderColor} p-6 rounded-lg`}
                    >
                      <h3 className="text-lg font-bold text-white mb-4">
                        {p.name}
                      </h3>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400 text-xs">Status</span>
                        <span
                          className={`${colorClass} text-xs font-mono uppercase`}
                        >
                          {p.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-xs">Latency</span>
                        <span className="text-white text-xs font-mono">
                          {providerData.latency || "--"}ms
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {!loading && !error && activeTab === "system" && systemData && (
            <div className="bg-gray-900/70 backdrop-blur border border-white/10 p-6 rounded-lg">
              <h3 className="text-lg font-bold text-white mb-4">
                System Awareness
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-gray-400">Version</span>
                  <span className="text-cyan-400 font-mono">
                    {systemData.version || "Unknown"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-gray-400">Environment</span>
                  <span className="text-white font-mono">
                    {systemData.environment || "Production"}
                  </span>
                </div>
                <div className="mt-4">
                  <h4 className="text-sm font-bold text-gray-300 mb-2">
                    Capabilities
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {(systemData.capabilities || []).map((c) => (
                      <span
                        key={c}
                        className="px-2 py-1 rounded bg-gray-800 text-xs text-gray-300 border border-white/10"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "github" && (
            <div className="space-y-6">
              {!githubData ? (
                <div className="text-center text-gray-500 italic">
                  Connecting to GitHub...
                </div>
              ) : (
                <>
                  {/* Connection Status */}
                  <div
                    className={`p-4 rounded-lg border ${githubData.connected ? "border-green-500/30 bg-green-900/10" : "border-red-500/30 bg-red-900/10"} flex items-center justify-between`}
                  >
                    <div className="flex items-center gap-3">
                      <Github
                        className={`w-6 h-6 ${githubData.connected ? "text-green-400" : "text-red-400"}`}
                      />
                      <div>
                        <h3 className="text-white font-bold">
                          {githubData.connected
                            ? "Connected to GitHub"
                            : "Disconnected"}
                        </h3>
                        <p className="text-xs text-gray-400">
                          {githubData.details || "Check GH_TOKEN in .env"}
                        </p>
                      </div>
                    </div>
                    {githubData.connected && (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    )}
                  </div>

                  {/* Repo Info */}
                  {githubData.repo && (
                    <div className="bg-gray-900/70 backdrop-blur border border-white/10 p-6 rounded-lg">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            {githubData.repo.owner.login} /{" "}
                            {githubData.repo.name}
                          </h3>
                          <p className="text-sm text-gray-400 mt-1">
                            {githubData.repo.description}
                          </p>
                        </div>
                        <a
                          href={githubData.repo.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 text-xs"
                        >
                          View on GitHub →
                        </a>
                      </div>
                      <div className="flex gap-4 text-xs font-mono text-gray-500">
                        <span className="flex items-center gap-1">
                          <GitBranch className="w-3 h-3" />{" "}
                          {githubData.repo.defaultBranchRef.name}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Recent Issues */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                      Recent Issues
                    </h3>
                    {githubData.issues.length === 0 ? (
                      <div className="text-gray-500 text-sm italic">
                        No open issues found.
                      </div>
                    ) : (
                      githubData.issues.map((issue) => (
                        <a
                          key={issue.number}
                          href={issue.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block bg-gray-900/40 border border-white/5 p-3 rounded hover:bg-gray-900/60 hover:border-cyan-500/30 transition group"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex gap-3">
                              <AlertCircle className="w-4 h-4 text-green-400 mt-0.5" />
                              <div>
                                <div className="text-sm text-gray-200 font-medium group-hover:text-cyan-300 transition-colors">
                                  {issue.title}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  #{issue.number} opened on{" "}
                                  {new Date(
                                    issue.createdAt,
                                  ).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${issue.state === "OPEN" ? "bg-green-900/30 text-green-400" : "bg-purple-900/30 text-purple-400"}`}
                            >
                              {issue.state}
                            </span>
                          </div>
                        </a>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ControlRoom;
