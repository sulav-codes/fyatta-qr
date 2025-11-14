"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getApiBaseUrl } from "@/lib/api";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

interface OrderDetails {
  id: number;
  invoice_no: string;
  status: string;
  payment_status: string;
  payment_method: string;
  total_amount: number;
  transaction_id?: string;
  table_name?: string;
  items: Array<{
    id: number;
    name: string;
    quantity: number;
    price: number;
  }>;
}

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const orderId = searchParams.get("orderId");
  const status = searchParams.get("status");
  const transactionId = searchParams.get("transaction_id");

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/customer/orders/${orderId}`
      );
      if (response.ok) {
        const data = await response.json();
        setOrderDetails(data);
      }
    } catch (error) {
      console.error("Failed to fetch order details:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = () => {
    switch (status) {
      case "success":
        return {
          icon: <CheckCircle2 className="w-16 h-16" />,
          title: "Payment Successful!",
          message: "Your payment has been processed successfully.",
          iconColor: "text-green-500",
          bgColor: "bg-green-50 dark:bg-green-900/20",
          borderColor: "border-green-200 dark:border-green-800",
        };
      case "pending":
        return {
          icon: <Clock className="w-16 h-16" />,
          title: "Payment Pending",
          message: "Your payment is being processed. Please wait...",
          iconColor: "text-yellow-500",
          bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
          borderColor: "border-yellow-200 dark:border-yellow-800",
        };
      case "failed":
      default:
        return {
          icon: <XCircle className="w-16 h-16" />,
          title: "Payment Failed",
          message: "Unfortunately, your payment could not be processed.",
          iconColor: "text-red-500",
          bgColor: "bg-red-50 dark:bg-red-900/20",
          borderColor: "border-red-200 dark:border-red-800",
        };
    }
  };

  const statusConfig = getStatusConfig();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-[var(--orange)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Status Card */}
        <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className={`text-center py-8 px-6 border-b ${statusConfig.borderColor} ${statusConfig.bgColor}`}>
            <div className="flex justify-center mb-4">
              <div className={statusConfig.iconColor}>
                {statusConfig.icon}
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2">
              {statusConfig.title}
            </h1>
            <p className="text-muted-foreground">
              {statusConfig.message}
            </p>
          </div>

          {/* Order Details */}
          {orderDetails && (
            <div className="px-6 py-6">
              <h2 className="text-xl font-semibold mb-4">
                Order Details
              </h2>

              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Order ID</span>
                  <span className="font-semibold">
                    #{orderDetails.invoice_no}
                  </span>
                </div>

                {orderDetails.table_name && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Table</span>
                    <span className="font-semibold">
                      {orderDetails.table_name}
                    </span>
                  </div>
                )}

                {transactionId && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Transaction ID</span>
                    <span className="font-mono text-sm">
                      {transactionId}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Payment Method</span>
                  <span className="font-semibold">
                    {orderDetails.payment_method || "eSewa"}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Payment Status</span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      orderDetails.payment_status === "paid"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                    }`}
                  >
                    {orderDetails.payment_status}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 pt-4">
                  <span className="text-lg font-semibold">
                    Total Amount
                  </span>
                  <span className="text-2xl font-bold text-[var(--orange)]">
                    रू {orderDetails.total_amount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Items List */}
              {orderDetails.items && orderDetails.items.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3">
                    Order Items
                  </h3>
                  <div className="bg-muted rounded-lg p-4 space-y-2">
                    {orderDetails.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center py-2 border-b last:border-0"
                      >
                        <div className="flex-1">
                          <p className="font-medium">
                            {item.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Qty: {item.quantity}
                          </p>
                        </div>
                        <span className="font-semibold">
                          रू {(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="px-6 py-6 bg-muted/50 space-y-3 border-t">
            {status === "success" && (
              <Link href={`/order-tracking?orderId=${orderId}`} className="block">
                <Button className="w-full bg-[var(--orange)] hover:bg-[var(--orange)]/90 text-white">
                  Track Your Order
                </Button>
              </Link>
            )}

            {status === "pending" && (
              <Button
                onClick={fetchOrderDetails}
                className="w-full bg-[var(--orange)] hover:bg-[var(--orange)]/90 text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Check Payment Status
              </Button>
            )}

            {status === "failed" && (
              <Link href="/" className="block">
                <Button className="w-full bg-[var(--orange)] hover:bg-[var(--orange)]/90 text-white">
                  Try Again
                </Button>
              </Link>
            )}

            <Link href="/" className="block">
              <Button
                variant="outline"
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-[var(--orange)]" />
        </div>
      }
    >
      <PaymentResultContent />
    </Suspense>
  );
}
