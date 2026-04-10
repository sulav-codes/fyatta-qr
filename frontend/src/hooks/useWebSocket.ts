import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";

const MAX_RECONNECT_ATTEMPTS = 5;
const MAX_MESSAGE_SIZE = 64 * 1024;
const PING_INTERVAL = 30000;
const STALE_CONNECTION_THRESHOLD = 120000;
const MAX_MESSAGE_HISTORY = 50;

const isDev = process.env.NODE_ENV === "development";
const log = isDev ? console.log.bind(console) : () => {};
const logWarn = isDev ? console.warn.bind(console) : () => {};
const logError = console.error.bind(console);

// Helper function to get WebSocket base URL
export const getWsBaseUrl = (): string => {
  if (typeof window === "undefined") {
    throw new Error("getWsBaseUrl must be called in browser context");
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsHost =
    process.env.NEXT_PUBLIC_WS_HOST ??
    (isDev ? "localhost:8000" : window.location.host);

  return `${protocol}//${wsHost}`;
};

type SocketMessage = {
  type?: string;
  [key: string]: unknown;
};

interface UseWebSocketReturn {
  connectionStatus: string;
  messageHistory: SocketMessage[];
  isConnected: boolean;
}

const isValidSocketMessage = (value: unknown): value is SocketMessage => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

export const useWebSocket = (
  onMessage?: (data: SocketMessage) => void,
): UseWebSocketReturn => {
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");
  const [messageHistory, setMessageHistory] = useState<SocketMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const { user, token } = useAuth();
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const reconnectAttempts = useRef(0);
  const onMessageRef = useRef(onMessage);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isConnectingRef = useRef(false);
  const lastMessageTimeRef = useRef<number>(0);
  const connectRef = useRef<(() => void) | null>(null);
  const disconnectRef = useRef<(() => void) | null>(null);

  // Update the onMessage ref when it changes
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    lastMessageTimeRef.current = Date.now();
  }, []);

  // This function checks if the connection is stale
  const stopPingInterval = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  const checkConnectionHealth = useCallback(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const timeSinceLastMessage = Date.now() - lastMessageTimeRef.current;

      // If no message received in 2 minutes, consider the connection stale
      if (timeSinceLastMessage > STALE_CONNECTION_THRESHOLD) {
        logWarn(
          `WebSocket connection may be stale. Last message was ${timeSinceLastMessage}ms ago.`,
        );
        reconnectAttempts.current = 0;
        disconnectRef.current?.();
        setTimeout(() => {
          connectRef.current?.();
        }, 1000);
      }
    }
  }, []);

  const startPingInterval = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }

    pingIntervalRef.current = setInterval(() => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(
          JSON.stringify({
            type: "ping",
            timestamp: Date.now(),
          }),
        );

        // Check connection health each time we send a ping
        checkConnectionHealth();
      }
    }, PING_INTERVAL);
  }, [checkConnectionHealth]);

  const connect = useCallback(() => {
    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current) {
      log("Connection attempt already in progress");
      return;
    }

    // Don't connect if already connected
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      log("WebSocket already connected");
      return;
    }

    if (!user?.id || !token) {
      log("Missing user or token for WebSocket connection");
      setConnectionStatus("Disconnected");
      return;
    }

    isConnectingRef.current = true;

    try {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }

      const wsBaseUrl = getWsBaseUrl();
      const wsUrl = `${wsBaseUrl}/ws/notifications/${user.id}/`;

      log(`Attempting to connect to WebSocket`);
      setConnectionStatus("Connecting");

      ws.current = new WebSocket(wsUrl);

      // Set up event handlers
      ws.current.onopen = () => {
        if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ type: "auth", token }));
        }

        setConnectionStatus("Connected");
        setIsConnected(true);
        lastMessageTimeRef.current = Date.now();
        reconnectAttempts.current = 0;
        isConnectingRef.current = false;
        startPingInterval();
        log("WebSocket connected successfully");
      };

      ws.current.onerror = (error) => {
        logError("WebSocket connection error:", error);
      };

      ws.current.onmessage = (event) => {
        try {
          if (event.data.length > MAX_MESSAGE_SIZE) {
            logError("WebSocket message too large, ignoring");
            return;
          }

          lastMessageTimeRef.current = Date.now();

          const parsed: unknown = JSON.parse(event.data);

          if (!isValidSocketMessage(parsed)) {
            logError("Invalid WebSocket message format");
            return;
          }

          const data = parsed as SocketMessage;
          log("WebSocket message received:", data.type);

          setMessageHistory((prev) => [
            ...prev.slice(-(MAX_MESSAGE_HISTORY - 1)),
            data,
          ]);

          if (data.type === "pong") {
            log("Received pong from server");
            return;
          }

          if (data.type === "connection_established") {
            log("WebSocket connection established");
            return;
          }

          if (data.type === "notification_read_response") {
            log(
              `Notification ${data.notification_id} read status: ${data.success}`,
            );
            return;
          }

          if (data.type === "error") {
            logError("WebSocket server error:", data.message);
            return;
          }

          if (
            onMessageRef.current &&
            (data.type === "vendor_notification" ||
              data.type === "order_status")
          ) {
            onMessageRef.current(data);
          }
        } catch (error) {
          logError("Error parsing WebSocket message:", error);
        }
      };

      ws.current.onclose = (event) => {
        isConnectingRef.current = false;
        setConnectionStatus("Disconnected");
        setIsConnected(false);
        setMessageHistory([]);
        stopPingInterval();
        log(
          "WebSocket disconnected - Code:",
          event.code,
          "Reason:",
          event.reason,
        );

        // Handle reconnection
        if (
          event.code !== 1000 &&
          reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS
        ) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttempts.current),
            30000,
          );
          reconnectAttempts.current++;

          log(
            `Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS})`,
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connectRef.current?.();
          }, delay);
        }
      };
    } catch (error) {
      logError("Error creating WebSocket connection:", error);
      isConnectingRef.current = false;
    }
  }, [user, token, startPingInterval, stopPingInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    stopPingInterval();

    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }

    setConnectionStatus("Disconnected");
    setIsConnected(false);
  }, [stopPingInterval]);

  // Connect when user and token are available
  useEffect(() => {
    connectRef.current = connect;
    disconnectRef.current = disconnect;
  }, [connect, disconnect]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (user?.id && token) {
        disconnectRef.current?.();
        connectRef.current?.();
      } else {
        disconnectRef.current?.();
      }
    }, 0);

    return () => {
      clearTimeout(timer);
      disconnectRef.current?.();
    };
  }, [user, token]);

  return {
    connectionStatus,
    messageHistory,
    isConnected,
  };
};
