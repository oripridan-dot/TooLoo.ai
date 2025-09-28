import { useState, useEffect, useRef } from 'react'
import { Send, Loader2, Copy, Play } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useSocket } from '../hooks/useSocket'
import { MessageBubble } from './MessageBubble'
import { PerformanceMetrics } from './PerformanceMetrics'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  metadata?: any
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const socket = useSocket()

  useEffect(() => {
    if (socket) {
      socket.on('chat:response', (response) => {
        const assistantMessage: Message = {
          id: response.conversationId + '_' + Date.now(),
          role: 'assistant',
          content: response.response,
          timestamp: new Date(),
          metadata: response.metadata
        }
        setMessages(prev => [...prev, assistantMessage])
        setIsLoading(false)
        if (!conversationId) {
          setConversationId(response.conversationId)
        }
      })

      socket.on('chat:error', (error) => {
        toast.error(error.error)
        setIsLoading(false)
      })

      return () => {
        socket.off('chat:response')
        socket.off('chat:error')
      }
    }
  }, [socket, conversationId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    if (socket) {
      socket.emit('chat:message', {
        message: input.trim(),
        conversationId,
        userId: 'anonymous'
      })
    } else {
      // Fallback to HTTP API
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: input.trim(),
            conversationId,
            userId: 'anonymous'
          }),
        })

        const data = await response.json()
        
        if (data.success) {
          const assistantMessage: Message = {
            id: data.data.conversationId + '_' + Date.now(),
            role: 'assistant',
            content: data.data.response,
            timestamp: new Date(),
            metadata: data.data.metadata
          }
          setMessages(prev => [...prev, assistantMessage])
          
          if (!conversationId) {
            setConversationId(data.data.conversationId)
          }
        } else {
          toast.error(data.error || 'Failed to get response')
        }
      } catch (error) {
        toast.error('Failed to send message')
      } finally {
        setIsLoading(false)
      }
    }

    setInput('')
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">
              AI Development Assistant
            </h1>
            {conversationId && (
              <span className="text-sm text-gray-500">
                Conversation: {conversationId.slice(-8)}
              </span>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">
                <div className="text-lg font-medium mb-2">Welcome to TooLoo.ai!</div>
                <div className="text-sm">
                  I'm your intelligent development assistant. I can help you with:
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="font-medium text-gray-900 mb-2">💻 Code Generation</div>
                  <div className="text-sm text-gray-600">
                    Generate functions, classes, and complete applications
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="font-medium text-gray-900 mb-2">🚀 Code Execution</div>
                  <div className="text-sm text-gray-600">
                    Run and test code with performance metrics
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="font-medium text-gray-900 mb-2">🧠 Problem Solving</div>
                  <div className="text-sm text-gray-600">
                    Debug issues and optimize algorithms
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="font-medium text-gray-900 mb-2">📚 Learning</div>
                  <div className="text-sm text-gray-600">
                    Explain concepts and best practices
                  </div>
                </div>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onCopy={copyToClipboard}
            />
          ))}

          {isLoading && (
            <div className="flex items-center space-x-2 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>TooLoo.ai is thinking...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <div className="bg-white border-t border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="flex space-x-4">
            <div className="flex-1">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything about development..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>

      {/* Right Sidebar - Performance Metrics */}
      <div className="w-80 bg-white border-l border-gray-200">
        <PerformanceMetrics conversationId={conversationId} />
      </div>
    </div>
  )
}