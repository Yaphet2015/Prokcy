import { useMemo } from 'react';
import { Button, Input } from '@pikoloo/darwin-ui';
import { useNetwork } from '../../shared/context/NetworkContext';

// Timing phase colors according to design spec
const TIMING_COLORS = {
  dns: '#3b82f6', // blue
  tcp: '#14b8a6', // teal
  tls: '#22c55e', // green
  ttfb: '#a855f7', // purple
  download: '#f97316', // orange
};

// Timing phases for a request bar
function getRequestPhases(request) {
  const timings = request.timings || {};
  const phases = [];
  let offset = 0;

  // DNS lookup
  if (timings.dns > 0) {
    phases.push({
      type: 'dns', duration: timings.dns, offset, color: TIMING_COLORS.dns,
    });
    offset += timings.dns;
  }

  // TCP connection
  if (timings.tcp > 0) {
    phases.push({
      type: 'tcp', duration: timings.tcp, offset, color: TIMING_COLORS.tcp,
    });
    offset += timings.tcp;
  }

  // TLS handshake
  if (timings.tls > 0) {
    phases.push({
      type: 'tls', duration: timings.tls, offset, color: TIMING_COLORS.tls,
    });
    offset += timings.tls;
  }

  // Time to First Byte (TTFB)
  if (timings.ttfb > 0) {
    phases.push({
      type: 'ttfb', duration: timings.ttfb, offset, color: TIMING_COLORS.ttfb,
    });
    offset += timings.ttfb;
  }

  // Download time
  if (timings.download > 0) {
    phases.push({
      type: 'download', duration: timings.download, offset, color: TIMING_COLORS.download,
    });
  }

  return phases;
}

// Format time in ms
function formatTime(ms) {
  if (!ms && ms !== 0) return '-';
  if (ms < 10) return `${ms.toFixed(1)}ms`;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// Get status color class
function getStatusColor(status) {
  if (status >= 200 && status < 300) return 'text-green-500';
  if (status >= 300 && status < 400) return 'text-blue-500';
  if (status >= 400 && status < 500) return 'text-orange-500';
  if (status >= 500) return 'text-red-500';
  return 'text-zinc-500 dark:text-zinc-400';
}

// Get method icon
function getMethodIcon(method) {
  const icons = {
    GET: '🟢',
    POST: '🟡',
    PUT: '🔵',
    DELETE: '🔴',
    PATCH: '🟠',
    HEAD: '⚪',
    OPTIONS: '⚪',
  };
  return icons[method] || '⚪';
}

export default function WaterfallTimeline() {
  const {
    requests, selectedRequest, selectRequest, searchQuery, setSearchQuery, clearRequests,
  } = useNetwork();

  // Filter requests by search query
  const filteredRequests = useMemo(() => {
    if (!searchQuery) return requests;
    const query = searchQuery.toLowerCase();
    return requests.filter((req) => req.url?.toLowerCase().includes(query)
      || req.method?.toLowerCase().includes(query)
      || req.status?.toString().includes(query));
  }, [requests, searchQuery]);

  // Calculate total duration for scaling
  const maxDuration = useMemo(() => Math.max(
    ...requests.map((req) => req.timings?.total || 0),
    1000, // minimum 1 second scale
  ), [requests]);

  return (
    <div className="flex-1 w-full overflow-auto flex flex-col border-b border-zinc-200 dark:border-zinc-800">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-zinc-200/50 dark:border-zinc-800/50 shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Network Requests</h2>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {filteredRequests.length}
            {' '}
            {filteredRequests.length === 1 ? 'request' : 'requests'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearRequests}
            disabled={requests.length === 0}
          >
            Clear
          </Button>
          <Input
            placeholder="Filter requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="sm"
            className="w-64"
          />
        </div>
      </div>

      {/* Timing Legend */}
      <div className="h-8 flex items-center gap-4 px-4 border-b border-zinc-200/30 dark:border-zinc-800/30 shrink-0">
        {Object.entries(TIMING_COLORS).map(([key, color]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase">{key}</span>
          </div>
        ))}
      </div>

      {/* Request List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {filteredRequests.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {searchQuery ? 'No requests match your filter' : 'No network requests captured yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200/30 dark:divide-zinc-800/30">
            {filteredRequests.map((request) => {
              const phases = getRequestPhases(request);
              const isSelected = selectedRequest?.id === request.id;

              return (
                <div
                  key={request.id}
                  onClick={() => selectRequest(request)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      selectRequest(request);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className={`
                    group flex items-center gap-3 px-4 py-2.5 cursor-pointer
                    transition-colors duration-150
                    ${isSelected ? 'bg-blue-500/10' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}
                  `}
                >
                  {/* Method Indicator */}
                  <span className="text-sm w-6 text-center" title={request.method}>
                    {getMethodIcon(request.method)}
                  </span>

                  {/* Status Code */}
                  <span
                    className={`text-xs font-mono w-12 ${getStatusColor(request.status)}`}
                  >
                    {request.status || '-'}
                  </span>

                  {/* URL */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm truncate ${isSelected ? 'text-blue-500' : 'text-zinc-900 dark:text-zinc-100'}`}
                    >
                      {request.url}
                    </p>
                  </div>

                  {/* Size */}
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 w-16 text-right tabular-nums">
                    {request.size ? `${(request.size / 1024).toFixed(1)}KB` : '-'}
                  </span>

                  {/* Timing */}
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 w-16 text-right tabular-nums">
                    {formatTime(request.timings?.total)}
                  </span>

                  {/* Waterfall Bar */}
                  <div className="w-48 h-5 bg-zinc-100 dark:bg-zinc-900/50 rounded overflow-hidden relative">
                    <div
                      className="absolute inset-y-0 left-0 flex"
                      style={{
                        width: `${Math.min(((request.timings?.total || 0) / maxDuration) * 100, 100)}%`,
                      }}
                    >
                      {phases.map((phase, idx) => (
                        <div
                          key={idx}
                          className="h-full first:rounded-l last:rounded-r"
                          style={{
                            backgroundColor: phase.color,
                            width: `${(phase.duration / (request.timings?.total || 1)) * 100}%`,
                            marginLeft: idx > 0 ? undefined : `${(phase.offset / maxDuration) * 100}%`,
                          }}
                          title={`${phase.type}: ${formatTime(phase.duration)}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
