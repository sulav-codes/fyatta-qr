import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LoginForm from "@/components/auth/LoginForm";
import { Suspense } from "react";

function LoginContent() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950">
      <Navbar />
      <div className="flex-1 grid lg:grid-cols-2 min-h-screen">
        {/* Left Side - Form */}
        <div className="flex items-center justify-center p-6 md:p-12 bg-white dark:bg-gray-950 min-h-screen">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center">
              <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gray-900 dark:text-white">
                Welcome Back
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Sign in to manage your restaurant menu
              </p>
            </div>

            <LoginForm />

            <div className="text-center">
              <span className="text-gray-600 dark:text-gray-400">
                Don&apos;t have an account?{" "}
              </span>
              <Link
                href="/register"
                className="text-orange-500 hover:text-orange-600 font-semibold"
              >
                Create one now
              </Link>
            </div>
          </div>
        </div>

        {/* Right Side - Hero Section */}
        <div className="hidden lg:flex items-center justify-center p-12 bg-linear-to-br from-orange-50 via-orange-100 to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden">
          {/* Background Decoration */}
          <div className="absolute inset-0">
            <div className="absolute top-0 right-0 w-96 h-96 bg-orange-300/20 dark:bg-orange-600/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-200/20 dark:bg-orange-700/10 rounded-full blur-3xl"></div>
          </div>

          <div className="relative z-10 max-w-lg text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-orange-200 dark:border-orange-800">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
              </span>
              <span className="text-sm font-medium text-orange-800 dark:text-orange-300">
                Join 500+ Restaurant Owners
              </span>
            </div>

            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white">
              Manage Your Menu with{" "}
              <span className="text-orange-500">Ease</span>
            </h2>

            <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
              Access your dashboard to update menu items, track orders, and
              manage your restaurant operations seamlessly.
            </p>

            <div className="grid grid-cols-3 gap-6 pt-6">
              <div className="space-y-2">
                <div className="text-3xl font-bold text-orange-600">500+</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Restaurants
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-orange-600">10K+</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Menu Items
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-orange-600">50K+</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Orders Served
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950 text-gray-600 dark:text-gray-300">
      Loading login...
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  );
}
