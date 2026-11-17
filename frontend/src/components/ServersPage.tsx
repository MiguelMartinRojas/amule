import { useCallback, useEffect, useState, type FormEvent } from 'react';

interface Server {
  ip: string;
  port: number;
  name: string;
  ping: number;
  users: number;
  usersMax: number;
  files: number;
  failed: number;
}

interface ServerSnapshot {
  connected: boolean;
  connecting: boolean;
  kadConnected: boolean;
  kadRunning: boolean;
  currentServer: Server | null;
  servers: Server[];
}

async function postJson(url: string, body?: object): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload: { error?: string } = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || `Request failed (${response.status})`);
  }
}

export function ServersPage() {
  const [snapshot, setSnapshot] = useState<ServerSnapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [port, setPort] = useState('4661');
  const [name, setName] = useState('');

  const refreshServers = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch('/api/servers', { signal });
    const payload: ServerSnapshot & { error?: string } = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || `Could not load servers (${response.status})`);
    }
    if (!Array.isArray(payload.servers)) {
      throw new Error('The server API returned an invalid response.');
    }
    setSnapshot(payload);
    setLoadError(null);
  }, []);

  useEffect(() => {
    let active = true;
    let timeout: ReturnType<typeof setTimeout>;
    const controller = new AbortController();

    const poll = async () => {
      try {
        await refreshServers(controller.signal);
      } catch (error) {
        if (active) {
          setLoadError(error instanceof Error ? error.message : 'Could not load servers.');
        }
      }
      if (active) {
        timeout = setTimeout(poll, 5000);
      }
    };

    void poll();
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [refreshServers]);

  const runAction = async (id: string, action: () => Promise<void>) => {
    setPendingAction(id);
    setActionError(null);
    try {
      await action();
      await refreshServers();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Server action failed.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleAddServer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runAction('add', async () => {
      await postJson('/api/servers', {
        address: address.trim(),
        port: Number(port),
        name: name.trim(),
      });
      setAddress('');
      setName('');
    });
  };

  const isConnected = snapshot?.connected ?? false;
  const isConnecting = snapshot?.connecting ?? false;
  const error = actionError || loadError;

  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Servers</h1>
        <p className="text-gray-400">Manage your eD2k server connection and server list.</p>
      </header>

      {error && (
        <p className="mb-6 rounded-lg border border-amber-700 bg-amber-950 p-4 text-amber-200" role="alert">
          {error}
        </p>
      )}

      <section className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">eD2k network</h2>
              <p className="mt-1 text-sm text-gray-400">
                {isConnected
                  ? `Connected to ${snapshot?.currentServer?.name || 'server'}`
                  : isConnecting
                    ? 'Connecting to a server…'
                    : 'Not connected'}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-sm ${
                isConnected
                  ? 'bg-green-950 text-green-300'
                  : isConnecting
                    ? 'bg-amber-950 text-amber-300'
                    : 'bg-gray-700 text-gray-300'
              }`}
            >
              {isConnected ? 'Connected' : isConnecting ? 'Connecting' : 'Offline'}
            </span>
          </div>
          {snapshot?.currentServer && isConnected && (
            <p className="mb-5 font-mono text-sm text-gray-300">
              {snapshot.currentServer.ip}:{snapshot.currentServer.port}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60"
              disabled={pendingAction !== null || isConnected}
              onClick={() => void runAction('connect-any', () => postJson('/api/servers/connect', {}))}
              type="button"
            >
              {pendingAction === 'connect-any' ? 'Connecting…' : 'Connect to any server'}
            </button>
            <button
              className="rounded-lg border border-gray-600 px-4 py-2 font-semibold text-gray-200 hover:bg-gray-700 disabled:opacity-50"
              disabled={pendingAction !== null || (!isConnected && !isConnecting)}
              onClick={() => void runAction('disconnect', () => postJson('/api/servers/disconnect'))}
              type="button"
            >
              {pendingAction === 'disconnect' ? 'Disconnecting…' : 'Disconnect'}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-gray-700 bg-gray-800 p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Kad network</h2>
              <p className="mt-1 text-sm text-gray-400">
                {snapshot?.kadConnected
                  ? 'Connected to Kad'
                  : snapshot?.kadRunning
                    ? 'Kad is running, but not connected'
                    : 'Kad is not running'}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-sm ${
                snapshot?.kadConnected
                  ? 'bg-green-950 text-green-300'
                  : 'bg-gray-700 text-gray-300'
              }`}
            >
              {snapshot?.kadConnected ? 'Connected' : snapshot?.kadRunning ? 'Starting' : 'Offline'}
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60"
              disabled={pendingAction !== null || snapshot?.kadRunning === true}
              onClick={() =>
                void runAction('kad-start', () => postJson('/api/networks/kad/start'))
              }
              type="button"
            >
              {pendingAction === 'kad-start' ? 'Starting…' : 'Start Kad'}
            </button>
            <button
              className="rounded-lg border border-gray-600 px-4 py-2 font-semibold text-gray-200 hover:bg-gray-700 disabled:opacity-50"
              disabled={pendingAction !== null || snapshot?.kadRunning !== true}
              onClick={() =>
                void runAction('kad-stop', () => postJson('/api/networks/kad/stop'))
              }
              type="button"
            >
              {pendingAction === 'kad-stop' ? 'Stopping…' : 'Stop Kad'}
            </button>
          </div>
        </div>
      </section>

      <section className="mb-8 rounded-xl border border-gray-700 bg-gray-800 p-6">
        <h2 className="mb-5 text-xl font-semibold">Add a server</h2>
        <form className="grid grid-cols-1 items-end gap-4 md:grid-cols-4" onSubmit={handleAddServer}>
          <label>
            <span className="mb-2 block text-sm text-gray-300">Address</span>
            <input
              autoComplete="off"
              className="w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-3 text-white"
              onChange={(event) => setAddress(event.target.value)}
              placeholder="server.example.org"
              required
              value={address}
            />
          </label>
          <label>
            <span className="mb-2 block text-sm text-gray-300">Port</span>
            <input
              className="w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-3 text-white"
              max="65535"
              min="1"
              onChange={(event) => setPort(event.target.value)}
              required
              type="number"
              value={port}
            />
          </label>
          <label>
            <span className="mb-2 block text-sm text-gray-300">Name (optional)</span>
            <input
              className="w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-3 text-white"
              onChange={(event) => setName(event.target.value)}
              placeholder="Server name"
              value={name}
            />
          </label>
          <button
            className="rounded-lg bg-gray-700 px-5 py-3 font-semibold text-white hover:bg-gray-600 disabled:cursor-wait disabled:opacity-60"
            disabled={pendingAction !== null}
            type="submit"
          >
            {pendingAction === 'add' ? 'Adding…' : 'Add server'}
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-700 p-6">
          <div>
            <h2 className="text-xl font-semibold">Server list</h2>
            <p className="mt-1 text-sm text-gray-400">
              {snapshot ? `${snapshot.servers.length} servers` : 'Loading servers…'}
            </p>
          </div>
          <button
            className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 disabled:opacity-60"
            disabled={pendingAction !== null}
            onClick={() => {
              setLoadError(null);
              void refreshServers().catch((refreshError: unknown) => {
                setLoadError(
                  refreshError instanceof Error ? refreshError.message : 'Could not load servers.',
                );
              });
            }}
            type="button"
          >
            Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-900/60 text-gray-400">
              <tr>
                <th className="px-5 py-3 font-medium">Server</th>
                <th className="px-5 py-3 font-medium">Address</th>
                <th className="px-5 py-3 font-medium">Users</th>
                <th className="px-5 py-3 font-medium">Files</th>
                <th className="px-5 py-3 font-medium">Ping</th>
                <th className="px-5 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {snapshot?.servers.length ? (
                snapshot.servers.map((server) => {
                  const key = `${server.ip}:${server.port}`;
                  const isCurrent =
                    snapshot.connected &&
                    snapshot.currentServer?.ip === server.ip &&
                    snapshot.currentServer.port === server.port;
                  return (
                    <tr className="border-t border-gray-700" key={key}>
                      <td className="px-5 py-4 font-medium text-white">
                        {server.name}
                        {isCurrent && (
                          <span className="ml-2 rounded-full bg-green-950 px-2 py-1 text-xs text-green-300">
                            Connected
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono text-gray-300">{key}</td>
                      <td className="px-5 py-4 text-gray-300">
                        {server.usersMax ? `${server.users.toLocaleString()} / ${server.usersMax.toLocaleString()}` : server.users.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-gray-300">{server.files.toLocaleString()}</td>
                      <td className="px-5 py-4 text-gray-300">{server.ping ? `${server.ping} ms` : '—'}</td>
                      <td className="px-5 py-4">
                        <button
                          className="rounded-lg bg-blue-600 px-3 py-2 font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                          disabled={pendingAction !== null || isCurrent}
                          onClick={() =>
                            void runAction(key, () =>
                              postJson('/api/servers/connect', {
                                address: server.ip,
                                port: server.port,
                              }),
                            )
                          }
                          type="button"
                        >
                          {pendingAction === key ? 'Connecting…' : 'Connect'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-6 py-10 text-center text-gray-500" colSpan={6}>
                    {snapshot
                      ? 'No servers in the aMule server list.'
                      : loadError
                        ? 'Server list unavailable.'
                        : 'Loading server list…'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
