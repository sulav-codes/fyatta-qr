"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle, XCircle, Eye, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import { getApiBaseUrl } from "@/lib/api";

interface OrderNotificationProps {
  notification: {
    id: string | number;
    type: string;
    title: string;
    message: string;
    timestamp?: string;
    created_at?: string;
    read: boolean;
    data?: {
      order_id?: number;
      table_name?: string;
      total_amount?: number;
      items?: Array<{
        name: string;
        quantity: number;
        price: number;
      }>;
    };
  };
  onClose?: (id: string | number) => void;
  onAction?: (orderId: number, action: string) => void;
}

const OrderNotification: React.FC<OrderNotificationProps> = ({
  notification,
  onClose,
  onAction,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isPinned, setIsPinned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { token } = useAuth();

  const orderData = notification.data || {};

  useEffect(() => {
    if (!isPinned && !isProcessing && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (!isPinned && !isProcessing && timeLeft === 0) {
      handleClose();
    }
  }, [timeLeft, isPinned, isProcessing]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose?.(notification.id), 300);
  };

  const handleOrderAction = async (action: string) => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);

      const order_id = orderData?.order_id;

      if (!order_id) {
        console.error("Missing order_id in notification data:", orderData);
        toast.error("Cannot update order: missing order ID");
        return;
      }

      console.log(`Updating order ${order_id} status to ${action}`);

      const response = await fetch(
        `${getApiBaseUrl()}/api/orders/${order_id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: action }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to update order status: ${response.status}`
        );
      }

      const data = await response.json();
      console.log("Order status update response:", data);

      // Call the onAction callback with order ID and action
      onAction?.(order_id, action);

      // Close the notification
      handleClose();
    } catch (error: any) {
      console.error("Error updating order status:", error);
      toast.error(`Failed to update order status: ${error.message}`);
      setIsProcessing(false);
    }
  };

  const handleViewOrder = () => {
    if (orderData?.order_id) {
      window.location.href = `/dashboard/orders?highlight=${orderData.order_id}`;
    } else {
      console.error("Missing order_id in notification data:", orderData);
      toast.error("Cannot view order: missing order ID");
    }
    handleClose();
  };

  if (!isVisible) return null;

  return (
    <div
      className={`
      fixed top-20 right-4 z-50 w-96 max-w-[calc(100vw-2rem)]
      bg-card border border-border rounded-xl shadow-lg
      transform transition-all duration-300 ease-in-out
      ${isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}
    `}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-[var(--orange)] rounded-full animate-pulse" />
            <h3 className="font-semibold text-sm">New Order Received</h3>
          </div>
          <div className="flex items-center space-x-2">
            {!isPinned && !isProcessing && (
              <span className="text-xs text-muted-foreground">{timeLeft}s</span>
            )}
            {!isProcessing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPinned(!isPinned)}
                className="h-6 w-6 p-0"
              >
                <Clock
                  className={`h-3 w-3 ${
                    isPinned ? "text-[var(--orange)]" : "text-muted-foreground"
                  }`}
                />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-6 w-6 p-0"
              disabled={isProcessing}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Order Details */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">
              Order #{orderData?.order_id || "Unknown"}
            </span>
            <span className="text-sm text-muted-foreground">
              Table: {orderData?.table_name || "N/A"}
            </span>
          </div>

          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Items:</span>
            <div className="mt-1 space-y-0.5">
              {orderData?.items &&
              Array.isArray(orderData.items) &&
              orderData.items.length > 0 ? (
                <>
                  {orderData.items.slice(0, 3).map((item, index) => (
                    <div key={index} className="text-xs">
                      {item.quantity}x {item.name || "Unnamed Item"} - Rs.{" "}
                      {parseFloat(String(item.price || 0)).toFixed(2)}
                    </div>
                  ))}
                  {orderData.items.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{orderData.items.length - 3} more items
                    </div>
                  )}
                </>
              ) : (
                <div className="text-xs">No items in this order</div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-border">
            <span className="text-sm font-medium">Total:</span>
            <span className="text-sm font-semibold">
              Rs. {parseFloat(String(orderData?.total_amount || 0)).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Button
            onClick={() => handleOrderAction("accepted")}
            size="sm"
            disabled={isProcessing}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Accept
          </Button>
          <Button
            onClick={() => handleOrderAction("rejected")}
            variant="destructive"
            size="sm"
            disabled={isProcessing}
            className="flex-1"
          >
            <XCircle className="h-3 w-3 mr-1" />
            Reject
          </Button>
          <Button
            onClick={handleViewOrder}
            variant="outline"
            size="sm"
            disabled={isProcessing}
            className="flex-1"
          >
            <Eye className="h-3 w-3 mr-1" />
            View
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderNotification;
