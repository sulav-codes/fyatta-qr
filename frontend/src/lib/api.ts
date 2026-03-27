/**
 * API Configuration
 * Centralized API base URL configuration
 */

export const getApiBaseUrl = (): string => {
  if (typeof window === "undefined") return "http://localhost:8000";
  return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
};

export const getGoogleAuthStartUrl = (): string => {
  return `${getApiBaseUrl()}/auth/google/start`;
};

export const buildApiUrl = (pathOrUrl: string): string => {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  const normalizedPath = pathOrUrl.startsWith("/")
    ? pathOrUrl
    : `/${pathOrUrl}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
};

export const createAuthHeaders = (
  token: string,
  headers?: HeadersInit,
): Headers => {
  const mergedHeaders = new Headers(headers || {});
  mergedHeaders.set("Authorization", `Bearer ${token}`);
  return mergedHeaders;
};

export const apiFetchWithAuth = (
  pathOrUrl: string,
  token: string,
  init: RequestInit = {},
): Promise<Response> => {
  return fetch(buildApiUrl(pathOrUrl), {
    ...init,
    headers: createAuthHeaders(token, init.headers),
  });
};

export const API_BASE_URL = getApiBaseUrl();
