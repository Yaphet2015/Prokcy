import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
  isDark: false,
});

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Get initial theme
    if (window.electron?.getTheme) {
      window.electron.getTheme().then(setIsDark);
    }

    // Listen for theme changes (Electron will provide this)
    const handleThemeChange = (event) => {
      setIsDark(event.detail.isDark);
    };

    window.addEventListener('theme-changed', handleThemeChange);

    return () => {
      window.removeEventListener('theme-changed', handleThemeChange);
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
