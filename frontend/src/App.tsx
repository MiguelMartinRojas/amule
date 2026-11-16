// Main App component for aMule Modern UI React frontend
import { ApiClientProvider } from './lib/api-client';
import { Dashboard } from './components/Dashboard';

export default function App() {
  return (
    <ApiClientProvider>
      <div className="min-h-screen bg-gray-900 text-white font-sans antialiased">
        <Dashboard />
      </div>
    </ApiClientProvider>
  );
}
