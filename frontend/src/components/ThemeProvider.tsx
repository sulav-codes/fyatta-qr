"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useSyncExternalStore,
  useCallback,
  useMemo,
} from "react";
import {
  ThemeProvider as NextThemesProvider,
  useTheme as useNextTheme,
} from "next-themes";

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

const subscribe = () => () => {};

const ThemeContextBridge = ({ children }: ThemeProviderProps) => {
  const { resolvedTheme, setTheme } = useNextTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const isLoaded = mounted && resolvedTheme !== undefined;

  const theme: Theme = isLoaded && resolvedTheme === "dark" ? "dark" : "light";

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

   const value = useMemo<ThemeContextType>(
     () => ({ theme, toggleTheme, isLoaded }),
     [theme, toggleTheme, isLoaded],
   );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const scriptProps =
    typeof window === "undefined"
      ? undefined
      : ({ type: "application/json" } as const);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      scriptProps={scriptProps}
    >
      <ThemeContextBridge>{children}</ThemeContextBridge>
    </NextThemesProvider>
  );
}

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
};
