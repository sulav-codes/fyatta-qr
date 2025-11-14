"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getApiBaseUrl } from "@/lib/api";
import {
  CheckCircle2,
  Clock,
  Package,
  ChefHat,
  Truck,
  Receipt,
  RefreshCw,
  ArrowLeft,
  Sun,
  Moon,
} from "lucide-react";
import Link from "next/link";
import { io, Socket } from "socket.io-client";
import toast from "react-hot-toast";
import { useTheme } from "@/components/ThemeProvider";

interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
}

interface OrderDetails {
  id: number;
  invoice_no: string;
  status: string;
  payment_status: string;
  payment_method: string;
  total_amount: number;
  table_name?: string;
  transaction_id?: string;
  vendor_id?: number;
  vendor_name?: string;
  table_identifier?: string;
  items: OrderItem[];
}

const ORDER_STEPS = [
  { key: "pending", label: "Placed", icon: Receipt },
  { key: "accepted", label: "Accepted", icon: CheckCircle2 },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { key: "preparing", label: "Preparing", icon: ChefHat },
  { key: "ready", label: "Ready", icon: Package },
  { key: "delivered", label: "Delivered", icon: Truck },
  { key: "completed", label: "Completed", icon: CheckCircle2 },
];

function OrderTrackingContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const vendorIdParam = searchParams.get("vendorId");
  const tableIdentifierParam = searchParams.get("tableIdentifier");
  const { theme, toggleTheme } = useTheme();

  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch order details
  const fetchOrderDetails = async () => {
    if (!orderId) {
      setLoading(false);
      return null;
    }

    try {
      console.log("Fetching order details for:", orderId);
      const response = await fetch(
        `${getApiBaseUrl()}/api/customer/orders/${orderId}`
      );

      if (!response.ok) {
        console.error("Failed to fetch order:", response.status);
        toast.error("Failed to load order details");
        setLoading(false);
        return null;
      }

      const data = await response.json();
      console.log("Order details received:", data);
      setOrderDetails(data);
      setLastUpdate(new Date());
      setLoading(false);
      return data;
    } catch (error) {
      console.error("Failed to fetch order details:", error);
      toast.error("Failed to load order details");
      setLoading(false);
      return null;
    }
  };

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchOrderDetails().then((data) => {
      // Setup WebSocket connection after initial fetch
      const newSocket = io(getApiBaseUrl(), {
        transports: ["websocket"],
        reconnection: true,
      });

      newSocket.on("connect", () => {
        console.log("Socket connected");
        setIsConnected(true);

        // Join room if we have the data
        if (data && data.vendor_id && data.table_identifier) {
          newSocket.emit("join-table", {
            vendorId: data.vendor_id,
            tableIdentifier: data.table_identifier,
          });
          console.log(
            `Joined room: table-${data.vendor_id}-${data.table_identifier}`
          );
        } else if (
          orderDetails &&
          orderDetails.vendor_id &&
          orderDetails.table_identifier
        ) {
          // Use current orderDetails if data is null
          newSocket.emit("join-table", {
            vendorId: orderDetails.vendor_id,
            tableIdentifier: orderDetails.table_identifier,
          });
          console.log(
            `Joined room: table-${orderDetails.vendor_id}-${orderDetails.table_identifier}`
          );
        }
      });

      newSocket.on("disconnect", () => {
        console.log("Socket disconnected");
        setIsConnected(false);
      });

      newSocket.on("order-status-update", (data) => {
        console.log("Received order-status-update:", data);
        if (data.orderId === parseInt(orderId)) {
          setOrderDetails((prev) =>
            prev ? { ...prev, status: data.status } : null
          );
          setLastUpdate(new Date());
          toast.success(`Order status: ${data.status}`);
        }
      });

      newSocket.on("order-status-changed", (data) => {
        console.log("Received order-status-changed:", data);
        if (data.orderId === parseInt(orderId)) {
          setOrderDetails((prev) =>
            prev ? { ...prev, status: data.newStatus || data.status } : null
          );
          setLastUpdate(new Date());
          toast.success(`Order status: ${data.newStatus || data.status}`);
        }
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    });
  }, [orderId]);

  const getCurrentStepIndex = () => {
    if (!orderDetails) return 0;
    const index = ORDER_STEPS.findIndex(
      (step) => step.key === orderDetails.status
    );
    return index >= 0 ? index : 0;
  };

  const getProgressPercentage = () => {
    const currentIndex = getCurrentStepIndex();
    return ((currentIndex + 1) / ORDER_STEPS.length) * 100;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-[var(--orange)]" />
      </div>
    );
  }

  if (!orderDetails) {
    // Try to construct menu URL from params or fallback to home
    const fallbackMenuUrl =
      vendorIdParam && tableIdentifierParam
        ? `/menu/${vendorIdParam}/${tableIdentifierParam}`
        : "/";

    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="bg-card border rounded-xl shadow-sm p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold mb-2">Order Not Found</h2>
          <p className="text-muted-foreground mb-6">
            We couldn't find the order you're looking for.
          </p>
          <Link href={fallbackMenuUrl}>
            <Button className="bg-[var(--orange)] hover:bg-[var(--orange)]/90 text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Menu
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentStepIndex = getCurrentStepIndex();
  const menuUrl =
    orderDetails.vendor_id && orderDetails.table_identifier
      ? `/menu/${orderDetails.vendor_id}/${orderDetails.table_identifier}`
      : "/";

  const handleBackToMenu = () => {
    // Set flag to prevent toast from showing
    sessionStorage.setItem("from_order_tracking", "true");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Menu-style Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-b border-border shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">
              {orderDetails.vendor_name || "Restaurant"}
            </h1>
            {orderDetails.table_name && (
              <p className="text-xs text-muted-foreground">
                {orderDetails.table_name}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={toggleTheme}
              variant="ghost"
              size="icon"
              className="transition-colors"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              onClick={handleBackToMenu}
            >
              <Link href={menuUrl}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Menu
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="bg-card border rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">
                Order #{orderDetails.invoice_no}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-card/50">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-xs text-muted-foreground">Live</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-card/50">
                  <div className="h-2 w-2 rounded-full bg-gray-500"></div>
                  <span className="text-xs text-muted-foreground">Offline</span>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative pt-2">
            <div className="overflow-hidden h-2 text-xs flex rounded-full bg-muted">
              <div
                style={{ width: `${getProgressPercentage()}%` }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-[var(--orange)] transition-all duration-500"
              ></div>
            </div>
          </div>
        </div>

        {/* Order Timeline */}
        <div className="bg-card border rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-6">Order Progress</h2>
          <div className="space-y-4">
            {ORDER_STEPS.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;

              return (
                <div key={step.key} className="flex items-center gap-4">
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center ${
                      isCompleted
                        ? "bg-[var(--orange)] border-[var(--orange)] text-white"
                        : "bg-muted border-border text-muted-foreground"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div
                      className={`font-medium ${
                        isCompleted
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </div>
                    {isCurrent && (
                      <div className="text-sm text-[var(--orange)]">
                        Current Status
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Details */}
        <div className="bg-card border rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Order Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orderDetails.table_name && (
              <div className="py-2 border-b">
                <span className="text-sm text-muted-foreground">Table</span>
                <p className="font-semibold">{orderDetails.table_name}</p>
              </div>
            )}

            <div className="py-2 border-b">
              <span className="text-sm text-muted-foreground">
                Payment Status
              </span>
              <p>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    orderDetails.payment_status === "paid"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                  }`}
                >
                  {orderDetails.payment_status}
                </span>
              </p>
            </div>

            <div className="py-2 border-b">
              <span className="text-sm text-muted-foreground">
                Payment Method
              </span>
              <p className="font-semibold">
                {orderDetails.payment_method || "eSewa"}
              </p>
            </div>

            {orderDetails.transaction_id && (
              <div className="py-2 border-b">
                <span className="text-sm text-muted-foreground">
                  Transaction ID
                </span>
                <p className="font-mono text-sm">
                  {orderDetails.transaction_id}
                </p>
              </div>
            )}

            <div className="py-2 border-b md:col-span-2">
              <span className="text-sm text-muted-foreground">
                Total Amount
              </span>
              <p className="text-2xl font-bold text-[var(--orange)]">
                रू {Number(orderDetails.total_amount).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Order Items */}
        {orderDetails.items && orderDetails.items.length > 0 && (
          <div className="bg-card border rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Order Items</h2>
            <div className="space-y-3">
              {orderDetails.items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center py-3 border-b last:border-0"
                >
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Qty: {item.quantity} × रू {Number(item.price).toFixed(2)}
                    </p>
                  </div>
                  <span className="font-semibold">
                    रू {(Number(item.price) * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={fetchOrderDetails}
            className="w-full bg-[var(--orange)] hover:bg-[var(--orange)]/90 text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Order Status
          </Button>
          <Link href={menuUrl} className="block" onClick={handleBackToMenu}>
            <Button variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Menu
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderTrackingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-[var(--orange)]" />
        </div>
      }
    >
      <OrderTrackingContent />
    </Suspense>
  );
}
