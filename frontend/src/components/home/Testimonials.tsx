"use client";

import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Rajesh Kumar",
    role: "Owner, Spice Garden",
    image: "https://i.pravatar.cc/150?img=12",
    rating: 5,
    content:
      "FyattaQR has transformed how we serve customers. Orders are faster, more accurate, and customers love the convenience. Our revenue increased by 30% in just 2 months!",
  },
  {
    name: "Priya Sharma",
    role: "Manager, Cafe Delight",
    image: "https://i.pravatar.cc/150?img=5",
    rating: 5,
    content:
      "The setup was incredibly easy. We went digital in less than 10 minutes. The real-time menu updates are a game-changer for our daily specials.",
  },
  {
    name: "Amit Patel",
    role: "Owner, Street Food Corner",
    image: "https://i.pravatar.cc/150?img=33",
    rating: 5,
    content:
      "As a small street food vendor, I never thought I could afford this technology. FyattaQR made it accessible and affordable. My customers are impressed!",
  },
  {
    name: "Sneha Reddy",
    role: "Owner, Tiffin Center",
    image: "https://i.pravatar.cc/150?img=9",
    rating: 5,
    content:
      "The analytics dashboard helps me understand what my customers love. I can now make data-driven decisions about my menu. Highly recommend!",
  },
  {
    name: "Vikram Singh",
    role: "Owner, Tandoor House",
    image: "https://i.pravatar.cc/150?img=15",
    rating: 5,
    content:
      "Customer support is outstanding. They helped me set everything up and answered all my questions patiently. The QR system works flawlessly.",
  },
  {
    name: "Anita Desai",
    role: "Owner, Chai & Snacks",
    image: "https://i.pravatar.cc/150?img=20",
    rating: 5,
    content:
      "My customers appreciate the contactless ordering. It's safer, faster, and more modern. FyattaQR helped me compete with bigger restaurants.",
  },
];

export default function Testimonials() {
  return (
    <section className="py-20 md:py-28 bg-white dark:bg-gray-950">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 mb-6">
            <Star className="h-4 w-4 text-orange-500 fill-orange-500" />
            <span className="text-sm font-medium text-orange-800 dark:text-orange-300">
              Customer Stories
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Loved by <span className="text-orange-500">Restaurant Owners</span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Join hundreds of satisfied restaurant owners who transformed their
            business with FyattaQR.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="relative p-6 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-xl transition-all duration-300"
            >
              {/* Quote Icon */}
              <div className="absolute -top-3 -left-3 w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Quote className="h-5 w-5 text-orange-500" />
              </div>

              {/* Rating */}
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 text-yellow-400 fill-yellow-400"
                  />
                ))}
              </div>

              {/* Content */}
              <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <img
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-orange-200 dark:border-orange-800"
                />
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {testimonial.name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
