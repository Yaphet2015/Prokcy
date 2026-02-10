# WaterfallBar Transform Scale Hover Design

## Overview

Replace width animation with CSS transform scale to eliminate layout reflow during hover expansion.

## Problem

Current implementation toggles between `w-48` (192px) and `w-96` (384px) width classes. This causes:
- Layout reflow on every hover event
- Adjacent elements shift position
- Potential jank at lower frame rates

## Solution

Use `transform: scaleX()` which operates in the compositing layer without triggering layout recalculation.

## Implementation

### Container Changes

**Remove:** Conditional width class toggling
```javascript
// Before
className={`${isHovered ? 'w-96' : 'w-48'} h-5 ...`}

// After
className="w-48 h-5 ..."
```

**Add:** Transform styles with proper origin
```javascript
style={{
  transform: isHovered ? 'scaleX(2)' : 'scaleX(1)',
  transformOrigin: 'right',
  willChange: isHovered ? 'transform' : 'auto',
}}
```

**Add:** Z-index to float above adjacent content
```javascript
className={`... ${isHovered ? 'z-10' : ''}`}
```

### Phase Segment Changes

**Update:** Minimum width for label display
```javascript
// Before
minWidth: isHovered ? '20px' : undefined,

// After
minWidth: isHovered ? '30px' : undefined,
```

### Transition Update

**Change:** From class-based transition to transform-specific
```javascript
// Inline style for transform transition
transition: 'transform 200ms ease-out'
```

## Benefits

- **No layout reflow:** Transform operates in compositing layer
- **GPU-accelerated:** 60fps animations
- **Stable layout:** Other elements don't shift
- **Better readability:** 30px minimum phase width ensures labels display fully

## Trade-offs

- **Visual overlap:** Scaled bar will overlap adjacent content (acceptable per requirements)
- **Text scaling:** Labels will scale with the bar (considered acceptable)

## Files Modified

- `src/features/network/WaterfallTimeline.jsx` - WaterfallBar component (lines 170-205)
