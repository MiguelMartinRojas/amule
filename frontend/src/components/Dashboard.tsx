import { type JSX } from 'react'
import { useApiClient, LoadingSpinner } from '../lib/types'

export function Dashboard({ }: {}): JSX.Element {
  const { status } = useApiClient()

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-blue-600 p-4 shadow-lg">
        <h1 className="text-3xl font-bold">🚀 aMule Modern Dashboard</h1>
        <p className="text-blue-100 text-sm mt-1">Real-time stats & transfer management</p>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6 grid md:grid-cols-3 gap-6">
        
        {/* Left Column - System Status */}
        <div className="md:col-span-1 space-y-6">
          {/* Memory Card */}
          <section className="bg-gray-800 rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-3">💾 Memory Usage</h2>
            {status?.system ? (
              <>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span>{(status.system.totalMemory / 1024).toFixed(1)} GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Free:</span>
                    <span>{(status.system.freeMemory / 1024).toFixed(1)} GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Used:</span>
                    <span>{(status.system.usedMemory / 1024).toFixed(1)} GB</span>
                  </div>
                </div>
              </>
            ) : (
              <LoadingSpinner label="Loading status..." />
            )}
          </section>

          {/* Network Card */}
          <section className="bg-gray-800 rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-3">📶 Network</h2>
            {status?.network ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span>⬇️ Download:</span>
                  <span className="font-mono text-green-400">
                    {(status.network.downloadSpeed * 1024).toFixed(0)} bytes/s
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span>⬆️ Upload:</span>
                  <span className="font-mono text-blue-400">
                    {(status.network.uploadSpeed * 1024).toFixed(0)} bytes/s
                  </span>
                </div>
              </>
            ) : (
              <LoadingSpinner label="Waiting for status..." />
            )}
          </section>

          {/* P2P Card */}
          <section className="bg-gray-800 rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-3">🔗 P2P Network</h2>
            {status?.p2p ? (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-400">Connections:</span>{' '}
                    <span className="font-mono">{status.p2p.connections}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Peers:</span>{' '}
                    <span className="font-mono">{status.p2p.peers}</span>
                  </div>
                </div>
              </>
            ) : (
              <LoadingSpinner label="" />
            )}
          </section>
        </div>

        {/* Middle Column - Transfers */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Transfer Stats Summary */}
          <section className="bg-gray-800 rounded-lg shadow p-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">📊 Transfers</h2>
            {status && (
              <div className="space-x-4 text-sm">
                <span className="font-mono">Downloads: {status.p2p.connections}</span>
                <span>•</span>
                <span className="font-mono text-gray-500">Uploads: 0</span>
              </div>
            )}
          </section>

          {/* Transfer List (Placeholder - will be populated from transfers API) */}
          <section className="bg-gray-800 rounded-lg shadow overflow-hidden">
            {status?.transfers?.length ? (
              <ul className="divide-y divide-gray-700">
                {status.transfers.map((transfer, idx) => (
                  <li key={transfer.hash} className="p-4 hover:bg-gray-750 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusBadge status={transfer.status} />
                          <span className="text-yellow-400 text-xs">PRIORITY {transfer.priority}</span>
                        </div>
                        <p className="font-medium truncate">{transfer.filename || 'Unknown filename'}</p>
                        <p className="text-sm text-gray-400">
                          {(transfer.size / 1024 / 1024).toFixed(1)} MB {transfer.isDownloading ? '↓' : '↑'} 
                        </p>
                      </div>
                      
                      <div className="ml-4 flex items-center gap-3 w-48">
                        <span className="font-mono text-sm font-semibold">
                          {(transfer.speed / 1024).toFixed(1)} KB/s
                        </span>
                      </div>

                      {/* Progress Bar - visual only for now */}
                      <div className="flex items-center gap-2 w-48 ml-4">
                        <div className="flex-1 h-2 bg-gray-600 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500" 
                            style={{ width: `${(transfer.downloaded / transfer.size) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              // No transfers yet - show loading/empty state
              <div className="p-8 text-center text-gray-400">
                No active transfers detected. Starting downloads will populate this list.
              </div>
            )}
          </section>
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-blue-600 p-4 text-center text-sm text-blue-100">
        aMule Modern UI v0.1.0 • Built with React + TailwindCSS • Connected to API server
      </footer>
    </div>
  )
}

// ============================================
// SUB-COMPONENTS
// ============================================

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const colors = {
    queued: 'bg-yellow-100 text-yellow-800',
    downloading: 'bg-green-100 text-green-800',
    paused: 'bg-gray-100 text-gray-800',
    complete: 'bg-blue-100 text-blue-800',
    error: 'bg-red-100 text-red-800',
  }
  
  return (
    <span className={`${colors[status] || colors.queued} px-2 py-1 rounded-full text-xs font-medium`}>
      {label || status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}
