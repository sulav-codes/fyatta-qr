"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Clock, ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { useParams, useRouter } from "next/navigation";
import { CartProvider } from "@/context/CartContext";
import MenuContent from "@/components/menu/MenuContent";
import { getApiBaseUrl } from "@/lib/api";
import { io, Socket } from "socket.io-client";

// Types
interface MenuItem {
  id: number;
  name: string;
  category: string;
  price: number;
  description: string;
  image: string | null;
  available: boolean;
  similarity_score?: number | null;
}

interface TableInfo {
  id: number;
  name: string;
  qr_code: string;
  is_active: boolean;
  has_active_order: boolean;
  active_order_id: number | null;
}

interface TableStatus {
  isBooked: boolean;
  activeOrderId: number | null;
}

interface VendorInfo {
  restaurant_name: string;
  [key: string]: any;
}

// Main wrapper that provides cart context
export default function MenuPage() {
  const params = useParams();
  const router = useRouter();
  const { vendor, tabel_identifier } = params;

  // WebSocket refs
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [categories, setCategories] = useState<string[]>(["All"]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vendorInfo, setVendorInfo] = useState<VendorInfo | null>(null);
  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null);
  const [tableStatus, setTableStatus] = useState<TableStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch menu data
  const fetchMenuData = async (showRefreshLoader = false) => {
    try {
      if (showRefreshLoader) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Check table availability using qr_code identifier
      const tableResponse = await fetch(
        `${getApiBaseUrl()}/api/public-table/${vendor}/${tabel_identifier}/`
      );

      if (!tableResponse.ok) {
        throw new Error("Table not found or inactive");
      }

      const tableData = await tableResponse.json();

      if (!tableData.is_active) {
        setError(
          "This table is currently unavailable. Please contact the restaurant."
        );
        return;
      }

      // Check if table has an active order
      if (tableData.has_active_order) {
        // Check if the current user is the one with the active order
        const currentOrderId = localStorage.getItem("current_order_id");
        const lastOrderTable = localStorage.getItem("last_order_table");
        const lastOrderVendor = localStorage.getItem("last_order_vendor");

        // Allow access if this is the same user's order
        if (
          currentOrderId === tableData.active_order_id?.toString() ||
          (lastOrderTable === tabel_identifier && lastOrderVendor === vendor)
        ) {
          console.log("User has active order at this table, allowing access");
        } else {
          // Table is booked by another user
          setTableStatus({
            isBooked: true,
            activeOrderId: tableData.active_order_id,
          });
          setError(null); // Clear error since this is not an error, just booked
          setLoading(false);
          return;
        }
      } else {
        // No active order, clear any previous booked status
        console.log("No active order detected, clearing table booking status");
        setTableStatus(null);

        // Clear table booking info from localStorage if table is free
        const lastOrderTable = localStorage.getItem("last_order_table");
        const lastOrderVendor = localStorage.getItem("last_order_vendor");
        if (lastOrderTable === tabel_identifier && lastOrderVendor === vendor) {
          console.log("Clearing localStorage table booking info");
          localStorage.removeItem("last_order_table");
          localStorage.removeItem("last_order_vendor");
          localStorage.removeItem("current_order_id");
        }
      }

      // Store table information
      setTableInfo({
        id: tableData.table_id,
        name: tableData.name,
        qr_code: tableData.qr_code,
        is_active: tableData.is_active,
        has_active_order: tableData.has_active_order,
        active_order_id: tableData.active_order_id,
      });

      // Store current table and vendor info for future reference
      localStorage.setItem("last_order_table", String(tabel_identifier));
      localStorage.setItem("last_order_vendor", String(vendor));

      const response = await fetch(
        `${getApiBaseUrl()}/api/public-menu/${vendor}/`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch menu data");
      }

      const data = await response.json();

      // Set vendor information
      if (data.vendor_info) {
        setVendorInfo(data.vendor_info);
        document.title = `Menu - ${data.vendor_info.restaurant_name}`;
      }

      // Extract all menu items from categories
      const allItems: MenuItem[] = [];
      const categorySet = new Set<string>(["All"]);

      data.categories.forEach((category: any) => {
        category.items.forEach((item: any) => {
          // Add category to our unique set
          categorySet.add(category.name);

          // Format the item for our app
          allItems.push({
            id: item.id,
            name: item.name,
            category: category.name,
            price: parseFloat(item.price),
            description: item.description || "",
            image: item.image_url || null,
            available: item.is_available,
          });
        });
      });

      setMenuItems(allItems);
      setCategories(Array.from(categorySet));
    } catch (err) {
      console.error("Error fetching menu data:", err);
      setError("Failed to load menu. Please try again.");
      toast.error("Failed to load menu. Please try again.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // WebSocket connection using socket.io-client
  useEffect(() => {
    if (!vendor || !tabel_identifier) return;

    const baseUrl = getApiBaseUrl();
    const wsUrl = baseUrl.replace(/^http/, "ws");

    console.log("MenuPage: Connecting to WebSocket:", wsUrl);

    const socket = io(wsUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("MenuPage: WebSocket connected");
      // Join table room for real-time updates
      socket.emit("join-table", {
        vendorId: String(vendor),
        tableIdentifier: String(tabel_identifier),
      });
    });

    socket.on("disconnect", () => {
      console.log("MenuPage: WebSocket disconnected");
    });

    // Listen for table status updates
    socket.on("table-status-update", (data: any) => {
      console.log("MenuPage: Received table-status-update:", data);
      // Refresh menu data to get updated table status
      fetchMenuData(true);
    });

    // Listen for order status updates
    socket.on(
      "order-status-update",
      (data: { orderId: number; status: string }) => {
        console.log("MenuPage: Received order-status-update:", data);

        // If order is completed/cancelled/rejected, refresh table status
        if (["completed", "cancelled", "rejected"].includes(data.status)) {
          console.log("Order finished, refreshing table status");
          fetchMenuData(true);
        }
      }
    );

    return () => {
      if (socket) {
        socket.emit("leave-table", {
          vendorId: String(vendor),
          tableIdentifier: String(tabel_identifier),
        });
        socket.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendor, tabel_identifier]);

  // Fetch menu data when component mounts
  useEffect(() => {
    fetchMenuData();

    // Listen for localStorage changes (when order is completed in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      console.log("localStorage change detected:", e.key, e.newValue);

      // If table booking info is cleared, refresh to check availability
      if (e.key === "last_order_table" && e.newValue === null) {
        console.log("Table booking cleared, refreshing menu data");
        fetchMenuData();
      }

      // If current order is cleared, refresh to check availability
      if (e.key === "current_order_id" && e.newValue === null) {
        console.log("Current order cleared, refreshing menu data");
        fetchMenuData();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Listen for page visibility changes to refresh when user returns
    const handleVisibilityChange = () => {
      if (!document.hidden && tableStatus?.isBooked) {
        console.log(
          "Page became visible and table is booked, checking availability"
        );
        fetchMenuData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup function
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [vendor, tabel_identifier]);

  // Auto-refresh when table is booked to check if it becomes available
  useEffect(() => {
    let refreshInterval: NodeJS.Timeout | undefined;

    if (tableStatus?.isBooked) {
      // Check every 3 seconds if table becomes available (more frequent for cancelled orders)
      refreshInterval = setInterval(() => {
        console.log("Checking if table is still booked...");
        fetchMenuData();
      }, 3000);
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [tableStatus?.isBooked]);

  // Handle navigation to order tracking
  const handleViewOrderTracking = () => {
    if (tableStatus?.activeOrderId) {
      localStorage.setItem(
        "current_order_id",
        tableStatus.activeOrderId.toString()
      );
      router.push("/order-tracking");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-orange-500" />
          <p className="mt-4 text-muted-foreground">Loading menu...</p>
        </div>
      </div>
    );
  }

  // Show table booked message
  if (tableStatus?.isBooked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <ChefHat className="h-16 w-16 mx-auto text-orange-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">
              Table Currently Occupied
            </h2>
            <p className="text-muted-foreground mb-4">
              This table has an active order in progress. Please wait for the
              current order to be completed.
            </p>
            <div className="flex items-center justify-center gap-2 text-orange-600 font-medium">
              <Clock className="h-5 w-5" />
              <span>Estimated wait time: 15-30 minutes</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => fetchMenuData(true)}
              disabled={isRefreshing}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isRefreshing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                "Check Availability Again"
              )}
            </Button>

            {tableStatus.activeOrderId && (
              <Button
                onClick={handleViewOrderTracking}
                variant="outline"
                className="w-full border-orange-500 text-orange-600 hover:bg-orange-50"
              >
                Track Current Order
              </Button>
            )}

            <p className="text-xs text-muted-foreground">
              This page will automatically refresh every 3 seconds
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">Menu Unavailable</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button
            onClick={() => fetchMenuData()}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <CartProvider vendorId={String(vendor)} tableNo={String(tabel_identifier)}>
      <MenuContent
        categories={categories}
        menuItems={menuItems}
        setMenuItems={setMenuItems}
        vendorInfo={vendorInfo}
        vendor={String(vendor)}
        tabel_identifier={String(tabel_identifier)}
        tableInfo={tableInfo}
        fetchMenuData={fetchMenuData}
      />
    </CartProvider>
  );
}
