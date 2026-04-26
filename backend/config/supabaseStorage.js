import { createClient } from "@supabase/supabase-js";
import { extname, basename } from "path";

// Load Supabase config from environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_BUCKET) {
  throw new Error(
    "Missing required Supabase environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_BUCKET",
  );
}

// Initialize Supabase client with service role for storage access
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const SUPABASE_PUBLIC_OBJECT_PATH =
  /\/storage\/v1\/object\/public\/[^/]+\/(.+)$/;

// Sanitize filename - remove path separators and null bytes
const sanitizeFilename = (name) => name.replace(/[/\\:\x00]/g, "_");

// Generate a unique filename from the original
const generateFileName = (originalName) => {
  const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
  const safeName = sanitizeFilename(originalName);
  const ext = extname(safeName);
  const fileBasename = basename(safeName, ext);
  return `${fileBasename}-${uniqueSuffix}${ext}`;
};

const normalizeFolderPath = (folderPath) => {
  if (!folderPath || typeof folderPath !== "string") {
    return "";
  }

  return folderPath
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/+$/g, "")
    .split("/")
    .map((segment) => sanitizeFilename(segment))
    .filter(Boolean)
    .join("/");
};

export const resolveStoragePath = (assetReference) => {
  if (!assetReference || typeof assetReference !== "string") {
    return null;
  }

  const trimmed = assetReference.trim();
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const match = url.pathname.match(SUPABASE_PUBLIC_OBJECT_PATH);

      if (match?.[1]) {
        return decodeURIComponent(match[1]);
      }
    } catch {
      return null;
    }

    return null;
  }

  return trimmed.replace(/^\/+/, "");
};

export const getPublicUrl = (assetReference) => {
  const storagePath = resolveStoragePath(assetReference);

  if (!storagePath) {
    return null;
  }

  return supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(storagePath).data
    .publicUrl;
};

// Upload a file buffer to Supabase Storage
export const uploadImage = async (
  buffer,
  originalName,
  mimetype,
  { folderPath = "" } = {},
) => {
  if (!buffer || typeof buffer.length !== "number") {
    throw new Error("A valid file buffer is required");
  }

  if (!mimetype.startsWith("image/")) {
    throw new Error("Only image files are allowed");
  }

  if (buffer.length > 5 * 1024 * 1024) {
    throw new Error("File size exceeds the 5MB limit");
  }

  const fileName = generateFileName(originalName);
  const storageFolder = normalizeFolderPath(folderPath);
  const storagePath = storageFolder ? `${storageFolder}/${fileName}` : fileName;

  const { data, error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimetype,
      upsert: false,
    });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  const publicUrl = getPublicUrl(data.path || storagePath);

  return {
    bucket: SUPABASE_BUCKET,
    fileName,
    path: data.path || storagePath,
    publicUrl,
    size: buffer.length,
    mimetype,
  };
};

// Delete a file from Supabase Storage
export const deleteImage = async (assetReference) => {
  const storagePath = resolveStoragePath(assetReference);

  if (!storagePath) return;

  const { error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .remove([storagePath]);

  if (error) {
    throw new Error(`Supabase delete failed: ${error.message}`);
  }
};
