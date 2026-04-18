import { afterEach, describe, expect, it, vi } from 'vitest';
import { compressGrowPhoto } from './photo-compression';

const originalImage = globalThis.Image;

afterEach(() => {
  globalThis.Image = originalImage;
  vi.restoreAllMocks();
});

describe('compressGrowPhoto', () => {
  it('returns the original file when the browser cannot decode the selected image', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'plant.jpg', { type: 'image/jpeg' });
    const revokeObjectURL = vi.fn();

    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:plant-photo');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(revokeObjectURL);

    class BrokenImage {
      onload: (() => void) | null = null;
      onerror: ((event: Event) => void) | null = null;

      set src(_value: string) {
        this.onerror?.(new Event('error'));
      }
    }

    globalThis.Image = BrokenImage as unknown as typeof Image;

    await expect(compressGrowPhoto(file)).resolves.toBe(file);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:plant-photo');
  });
});
