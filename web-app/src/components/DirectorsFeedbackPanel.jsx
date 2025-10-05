import React, { useState } from 'react';

const DirectorsFeedbackPanel = ({ isOpen, onClose }) => {
  const [feedback] = useState([
    {
      id: 1,
      scene: 'Opening Sequence',
      note: 'The lighting feels too harsh in the morning shot. Consider softening with diffusion.',
      timestamp: '2024-01-15 14:30',
      priority: 'high',
      status: 'pending',
      director: {
        name: 'Alex Rivera',
        avatar: 'AR'
      }
    },
    {
      id: 2,
      scene: 'Coffee Shop Dialogue',
      note: 'Great chemistry between actors! Let\'s tighten the pacing in the middle section.',
      timestamp: '2024-01-15 16:45',
      priority: 'medium',
      status: 'addressed',
      director: {
        name: 'Alex Rivera',
        avatar: 'AR'
      }
    },
    {
      id: 3,
      scene: 'Final Montage',
      note: 'The music swell at 01:23:15 needs more impact. Coordinate with sound design.',
      timestamp: '2024-01-14 11:20',
      priority: 'high',
      status: 'pending',
      director: {
        name: 'Alex Rivera',
        avatar: 'AR'
      }
    }
  ]);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status) => {
    return status === 'addressed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
  };

  return (
    <div className={`fixed right-0 top-0 h-full w-96 bg-gray-900 shadow-2xl transform transition-transform duration-300 z-50 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      {/* Header */}
      <div className="bg-gray-800 p-4 border-b border-gold-500">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gold-500 rounded-full flex items-center justify-center text-gray-900 font-bold">
              AR
            </div>
            <div>
              <h2 className="text-white font-semibold">Alex Rivera</h2>
              <p className="text-gray-400 text-sm">Director</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold text-gold-400">Director's Notes</h1>
        <p className="text-gray-400 text-sm mt-1">Feedback and suggestions for your project</p>
      </div>

      {/* Feedback List */}
      <div className="h-full overflow-y-auto">
        <div className="p-4 space-y-4">
          {feedback.map((item) => (
            <div key={item.id} className="bg-gray-800 rounded-lg p-4 border-l-4 border-gold-500">
              {/* Scene Header */}
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-white font-semibold">{item.scene}</h3>
                <div className="flex items-center space-x-2">
                  <span className={`w-3 h-3 rounded-full ${getPriorityColor(item.priority)}`}></span>
                  <span className="text-xs text-gray-400 uppercase">{item.priority}</span>
                </div>
              </div>

              {/* Note Content */}
              <p className="text-gray-300 text-sm mb-3">{item.note}</p>

              {/* Metadata and Actions */}
              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-500">
                  {item.timestamp}
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                  {item.status === 'pending' && (
                    <button className="bg-gold-500 hover:bg-gold-600 text-gray-900 px-3 py-1 rounded text-xs font-medium transition-colors">
                      Mark Done
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gray-800 border-t border-gray-700">
        <button className="w-full bg-gold-500 hover:bg-gold-600 text-gray-900 py-2 px-4 rounded-lg font-semibold transition-colors">
          Add Response
        </button>
      </div>
    </div>
  );
};

export default DirectorsFeedbackPanel;