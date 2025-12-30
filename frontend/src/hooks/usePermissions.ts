import { useAuth } from "@/context/AuthContext";

/**
 * Custom hook for checking user permissions
 */
export function usePermissions() {
  const { user, isLoggedIn } = useAuth();

  /**
   * Check if user has a specific role
   */
  const hasRole = (role: "vendor" | "staff" | "admin"): boolean => {
    return isLoggedIn && user?.role === role;
  };

  /**
   * Check if user has any of the specified roles
   */
  const hasAnyRole = (roles: ("vendor" | "staff" | "admin")[]): boolean => {
    return isLoggedIn && user ? roles.includes(user.role) : false;
  };

  /**
   * Check if user is a vendor
   */
  const isVendor = (): boolean => {
    return hasRole("vendor");
  };

  /**
   * Check if user is staff
   */
  const isStaff = (): boolean => {
    return hasRole("staff");
  };

  /**
   * Check if user is admin
   */
  const isAdmin = (): boolean => {
    return hasRole("admin");
  };

  /**
   * Check if user can manage staff (only vendors and admins)
   */
  const canManageStaff = (): boolean => {
    return hasAnyRole(["vendor", "admin"]);
  };

  /**
   * Check if user can manage menu (vendors, staff, and admins)
   */
  const canManageMenu = (): boolean => {
    return isLoggedIn; // All authenticated users can manage menu
  };

  /**
   * Check if user can manage orders (all authenticated users)
   */
  const canManageOrders = (): boolean => {
    return isLoggedIn;
  };

  /**
   * Check if user can access vendor settings (only vendors and admins)
   */
  const canAccessSettings = (): boolean => {
    return hasAnyRole(["vendor", "admin"]);
  };

  /**
   * Check if user can create/delete menu items (vendors and admins only, staff can only edit)
   */
  const canCreateDeleteMenuItems = (): boolean => {
    return hasAnyRole(["vendor", "admin"]);
  };

  /**
   * Get the effective vendor ID for the current user
   * - For vendors: their own ID
   * - For staff: their vendor's ID
   * - For admins: null (can access all)
   */
  const getEffectiveVendorId = (): string | number | null => {
    if (!user || !user.role) return null;

    if (user.role === "vendor") {
      return user.id;
    } else if (user.role === "staff") {
      // Staff must have vendorId
      if (!user.vendorId) {
        console.error("Staff user missing vendorId");
        return null;
      }
      return user.vendorId;
    } else if (user.role === "admin") {
      return null; // Admins can access all vendors
    }

    return null;
  };

  return {
    hasRole,
    hasAnyRole,
    isVendor,
    isStaff,
    isAdmin,
    canManageStaff,
    canManageMenu,
    canManageOrders,
    canAccessSettings,
    canCreateDeleteMenuItems,
    getEffectiveVendorId,
    user,
    isLoggedIn,
  };
}
