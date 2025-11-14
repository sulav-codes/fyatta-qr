"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { getApiBaseUrl } from "@/lib/api";
import toast from "react-hot-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
  status: string;
  total_amount: number;
  items: OrderItem[];
  items_text: string;
  created_at: string;
  updated_at: string;
  table_identifier: string;
  customer_verified: boolean;
  verification_timestamp: string | null;
  delivery_issue_reported: boolean;
  issue_description: string | null;
  issue_report_timestamp: string | null;
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
    bg: "bg-gray-100 dark:bg-gray-900/30",
    text: "text-gray-800 dark:text-gray-300",
    icon: <Ban className="w-4 h-4" />,
  },
};

// Helper functions
const formatStatus = (status: string) => {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const formatTimeElapsed = (timestamp: string) => {
  const now = new Date();
  const orderTime = new Date(timestamp);
  const diffMs = now.getTime() - orderTime.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return "Just now";
};

export default function OrdersPage() {
  const { user, token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    if (!user?.id || !token) return;

    try {
      if (orders.length === 0) {
        setLoading(true);
      }
      setError(null);

      const response = await fetch(
        `${getApiBaseUrl()}/api/orders/${user.id}/`,
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

      const processedOrders = data.orders.map((order: any) => {
        const itemsText = Array.isArray(order.items)
          ? order.items
              .map((item: OrderItem) => `${item.quantity}x ${item.name}`)
              .join(", ")
          : "No items";

        return {
          ...order,
          items_text: itemsText,
          customer_verified: Boolean(order.customer_verified),
          verification_timestamp: order.verification_timestamp || null,
          delivery_issue_reported: Boolean(order.delivery_issue_reported),
          issue_description: order.issue_description || null,
          issue_report_timestamp: order.issue_report_timestamp || null,
          issue_resolved: Boolean(order.issue_resolved),
          issue_resolution_timestamp: order.issue_resolution_timestamp || null,
          resolution_message: order.resolution_message || null,
        };
      });

      setOrders(processedOrders);
      setError(null);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError("Failed to load orders. Please try again.");
      if (orders.length === 0) {
        toast.error("Failed to load orders");
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id, token, orders.length]);

  // Polling for real-time updates (every 5 seconds)
  useEffect(() => {
    if (!user?.id || !token) return;

    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);

    return () => clearInterval(interval);
  }, [user?.id, token, fetchOrders]);

  // Update order status
  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    if (!token) return;

    try {
      setUpdating(orderId);

      const response = await fetch(
        `${getApiBaseUrl()}/api/orders/${orderId}/status/`,
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
        throw new Error("Failed to update order status");
      }

      const updatedOrder = await response.json();

      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? { ...order, status: updatedOrder.status }
            : order
        )
      );

      toast.success(`Order status updated to ${formatStatus(newStatus)}`);
    } catch (err) {
      console.error("Error updating order:", err);
      toast.error("Failed to update order status");
    } finally {
      setUpdating(null);
    }
  };

  // Filter orders
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    if (statusFilter !== "all") {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.invoice_no.toLowerCase().includes(query) ||
          order.items_text.toLowerCase().includes(query) ||
          order.table_identifier.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [orders, statusFilter, searchTerm]);

  // Status counts for filters
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    orders.forEach((order) => {
      counts[order.status] = (counts[order.status] || 0) + 1;
    });
    return counts;
  }, [orders]);

  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) + (searchTerm ? 1 : 0);

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage and track all your orders
          </p>
        </div>
        <Button onClick={fetchOrders} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
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
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by invoice, items, or table..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Status {activeFilterCount > 0 && `(${activeFilterCount})`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setStatusFilter("all")}>
              All Orders ({statusCounts.all || 0})
            </DropdownMenuItem>
            {Object.keys(STATUS_STYLES).map((status) => (
              <DropdownMenuItem
                key={status}
                onClick={() => setStatusFilter(status)}
              >
                {formatStatus(status)} ({statusCounts[status] || 0})
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No orders found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const statusStyle =
              STATUS_STYLES[order.status] || STATUS_STYLES.pending;
            return (
              <div
                key={order.id}
                className="bg-white dark:bg-gray-800 border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    {/* Order Header */}
                    <div className="flex items-center gap-3">
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
                        <span className="inline-flex items-center gap-1 rounded-full border border-green-600 px-2.5 py-0.5 text-xs font-semibold text-green-600">
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
                    <div className="text-sm space-y-1">
                      <p className="text-gray-600 dark:text-gray-400">
                        <strong>Table:</strong> {order.table_identifier}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        <strong>Items:</strong> {order.items_text}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        <strong>Amount:</strong> ₹
                        {order.total_amount.toFixed(2)}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {formatTimeElapsed(order.created_at)}
                      </p>
                    </div>

                    {/* Issue Description */}
                    {order.delivery_issue_reported &&
                      order.issue_description && (
                        <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                          <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm">
                              <strong>Issue:</strong> {order.issue_description}
                            </span>
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
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <MoreVertical className="w-4 h-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => updateOrderStatus(order.id, "accepted")}
                        disabled={order.status !== "pending"}
                      >
                        Accept
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => updateOrderStatus(order.id, "preparing")}
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
                        Mark Ready
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => updateOrderStatus(order.id, "delivered")}
                        disabled={order.status !== "ready"}
                      >
                        Mark Delivered
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => updateOrderStatus(order.id, "completed")}
                        disabled={order.status !== "delivered"}
                      >
                        Complete Order
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => updateOrderStatus(order.id, "rejected")}
                        disabled={order.status !== "pending"}
                        className="text-red-600"
                      >
                        Reject Order
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => updateOrderStatus(order.id, "cancelled")}
                        disabled={[
                          "completed",
                          "cancelled",
                          "rejected",
                        ].includes(order.status)}
                        className="text-red-600"
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
  );
}
