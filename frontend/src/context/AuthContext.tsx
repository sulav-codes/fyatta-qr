"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

// Define User type - adjust fields based on your actual user object
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
  // Add other user properties as needed
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for saved token on mount
  useEffect(() => {
    const loadAuthState = () => {
      try {
        const storedToken = localStorage.getItem("token");
        const storedUser = localStorage.getItem("user");

        if (storedToken && storedUser) {
          setToken(storedToken);
          const parsedUser = JSON.parse(storedUser);

          // Ensure user has a role - existing users without role are vendors
          if (!parsedUser.role) {
            parsedUser.role = "vendor";
            // Update localStorage with the role
            localStorage.setItem("user", JSON.stringify(parsedUser));
          }

          setUser(parsedUser as User);
        }
      } catch (error) {
        console.error("Error restoring auth state:", error);
        // Clear potentially corrupted data
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      } finally {
        setIsLoading(false);
      }
    };

    // Add a small delay to ensure the client is fully hydrated
    if (typeof window !== "undefined") {
      loadAuthState();
    }
  }, []);

  const login = (newToken: string, newUser: User) => {
    try {
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem("token", newToken);
      localStorage.setItem("user", JSON.stringify(newUser));
    } catch (error) {
      console.error("Error saving auth state:", error);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
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
