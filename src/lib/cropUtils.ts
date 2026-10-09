import { Item } from '../types';

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
