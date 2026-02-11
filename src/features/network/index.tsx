import { Button, Input } from '@pikoloo/darwin-ui';
import type { ChangeEvent } from 'react';
import { useNetwork } from '../../shared/context/NetworkContext';
import ContentHeader from '../../shared/ui/ContentHeader';
import WaterfallTimeline from './WaterfallTimeline';
import RequestInspector from './RequestInspector';

export default function Network(props: {
  isSidebarCollapsed: boolean;
}) {
  const { isSidebarCollapsed } = props;
  const {
    searchQuery, setSearchQuery, clearRequests, requests,
  } = useNetwork();

  return (
    <div className="h-full w-full flex flex-col bg-white dark:bg-zinc-950">
      {/* Header */}
      <ContentHeader
        viewName="network"
        isSidebarCollapsed={isSidebarCollapsed}
        rightActions={(
          <Button
            variant="ghost"
            size="sm"
            onClick={clearRequests}
            disabled={requests.length === 0}
          >
            Clear
          </Button>
        )}
        searchInput={(
          <Input
            placeholder="Filter requests..."
            value={searchQuery}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            size="sm"
            className="w-64"
          />
        )}
      />

      {/* Waterfall Timeline (60%) */}
      <WaterfallTimeline />

      {/* Request Inspector (40%) */}
      <RequestInspector />
    </div>
  );
}
