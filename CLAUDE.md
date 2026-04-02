# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Prokcy is a cross-platform desktop network debugging proxy tool. Built with Electron + React, providing a modern GUI for the Whistle proxy server.

**Core Features:** Network waterfall timeline, Rules editor (Monaco + Whistle syntax), Values key-value store (JSON5).

## Build & Development Commands

- `npm run build:lib` — compile Electron main process TypeScript → `dist-lib/` (CommonJS)
- `npm run build:react` — bundle React frontend → `dist-react/` (Vite)
- `npm run dev` — dev mode: Vite dev server + tsc watch + Electron (all concurrent)
- `npm test` — native Node.js test runner (no Jest/Vitest), uses `tsx` for TypeScript
  - Single test file: `node --import tsx --test tests/my-test.test.ts`
- `npm run lint` — ESLint on `lib/` with auto-fix (airbnb config)

## Architecture

Three Electron processes:
- **Main** (`lib/index.ts`): app lifecycle, IPC coordination, single-instance enforcement
- **Renderer**: React frontend (Vite + TailwindCSS)
- **Utility** (`lib/whistle.ts`): Whistle proxy server in forked child process (`ELECTRON_RUN_AS_NODE=1`)

IPC between main and utility uses `postMessage({ type, ...data })`. Message types defined in `lib/whistle.ts` (worker receiving) and `lib/fork.ts` (main receiving).

Key non-obvious details:
- Storage uses `~/.whistle_client/` not `~/.whistle/` (separate from CLI Whistle's default)
- Frameless window (`frame: false`, `transparent: true`) with custom window controls in sidebar
- `lib/` compiles to CommonJS; `src/` uses ESM

## TypeScript Configuration

- **Root `tsconfig.json`** — React frontend (ESM output)
- **`tsconfig.lib.json`** — Electron main process (CommonJS output to `dist-lib/`)
- **`lib/types/`** — type declarations for Electron extensions, Whistle (untyped), and shared types

## Code Patterns

### React Frontend
- Keep files under 500 lines; extract components/hooks when approaching limit
- Use custom hooks for complex logic (drag-and-drop, CRUD operations)
- Barrel exports for clean imports; context providers for shared state
- Path alias: `@/*` maps to `src/*`

### Electron/Node.js
- Error handling via global `uncaughtException`/`unhandledRejection` handlers
- Async operations use try-catch with no-op fallbacks
- `lib/` uses CommonJS (`require`/`module.exports`)

## Constraints

- **Never enable or modify the system proxy** — this is a sensitive user-controlled setting only
- **Never create files over 500 lines** — split into modules when approaching limit

## Documentation

Review and update `docs/plans/` design docs when making feature changes.
