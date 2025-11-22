import { useState, useEffect } from 'react'
import { Brain, TrendingUp, BookOpen, FileText, Target, Zap } from 'lucide-react'

function SelfImprovementDashboard() {
  const [learningReport, setLearningReport] = useState(null)
  const [patterns, setPatterns] = useState([])
  const [decisions, setDecisions] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchAllData()
    // Refresh every 30 seconds
    const interval = setInterval(fetchAllData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchAllData = async () => {
    try {
      // Fetch learning metrics
      const learningRes = await fetch('/api/v1/learning/report')
      const learningData = await learningRes.json()
      setLearningReport(learningData.data)

      // Fetch pattern catalog
      const patternsRes = await fetch('/api/v1/patterns/catalog')
      const patternsData = await patternsRes.json()
      setPatterns(patternsData.data?.patterns || [])

      // Fetch decisions report
      const decisionsRes = await fetch('/api/v1/decisions/report')
      const decisionsData = await decisionsRes.json()
      setDecisions(decisionsData.data)

      setIsLoading(false)
    } catch (error) {
      console.error('Failed to fetch self-improvement data:', error)
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  const improvements = learningReport?.improvements || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Brain className="w-8 h-8 text-purple-500" />
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Self-Improvement Dashboard</h2>
          <p className="text-sm text-gray-600">TooLoo's learning journey towards Meta-AI</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* First-Try Success Rate */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-5 h-5 text-green-600" />
            <span className={`text-xs px-2 py-1 rounded ${
              improvements.firstTrySuccess?.achieved ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'
            }`}>
              {improvements.firstTrySuccess?.achieved ? 'Target Met!' : 'In Progress'}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">First-Try Success</h3>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-green-700">
              {(improvements.firstTrySuccess?.current * 100 || 0).toFixed(0)}%
            </span>
            <span className="text-sm text-gray-600">
              / {(improvements.firstTrySuccess?.target * 100).toFixed(0)}% target
            </span>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(improvements.firstTrySuccess?.current / improvements.firstTrySuccess?.target) * 100 || 0}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Baseline: {(improvements.firstTrySuccess?.baseline * 100).toFixed(0)}%
          </p>
        </div>

        {/* Repeat Problems */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <span className={`text-xs px-2 py-1 rounded ${
              improvements.repeatProblems?.achieved ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'
            }`}>
              {improvements.repeatProblems?.achieved ? 'Target Met!' : 'In Progress'}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">Repeat Problems</h3>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-blue-700">
              {(improvements.repeatProblems?.current * 100 || 0).toFixed(0)}%
            </span>
            <span className="text-sm text-gray-600">
              / {(improvements.repeatProblems?.target * 100).toFixed(0)}% target
            </span>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${100 - (improvements.repeatProblems?.current / improvements.repeatProblems?.baseline) * 100 || 0}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Baseline: {(improvements.repeatProblems?.baseline * 100).toFixed(0)}%
          </p>
        </div>

        {/* Total Activity */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <Zap className="w-5 h-5 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">Activity</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Sessions</span>
              <span className="text-lg font-bold text-purple-700">{learningReport?.totalSessions || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Successes</span>
              <span className="text-lg font-bold text-green-600">{learningReport?.successfulGenerations || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Failures</span>
              <span className="text-lg font-bold text-red-600">{learningReport?.failedGenerations || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Patterns & Decisions Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pattern Library */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-800">Pattern Library</h3>
          </div>
          {patterns.length === 0 ? (
            <p className="text-sm text-gray-600">No patterns discovered yet. As TooLoo works on projects, it will automatically extract reusable patterns.</p>
          ) : (
            <div className="space-y-2">
              {patterns.slice(0, 5).map((pattern, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-gray-800">{pattern.name}</h4>
                      <p className="text-xs text-gray-600 mt-1">{pattern.category}</p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded">
                      {pattern.usageCount || 0} uses
                    </span>
                  </div>
                </div>
              ))}
              {patterns.length > 5 && (
                <p className="text-xs text-gray-500 text-center mt-2">
                  +{patterns.length - 5} more patterns
                </p>
              )}
            </div>
          )}
        </div>

        {/* Recent Decisions */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <FileText className="w-5 h-5 text-amber-600" />
            <h3 className="text-lg font-semibold text-gray-800">Architecture Decisions</h3>
          </div>
          {!decisions || decisions.totalDecisions === 0 ? (
            <p className="text-sm text-gray-600">No architectural decisions logged yet. TooLoo will record key decisions as it builds features.</p>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-gray-600">Total Decisions</span>
                <span className="text-lg font-bold text-gray-800">{decisions.totalDecisions}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Outcomes Tracked</span>
                <span className="text-lg font-bold text-green-600">{decisions.decisionsWithOutcomes || 0}</span>
              </div>
              {decisions.recentDecisions && decisions.recentDecisions.length > 0 && (
                <div className="mt-4 space-y-2">
                  {decisions.recentDecisions.slice(0, 3).map((decision, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-800">{decision.title}</h4>
                      <p className="text-xs text-gray-600 mt-1">{decision.context?.substring(0, 80)}...</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Common Failures Section */}
      {learningReport?.commonFailures && learningReport.commonFailures.length > 0 && (
        <div className="bg-red-50 p-6 rounded-lg border border-red-200">
          <h3 className="text-lg font-semibold text-red-800 mb-3">Areas for Improvement</h3>
          <div className="space-y-2">
            {learningReport.commonFailures.slice(0, 3).map((failure, idx) => (
              <div key={idx} className="p-3 bg-white rounded border border-red-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-800">{failure.task}</h4>
                    <p className="text-xs text-gray-600 mt-1">{failure.error}</p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                    {failure.count}x
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default SelfImprovementDashboard
