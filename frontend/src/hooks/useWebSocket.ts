import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getApiBaseUrl } from "@/lib/api";

// Helper function to get WebSocket base URL
export const getWsBaseUrl = (): string => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";

  if (process.env.NODE_ENV === "development") {
    return `${protocol}//localhost:8000`;
  } else {
    // In production, use the same host
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:8000`;
  }
};

interface UseWebSocketReturn {
  connectionStatus: string;
  messageHistory: any[];
  isConnected: boolean;
}

export const useWebSocket = (
  onMessage?: (data: any) => void
): UseWebSocketReturn => {
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");
  const [messageHistory, setMessageHistory] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const { user, token } = useAuth();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const onMessageRef = useRef(onMessage);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef(false);
  const lastMessageTimeRef = useRef(Date.now());

  // Update the onMessage ref when it changes
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  // This function checks if the connection is stale
  const checkConnectionHealth = useCallback(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const now = Date.now();
      const timeSinceLastMessage = now - lastMessageTimeRef.current;

      // If no message received in 2 minutes, consider the connection stale
      if (timeSinceLastMessage > 120000) {
        console.warn(
          `WebSocket connection may be stale. Last message was ${timeSinceLastMessage}ms ago.`
        );
        // Force a reconnection
        disconnect();
        setTimeout(connect, 1000);
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
          })
        );

        // Check connection health each time we send a ping
        checkConnectionHealth();
      }
    }, 30000); // Ping every 30 seconds
  }, [checkConnectionHealth]);

  const stopPingInterval = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current) {
      console.log("Connection attempt already in progress");
      return;
    }

    // Don't connect if already connected
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      console.log("WebSocket already connected");
      return;
    }

    if (!user?.id || !token) {
      console.log("Missing user or token for WebSocket connection");
      setConnectionStatus("Disconnected");
      return;
    }

    isConnectingRef.current = true;

    try {
      // Clean up any existing connection
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }

      // Create WebSocket URL using helper function
      const wsBaseUrl = getWsBaseUrl();
      const wsUrl = `${wsBaseUrl}/ws/notifications/${user.id}/?token=${token}`;
      console.log(`Attempting to connect to WebSocket at ${wsUrl}`);

      setConnectionStatus("Connecting");

      ws.current = new WebSocket(wsUrl);

      // Set up event handlers
      ws.current.onopen = (event) => {
        setConnectionStatus("Connected");
        setIsConnected(true);
        reconnectAttempts.current = 0;
        isConnectingRef.current = false;
        startPingInterval();
        console.log("WebSocket connected successfully", event);
      };

      ws.current.onerror = (error) => {
        console.error("WebSocket connection error:", error);
      };

      ws.current.onmessage = (event) => {
        try {
          // Update last message time for connection health check
          lastMessageTimeRef.current = Date.now();

          const data = JSON.parse(event.data);
          console.log("WebSocket message received:", data);

          setMessageHistory((prev) => [...prev.slice(-49), data]);

          // Handle different message types
          if (data.type === "pong") {
            console.log(
              "Received pong from server at",
              new Date(data.server_timestamp)
            );
            return;
          }

          if (data.type === "connection_established") {
            console.log("WebSocket connection established:", data.message);
            return;
          }

          if (data.type === "notification_read_response") {
            console.log(
              `Notification ${data.notification_id} read status: ${data.success}`
            );
            return;
          }

          if (data.type === "error") {
            console.error("WebSocket server error:", data.message);
            return;
          }

          // Call onMessage for actual notifications and order status updates
          if (
            onMessageRef.current &&
            (data.type === "vendor_notification" ||
              data.type === "order_status")
          ) {
            console.log("Received WebSocket message:", data);
            onMessageRef.current(data);
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.current.onclose = (event) => {
        isConnectingRef.current = false;
        setConnectionStatus("Disconnected");
        setIsConnected(false);
        stopPingInterval();
        console.log(
          "WebSocket disconnected - Code:",
          event.code,
          "Reason:",
          event.reason
        );

        // Handle reconnection
        if (
          event.code !== 1000 &&
          reconnectAttempts.current < maxReconnectAttempts
        ) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttempts.current),
            30000
          );
          reconnectAttempts.current++;

          console.log(
            `Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error("Error creating WebSocket connection:", error);
      isConnectingRef.current = false;
    }
  }, [
    user?.id,
    token,
    startPingInterval,
    stopPingInterval,
    maxReconnectAttempts,
  ]);

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
    if (user?.id && token) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [user?.id, token, connect, disconnect]);

  return {
    connectionStatus,
    messageHistory,
    isConnected,
  };
};
