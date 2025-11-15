"use client";

import { Check, Zap } from "lucide-react";
import Link from "next/link";

const plans = [
  {
    name: "Starter",
    price: "Free",
    period: "Forever",
    description: "Perfect for small food stalls and testing the waters",
    features: [
      "Up to 20 menu items",
      "1 table QR code",
      "Basic analytics",
      "Email support",
      "Mobile optimized menu",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Professional",
    price: "₹499",
    period: "per month",
    description: "Ideal for small to medium restaurants",
    features: [
      "Unlimited menu items",
      "Up to 10 table QR codes",
      "Advanced analytics",
      "Priority email support",
      "Custom branding",
      "Real-time order notifications",
      "Export reports",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "₹1,499",
    period: "per month",
    description: "For established restaurants and chains",
    features: [
      "Everything in Professional",
      "Unlimited tables",
      "Multi-location support",
      "24/7 phone support",
      "Custom integrations",
      "Dedicated account manager",
      "API access",
      "White-label options",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export default function Pricing() {
  return (
    <section className="py-20 md:py-28 bg-gradient-to-br from-orange-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 mb-6">
            <Zap className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium text-orange-800 dark:text-orange-300">
              Simple Pricing
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Choose Your <span className="text-orange-500">Perfect Plan</span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Start free and upgrade as you grow. No hidden fees, cancel anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative p-8 rounded-2xl border-2 transition-all duration-300 ${
                plan.popular
                  ? "border-orange-500 bg-white dark:bg-gray-900 shadow-2xl scale-105"
                  : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-xl"
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-semibold">
                  Most Popular
                </div>
              )}

              {/* Plan Name */}
              <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                {plan.name}
              </h3>

              {/* Price */}
              <div className="mb-4">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-gray-600 dark:text-gray-400 ml-2">
                    {plan.period}
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {plan.description}
              </p>

              {/* CTA Button */}
              <Link
                href="/register"
                className={`block w-full text-center py-3 px-6 rounded-xl font-semibold transition-all duration-200 mb-6 ${
                  plan.popular
                    ? "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg"
                    : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                }`}
              >
                {plan.cta}
              </Link>

              {/* Features */}
              <div className="space-y-3">
                {plan.features.map((feature, featureIndex) => (
                  <div key={featureIndex} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 text-sm">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Note */}
        <div className="text-center mt-12">
          <p className="text-gray-600 dark:text-gray-400">
            All plans include a 14-day free trial. No credit card required.
          </p>
        </div>
      </div>
    </section>
  );
}
