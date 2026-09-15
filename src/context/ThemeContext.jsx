import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('studypulse_theme') || 'light';
  });

  const isDark = theme === 'dark';

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.style.colorScheme = 'dark';
      root.style.color = '';
      root.style.removeProperty('--text-primary');
      root.style.removeProperty('--text-body');
      root.style.removeProperty('--text-secondary');
      root.style.removeProperty('--text-muted');
      root.style.removeProperty('--main-text-light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
      root.style.color = '#000000';
      root.style.setProperty('--text-primary', '#000000');
      root.style.setProperty('--text-body', '#000000');
      root.style.setProperty('--text-secondary', '#000000');
      root.style.setProperty('--text-muted', '#000000');
      root.style.setProperty('--main-text-light', '#000000');
    }
    localStorage.setItem('studypulse_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeProvider;
