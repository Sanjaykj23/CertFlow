export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['image/png', 'image/jpeg', 'image/svg+xml'];
export const IMAGE_ACCEPT = '.png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml';

export interface LoadedImage {
  id: string;
  name: string;
  src: string;
  width: number;
  height: number;
}

/** Reads a PNG, JPEG or SVG as a data URI and measures it. Rejects with a readable message. */
export function readImageFile(file: File): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    if (!ACCEPTED.includes(file.type)) {
      reject(new Error(`${file.name} is not a PNG, JPEG or SVG image.`));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      reject(new Error(`${file.name} is larger than 5 MB. Use a smaller image.`));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`${file.name} could not be read.`));
    reader.onload = () => {
      const src = String(reader.result);
      const img = new Image();
      img.onload = () =>
        resolve({
          id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          src,
          width: img.naturalWidth || 300,
          height: img.naturalHeight || 200,
        });
      img.onerror = () => reject(new Error(`${file.name} is not a valid image.`));
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}
