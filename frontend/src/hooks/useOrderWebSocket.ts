"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getWsBaseUrl } from "./useWebSocket";

const MAX_RECONNECT_ATTEMPTS = 3;
const MAX_MESSAGE_SIZE = 64 * 1024;
const MAX_TRACKED_ORDERS = 50;

const isDev = process.env.NODE_ENV === "development";
const log = isDev ? console.log.bind(console) : () => {};
const logError = console.error.bind(console);

interface OrderPayload {
  id?: string | number;
  status?: string;
  table_identifier?: string;
  qr_code?: string;
  vendor_id?: string | number;
  created_at?: string;
  [key: string]: unknown;
}

interface OrderUpdateData {
  order_id: string | number;
  status: string;
  order_data?: OrderPayload;
}

interface TrackedOrder extends OrderPayload {
  id: number;
  status: string;
  vendor_id: number;
  table_identifier: string;
  created_at: string;
}

interface UseOrderWebSocketReturn {
  isConnected: boolean;
  connect: () => boolean;
  disconnect: () => void;
  connectionStatus: string;
  reconnectAttempts: number;
  usingFallback: boolean;
}

export const useOrderWebSocket = (
  vendorId: string | number,
  tableNo: string,
  onOrderUpdate?: (data: OrderUpdateData) => void,
): UseOrderWebSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [reconnectAttemptsCount, setReconnectAttemptsCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const reconnectAttemptsRef = useRef(0);
  const lastConnectAttempt = useRef(0);
  const connectRef = useRef<(() => boolean) | null>(null);
  const disconnectRef = useRef<(() => void) | null>(null);

  const processOrderUpdate = useCallback(
    (data: OrderPayload) => {
      const rawOrderId = data.id;
      const status = data.status;

      if (rawOrderId == null || !status) {
        logError("Received incomplete order data:", data);
        return;
      }

      const orderId = Number.parseInt(String(rawOrderId), 10);
      if (Number.isNaN(orderId)) {
        logError("Received invalid order id:", rawOrderId);
        return;
      }

      log(`Order update received - order: ${orderId}, status: ${status}`);

      const matchesTable =
        data.table_identifier === tableNo ||
        (typeof data.qr_code === "string" && data.qr_code === tableNo);

      if (!matchesTable) {
        log(`Order update ignored - not for this table (${tableNo})`);
        return;
      }

      log("Order update matches our table, processing...");
      onOrderUpdate?.({ order_id: orderId, status, order_data: data });

      let trackedOrders: TrackedOrder[] = [];
      try {
        const parsed = JSON.parse(
          localStorage.getItem("tracked_orders") || "[]",
        );
        if (Array.isArray(parsed)) trackedOrders = parsed as TrackedOrder[];
      } catch (error) {
        logError("Failed to parse tracked_orders from localStorage:", error);
      }

      const orderToUpdate = trackedOrders.find((order) => order.id === orderId);
      const parsedVendorId = Number.parseInt(
        String(data.vendor_id ?? vendorId),
        10,
      );

      const updatedOrder: TrackedOrder = {
        ...(orderToUpdate ?? {}),
        ...data,
        id: orderId,
        status: String(status),
        vendor_id: Number.isNaN(parsedVendorId)
          ? Number.parseInt(String(vendorId), 10)
          : parsedVendorId,
        table_identifier: tableNo,
        created_at: String(
          data.created_at ??
            orderToUpdate?.created_at ??
            new Date().toISOString(),
        ),
      };

      const updatedOrders = orderToUpdate
        ? trackedOrders.map((order) =>
            order.id === orderId ? updatedOrder : order,
          )
        : [updatedOrder, ...trackedOrders];

      // Trim to prevent unbounded localStorage growth
      localStorage.setItem(
        "tracked_orders",
        JSON.stringify(updatedOrders.slice(0, MAX_TRACKED_ORDERS)),
      );
    },
    [onOrderUpdate, tableNo, vendorId],
  );

  const connect = useCallback((): boolean => {
    const now = Date.now();

    // Prevent rapid reconnection attempts
    if (now - lastConnectAttempt.current < 2000) {
      log("Preventing rapid reconnection attempt");
      return false;
    }

    lastConnectAttempt.current = now;

    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      log(`Already hit max reconnection attempts (${MAX_RECONNECT_ATTEMPTS})`);
      return false;
    }

    // Skip if already open or connecting
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) {
      return true;
    }

    setConnectionStatus("connecting");

    try {
      const wsBaseUrl = getWsBaseUrl();
      const safeVendorId = encodeURIComponent(String(vendorId));
      const safeTableNo = encodeURIComponent(String(tableNo));
      const wsUrl = `${wsBaseUrl}/ws/order/${safeVendorId}_${safeTableNo}/`;
      log("Connecting to order WebSocket");

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        setReconnectAttemptsCount(0);
        setConnectionStatus("connected");
        log("Order WebSocket connected successfully");
      };

      wsRef.current.onmessage = (event) => {
        try {
          if (event.data.length > MAX_MESSAGE_SIZE) {
            logError("WebSocket message too large, ignoring");
            return;
          }

          const parsed: unknown = JSON.parse(event.data);
          if (typeof parsed !== "object" || parsed === null) return;

          const message = parsed as {
            type?: string;
            data?: unknown;
            message?: string;
          };

          const payload =
            typeof message.data === "object" && message.data !== null
              ? (message.data as OrderPayload)
              : undefined;

          if (
            (message.type === "order_status_update" ||
              message.type === "order_status") &&
            payload
          ) {
            processOrderUpdate(payload);
          } else if (message.type === "connection_established") {
            log("Order WebSocket connection established");
          } else if (message.type === "pong") {
            log("Received pong from server");
          } else if (message.type === "error") {
            logError("WebSocket server error:", message.message);
          }
        } catch (error) {
          logError("Error parsing WebSocket message:", error);
        }
      };

      wsRef.current.onclose = (event) => {
        setIsConnected(false);
        setConnectionStatus("disconnected");
        log(`WebSocket closed - code: ${event.code}`);

        if (
          event.code !== 1000 &&
          event.code !== 1001 &&
          reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS
        ) {
          const delay = Math.min(
            2000 * Math.pow(1.5, reconnectAttemptsRef.current),
            10000,
          );
          const nextAttempt = reconnectAttemptsRef.current + 1;
          reconnectAttemptsRef.current = nextAttempt;
          setReconnectAttemptsCount(nextAttempt);
          log(
            `Reconnecting in ${delay}ms, attempt ${nextAttempt}/${MAX_RECONNECT_ATTEMPTS}`,
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connectRef.current?.();
          }, delay);
        } else {
          log("WebSocket closed permanently");
        }
      };

      wsRef.current.onerror = (error) => {
        logError("Order WebSocket error:", error);
        setConnectionStatus("error");
      };

      return true;
    } catch (error) {
      logError("Error creating WebSocket connection:", error);
      setConnectionStatus("error");
      return false;
    }
  }, [processOrderUpdate, tableNo, vendorId]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      try {
        wsRef.current.close(1000, "Component unmounting");
      } catch {
        // Ignore close errors during cleanup
      }
      wsRef.current = null;
    }

    setIsConnected(false);
    setConnectionStatus("disconnected");
    reconnectAttemptsRef.current = 0;
    setReconnectAttemptsCount(0);
  }, []);

  // Keep callback refs in sync for use inside closures
  useEffect(() => {
    connectRef.current = connect;
    disconnectRef.current = disconnect;
  }, [connect, disconnect]);

  useEffect(() => {
    if (!vendorId || !tableNo) {
      const resetTimer = setTimeout(() => {
        disconnectRef.current?.();
      }, 0);

      return () => {
        clearTimeout(resetTimer);
      };
    }

    log("Initializing WebSocket connection");
    const connectTimer = setTimeout(() => {
      connectRef.current?.();
    }, 100);

    return () => {
      clearTimeout(connectTimer);
      disconnectRef.current?.();
    };
  }, [vendorId, tableNo]);

  return {
    isConnected,
    connect,
    disconnect,
    connectionStatus,
    reconnectAttempts: reconnectAttemptsCount,
    usingFallback: reconnectAttemptsCount >= MAX_RECONNECT_ATTEMPTS,
  };
};
