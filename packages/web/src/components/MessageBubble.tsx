import { Copy, Play, Clock, Cpu, Zap } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  metadata?: any
}

interface MessageBubbleProps {
  message: Message
  onCopy: (text: string) => void
}

export function MessageBubble({ message, onCopy }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-3xl rounded-lg px-4 py-3
          ${isUser
            ? 'bg-primary-600 text-white ml-12'
            : 'bg-white border border-gray-200 mr-12'
          }
        `}
      >
        {/* Message Content */}
        <div className="mb-2">
          {isUser ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '')
                  return !inline && match ? (
                    <div className="relative">
                      <SyntaxHighlighter
                        style={tomorrow}
                        language={match[1]}
                        PreTag="div"
                        className="rounded-md"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                      <button
                        onClick={() => onCopy(String(children))}
                        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 bg-gray-800 hover:bg-gray-700 rounded"
                        title="Copy code"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <code className="bg-gray-100 px-1 py-0.5 rounded text-sm" {...props}>
                      {children}
                    </code>
                  )
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {/* Message Metadata */}
        <div className="flex items-center justify-between text-xs">
          <div className={`flex items-center space-x-4 ${isUser ? 'text-primary-200' : 'text-gray-500'}`}>
            <span>{message.timestamp.toLocaleTimeString()}</span>
            
            {message.metadata && (
              <>
                {message.metadata.provider && (
                  <div className="flex items-center space-x-1">
                    <Zap className="h-3 w-3" />
                    <span>{message.metadata.provider}</span>
                  </div>
                )}
                
                {message.metadata.performance?.responseTimeMs && (
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{Math.round(message.metadata.performance.responseTimeMs)}ms</span>
                  </div>
                )}
                
                {message.metadata.usage?.totalTokens && (
                  <div className="flex items-center space-x-1">
                    <Cpu className="h-3 w-3" />
                    <span>{message.metadata.usage.totalTokens} tokens</span>
                  </div>
                )}
              </>
            )}
          </div>

          {!isUser && (
            <button
              onClick={() => onCopy(message.content)}
              className="text-gray-400 hover:text-gray-600 p-1"
              title="Copy message"
            >
              <Copy className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Execution Results */}
        {message.metadata?.executionResults && (
          <div className="mt-3 space-y-2">
            {message.metadata.executionResults.map((result: any, index: number) => (
              <div key={index} className="bg-gray-50 border rounded-lg p-3">
                <div className="text-sm font-medium text-gray-900 mb-2">
                  Execution Result {index + 1}
                </div>
                
                {result.success ? (
                  <>
                    <div className="text-green-600 text-sm mb-1">✓ Success</div>
                    {result.result.output && (
                      <div className="bg-black text-green-400 p-2 rounded text-xs font-mono">
                        {result.result.output}
                      </div>
                    )}
                    <div className="flex space-x-4 text-xs text-gray-500 mt-2">
                      <span>Time: {result.result.executionTime}ms</span>
                      {result.result.memoryUsed && (
                        <span>Memory: {Math.round(result.result.memoryUsed)}MB</span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-red-600 text-sm mb-1">✗ Error</div>
                    <div className="bg-red-50 text-red-700 p-2 rounded text-xs">
                      {result.error}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}