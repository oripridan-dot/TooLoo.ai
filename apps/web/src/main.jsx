// @version 2.0.0-alpha.0 - TooLoo V2
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import AppV2 from './AppV2.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './index.css'

const queryClient = new QueryClient()

// Feature flag: Use V2 interface
// Set via URL param (?v2=true) or env var
const useV2 = new URLSearchParams(window.location.search).has('v2') ||
              import.meta.env.VITE_USE_V2 === 'true'

const AppComponent = useV2 ? AppV2 : App

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppComponent />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)