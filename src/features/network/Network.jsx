import { useNetwork } from '../../shared/context/NetworkContext';
import WaterfallTimeline from './WaterfallTimeline';
import RequestInspector from './RequestInspector';

export default function Network() {
  const { isConnected, isStreaming } = useNetwork();

  return (
    <div className="h-full flex flex-col bg-white dark:bg-zinc-950">
      {/* Connection Status Bar */}
      <div className="h-8 flex items-center justify-between px-4 border-b border-zinc-200/50 dark:border-zinc-800/50 shrink-0">
        <div className="flex items-center gap-2">
          <div className={`
            w-2 h-2 rounded-full
            ${isConnected && isStreaming ? 'bg-green-500 animate-pulse' : 'bg-red-500'}
          `}
          />
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {isConnected
              ? isStreaming
                ? 'Connected'
                : 'Connected - Reconnecting...'
              : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Waterfall Timeline (60%) */}
      <WaterfallTimeline />

      {/* Request Inspector (40%) */}
      <RequestInspector />
    </div>
  );
}
