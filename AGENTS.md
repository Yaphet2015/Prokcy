Never enable system proxy in this app.

Remember to review and update the existing design doc in docs/plans when you make any changes about the features of this app.

## Cursor Cloud specific instructions

### Overview
Prokcy is an Electron + React + Vite desktop app wrapping the Whistle proxy server. Single service — no databases, Docker, or external dependencies.

### Dev commands
See `CLAUDE.md` and `package.json` scripts for the full list. Key commands:
- `npm run dev` — starts Vite dev server (port 5173), TypeScript watch, and Electron concurrently
- `npm run lint` — ESLint on `lib/`
- `npm test` — Node.js test runner on `tests/`
- `npm run build:react` — builds both lib and React frontend

### Running Electron in headless (Cloud VM)
- Xvfb is pre-installed. Start a virtual display before launching Electron: `Xvfb :99 -screen 0 1280x720x24 &`
- Set `DISPLAY=:99` for all Electron commands.
- Pass `--no-sandbox --disable-gpu` flags when launching Electron directly (e.g. `DISPLAY=:99 npx electron ./dist-lib --no-sandbox --disable-gpu`).
- The `npm run dev` script runs all three processes (Vite + tsc watch + Electron) via `concurrently`. For Cloud VM, it's easier to start Vite and Electron separately so you can add the `--no-sandbox --disable-gpu` flags.

### Known issues (pre-existing)
- **ESLint config bug**: `.eslintrc` sets `max-len` severity to `"none"` which is invalid. Change to `"off"` or `0` to fix.
- **package-lock.json registry**: The lockfile may contain `resolved` URLs pointing to `npm.pdd.net` (unreachable internal registry). If `npm install` fails with ENOTFOUND errors, delete `package-lock.json` and `node_modules`, then run `npm install --registry=https://registry.npmjs.org`.
- **Some tests fail**: 7 of 27 tests have pre-existing failures (sidebar resize state tests and network time format test).

### Ports
- `5173` — Vite dev server
- `8888` — Whistle proxy server (started by Electron utility process)