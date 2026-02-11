import {
  useRef, useCallback, useMemo, useEffect, useState,
} from 'react';

/**
 * Lightweight virtual list component for efficient rendering of large lists.
 *
 * Following Vercel React best practices:
 * - Uses refs for transient scroll values (rerender-use-ref-transient-values)
 * - Memoizes row rendering to prevent unnecessary re-renders (rerender-memo)
 * - Uses passive event listeners for scroll (client-passive-event-listeners)
 * - Early exit for empty lists (js-early-exit)
 *
 * @param {Array} items - Array of items to render
 * @param {number} itemHeight - Fixed height of each item in pixels
 * @param {Function} renderItem - Function to render each item: (item) => JSX
 * @param {string} itemKey - Key property to use for each item (default: 'id')
 * @param {number} overscan - Number of extra items to render outside viewport (default: 5)
 * @param {Function} onScroll - Optional scroll callback
 * @param {string} className - Optional className for the container
 * @param {Object} style - Optional inline styles for the container
 */
export function VirtualList({
  items,
  itemHeight,
  renderItem,
  itemKey = 'id',
  overscan = 5,
  onScroll,
  className = '',
  style = {},
}) {
  const containerRef = useRef(null);
  // Use state for scroll position to trigger re-renders on scroll
  const [scrollTop, setScrollTop] = useState(0);
  // Track container height to avoid 0 height on initial render
  const [containerHeight, setContainerHeight] = useState(0);

  // Calculate total height of the list
  const totalHeight = useMemo(() => items.length * itemHeight, [items.length, itemHeight]);

  // Update container height when ref is set or on resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const updateHeight = () => {
      setContainerHeight(container.clientHeight);
    };

    // Initial height measurement
    updateHeight();

    // Observe resize changes
    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []); // Run only once when ref is set

  // Calculate visible range based on scroll position
  const visibleRange = useMemo(() => {
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
  const handleScroll = useCallback((event) => {
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

  // Memoize visible items to prevent unnecessary re-renders
  const visibleItems = useMemo(() => {
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
        {renderItem?.(null)}
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
            key={item[itemKey] ?? item.index}
            style={{
              position: 'absolute',
              top: offset,
              left: 0,
              right: 0,
              height: itemHeight,
            }}
          >
            {renderItem(item)}
          </div>
        ))}
      </div>
    </div>
  );
}
