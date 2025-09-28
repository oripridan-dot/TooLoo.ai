import { useEffect, useState } from 'react'
import { BarChart3, Zap, Clock, Cpu, TrendingUp } from 'lucide-react'

interface PerformanceData {
  provider: string
  responseTime: number
  tokenUsage: number
  successRate: number
}

interface PerformanceMetricsProps {
  conversationId: string | null
}

export function PerformanceMetrics({ conversationId }: PerformanceMetricsProps) {
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchStats = async () => {
      if (!conversationId) return
      
      setIsLoading(true)
      try {
        const response = await fetch('/api/stats')
        const data = await response.json()
        
        if (data.success) {
          setStats(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 5000) // Update every 5 seconds
    
    return () => clearInterval(interval)
  }, [conversationId])

  if (!conversationId) {
    return (
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          Performance Metrics
        </h3>
        <div className="text-gray-500 text-sm">
          Start a conversation to see real-time metrics
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 h-full overflow-y-auto">
      <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
        <BarChart3 className="h-5 w-5 mr-2" />
        Performance Metrics
      </h3>

      {isLoading && !stats && (
        <div className="text-gray-500 text-sm">Loading metrics...</div>
      )}

      {stats && (
        <div className="space-y-6">
          {/* Provider Status */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <Zap className="h-4 w-4 mr-2" />
              AI Providers
            </h4>
            <div className="space-y-2">
              {stats.availableProviders?.map((provider: string) => {
                const weight = stats.weights?.find((w: any) => w.provider === provider)
                return (
                  <div key={provider} className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">{provider}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-xs text-gray-600">
                        {weight ? Math.round(weight.successRate * 100) : 100}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Response Times */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Response Times
            </h4>
            <div className="space-y-2">
              {stats.weights?.map((weight: any) => (
                <div key={weight.provider} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{weight.provider}</span>
                  <span className="text-sm text-gray-600">
                    {Math.round(weight.avgResponseTime)}ms
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Weights */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              Provider Weights
            </h4>
            <div className="space-y-3">
              {stats.weights?.map((weight: any) => (
                <div key={weight.provider}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="capitalize">{weight.provider}</span>
                    <span>{Math.round(weight.weight * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full"
                      style={{ width: `${weight.weight * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <Cpu className="h-4 w-4 mr-2" />
              System Status
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total Providers</span>
                <span>{stats.totalProviders}</span>
              </div>
              <div className="flex justify-between">
                <span>Active Providers</span>
                <span>{stats.availableProviders?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Status</span>
                <span className="text-green-600">Operational</span>
              </div>
            </div>
          </div>

          {/* Real-time Indicator */}
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 text-xs text-gray-500">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Real-time monitoring</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}