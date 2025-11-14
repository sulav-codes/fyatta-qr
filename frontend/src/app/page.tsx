"use client";

import Hero from "@/components/home/Hero";
import Navbar from "@/components/Navbar";
export default function Home() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar/>
      <Hero />
      {/*<Features />
      <HowItWorks />
      <Testimonials />
      <CallToAction />
      <Footer /> */}
    </div>
  );
}
