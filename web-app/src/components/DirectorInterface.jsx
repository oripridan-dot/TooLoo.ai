import React, { useState, useEffect } from 'react';
import { Film, Play, Settings, Users } from 'lucide-react';

const DirectorInterface = () => {
  const [scenes, setScenes] = useState([
    { id: 1, title: 'Opening Sequence', duration: '2:15', status: 'approved', thumbnail: '/thumbnails/opening.jpg' },
    { id: 2, title: 'Character Introduction', duration: '1:45', status: 'pending', thumbnail: '/thumbnails/character.jpg' },
    { id: 3, title: 'Action Sequence', duration: '3:30', status: 'needs-work', thumbnail: '/thumbnails/action.jpg' },
    { id: 4, title: 'Emotional Climax', duration: '4:20', status: 'approved', thumbnail: '/thumbnails/climax.jpg' },
    { id: 5, title: 'Closing Scene', duration: '2:50', status: 'pending', thumbnail: '/thumbnails/closing.jpg' }
  ]);

  const [selectedScene, setSelectedScene] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (scenes.length > 0 && !selectedScene) {
      setSelectedScene(scenes[0]);
    }
  }, [scenes, selectedScene]);

  const handleSceneSelect = (scene) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setSelectedScene(scene);
      setIsTransitioning(false);
    }, 300);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'needs-work': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Film className="w-6 h-6 text-blue-400" />
            Director's Cut
          </h1>
          <p className="text-gray-400 text-sm mt-1">Scene Management</p>
        </div>

        {/* Scene List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-2">
            {scenes.map((scene) => (
              <div
                key={scene.id}
                className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                  selectedScene?.id === scene.id 
                    ? 'bg-blue-600 border-l-4 border-blue-400' 
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
                onClick={() => handleSceneSelect(scene)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-white">{scene.title}</h3>
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(scene.status)}`} />
                </div>
                <div className="flex items-center justify-between text-sm text-gray-300">
                  <span>{scene.duration}</span>
                  <span className="capitalize">{scene.status.replace('-', ' ')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Controls */}
        <div className="p-4 border-t border-gray-700 bg-gray-800">
          <div className="flex space-x-2">
            <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
              <Play className="w-4 h-4" />
              Play All
            </button>
            <button className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 flex flex-col">
        {/* Preview Header */}
        <div className="p-6 border-b border-gray-700 bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">
                {selectedScene?.title || 'Select a Scene'}
              </h2>
              <p className="text-gray-400 text-sm">
                {selectedScene ? `${selectedScene.duration} • ${selectedScene.status}` : 'No scene selected'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors flex items-center gap-2">
                <Users className="w-4 h-4" />
                Team Notes
              </button>
              <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors">
                Export Scene
              </button>
            </div>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 bg-black p-8 flex items-center justify-center">
          <div className={`w-full max-w-4xl aspect-video bg-gray-800 rounded-lg border-2 border-gray-700 flex items-center justify-center transition-opacity duration-300 ${
            isTransitioning ? 'opacity-0' : 'opacity-100'
          }`}>
            {selectedScene ? (
              <div className="text-center">
                <div className="w-32 h-32 bg-gray-700 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <Film className="w-12 h-12 text-gray-500" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{selectedScene.title}</h3>
                <p className="text-gray-400">Scene Preview - {selectedScene.duration}</p>
                <div className="mt-4 flex justify-center space-x-2">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg transition-colors">
                    Play Scene
                  </button>
                  <button className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-6 rounded-lg transition-colors">
                    Edit
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <Film className="w-16 h-16 mx-auto mb-4" />
                <p>Select a scene from the sidebar to preview</p>
              </div>
            )}
          </div>
        </div>

        {/* Timeline Controls */}
        <div className="p-4 border-t border-gray-700 bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors">
                Previous
              </button>
              <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg transition-colors flex items-center gap-2">
                <Play className="w-4 h-4" />
                Play
              </button>
              <button className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors">
                Next
              </button>
            </div>
            <div className="text-sm text-gray-400">
              Scene {scenes.findIndex(s => s.id === selectedScene?.id) + 1} of {scenes.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DirectorInterface;