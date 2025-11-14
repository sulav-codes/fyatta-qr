"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isLoaded: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>("light");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Prevent multiple initializations
    if (isLoaded) return;

    try {
      const storedTheme = localStorage.getItem("theme");

      if (storedTheme && (storedTheme === "light" || storedTheme === "dark")) {
        setTheme(storedTheme as Theme);
        document.documentElement.classList.toggle(
          "dark",
          storedTheme === "dark"
        );
      } else {
        // Set default and save to localStorage
        localStorage.setItem("theme", "light");
        document.documentElement.classList.remove("dark");
      }
    } catch (error) {
      console.warn("Failed to load theme from localStorage:", error);
    } finally {
      setIsLoaded(true);
    }
  }, [isLoaded]);

  const toggleTheme = () => {
    const newTheme: Theme = theme === "light" ? "dark" : "light";

    try {
      setTheme(newTheme);
      localStorage.setItem("theme", newTheme);
      document.documentElement.classList.toggle("dark", newTheme === "dark");
    } catch (error) {
      console.warn("Failed to save theme to localStorage:", error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isLoaded }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
};
