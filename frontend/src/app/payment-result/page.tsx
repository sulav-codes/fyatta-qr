"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Home,
  MapPin,
  Receipt,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getApiBaseUrl } from "@/lib/api";

interface OrderDetails {
  id: number;
  invoice_no: string;
  status: string;
  payment_status: string;
  payment_method: string;
  total_amount: string;
  table_name: string;
  transaction_id?: string;
  created_at: string;
}

function PaymentResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [invoiceNo, setInvoiceNo] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const statusParam = searchParams.get("status");
    const orderIdParam = searchParams.get("orderId");
    const invoiceNoParam = searchParams.get("invoice_no");
    const reasonParam = searchParams.get("reason");

    setStatus(statusParam);
    setOrderId(orderIdParam);
    setInvoiceNo(invoiceNoParam);
    setReason(reasonParam);

    // Show confetti for success
    if (statusParam === "success") {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }

    // Fetch order details if orderId is available
    if (orderIdParam) {
      fetchOrderDetails(orderIdParam);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  const fetchOrderDetails = async (orderId: string) => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(
        `${apiBaseUrl}/api/customer/orders/${orderId}`
      );

      if (response.ok) {
        const data = await response.json();
        setOrderDetails(data);
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "success":
        return (
          <div className="relative">
            <div className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
            <CheckCircle2 className="h-24 w-24 text-green-500 relative" />
          </div>
        );
      case "pending":
        return (
          <div className="relative">
            <div className="absolute inset-0 bg-yellow-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
            <Clock className="h-24 w-24 text-yellow-500 relative" />
          </div>
        );
      case "failed":
        return (
          <div className="relative">
            <div className="absolute inset-0 bg-red-500 rounded-full blur-xl opacity-50"></div>
            <XCircle className="h-24 w-24 text-red-500 relative" />
          </div>
        );
      default:
        return <AlertCircle className="h-24 w-24 text-gray-500" />;
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case "success":
        return "Payment Successful!";
      case "pending":
        return "Payment Pending";
      case "failed":
        return "Payment Failed";
      default:
        return "Payment Status Unknown";
    }
  };

  const getStatusMessage = () => {
    if (status === "success") {
      return "Your payment has been processed successfully. Your order has been confirmed and will be prepared shortly.";
    }
    if (status === "pending") {
      return "Your payment is being processed. Please wait for confirmation.";
    }
    if (status === "failed") {
      if (reason === "order-not-found") {
        return "Order not found. Please contact support.";
      }
      if (reason === "amount-mismatch") {
        return "Payment amount does not match order total. Please contact support.";
      }
      if (reason === "invalid-signature") {
        return "Payment verification failed. Please try again.";
      }
      return "Payment failed. Please try again or contact support.";
    }
    return "Unable to determine payment status.";
  };

  const getStatusColor = () => {
    switch (status) {
      case "success":
        return "from-green-50 to-emerald-100 border-green-300";
      case "pending":
        return "from-yellow-50 to-amber-100 border-yellow-300";
      case "failed":
        return "from-red-50 to-rose-100 border-red-300";
      default:
        return "from-gray-50 to-slate-100 border-gray-300";
    }
  };

  const getBgGradient = () => {
    switch (status) {
      case "success":
        return "from-green-50 via-emerald-50 to-teal-50";
      case "pending":
        return "from-yellow-50 via-amber-50 to-orange-50";
      case "failed":
        return "from-red-50 via-rose-50 to-pink-50";
      default:
        return "from-blue-50 to-indigo-100";
    }
  };

  return (
    <div
      className={`min-h-screen bg-gradient-to-br ${getBgGradient()} flex items-center justify-center p-4 relative overflow-hidden`}
    >
      {/* Confetti Effect */}
      {showConfetti && status === "success" && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                backgroundColor: ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b"][
                  Math.floor(Math.random() * 4)
                ],
                animation: `fall ${2 + Math.random() * 2}s linear ${
                  Math.random() * 2
                }s forwards`,
                top: `-10%`,
              }}
            />
          ))}
        </div>
      )}

      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/30 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-2xl w-full relative z-10">
        <div
          className={`bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl border-2 bg-gradient-to-br ${getStatusColor()} overflow-hidden`}
        >
          {/* Header */}
          <div className="p-8 text-center">
            <div className="flex justify-center mb-6">{getStatusIcon()}</div>
            <h1 className="text-4xl font-bold mb-4 text-gray-900 tracking-tight">
              {getStatusTitle()}
            </h1>
            <p className="text-lg text-gray-600 max-w-md mx-auto">
              {getStatusMessage()}
            </p>
          </div>

          {/* Order Details - Full */}
          {!loading && orderDetails && (
            <div className="px-8 pb-6">
              <div className="bg-gradient-to-br from-gray-50 to-slate-100 rounded-2xl p-6 border border-gray-200 shadow-inner">
                <div className="flex items-center gap-2 mb-4">
                  <Receipt className="h-5 w-5 text-gray-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Order Details
                  </h2>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-600">
                      Invoice Number
                    </span>
                    <span className="text-sm font-bold text-gray-900 font-mono">
                      {orderDetails.invoice_no}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-600">
                      Order ID
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      #{orderDetails.id}
                    </span>
                  </div>
                  {orderDetails.table_name && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-600 flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        Table
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        {orderDetails.table_name}
                      </span>
                    </div>
                  )}
                  {orderDetails.transaction_id && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-600">
                        Transaction ID
                      </span>
                      <span className="text-sm font-mono text-gray-900">
                        {orderDetails.transaction_id}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-600">
                      Payment Method
                    </span>
                    <span className="text-sm font-bold text-gray-900 uppercase">
                      {orderDetails.payment_method || "Cash"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg px-4 mt-2">
                    <span className="text-base font-semibold text-gray-700">
                      Total Amount
                    </span>
                    <span className="text-2xl font-bold text-blue-600">
                      Rs. {parseFloat(orderDetails.total_amount).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Order Details - Basic */}
          {!orderDetails && invoiceNo && (
            <div className="px-8 pb-6">
              <div className="bg-gradient-to-br from-gray-50 to-slate-100 rounded-2xl p-6 border border-gray-200">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">
                      Invoice Number
                    </span>
                    <span className="text-sm font-bold text-gray-900 font-mono">
                      {invoiceNo}
                    </span>
                  </div>
                  {orderId && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">
                        Order ID
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        #{orderId}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="px-8 pb-8 space-y-3">
            {status === "success" && orderId && (
              <Button
                onClick={() =>
                  router.push(`/order-tracking?orderId=${orderId}`)
                }
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all"
                size="lg"
              >
                <MapPin className="h-5 w-5 mr-2" />
                Track Your Order
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            )}

            {status === "pending" && orderId && (
              <Button
                onClick={() => fetchOrderDetails(orderId)}
                className="w-full"
                variant="outline"
                size="lg"
              >
                <RefreshCw className="h-5 w-5 mr-2" />
                Check Payment Status
              </Button>
            )}

            {status === "failed" && (
              <Button
                onClick={() => router.back()}
                className="w-full bg-red-600 hover:bg-red-700"
                size="lg"
              >
                Try Again
              </Button>
            )}

            <Button
              onClick={() => router.push("/")}
              variant="outline"
              className="w-full border-2 hover:bg-gray-50"
              size="lg"
            >
              <Home className="h-5 w-5 mr-2" />
              Back to Home
            </Button>
          </div>

          {/* Support Info */}
          {(status === "failed" || status === "pending") && (
            <div className="px-8 pb-8">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <AlertCircle className="h-5 w-5 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-blue-800 font-medium">
                  Need help? Contact support
                </p>
                {invoiceNo && (
                  <p className="text-xs text-blue-600 mt-1">
                    Reference: {invoiceNo}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fall {
          to {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <PaymentResultContent />
    </Suspense>
  );
}
