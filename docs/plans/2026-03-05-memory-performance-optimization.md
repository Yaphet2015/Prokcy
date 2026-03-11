# Prokcy Memory + Performance Optimization (Balanced)

## Goal

Reduce long-running memory growth and background overhead while preserving current request-inspection UX for normal usage.

## Implemented Changes

### 1. Main-process scheduling fixes

- Fixed duplicate proxy-detection scheduling in `lib/menu.ts` so each cycle arms one timer.
- Replaced high-frequency dock menu polling (`160ms`) with throttled event-driven updates plus a `1000ms` fallback in `lib/index.ts`.

### 2. Effective request-limit alignment

- Aligned request-list normalization floor to `600` in `lib/settings.ts` (matching Whistle runtime behavior).
- Updated settings UI copy/range to reflect effective lower bound.

### 3. Low-memory mode

- Added `lowMemoryMode` setting (proxy settings path).
- Wired Whistle startup mode to append `strict` when low-memory mode is enabled (`lib/whistle.ts`).
- Marked low-memory toggle as restart-requiring in settings apply flow.

### 4. Polling payload controls

- Added advanced settings:
  - `networkPollingCount` (default `50`, range `10..100`)
  - `trackedRequestIdsLimit` (default `50`, range `0..200`)
- Persisted in preferences and propagated via settings update events.
- Updated `NetworkContext` to apply these settings in polling behavior.

### 5. Renderer memory retention reductions

- Request summary normalization now keeps lightweight fields only:
  - strips headers in summaries
  - strips full rules in summaries except minimal style marker
  - keeps request/response bodies for detail fetch only
- Added detail cache constraints in `NetworkContext`:
  - max entries: `10`
  - max estimated bytes: `4MB`
- Added tracked-ID `status` shaping to trim repeated payload data from polling updates.

### 6. Inspector editor deferral

- Request inspector now mounts only the active tab content.
- Body/Response tabs use lightweight preview for large payloads and mount Monaco only on explicit user action.

## Validation

Added/updated tests:

- `tests/lib/menu-detect-proxy-loop.test.cjs`
- `tests/lib/settings-request-limit-floor.test.cjs`
- `tests/network-request-normalization.test.ts`
- `tests/monaco-loader.test.ts`

Executed:

- `npm run build:lib` (pass)
- targeted node tests above (pass)

## Notes

- Full project `tsc --noEmit -p tsconfig.json` currently reports pre-existing unrelated type issues in renderer code not introduced by this change set.
- System proxy behavior was not changed by this optimization work.

## 2026-03 Update: Renderer Startup + Monaco Warm-Up

- Moved Rules, Values, and Settings view code behind lazy view activation so launch only pays for the default Network surface.
- Moved `RulesProvider` and `ValuesProvider` out of the root render path so they do not fetch or subscribe during app startup.
- Added a shared Monaco loader and background warm-up path:
  - request inspector body/response editors now lazy-load Monaco
  - Rules and Values editors share the same lazy Monaco chunk
  - Monaco warm-up starts after first paint and an idle slot, so startup stays lean while common editor flows become faster
- Added Rollup chunking rules so Monaco stays out of the initial renderer entry bundle.
- Reduced background Network polling while the Network view is inactive or the document is hidden.
- Simplified request merge behavior to reduce per-poll array churn while preserving newest-first ordering.
