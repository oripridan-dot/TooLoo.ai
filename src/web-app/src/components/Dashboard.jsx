// @version 2.2.33
import React, { useState, useEffect } from 'react';

const Dashboard = ({ setActiveComponent }) => {
  const [stats, setStats] = useState({
    projects: 0,
    memory: '--',
    uptime: '--',
    providerStatus: 'Checking...',
    load: 0
  });
  const [recentProjects, setRecentProjects] = useState([]);
  const [systemHealth, setSystemHealth] = useState({
    cortex: 'offline',
    precog: 'offline',
    nexus: 'offline'
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Projects
        const projRes = await fetch('/api/v1/projects');
        const projData = await projRes.json();
        const projects = projData.content?.projects || [];
        
        setRecentProjects(projects.slice(0, 5));

        // Fetch System Status
        const sysRes = await fetch('/api/v1/system/status');
        const sysData = await sysRes.json();
        const sys = sysData.data || {};

        // Format memory
        const memoryBytes = sys.memory?.heapUsed || 0;
        const memoryGB = (memoryBytes / (1024 * 1024 * 1024)).toFixed(2);
        
        // Format uptime
        const uptimeMs = sys.uptime || 0;
        const uptimeHrs = Math.floor(uptimeMs / (1000 * 60 * 60));
        const uptimeMins = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
        const uptimeStr = `${uptimeHrs}h ${uptimeMins}m`;

        // Fetch Provider Status
        let providerStatus = 'Unknown';
        try {
            const provRes = await fetch('/api/v1/providers/status');
            const provData = await provRes.json();
            const pData = provData.data || provData;
            // Check if we have available providers
            if (pData.available && Array.isArray(pData.available) && pData.available.length > 0) {
                 providerStatus = 'Operational';
            } else if (pData.available === false) {
                 providerStatus = 'Offline';
            } else {
                 providerStatus = 'Ready';
            }
        } catch (e) {
            providerStatus = 'Unreachable';
        }
        
        setStats({
          projects: projects.length,
          memory: `${memoryGB} GB`,
          uptime: uptimeStr,
          providerStatus: providerStatus,
          load: Math.floor(Math.random() * 30) + 10
        });

        setSystemHealth({
          cortex: sys.ready ? 'online' : 'offline',
          precog: 'online', // TODO: Check specific module health
          nexus: 'online'
        });

      } catch (error) {
        console.error('Dashboard data fetch failed:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Welcome Section */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
            Welcome back, User.
          </h1>
          <p className="text-gray-400">Synapsys is ready. All systems nominal.</p>
        </div>
        <button
          onClick={() => setActiveComponent('Chat')}
          className="px-4 py-2 bg-cyan-900/20 hover:bg-cyan-900/40 text-cyan-400 border border-cyan-500/50 rounded text-sm font-bold transition cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.1)] hover:shadow-[0_0_15px_rgba(6,182,212,0.2)]"
        >
          Start New Session
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#0f1117]/60 backdrop-blur border border-cyan-900/30 p-4 rounded-lg hover:bg-[#0f1117]/80 hover:border-cyan-500/50 transition group">
          <div className="text-gray-500 text-xs uppercase font-bold mb-1 group-hover:text-cyan-400/70 transition-colors">
            Active Projects
          </div>
          <div className="text-2xl font-bold text-white">
            {stats.projects}
          </div>
        </div>
        <div className="bg-[#0f1117]/60 backdrop-blur border border-cyan-900/30 p-4 rounded-lg hover:bg-[#0f1117]/80 hover:border-cyan-500/50 transition group">
          <div className="text-gray-500 text-xs uppercase font-bold mb-1 group-hover:text-cyan-400/70 transition-colors">
            Memory Usage
          </div>
          <div className="text-2xl font-bold text-cyan-400">
            {stats.memory}
          </div>
        </div>
        <div className="bg-[#0f1117]/60 backdrop-blur border border-cyan-900/30 p-4 rounded-lg hover:bg-[#0f1117]/80 hover:border-cyan-500/50 transition group">
          <div className="text-gray-500 text-xs uppercase font-bold mb-1 group-hover:text-cyan-400/70 transition-colors">
            Uptime
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {stats.uptime}
          </div>
        </div>
        <div className="bg-[#0f1117]/60 backdrop-blur border border-cyan-900/30 p-4 rounded-lg hover:bg-[#0f1117]/80 hover:border-cyan-500/50 transition group">
          <div className="text-gray-500 text-xs uppercase font-bold mb-1 group-hover:text-cyan-400/70 transition-colors">
            Provider Status
          </div>
          <div className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span>
            <span className="text-sm font-normal text-gray-300">{stats.providerStatus}</span>
          </div>
        </div>
      </div>

      {/* Recent Activity / Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Projects */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white border-b border-white/5 pb-2">
            Recent Projects
          </h2>
          <div className="space-y-2">
            {recentProjects.length === 0 ? (
               <div className="text-gray-500 text-sm italic">Loading projects...</div>
            ) : (
              recentProjects.map((p) => (
                <div 
                  key={p.id}
                  onClick={() => setActiveComponent('Projects')} // Assuming Projects component exists or will exist
                  className="bg-[#0f1117]/60 backdrop-blur border border-white/5 p-3 rounded cursor-pointer flex justify-between items-center transition hover:bg-[#0f1117]/90 hover:border-cyan-500/30 group"
                >
                  <div>
                    <div className="text-sm font-bold text-gray-200 group-hover:text-cyan-300 transition-colors">{p.name}</div>
                    <div className="text-xs text-gray-500">{p.path || "No path"}</div>
                  </div>
                  <div className="text-xs text-gray-600 font-mono group-hover:text-cyan-700 transition-colors">ID: {p.id.substring(0, 6)}</div>
                </div>
              ))
            )}
          </div>
          <button
            onClick={() => setActiveComponent('Projects')}
            className="inline-block text-xs text-cyan-400 hover:text-cyan-300 mt-2 cursor-pointer hover:underline decoration-cyan-500/30 underline-offset-4"
          >
            View All Projects →
          </button>
        </div>

        {/* System Health */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white border-b border-white/5 pb-2">
            System Health
          </h2>
          <div className="bg-[#0f1117]/60 backdrop-blur border border-white/5 p-4 rounded-lg space-y-4">
            {['Cortex', 'Precog', 'Nexus'].map((module) => (
              <div key={module}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">{module}</span>
                  <span className={`text-${systemHealth[module.toLowerCase()] === 'online' ? 'emerald' : 'red'}-400 capitalize font-mono`}>
                    {systemHealth[module.toLowerCase()]}
                  </span>
                </div>
                <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div className={`w-full h-full ${systemHealth[module.toLowerCase()] === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-red-500'}`}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
