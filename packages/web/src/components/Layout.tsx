import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  MessageCircle, 
  BarChart3, 
  History, 
  Settings,
  Brain,
  Zap
} from 'lucide-react'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation()

  const navigation = [
    { name: 'Chat', href: '/', icon: MessageCircle },
    { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
    { name: 'History', href: '/conversations', icon: History },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-center border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <Brain className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">TooLoo.ai</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                    ${isActive
                      ? 'bg-primary-50 text-primary-600 border-r-2 border-primary-600'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <item.icon className={`
                    mr-3 h-5 w-5 transition-colors
                    ${isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'}
                  `} />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Zap className="h-4 w-4" />
              <span>Self-Improving AI</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}