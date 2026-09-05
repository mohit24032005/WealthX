import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext({
  theme: "dark",
  toggleTheme: () => {},
  setThemeMode: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("wealthx_theme");
    return saved === "light" || saved === "dark" ? saved : "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "light") {
      document.documentElement.classList.add("light-theme");
      document.documentElement.classList.remove("dark-theme");
      document.body.classList.add("light-theme");
      document.body.classList.remove("dark-theme");
    } else {
      document.documentElement.classList.add("dark-theme");
      document.documentElement.classList.remove("light-theme");
      document.body.classList.add("dark-theme");
      document.body.classList.remove("light-theme");
    }
    localStorage.setItem("wealthx_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const setThemeMode = (mode) => {
    if (mode === "dark" || mode === "light") {
      setTheme(mode);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === "dark", toggleTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export default ThemeContext;
