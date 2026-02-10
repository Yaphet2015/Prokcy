# WaterfallBar Hover Expansion Design

## Overview

Add hover expansion to WaterfallBar components. When a user hovers over a WaterfallBar, it expands within its row to show detailed phase labels and timing values. Other bars remain unchanged.

## Requirements

- Hovering a WaterfallBar expands it in-place (in-row expansion)
- Expanded view shows phase labels (DNS, TCP, TLS, TTFB, Download) AND time values
- Non-hovered bars maintain existing compressed behavior
- Smooth transition animation

## Architecture

### State Management

Add hover state at parent component level:

```javascript
const [hoveredRequestId, setHoveredRequestId] = useState(null);
```

### Component Props

WaterfallBar receives new props:

```javascript
<WaterfallBar
  request={request}
  compressedPosition={pos.compressedPosition}
  duration={pos.duration}
  compressedDuration={timelineState.compressedDuration}
  isHovered={hoveredRequestId === request.id}
  onHoverStart={() => setHoveredRequestId(request.id)}
  onHoverEnd={() => setHoveredRequestId(null)}
/>
```

## Visual Design

### Expanded State (isHovered=true)

- Container: expands from `w-48` to `w-96`
- Timeline: shows full range (left: 0%, width: 100%)
- Phase segments display:
  - Background color from TIMING_COLORS
  - Phase label centered (DNS, TCP, TLS, TTFB, Download)
  - Time value in ms
- Text color: white or dark (contrast-based)
- Font: `text-[10px]` or `text-xs`
- Minimum phase width threshold to prevent overflow

### Normal State (isHovered=false)

- Container: `w-48` with existing compressed positioning
- No text labels on phase segments

### Transitions

- CSS: `transition-all duration-200 ease-out`
- Text: `whitespace-nowrap overflow-hidden`

## Edge Cases

### Text Overflow

- Small phases (< 3% width): hide text, show color only
- Long labels: `overflow-hidden text-ellipsis`
- Fallback: tooltip on hover

### Performance

- Hover state is lightweight (single string ID)
- CSS transitions handle animation (no JS overhead)
- No re-renders of other bars

### Accessibility

- Existing `role="button"` and `tabIndex={0}` preserved
- Consider keyboard-triggered expansion (Enter/Space)

## Implementation Notes

File: `src/features/network/WaterfallTimeline.jsx`

Key changes:
1. Add `hoveredRequestId` state to WaterfallTimeline
2. Modify WaterfallBar to accept `isHovered`, `onHoverStart`, `onHoverEnd` props
3. Conditionally render phase text when `isHovered`
4. Apply conditional width classes and positioning
