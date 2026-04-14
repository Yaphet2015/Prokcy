import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { applyDocumentThemeClass, getInitialIsDark } from './theme-state';

interface ThemeContextValue {
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
});

const initialIsDark = typeof window === 'undefined'
  ? false
  : getInitialIsDark(window.electron);

if (typeof document !== 'undefined') {
  applyDocumentThemeClass(document.documentElement, initialIsDark);
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps): React.JSX.Element {
  const [isDark, setIsDark] = useState(initialIsDark);

  useEffect(() => {
    // Get initial theme
    if (window.electron?.getTheme) {
      window.electron.getTheme()
        .then((theme) => setIsDark(!!theme?.isDark))
        .catch((err) => {
          console.error('Failed to get initial theme:', err);
          setIsDark(false); // Fallback to light mode
        });
    }

    let unsubscribe: (() => void) | undefined;
    if (window.electron?.onThemeChanged) {
      unsubscribe = window.electron.onThemeChanged((theme) => {
        setIsDark(!!theme?.isDark);
      });
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    // Apply dark mode class to document
    applyDocumentThemeClass(document.documentElement, isDark);
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
