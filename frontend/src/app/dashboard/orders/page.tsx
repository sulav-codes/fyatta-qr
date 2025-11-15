"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { getApiBaseUrl } from "@/lib/api";
import toast from "react-hot-toast";
import { io, Socket } from "socket.io-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import {
  Filter,
  Search,
  MoreVertical,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  Truck,
  Ban,
  AlertTriangle,
  Loader2,
} from "lucide-react";

// Types
interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: number;
  invoice_no: string;
  invoiceNo?: string;
  orderId?: string;
  status: string;
  total_amount: number;
  totalAmount?: number;
  items: OrderItem[];
  items_text: string;
  created_at: string;
  createdAt?: string;
  updated_at: string;
  table_identifier: string;
  tableIdentifier?: string;
  table_name?: string;
  tableName?: string;
  customer_verified: boolean;
  customerVerified?: boolean;
  verification_timestamp: string | null;
  verificationTimestamp?: string | null;
  delivery_issue_reported: boolean;
  deliveryIssueReported?: boolean;
  issue_description: string | null;
  issueDescription?: string | null;
  issue_report_timestamp: string | null;
  issueReportTimestamp?: string | null;
  issue_resolved: boolean;
  issue_resolution_timestamp: string | null;
  resolution_message: string | null;
}

// Status styling
const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; icon: React.ReactNode }
> = {
  pending: {
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-800 dark:text-yellow-300",
    icon: <Clock className="w-4 h-4" />,
  },
  accepted: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-800 dark:text-blue-300",
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  confirmed: {
    bg: "bg-cyan-100 dark:bg-cyan-900/30",
    text: "text-cyan-800 dark:text-cyan-300",
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  preparing: {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-800 dark:text-purple-300",
    icon: <Package className="w-4 h-4" />,
  },
  ready: {
    bg: "bg-indigo-100 dark:bg-indigo-900/30",
    text: "text-indigo-800 dark:text-indigo-300",
    icon: <Package className="w-4 h-4" />,
  },
  delivered: {
    bg: "bg-teal-100 dark:bg-teal-900/30",
    text: "text-teal-800 dark:text-teal-300",
    icon: <Truck className="w-4 h-4" />,
  },
  completed: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-800 dark:text-green-300",
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  cancelled: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-800 dark:text-red-300",
    icon: <XCircle className="w-4 h-4" />,
  },
  rejected: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-800 dark:text-red-300",
    icon: <Ban className="w-4 h-4" />,
  },
};

const formatStatus = (status: string): string => {
  if (!status) return "Created";

  const statusMap: Record<string, string> = {
    pending: "Pending",
    accepted: "Accepted",
    confirmed: "Confirmed",
    rejected: "Rejected",
    preparing: "Preparing",
    ready: "Ready for Pickup",
    delivered: "Delivered",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
};

const formatTimeElapsed = (timestamp: string): string => {
  if (!timestamp) return "N/A";

  try {
    const now = new Date();
    const orderTime = new Date(timestamp);
    const diff = now.getTime() - orderTime.getTime();

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    if (minutes > 0) return `${minutes} min${minutes > 1 ? "s" : ""} ago`;
    return "Just now";
  } catch {
    return "N/A";
  }
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [updating, setUpdating] = useState<number | null>(null);
  const [activeFilters, setActiveFilters] = useState({
    status: [] as string[],
    timeRange: "all",
  });
  const [socketConnected, setSocketConnected] = useState(false);

  const { user, token } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const localUpdateRef = useRef<Set<number>>(new Set());

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    if (!user?.id || !token) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${getApiBaseUrl()}/api/vendors/${user.id}/orders`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.status}`);
      }

      const data = await response.json();

      const processedOrders = (data.orders || []).map((order: any) => {
        const itemsText = Array.isArray(order.items)
          ? order.items
              .map((item: any) => `${item.quantity}x ${item.name}`)
              .join(", ")
          : "No items";

        return {
          ...order,
          items_text: itemsText,
          // Map camelCase to snake_case for consistent access
          invoice_no: order.invoiceNo,
          total_amount: order.totalAmount,
          created_at: order.createdAt || order.timestamp,
          table_identifier: order.tableIdentifier,
          table_name: order.tableName,
          customer_verified: Boolean(order.customerVerified),
          delivery_issue_reported: Boolean(order.deliveryIssueReported),
          issue_description: order.issueDescription,
        };
      });

      setOrders(processedOrders);
      setError(null);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError("Failed to load orders. Please try again.");
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [user?.id, token]);

  // WebSocket for real-time updates
  useEffect(() => {
    if (!user?.id || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    fetchOrders();

    const apiBaseUrl = getApiBaseUrl();
    const socket = io(apiBaseUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Orders] WebSocket connected:", socket.id);
      setSocketConnected(true);
      socket.emit("join-vendor", user.id);
    });

    // Handle new orders
    socket.on("order-created", (data: any) => {
      console.log("[Orders] New order received:", data);
      toast.success(`New order #${data.orderId || data.order_id} received!`);
      fetchOrders();
    });

    // Handle order status changes
    socket.on("order-status-changed", (data: any) => {
      console.log("[Orders] Order status changed:", data);
      const orderId = data.orderId || data.order_id;
      const newStatus = data.newStatus || data.new_status || data.status;

      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status: newStatus,
                updated_at: new Date().toISOString(),
              }
            : order
        )
      );

      // Only show toast if this wasn't a local update
      if (!localUpdateRef.current.has(orderId)) {
        toast.success(
          `Order #${orderId} status updated to ${formatStatus(newStatus)}`
        );
      } else {
        // Remove from tracking after handling
        localUpdateRef.current.delete(orderId);
      }
    });

    // Handle customer verification
    socket.on("order-verified", (data: any) => {
      console.log("[Orders] Order verified by customer:", data);
      const orderId = data.orderId || data.order_id;

      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId
            ? {
                ...order,
                customer_verified: true,
                verification_timestamp:
                  data.verificationTimestamp ||
                  data.verification_timestamp ||
                  new Date().toISOString(),
              }
            : order
        )
      );
      toast.success(`✅ Order #${orderId} verified by customer`);
    });

    // Handle delivery issues
    socket.on("delivery-issue", (data: any) => {
      console.log("[Orders] Delivery issue reported:", data);
      const orderId = data.orderId || data.order_id;

      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId
            ? {
                ...order,
                delivery_issue_reported: true,
                issue_description:
                  data.issueDescription || data.issue_description,
                issue_report_timestamp:
                  data.issueReportTimestamp ||
                  data.issue_report_timestamp ||
                  new Date().toISOString(),
              }
            : order
        )
      );
      toast.error(`⚠️ Customer reported issue with order #${orderId}`);
    });

    // Handle notifications (general purpose)
    socket.on("notification", (data: any) => {
      console.log("[Orders] Notification received:", data);
      // Notifications are handled by specific event listeners above
      // This listener is kept for any future general notifications
    });

    socket.on("connect_error", (error) => {
      console.error("[Orders] WebSocket connection error:", error);
      setSocketConnected(false);
    });

    socket.on("disconnect", (reason) => {
      console.log("[Orders] WebSocket disconnected:", reason);
      setSocketConnected(false);
    });

    socket.on("reconnect", (attemptNumber) => {
      console.log(
        "[Orders] WebSocket reconnected after",
        attemptNumber,
        "attempts"
      );
      setSocketConnected(true);
      socket.emit("join-vendor", user.id);
      fetchOrders(); // Refresh orders on reconnection
    });

    return () => {
      if (socket) {
        socket.emit("leave-vendor", user.id);
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [user?.id, token, fetchOrders]);

  // Update order status
  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    if (!token) return;

    try {
      setUpdating(orderId);

      // Mark this as a local update to prevent duplicate toast from socket
      localUpdateRef.current.add(orderId);

      const response = await fetch(
        `${getApiBaseUrl()}/api/orders/${orderId}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) {
        // Remove from tracking if API call fails
        localUpdateRef.current.delete(orderId);
        throw new Error("Failed to update order status");
      }

      const updatedOrder = await response.json();

      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status:
                  updatedOrder.status || updatedOrder.newStatus || newStatus,
                updated_at: new Date().toISOString(),
              }
            : order
        )
      );

      // Don't show toast here - NotificationContext will show the 🔔 notification
      // toast.success(`Order status updated to ${formatStatus(newStatus)}`);
    } catch (err) {
      console.error("Error updating order:", err);
      toast.error("Failed to update order status");
    } finally {
      setUpdating(null);
    }
  };

  // Filter handlers
  const toggleStatusFilter = useCallback((status: string) => {
    setActiveFilters((prev) => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter((s) => s !== status)
        : [...prev.status, status],
    }));
  }, []);

  const setTimeRangeFilter = useCallback((range: string) => {
    setActiveFilters((prev) => ({ ...prev, timeRange: range }));
  }, []);

  const resetFilters = useCallback(() => {
    setActiveFilters({ status: [], timeRange: "all" });
    setSearchTerm("");
    toast.success("Filters reset");
  }, []);

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        (order.invoice_no || "").toLowerCase().includes(searchLower) ||
        (order.table_identifier || "").toLowerCase().includes(searchLower) ||
        (order.table_name || "").toLowerCase().includes(searchLower) ||
        (order.status || "").toLowerCase().includes(searchLower) ||
        (order.items_text || "").toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      if (
        activeFilters.status.length > 0 &&
        !activeFilters.status.includes(order.status)
      ) {
        return false;
      }

      if (activeFilters.timeRange !== "all") {
        const orderTime = new Date(order.created_at || "");
        const now = new Date();
        const diffHours =
          (now.getTime() - orderTime.getTime()) / (1000 * 60 * 60);

        if (activeFilters.timeRange === "1h" && diffHours > 1) return false;
        if (activeFilters.timeRange === "6h" && diffHours > 6) return false;
        if (activeFilters.timeRange === "24h" && diffHours > 24) return false;
        if (activeFilters.timeRange === "7d" && diffHours > 168) return false;
      }

      return true;
    });
  }, [orders, searchTerm, activeFilters]);

  const activeFilterCount =
    activeFilters.status.length + (activeFilters.timeRange !== "all" ? 1 : 0);

  // Stats calculation
  const stats = useMemo(() => {
    return {
      delivered: orders.filter((o) => o.status === "delivered").length,
      awaitingVerification: orders.filter(
        (o) => o.status === "delivered" && !o.customer_verified
      ).length,
      verified: orders.filter((o) => o.customer_verified).length,
      activeIssues: orders.filter(
        (o) =>
          o.delivery_issue_reported &&
          o.status === "delivered" &&
          !o.customer_verified
      ).length,
      active: orders.filter((o) =>
        ["pending", "accepted", "confirmed", "preparing", "ready"].includes(
          o.status
        )
      ).length,
    };
  }, [orders]);

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Orders
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your restaurant orders
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {stats.activeIssues > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                  {stats.activeIssues} Active Issue
                  {stats.activeIssues > 1 ? "s" : ""}
                </span>
              </div>
            )}

            {/* WebSocket Connection Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-card/50">
              <div
                className={`h-2 w-2 rounded-full ${
                  socketConnected ? "bg-green-500 animate-pulse" : "bg-gray-400"
                }`}
              ></div>
              <span className="text-xs text-muted-foreground">
                {socketConnected ? "Live updates" : "Offline"}
              </span>
            </div>

            <Button onClick={fetchOrders} disabled={loading} variant="outline">
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-card rounded-xl border shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
              <p className="text-sm font-medium text-muted-foreground">
                Delivered
              </p>
            </div>
            <p className="text-3xl font-bold mb-1">{stats.delivered}</p>
            <p className="text-xs text-muted-foreground">
              {stats.awaitingVerification} awaiting verification
            </p>
          </div>

          <div className="bg-card rounded-xl border shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <p className="text-sm font-medium text-muted-foreground">
                Verified
              </p>
            </div>
            <p className="text-3xl font-bold mb-1">{stats.verified}</p>
            <p className="text-xs text-muted-foreground">Customer verified</p>
          </div>

          <div className="bg-card rounded-xl border shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>
              <p className="text-sm font-medium text-muted-foreground">
                Active Issues
              </p>
            </div>
            <p className="text-3xl font-bold mb-1">{stats.activeIssues}</p>
            <p className="text-xs text-muted-foreground">Unresolved reports</p>
          </div>

          <div className="bg-card rounded-xl border shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse"></div>
              <p className="text-sm font-medium text-muted-foreground">
                Active Orders
              </p>
            </div>
            <p className="text-3xl font-bold mb-1">{stats.active}</p>
            <p className="text-xs text-muted-foreground">In progress</p>
          </div>

          <div className="bg-card rounded-xl border shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 rounded-full bg-gray-500"></div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Orders
              </p>
            </div>
            <p className="text-3xl font-bold mb-1">{orders.length}</p>
            <p className="text-xs text-muted-foreground">All time</p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span>Filter</span>
                {activeFilterCount > 0 && (
                  <span className="flex items-center justify-center rounded-full bg-primary w-5 h-5 text-[10px] text-primary-foreground font-medium">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60">
              <DropdownMenuLabel>Filter Orders</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 flex items-center justify-center">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          activeFilters.status.length > 0
                            ? "bg-primary"
                            : "bg-muted"
                        }`}
                      ></span>
                    </span>
                    <span>Status</span>
                  </div>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    {Object.keys(STATUS_STYLES).map((status) => (
                      <DropdownMenuCheckboxItem
                        key={status}
                        checked={activeFilters.status.includes(status)}
                        onCheckedChange={() => toggleStatusFilter(status)}
                      >
                        {formatStatus(status)}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Time Range</span>
                  </div>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => setTimeRangeFilter("all")}>
                      All Time
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTimeRangeFilter("1h")}>
                      Last Hour
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTimeRangeFilter("6h")}>
                      Last 6 Hours
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTimeRangeFilter("24h")}>
                      Last 24 Hours
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTimeRangeFilter("7d")}>
                      Last 7 Days
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={resetFilters}>
                Reset Filters
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="bg-card border rounded-xl p-12 text-center">
            <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium text-muted-foreground">
              No orders found
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting your filters or search term
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const statusStyle =
                STATUS_STYLES[order.status] || STATUS_STYLES.pending;
              return (
                <div
                  key={order.id}
                  className="bg-card border rounded-xl p-5 hover:shadow-lg transition-all duration-200 hover:border-primary/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      {/* Order Header */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-lg">
                          #{order.invoice_no}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}
                        >
                          {statusStyle.icon}
                          {formatStatus(order.status)}
                        </span>
                        {order.customer_verified && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-green-600 px-2.5 py-0.5 text-xs font-semibold text-green-600 dark:border-green-500 dark:text-green-400">
                            <CheckCircle2 className="w-3 h-3" />
                            Verified
                          </span>
                        )}
                        {order.delivery_issue_reported &&
                          !order.issue_resolved && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-900/20 dark:text-red-200">
                              <AlertCircle className="w-3 h-3" />
                              Issue Reported
                            </span>
                          )}
                      </div>

                      {/* Order Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <span className="text-muted-foreground min-w-[60px] font-medium">
                              Table:
                            </span>
                            <span className="text-foreground font-semibold">
                              {order.table_name ||
                                order.table_identifier ||
                                "N/A"}
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-muted-foreground min-w-[60px] font-medium">
                              Items:
                            </span>
                            <span className="text-foreground line-clamp-2">
                              {order.items_text}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <span className="text-muted-foreground min-w-[60px] font-medium">
                              Amount:
                            </span>
                            <span className="text-foreground font-bold text-lg">
                              Rs. {Number(order.total_amount || 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-muted-foreground text-xs">
                              {formatTimeElapsed(order.created_at || "")}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Issue Description */}
                      {order.delivery_issue_reported &&
                        order.issue_description && (
                          <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                            <div className="flex items-start gap-2 text-red-800 dark:text-red-200">
                              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <div className="text-sm">
                                <strong>Customer Issue:</strong>{" "}
                                {order.issue_description}
                              </div>
                            </div>
                          </div>
                        )}
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={updating === order.id}
                        >
                          {updating === order.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <MoreVertical className="w-4 h-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            updateOrderStatus(order.id, "accepted")
                          }
                          disabled={order.status !== "pending"}
                        >
                          Accept Order
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            updateOrderStatus(order.id, "confirmed")
                          }
                          disabled={order.status !== "accepted"}
                        >
                          Confirm Order
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            updateOrderStatus(order.id, "preparing")
                          }
                          disabled={
                            order.status !== "accepted" &&
                            order.status !== "confirmed"
                          }
                        >
                          Start Preparing
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => updateOrderStatus(order.id, "ready")}
                          disabled={order.status !== "preparing"}
                        >
                          Mark as Ready
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            updateOrderStatus(order.id, "delivered")
                          }
                          disabled={order.status !== "ready"}
                        >
                          Mark as Delivered
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            updateOrderStatus(order.id, "completed")
                          }
                          disabled={order.status !== "delivered"}
                        >
                          Complete Order
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() =>
                            updateOrderStatus(order.id, "rejected")
                          }
                          disabled={order.status !== "pending"}
                          className="text-red-600 dark:text-red-400"
                        >
                          Reject Order
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            updateOrderStatus(order.id, "cancelled")
                          }
                          disabled={[
                            "completed",
                            "cancelled",
                            "rejected",
                          ].includes(order.status)}
                          className="text-red-600 dark:text-red-400"
                        >
                          Cancel Order
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
