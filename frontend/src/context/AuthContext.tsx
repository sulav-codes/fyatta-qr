"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { getApiBaseUrl } from "@/lib/api";


interface User {
  id: string;
  email: string;
  username: string;
  name?: string;
  restaurantName: string;
  location: string;
  role: "vendor" | "staff" | "admin";
  vendorId?: number;
  isActive: boolean;
  isStaff?: boolean;
  isSuperuser?: boolean;
  ownerName?: string;
  phone?: string;
  description?: string;
  openingTime?: string;
  closingTime?: string;
  logo?: string;
  dateJoined?: string;
  lastLogin?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshSession: () => Promise<boolean>;
  authFetch: (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => Promise<Response>;
}

interface RefreshResponse {
  token: string;
  user: User;
  error?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshInFlightRef = useRef<Promise<boolean> | null>(null);

  const persistAuthState = useCallback((newToken: string, newUser: User) => {
    try {
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem("token", newToken);
      localStorage.setItem("user", JSON.stringify(newUser));
    } catch (error) {
      console.error("Error saving auth state:", error);
    }
  }, []);

  const clearAuthState = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }, []);

  const handleSessionExpired = useCallback(() => {
    clearAuthState();

    if (typeof window === "undefined") {
      return;
    }

    const isGuardedRoute = window.location.pathname.startsWith("/dashboard");

    if (isGuardedRoute) {
      window.location.replace("/login?session=expired");
    }
  }, [clearAuthState]);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    const refreshPromise = (async () => {
      try {
        const response = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });

        if (!response.ok) {
          return false;
        }

        const data: RefreshResponse = await response.json();

        if (!data.token || !data.user) {
          return false;
        }

        persistAuthState(data.token, data.user);
        return true;
      } catch (error) {
        console.warn("Session refresh skipped:", error);
        return false;
      }
    })();

    refreshInFlightRef.current = refreshPromise;

    try {
      return await refreshPromise;
    } finally {
      refreshInFlightRef.current = null;
    }
  }, [persistAuthState]);

  const authFetch = useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const currentToken = localStorage.getItem("token");
      const initialHeaders = new Headers(init.headers || {});

      if (currentToken && !initialHeaders.has("Authorization")) {
        initialHeaders.set("Authorization", `Bearer ${currentToken}`);
      }

      const performFetch = async (overrideHeaders?: Headers) => {
        const finalInit: RequestInit = {
          ...init,
          headers: overrideHeaders || initialHeaders,
        };
        return fetch(input, finalInit);
      };

      let response = await performFetch();

      if (response.status !== 401 || !initialHeaders.has("Authorization")) {
        return response;
      }

      const refreshed = await refreshSession();

      if (!refreshed) {
        handleSessionExpired();
        return response;
      }

      const refreshedToken = localStorage.getItem("token");
      if (!refreshedToken) {
        handleSessionExpired();
        return response;
      }

      const retryHeaders = new Headers(initialHeaders);
      retryHeaders.set("Authorization", `Bearer ${refreshedToken}`);
      response = await performFetch(retryHeaders);

      return response;
    },
    [handleSessionExpired, refreshSession],
  );

  // Check for saved token and refresh cookie session on mount
  useEffect(() => {
    const loadAuthState = async () => {
      let hasStoredState = false;

      try {
        const storedToken = localStorage.getItem("token");
        const storedUser = localStorage.getItem("user");

        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser);

          // Ensure user has a role - existing users without role are vendors
          if (!parsedUser.role) {
            parsedUser.role = "vendor";
            localStorage.setItem("user", JSON.stringify(parsedUser));
          }

          setToken(storedToken);
          setUser(parsedUser as User);
          hasStoredState = true;
        }
      } catch (error) {
        console.error("Error restoring auth state:", error);
        clearAuthState();
      }

      const isGuardedRoute =
        typeof window !== "undefined" &&
        window.location.pathname.startsWith("/dashboard");

      // Avoid a guaranteed 401 refresh request for anonymous users on public routes.
      if (!hasStoredState && !isGuardedRoute) {
        setIsLoading(false);
        return;
      }

      const refreshed = await refreshSession();

      if (!refreshed) {
        // Re-check storage to avoid a race with OAuth callback login
        const latestStoredToken = localStorage.getItem("token");
        const latestStoredUser = localStorage.getItem("user");
        const hasLatestStoredState = !!(latestStoredToken && latestStoredUser);

        if (!hasStoredState && !hasLatestStoredState) {
          clearAuthState();
        } else if (hasLatestStoredState && !hasStoredState) {
          try {
            setToken(latestStoredToken);
            setUser(JSON.parse(latestStoredUser as string) as User);
          } catch (error) {
            console.error("Error restoring latest auth state:", error);
            clearAuthState();
          }
        }
      }

      setIsLoading(false);
    };

    if (typeof window !== "undefined") {
      loadAuthState();
    }
  }, [clearAuthState, handleSessionExpired, refreshSession]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const originalFetch = window.fetch.bind(window);

    const isAuthRoute = (url: string) => {
      return /\/auth\/(login|refresh|logout|register|google\/start|google\/callback)/i.test(
        url,
      );
    };

    const patchedFetch: typeof window.fetch = async (input, init) => {
      const requestUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      const headers = new Headers(
        init?.headers || (input instanceof Request ? input.headers : undefined),
      );
      const hasAuthHeader = headers.has("Authorization");

      let response = await originalFetch(input, init);

      if (
        response.status !== 401 ||
        !hasAuthHeader ||
        isAuthRoute(requestUrl)
      ) {
        return response;
      }

      const refreshed = await refreshSession();

      if (!refreshed) {
        handleSessionExpired();
        return response;
      }

      const refreshedToken = localStorage.getItem("token");

      if (!refreshedToken) {
        handleSessionExpired();
        return response;
      }

      const retryHeaders = new Headers(headers);
      retryHeaders.set("Authorization", `Bearer ${refreshedToken}`);

      if (input instanceof Request) {
        const retryRequest = new Request(input, {
          ...init,
          headers: retryHeaders,
        });
        response = await originalFetch(retryRequest);
      } else {
        response = await originalFetch(input, {
          ...init,
          headers: retryHeaders,
        });
      }

      return response;
    };

    window.fetch = patchedFetch;

    return () => {
      window.fetch = originalFetch;
    };
  }, [handleSessionExpired, refreshSession]);

  const login = (newToken: string, newUser: User) => {
    persistAuthState(newToken, newUser);
  };

  const logout = () => {
    fetch(`${getApiBaseUrl()}/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).catch((error) => {
      console.warn("Logout request failed:", error);
    });

    clearAuthState();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoggedIn: !!token,
        isLoading,
        login,
        logout,
        refreshSession,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};
