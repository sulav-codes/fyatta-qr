"use client";

import { useAuth } from "@/context/AuthContext";
import QuickStats from "@/components/dashboard/QuickStats";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const { user } = useAuth();

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

      <div className="grid gap-6">
        {/* Placeholder for RecentOrders and PopularItems */}
        <div className="bg-card rounded-xl p-6 border border-border">
          <h2 className="text-xl font-semibold mb-4">Recent Orders</h2>
          <p className="text-muted-foreground text-center py-8">
            Recent orders component will appear here
          </p>
        </div>

        <div className="bg-card rounded-xl p-6 border border-border">
          <h2 className="text-xl font-semibold mb-4">Popular Items</h2>
          <p className="text-muted-foreground text-center py-8">
            Popular items component will appear here
          </p>
        </div>

        <div className="bg-card rounded-xl p-6 border border-border">
          <h2 className="text-xl font-semibold mb-4">Sales Report</h2>
          <p className="text-muted-foreground text-center py-8">
            Sales report component will appear here
          </p>
        </div>
      </div>
    </div>
  );
}
