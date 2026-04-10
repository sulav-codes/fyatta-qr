import type { NextConfig } from "next";

const DEV_API_BASE_URL = "http://localhost:8000";

const toRemotePattern = (rawUrl?: string) => {
  if (!rawUrl) {
    return null;
  }

  try {
    const parsed = new URL(rawUrl);
    return {
      protocol: parsed.protocol.replace(":", ""),
      hostname: parsed.hostname,
      port: parsed.port,
    };
  } catch {
    return null;
  }
};

const apiRemotePatterns = [
  process.env.NEXT_PUBLIC_API_BASE_URL,
  process.env.API_BASE_URL_SERVER,
  process.env.NODE_ENV === "development" ? DEV_API_BASE_URL : undefined,
]
  .map((url) => toRemotePattern(url))
  .filter(
    (pattern): pattern is NonNullable<ReturnType<typeof toRemotePattern>> =>
      Boolean(pattern),
  )
  .filter((pattern, index, all) => {
    const key = `${pattern.protocol}|${pattern.hostname}|${pattern.port}`;
    return (
      all.findIndex((candidate) => {
        return (
          `${candidate.protocol}|${candidate.hostname}|${candidate.port}` ===
          key
        );
      }) === index
    );
  });

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
      ...apiRemotePatterns,
    ],
  },
};

export default nextConfig;
