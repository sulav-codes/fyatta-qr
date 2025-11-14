import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getApiBaseUrl } from "@/lib/api";

interface DashboardStats {
  totalOrders: number;
  activeItems: number;
  totalTables: number;
  totalRevenue: number;
  isLoading: boolean;
  error: string | null;
  pendingOrders?: number;
}

export const useDashboardStats = (): DashboardStats => {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    activeItems: 0,
    totalTables: 0,
    totalRevenue: 0,
    isLoading: true,
    error: null,
  });

  const { user, token } = useAuth();

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id || !token) {
        setStats((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        const response = await fetch(
          `${getApiBaseUrl()}/api/vendors/${user.id}/dashboard/stats`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch dashboard statistics");
        }

        const data = await response.json();

        setStats({
          totalOrders: data.totalOrders || data.total_orders || 0,
          activeItems: data.activeItems || data.active_items || 0,
          totalTables: data.totalTables || data.total_tables || 0,
          totalRevenue: data.totalRevenue || data.total_revenue || 0,
          pendingOrders: data.pendingOrders || data.pending_orders || 0,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        setStats((prev) => ({
          ...prev,
          isLoading: false,
          error: "Failed to load dashboard statistics",
        }));
      }
    };

    fetchStats();

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);

    return () => clearInterval(interval);
  }, [user, token]);

  return stats;
};
