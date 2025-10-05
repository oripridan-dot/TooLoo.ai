import React, { useState, useEffect } from 'react';

const DirectorFeedback = () => {
  const [feedbackItems, setFeedbackItems] = useState([
    {
      id: 1,
      activity: 'Code Review Session',
      director: 'Sarah Chen',
      comment: 'Excellent problem-solving approach and clean code structure. Consider adding more detailed comments for complex functions.',
      rating: 'positive',
      timestamp: '2024-01-15 14:30',
      priority: 'medium'
    },
    {
      id: 2,
      activity: 'Team Collaboration',
      director: 'Mike Rodriguez',
      comment: 'Good communication with team members. Could improve on documenting decisions in shared channels.',
      rating: 'neutral',
      timestamp: '2024-01-14 11:15',
      priority: 'low'
    },
    {
      id: 3,
      activity: 'Project Delivery',
      director: 'Lisa Thompson',
      comment: 'Missed the deadline by 2 days. Need to improve time estimation and communicate blockers earlier.',
      rating: 'negative',
      timestamp: '2024-01-12 16:45',
      priority: 'high'
    }
  ]);

  const [newFeedback, setNewFeedback] = useState({
    activity: '',
    comment: '',
    rating: 'neutral',
    priority: 'medium'
  });

  const getRatingColor = (rating) => {
    switch (rating) {
      case 'positive': return 'bg-green-100 border-green-500 text-green-800';
      case 'negative': return 'bg-red-100 border-red-500 text-red-800';
      default: return 'bg-yellow-100 border-yellow-500 text-yellow-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  const handleAddFeedback = () => {
    if (newFeedback.activity && newFeedback.comment) {
      const feedback = {
        id: feedbackItems.length + 1,
        ...newFeedback,
        director: 'Current Director',
        timestamp: new Date().toISOString()
      };
      setFeedbackItems([feedback, ...feedbackItems]);
      setNewFeedback({ activity: '', comment: '', rating: 'neutral', priority: 'medium' });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Director Activity Feedback</h2>
      
      {/* Quick Feedback Form */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Add Quick Feedback</h3>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Activity Name"
            value={newFeedback.activity}
            onChange={(e) => setNewFeedback({...newFeedback, activity: e.target.value})}
            className="w-full p-2 border border-gray-300 rounded-md"
          />
          <textarea
            placeholder="Feedback comment..."
            value={newFeedback.comment}
            onChange={(e) => setNewFeedback({...newFeedback, comment: e.target.value})}
            className="w-full p-2 border border-gray-300 rounded-md h-20"
          />
          <div className="flex gap-4">
            <select
              value={newFeedback.rating}
              onChange={(e) => setNewFeedback({...newFeedback, rating: e.target.value})}
              className="p-2 border border-gray-300 rounded-md"
            >
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
            <select
              value={newFeedback.priority}
              onChange={(e) => setNewFeedback({...newFeedback, priority: e.target.value})}
              className="p-2 border border-gray-300 rounded-md"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
          </div>
          <button
            onClick={handleAddFeedback}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
          >
            Add Feedback
          </button>
        </div>
      </div>

      {/* Feedback List */}
      <div className="space-y-4">
        {feedbackItems.map((item) => (
          <div
            key={item.id}
            className={`border-l-4 p-4 rounded-r-lg ${getRatingColor(item.rating)}`}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-semibold text-lg">{item.activity}</h4>
                <p className="text-sm text-gray-600">By {item.director} • {new Date(item.timestamp).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${getPriorityColor(item.priority)}`}></span>
                <span className="text-sm capitalize">{item.priority} priority</span>
              </div>
            </div>
            <p className="text-gray-700">{item.comment}</p>
            <div className="flex gap-2 mt-3">
              <button className="text-blue-500 text-sm hover:underline">Reply</button>
              <button className="text-gray-500 text-sm hover:underline">Mark as Read</button>
              <button className="text-red-500 text-sm hover:underline">Dismiss</button>
            </div>
          </div>
        ))}
      </div>

      {/* Progress Summary */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Feedback Summary</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-green-100 p-3 rounded-lg">
            <div className="text-2xl font-bold text-green-800">8</div>
            <div className="text-sm text-green-600">Positive</div>
          </div>
          <div className="bg-yellow-100 p-3 rounded-lg">
            <div className="text-2xl font-bold text-yellow-800">5</div>
            <div className="text-sm text-yellow-600">Neutral</div>
          </div>
          <div className="bg-red-100 p-3 rounded-lg">
            <div className="text-2xl font-bold text-red-800">2</div>
            <div className="text-sm text-red-600">Needs Work</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DirectorFeedback;