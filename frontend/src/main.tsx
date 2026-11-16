import { useEffect } from 'react'
import { ApiClientProvider } from './lib/types'
import { Dashboard } from './components/Dashboard'
import './globals.css'

function Root() {
  // Wrap app with API client provider
  return (
    <ApiClientProvider statusUrl="/api/status">
      <div className="min-h-screen bg-gray-900 text-white font-sans antialiased">
        <Dashboard />
      </div>
    </ApiClientProvider>
  )
}

export default Root