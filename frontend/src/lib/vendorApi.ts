import { usePermissions } from "@/hooks/usePermissions";

/**
 * Helper to construct API URLs with the effective vendor ID
 * Automatically uses the correct vendor ID based on user role
 */
export function useVendorApi() {
  const { getEffectiveVendorId } = usePermissions();

  const buildVendorUrl = (path: string): string => {
    const vendorId = getEffectiveVendorId();
    if (!vendorId) {
      throw new Error("No vendor ID available");
    }
    // Remove leading slash if present
    const cleanPath = path.startsWith("/") ? path.substring(1) : path;
    return `/api/vendors/${vendorId}/${cleanPath}`;
  };

  return {
    buildVendorUrl,
    vendorId: getEffectiveVendorId(),
  };
}
