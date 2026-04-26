import type { NextConfig } from "next";

const DEV_API_BASE_URL = "http://localhost:8000";

type ImageRemotePattern = Exclude<
  NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>[number],
  URL
>;

const toRemotePattern = (rawUrl?: string): ImageRemotePattern | null => {
  if (!rawUrl) {
    return null;
  }

  try {
    const parsed = new URL(rawUrl);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    return {
      protocol: parsed.protocol === "https:" ? "https" : "http",
      hostname: parsed.hostname,
      port: parsed.port || undefined,
    };
  } catch {
    return null;
  }
};

const apiRemotePatterns: ImageRemotePattern[] = [
  process.env.NEXT_PUBLIC_API_BASE_URL,
  process.env.API_BASE_URL_SERVER,
  process.env.NODE_ENV === "development" ? DEV_API_BASE_URL : undefined,
]
  .map((url) => toRemotePattern(url))
  .filter((pattern): pattern is ImageRemotePattern => Boolean(pattern))
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
      ...["i.pravatar.cc", "xlbvvmjzeyotshkbirwi.supabase.co"].map(
        (hostname): ImageRemotePattern => ({
          protocol: "https",
          hostname,
        }),
      ),
      ...apiRemotePatterns,
    ],
  },
};

export default nextConfig;
