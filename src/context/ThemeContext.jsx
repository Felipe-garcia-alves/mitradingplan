import { createContext, useContext, useState } from "react";

const ThemeContext = createContext(null);

export const DARK = {
  bg:        "#080810",
  bgCard:    "#0d0d14",
  bgCard2:   "#111118",
  border:    "#1a1a2e",
  border2:   "#2a2a3a",
  text:      "#f0f0f0",
  textSub:   "#888",
  textMuted: "#555",
  textFaint: "#333",
  sidebar:   "#0d0d14",
  header:    "rgba(8,8,16,0.95)",
  accent:    "#00d4aa",
  name:      "dark",
};

export const LIGHT = {
  bg:        "#f0f0f0",
  bgCard:    "#ffffff",
  bgCard2:   "#f7f7f8",
  border:    "#e2e2e8",
  border2:   "#d4d4dc",
  text:      "#111118",
  textSub:   "#555",
  textMuted: "#888",
  textFaint: "#bbb",
  sidebar:   "#ffffff",
  header:    "rgba(240,240,240,0.95)",
  accent:    "#00b894",
  name:      "light",
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(DARK);
  const toggle = () => setTheme(t => t.name === "dark" ? LIGHT : DARK);
  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) return { theme: DARK, toggle: ()=>{} };
  return ctx;
}
