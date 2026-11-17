import { useEffect, useState, type FormEvent } from 'react';

type SearchNetwork = 'local' | 'global' | 'kad';

interface SearchResult {
  id: string;
  name: string;
  sizeBytes: string;
  type: string;
  sources: number;
}

function formatSize(sizeBytes: string): string {
  const size = Number(sizeBytes);
  if (!Number.isFinite(size) || size < 0) {
    return '—';
  }
  if (size < 1024) {
    return `${size} B`;
  }
  const units = ['KiB', 'MiB', 'GiB', 'TiB'];
  let value = size / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [network, setNetwork] = useState<SearchNetwork>('kad');
  const [fileType, setFileType] = useState('');
  const [extension, setExtension] = useState('');
  const [availability, setAvailability] = useState('0');
  const [minSize, setMinSize] = useState('');
  const [maxSize, setMaxSize] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    if (!isSearching) {
      return;
    }

    let active = true;
    let timeout: ReturnType<typeof setTimeout>;
    const pollResults = async () => {
      try {
        const response = await fetch('/api/search/results');
        const payload: { error?: string; progress: number | null; results: SearchResult[] } =
          await response.json();
        if (!response.ok) {
          throw new Error(payload.error || `Could not get search results (${response.status})`);
        }
        if (!Array.isArray(payload.results)) {
          throw new Error('The search API returned an invalid results payload.');
        }
        if (!active) {
          return;
        }

        setResults(payload.results);
        setProgress(payload.progress);
        if (payload.progress === 100) {
          setIsSearching(false);
        } else {
          timeout = setTimeout(pollResults, 2000);
        }
      } catch (requestError) {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'Unknown search error');
          setIsSearching(false);
        }
      }
    };

    timeout = setTimeout(pollResults, 1000);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [isSearching]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setHasSearched(true);
    setResults([]);
    setProgress(null);

    if (!query.trim()) {
      setError('Enter a search term.');
      return;
    }

    const minSizeMiB = Number(minSize);
    const maxSizeMiB = Number(maxSize);
    if (minSize && maxSize && maxSizeMiB < minSizeMiB) {
      setError('Maximum size must be greater than or equal to minimum size.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          network,
          fileType: fileType || undefined,
          extension: extension.trim() || undefined,
          availability: Number(availability),
          minSize: minSize ? minSizeMiB * 1024 * 1024 : undefined,
          maxSize: maxSize ? maxSizeMiB * 1024 * 1024 : undefined,
        }),
      });
      const result: { error?: string; message?: string } = await response.json();
      if (!response.ok) {
        throw new Error(result.error || `Search failed (${response.status})`);
      }
      setProgress(0);
      setIsSearching(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unknown search error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStop = async () => {
    setIsStopping(true);
    setError(null);
    try {
      const response = await fetch('/api/search/stop', { method: 'POST' });
      const result: { error?: string } = await response.json();
      if (!response.ok) {
        throw new Error(result.error || `Could not stop search (${response.status})`);
      }
      setIsSearching(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unknown search error');
    } finally {
      setIsStopping(false);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Search files</h1>
        <p className="text-gray-400">Search the aMule networks and filter matching files.</p>
      </header>

      <form onSubmit={handleSubmit} className="mb-8 rounded-xl border border-gray-700 bg-gray-800 p-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <label className="md:col-span-2">
            <span className="mb-2 block text-sm text-gray-300">Search terms</span>
            <input
              autoComplete="off"
              className="w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-3 text-white"
              maxLength={256}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="What are you looking for?"
              required
              value={query}
            />
          </label>

          <label>
            <span className="mb-2 block text-sm text-gray-300">Network</span>
            <select
              className="w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-3 text-white"
              onChange={(event) => {
                const value = event.target.value;
                if (value === 'local' || value === 'global' || value === 'kad') {
                  setNetwork(value);
                }
              }}
              value={network}
            >
              <option value="kad">Kad</option>
              <option value="global">Global (ED2K)</option>
              <option value="local">Local</option>
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm text-gray-300">File type</span>
            <select
              className="w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-3 text-white"
              onChange={(event) => setFileType(event.target.value)}
              value={fileType}
            >
              <option value="">Any type</option>
              <option value="Audio">Audio</option>
              <option value="Video">Video</option>
              <option value="Image">Image</option>
              <option value="Doc">Document</option>
              <option value="Pro">Program</option>
              <option value="Arc">Archive</option>
              <option value="Iso">CD image</option>
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm text-gray-300">Extension (optional)</span>
            <input
              className="w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-3 text-white"
              onChange={(event) => setExtension(event.target.value)}
              placeholder="e.g. mp3"
              value={extension}
            />
          </label>

          <label>
            <span className="mb-2 block text-sm text-gray-300">Minimum sources</span>
            <input
              className="w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-3 text-white"
              min="0"
              onChange={(event) => setAvailability(event.target.value)}
              type="number"
              value={availability}
            />
          </label>

          <label>
            <span className="mb-2 block text-sm text-gray-300">Minimum size (MiB)</span>
            <input
              className="w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-3 text-white"
              min="0"
              onChange={(event) => setMinSize(event.target.value)}
              type="number"
              value={minSize}
            />
          </label>

          <label>
            <span className="mb-2 block text-sm text-gray-300">Maximum size (MiB)</span>
            <input
              className="w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-3 text-white"
              min="0"
              onChange={(event) => setMaxSize(event.target.value)}
              type="number"
              value={maxSize}
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button
            className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60"
            disabled={isSubmitting || isSearching}
            type="submit"
          >
            {isSubmitting ? 'Starting…' : isSearching ? 'Searching…' : 'Search'}
          </button>
          {isSearching && (
            <button
              className="rounded-lg border border-gray-600 px-5 py-3 font-semibold text-gray-200 disabled:opacity-60"
              disabled={isStopping}
              onClick={() => void handleStop()}
              type="button"
            >
              {isStopping ? 'Stopping…' : 'Stop search'}
            </button>
          )}
          <p aria-live="polite" className="text-sm text-gray-400">
            {isSearching
              ? `Searching${progress !== null ? ` — ${progress}%` : '…'}`
              : 'Search results will appear below.'}
          </p>
        </div>

        {error && (
          <p className="mt-5 rounded-lg border border-amber-700 bg-amber-950 p-4 text-amber-200" role="alert">
            {error}
          </p>
        )}
      </form>

      <section className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
        <div className="border-b border-gray-700 p-6">
          <h2 className="text-xl font-semibold">Results</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-900/60 text-gray-400">
              <tr>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Size</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Sources</th>
              </tr>
            </thead>
            <tbody>
              {results.length ? (
                results.map((result) => (
                  <tr className="border-t border-gray-700" key={result.id}>
                    <td className="px-6 py-4 text-white">{result.name}</td>
                    <td className="px-6 py-4 text-gray-300">{formatSize(result.sizeBytes)}</td>
                    <td className="px-6 py-4 text-gray-300">{result.type}</td>
                    <td className="px-6 py-4 text-gray-300">{result.sources}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-6 py-10 text-center text-gray-500" colSpan={4}>
                    {hasSearched && !isSearching && !error
                      ? 'No results found.'
                      : 'Enter a search term to find files.'}
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
