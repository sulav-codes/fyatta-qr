/**
 * API Configuration
 * Centralized API base URL configuration
 */

export const getApiBaseUrl = (): string => {
  if (typeof window === "undefined") return "http://localhost:8000";
  return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
};

export const API_BASE_URL = getApiBaseUrl();
