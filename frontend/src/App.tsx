// Main App component for aMule Modern UI React frontend
import { useState } from 'react';
import { ApiClientProvider } from './lib/api-client';
import { Dashboard } from './components/Dashboard';
import { SearchPage } from './components/SearchPage';
import { ServersPage } from './components/ServersPage';

export default function App() {
  const [activeView, setActiveView] = useState<'dashboard' | 'search' | 'servers'>('dashboard');

  return (
    <ApiClientProvider>
      <div className="min-h-screen bg-gray-900 text-white font-sans antialiased">
        <nav className="container mx-auto flex gap-2 px-4 pt-6" aria-label="Main navigation">
          <button
            type="button"
            aria-pressed={activeView === 'dashboard'}
            className={`rounded-lg px-4 py-2 ${
              activeView === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'
            }`}
            onClick={() => setActiveView('dashboard')}
          >
            Dashboard
          </button>
          <button
            type="button"
            aria-pressed={activeView === 'search'}
            className={`rounded-lg px-4 py-2 ${
              activeView === 'search' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'
            }`}
            onClick={() => setActiveView('search')}
          >
            Search
          </button>
          <button
            type="button"
            aria-pressed={activeView === 'servers'}
            className={`rounded-lg px-4 py-2 ${
              activeView === 'servers' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'
            }`}
            onClick={() => setActiveView('servers')}
          >
            Servers
          </button>
        </nav>
        {activeView === 'dashboard' ? (
          <Dashboard />
        ) : activeView === 'search' ? (
          <SearchPage />
        ) : (
          <ServersPage />
        )}
      </div>
    </ApiClientProvider>
  );
}
