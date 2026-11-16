import { type JSX } from 'react';
import { useApiClient, LoadingSpinner, StatusBadge } from '../lib/api-client';

export function Dashboard(): JSX.Element {
  const { status } = useApiClient();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-blue-600 p-4 shadow-lg">
        <h1 className="text-3xl font-bold">aMule Modern Dashboard</h1>
        <p className="text-blue-100 text-sm mt-1">Real-time stats and transfer management</p>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid md:grid-cols-3 gap-6">
        {/* Memory Card */}
        <section className="bg-gray-800 rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-3">Memory Usage</h2>
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
              </div>
            </>
          ) : (
            <LoadingSpinner label="Loading status..." />
          )}
        </section>

        {/* Network Card */}
        <section className="bg-gray-800 rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-3">Network</h2>
          {status?.network ? (
            <>
              <div className="flex items-center justify-between text-sm">
                <span>Download:</span>
                <span>{(status.network.downloadSpeed * 1024).toFixed(0)} bytes/s</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span>Upload:</span>
                <span>{(status.network.uploadSpeed * 1024).toFixed(0)} bytes/s</span>
              </div>
            </>
          ) : (
            <LoadingSpinner label="" />
          )}
        </section>

        {/* Transfers List */}
        <section className="bg-gray-800 rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-3">Transfers</h2>
          {status?.transfers?.length ? (
            <ul className="divide-y divide-gray-700 text-sm">
              {status.transfers.map((transfer, idx) => (
                <li key={transfer.hash} className="p-3 hover:bg-gray-750 rounded">
                  <div className="flex justify-between items-center mb-1">
                    <span className="truncate">{transfer.filename || 'Unknown'}</span>
                    <StatusBadge status={transfer.status} />
                  </div>
                  <p className="text-xs text-gray-400">{(transfer.size / 1024).toFixed(1)} KB</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No active transfers detected</p>
          )}
        </section>
      </main>

      <footer className="bg-blue-600 p-4 text-center text-sm text-blue-100">
        aMule Modern UI v0.1.0 - Built with React + TailwindCSS
      </footer>
    </div>
  );
}
