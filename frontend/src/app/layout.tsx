import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/context/AuthContext";
import React, { ReactNode } from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: { title: string; description: string } = {
  title: "FyattaQR - Smart QR Menu for Restaurants",
  description:
    "Digitize your restaurant menu with QR codes. Help customers scan, browse, and order food easily.",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({
  children,
}: RootLayoutProps): React.ReactNode {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>
          <ThemeProvider>
            <Toaster />
            <main>{children}</main>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
