type OptimizeTarget = "menu" | "logo";

type OptimizeImageOptions = {
  target?: OptimizeTarget;
};

const MAX_WIDTH = 1000;
const HARD_LIMIT_BYTES = 500 * 1024;

const TARGET_MAX_BYTES: Record<OptimizeTarget, number> = {
  menu: 300 * 1024,
  logo: 80 * 1024,
};

// Absolute minimum quality floor used as last resort before giving up.
const QUALITY_FLOOR = 0.1;

const toWebpName = (fileName: string): string => {
  const name = fileName.trim();
  const dot = name.lastIndexOf(".");
  return `${(dot > 0 ? name.slice(0, dot) : name) || "image"}.webp`;
};

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Image conversion failed")),
      "image/webp",
      quality,
    ),
  );

const loadImage = async (file: File) => {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    return {
      width: bitmap.width,
      height: bitmap.height,
      draw: (ctx: CanvasRenderingContext2D, w: number, h: number) =>
        ctx.drawImage(bitmap, 0, 0, w, h),
      cleanup: () => bitmap.close(),
    };
  }

  const url = URL.createObjectURL(file);
  const image = Object.assign(new Image(), { decoding: "async", src: url });

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Failed to decode image"));
    });
  } finally {
    URL.revokeObjectURL(url);
  }

  return {
    width: image.naturalWidth,
    height: image.naturalHeight,
    draw: (ctx: CanvasRenderingContext2D, w: number, h: number) =>
      ctx.drawImage(image, 0, 0, w, h),
    cleanup: () => {
      image.src = "";
    },
  };
};

// Binary search for the highest quality whose blob fits within maxBytes.
const findBlobUnderSize = async (
  canvas: HTMLCanvasElement,
  maxBytes: number,
): Promise<Blob | null> => {

  const floorBlob = await canvasToBlob(canvas, QUALITY_FLOOR);
  if (floorBlob.size > maxBytes) {
    return null;
  }

  const hiBlob = await canvasToBlob(canvas, 0.78);
  if (hiBlob.size <= maxBytes) {
    return hiBlob;
  }

  let lo = QUALITY_FLOOR;
  let hi = 0.78;
  let bestBlob = floorBlob;

  for (let i = 0; i < 5; i++) {
    const mid = (lo + hi) / 2;
    const blob = await canvasToBlob(canvas, mid);

    if (blob.size <= maxBytes) {
      bestBlob = blob;
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return bestBlob;
};

export async function optimizeImage(
  file: File,
  options: OptimizeImageOptions = {},
): Promise<File> {
  if (!(file instanceof File)) {
    throw new Error("Invalid file input");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are supported");
  }

  if (file.size > 30 * 1024 * 1024) {
    throw new Error("Image is too large to process in the browser");
  }

  const maxBytes = TARGET_MAX_BYTES[options.target ?? "menu"];
  const decoded = await loadImage(file);

  try {
    const ratio = Math.min(1, MAX_WIDTH / decoded.width);
    const width = Math.max(1, Math.round(decoded.width * ratio));
    const height = Math.max(1, Math.round(decoded.height * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Unable to initialize image canvas");

    decoded.draw(ctx, width, height);

    const blob = await findBlobUnderSize(canvas, maxBytes);

    if (!blob) {
      const fallback = await canvasToBlob(canvas, QUALITY_FLOOR);
      if (fallback.size > maxBytes) {
        throw new Error(
        `Unable to compress image under ${Math.round(maxBytes / 1024)}KB`,
        );
      }
      return new File([fallback], toWebpName(file.name), {
        type: "image/webp",
        lastModified: Date.now(),
      });
    }

    return new File([blob], toWebpName(file.name), {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } finally {
    decoded.cleanup();
  }
}
