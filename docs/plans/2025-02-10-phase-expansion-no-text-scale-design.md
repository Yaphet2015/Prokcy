# Phase Expansion Without Text Scaling Design

## Overview

Expand phase bars within a fixed container on hover, keeping text labels at normal scale for readability.

## Problem

Previous implementation used `transform: scaleX(2)` on the entire container, which scaled text labels and made them distorted.

## Solution

Expand the inner phase div to fill 100% of the container when hovered. Phase segments expand proportionally within that space. Text remains at normal 9px size.

## Implementation

### Container Changes

**Remove:** Transform scale from container
```javascript
// Before
style={{
  transform: isHovered ? 'scaleX(2)' : 'scaleX(1)',
  transformOrigin: 'right',
  willChange: isHovered ? 'transform' : 'auto',
}}

// After
style={{
  // No transform - container stays fixed size
}}
```

**Keep:** Fixed width `w-48` and z-index on hover
```javascript
className="w-48 h-5 bg-zinc-100 dark:bg-zinc-900/50 rounded overflow-hidden relative ..."
className={`${isHovered ? 'z-10' : ''}`}
```

### Inner Phase Div Changes

**Update:** Expand to 100% width when hovered
```javascript
// Normal state: Compressed positioning
leftPercent = (compressedPosition / compressedDuration) * 100
widthPercent = (duration / compressedDuration) * 100

// Hovered state: Full width expansion
leftPercent = 0
widthPercent = 100
```

### Phase Segment Changes

**Update:** Minimum width to 30px for label readability
```javascript
minWidth: isHovered ? '30px' : undefined,
```

### Transition Update

**Change:** Remove `transition-all`, use specific property
```javascript
// From className: remove "transition-all duration-200 ease-out"
// Add to style: transition: 'all 200ms ease-out' on inner div
```

## Benefits

- **No text scaling:** Labels remain crisp and readable at 9px
- **No layout reflow:** Container stays fixed at w-48
- **Smooth animation:** Inner div expands, phases adjust proportionally
- **Better readability:** 30px minimum phase width ensures labels fit

## Behavior

**Normal state:**
- Phase bars show compressed timeline
- Phases positioned according to compressed timing
- No text labels visible

**Hovered state:**
- Inner div expands to 100% of container width
- All phases visible across full width
- Phase labels appear with 30px minimum width
- Smooth 200ms animation

## Files Modified

- `src/features/network/WaterfallTimeline.jsx` - WaterfallBar component (lines 165-210)
