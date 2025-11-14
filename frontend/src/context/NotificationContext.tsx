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
  const audioRef = useRef<HTMLAudioElement>(null);

  // Fetch notifications from server
  const fetchNotifications = useCallback(async () => {
    if (!user?.id || !token) return;

    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/notifications/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const serverNotifications = data.notifications || [];
        setNotifications(serverNotifications);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  }, [user?.id, token]);

  useEffect(() => {
    if (user?.id && token) {
      fetchNotifications();

      // Poll for notifications every 10 seconds
      const interval = setInterval(fetchNotifications, 10000);

      return () => clearInterval(interval);
    }
  }, [user?.id, token, fetchNotifications]);

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
    fetchNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="auto">
        <source src="/notification-sound.mp3" type="audio/mpeg" />
        <source src="/notification-sound.wav" type="audio/wav" />
        <source src="/notification-sound.ogg" type="audio/ogg" />
      </audio>
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
