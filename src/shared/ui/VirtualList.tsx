import {
  useRef, useCallback, useMemo, useEffect, useState,
} from 'react';
import type { CSSProperties, ReactNode } from 'react';

// Types
interface VisibleRange {
  start: number;
  end: number;
}

interface VirtualItem<T> {
  item: T;
  index: number;
  offset: number;
}

interface RenderItemProps<T> {
  item: T;
  index: number;
}

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (props: RenderItemProps<T>) => ReactNode;
  itemKey?: keyof T | 'id';
  overscan?: number;
  onScroll?: (scrollTop: number) => void;
  onVisibleRangeChange?: (range: VisibleRange) => void;
  onScrollbarWidthChange?: (width: number) => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * Lightweight virtual list component for efficient rendering of large lists.
 *
 * Following Vercel React best practices:
 * - Uses refs for transient scroll values (rerender-use-ref-transient-values)
 * - Memoizes row rendering to prevent unnecessary re-renders (rerender-memo)
 * - Uses passive event listeners for scroll (client-passive-event-listeners)
 * - Early exit for empty lists (js-early-exit)
 */
export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  itemKey = 'id',
  overscan = 5,
  onScroll,
  onVisibleRangeChange,
  onScrollbarWidthChange,
  className = '',
  style = {},
}: VirtualListProps<T>): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastNotifiedRangeRef = useRef<VisibleRange>({ start: -1, end: -1 });
  // Use state for scroll position to trigger re-renders on scroll
  const [scrollTop, setScrollTop] = useState(0);
  // Track container height to avoid 0 height on initial render
  const [containerHeight, setContainerHeight] = useState(0);

  // Calculate total height of list
  const totalHeight = useMemo(() => items.length * itemHeight, [items.length, itemHeight]);

  // Update container height when ref is set or on resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const updateHeight = () => {
      setContainerHeight(container.clientHeight);
      onScrollbarWidthChange?.(Math.max(container.offsetWidth - container.clientWidth, 0));
    };

    // Initial height measurement
    updateHeight();

    // Observe resize changes
    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [onScrollbarWidthChange]);

  // Calculate visible range based on scroll position
  const visibleRange = useMemo<VisibleRange>(() => {
    if (items.length === 0) {
      return { start: 0, end: 0 };
    }

    // Use containerHeight from state, fallback to a reasonable default
    const effectiveHeight = containerHeight || 600;
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const end = Math.min(
      items.length,
      Math.ceil((scrollTop + effectiveHeight) / itemHeight) + overscan,
    );

    return { start, end };
  }, [scrollTop, items.length, itemHeight, overscan, containerHeight]);

  // Handle scroll event using passive listener for better performance
  const handleScroll = useCallback((event: Event & { currentTarget: HTMLElement }) => {
    const newScrollTop = event.currentTarget.scrollTop;
    // Only update state if scroll position changed significantly
    if (Math.abs(newScrollTop - scrollTop) > 1) {
      setScrollTop(newScrollTop);
      onScroll?.(newScrollTop);
    }
  }, [scrollTop, onScroll]);

  // Expose scroll methods via ref
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    // Use passive event listener for better scroll performance
    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  // Notify parent when visible range changes (use effect to avoid call during render)
  useEffect(() => {
    if (!onVisibleRangeChange) return;
    const previous = lastNotifiedRangeRef.current;
    if (previous.start === visibleRange.start && previous.end === visibleRange.end) {
      return;
    }
    lastNotifiedRangeRef.current = visibleRange;
    onVisibleRangeChange(visibleRange);
  }, [visibleRange, onVisibleRangeChange]);

  // Memoize visible items to prevent unnecessary re-renders
  const visibleItems = useMemo<VirtualItem<T>[]>(() => {
    const { start, end } = visibleRange;
    return items.slice(start, end).map((item, sliceIndex) => ({
      item,
      index: start + sliceIndex,
      offset: (start + sliceIndex) * itemHeight,
    }));
  }, [items, visibleRange, itemHeight]);

  // Early exit for empty lists
  if (items.length === 0) {
    return (
      <div className={className} style={style}>
        {renderItem?.(null as unknown as T)}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto ${className}`}
      style={{
        height: '100%',
        position: 'relative',
        ...style,
      }}
    >
      {/* Spacer for total height to enable correct scrollbar */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, offset }) => (
          <div
            key={String(item[itemKey] ?? item.index)}
            style={{
              position: 'absolute',
              top: offset,
              left: 0,
              right: 0,
              height: itemHeight,
            }}
          >
            {renderItem({ item, index: item.index })}
          </div>
        ))}
      </div>
    </div>
  );
}
