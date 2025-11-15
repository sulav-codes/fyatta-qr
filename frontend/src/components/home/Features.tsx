"use client";

import {
  QrCode,
  Zap,
  Shield,
  Clock,
  TrendingUp,
  Smartphone,
} from "lucide-react";

const features = [
  {
    icon: QrCode,
    title: "Smart QR Technology",
    description:
      "Generate unique QR codes for each table. Customers scan and order instantly without waiting for staff.",
  },
  {
    icon: Zap,
    title: "Lightning Fast Setup",
    description:
      "Get your digital menu up and running in under 5 minutes. No technical knowledge required.",
  },
  {
    icon: Shield,
    title: "Secure & Reliable",
    description:
      "Bank-level security for your data. 99.9% uptime guarantee with regular backups.",
  },
  {
    icon: Clock,
    title: "Real-time Updates",
    description:
      "Update menu items, prices, and availability instantly. Changes reflect immediately for customers.",
  },
  {
    icon: TrendingUp,
    title: "Analytics Dashboard",
    description:
      "Track popular items, peak hours, and revenue with detailed insights and reports.",
  },
  {
    icon: Smartphone,
    title: "Mobile Optimized",
    description:
      "Perfect experience on all devices. Your menu looks stunning on phones, tablets, and desktops.",
  },
];

export default function Features() {
  return (
    <section className="py-20 md:py-28 bg-white dark:bg-gray-950">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 mb-6">
            <Zap className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium text-orange-800 dark:text-orange-300">
              Powerful Features
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Everything You Need to Go{" "}
            <span className="text-orange-500">Digital</span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Streamline your restaurant operations with our comprehensive suite
            of tools designed specifically for small businesses and street food
            vendors.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-xl transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="h-6 w-6 text-orange-500" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
