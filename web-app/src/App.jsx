import { useState, useEffect, useRef } from 'react'
import { Brain, Send, Loader2, CheckCircle, AlertCircle, Zap, Settings } from 'lucide-react'
import { io } from 'socket.io-client'
import ReactMarkdown from 'react-markdown'

function App() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [systemStatus, setSystemStatus] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    // Initialize socket connection (use relative URL so Vite proxy works locally and in Codespaces)
    const newSocket = io()
    setSocket(newSocket)

    // Fetch system status
    fetchSystemStatus()

    // Socket event listeners
    newSocket.on('connect', () => {
      setIsConnected(true)
    })

    newSocket.on('disconnect', () => {
      setIsConnected(false)
    })

    newSocket.on('thinking', (data) => {
      setIsLoading(true)
    })

    newSocket.on('response', (data) => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'assistant',
        content: data.content,
        metadata: {
          provider: data.provider,
          cost: data.cost,
          timestamp: data.timestamp
        }
      }])
      setIsLoading(false)
    })

    newSocket.on('error', (data) => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        content: `Error: ${data.message}\n\nHelp: ${data.help}`,
        metadata: { timestamp: new Date().toISOString() }
      }])
      setIsLoading(false)
    })

    return () => newSocket.close()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const fetchSystemStatus = async () => {
    try {
      // Use relative path so dev proxy and production both work
      const response = await fetch('/api/v1/system/status')
      const status = await response.json()
      setSystemStatus(status)
    } catch (error) {
      console.error('Failed to fetch system status:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: input.trim(),
      metadata: { timestamp: new Date().toISOString() }
    }

    setMessages(prev => [...prev, userMessage])
    
    // Send via WebSocket for real-time experience
    if (socket) {
      socket.emit('generate', {
        prompt: input.trim(),
        context: { sessionId: 'personal', mode: 'development' }
      })
    } else {
      // Fallback to HTTP API
      try {
        setIsLoading(true)
        const response = await fetch('/api/v1/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: input.trim() })
        })
        
        const result = await response.json()
        
        if (result.success) {
          setMessages(prev => [...prev, {
            id: Date.now() + 1,
            type: 'assistant',
            content: result.content,
            metadata: result.metadata
          }])
        } else {
          throw new Error(result.error)
        }
      } catch (error) {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          type: 'error',
          content: `Error: ${error.message}`,
          metadata: { timestamp: new Date().toISOString() }
        }])
      } finally {
        setIsLoading(false)
      }
    }

    setInput('')
  }

  const formatMessage = (message) => {
    switch (message.type) {
      case 'user':
        return (
          <div className="flex justify-end mb-4">
            <div className="bg-primary-600 text-white rounded-lg px-4 py-3 max-w-2xl">
              <div className="whitespace-pre-wrap">{message.content}</div>
              <div className="text-primary-200 text-xs mt-2">
                {new Date(message.metadata.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        )
      
      case 'assistant':
        return (
          <div className="flex justify-start mb-4">
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 max-w-4xl">
              <ReactMarkdown className="prose max-w-none">{message.content}</ReactMarkdown>
              <div className="flex items-center justify-between text-xs text-gray-500 mt-3 pt-2 border-t">
                <span>via {message.metadata.provider}</span>
                <span>{new Date(message.metadata.timestamp).toLocaleTimeString()}</span>
                {message.metadata.cost > 0 && (
                  <span>${message.metadata.cost.toFixed(4)}</span>
                )}
              </div>
            </div>
          </div>
        )
      
      case 'error':
        return (
          <div className="flex justify-start mb-4">
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 max-w-2xl">
              <div className="flex items-center mb-2">
                <AlertCircle className="w-4 h-4 mr-2" />
                <span className="font-medium">Error</span>
              </div>
              <div className="whitespace-pre-wrap">{message.content}</div>
            </div>
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
              {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">TooLoo.ai</h1>
              <p className="text-sm text-gray-600">Personal Development Assistant</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-600">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
            {isConnected && (
              <div className="flex items-center space-x-2 px-2 py-1 bg-green-50 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs text-green-700 font-medium">FS Access</span>
              </div>
            )}
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

      {/* Settings Panel */}
      {showSettings && systemStatus && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-4">
          <div className="max-w-6xl mx-auto">
            <h3 className="font-medium text-blue-900 mb-3">System Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {systemStatus.providers.map((provider, index) => (
                <div key={index} className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
                  <span className="text-sm font-medium">{provider.displayName}</span>
                  {provider.hasKey ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex">
        <main className="flex-1 max-w-6xl mx-auto px-6 py-6">
          {/* Welcome Message */}
          {messages.length === 0 && (
            <div className="text-center py-12">
              <Brain className="w-16 h-16 text-primary-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Welcome to Your Personal AI Development Assistant
              </h2>
              <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                Describe what you want to build, and I'll help you create it. No coding required - 
                just tell me your ideas and I'll generate working applications for you.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                <div className="card p-4 text-left">
                  <Zap className="w-6 h-6 text-primary-600 mb-2" />
                  <h3 className="font-medium mb-2">Quick Apps</h3>
                  <p className="text-sm text-gray-600">
                    "Build me a todo app" or "Create an expense tracker"
                  </p>
                </div>
                
                <div className="card p-4 text-left">
                  <Brain className="w-6 h-6 text-primary-600 mb-2" />
                  <h3 className="font-medium mb-2">Complex Projects</h3>
                  <p className="text-sm text-gray-600">
                    "I need a customer management system for my business"
                  </p>
                </div>

                <div className="card p-4 text-left">
                  <Settings className="w-6 h-6 text-primary-600 mb-2" />
                  <h3 className="font-medium mb-2">File Management</h3>
                  <p className="text-sm text-gray-600">
                    "Create project MyApp" or "List files" or "Save this code"
                  </p>
                </div>
              </div>
              
              <div className="mt-8 p-4 bg-blue-50 rounded-lg max-w-4xl mx-auto">
                <h3 className="font-medium text-blue-900 mb-2">🎯 TooLoo.ai has full filesystem access!</h3>
                <div className="text-sm text-blue-800 grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>• Creates complete project structures</div>
                  <div>• Saves generated code as files</div>
                  <div>• Manages your personal projects</div>
                  <div>• Organizes files intelligently</div>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="space-y-4">
            {messages.map(message => (
              <div key={message.id}>
                {formatMessage(message)}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>TooLoo.ai is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </main>
      </div>

      {/* Input Form */}
      <footer className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <form onSubmit={handleSubmit} className="flex space-x-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe what you want to build... (e.g., 'Create a simple blog website')"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              <span>Send</span>
            </button>
          </form>
          
          <div className="mt-2 text-center">
            <p className="text-xs text-gray-500">
              TooLoo.ai helps you build applications without coding. Describe your idea in plain English.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App