import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

interface Theme {
  isDark: boolean;
}

interface ThemeContextValue {
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
});

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps): React.JSX.Element {
  const [isDark, setIsDark] = useState(false);

  // Extend Window interface for electron API
  interface ElectronWindowTheme {
    getTheme?: () => Promise<{ isDark?: boolean }>;
    onThemeChanged?: (callback: (theme: { isDark?: boolean }) => void) => () => void;
  }

  useEffect(() => {
    // Get initial theme
    const electronWin = window as unknown as ElectronWindowTheme;
    if (electronWin.electron?.getTheme) {
      electronWin.electron.getTheme()
        .then((theme) => setIsDark(!!theme?.isDark))
        .catch((err) => {
          console.error('Failed to get initial theme:', err);
          setIsDark(false); // Fallback to light mode
        });
    }

    let unsubscribe: (() => void) | undefined;
    if (electronWin.electron?.onThemeChanged) {
      unsubscribe = electronWin.electron.onThemeChanged((theme) => {
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
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
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
