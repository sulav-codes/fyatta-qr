//API Configuration
const DEV_API_BASE_URL = "http://localhost:8000";

const getFallbackApiBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    return process.env.NODE_ENV === "development"
      ? DEV_API_BASE_URL
      : window.location.origin;
  }

  if (process.env.NODE_ENV === "development") {
    return DEV_API_BASE_URL;
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "";
};

export const getApiBaseUrl = (): string => {
  if (typeof window === "undefined") {
    return (
      process.env.API_BASE_URL_SERVER ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      getFallbackApiBaseUrl()
    );
  }
  return process.env.NEXT_PUBLIC_API_BASE_URL || getFallbackApiBaseUrl();
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
