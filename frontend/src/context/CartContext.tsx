"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { getApiBaseUrl } from "@/lib/api";
import toast from "react-hot-toast";
import { io, Socket } from "socket.io-client";

// Types
interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  category?: string;
  image?: string | null;
  description?: string;
}

interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: number;
  status: string;
  table_identifier: string;
  vendor_id: number;
  total: string;
  table_name?: string;
  timestamp: string;
  items: OrderItem[];
  transactionId?: string;
  paymentStatus?: string;
  invoiceNo?: string;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity">) => void;
  removeFromCart: (itemId: number) => void;
  updateQuantity: (itemId: number, newQuantity: number) => void;
  recentlyAdded: Record<number, boolean>;
  clearCart: () => void;
  cartTotal: number;
  createOrder: () => Promise<Order>;
  proceedToPayment: (orderId: number) => Promise<any>;
  pendingOrder: Order | null;
  setPendingOrder: (order: Order | null) => void;
}

// Create the context with default values
export const CartContext = createContext<CartContextType>({
  cart: [],
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  recentlyAdded: {},
  clearCart: () => {},
  cartTotal: 0,
  createOrder: async () => ({} as Order),
  proceedToPayment: async () => {},
  pendingOrder: null,
  setPendingOrder: () => {},
});

interface CartProviderProps {
  children: ReactNode;
  vendorId: string | number;
  tableNo: string;
  onUpdateRecommendations?: (itemIds: number[]) => void;
}

// Create the provider component
export const CartProvider = ({
  children,
  vendorId,
  tableNo,
  onUpdateRecommendations,
}: CartProviderProps) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [recentlyAdded, setRecentlyAdded] = useState<Record<number, boolean>>(
    {}
  );
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);
  const timeoutRefs = useRef<Record<number, NodeJS.Timeout>>({});
  const initialLoadCompleted = useRef(false);
  const previousCartJSON = useRef("");
  const socketRef = useRef<Socket | null>(null);

  // Prevent excessive recommendation updates with debounce
  const recommendationsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingCartItemsRef = useRef<number[] | null>(null);

  // Define clearCart first so it can be used in checkOrderStatus
  const clearCart = useCallback(() => {
    setCart([]);
    pendingCartItemsRef.current = null;
  }, []);

  // Function to check order status via polling
  const checkOrderStatus = useCallback(async () => {
    if (!pendingOrder || !pendingOrder.id) return;

    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(
        `${apiBaseUrl}/api/orders/${pendingOrder.id}`
      );

      if (!response.ok) return;

      const data = await response.json();
      const status = data.status;
      const orderId = pendingOrder.id;

      console.log(
        `CartContext: Polling update for order ${orderId}, status: ${status}`
      );

      // Update pendingOrder if status changed
      if (pendingOrder.status !== status) {
        console.log(
          `CartContext: Updating pendingOrder with new status: ${status}`
        );

        // Create complete updated order object with all data
        const updatedOrder: Order = {
          ...pendingOrder,
          status: status,
          ...data,
        };

        console.log("CartContext: Updated order object:", updatedOrder);

        // Update state
        setPendingOrder(updatedOrder);

        // Update localStorage
        const trackedOrders: Order[] = JSON.parse(
          localStorage.getItem("tracked_orders") || "[]"
        );
        const updatedOrders = trackedOrders.map((order) =>
          order.id === orderId ? updatedOrder : order
        );
        localStorage.setItem("tracked_orders", JSON.stringify(updatedOrders));

        // Clean up table booking info when order is completed/cancelled/rejected
        if (["completed", "cancelled", "rejected"].includes(status)) {
          console.log("Order finished, cleaning up table booking info");
          localStorage.removeItem("last_order_table");
          localStorage.removeItem("last_order_vendor");
          localStorage.removeItem("current_order_id");
        }

        // Generate a unique toast ID for this status update
        const toastKey = `order-${orderId}-${status}`;
        const toastId = `${toastKey}-context-${Date.now()}`;

        // Check if we've shown this exact status update before (in the last 30 seconds)
        const lastShown = localStorage.getItem(`last_toast_${toastKey}`);
        const shouldShow =
          !lastShown || Date.now() - parseInt(lastShown) > 30000;

        if (shouldShow) {
          // Save this toast's timestamp
          localStorage.setItem(`last_toast_${toastKey}`, Date.now().toString());

          // Show toast notification for important status changes
          if (String(status) === "accepted") {
            toast.success(
              `Your order has been accepted and is ready for payment!`,
              { id: toastId, duration: 4000 }
            );
          } else if (String(status) === "rejected") {
            toast.error(
              `Order #${orderId} was rejected. Please modify and try again.`,
              { id: toastId, duration: 4000 }
            );

            // If order is rejected, clear the pendingOrder so user can create a new one
            setTimeout(() => setPendingOrder(null), 3000);
          } else if (
            status === "confirmed" ||
            status === "preparing" ||
            status === "ready" ||
            status === "delivered" ||
            status === "completed"
          ) {
            // If order is confirmed (paid) or later stages, clear the cart and pending order
            clearCart();
            setPendingOrder(null);
            // Only show status update toasts for non-payment related statuses
            if (status !== "confirmed") {
              let message = `Order #${orderId} is now ${status}!`;
              if (status === "delivered") {
                message = `Order #${orderId} has been delivered! Please verify receipt on the order tracking page.`;
              } else if (status === "completed") {
                message = `Order #${orderId} is completed and verified. Thank you!`;
              }

              toast.success(message, {
                id: toastId,
                duration: status === "delivered" ? 8000 : 4000,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error checking order status:", error);
    }
  }, [pendingOrder, setPendingOrder, clearCart]);

  // Check for existing pending order on mount
  useEffect(() => {
    const loadOrdersFromStorage = () => {
      const trackedOrders: Order[] = JSON.parse(
        localStorage.getItem("tracked_orders") || "[]"
      );

      const validOrders = trackedOrders.filter((order) => order && order.id);

      if (validOrders.length !== trackedOrders.length) {
        localStorage.setItem("tracked_orders", JSON.stringify(validOrders));
      }

      const relevantStatuses = ["pending", "accepted"];
      const currentPendingOrder = validOrders.find(
        (order) =>
          relevantStatuses.includes(order.status) &&
          order.vendor_id === parseInt(String(vendorId)) &&
          order.table_identifier === tableNo
      );

      if (currentPendingOrder) {
        setPendingOrder(currentPendingOrder);
      } else {
        setPendingOrder(null);
      }
    };

    loadOrdersFromStorage();
  }, [vendorId, tableNo, clearCart]);

  // WebSocket connection setup
  useEffect(() => {
    const baseUrl = getApiBaseUrl();
    const wsUrl = baseUrl.replace(/^http/, "ws");

    console.log("CartContext: Connecting to WebSocket:", wsUrl);

    const socket = io(wsUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("CartContext: WebSocket connected");
      // Join table room for real-time updates
      socket.emit("join-table", {
        vendorId: String(vendorId),
        tableIdentifier: tableNo,
      });
    });

    socket.on("disconnect", () => {
      console.log("CartContext: WebSocket disconnected");
    });

    // Listen for order status updates
    socket.on(
      "order-status-update",
      (data: { orderId: number; status: string }) => {
        console.log("CartContext: Received order-status-update:", data);

        if (pendingOrder && pendingOrder.id === data.orderId) {
          const updatedOrder: Order = {
            ...pendingOrder,
            status: data.status,
          };

          setPendingOrder(updatedOrder);

          // Update localStorage
          const trackedOrders: Order[] = JSON.parse(
            localStorage.getItem("tracked_orders") || "[]"
          );
          const updatedOrders = trackedOrders.map((order) =>
            order.id === data.orderId ? updatedOrder : order
          );
          localStorage.setItem("tracked_orders", JSON.stringify(updatedOrders));

          // Show toast for status change
          const toastKey = `order-${data.orderId}-${data.status}`;
          const toastId = `${toastKey}-ws-${Date.now()}`;

          const lastShown = localStorage.getItem(`last_toast_${toastKey}`);
          const shouldShow =
            !lastShown || Date.now() - parseInt(lastShown) > 30000;

          if (shouldShow) {
            localStorage.setItem(
              `last_toast_${toastKey}`,
              Date.now().toString()
            );

            if (data.status === "accepted") {
              toast.success(
                "Your order has been accepted and is ready for payment!",
                {
                  id: toastId,
                  duration: 4000,
                }
              );
            } else if (data.status === "preparing") {
              toast.success("Your order is being prepared!", { id: toastId });
            } else if (data.status === "ready") {
              toast.success("Your order is ready!", { id: toastId });
            } else if (data.status === "delivered") {
              toast.success("Your order has been delivered!", { id: toastId });
            }
          }

          // Clear cart for confirmed orders
          if (data.status === "confirmed" || data.status === "preparing") {
            clearCart();
          }
        }
      }
    );

    return () => {
      if (socket) {
        socket.emit("leave-table", {
          vendorId: String(vendorId),
          tableIdentifier: tableNo,
        });
        socket.disconnect();
      }
    };
  }, [vendorId, tableNo, pendingOrder, clearCart]);

  // Poll for order status updates every 5 seconds when there's a pending order (fallback)
  useEffect(() => {
    if (!pendingOrder || !pendingOrder.id) return;

    // Initial check
    checkOrderStatus();

    // Set up polling interval
    const interval = setInterval(checkOrderStatus, 5000);

    return () => clearInterval(interval);
  }, [pendingOrder, checkOrderStatus]);

  // Calculate cart total
  const cartTotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  // Load cart from localStorage on initial mount
  useEffect(() => {
    if (initialLoadCompleted.current) return;

    try {
      const cartKey = `cart_${vendorId}_${tableNo}`;
      const savedCart = localStorage.getItem(cartKey);

      if (savedCart) {
        const parsedCart: CartItem[] = JSON.parse(savedCart);
        setCart(parsedCart);
        previousCartJSON.current = savedCart;

        if (parsedCart.length > 0 && onUpdateRecommendations) {
          const cartItemIds = parsedCart.map((item) => item.id);
          pendingCartItemsRef.current = cartItemIds;
          triggerRecommendationsUpdate();
        }
      }
    } catch (error) {
      console.error("Error loading cart from localStorage:", error);
    }

    initialLoadCompleted.current = true;
  }, [vendorId, tableNo, onUpdateRecommendations]);

  // Save cart to localStorage when it changes
  useEffect(() => {
    if (!initialLoadCompleted.current) return;

    try {
      const cartKey = `cart_${vendorId}_${tableNo}`;
      const currentCartJSON = JSON.stringify(cart);

      if (currentCartJSON !== previousCartJSON.current) {
        localStorage.setItem(cartKey, currentCartJSON);
        previousCartJSON.current = currentCartJSON;
      }
    } catch (error) {
      console.error("Error saving cart to localStorage:", error);
    }
  }, [cart, vendorId, tableNo]);

  // Clean up timeouts when component unmounts
  useEffect(() => {
    return () => {
      Object.values(timeoutRefs.current).forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });

      if (recommendationsTimeoutRef.current) {
        clearTimeout(recommendationsTimeoutRef.current);
      }
    };
  }, []);

  // Debounced recommendations update
  const triggerRecommendationsUpdate = useCallback(() => {
    if (recommendationsTimeoutRef.current) {
      clearTimeout(recommendationsTimeoutRef.current);
    }

    recommendationsTimeoutRef.current = setTimeout(() => {
      if (pendingCartItemsRef.current && onUpdateRecommendations) {
        onUpdateRecommendations(pendingCartItemsRef.current);
        pendingCartItemsRef.current = null;
      }
      recommendationsTimeoutRef.current = null;
    }, 500);
  }, [onUpdateRecommendations]);

  const addToCart = useCallback(
    (item: Omit<CartItem, "quantity">) => {
      setCart((prevCart) => {
        const existingItem = prevCart.find(
          (cartItem) => cartItem.id === item.id
        );
        let updatedCart: CartItem[];

        if (existingItem) {
          updatedCart = prevCart.map((cartItem) =>
            cartItem.id === item.id
              ? { ...cartItem, quantity: cartItem.quantity + 1 }
              : cartItem
          );
        } else {
          updatedCart = [...prevCart, { ...item, quantity: 1 }];
        }

        const cartItemIds = updatedCart.map((item) => item.id);
        pendingCartItemsRef.current = cartItemIds;
        triggerRecommendationsUpdate();

        return updatedCart;
      });

      if (timeoutRefs.current[item.id]) {
        clearTimeout(timeoutRefs.current[item.id]);
      }

      setRecentlyAdded((prev) => ({ ...prev, [item.id]: true }));

      timeoutRefs.current[item.id] = setTimeout(() => {
        setRecentlyAdded((prev) => ({ ...prev, [item.id]: false }));
        delete timeoutRefs.current[item.id];
      }, 2000);

      toast.success(`${item.name} added to cart`);
    },
    [triggerRecommendationsUpdate]
  );

  const removeFromCart = useCallback(
    (itemId: number) => {
      setCart((prevCart) => {
        const updatedCart = prevCart.filter((item) => item.id !== itemId);

        if (updatedCart.length > 0) {
          const cartItemIds = updatedCart.map((item) => item.id);
          pendingCartItemsRef.current = cartItemIds;
          triggerRecommendationsUpdate();
        }

        return updatedCart;
      });
    },
    [triggerRecommendationsUpdate]
  );

  const updateQuantity = useCallback(
    (itemId: number, newQuantity: number) => {
      if (newQuantity < 1) {
        removeFromCart(itemId);
        return;
      }

      setCart((prevCart) => {
        const updatedCart = prevCart.map((item) =>
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        );

        const cartItemIds = updatedCart.map((item) => item.id);
        pendingCartItemsRef.current = cartItemIds;
        triggerRecommendationsUpdate();

        return updatedCart;
      });
    },
    [removeFromCart, triggerRecommendationsUpdate]
  );

  // Create order before payment
  const createOrder = useCallback(async (): Promise<Order> => {
    if (cart.length === 0) {
      throw new Error("Cart is empty");
    }

    try {
      const orderData = {
        items: cart.map((item) => ({
          id: item.id,
          quantity: item.quantity,
        })),
        vendor_id: vendorId,
        table_identifier: tableNo,
      };

      const apiBaseUrl = getApiBaseUrl();
      const url = `${apiBaseUrl}/api/customer/orders`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      console.log("[CartContext] Response received");
      console.log("[CartContext] Response status:", response.status);
      console.log("[CartContext] Response ok:", response.ok);
      console.log("[CartContext] Response status text:", response.statusText);

      const responseText = await response.text();
      console.log("[CartContext] Response text:", responseText);

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error("Invalid response from server");
      }

      if (!response.ok) {
        throw new Error(result.error || "Failed to create order");
      }

      const orderId = result.order?.id || result.order_id;

      if (!orderId) {
        console.error("No order ID found in API response:", result);
        throw new Error("Failed to create order: No order ID returned");
      }

      const orderObject: Order = {
        id: orderId,
        status: result.order?.status || "pending",
        table_identifier: tableNo,
        vendor_id: parseInt(String(vendorId)),
        total: result.order?.total || cartTotal.toFixed(2),
        table_name: result.table_name || result.order?.table_name || "Table",
        timestamp: new Date().toISOString(),
        items: cart.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        invoiceNo: result.order?.invoice_no,
      };

      const trackedOrders: Order[] = JSON.parse(
        localStorage.getItem("tracked_orders") || "[]"
      );

      const existingOrderIndex = trackedOrders.findIndex(
        (order) => order.id === orderObject.id
      );

      if (existingOrderIndex !== -1) {
        trackedOrders[existingOrderIndex] = orderObject;
      } else {
        trackedOrders.unshift(orderObject);
        if (trackedOrders.length > 5) {
          trackedOrders.splice(5);
        }
      }

      localStorage.setItem("tracked_orders", JSON.stringify(trackedOrders));
      localStorage.setItem("current_order_id", orderId.toString());
      localStorage.setItem(
        "last_menu_url",
        `/menu/${vendorId}/${encodeURIComponent(tableNo)}`
      );

      return orderObject;
    } catch (error) {
      console.error("Error creating order:", error);
      throw error;
    }
  }, [cart, vendorId, tableNo, cartTotal]);

  // Proceed to payment for existing order
  const proceedToPayment = useCallback(async (orderId: number) => {
    try {
      const apiBaseUrl = getApiBaseUrl();

      const response = await fetch(`${apiBaseUrl}/api/payment/esewa/initiate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: orderId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Payment initiation failed:", errorText);
        throw new Error("Failed to initiate payment");
      }

      const paymentData = await response.json();
      console.log("[eSewa] Payment data received:", paymentData);

      if (
        paymentData.success &&
        paymentData.paymentUrl &&
        paymentData.paymentData
      ) {
        // Store pending payment info
        localStorage.setItem(`payment_pending_${orderId}`, "true");

        // Create and submit eSewa form
        const form = document.createElement("form");
        form.method = "POST";
        form.action = paymentData.paymentUrl;

        // Add all payment data as hidden fields
        Object.entries(paymentData.paymentData).forEach(([key, value]) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = String(value);
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
      } else {
        throw new Error("Invalid payment data received");
      }

      return paymentData;
    } catch (error) {
      console.error("Error initiating payment:", error);
      throw error;
    }
  }, []);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        recentlyAdded,
        clearCart,
        cartTotal,
        createOrder,
        proceedToPayment,
        pendingOrder,
        setPendingOrder,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

// Custom hook to use cart context
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
