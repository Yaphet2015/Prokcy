import type { RequestTimings } from '../../../../shared/context/NetworkContext';
import type { TabProps } from './types';
import { formatBytes, formatTime, getStatusColorClass } from './utils';

export function TimelineTab({ request }: TabProps): React.JSX.Element {
  const timings: RequestTimings = request?.timings ?? {
    dns: 0,
    tcp: 0,
    tls: 0,
    ttfb: 0,
    download: 0,
    total: 0,
  };
  const total = timings.total ?? 0;

  const phases = [
    { key: 'dns', label: 'DNS Lookup', color: '#3b82f6' },
    { key: 'tcp', label: 'TCP Connection', color: '#14b8a6' },
    { key: 'tls', label: 'TLS Handshake', color: '#22c55e' },
    { key: 'ttfb', label: 'Waiting (TTFB)', color: '#a855f7' },
    { key: 'download', label: 'Content Download', color: '#f97316' },
  ].filter(p => (timings[p.key as keyof RequestTimings] ?? 0) > 0);

  return (
    <div className="p-4 pb-8 h-full overflow-y-auto scrollbar-hide">
      <div className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-zinc-100 dark:bg-zinc-900/50 rounded-lg p-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Total Time</p>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{formatTime(total)}</p>
          </div>
          <div className="bg-zinc-100 dark:bg-zinc-900/50 rounded-lg p-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Size</p>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{formatBytes(request?.size ?? 0)}</p>
          </div>
          <div className="bg-zinc-100 dark:bg-zinc-900/50 rounded-lg p-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Status</p>
            <p className={`text-lg font-semibold ${getStatusColorClass(request?.status)}`}>
              {request?.status ?? 0}
            </p>
          </div>
        </div>

        {/* Timeline Visualization */}
        <div className="bg-zinc-100 dark:bg-zinc-900/50 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
            Timing Breakdown
          </h3>
          <div className="space-y-3">
            {phases.map((phase) => {
              const duration = timings[phase.key as keyof RequestTimings] ?? 0;
              const percent = total > 0 ? (duration / total) * 100 : 0;

              return (
                <div key={phase.key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-900 dark:text-zinc-100">{phase.label}</span>
                    <span className="text-zinc-500 dark:text-zinc-400">{formatTime(duration)}</span>
                  </div>
                  <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: phase.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Raw Timings */}
        <div className="bg-zinc-100 dark:bg-zinc-900/50 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
            Raw Timings
          </h3>
          <div className="space-y-2">
            {phases.map((phase) => (
              <div key={phase.key} className="flex justify-between text-xs">
                <span className="text-zinc-500 dark:text-zinc-400">{phase.label}</span>
                <span className="font-mono text-zinc-900 dark:text-zinc-100">{formatTime(timings[phase.key as keyof RequestTimings] ?? 0)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
