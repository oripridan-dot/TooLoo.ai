// @version 2.2.38
import React, { useState, useEffect } from 'react';

const Projects = ({ setActiveComponent }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch('/api/v1/projects');
        const data = await res.json();
        // Backend returns { ok: true, projects: [...] }
        setProjects(data.projects || []);
      } catch (e) {
        console.error("Failed to load projects", e);
        setError("Failed to load projects.");
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const handleOpenProject = (id) => {
    localStorage.setItem("tooloo_current_project_id", id);
    setActiveComponent('Chat');
  };

  const handleCreateProject = async () => {
    const name = prompt("Enter project name:");
    if (!name) return;

    const description = prompt("Enter project description (optional):");
    
    try {
      const res = await fetch('/api/v1/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, type: 'general' })
      });
      
      const data = await res.json();
      if (data.ok) {
        setProjects([...projects, data.project]);
      } else {
        alert("Failed to create project: " + data.error);
      }
    } catch (e) {
      console.error("Error creating project", e);
      alert("Error creating project");
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col relative overflow-y-auto h-full">
      {/* Header */}
      <div className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-gray-900/30 sticky top-0 backdrop-blur z-10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
          <span className="font-mono text-xs text-cyan-400">PROJECT MANAGER</span>
        </div>
        <div className="flex gap-4 items-center">
          <button
            onClick={handleCreateProject}
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-bold transition cursor-pointer"
          >
            + New Project
          </button>
        </div>
      </div>

      <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Active Projects</h1>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-900 border border-white/10 rounded px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading && (
            <div className="col-span-full text-center py-12 text-gray-500 italic">
              Loading projects...
            </div>
          )}

          {error && (
            <div className="col-span-full text-center py-12 text-red-400">
              {error}
            </div>
          )}

          {!loading && !error && filteredProjects.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              No projects found. Create one to get started.
            </div>
          )}

          {!loading && !error && filteredProjects.map((p) => (
            <div
              key={p.id}
              onClick={() => handleOpenProject(p.id)}
              className="bg-gray-900/70 backdrop-blur border border-white/10 hover:bg-gray-900/90 hover:border-cyan-500/30 p-5 rounded-lg cursor-pointer transition group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition">
                <button className="text-gray-400 hover:text-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
                  </svg>
                </button>
              </div>
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-lg">
                  {p.name.charAt(0).toUpperCase()}
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mb-1 group-hover:text-cyan-400 transition">
                {p.name}
              </h3>
              <p className="text-xs text-gray-500 font-mono mb-4 truncate">
                {p.path}
              </p>
              
              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <span className="text-[10px] text-gray-600 uppercase tracking-wider font-bold">
                  ID: {p.id.substring(0, 6)}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Active
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Projects;
