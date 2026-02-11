import {
  useMemo, useState, useCallback, memo,
} from 'react';
import { Button, Input } from '@pikoloo/darwin-ui';
import { useNetwork } from '../../shared/context/NetworkContext';
import { getRequestStyles } from '../../shared/utils/styleParser';
import { createDebouncedHoverState } from './utils/debouncedHoverState.mjs';
import { VirtualList } from '../../shared/ui/VirtualList';

// Timing phase colors according to design spec
const TIMING_COLORS = {
  dns: '#3b82f6', // blue
  tcp: '#14b8a6', // teal
  tls: '#22c55e', // green
  ttfb: '#a855f7', // purple
  download: '#f97316', // orange
};

// Approximate row height for viewport calculations
const ROW_HEIGHT = 42;

// Minimum percentage width for a request bar to be visible
const MIN_BAR_WIDTH_PERCENT = 2;

// Compression factor for idle gaps (higher = more compression)
const GAP_COMPRESSION_FACTOR = 0.15;
const HOVER_DEBOUNCE_MS = 500;

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
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    DELETE: 'DELETE',
    PATCH: 'PATCH',
    HEAD: 'HEAD',
    OPTIONS: 'OPTIONS',
  };
  return icons[method] || '';
}

/**
 * Compress a gap using logarithmic scaling
 * Small gaps are compressed less than large gaps
 */
function compressGap(gap, compressionFactor = GAP_COMPRESSION_FACTOR) {
  if (gap <= 0) return 0;
  // Logarithmic compression: log(1 + gap) * factor
  return Math.log(1 + gap) * compressionFactor * 100;
}

/**
 * Calculate compressed timeline for visible requests
 * Returns the position and scale for each request
 */
function calculateCompressedTimeline(requests) {
  if (requests.length === 0) {
    return { compressedDuration: 1000, requestPositions: [] };
  }

  // Sort requests by start time
  const sorted = [...requests].sort((a, b) => a.sortTime - b.sortTime);

  const positions = [];
  let compressedPosition = 0;
  let lastEndTime = null;

  for (const request of sorted) {
    const startTime = request.sortTime;
    const duration = request.timings?.total || 0;
    const endTime = startTime + duration;

    // Calculate gap from previous request
    if (lastEndTime !== null && startTime > lastEndTime) {
      const gap = startTime - lastEndTime;
      compressedPosition += compressGap(gap);
    }

    positions.push({
      request,
      compressedPosition,
      duration,
    });

    compressedPosition += duration;
    lastEndTime = endTime;
  }

  const compressedDuration = compressedPosition > 0 ? compressedPosition : 1000;

  return { compressedDuration, requestPositions: positions };
}

/**
 * Waterfall bar component with compressed timeline
 * Memoized to prevent unnecessary re-renders (rerender-memo)
 */
const WaterfallBar = memo(({
  request, compressedPosition, duration, compressedDuration, isHovered, onHoverStart, onHoverEnd, requestId,
}) => {
  const phases = getRequestPhases(request);

  // Calculate position and width as percentages
  // When hovered, expand to full width; otherwise use compressed positioning
  const leftPercent = isHovered ? 0 : (compressedPosition / compressedDuration) * 100;
  const widthPercent = isHovered ? 100 : Math.max((duration / compressedDuration) * 100, MIN_BAR_WIDTH_PERCENT / compressedDuration * 100);

  return (
    <div
      className={`w-48 h-5 bg-zinc-100 dark:bg-zinc-900/50 rounded overflow-hidden relative ${isHovered ? 'z-10' : ''}`}
      data-request-id={requestId}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
    >
      <div
        className="absolute inset-y-0 flex"
        style={{
          left: `${leftPercent}%`,
          width: `${Math.max(widthPercent, 0.5)}%`,
          transition: 'left 200ms ease-out, width 200ms ease-out',
        }}
      >
        {phases.map((phase, idx) => {
          const phaseOffsetPercent = (phase.offset / duration) * 100;
          const phaseWidthPercent = (phase.duration / duration) * 100;

          return (
            <div
              key={idx}
              className="h-full first:rounded-l last:rounded-r relative flex items-center justify-center overflow-hidden"
              style={{
                backgroundColor: phase.color,
                width: `${phaseWidthPercent}%`,
                marginLeft: idx > 0 ? undefined : `${phaseOffsetPercent}%`,
                minWidth: isHovered ? '30px' : undefined,
              }}
              title={`${phase.type}: ${formatTime(phase.duration)}`}
            >
              {isHovered && (
                <div className="flex flex-col items-center justify-center text-[9px] font-medium text-white">
                  <span className="uppercase leading-tight">{phase.type}</span>
                  <span className="leading-tight opacity-90">{formatTime(phase.duration)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default function WaterfallTimeline() {
  const {
    requests, selectedRequest, selectRequest, searchQuery, setSearchQuery, clearRequests,
  } = useNetwork();

  const [hoveredRequestId, setHoveredRequestId] = useState(null);
  const debouncedHoverState = useMemo(
    () => createDebouncedHoverState(setHoveredRequestId, HOVER_DEBOUNCE_MS),
    [],
  );

  // Filter requests by search query (js-index-maps: build Map for repeated lookups)
  const filteredRequests = useMemo(() => {
    if (!searchQuery) return requests;
    const query = searchQuery.toLowerCase();
    return requests.filter((req) => req.url?.toLowerCase().includes(query)
      || req.method?.toLowerCase().includes(query)
      || req.status?.toString().includes(query));
  }, [requests, searchQuery]);

  // Calculate compressed timeline for all filtered requests
  // This is memoized and only recalculated when filtered requests change
  const timelineData = useMemo(() => {
    if (filteredRequests.length === 0) {
      return { compressedDuration: 1000, positionMap: new Map() };
    }
    const { compressedDuration, requestPositions } = calculateCompressedTimeline(filteredRequests);
    const positionMap = new Map();
    for (const pos of requestPositions) {
      positionMap.set(pos.request.id, pos);
    }
    return { compressedDuration, positionMap };
  }, [filteredRequests]);

  // Memoized hover handlers (rerender-defer-reads: stable callbacks)
  const handleHoverStart = useCallback((event) => {
    const { requestId } = event.currentTarget.dataset;
    debouncedHoverState.setNow(requestId);
  }, [debouncedHoverState]);

  const handleHoverEnd = useCallback(() => {
    debouncedHoverState.schedule(null);
  }, [debouncedHoverState]);

  // Render individual request row (called by VirtualList)
  const renderRequestRow = useCallback((request) => {
    const isSelected = selectedRequest?.id === request.id;
    const pos = timelineData.positionMap.get(request.id);

    return (
      <div
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
        style={getRequestStyles(request)}
      >
        {/* Method Indicator */}
        <span className="text-xs w-12 text-center text-zinc-500 dark:text-zinc-400" title={request.method}>
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
          <p className={`text-sm truncate ${isSelected
            ? 'text-blue-500' : 'text-zinc-900 dark:text-zinc-100'
          }`}
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

        {/* Waterfall Bar - with compressed idle gaps */}
        {pos ? (
          <WaterfallBar
            request={request}
            compressedPosition={pos.compressedPosition}
            duration={pos.duration}
            compressedDuration={timelineData.compressedDuration}
            isHovered={hoveredRequestId === request.id}
            onHoverStart={handleHoverStart}
            onHoverEnd={handleHoverEnd}
            requestId={request.id}
          />
        ) : (
          <div className="w-48 h-5 bg-zinc-100 dark:bg-zinc-900/50 rounded" />
        )}
      </div>
    );
  }, [selectedRequest, selectRequest, timelineData, hoveredRequestId, handleHoverStart, handleHoverEnd]);

  return (
    <div className="flex-1 w-full overflow-auto flex flex-col border-b border-zinc-200 dark:border-zinc-800">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-zinc-200/50 dark:border-zinc-800/50 shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Network Requests</h2>
          {/* <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {filteredRequests.length}
            {' '}
            {filteredRequests.length === 1 ? 'request' : 'requests'}
          </span> */}
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

      {/* Request List with Virtual Scrolling */}
      {filteredRequests.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {searchQuery ? 'No requests match your filter' : 'No network requests captured yet'}
          </p>
        </div>
      ) : (
        <VirtualList
          items={filteredRequests}
          itemHeight={ROW_HEIGHT}
          renderItem={renderRequestRow}
          itemKey="id"
          overscan={5}
          className="flex-1"
        />
      )}
    </div>
  );
}
