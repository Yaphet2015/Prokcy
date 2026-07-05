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
  - signed/supported updater targets download automatically;
  - download progress is streamed to renderer;
  - once downloaded, renderer shows an explicit `Install` action and installation starts only after user click;
  - unsigned macOS builds do not enter in-app install and instead show Homebrew/manual DMG guidance.
- During install:
  - updater status enters `installing`;
  - renderer shows an indeterminate installing progress bar instead of leaving the UI in `downloaded`.
- On latest version:
  - user sees "up to date" message.
- Settings shows the running app version in General > Updates.
- Manual duplicate checks still return a deterministic error message.
- Automatic duplicate checks reuse the in-flight check and keep Settings in the existing checking state.
- Downloaded installer metadata is persisted so app restart can still restore `Install` state.
- macOS releases must include `.zip` artifacts in `latest-mac.yml`; `.dmg` remains the manual installer, while `electron-updater` requires `.zip` for in-app updates.
- Current unsigned/ad-hoc macOS builds are not Developer ID signed, so Prokcy must not call `quitAndInstall()` on macOS until signed distribution is available.

## Architecture
1. `lib/updater.ts`
   - encapsulates updater state, progress events, downloaded-file persistence, and automatic/manual check semantics;
   - returns normalized result object for UI callers (`checkForUpdates`, `installDownloadedUpdate`, `getUpdateStatus`);
   - prevents duplicate in-flight checks, adds an `installing` phase for post-download install handoff, and falls back to `manual-download` on unsigned macOS builds.
2. `lib/menu.ts`
   - delegates update action to `checkForUpdates()` and displays result.
3. `lib/ipc.ts` + `electron-preload.js`
   - exposes `check-for-updates(options)`, `get-update-status`, `install-downloaded-update`, and a narrow release-download URL opener;
   - pushes `update-status-changed` events to renderer.
4. `lib/index.ts`
   - triggers a silent startup update check after window creation.
5. `src/features/settings/index.tsx`
   - runs an automatic update check whenever Settings opens;
   - renders update progress bar below `Check Update`;
   - renders `Install` button when a downloaded update is available;
   - renders `Download DMG` and `brew upgrade --cask prokcy` guidance for unsigned macOS builds;
   - shows an indeterminate progress bar while installation is being handed off;
   - restores installable state after app restart from persisted updater metadata.

## Non-Goals
- No periodic background checks in this change.
- No changes to proxy or system proxy features.

## Failure Handling
- Not packaged/dev mode: return informative failure.
- Update provider/network error: return friendly failure message.
- Missing macOS ZIP artifact: return a short actionable failure message instead of leaking raw release metadata into Settings.
- Unsigned macOS update: return a `manual-download` status with GitHub DMG URL and `brew upgrade --cask prokcy`; do not show `Installing update...`.
- Stale cached/downloaded update metadata for an older or equal version: clear it and report the app as up to date instead of surfacing an old release as available.
- Install handoff timeout: recover to an error state with the downloaded update still installable.
- Update state remains recoverable for later manual retry.

## Validation
- Unit tests verify:
  - startup triggers a silent updater check after window creation;
  - check request starts updater;
  - automatic concurrent checks reuse the in-flight request;
  - downloaded update is cached without immediate install;
  - manual install action triggers `quitAndInstall()` and switches state to `installing`;
  - unsigned macOS update availability returns `manual-download` without auto-download;
  - unsigned macOS install action never calls `quitAndInstall()`;
  - stalled install handoff restores a recoverable state;
  - Settings progress-state logic renders indeterminate install progress;
  - Settings manual-download logic renders Homebrew guidance without progress;
  - stale cached/downloaded update metadata older than the running app is cleared;
  - Settings app-version IPC and label formatting expose the current version;
  - macOS package config emits both DMG and ZIP artifacts;
  - missing macOS ZIP updater errors are normalized before reaching Settings.

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

## 2026-05-26 Update
- Fixed the macOS release contract so builds publish both `.dmg` and `.zip` artifacts for `arm64` and `x64`.
- Documented that DMG is the manual installer and ZIP is the auto-update artifact required by `electron-updater`.
- Normalized `ERR_UPDATER_ZIP_FILE_NOT_FOUND` / `ZIP file not provided` into a short Settings error with recovery guidance.

## 2026-07-05 Update
- Added a Homebrew Cask distribution path through `Yaphet2015/homebrew-tap`.
- Changed unsigned macOS update behavior from in-app install handoff to `manual-download` with `brew upgrade --cask prokcy` and latest DMG guidance.
- Added an install handoff watchdog so supported updater targets recover if `quitAndInstall()` does not quit the app.
- Added updater diagnostics under the existing Prokcy app data log area.
- Added a running-version display to Settings > General > Updates.
- Fixed stale pending update metadata so older/equal versions, such as a cached `1.8.14` ZIP on a `1.8.16` app, are cleared instead of shown as available.
