# Auto Update Feature Design

## Goal
Add a unified update flow that can be triggered from both the menu bar and Settings page, then automatically download and install a newer version.

## Existing Behavior
- Menu "Check Update" manually fetches GitHub `package.json`.
- If a new version exists, user is redirected to browser download.
- Settings page has no update trigger.

## New Behavior
- Shared main-process updater service (`lib/updater.ts`) performs update checks via `electron-updater`.
- Both triggers call the same flow:
  - Menu: "Check Update" / "Check for Updates..."
  - Settings: new "Check Update" button in General > Updates.
- On new version:
  - download starts automatically;
  - once downloaded, app installs immediately via `quitAndInstall()`.
- On latest version:
  - user sees "up to date" message.
- Concurrent checks are rejected with a deterministic message.

## Architecture
1. `lib/updater.ts`
   - encapsulates updater state and event handling;
   - returns normalized result object for UI callers;
   - prevents duplicate in-flight checks.
2. `lib/menu.ts`
   - delegates update action to `checkForUpdates()` and displays result.
3. `lib/ipc.ts` + `electron-preload.js`
   - exposes `check-for-updates` IPC and `window.electron.checkForUpdates()`.
4. `src/features/settings/index.tsx`
   - adds user-triggered check button and local loading/status handling.

## Non-Goals
- No periodic background checks in this change.
- No changes to proxy or system proxy features.

## Failure Handling
- Not packaged/dev mode: return informative failure.
- Update provider/network error: return friendly failure message.
- Update state remains recoverable for later manual retry.

## Validation
- Unit tests verify:
  - check request starts updater;
  - concurrent requests are rejected;
  - downloaded update triggers `quitAndInstall()`.
