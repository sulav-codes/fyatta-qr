"use client";
import { useState, useCallback, ChangeEvent, FormEvent } from "react";
import { ArrowLeft, Mail, Lock, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

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
      <Icon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
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
        const response = await fetch(
          "http://127.0.0.1:8000/api/vendor/login/",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(formData),
          }
        );

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
            password: "Invalid email or password",
          }));
        } else if (response.status === 404) {
          setErrors((prev) => ({
            ...prev,
            email: "User does not exist",
          }));
        } else {
          setErrors((prev) => ({
            ...prev,
            email: "An error occurred. Please try again.",
          }));
        }
      } catch (error) {
        toast.error("Error connecting to the server.");
      } finally {
        setIsLoading(false);
      }
    },
    [validateForm, router, formData, contextLogin]
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-card rounded-xl shadow-lg border border-border p-8">
            <div className="mb-8">
              <Link
                href="/"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to home
              </Link>
            </div>

            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
              <p className="text-muted-foreground">
                Sign in to your account to continue
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
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

              <Button
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">
                Don't have an account?{" "}
              </span>
              <Link
                href="/register"
                className="text-orange-500 hover:text-orange-600 font-medium"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </div>
      {/* <Footer /> */}
    </div>
  );
}
