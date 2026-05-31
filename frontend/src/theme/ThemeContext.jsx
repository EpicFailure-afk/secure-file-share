import { createContext, useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "theme";
// eslint-disable-next-line react-refresh/only-export-components
export const ThemeContext = createContext(null);

// Only "dark" and "light" are supported. Anything else falls back to dark.
const normalize = (value) => (value === "light" ? "light" : "dark");

const applyTheme = (resolved) => {
  const root = document.documentElement;
  root.setAttribute("data-theme", resolved);
  // Keep <body> dark class around for legacy CSS selectors during migration.
  document.body.classList.toggle("dark", resolved === "dark");
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    if (typeof window === "undefined") return "dark";
    return normalize(localStorage.getItem(STORAGE_KEY));
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next) => {
    const resolved = normalize(next);
    setThemeState(resolved);
    localStorage.setItem(STORAGE_KEY, resolved);
  }, []);

  const cycleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const value = useMemo(
    // `resolved` kept as an alias of `theme` for backward compatibility.
    () => ({ theme, resolved: theme, setTheme, cycleTheme }),
    [theme, setTheme, cycleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
