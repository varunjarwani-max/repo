import { Item } from '../types';

/**
 * Client-side image compression and format normalization using HTML <canvas>.
 * Resizes any image (PNG, HEIC, WebP, JPG) to a maximum dimension of 1920px (preserving aspect ratio)
 * and exports as compressed JPEG at quality 0.8 (~1-2 MB), easily bypassing the 10MB limit.
 */
export async function compressImageToCanvas(
  file: File,
  maxDimension = 1280,
  quality = 0.75
): Promise<{ file: File; width: number; height: number }> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = objectUrl;
    await image.decode();

    const origW = image.naturalWidth || image.width;
    const origH = image.naturalHeight || image.height;
    const scale = Math.min(1, maxDimension / Math.max(origW, origH));
    const width = Math.max(1, Math.round(origW * scale));
    const height = Math.max(1, Math.round(origH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image canvas processing is unavailable.');

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Could not compress this image.'))),
        'image/jpeg',
        quality
      )
    );

    const compressedFile = new File([blob], 'compressed-waste.jpg', { type: 'image/jpeg' });
    return { file: compressedFile, width, height };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export const preparePhotoUpload = compressImageToCanvas;

/**
 * Crops an uploaded image file client-side for each item using its normalized bbox + 8% padding.
 * Stores the result as an optional `cropUrl` (data URL) on each Item.
 */
export async function generateCropsFromImageFile(
  file: File,
  items: Item[]
): Promise<Item[]> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const updatedItems = items.map((item) => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return item;

          const naturalW = img.naturalWidth || 1000;
          const naturalH = img.naturalHeight || 625;

          const rawX = item.bbox.x * naturalW;
          const rawY = item.bbox.y * naturalH;
          const rawW = item.bbox.width * naturalW;
          const rawH = item.bbox.height * naturalH;

          // 8% padding around bounding box
          const padX = rawW * 0.08;
          const padY = rawH * 0.08;

          const sx = Math.max(0, rawX - padX);
          const sy = Math.max(0, rawY - padY);
          const sw = Math.min(naturalW - sx, rawW + padX * 2);
          const sh = Math.min(naturalH - sy, rawH + padY * 2);

          // Output canvas size (112x112 for crisp 56px display)
          canvas.width = 112;
          canvas.height = 112;

          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 112, 112);
          const cropUrl = canvas.toDataURL('image/jpeg', 0.88);

          return {
            ...item,
            cropUrl,
          };
        } catch {
          return item;
        }
      });

      URL.revokeObjectURL(objectUrl);
      resolve(updatedItems);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(items);
    };

    img.src = objectUrl;
  });
}