"use client";

import { ReactNode, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ("vendor" | "staff" | "admin")[];
  requireAuth?: boolean;
  fallbackPath?: string;
}

/**
 * ProtectedRoute component for role-based access control
 *
 * @param children - The content to render if access is granted
 * @param allowedRoles - Array of roles that can access this route
 * @param requireAuth - Whether authentication is required (default: true)
 * @param fallbackPath - Path to redirect to if access is denied (default: /login or /dashboard)
 */
export default function ProtectedRoute({
  children,
  allowedRoles,
  requireAuth = true,
  fallbackPath,
}: ProtectedRouteProps) {
  const { user, isLoggedIn, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Don't check while loading
    if (isLoading) return;

    // Check if authentication is required but user is not logged in
    if (requireAuth && !isLoggedIn) {
      router.push(fallbackPath || "/login");
      return;
    }

    // Check if specific roles are required
    if (allowedRoles && allowedRoles.length > 0 && user) {
      const hasAccess = allowedRoles.includes(user.role);

      if (!hasAccess) {
        // Redirect to dashboard with a message or to a specific fallback path
        router.push(fallbackPath || "/dashboard");
        return;
      }
    }
  }, [
    isLoggedIn,
    isLoading,
    user,
    allowedRoles,
    requireAuth,
    fallbackPath,
    router,
  ]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // If auth is required but user is not logged in, don't render anything
  if (requireAuth && !isLoggedIn) {
    return null;
  }

  // If specific roles are required, check access
  if (allowedRoles && allowedRoles.length > 0 && user) {
    const hasAccess = allowedRoles.includes(user.role);

    if (!hasAccess) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-500 mb-2">
              Access Denied
            </h1>
            <p className="text-muted-foreground mb-4">
              You don't have permission to access this page.
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }
  }

  // Render children if all checks pass
  return <>{children}</>;
}
