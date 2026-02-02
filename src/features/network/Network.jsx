import { useNetwork } from '../../shared/context';
import WaterfallTimeline from './WaterfallTimeline';
import RequestInspector from './RequestInspector';

export default function Network() {
  const { isConnected, isStreaming } = useNetwork();

  return (
    <div className="h-full flex flex-col bg-tahoe-bg">
      {/* Connection Status Bar */}
      <div className="h-8 flex items-center justify-between px-4 border-b border-tahoe-border/50 shrink-0">
        <div className="flex items-center gap-2">
          <div className={`
            w-2 h-2 rounded-full
            ${isConnected && isStreaming ? 'bg-green-500 animate-pulse' : 'bg-red-500'}
          `} />
          <span className="text-xs text-tahoe-subtle">
            {isConnected
              ? isStreaming
                ? 'Connected'
                : 'Connected - Reconnecting...'
              : 'Disconnected'
            }
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
