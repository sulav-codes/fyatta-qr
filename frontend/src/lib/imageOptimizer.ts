type OptimizeTarget = "menu" | "logo";

type OptimizeImageOptions = {
  target?: OptimizeTarget;
};

const MAX_WIDTH = 1000;
const QUALITY_START = 0.78;
const QUALITY_MIN = 0.45;
const QUALITY_STEP = 0.06;
const HARD_LIMIT_BYTES = 500 * 1024;

const TARGET_BYTES: Record<OptimizeTarget, { min: number; max: number }> = {
  menu: {
    min: 100 * 1024,
    max: 300 * 1024,
  },
  logo: {
    min: 20 * 1024,
    max: 80 * 1024,
  },
};

const toWebpName = (fileName: string) => {
  const trimmed = fileName.trim();
  const dotIndex = trimmed.lastIndexOf(".");
  const baseName = dotIndex > 0 ? trimmed.slice(0, dotIndex) : trimmed;
  return `${baseName || "image"}.webp`;
};

const canvasToBlob = (canvas: HTMLCanvasElement, quality: number) => {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Image conversion failed"));
          return;
        }
        resolve(blob);
      },
      "image/webp",
      quality,
    );
  });
};

const loadImage = async (file: File) => {
  const objectUrl = URL.createObjectURL(file);

  try {
    if (typeof createImageBitmap === "function") {
      const bitmap = await createImageBitmap(file);
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx: CanvasRenderingContext2D, width: number, height: number) =>
          ctx.drawImage(bitmap, 0, 0, width, height),
        cleanup: () => bitmap.close(),
      };
    }

    const image = new Image();
    image.decoding = "async";
    image.src = objectUrl;

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Failed to decode image"));
    });

    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      draw: (ctx: CanvasRenderingContext2D, width: number, height: number) =>
        ctx.drawImage(image, 0, 0, width, height),
      cleanup: () => {
        image.src = "";
      },
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

export async function optimizeImage(file: File): Promise<File>;
export async function optimizeImage(
  file: File,
  options: OptimizeImageOptions,
): Promise<File>;
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

  // Guardrails for very large files before decode.
  if (file.size > 30 * 1024 * 1024) {
    throw new Error("Image is too large to process in the browser");
  }

  const target = options.target || "menu";
  const targetConfig = TARGET_BYTES[target];

  const decoded = await loadImage(file);

  try {
    const ratio = decoded.width > MAX_WIDTH ? MAX_WIDTH / decoded.width : 1;
    const outputWidth = Math.max(1, Math.round(decoded.width * ratio));
    const outputHeight = Math.max(1, Math.round(decoded.height * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) {
      throw new Error("Unable to initialize image canvas");
    }

    decoded.draw(ctx, outputWidth, outputHeight);

    let quality = QUALITY_START;
    let blob = await canvasToBlob(canvas, quality);

    while (blob.size > targetConfig.max && quality > QUALITY_MIN) {
      quality = Math.max(QUALITY_MIN, quality - QUALITY_STEP);
      blob = await canvasToBlob(canvas, quality);
    }

    if (blob.size > HARD_LIMIT_BYTES) {
      // Extra compression pass for oversized outputs.
      blob = await canvasToBlob(canvas, Math.max(QUALITY_MIN, quality - 0.1));
    }

    if (blob.size > HARD_LIMIT_BYTES) {
      throw new Error("Unable to compress image under 500KB");
    }

    return new File([blob], toWebpName(file.name), {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } finally {
    decoded.cleanup();
  }
}
