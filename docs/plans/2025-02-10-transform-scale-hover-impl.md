# Transform Scale Hover Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace width animation with CSS transform scale to eliminate layout reflow during WaterfallBar hover expansion.

**Architecture:** Remove conditional width classes, apply transform: scaleX(2) with transform-origin: right, add z-index for layering, increase minimum phase width to 30px.

**Tech Stack:** React inline styles, CSS transforms, existing WaterfallTimeline.jsx component

---

### Task 1: Remove conditional width classes from WaterfallBar container

**Files:**
- Modify: `src/features/network/WaterfallTimeline.jsx:172`

**Step 1: Remove conditional width class**

Replace line 172:
```javascript
// Before
className={`${isHovered ? 'w-96' : 'w-48'} h-5 bg-zinc-100 dark:bg-zinc-900/50 rounded overflow-hidden relative transition-all duration-200 ease-out`}

// After
className="w-48 h-5 bg-zinc-100 dark:bg-zinc-900/50 rounded overflow-hidden relative transition-all duration-200 ease-out"
```

**Step 2: Add conditional z-index class**

Update line 172 to include z-index:
```javascript
className={`w-48 h-5 bg-zinc-100 dark:bg-zinc-900/50 rounded overflow-hidden relative transition-all duration-200 ease-out ${isHovered ? 'z-10' : ''}`}
```

**Step 3: Test app runs**

Run: `npm run dev`
Expected: App starts, bars render at fixed width w-48

**Step 4: Commit**

```bash
git add src/features/network/WaterfallTimeline.jsx
git commit -m "refactor: remove conditional width classes, add z-index on hover"
```

---

### Task 2: Add transform scale styles to WaterfallBar container

**Files:**
- Modify: `src/features/network/WaterfallTimeline.jsx:170-182`

**Step 1: Add transform styles to container div**

Add a style prop to the container div (after line 172, inside the opening div tag):
```javascript
      style={{
        transform: isHovered ? 'scaleX(2)' : 'scaleX(1)',
        transformOrigin: 'right',
        willChange: isHovered ? 'transform' : 'auto',
      }}
```

The container div should now have both className and style props:
```javascript
    <div
      className={`w-48 h-5 bg-zinc-100 dark:bg-zinc-900/50 rounded overflow-hidden relative transition-all duration-200 ease-out ${isHovered ? 'z-10' : ''}`}
      style={{
        transform: isHovered ? 'scaleX(2)' : 'scaleX(1)',
        transformOrigin: 'right',
        willChange: isHovered ? 'transform' : 'auto',
      }}
      data-request-id={requestId}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
    >
```

**Step 2: Test hover expansion**

Run: `npm run dev`
Expected:
- Hovering scales the bar to 2x width
- Scaling happens from right edge
- No layout shift of adjacent elements

**Step 3: Commit**

```bash
git add src/features/network/WaterfallTimeline.jsx
git commit -m "feat: add transform scale hover expansion from right edge"
```

---

### Task 3: Update phase minimum width for better label display

**Files:**
- Modify: `src/features/network/WaterfallTimeline.jsx:196`

**Step 1: Increase minimum width to 30px**

Replace line 196:
```javascript
// Before
minWidth: isHovered ? '20px' : undefined,

// After
minWidth: isHovered ? '30px' : undefined,
```

**Step 2: Test label readability**

Run: `npm run dev`
Expected:
- Phase labels have more space when hovered
- Labels (DNS, TCP, TLS, TTFB, Download) display clearly

**Step 3: Commit**

```bash
git add src/features/network/WaterfallTimeline.jsx
git commit -m "refactor: increase phase minimum width to 30px for label readability"
```

---

### Task 4: Update transition from transition-all to transform-specific

**Files:**
- Modify: `src/features/network/WaterfallTimeline.jsx:172`

**Step 1: Replace transition-all with transform transition**

Replace line 172:
```javascript
// Before
className={`w-48 h-5 bg-zinc-100 dark:bg-zinc-900/50 rounded overflow-hidden relative transition-all duration-200 ease-out ${isHovered ? 'z-10' : ''}`}

// After
className={`w-48 h-5 bg-zinc-100 dark:bg-zinc-900/50 rounded overflow-hidden relative ${isHovered ? 'z-10' : ''}`}
```

**Step 2: Add transform-specific transition to style**

Update the style prop to include transition:
```javascript
      style={{
        transform: isHovered ? 'scaleX(2)' : 'scaleX(1)',
        transformOrigin: 'right',
        willChange: isHovered ? 'transform' : 'auto',
        transition: 'transform 200ms ease-out',
      }}
```

**Step 3: Test smooth animation**

Run: `npm run dev`
Expected:
- Smooth transform animation on hover
- Only transform is transitioned (more efficient)

**Step 4: Commit**

```bash
git add src/features/network/WaterfallTimeline.jsx
git commit -m "perf: use transform-specific transition for better performance"
```

---

### Task 5: Verify no layout reflow occurs

**Files:**
- Test: Manual browser verification
- Verify: `src/features/network/WaterfallTimeline.jsx`

**Step 1: Test layout stability**

Manual test in browser:
1. Open Network panel with multiple requests
2. Hover over a WaterfallBar
3. Observe: adjacent bars should NOT shift position
4. Observe: hovered bar expands visually, may overlap neighbors
5. Use Chrome DevTools Performance tab to confirm no layout events

**Step 2: Test smooth animation**

Manual test:
1. Hover over different bars quickly
2. Observe: 60fps smooth animation
3. Observe: no jank or stutter

**Step 3: Test label readability**

Manual test:
1. Hover over a bar with multiple phases
2. Observe: phase labels are fully readable
3. Observe: 30px minimum width provides adequate space

**Step 4: Final commit**

```bash
git add src/features/network/WaterfallTimeline.jsx
git commit -m "test: verify transform scale hover eliminates layout reflow"
```

---

### Task 6: Cleanup documentation

**Files:**
- Modify: docs/plans/

**Step 1: Remove design doc if desired**

```bash
# Optional: Remove design doc since feature is implemented
rm docs/plans/2025-02-10-transform-scale-hover-design.md
```

**Step 2: Final cleanup commit**

```bash
git add docs/plans/
git commit -m "chore: cleanup transform scale hover plans"
```
