import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, ExternalLink, Save } from 'lucide-react';

export default function TrainingPanel() {
  const [examples, setExamples] = useState({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newExample, setNewExample] = useState({
    category: '',
    name: '',
    description: '',
    referenceUrl: '',
    patterns: {
      layout: '',
      colors: '',
      interactions: ''
    }
  });

  useEffect(() => {
    loadExamples();
  }, []);

  const loadExamples = async () => {
    try {
      const response = await fetch('/api/v1/training/examples', {
        headers: {
          'x-session-token': localStorage.getItem('tooloo-session-token')
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setExamples(data.examples);
        }
      }
    } catch (err) {
      console.error('Failed to load training examples:', err);
    }
  };

  const handleAddExample = async () => {
    try {
      const response = await fetch('/api/v1/training/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': localStorage.getItem('tooloo-session-token')
        },
        body: JSON.stringify({
          category: newExample.category,
          example: {
            name: newExample.name,
            description: newExample.description,
            referenceUrl: newExample.referenceUrl,
            patterns: newExample.patterns
          }
        })
      });

      if (response.ok) {
        // Reset form
        setNewExample({
          category: '',
          name: '',
          description: '',
          referenceUrl: '',
          patterns: { layout: '', colors: '', interactions: '' }
        });
        setIsAddingNew(false);
        
        // Reload examples
        loadExamples();
      }
    } catch (err) {
      console.error('Failed to add training example:', err);
    }
  };

  const totalExamples = Object.values(examples).reduce(
    (sum, categoryExamples) => sum + categoryExamples.length, 
    0
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-purple-600" />
            Training Library
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            {totalExamples} examples • TooLoo learns from these to generate better prototypes
          </p>
        </div>
        
        <button
          onClick={() => setIsAddingNew(!isAddingNew)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Example
        </button>
      </div>

      {/* Add new example form */}
      {isAddingNew && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
          <h3 className="font-semibold mb-4">Add Training Example</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <input
                type="text"
                value={newExample.category}
                onChange={(e) => setNewExample({...newExample, category: e.target.value})}
                placeholder="e.g., task-managers, music-tools"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={newExample.name}
                onChange={(e) => setNewExample({...newExample, name: e.target.value})}
                placeholder="e.g., Linear-style Task Manager"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={newExample.description}
              onChange={(e) => setNewExample({...newExample, description: e.target.value})}
              placeholder="Describe the app and its key features..."
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              rows={2}
            />
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reference URL
            </label>
            <input
              type="url"
              value={newExample.referenceUrl}
              onChange={(e) => setNewExample({...newExample, referenceUrl: e.target.value})}
              placeholder="https://linear.app"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="mt-4 space-y-3">
            <h4 className="text-sm font-semibold">Patterns</h4>
            
            <div>
              <label className="block text-sm text-gray-600 mb-1">Layout</label>
              <input
                type="text"
                value={newExample.patterns.layout}
                onChange={(e) => setNewExample({
                  ...newExample, 
                  patterns: {...newExample.patterns, layout: e.target.value}
                })}
                placeholder="e.g., Sidebar + main content + command palette"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-1">Colors</label>
              <input
                type="text"
                value={newExample.patterns.colors}
                onChange={(e) => setNewExample({
                  ...newExample, 
                  patterns: {...newExample.patterns, colors: e.target.value}
                })}
                placeholder="e.g., #5E6AD2 (purple), #E5E5E5 (gray)"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-1">Interactions</label>
              <input
                type="text"
                value={newExample.patterns.interactions}
                onChange={(e) => setNewExample({
                  ...newExample, 
                  patterns: {...newExample.patterns, interactions: e.target.value}
                })}
                placeholder="e.g., Keyboard shortcuts, drag-drop, inline editing"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <button
              onClick={handleAddExample}
              disabled={!newExample.name || !newExample.category}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              Save Example
            </button>
            
            <button
              onClick={() => setIsAddingNew(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Existing examples */}
      <div className="space-y-6">
        {Object.entries(examples).map(([category, categoryExamples]) => (
          <div key={category} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h3 className="font-semibold text-lg mb-4 capitalize">
              {category.replace(/-/g, ' ')} 
              <span className="text-gray-500 text-sm ml-2">({categoryExamples.length})</span>
            </h3>
            
            <div className="space-y-3">
              {categoryExamples.map((example, idx) => (
                <div 
                  key={idx} 
                  className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{example.name}</h4>
                      {example.description && (
                        <p className="text-sm text-gray-600 mt-1">{example.description}</p>
                      )}
                      
                      {example.patterns && (
                        <div className="mt-2 space-y-1 text-xs text-gray-500">
                          {example.patterns.layout && (
                            <p><strong>Layout:</strong> {example.patterns.layout}</p>
                          )}
                          {example.patterns.colors && (
                            <p><strong>Colors:</strong> {example.patterns.colors}</p>
                          )}
                          {example.patterns.interactions && (
                            <p><strong>Interactions:</strong> {example.patterns.interactions}</p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {example.referenceUrl && (
                      <a
                        href={example.referenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-4 text-purple-600 hover:text-purple-700"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {Object.keys(examples).length === 0 && !isAddingNew && (
        <div className="text-center py-12 text-gray-500">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>No training examples yet.</p>
          <p className="text-sm">Add examples to help TooLoo generate better prototypes.</p>
        </div>
      )}
    </div>
  );
}
