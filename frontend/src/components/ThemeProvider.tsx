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
    // Load theme from localStorage on client side only
    try {
      const storedTheme = localStorage.getItem("theme");

      if (storedTheme === "dark") {
        setTheme("dark");
        document.documentElement.classList.add("dark");
      } else {
        // Default to light theme
        setTheme("light");
        document.documentElement.classList.remove("dark");
        // Save default to localStorage if not set
        if (!storedTheme) {
          localStorage.setItem("theme", "light");
        }
      }
    } catch (error) {
      console.warn("Failed to load theme from localStorage:", error);
      // Fallback to light theme
      setTheme("light");
      document.documentElement.classList.remove("dark");
    } finally {
      setIsLoaded(true);
    }
  }, []);

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
