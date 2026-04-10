"use client";

import { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { NotificationProvider } from "@/context/NotificationContext";
import DashboardSidebar from "@/components/dashboard/Sidebar";
import DashboardHeader from "@/components/dashboard/Header";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isLoggedIn, isLoading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push("/login");
    }
  }, [isLoggedIn, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  return (
    <NotificationProvider>
      <div className="flex h-screen bg-background">
        <DashboardSidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />

        {/* Main content area - takes remaining space */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <DashboardHeader onMenuClick={toggleSidebar} />

          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </NotificationProvider>
  );
}
