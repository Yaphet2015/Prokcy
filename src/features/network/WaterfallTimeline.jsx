import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Button, Input } from '@pikoloo/darwin-ui';
import { useNetwork } from '../../shared/context/NetworkContext';
import { getRequestStyles } from '../../shared/utils/styleParser';

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
 */
function WaterfallBar({ request, compressedPosition, duration, compressedDuration, isHovered, onHoverStart, onHoverEnd }) {
  const phases = getRequestPhases(request);

  // Calculate position and width as percentages
  // When hovered, expand to full width; otherwise use compressed positioning
  const leftPercent = isHovered ? 0 : (compressedPosition / compressedDuration) * 100;
  const widthPercent = isHovered ? 100 : Math.max((duration / compressedDuration) * 100, MIN_BAR_WIDTH_PERCENT / compressedDuration * 100);

  return (
    <div className={`${isHovered ? 'w-96' : 'w-48'} h-5 bg-zinc-100 dark:bg-zinc-900/50 rounded overflow-hidden relative transition-all duration-200 ease-out`}
         onMouseEnter={onHoverStart}
         onMouseLeave={onHoverEnd}
    >
      <div
        className="absolute inset-y-0 flex"
        style={{
          left: `${leftPercent}%`,
          width: `${Math.max(widthPercent, 0.5)}%`,
        }}
      >
        {phases.map((phase, idx) => {
          const phaseOffsetPercent = (phase.offset / duration) * 100;
          const phaseWidthPercent = (phase.duration / duration) * 100;

          return (
            <div
              key={idx}
              className="h-full first:rounded-l last:rounded-r"
              style={{
                backgroundColor: phase.color,
                width: `${phaseWidthPercent}%`,
                marginLeft: idx > 0 ? undefined : `${phaseOffsetPercent}%`,
              }}
              title={`${phase.type}: ${formatTime(phase.duration)}`}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function WaterfallTimeline() {
  const {
    requests, selectedRequest, selectRequest, searchQuery, setSearchQuery, clearRequests,
  } = useNetwork();

  const listRef = useRef(null);
  const [timelineState, setTimelineState] = useState({
    compressedDuration: 1000,
    requestPositions: [],
  });
  const [hoveredRequestId, setHoveredRequestId] = useState(null);

  // Filter requests by search query
  const filteredRequests = useMemo(() => {
    if (!searchQuery) return requests;
    const query = searchQuery.toLowerCase();
    return requests.filter((req) => req.url?.toLowerCase().includes(query)
      || req.method?.toLowerCase().includes(query)
      || req.status?.toString().includes(query));
  }, [requests, searchQuery]);

  // Create a position map for quick lookup
  const positionMap = useMemo(() => {
    const map = new Map();
    for (const pos of timelineState.requestPositions) {
      map.set(pos.request.id, pos);
    }
    return map;
  }, [timelineState.requestPositions]);

  // Update compressed timeline based on visible requests
  const updateTimeline = useCallback(() => {
    if (!listRef.current || filteredRequests.length === 0) {
      return;
    }

    const container = listRef.current;
    const scrollTop = container.scrollTop;
    const viewHeight = container.clientHeight;

    const firstVisibleIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT));
    const lastVisibleIndex = Math.min(
      filteredRequests.length - 1,
      Math.ceil((scrollTop + viewHeight) / ROW_HEIGHT),
    );

    // Include some buffer before and after for smoother scrolling
    const buffer = 5;
    const startIndex = Math.max(0, firstVisibleIndex - buffer);
    const endIndex = Math.min(filteredRequests.length - 1, lastVisibleIndex + buffer);

    const visibleRequests = filteredRequests.slice(startIndex, endIndex + 1);

    if (visibleRequests.length === 0) {
      return;
    }

    const timeline = calculateCompressedTimeline(visibleRequests);
    setTimelineState(timeline);
  }, [filteredRequests]);

  // Update timeline on scroll
  useEffect(() => {
    const container = listRef.current;
    if (!container) {
      return undefined;
    }

    const handleScroll = () => {
      requestAnimationFrame(updateTimeline);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [updateTimeline]);

  // Update timeline when filtered requests change
  useEffect(() => {
    updateTimeline();
  }, [updateTimeline]);

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
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto overflow-x-hidden"
      >
        {filteredRequests.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {searchQuery ? 'No requests match your filter' : 'No network requests captured yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200/30 dark:divide-zinc-800/30">
            {filteredRequests.map((request) => {
              const isSelected = selectedRequest?.id === request.id;
              const pos = positionMap.get(request.id);

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
                      compressedDuration={timelineState.compressedDuration}
                    />
                  ) : (
                    <div className="w-48 h-5 bg-zinc-100 dark:bg-zinc-900/50 rounded" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
