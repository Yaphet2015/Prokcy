<div align="center">
  <img src="public/dock.png" width="128" height="128" alt="Prokcy" />

  <h1>Prokcy</h1>
  <p><strong>Cross-platform HTTP/HTTPS/WebSocket Debugging Proxy GUI</strong></p>
  <p>Powered by <a href="https://github.com/avwo/whistle">whistle</a>, built with Electron + React + TailwindCSS + Monaco Editor.</p>

  <p>
    <a href="https://github.com/Yaphet2015/Prokcy/actions/workflows/ci.yml"><img src="https://github.com/Yaphet2015/Prokcy/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
    <a href="https://github.com/Yaphet2015/Prokcy/actions/workflows/build.yml"><img src="https://github.com/Yaphet2015/Prokcy/actions/workflows/build.yml/badge.svg" alt="Build" /></a>
    <a href="https://github.com/Yaphet2015/Prokcy/releases"><img src="https://img.shields.io/github/v/release/Yaphet2015/Prokcy?display_name=tag&amp;include_prereleases" alt="Release" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/github/license/Yaphet2015/Prokcy" alt="License" /></a>
    <a href="https://github.com/Yaphet2015/Prokcy/releases"><img src="https://img.shields.io/github/downloads/Yaphet2015/Prokcy/total" alt="Downloads" /></a>
    <a href="https://github.com/Yaphet2015/Prokcy/stargazers"><img src="https://img.shields.io/github/stars/Yaphet2015/Prokcy?style=social" alt="Stars" /></a>
    <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-informational" alt="Platforms" />
  </p>

  <p>
    <a href="./README.md">中文</a>
    &nbsp;·&nbsp;
    English
  </p>
</div>

---

Prokcy is a cross-platform desktop debugging proxy GUI that helps developers capture, inspect, filter, and manipulate HTTP/HTTPS/WebSocket network traffic. It wraps the [whistle](https://github.com/avwo/whistle) proxy engine in a custom, modern interface.

Supported platforms: **macOS** (Apple Silicon / Intel) · **Windows** · **Linux** (Fedora / Ubuntu)

> If your environment has no GUI (e.g., servers or headless devices), use the [whistle CLI](https://wproxy.org/whistle/) instead.

## 📑 Table of Contents

- [✨ Features](#-features)
- [📸 Screenshots](#-screenshots)
- [🔧 Core Features](#-core-features)
- [📦 Installation](#-installation)
- [🚀 Getting Started](#-getting-started)
- [📐 Rules in Detail](#-rules-in-detail)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [❓ FAQ](#-faq)
- [🙏 Acknowledgements](#-acknowledgements)
- [⭐ Star History](#-star-history)
- [📄 License](#-license)

## ✨ Features

- 🌐 **Multi-protocol capture** — HTTP / HTTPS / WebSocket, real-time capture of all proxied traffic
- 🎨 **Modern GUI** — Waterfall timeline + Monaco editor with custom Whistle syntax highlighting
- ✏️ **Powerful rule system** — Fully whistle-compatible; forward / mock / modify requests with prioritized rule groups
- 🗂 **Values store** — JSON5 key-value data, referenceable from rules
- 🎯 **Flexible filtering** — Filter the request list by domain / path / wildcard
- 🔄 **Auto-update** — Built-in version checking and upgrades
- 🚀 **Cross-platform** — Consistent experience on macOS, Windows, and Linux
- 📦 **Ready out of the box** — One-click root CA install and system proxy setup

## 📸 Screenshots

| Network | Rules |
|--------|-------|
| ![Network tab screenshot](./docs/images/readme/network-tab.png) | ![Rules tab screenshot](./docs/images/readme/rules-tab.png) |

| Values | Settings |
|--------|----------|
| ![Values tab screenshot](./docs/images/readme/values-tab.png) | ![Settings tab screenshot](./docs/images/readme/settings-tab.png) |

## 🔧 Core Features

### Network — Request Capture

Split-pane layout with a waterfall timeline and request inspector for real-time capture of all proxied network traffic.

- **Waterfall Timeline**: Each request rendered as a horizontal bar, color-coded by phase (DNS blue, TCP teal, TLS green, TTFB purple, Download orange)
- **Request Inspector**: Tabs for Headers (including cookies and Raw HTTP), Body, Response, Timeline, and Rules with automatic JSON syntax highlighting
- **Virtualized List**: Smooth performance under high request volume; aligned column headers (Method / Status / URL / Size / Time / Waterfall)
- **Request Filters**: Configure filter patterns in Settings → Network; supports domain, path, and wildcard matching

### Rules — Rule Editor

Dual-pane layout with a Monaco Editor and a rule group sidebar for writing whistle rules to forward, mock, or modify requests.

- **Custom Syntax Highlighting**: A dedicated Monaco language definition for whistle rule syntax with distinct coloring for protocol keywords, patterns, and comments
- **Rule Group Management**: Create, rename, delete, and drag-and-drop reorder groups to adjust priority
- **Multiple Active Groups**: Enable several rule groups simultaneously; priority runs top-to-bottom (`#1` > `#2` > ...)
- **Shortcuts**: `Cmd/Ctrl+S` to save, `Cmd/Ctrl+/` to toggle comments

### Values — Key-Value Store

Dual-pane layout (key list on the left, Monaco editor on the right) for managing JSON5 key-value data that can be referenced in rules.

- **JSON5 Editing**: Supports comments and trailing commas
- **Auto-Save**: Changes auto-save to the backend after a 300ms debounce
- **Shortcuts**: `Cmd/Ctrl+N` new, `Cmd/Ctrl+D` delete, `Cmd/Ctrl+Shift+R` rename, `Cmd/Ctrl+F` search

### Settings

A categorized settings panel with three sections:

| Category | Options |
|----------|---------|
| **Proxy** | Proxy port, Socks port, Bound host, Max HTTP header size, Request list limit, Proxy auth (username/password), Bypass list, System proxy toggle |
| **Network** | Request filter patterns (wildcards, domain/path/URL matching) |
| **App** | Storage directory switch, Theme (System/Light/Dark), Start at login, Hide from Dock |

## 📦 Installation

Select the installation steps for your operating system. Download the latest version from [Releases](https://github.com/Yaphet2015/Prokcy/releases).

<details>
  <summary>macOS</summary>

##### 1. Select the correct package

Choose the version matching your Mac processor:
- Apple Silicon (M series) → ARM 64-bit: [Prokcy-vx.y.z-mac-arm64.dmg](https://github.com/Yaphet2015/Prokcy/releases)
- Intel/AMD → x86_64: [Prokcy-vx.y.z-mac-x64.dmg](https://github.com/Yaphet2015/Prokcy/releases)

##### 2. Install

1. Double-click the downloaded `.dmg` file
2. Drag the Prokcy icon to the Applications folder
3. If prompted:
   - "Application already exists" → Select "Overwrite"
   - Unable to overwrite → Quit the running Prokcy first

##### 3. Security Tips

The current GitHub macOS releases are **unsigned** builds, not Apple-notarized distributions.
- If macOS says the developer cannot be verified, right-click the app in Finder and choose "Open"
- If macOS says the app is "damaged", that usually means you downloaded an older ad-hoc signed artifact; download a newer release package instead

Some enterprise security software may flag the app. Suggestions:
- Select "Allow" when running for the first time
- If continuously blocked, ask your IT department to whitelist Prokcy
</details>

<details>
  <summary>Windows</summary>

##### 1. Download

Choose the version based on your permission requirements:

- [Recommended] Standard edition (requires admin): [Prokcy-vx.y.z-win-x64.exe](https://github.com/Yaphet2015/Prokcy/releases)
    > Full functionality including pseudo-protocol support (`whistle://client`)
- User edition (no admin required): [Prokcy-user-installer-vx.y.z-win-x64.exe](https://github.com/Yaphet2015/Prokcy/releases)
    > Limited: pseudo-protocol calls not supported

##### 2. Run the installer

After double-clicking the installer, follow the security prompts:

1. User Account Control → Click "Yes" to continue
2. Follow the installation wizard to completion
</details>

<details>
  <summary>Linux (Fedora/Ubuntu)</summary>

Supports Fedora and Ubuntu distributions.

Download:
- Intel/AMD 64-bit (x86_64): [Prokcy-vx.y.z-linux-x86_64.AppImage](https://github.com/Yaphet2015/Prokcy/releases)
- ARM 64-bit (arm64): [Prokcy-vx.y.z-linux-arm64.AppImage](https://github.com/Yaphet2015/Prokcy/releases)

AppImage setup reference: https://itsfoss.com/cant-run-appimage-ubuntu/
</details>

## 🚀 Getting Started

### Launch

After installation:
1. Click the Prokcy icon on your desktop
2. Or find Prokcy in your system application menu

### Initial Setup

1. Open the `Prokcy` menu at the top of the client
2. Click `Install Root CA` to install the system root certificate for HTTPS inspection
3. Enable `Set As System Proxy` (or toggle it in Settings → Proxy) to capture system web traffic

### Top Menu

| Menu Item | Description |
|-----------|-------------|
| `Proxy Settings` | Open Settings → Proxy panel |
| `Install Root CA` | Install HTTPS root certificate |
| `Check Update` | Check for new versions |
| `Set As System Proxy` | Toggle system proxy |
| `Start At Login` | Auto-start on login |
| `Hide From Dock` | Hide Dock icon (macOS) |
| `Restart` | Restart the client |
| `Quit` | Quit the client |

## 📐 Rules in Detail

### Rule Groups & Priority

Prokcy supports multiple active rule groups with top-to-bottom priority.

#### Master Switch
- `Disable All`: Deactivate all rules (including `Default` and custom groups)
- `Enable All`: Re-enable rule matching

#### Group Interactions
- **Single-click** a group: Switch to edit that group
- **Double-click** a group: Toggle enabled/disabled state
- **Drag** a group: Reorder to adjust priority
- Active groups display priority badges (`#1`, `#2`, ...)

#### Priority Rules
1. Higher groups in the list take precedence; lower groups serve as fallbacks
2. Custom groups are matched before `Default`
3. Within a single group, rules are matched top-to-bottom; the first match wins

#### Example

**Cross-group override:**

```txt
Group A (#1, enabled)
example.com https://a.test

Group B (#2, enabled)
example.com https://b.test
```

A request to `http://example.com/1` matches Group A first, routing to `https://a.test`.

**Default fallback:**

```txt
Group A (#1, enabled)
foo.com https://foo-group.test

Default (enabled)
foo.com https://foo-default.test
bar.com https://bar-default.test
```

- `foo.com` matches Group A (overrides Default)
- `bar.com` has no match in Group A, falls back to Default

> Rule syntax is fully compatible with whistle. See the [whistle rules documentation](https://wproxy.org/whistle/rules/) for the complete syntax reference.

## Keyboard Shortcuts

| Shortcut | Action | Scope |
|----------|--------|-------|
| `Cmd/Ctrl + S` | Save | Rules / Settings |
| `Cmd/Ctrl + /` | Toggle comment | Rules |
| `Cmd/Ctrl + N` | New item | Values |
| `Cmd/Ctrl + D` | Delete item | Values |
| `Cmd/Ctrl + Shift + R` | Rename item | Values |
| `Cmd/Ctrl + F` | Search | Values |
| `Cmd/Ctrl + ,` | Open Settings | Global |
| `Cmd/Ctrl + B` | Toggle sidebar | Global |

## ❓ FAQ

<details>
  <summary>macOS says the developer "cannot be verified" or the app is "damaged"</summary>

The macOS builds are **unsigned**. If you see "cannot be verified", right-click the app in Finder and choose "Open". If it says "damaged", you likely downloaded an older ad-hoc signed artifact — grab the latest package from [Releases](https://github.com/Yaphet2015/Prokcy/releases).
</details>

<details>
  <summary>Why can't I see HTTPS request contents?</summary>

HTTPS inspection requires trusting the root certificate. Open the `Prokcy` menu → click `Install Root CA` to install the system root certificate, then restart your browser.
</details>

<details>
  <summary>How do I capture traffic from system browsers or apps?</summary>

Enable `Set As System Proxy` from the top menu (or check it in Settings → Proxy) and Prokcy will act as the system proxy for system-wide web traffic.
</details>

<details>
  <summary>Enterprise security software blocks or flags the app</summary>

Choose "Allow" on first run. If it keeps getting blocked, ask your IT department to whitelist Prokcy.
</details>

<details>
  <summary>Can I run it on a headless server / device without a GUI?</summary>

Prokcy requires a GUI environment. For headless scenarios, use the [whistle CLI](https://wproxy.org/whistle/) instead.
</details>

## 🙏 Acknowledgements

Prokcy stands on the shoulders of these excellent open-source projects:

- **[whistle](https://github.com/avwo/whistle)** — The core proxy engine this project is built on
- **[Electron](https://www.electronjs.org/)** · **[React](https://react.dev/)** · **[TailwindCSS](https://tailwindcss.com/)** · **[Monaco Editor](https://microsoft.github.io/monaco-editor/)** — App and UI stack
- **[electron-builder](https://www.electron.build/)** · **[electron-updater](https://www.electron.build/auto-update)** — Packaging and auto-update

Inspired by [Proxyman](https://proxyman.io/), [Charles](https://www.charlesproxy.com/), and [mitmproxy](https://mitmproxy.org/).

## ⭐ Star History

<div align="center">
  <a href="https://star-history.com/#Yaphet2015/Prokcy&Date">
    <img src="https://star-history.com/embed.svg#Yaphet2015/Prokcy&Date" alt="Star History Chart" width="640" />
  </a>
</div>

## 📄 License

[MIT — see the LICENSE file](./LICENSE)
