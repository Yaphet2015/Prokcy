# WaterfallBar Hover Expansion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add hover expansion to WaterfallBar components showing phase labels and timing values.

**Architecture:** Add hover state tracking to parent WaterfallTimeline component, pass hover props to each WaterfallBar, conditionally render expanded view with labels and times.

**Tech Stack:** React hooks (useState), CSS transitions, existing WaterfallTimeline.jsx component

---

### Task 1: Add hover state to WaterfallTimeline component

**Files:**
- Modify: `src/features/network/WaterfallTimeline.jsx:196-277`

**Step 1: Add hover state variable**

Add state variable after line 205 (after `timelineState`):

```javascript
const [hoveredRequestId, setHoveredRequestId] = useState(null);
```

**Step 2: Test basic app still runs**

Run: `npm run dev`
Expected: App starts without errors, network panel displays

**Step 3: Commit**

```bash
git add src/features/network/WaterfallTimeline.jsx
git commit -m "feat: add hoverRequestId state for WaterfallBar expansion"
```

---

### Task 2: Update WaterfallBar component signature

**Files:**
- Modify: `src/features/network/WaterfallTimeline.jsx:158-194`

**Step 1: Update function signature**

Replace line 158:

```javascript
function WaterfallBar({ request, compressedPosition, duration, compressedDuration, isHovered, onHoverStart, onHoverEnd }) {
```

**Step 2: Add conditional container width**

Replace line 166:

```javascript
<div className={`${isHovered ? 'w-96' : 'w-48'} h-5 bg-zinc-100 dark:bg-zinc-900/50 rounded overflow-hidden relative transition-all duration-200 ease-out`}
     onMouseEnter={onHoverStart}
     onMouseLeave={onHoverEnd}
>
```

**Step 3: Update positioning logic**

Replace lines 162-163:

```javascript
  const leftPercent = isHovered ? 0 : (compressedPosition / compressedDuration) * 100;
  const widthPercent = isHovered ? 100 : Math.max((duration / compressedDuration) * 100, MIN_BAR_WIDTH_PERCENT / compressedDuration * 100);
```

**Step 4: Test basic app still runs**

Run: `npm run dev`
Expected: App starts, WaterfallBars display (with console errors about missing props, which is expected)

**Step 5: Commit**

```bash
git add src/features/network/WaterfallTimeline.jsx
git commit -m "feat: update WaterfallBar with hover props and conditional sizing"
```

---

### Task 3: Add phase label rendering to WaterfallBar

**Files:**
- Modify: `src/features/network/WaterfallTimeline.jsx:174-191`

**Step 1: Update phase rendering to show labels when hovered**

Replace the phase div block (lines 179-190):

```javascript
            <div
              key={idx}
              className="h-full first:rounded-l last:rounded-r relative flex items-center justify-center overflow-hidden"
              style={{
                backgroundColor: phase.color,
                width: `${phaseWidthPercent}%`,
                marginLeft: idx > 0 ? undefined : `${phaseOffsetPercent}%`,
                minWidth: isHovered ? '20px' : undefined,
              }}
              title={`${phase.type}: ${formatTime(phase.duration)}`}
            >
              {isHovered && phaseWidthPercent > 3 && (
                <div className="flex flex-col items-center justify-center text-[9px] font-medium text-white">
                  <span className="uppercase leading-tight">{phase.type}</span>
                  <span className="leading-tight opacity-90">{formatTime(phase.duration)}</span>
                </div>
              )}
            </div>
```

**Step 4: Test basic app still runs**

Run: `npm run dev`
Expected: App starts, still waiting for prop connections

**Step 5: Commit**

```bash
git add src/features/network/WaterfallTimeline.jsx
git commit -m "feat: add phase label and time rendering on hover"
```

---

### Task 4: Connect hover props from parent to WaterfallBar

**Files:**
- Modify: `src/features/network/WaterfallTimeline.jsx:392-401`

**Step 1: Update WaterfallBar usage with new props**

Replace the WaterfallBar rendering block (lines 392-401):

```javascript
                  {pos ? (
                    <WaterfallBar
                      request={request}
                      compressedPosition={pos.compressedPosition}
                      duration={pos.duration}
                      compressedDuration={timelineState.compressedDuration}
                      isHovered={hoveredRequestId === request.id}
                      onHoverStart={() => setHoveredRequestId(request.id)}
                      onHoverEnd={() => setHoveredRequestId(null)}
                    />
                  ) : (
                    <div className="w-48 h-5 bg-zinc-100 dark:bg-zinc-900/50 rounded" />
                  )}
```

**Step 5: Test hover functionality**

Run: `npm run dev`
Expected:
- App starts, network panel displays
- Hovering over a WaterfallBar expands it to w-96
- Expanded bar shows phase labels and times
- Other bars remain at w-48
- Smooth transition animation

**Step 6: Commit**

```bash
git add src/features/network/WaterfallTimeline.jsx
git commit -m "feat: connect hover state to WaterfallBar components"
```

---

### Task 5: Verify functionality and edge cases

**Files:**
- Test: Manual testing in browser
- Verify: `src/features/network/WaterfallTimeline.jsx`

**Step 1: Test hover expansion**

Manual test:
1. Start app: `npm run dev`
2. Navigate to Network panel
3. Hover over various WaterfallBars
4. Verify: hovered bar expands, labels show
5. Verify: other bars stay compressed

**Step 2: Test edge cases**

Manual test:
1. Hover over bar with very small phases (< 3%)
2. Verify: small phases don't show text (only color)
3. Hover over bar with large phases
4. Verify: all phases show labels + times
5. Move mouse quickly between bars
6. Verify: smooth transitions, no flickering

**Step 3: Test with filtered requests**

Manual test:
1. Enter filter in search box
2. Verify: hover expansion works on filtered results
3. Clear filter
4. Verify: hover expansion works on all requests

**Step 4: Test with empty state**

Manual test:
1. Clear all requests
2. Verify: no errors in console
3. Capture new requests
4. Verify: hover expansion works

**Step 5: Final commit**

```bash
git add src/features/network/WaterfallTimeline.jsx
git commit -m "test: verify WaterfallBar hover expansion functionality"
```

---

### Task 6: Documentation cleanup

**Files:**
- Create: (optional) Update README if needed

**Step 1: Remove design plan if desired**

```bash
# Optional: Remove design doc since feature is implemented
# rm docs/plans/2025-02-10-waterfall-hover-expansion-design.md
```

**Step 2: Final cleanup commit**

```bash
git add docs/plans/
git commit -m "chore: cleanup plans after hover expansion implementation"
```
