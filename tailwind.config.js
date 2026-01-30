/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        tahoe: {
          bg: 'var(--color-tahoe-bg)',
          fg: 'var(--color-tahoe-fg)',
          accent: 'var(--color-tahoe-accent)',
          border: 'var(--color-tahoe-border)',
          surface: 'var(--color-tahoe-surface)',
          hover: 'var(--color-tahoe-hover)',
          subtle: 'var(--color-tahoe-subtle)',
        }
      },
      borderRadius: {
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        'pill': '9999px',
      },
      backdropBlur: {
        'tahoe': '20px',
      },
      boxShadow: {
        'tahoe-sm': '0 1px 3px rgba(0,0,0,0.05)',
        'tahoe-md': '0 4px 12px rgba(0,0,0,0.08)',
        'tahoe-lg': '0 8px 24px rgba(0,0,0,0.12)',
        'tahoe-glow': '0 0 20px var(--color-tahoe-glow)',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'monospace'],
      },
    },
  },
  plugins: [],
};
