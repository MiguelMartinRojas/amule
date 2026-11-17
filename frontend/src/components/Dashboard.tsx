import { useApiClient, useApiError } from '../lib/api-client';

const formatMemory = (megabytes: number) => `${(megabytes / 1024).toFixed(1)} GB`;

export function Dashboard() {
  const status = useApiClient();
  const apiError = useApiError();
  const totalMemory = status?.system.totalMemory;
  const freeMemory = status?.system.freeMemory;
  const usedMemory =
    totalMemory !== undefined && freeMemory !== undefined
      ? Math.max(0, totalMemory - freeMemory)
      : undefined;
  const memoryUsage =
    totalMemory && usedMemory !== undefined
      ? Math.min(100, (usedMemory / totalMemory) * 100)
      : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">aMule Modern Interface</h1>
        <p className="text-gray-400">Modern P2P file sharing dashboard</p>
      </header>

      {apiError ? (
        <p role="alert" className="mb-6 rounded-lg border border-red-800 bg-red-950 p-4 text-red-200">
          API unavailable: {apiError}
        </p>
      ) : !status ? (
        <p role="status" className="mb-6 text-center text-gray-400">
          Connecting to API…
        </p>
      ) : null}

      {/* Main stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Memory card */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Memory Usage</h2>
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>{usedMemory !== undefined ? `${formatMemory(usedMemory)} used` : '—'}</span>
              <span>{freeMemory !== undefined ? `${formatMemory(freeMemory)} free` : '—'}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${memoryUsage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Network card */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Network Activity</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Download Speed</span>
              <span className="font-mono text-lg">
                {status ? `${status.network.downloadSpeed} KB/s` : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Upload Speed</span>
              <span className="font-mono text-lg">
                {status ? `${status.network.uploadSpeed} KB/s` : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* P2P Connections card */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">P2P Connections</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Active Connections</span>
              <span className="font-mono text-lg">{status?.p2p.connections ?? '—'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Peers</span>
              <span className="font-mono text-lg">{status?.p2p.peers ?? '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transfers section */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 mb-8">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold">Active Transfers</h2>
        </div>
        <div className="p-4 text-center text-gray-500 py-8">
          Transfer list is not available from the API yet
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-sm text-gray-500 pb-8">
        <p>Powered by aMule Modern UI v1.0</p>
      </footer>
    </div>
  );
}
