"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  ReactNode,
  Dispatch,
  SetStateAction,
} from "react";
import { useAuth } from "@/context/AuthContext";
import { getApiBaseUrl } from "@/lib/api";
import toast from "react-hot-toast";
import { io, Socket } from "socket.io-client";

// Types
interface NotificationData {
  order_id?: number | string;
  [key: string]: any;
}

interface Notification {
  id: string | number;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  created_at: string;
  read: boolean;
  data: NotificationData;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Partial<Notification>) => void;
  markAsRead: (notificationId: string | number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  removeNotification: (notificationId: string | number) => Promise<void>;
  clearNotifications: () => Promise<void>;
  soundEnabled?: boolean;
  setSoundEnabled?: Dispatch<SetStateAction<boolean>>;
  fetchNotifications?: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  addNotification: () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  removeNotification: async () => {},
  clearNotifications: async () => {},
});

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider = ({
  children,
}: NotificationProviderProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { user, token } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Initialize audio element on client side
  useEffect(() => {
    if (typeof window !== "undefined" && !audioRef.current) {
      const audio = new Audio("/notification-sound.mp3");
      audio.preload = "auto";
      audioRef.current = audio;
    }
  }, []);

  // WebSocket connection for real-time notifications
  useEffect(() => {
    if (!user?.id || !token) {
      // Disconnect socket if user logs out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Connect to WebSocket
    const apiBaseUrl = getApiBaseUrl();

    const socket = io(apiBaseUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // Join vendor room for notifications
    socket.on("connect", () => {
      console.log("[Notifications] WebSocket connected:", socket.id);
      socket.emit("join-vendor", user.id);
    });

    // Listen for new notifications
    socket.on("notification", (notification: Notification) => {
      console.log("[Notifications] Received notification:", notification);

      const newNotification: Notification = {
        ...notification,
        id:
          notification.id ||
          `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: notification.timestamp || new Date().toISOString(),
        created_at: notification.created_at || new Date().toISOString(),
        read: notification.read !== undefined ? notification.read : false,
        type: notification.type || "info",
        title: notification.title || "Notification",
        message: notification.message || "",
        data: notification.data || {},
      };

      setNotifications((prev) => [newNotification, ...prev.slice(0, 49)]);

      // Play sound if enabled
      if (soundEnabled && audioRef.current) {
        audioRef.current.currentTime = 0; // Reset audio to start
        audioRef.current
          .play()
          .catch((e) => console.error("Audio play failed:", e));
      }

      // Show toast notification
      toast(notification.message || notification.title, {
        icon:
          notification.type === "order"
            ? "🔔"
            : notification.type === "waiter_call"
            ? "🙋"
            : "ℹ️",
        duration: notification.type === "waiter_call" ? 6000 : 4000,
      });
    });

    // Listen for waiter calls
    socket.on(`vendor-${user.id}`, (data: any) => {
      console.log("[Notifications] Vendor event received:", data);

      if (data.type === "waiter_call") {
        const waiterNotification: Notification = {
          id: `waiter-${Date.now()}`,
          type: "waiter_call",
          title: "Customer Needs Assistance",
          message:
            data.message ||
            `Customer at ${data.data?.table_name} is calling for assistance`,
          timestamp: data.data?.timestamp || new Date().toISOString(),
          created_at: data.data?.timestamp || new Date().toISOString(),
          read: false,
          data: data.data || {},
        };

        setNotifications((prev) => [waiterNotification, ...prev]);

        // Play notification sound
        if (soundEnabled && audioRef.current) {
          audioRef.current.currentTime = 0; // Reset audio to start
          audioRef.current
            .play()
            .catch((e) => console.error("Audio play failed:", e));
        }

        // Show toast with special styling
        toast(waiterNotification.message, {
          icon: "🙋‍♂️",
          duration: 6000,
          style: {
            background: "#FEF3C7",
            color: "#92400E",
            border: "2px solid #F59E0B",
          },
        });
      }
    });

    // Listen for notification updates
    socket.on("notification-read", (notificationId: string | number) => {
      console.log(
        "[Notifications] Notification marked as read:",
        notificationId
      );
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    });

    // Listen for notification deletion
    socket.on("notification-deleted", (notificationId: string | number) => {
      console.log("[Notifications] Notification deleted:", notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    });

    // Handle connection errors
    socket.on("connect_error", (error) => {
      console.error("[Notifications] WebSocket connection error:", error);
    });

    socket.on("disconnect", (reason) => {
      console.log("[Notifications] WebSocket disconnected:", reason);
    });

    // Cleanup
    return () => {
      if (socket) {
        socket.emit("leave-vendor", user.id);
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [user?.id, token, soundEnabled]);

  const addNotification = useCallback((notification: Partial<Notification>) => {
    try {
      const newNotification: Notification = {
        id:
          notification.id ||
          `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        read: false,
        type: "info",
        title: notification.title || "Notification",
        message: notification.message || "",
        data: notification.data || {},
        ...notification,
      };

      setNotifications((prev) => [newNotification, ...prev.slice(0, 49)]);
    } catch (error) {
      console.error("Error adding notification:", error);
    }
  }, []);

  const markAsRead = useCallback(
    async (notificationId: string | number) => {
      try {
        setNotifications((prev) =>
          prev.map((notification) =>
            notification.id === notificationId
              ? { ...notification, read: true }
              : notification
          )
        );

        if (token) {
          await fetch(
            `${getApiBaseUrl()}/api/notifications/${notificationId}/`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );
        }
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    },
    [token]
  );

  const markAllAsRead = useCallback(async () => {
    try {
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, read: true }))
      );

      if (token) {
        const apiBaseUrl = getApiBaseUrl();
        await fetch(`${apiBaseUrl}/api/notifications/bulk-actions/`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "mark_all_read" }),
        });
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  }, [token]);

  const removeNotification = useCallback(
    async (notificationId: string | number) => {
      try {
        setNotifications((prev) =>
          prev.filter((notification) => notification.id !== notificationId)
        );

        if (token) {
          await fetch(
            `${getApiBaseUrl()}/api/notifications/${notificationId}/`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
        }
      } catch (error) {
        console.error("Error removing notification:", error);
      }
    },
    [token]
  );

  const clearNotifications = useCallback(async () => {
    try {
      setNotifications([]);

      if (token) {
        const apiBaseUrl = getApiBaseUrl();
        await fetch(`${apiBaseUrl}/api/notifications/bulk-actions/`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "clear_all" }),
        });
      }
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  }, [token]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        console.log("Notification permission:", permission);
      });
    }
  }, []);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearNotifications,
    soundEnabled,
    setSoundEnabled,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
};
