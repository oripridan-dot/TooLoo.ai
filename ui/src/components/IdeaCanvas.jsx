import { useState } from 'react';

export default function IdeaCanvas({ onIdeaChange, onAnalyze, isAnalyzing }) {
  const [idea, setIdea] = useState({
    title: '',
    problem: '',
    solution: '',
    target: ''
  });

  const handleChange = (field, value) => {
    const updated = { ...idea, [field]: value };
    setIdea(updated);
    onIdeaChange(updated);
  };

  const isComplete = idea.title && idea.problem && idea.solution;

  return (
    <div className="card">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <span className="text-2xl mr-2">🎨</span>
          Idea Canvas
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Build your idea block by block
        </p>
      </div>

      <div className="space-y-4">
        {/* Title Block */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <label className="block text-sm font-semibold text-blue-900 mb-2">
            📌 Product Name
          </label>
          <input
            type="text"
            value={idea.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="e.g., TaskFlow"
            className="input-field bg-white"
          />
          <p className="text-xs text-blue-700 mt-1">
            Short, memorable name for your product
          </p>
        </div>

        {/* Problem Block */}
        <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
          <label className="block text-sm font-semibold text-red-900 mb-2">
            🔥 Problem
          </label>
          <textarea
            value={idea.problem}
            onChange={(e) => handleChange('problem', e.target.value)}
            placeholder="What problem are you solving? Who has this problem?"
            rows="3"
            className="input-field bg-white resize-none"
          />
          <p className="text-xs text-red-700 mt-1">
            Be specific. What pain point keeps people up at night?
          </p>
        </div>

        {/* Solution Block */}
        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <label className="block text-sm font-semibold text-green-900 mb-2">
            ✨ Solution
          </label>
          <textarea
            value={idea.solution}
            onChange={(e) => handleChange('solution', e.target.value)}
            placeholder="How will you solve this problem uniquely?"
            rows="3"
            className="input-field bg-white resize-none"
          />
          <p className="text-xs text-green-700 mt-1">
            What makes your approach different or better?
          </p>
        </div>

        {/* Target Audience Block */}
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <label className="block text-sm font-semibold text-purple-900 mb-2">
            🎯 Target Audience
          </label>
          <input
            type="text"
            value={idea.target}
            onChange={(e) => handleChange('target', e.target.value)}
            placeholder="e.g., Solo freelancers, consultants"
            className="input-field bg-white"
          />
          <p className="text-xs text-purple-700 mt-1">
            Who will pay for this? Be specific.
          </p>
        </div>

        {/* Analyze Button */}
        <button
          onClick={onAnalyze}
          disabled={!isComplete || isAnalyzing}
          className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all ${
            isComplete && !isAnalyzing
              ? 'bg-primary-600 hover:bg-primary-700 hover:shadow-lg'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          {isAnalyzing ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Analyzing Market...
            </span>
          ) : (
            <span className="flex items-center justify-center">
              <span className="mr-2">🔍</span>
              Analyze Market Opportunity
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
