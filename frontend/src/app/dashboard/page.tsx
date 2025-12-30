"use client";

import { useAuth } from "@/context/AuthContext";
import QuickStats from "@/components/dashboard/QuickStats";
import { Button } from "@/components/ui/button";
import {
  Plus,
  TrendingUp,
  Clock,
  Package,
  DollarSign,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { getApiBaseUrl } from "@/lib/api";
import toast from "react-hot-toast";
import { usePermissions } from "@/hooks/usePermissions";

interface Order {
  id: number;
  order_id: string;
  status: string;
  total_amount: string;
  table_name: string;
  time_elapsed: string;
  items: Array<{ name: string; quantity: number; price: string }>;
}

interface MenuItem {
  id: number;
  name: string;
  price: string;
  image: string | null;
  order_count: number;
  total_revenue: string;
}

interface SalesData {
  total_revenue: number;
  total_orders: number;
  avg_order_value: number;
  peak_hour: string | null;
  revenue_change: number;
  orders_change: number;
  daily_breakdown: Array<{ date: string; revenue: number; orders: number }>;
}

export default function Dashboard() {
  const { user, token } = useAuth();
  const { getEffectiveVendorId } = usePermissions();
  const vendorId = getEffectiveVendorId();
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [popularItems, setPopularItems] = useState<MenuItem[]>([]);
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadingSales, setLoadingSales] = useState(true);

  useEffect(() => {
    if (vendorId && token) {
      fetchRecentOrders();
      fetchPopularItems();
      fetchSalesReport();
    }
  }, [vendorId, token]);

  const getTimeElapsed = (createdAt: string) => {
    const now = new Date();
    const orderTime = new Date(createdAt);
    const diffMs = now.getTime() - orderTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return "Just now";
  };

  const fetchRecentOrders = async () => {
    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/vendors/${vendorId}/dashboard/recent-orders?limit=5`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        const ordersWithTime = (data.recentOrders || []).map((order: any) => ({
          ...order,
          order_id: order.orderId,
          total_amount: order.totalAmount,
          table_name: order.tableName,
          time_elapsed: getTimeElapsed(order.createdAt),
        }));
        setRecentOrders(ordersWithTime);
      }
    } catch (error) {
      console.error("Error fetching recent orders:", error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchPopularItems = async () => {
    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/vendors/${vendorId}/dashboard/popular-items?limit=5`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        const itemsFormatted = (data.popularItems || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          image: null,
          order_count: item.orderCount,
          total_revenue: item.totalRevenue.toFixed(2),
        }));
        setPopularItems(itemsFormatted);
      }
    } catch (error) {
      console.error("Error fetching popular items:", error);
    } finally {
      setLoadingItems(false);
    }
  };

  const fetchSalesReport = async () => {
    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/vendors/${vendorId}/dashboard/sales?timeframe=week`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        // Transform backend response to match frontend expectations
        const transformedData = {
          total_revenue: data.totalRevenue || 0,
          total_orders: data.totalOrders || 0,
          avg_order_value:
            data.totalOrders > 0 ? data.totalRevenue / data.totalOrders : 0,
          peak_hour: null,
          revenue_change: 0,
          orders_change: 0,
          daily_breakdown: (data.salesData || []).map((day: any) => ({
            date: day.date,
            revenue: parseFloat(day.revenue || 0),
            orders: parseInt(day.orderCount || 0),
          })),
        };
        setSalesData(transformedData);
      }
    } catch (error) {
      console.error("Error fetching sales report:", error);
    } finally {
      setLoadingSales(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {user?.name || user?.email}
          </p>
        </div>
        <Link href="/dashboard/create-menu">
          <Button className="bg-orange-500 hover:bg-orange-600 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Create Menu Item
          </Button>
        </Link>
      </div>

      <QuickStats />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <div className="bg-card rounded-xl p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Orders</h2>
            <Link href="/dashboard/orders">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </div>
          {loadingOrders ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : recentOrders.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No recent orders
            </p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{order.order_id}</span>
                      <span className="text-xs text-muted-foreground">
                        • {order.table_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{order.time_elapsed}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      Rs. {order.total_amount}
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full inline-block ${
                        order.status === "completed"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : order.status === "pending"
                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Popular Items */}
        <div className="bg-card rounded-xl p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Popular Items</h2>
            <Link href="/dashboard/menu">
              <Button variant="ghost" size="sm">
                View Menu
              </Button>
            </Link>
          </div>
          {loadingItems ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : popularItems.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No popular items yet
            </p>
          ) : (
            <div className="space-y-3">
              {popularItems.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {item.order_count} orders
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Rs. {item.total_revenue}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      Rs. {item.price}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sales Report */}
      <div className="bg-card rounded-xl p-6 border border-border">
        <h2 className="text-xl font-semibold mb-6">Sales Report (This Week)</h2>
        {loadingSales ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : salesData ? (
          <div>
            <div className="grid gap-4 md:grid-cols-3 mb-6">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    Total Revenue
                  </span>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <div className="text-2xl font-bold">
                  Rs. {salesData.total_revenue.toFixed(2)}
                </div>
                <div className="flex items-center gap-1 text-xs mt-1">
                  {salesData.revenue_change > 0 ? (
                    <>
                      <ArrowUp className="h-3 w-3 text-green-500" />
                      <span className="text-green-500">
                        +{salesData.revenue_change}%
                      </span>
                    </>
                  ) : salesData.revenue_change < 0 ? (
                    <>
                      <ArrowDown className="h-3 w-3 text-red-500" />
                      <span className="text-red-500">
                        {salesData.revenue_change}%
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">This week</span>
                  )}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    Total Orders
                  </span>
                  <Package className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-2xl font-bold">
                  {salesData.total_orders}
                </div>
                <div className="flex items-center gap-1 text-xs mt-1">
                  {salesData.orders_change > 0 ? (
                    <>
                      <ArrowUp className="h-3 w-3 text-green-500" />
                      <span className="text-green-500">
                        +{salesData.orders_change}%
                      </span>
                    </>
                  ) : salesData.orders_change < 0 ? (
                    <>
                      <ArrowDown className="h-3 w-3 text-red-500" />
                      <span className="text-red-500">
                        {salesData.orders_change}%
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">This week</span>
                  )}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    Avg Order Value
                  </span>
                  <DollarSign className="h-4 w-4 text-orange-500" />
                </div>
                <div className="text-2xl font-bold">
                  Rs. {salesData.avg_order_value.toFixed(2)}
                </div>
                {salesData.peak_hour && (
                  <div className="flex items-center gap-1 text-xs mt-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Peak: {salesData.peak_hour}</span>
                  </div>
                )}
              </div>
            </div>
            {salesData.daily_breakdown &&
              salesData.daily_breakdown.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-3 text-muted-foreground">
                    Daily Breakdown
                  </h3>
                  <div className="space-y-2">
                    {salesData.daily_breakdown.slice(0, 7).map((day, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-24 text-sm text-muted-foreground">
                          {day.date}
                        </div>
                        <div className="flex-1 bg-muted rounded-full h-8 relative overflow-hidden">
                          <div
                            className="bg-orange-500 h-full rounded-full flex items-center px-3"
                            style={{
                              width: `${Math.max(
                                (day.revenue /
                                  Math.max(
                                    ...salesData.daily_breakdown.map(
                                      (d) => d.revenue
                                    )
                                  )) *
                                  100,
                                5
                              )}%`,
                            }}
                          >
                            <span className="text-xs font-medium text-white">
                              Rs. {day.revenue.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <div className="w-16 text-right text-sm text-muted-foreground">
                          {day.orders} orders
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            No sales data available
          </p>
        )}
      </div>
    </div>
  );
}
