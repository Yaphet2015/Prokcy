import { useNetwork } from '../../shared/context/NetworkContext';
import WaterfallTimeline from './WaterfallTimeline';
import RequestInspector from './RequestInspector';

export default function Network(): React.JSX.Element {
  const { isConnected, isStreaming } = useNetwork();

  return (
    <div className="h-full w-full flex flex-col bg-white dark:bg-zinc-950">
      {/* Waterfall Timeline (60%) */}
      <WaterfallTimeline />

      {/* Request Inspector (40%) */}
      <RequestInspector />
    </div>
  );
}
