import { useState, useEffect } from 'react'
import { History, MessageCircle, Clock, User } from 'lucide-react'

interface Conversation {
  id: string
  title?: string
  messages: Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: string
  }>
  createdAt: string
  updatedAt: string
}

export function ConversationHistory() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await fetch('/api/conversations')
        const data = await response.json()
        
        if (data.success) {
          setConversations(data.data || [])
        }
      } catch (error) {
        console.error('Failed to fetch conversations:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchConversations()
  }, [])

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <History className="h-6 w-6 mr-3" />
          Conversation History
        </h1>
        <p className="text-gray-600 mt-1">Review your past conversations with TooLoo.ai</p>
      </div>

      {conversations.length === 0 ? (
        <div className="text-center py-12">
          <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations yet</h3>
          <p className="text-gray-500">Start chatting with TooLoo.ai to see your conversation history here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversation List */}
          <div className="lg:col-span-1 space-y-3">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation.id)}
                className={`
                  p-4 rounded-lg border cursor-pointer transition-colors
                  ${selectedConversation === conversation.id
                    ? 'bg-primary-50 border-primary-200'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                  }
                `}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-gray-900 truncate">
                    {conversation.title || `Conversation ${conversation.id.slice(-8)}`}
                  </h3>
                  <span className="text-xs text-gray-500">
                    {conversation.messages.length}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                  {conversation.messages[0]?.content || 'No messages'}
                </p>
                
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(conversation.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Conversation Details */}
          <div className="lg:col-span-2">
            {selectedConversation ? (
              <ConversationDetails
                conversation={conversations.find(c => c.id === selectedConversation)}
              />
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
                <p className="text-gray-500">Choose a conversation from the list to view its details.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ConversationDetails({ conversation }: { conversation?: Conversation }) {
  if (!conversation) return null

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {conversation.title || `Conversation ${conversation.id.slice(-8)}`}
        </h2>
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <span>Created: {new Date(conversation.createdAt).toLocaleString()}</span>
          <span>Updated: {new Date(conversation.updatedAt).toLocaleString()}</span>
          <span>{conversation.messages.length} messages</span>
        </div>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {conversation.messages.map((message) => (
          <div
            key={message.id}
            className={`
              p-3 rounded-lg
              ${message.role === 'user'
                ? 'bg-primary-50 border border-primary-200 ml-8'
                : 'bg-gray-50 border border-gray-200 mr-8'
              }
            `}
          >
            <div className="flex items-center space-x-2 mb-2">
              <User className={`h-4 w-4 ${message.role === 'user' ? 'text-primary-600' : 'text-gray-600'}`} />
              <span className={`text-sm font-medium ${message.role === 'user' ? 'text-primary-900' : 'text-gray-900'}`}>
                {message.role === 'user' ? 'You' : 'TooLoo.ai'}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(message.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div className="text-sm whitespace-pre-wrap">
              {message.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}