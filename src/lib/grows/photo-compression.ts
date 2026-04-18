const MAX_PHOTO_EDGE = 1600;
const PHOTO_QUALITY = 0.82;

function loadImageFromObjectUrl(imageUrl: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
}

export async function compressGrowPhoto(file: File): Promise<File> {
  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await loadImageFromObjectUrl(imageUrl);
    if (!image) return file;

    const scale = Math.min(1, MAX_PHOTO_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) return file;

    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', PHOTO_QUALITY);
    });

    if (!blob) return file;

    const compressedName = file.name.replace(/\.[^.]+$/, '') || 'grow-photo';
    return new File([blob], `${compressedName}.webp`, { type: 'image/webp' });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
