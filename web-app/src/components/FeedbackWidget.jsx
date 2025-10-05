import React, { useState, useEffect } from 'react';
import { MessageSquare, Star, Send, TrendingUp } from 'lucide-react';

export default function FeedbackWidget({ projectId, isPublicTester = false }) {
  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [aggregateData, setAggregateData] = useState(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Load existing feedback if owner
    if (!isPublicTester && projectId) {
      loadFeedback();
    }
  }, [projectId, isPublicTester]);

  const loadFeedback = async () => {
    try {
      const response = await fetch(`/api/v1/feedback/${projectId}`, {
        headers: {
          'x-session-token': localStorage.getItem('tooloo-session-token')
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAggregateData(data.feedback);
        }
      }
    } catch (err) {
      console.error('Failed to load feedback:', err);
    }
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch('/api/v1/feedback', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-session-token': isPublicTester ? 'public' : localStorage.getItem('tooloo-session-token')
        },
        body: JSON.stringify({
          projectId,
          userId: isPublicTester ? `tester-${Date.now()}` : 'owner',
          rating,
          comments,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        setSubmitted(true);
        setRating(0);
        setComments('');
        
        // Reload feedback data for owner
        if (!isPublicTester) {
          loadFeedback();
        }
        
        setTimeout(() => {
          setSubmitted(false);
          if (isPublicTester) {
            setIsVisible(false);
          }
        }, 3000);
      }
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    }
  };

  if (!isVisible && isPublicTester) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-white rounded-full shadow-lg p-3 hover:bg-gray-50"
      >
        <MessageSquare className="w-6 h-6 text-blue-600" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-80 max-h-96 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          {isPublicTester ? 'How was this?' : 'Test Feedback'}
        </h3>
        {isPublicTester && (
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        )}
      </div>

      {/* Show aggregate data for owner */}
      {!isPublicTester && aggregateData && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-sm">Feedback Summary</span>
          </div>
          <div className="text-sm text-gray-700">
            <p><strong>{aggregateData.totalFeedback}</strong> responses</p>
            <p><strong>{aggregateData.averageRating}</strong> avg rating</p>
          </div>
        </div>
      )}

      {/* Star rating */}
      <div className="flex gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            className="hover:scale-110 transition-transform"
            disabled={submitted}
          >
            <Star
              className={`w-6 h-6 ${
                star <= rating 
                  ? 'fill-yellow-400 text-yellow-400' 
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>

      {/* Comments */}
      <textarea
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        placeholder={isPublicTester 
          ? "What did you think? Any suggestions?" 
          : "Notes about this test..."}
        className="w-full p-2 border border-gray-300 rounded-lg mb-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        rows={3}
        disabled={submitted}
      />

      <button
        onClick={handleSubmit}
        disabled={rating === 0 || submitted}
        className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
      >
        {submitted ? (
          <>✓ Thank you!</>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Submit Feedback
          </>
        )}
      </button>

      {/* Show recent feedback for owner */}
      {!isPublicTester && aggregateData && aggregateData.feedback.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-semibold mb-2">Recent Feedback</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {aggregateData.feedback.slice(0, 3).map((fb, idx) => (
              <div key={idx} className="text-xs p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-1 mb-1">
                  {[...Array(fb.rating)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  ))}
                  <span className="text-gray-500 ml-1">
                    {new Date(fb.timestamp).toLocaleDateString()}
                  </span>
                </div>
                {fb.comments && (
                  <p className="text-gray-700">{fb.comments}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
