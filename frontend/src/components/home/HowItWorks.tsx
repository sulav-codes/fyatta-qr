"use client";

import { UserPlus, UploadCloud, QrCode, Rocket } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    number: "01",
    title: "Create Your Account",
    description:
      "Sign up in seconds with your restaurant details. No credit card required to get started.",
  },
  {
    icon: UploadCloud,
    number: "02",
    title: "Add Your Menu",
    description:
      "Upload your menu items with photos, prices, and descriptions. Organize by categories easily.",
  },
  {
    icon: QrCode,
    number: "03",
    title: "Generate QR Codes",
    description:
      "Get unique QR codes for each table. Print and display them for customers to scan.",
  },
  {
    icon: Rocket,
    number: "04",
    title: "Start Receiving Orders",
    description:
      "Customers scan, browse, and order. You manage everything from your dashboard.",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-20 md:py-28 bg-gradient-to-br from-orange-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 mb-6">
            <Rocket className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium text-orange-800 dark:text-orange-300">
              Simple Process
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Get Started in <span className="text-orange-500">4 Easy Steps</span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Transform your restaurant into a digital powerhouse in minutes. No
            technical expertise required.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Connector Line (hidden on mobile, shown on desktop) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-orange-300 to-orange-200 dark:from-orange-700 dark:to-orange-800 z-0"></div>
              )}

              <div className="relative bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-xl transition-all duration-300 z-10">
                {/* Number Badge */}
                <div className="absolute -top-4 -right-4 w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {step.number}
                </div>

                {/* Icon */}
                <div className="w-14 h-14 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-4">
                  <step.icon className="h-7 w-7 text-orange-500" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                  {step.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
