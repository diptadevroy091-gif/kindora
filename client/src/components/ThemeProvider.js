"use client";

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

export default function ThemeProvider({ children }) {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("kindora-theme");
    const isDark = savedTheme === "dark";

    setDark(isDark);
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    localStorage.setItem("kindora-theme", dark ? "dark" : "light");

    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark, mounted]);

  function toggleTheme() {
    setDark((previous) => !previous);
  }

  return (
    <ThemeContext.Provider value={{ dark, setDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
}
