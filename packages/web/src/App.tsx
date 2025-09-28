import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ChatInterface } from './components/ChatInterface'
import { Dashboard } from './components/Dashboard'
import { ConversationHistory } from './components/ConversationHistory'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<ChatInterface />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/conversations" element={<ConversationHistory />} />
      </Routes>
    </Layout>
  )
}

export default App