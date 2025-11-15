"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Bell, ChevronDown, Menu, Moon, Sun, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/context/NotificationContext";
import OrderNotification from "@/components/notifications/OrderNotification";
import { getApiBaseUrl } from "@/lib/api";
import Link from "next/link";

const DashboardHeader = ({ onMenuClick }: { onMenuClick: () => void }) => {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const { logout, user, token } = useAuth();
  const [logo, setLogo] = useState<string | null>(null);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [orderNotifications, setOrderNotifications] = useState<any[]>([]);
  const router = useRouter();

  // Use notification context
  const { notifications, unreadCount, markAsRead } = useNotifications();

  // Restaurant name
  const restaurantName = useMemo(() => {
    return user?.restaurantName || "Restaurant";
  }, [user?.restaurantName]);

  // Theme toggle
  const toggleTheme = useCallback(() => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  }, [theme]);

  // Fetch logo
  const fetchLogo = useCallback(async () => {
    if (!user?.id || !token || logoLoaded) return;

    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/vendors/${user.id}/profile`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        // Don't throw error, just log it and continue
        console.warn("Could not fetch vendor profile");
        return;
      }

      const data = await response.json();
      // Construct full logo URL if it exists
      const logoUrl = data.logo ? `${getApiBaseUrl()}${data.logo}` : null;
      setLogo(logoUrl);
    } catch (error) {
      console.error("Error fetching logo:", error);
    } finally {
      setLogoLoaded(true);
    }
  }, [user?.id, token, logoLoaded]);

  // Logo display
  const LogoDisplay = useMemo(() => {
    if (!logoLoaded && user?.id && token) {
      return (
        <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
          <span className="text-orange-500 text-xs animate-pulse">...</span>
        </div>
      );
    }

    if (logo) {
      return (
        <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 overflow-hidden">
          <img
            src={logo}
            alt="Logo"
            className="w-full h-full object-cover"
            onError={() => {
              setLogo(null);
            }}
          />
        </div>
      );
    }

    return (
      <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
        <span className="text-orange-500 text-xs font-medium">
          {restaurantName.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }, [logo, logoLoaded, user?.id, token, restaurantName]);

  useEffect(() => {
    if (user?.id && token && !logoLoaded) {
      fetchLogo();
    }
  }, [user?.id, token, fetchLogo, logoLoaded]);

  // Track new order notifications
  useEffect(() => {
    const newOrderNotifications = notifications.filter(
      (n) =>
        n.type === "order" &&
        !n.read &&
        !orderNotifications.some((on) => on.id === n.id)
    );

    if (newOrderNotifications.length > 0) {
      setOrderNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => n.id));
        const uniqueNew = newOrderNotifications.filter(
          (n) => !existingIds.has(n.id)
        );
        return [...prev, ...uniqueNew];
      });
    }
  }, [notifications]);

  const handleOrderNotificationClose = useCallback(
    (notificationId: string | number) => {
      setOrderNotifications((prev) =>
        prev.filter((n) => n.id !== notificationId)
      );
      markAsRead(notificationId);
    },
    [markAsRead]
  );

  const handleOrderAction = useCallback((orderId: number, action: string) => {
    console.log(`Order ${orderId} ${action}`);
    // Additional logic for order actions can be added here
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    router.push("/login");
  }, [logout, router]);

  return (
    <header className="h-16 bg-card border-b border-border sticky top-0 z-30">
      <div className="h-full px-4 flex items-center justify-between">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-accent rounded-md transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-4 flex-1 px-4">
          <div className="text-lg font-medium truncate">{restaurantName}</div>
        </div>

        <div className="flex items-center space-x-2">
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

          <Link href="/dashboard/notifications">
            <Button
              variant="ghost"
              size="icon"
              className="relative transition-colors"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center space-x-2 transition-colors"
              >
                {LogoDisplay}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link
                  href="/dashboard/settings"
                  className="flex items-center cursor-pointer"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-500 cursor-pointer"
                onClick={handleLogout}
              >
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Order Notification Popups */}
      {orderNotifications.map((notification) => (
        <OrderNotification
          key={notification.id}
          notification={notification}
          onClose={handleOrderNotificationClose}
          onAction={handleOrderAction}
        />
      ))}
    </header>
  );
};

export default DashboardHeader;
