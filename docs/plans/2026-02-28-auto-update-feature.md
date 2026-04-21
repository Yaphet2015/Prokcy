# Auto Update Feature Design

## Goal
Add a unified update flow that can be triggered from both the menu bar and Settings page, then download a newer version with visible progress and install it manually.

## Existing Behavior
- Menu "Check Update" manually fetches GitHub `package.json`.
- If a new version exists, user is redirected to browser download.
- Settings page has no update trigger.

## New Behavior
- Shared main-process updater service (`lib/updater.ts`) performs update checks via `electron-updater`.
- Both triggers call the same flow:
  - Menu: "Check Update" / "Check for Updates..."
  - Settings: new "Check Update" button in General > Updates.
- Automatic checks happen in two places:
  - startup: one silent remote check after the main window is created;
  - Settings open: one automatic check every time the Settings view mounts.
- On new version:
  - download starts automatically;
  - download progress is streamed to renderer;
  - once downloaded, renderer shows an explicit `Install` action and installation starts only after user click.
- During install:
  - updater status enters `installing`;
  - renderer shows an indeterminate installing progress bar instead of leaving the UI in `downloaded`.
- On latest version:
  - user sees "up to date" message.
- Manual duplicate checks still return a deterministic error message.
- Automatic duplicate checks reuse the in-flight check and keep Settings in the existing checking state.
- Downloaded installer metadata is persisted so app restart can still restore `Install` state.

## Architecture
1. `lib/updater.ts`
   - encapsulates updater state, progress events, downloaded-file persistence, and automatic/manual check semantics;
   - returns normalized result object for UI callers (`checkForUpdates`, `installDownloadedUpdate`, `getUpdateStatus`);
   - prevents duplicate in-flight checks and adds an `installing` phase for post-download install handoff.
2. `lib/menu.ts`
   - delegates update action to `checkForUpdates()` and displays result.
3. `lib/ipc.ts` + `electron-preload.js`
   - exposes `check-for-updates(options)`, `get-update-status`, `install-downloaded-update`;
   - pushes `update-status-changed` events to renderer.
4. `lib/index.ts`
   - triggers a silent startup update check after window creation.
5. `src/features/settings/index.tsx`
   - runs an automatic update check whenever Settings opens;
   - renders update progress bar below `Check Update`;
   - renders `Install` button when a downloaded update is available;
   - shows an indeterminate progress bar while installation is being handed off;
   - restores installable state after app restart from persisted updater metadata.

## Non-Goals
- No periodic background checks in this change.
- No changes to proxy or system proxy features.

## Failure Handling
- Not packaged/dev mode: return informative failure.
- Update provider/network error: return friendly failure message.
- Update state remains recoverable for later manual retry.

## Validation
- Unit tests verify:
  - startup triggers a silent updater check after window creation;
  - check request starts updater;
  - automatic concurrent checks reuse the in-flight request;
  - downloaded update is cached without immediate install;
  - manual install action triggers `quitAndInstall()` and switches state to `installing`;
  - Settings progress-state logic renders indeterminate install progress.

## 2026-03-03 Update
- Changed behavior from auto-install to manual install after download.
- Added persistent downloaded installer metadata in app storage to recover state across restarts.
- Added real-time progress propagation from main process updater to renderer update section.
- Fixed Settings update text flow so `Checking for updates...` is only transient and does not remain after final `up-to-date` state.

## 2026-04-20 Update
- Added a silent startup update check after the main window is created.
- Added automatic update checks whenever the Settings view is opened.
- Added an explicit `installing` updater phase so the UI can disable actions and show install handoff progress.
- Kept startup checks silent while surfacing automatic-check results only inside the Settings update panel.
