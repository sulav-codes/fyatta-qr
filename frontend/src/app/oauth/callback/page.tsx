"use client";

import { useEffect } from "react";
import { useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";

const decodeBase64Url = (value: string): string => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = window.atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) {
      return;
    }

    handledRef.current = true;

    const error = searchParams.get("error");

    if (error) {
      toast.error("Google sign-in failed. Please try again.");
      router.replace("/login");
      return;
    }

    const token = searchParams.get("token");
    const encodedUser = searchParams.get("user");

    if (!token || !encodedUser) {
      toast.error("Invalid Google callback data.");
      router.replace("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(decodeBase64Url(encodedUser));
      login(token, parsedUser);

      const needsProfileCompletion =
        searchParams.get("needsProfileCompletion") === "1";

      if (needsProfileCompletion) {
        toast.success(
          "Google sign-in successful. Please complete your profile.",
        );
        router.replace("/dashboard/settings?completeProfile=1");
        return;
      }

      toast.success("Google sign-in successful.");
      router.replace("/dashboard");
    } catch (decodeError) {
      console.error("OAuth callback parse error:", decodeError);
      toast.error("Could not complete Google sign-in.");
      router.replace("/login");
    }
  }, [login, router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
      <div className="text-center space-y-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto"></div>
        <p className="text-gray-700 dark:text-gray-300 font-medium">
          Completing Google sign-in...
        </p>
      </div>
    </div>
  );
}
