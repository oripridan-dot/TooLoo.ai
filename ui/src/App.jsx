import { useState } from 'react';
import IdeaCanvas from './components/IdeaCanvas';
import MarketInsights from './components/MarketInsights';
import Header from './components/Header';

function App() {
  const [currentIdea, setCurrentIdea] = useState(null);
  const [marketAnalysis, setMarketAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleIdeaChange = (idea) => {
    setCurrentIdea(idea);
  };

  const handleAnalyze = async () => {
    if (!currentIdea) return;
    
    setIsAnalyzing(true);
    
    try {
      // Call API backend (proxied by Vite in development)
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ idea: currentIdea })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setMarketAnalysis(data.analysis);
      } else {
        console.error('Analysis failed:', data.error);
        // Fallback to empty state on error
        setMarketAnalysis(null);
      }
    } catch (error) {
      console.error('Failed to analyze idea:', error);
      // Fallback to empty state on network error
      setMarketAnalysis(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🧠 Idea Refinery Workshop
          </h1>
          <p className="text-lg text-gray-600">
            Transform rough ideas into validated, profit-ready product concepts
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <IdeaCanvas 
              onIdeaChange={handleIdeaChange}
              onAnalyze={handleAnalyze}
              isAnalyzing={isAnalyzing}
            />
          </div>

          <div className="space-y-6">
            <MarketInsights 
              analysis={marketAnalysis}
              isLoading={isAnalyzing}
            />
          </div>
        </div>

        {marketAnalysis && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in">
            <div className="card text-center">
              <div className="text-3xl font-bold text-primary-600">
                {marketAnalysis.validationScore}
              </div>
              <div className="text-sm text-gray-600 mt-1">Validation Score</div>
            </div>
            
            <div className="card text-center">
              <div className="text-3xl font-bold text-gray-900">
                {marketAnalysis.competition.count}
              </div>
              <div className="text-sm text-gray-600 mt-1">Competitors Found</div>
            </div>
            
            <div className="card text-center">
              <div className="text-3xl font-bold text-gray-900">
                {marketAnalysis.trends.discussions}
              </div>
              <div className="text-sm text-gray-600 mt-1">Reddit Discussions</div>
            </div>
            
            <div className="card text-center">
              <div className="text-3xl font-bold text-success-500">
                {marketAnalysis.opportunities.length}
              </div>
              <div className="text-sm text-gray-600 mt-1">Opportunities</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
