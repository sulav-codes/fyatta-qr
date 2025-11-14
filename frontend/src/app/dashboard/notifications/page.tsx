"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import {
  Bell,
  Trash2,
  Search,
  Filter,
  CheckCircle,
  Info,
  DollarSign,
  ShoppingBag,
  Clock,
  CheckSquare,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Date formatting function
const formatTimeAgo = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800)
    return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString();
};

export default function NotificationsPage() {
  const { token } = useAuth();
  const {
    notifications: contextNotifications,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    removeNotification,
    fetchNotifications,
  } = useNotifications();

  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNotifications, setSelectedNotifications] = useState<number[]>(
    []
  );

  // Get notification type icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "new_order":
        return (
          <ShoppingBag className="w-5 h-5 text-green-600 dark:text-green-400" />
        );
      case "payment":
        return (
          <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        );
      case "order_status":
        return (
          <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
        );
      default:
        return <Info className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  // Get notification type badge
  const getTypeBadge = (type: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      new_order: {
        label: "New Order",
        color:
          "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
      },
      payment: {
        label: "Payment",
        color:
          "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300",
      },
      order_status: {
        label: "Status Update",
        color:
          "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300",
      },
      info: {
        label: "Info",
        color: "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300",
      },
    };

    const badge = badges[type] || badges.info;
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.color}`}
      >
        {badge.label}
      </span>
    );
  };

  // Filter notifications based on current filters
  const filteredNotifications = contextNotifications.filter((notification) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "unread" && !notification.read) ||
      (filter === "read" && notification.read);

    const matchesType =
      typeFilter === "all" || notification.type === typeFilter;

    const matchesSearch =
      searchTerm === "" ||
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesType && matchesSearch;
  });

  // Handle bulk actions
  const handleBulkMarkRead = async () => {
    if (selectedNotifications.length > 0) {
      for (const id of selectedNotifications) {
        await markAsRead(id);
      }
      setSelectedNotifications([]);
    } else {
      await markAllAsRead();
    }
  };

  const handleBulkDelete = async () => {
    if (selectedNotifications.length > 0) {
      for (const id of selectedNotifications) {
        await removeNotification(id);
      }
      setSelectedNotifications([]);
    } else {
      await clearNotifications();
    }
  };

  // Toggle notification selection
  const toggleNotificationSelection = (id: number) => {
    setSelectedNotifications((prev) =>
      prev.includes(id) ? prev.filter((nId) => nId !== id) : [...prev, id]
    );
  };

  // Select all filtered notifications
  const selectAllFiltered = () => {
    setSelectedNotifications(filteredNotifications.map((n) => Number(n.id)));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedNotifications([]);
  };

  useEffect(() => {
    if (token && fetchNotifications) {
      fetchNotifications();
      setLoading(false);
    }
  }, [token, fetchNotifications]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  const unreadCount = contextNotifications.filter((n) => !n.read).length;

  return (
    <main className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Bell className="h-7 w-7" />
            Notifications
            {unreadCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-900/20 dark:text-red-200">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Stay updated with your restaurant activities
          </p>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search notifications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                {filter === "all"
                  ? "All"
                  : filter === "unread"
                  ? "Unread"
                  : "Read"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFilter("all")}>
                All Notifications
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("unread")}>
                Unread Only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("read")}>
                Read Only
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {selectedNotifications.length > 0 ? (
            <>
              <Button variant="outline" onClick={handleBulkMarkRead}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark Read
              </Button>
              <Button variant="outline" onClick={handleBulkDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                <X className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => markAllAsRead()}>
                <CheckSquare className="w-4 h-4 mr-2" />
                Mark All Read
              </Button>
              <Button variant="outline" onClick={selectAllFiltered}>
                <CheckSquare className="w-4 h-4 mr-2" />
                Select All
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No notifications</h3>
          <p className="text-gray-500">
            {searchTerm
              ? "No notifications match your search"
              : "You're all caught up!"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-card border rounded-lg p-4 hover:shadow-md transition-shadow ${
                !notification.read ? "border-l-4 border-l-orange-500" : ""
              }`}
            >
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  checked={selectedNotifications.includes(
                    Number(notification.id)
                  )}
                  onChange={() =>
                    toggleNotificationSelection(Number(notification.id))
                  }
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
                />

                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center gap-3">
                      {getNotificationIcon(notification.type)}
                      <div>
                        <h3
                          className={`font-semibold ${
                            !notification.read
                              ? "text-foreground"
                              : "text-gray-600"
                          }`}
                        >
                          {notification.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {notification.message}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getTypeBadge(notification.type)}
                      {!notification.read && (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                          New
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-500">
                      {formatTimeAgo(notification.created_at)}
                    </p>
                    <div className="flex gap-2">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Mark Read
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeNotification(notification.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
