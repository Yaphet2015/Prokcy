import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
  isDark: false,
});

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Get initial theme
    if (window.electron?.getTheme) {
      window.electron.getTheme()
        .then((theme) => setIsDark(!!theme?.isDark))
        .catch(err => {
          console.error('Failed to get initial theme:', err);
          setIsDark(false); // Fallback to light mode
        });
    }

    let unsubscribe;
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

export function useTheme() {
  return useContext(ThemeContext);
}
