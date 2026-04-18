/**
 * Downscale and re-encode camera / gallery photos before upload.
 * Keeps PDFs and small images unchanged; falls back to original if canvas fails.
 */

const TARGET_MAX_BYTES = 2.2 * 1024 * 1024;
const MIN_QUALITY = 0.48;
const QUALITY_STEP = 0.07;

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("toBlob returned null"));
      },
      "image/jpeg",
      quality,
    );
  });
}

function jpegName(originalName: string): string {
  const base = originalName.replace(/\.[^/.]+$/, "") || "report";
  return `${base}.jpg`;
}

async function encodeAtSize(
  bitmap: ImageBitmap,
  maxEdge: number,
): Promise<HTMLCanvasElement> {
  let { width, height } = bitmap;
  const scale = Math.min(1, maxEdge / Math.max(width, height, 1));
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  return canvas;
}

/**
 * If the file is a raster image over `minBytes`, resize (max edge) and JPEG-encode
 * until under `TARGET_MAX_BYTES` or limits reached. Returns original on failure.
 */
export async function maybeCompressImageForUpload(
  file: File,
  minBytes = 750_000,
): Promise<File> {
  if (!file.type.startsWith("image/") || file.size <= minBytes) {
    return file;
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const maxEdges = [2048, 1792, 1536, 1280, 1024];
  let bestBlob: Blob | null = null;
  let bestSize = file.size;

  try {
    for (const maxEdge of maxEdges) {
      const canvas = await encodeAtSize(bitmap, maxEdge);
      let q = 0.88;
      while (q >= MIN_QUALITY) {
        const blob = await canvasToJpegBlob(canvas, q);
        if (blob.size < bestSize) {
          bestSize = blob.size;
          bestBlob = blob;
        }
        if (blob.size <= TARGET_MAX_BYTES) {
          bestBlob = blob;
          break;
        }
        q -= QUALITY_STEP;
      }
      if (bestBlob && bestBlob.size <= TARGET_MAX_BYTES) break;
    }
  } catch {
    bitmap.close();
    return file;
  }

  bitmap.close();

  if (!bestBlob || bestBlob.size >= file.size * 0.97) {
    return file;
  }

  return new File([bestBlob], jpegName(file.name), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}
