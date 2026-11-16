// Dashboard component for aMule Modern UI - Main UI display
import { useState } from 'react';

export function Dashboard() {
  const [memoryUsage, setMemoryUsage] = useState(0);
  
  // Mock values - these will be replaced with real API data
  const totalMem = 8 * 1024 * 1024 * 1024; // 8 GB example
  const freeMem = 3 * 1024 * 1024 * 1024; // 3 GB example
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">aMule Modern Interface</h1>
        <p className="text-gray-400">Modern P2P file sharing dashboard</p>
      </header>

      {/* Main stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Memory card */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Memory Usage</h2>
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>{(totalMem - freeMem) / 1024 / 1024 / 1024} GB used</span>
              <span>{freeMem / 1024 / 1024 / 1024} GB free</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div className="bg-blue-500 h-3 rounded-full" style={{ width: '60%', transition: 'width 0.5s ease-in-out' }} />
            </div>
          </div>
        </div>

        {/* Network card */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Network Activity</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Download Speed</span>
              <span className="font-mono text-lg">0 KB/s</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Upload Speed</span>
              <span className="font-mono text-lg">0 KB/s</span>
            </div>
          </div>
        </div>

        {/* P2P Connections card */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">P2P Connections</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Active Connections</span>
              <span className="font-mono text-lg">0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Peers</span>
              <span className="font-mono text-lg">0</span>
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
          No active transfers
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-sm text-gray-500 pb-8">
        <p>Powered by aMule Modern UI v1.0</p>
      </footer>
    </div>
  );
}
