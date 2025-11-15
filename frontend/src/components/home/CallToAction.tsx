"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export default function CallToAction() {
  return (
    <section className="py-20 md:py-28 bg-gradient-to-br from-orange-500 via-orange-600 to-orange-500 dark:from-orange-600 dark:via-orange-700 dark:to-orange-600 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 md:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <span className="text-sm font-medium text-white">
              Limited Time Offer
            </span>
          </div>

          {/* Heading */}
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Restaurant?
          </h2>

          {/* Description */}
          <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join 500+ restaurants already using FyattaQR. Start your free trial
            today and see the difference digital menus can make.
          </p>

          {/* Benefits */}
          <div className="flex flex-wrap justify-center gap-6 mb-10">
            <div className="flex items-center gap-2 text-white">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">14-day free trial</span>
            </div>
            <div className="flex items-center gap-2 text-white">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">No credit card required</span>
            </div>
            <div className="flex items-center gap-2 text-white">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Cancel anytime</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-white text-orange-600 font-semibold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 group"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-white/10 backdrop-blur-sm text-white font-semibold border-2 border-white/30 hover:bg-white/20 transition-all duration-200"
            >
              Sign In
            </Link>
          </div>

          {/* Trust Badge */}
          <p className="text-white/80 text-sm mt-8">
            ⭐⭐⭐⭐⭐ Rated 4.9/5 by 500+ restaurant owners
          </p>
        </div>
      </div>
    </section>
  );
}
