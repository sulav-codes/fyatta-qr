"use client";

import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import {
  Store,
  Mail,
  Lock,
  MapPin,
  User,
  Phone,
  ClipboardList,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { getApiBaseUrl } from "@/lib/api";

interface FormData {
  restaurant_name: string;
  owner_name: string;
  email: string;
  phone: string;
  location: string;
  description: string;
  opening_time: string;
  closing_time: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  restaurant_name: string;
  owner_name: string;
  email: string;
  phone: string;
  location: string;
  description: string;
  opening_time: string;
  closing_time: string;
  password: string;
  confirmPassword: string;
}

interface FormField {
  label: string;
  name: keyof FormData;
  type: string;
  placeholder: string;
  icon: React.ReactElement;
}

interface RegisterResponse {
  error?: string;
  message?: string;
}

export default function Signup() {
  const router = useRouter();
  const [mounted, setMounted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState<FormData>({
    restaurant_name: "",
    owner_name: "",
    email: "",
    phone: "",
    location: "",
    description: "",
    opening_time: "10:00",
    closing_time: "22:00",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<FormErrors>({
    restaurant_name: "",
    owner_name: "",
    email: "",
    phone: "",
    location: "",
    description: "",
    opening_time: "",
    closing_time: "",
    password: "",
    confirmPassword: "",
  });

  // Ensure component is mounted before using router
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when field is being edited
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {
      restaurant_name: "",
      owner_name: "",
      email: "",
      phone: "",
      location: "",
      description: "",
      opening_time: "",
      closing_time: "",
      password: "",
      confirmPassword: "",
    };
    let isValid = true;

    // Restaurant name validation
    if (!formData.restaurant_name.trim()) {
      newErrors.restaurant_name = "Restaurant name is required";
      isValid = false;
    } else {
      const nameRegex = /^[a-zA-Z0-9\s.,'-]{3,50}$/;
      if (!nameRegex.test(formData.restaurant_name)) {
        newErrors.restaurant_name =
          "Name must be 3-50 characters and can include letters, numbers, spaces, and basic punctuation";
        isValid = false;
      }
    }

    // Owner name validation
    if (!formData.owner_name.trim()) {
      newErrors.owner_name = "Owner name is required";
      isValid = false;
    } else {
      const nameRegex = /^[a-zA-Z\s.,'-]{3,50}$/;
      if (!nameRegex.test(formData.owner_name)) {
        newErrors.owner_name =
          "Owner name must be 3-50 characters and can include letters, spaces, and basic punctuation";
        isValid = false;
      }
    }

    // Location validation
    if (!formData.location.trim()) {
      newErrors.location = "Location is required";
      isValid = false;
    }

    // Phone validation
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
      isValid = false;
    } else {
      const phoneRegex = /^(\+\d{1,3}[- ]?)?\d{10}$/;
      if (!phoneRegex.test(formData.phone.replace(/\s+/g, ""))) {
        newErrors.phone = "Enter a valid phone number (e.g. +977 9812345678)";
        isValid = false;
      }
    }

    // Description validation
    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
      isValid = false;
    } else if (formData.description.length < 20) {
      newErrors.description = "Description must be at least 20 characters";
      isValid = false;
    }

    // Business hours validation
    if (!formData.opening_time) {
      newErrors.opening_time = "Opening time is required";
      isValid = false;
    }

    if (!formData.closing_time) {
      newErrors.closing_time = "Closing time is required";
      isValid = false;
    }

    if (formData.opening_time >= formData.closing_time) {
      newErrors.closing_time = "Closing time must be after opening time";
      isValid = false;
    }

    // Email validation
    if (!formData.email) {
      newErrors.email = "Email is required";
      isValid = false;
    } else {
      const mailFormat = /^[a-zA-Z0-9._%+-]+@[a-zA-Z.-]+\.[a-zA-Z]{2,}$/;
      if (!mailFormat.test(formData.email)) {
        newErrors.email = "Enter a valid email";
        isValid = false;
      }
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
      isValid = false;
    } else if (formData.password.length < 8) {
      newErrors.password = "Minimum 8 characters required";
      isValid = false;
    } else {
      const passStrength =
        /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/;
      if (!passStrength.test(formData.password)) {
        newErrors.password =
          "Include uppercase, lowercase, number & special character";
        isValid = false;
      }
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Confirm your password";
      isValid = false;
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.email.split("@")[0],
          email: formData.email,
          password: formData.password,
          restaurantName: formData.restaurant_name,
          ownerName: formData.owner_name,
          phone: formData.phone,
          location: formData.location,
          description: formData.description,
          openingTime: formData.opening_time,
          closingTime: formData.closing_time,
        }),
      });

      const data: RegisterResponse = await response.json();
      if (response.ok) {
        // Only redirect if component is mounted
        if (mounted) {
          toast.success("Registration successful! Please log in.");
          router.push("/login");
        }
      } else {
        // error message using toast
        const errorMsg = data.error || "Registration failed.";
        toast.error(errorMsg);
        console.error("Registration error:", data);
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Basic form fields
  const basicFormFields: FormField[] = [
    {
      label: "Restaurant Name",
      name: "restaurant_name",
      type: "text",
      placeholder: "Your restaurant name",
      icon: (
        <Store className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
      ),
    },
    {
      label: "Owner Name",
      name: "owner_name",
      type: "text",
      placeholder: "Full name of owner",
      icon: (
        <User className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
      ),
    },
    {
      label: "Email",
      name: "email",
      type: "email",
      placeholder: "Enter your email",
      icon: (
        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
      ),
    },
    {
      label: "Phone Number",
      name: "phone",
      type: "tel",
      placeholder: "+977 9812345678",
      icon: (
        <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
      ),
    },
    {
      label: "Location",
      name: "location",
      type: "text",
      placeholder: "Restaurant location",
      icon: (
        <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
      ),
    },
  ];

  // Security form fields
  const securityFormFields: FormField[] = [
    {
      label: "Password",
      name: "password",
      type: "password",
      placeholder: "Create a password",
      icon: (
        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
      ),
    },
    {
      label: "Confirm Password",
      name: "confirmPassword",
      type: "password",
      placeholder: "Confirm your password",
      icon: (
        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
      ),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950">
      <Navbar />
      <div className="flex-1 bg-gradient-to-br from-orange-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 py-12 px-4 md:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto pb-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 mb-4">
              <CheckCircle2 className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium text-orange-800 dark:text-orange-300">
                Join 500+ Restaurant Owners
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gray-900 dark:text-white">
              Create Your Account
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Start managing your restaurant menu digitally in minutes
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-6 md:p-10">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Restaurant Information */}
              <div>
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
                  <Store className="h-5 w-5 text-orange-500" />
                  Restaurant Information
                </h2>
                <div className="grid md:grid-cols-2 gap-5">
                  {basicFormFields.map((field) => (
                    <div
                      key={field.name}
                      className={
                        field.name === "location" ? "md:col-span-2" : ""
                      }
                    >
                      <label
                        htmlFor={field.name}
                        className="text-sm font-medium block mb-2"
                      >
                        {field.label}
                      </label>
                      <div className="relative">
                        {field.icon}
                        <Input
                          id={field.name}
                          name={field.name}
                          type={field.type}
                          placeholder={field.placeholder}
                          value={formData[field.name]}
                          onChange={handleChange}
                          className={`pl-10 h-11 ${
                            errors[field.name]
                              ? "border-red-500 focus-visible:ring-red-500"
                              : ""
                          }`}
                        />
                      </div>
                      {errors[field.name] && (
                        <p className="text-xs font-medium text-red-500 mt-1.5">
                          {errors[field.name]}
                        </p>
                      )}
                    </div>
                  ))}

                  {/* Description textarea */}
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium block mb-2 text-gray-900 dark:text-white">
                      Restaurant Description
                    </label>
                    <div className="relative">
                      <ClipboardList className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <Textarea
                        name="description"
                        placeholder="Tell us about your restaurant..."
                        value={formData.description}
                        onChange={handleChange}
                        className={`pl-10 min-h-[100px] resize-none ${
                          errors.description
                            ? "border-red-500 focus-visible:ring-red-500"
                            : ""
                        }`}
                      />
                    </div>
                    {errors.description && (
                      <p className="text-xs font-medium text-red-500 mt-1.5">
                        {errors.description}
                      </p>
                    )}
                  </div>

                  {/* Business Hours */}
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium block mb-2 text-gray-900 dark:text-white">
                      Business Hours
                    </label>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">
                          Opening Time
                        </label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                          <Input
                            type="time"
                            name="opening_time"
                            value={formData.opening_time}
                            onChange={handleChange}
                            className={`pl-10 h-11 ${
                              errors.opening_time
                                ? "border-red-500 focus-visible:ring-red-500"
                                : ""
                            }`}
                          />
                        </div>
                        {errors.opening_time && (
                          <p className="text-xs font-medium text-red-500 mt-1.5">
                            {errors.opening_time}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">
                          Closing Time
                        </label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                          <Input
                            type="time"
                            name="closing_time"
                            value={formData.closing_time}
                            onChange={handleChange}
                            className={`pl-10 h-11 ${
                              errors.closing_time
                                ? "border-red-500 focus-visible:ring-red-500"
                                : ""
                            }`}
                          />
                        </div>
                        {errors.closing_time && (
                          <p className="text-xs font-medium text-red-500 mt-1.5">
                            {errors.closing_time}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security */}
              <div className="border-t pt-8">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
                  <Lock className="h-5 w-5 text-orange-500" />
                  Security
                </h2>
                <div className="grid md:grid-cols-2 gap-5">
                  {securityFormFields.map((field) => (
                    <div key={field.name}>
                      <label
                        htmlFor={field.name}
                        className="text-sm font-medium block mb-2"
                      >
                        {field.label}
                      </label>
                      <div className="relative">
                        {field.icon}
                        <Input
                          id={field.name}
                          name={field.name}
                          type={field.type}
                          placeholder={field.placeholder}
                          value={formData[field.name]}
                          onChange={handleChange}
                          className={`pl-10 h-11 ${
                            errors[field.name]
                              ? "border-red-500 focus-visible:ring-red-500"
                              : ""
                          }`}
                        />
                      </div>
                      {errors[field.name] && (
                        <p className="text-xs font-medium text-red-500 mt-1.5">
                          {errors[field.name]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6 text-base font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="animate-spin h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Creating account...
                    </span>
                  ) : (
                    "Create Account"
                  )}
                </Button>

                <p className="text-center mt-6 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Already have an account?{" "}
                  </span>
                  <Link
                    href="/login"
                    className="text-orange-500 hover:text-orange-600 font-semibold"
                  >
                    Sign in instead
                  </Link>
                </p>
              </div>
            </form>
          </div>

          {/* Trust Indicators */}
          <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Free forever</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Setup in 5 minutes</span>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
