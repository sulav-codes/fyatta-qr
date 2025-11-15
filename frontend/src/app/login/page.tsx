"use client";
import { useState, useCallback, ChangeEvent, FormEvent } from "react";
import { Mail, Lock, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getApiBaseUrl } from "@/lib/api";

interface FormFieldProps {
  label: string;
  icon: LucideIcon;
  type: string;
  name: string;
  placeholder: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  error?: string;
}

const FormField = ({
  label,
  icon: Icon,
  type,
  name,
  placeholder,
  value,
  onChange,
  error,
}: FormFieldProps) => (
  <div className="space-y-2">
    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
      {label}
    </label>
    <div className="relative">
      <Icon className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
      <Input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`pl-10 ${error ? "border-red-500" : ""}`}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  </div>
);

interface FormData {
  email: string;
  password: string;
}

interface FormErrors {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user: any; // Replace 'any' with your user type
  error?: string;
}

export default function Login() {
  const router = useRouter();
  const { login: contextLogin } = useAuth();

  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<FormErrors>({
    email: "",
    password: "",
  });

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
      if (errors[name as keyof FormErrors]) {
        setErrors((prev) => ({ ...prev, [name]: "" }));
      }
    },
    [errors]
  );

  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<FormErrors> = {};
    const { email, password } = formData;

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z.-]+\.[a-zA-Z]{2,}$/.test(email)) {
      newErrors.email = "Enter a valid email";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Minimum 8 characters required";
    } else {
      const passStrength =
        /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/;
      if (!passStrength.test(password)) {
        newErrors.password =
          "Include uppercase, lowercase, number & special character";
      }
    }

    setErrors(newErrors as FormErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!validateForm()) return;

      setIsLoading(true);
      try {
        const response = await fetch(`${getApiBaseUrl()}/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });

        const data: LoginResponse = await response.json();
        if (response.ok) {
          const { token, user } = data;

          // Call context login function to update auth state
          contextLogin(token, user);

          toast.success("Login successful");
          router.push("/dashboard");
        } else if (response.status === 401) {
          setErrors((prev) => ({
            ...prev,
            password: data.error || "Invalid email or password",
          }));
        } else if (response.status === 404) {
          setErrors((prev) => ({
            ...prev,
            email: data.error || "User does not exist",
          }));
        } else {
          const errorMsg = data.error || "An error occurred. Please try again.";
          toast.error(errorMsg);
          setErrors((prev) => ({
            ...prev,
            email: errorMsg,
          }));
        }
      } catch (error) {
        console.error("Login error:", error);
        toast.error("Error connecting to the server.");
      } finally {
        setIsLoading(false);
      }
    },
    [validateForm, router, formData, contextLogin]
  );

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

            <form onSubmit={handleSubmit} className="space-y-5">
              <FormField
                label="Email"
                icon={Mail}
                type="text"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
              />

              <FormField
                label="Password"
                icon={Lock}
                type="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
              />

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-gray-600 dark:text-gray-400">
                    Remember me
                  </span>
                </label>
                <Link
                  href="#"
                  className="text-orange-500 hover:text-orange-600 font-medium"
                >
                  Forgot password?
                </Link>
              </div>

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
                    Signing in...
                  </span>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            <div className="text-center">
              <span className="text-gray-600 dark:text-gray-400">
                Don't have an account?{" "}
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
        <div className="hidden lg:flex items-center justify-center p-12 bg-gradient-to-br from-orange-50 via-orange-100 to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden">
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
