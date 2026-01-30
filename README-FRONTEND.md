# Prokcy Frontend

Modern React + Vite + TailwindCSS frontend for the Prokcy desktop application.

## Getting Started

```bash
# Install dependencies
npm install

# Start development
npm run dev

# Build for production
npm run build:react
```

## Project Structure

```
src/
├── App.jsx              # Root component
├── main.jsx             # Entry point
├── index.css            # Global styles + Tailwind
├── features/            # Feature modules
│   ├── network/         # Network capture
│   ├── rules/           # Rules editor (Monaco)
│   └── values/          # Values management
└── shared/              # Shared utilities
    ├── api/             # Whistle API client
    ├── context/         # React Context providers
    └── ui/              # Reusable components
```

## Tahoe Theme

The app uses a custom macOS Tahoe-inspired theme:
- Glass effects with backdrop-blur
- Rounded corners (6px - 16px)
- System font stack
- Dark/light mode sync with macOS

## API Client

Located in `src/shared/api/whistle.js`:
- `getNetworkRequests()` - Fetch captured requests
- `getRules()` / `setRules()` - Rule configuration
- `getValues()` / `setValue()` - Key-value store
- `checkHealth()` - Proxy health check

## State Management

React Context providers:
- `useNetwork()` - Network requests state
- `useRules()` - Rules editor state
- `useValues()` - Values store state
- `useTheme()` - Theme state
