import { describe, it, expect } from 'vitest';
import { calculateDLI, getQuickPreset } from '@/lib/grows/dli-utils';

describe('DLI Calculator Logic', () => {
  describe('calculateDLI()', () => {
    it('should calculate DLI correctly for given PPFD and LightHours', () => {
      // DLI = PPFD × LightHours × 0.0036
      const ppfd = 500;
      const hours = 18;
      const expectedDli = 500 * 18 * 0.0036; // 32.4

      expect(calculateDLI(ppfd, hours)).toBeCloseTo(expectedDli, 2);
    });

    it('should return 0 if lights are off (0 hours)', () => {
      expect(calculateDLI(800, 0)).toBe(0);
    });

    it('should return 0 if PPFD is 0', () => {
      expect(calculateDLI(0, 18)).toBe(0);
    });
  });

  describe('getQuickPreset()', () => {
    it('should return correct values for "seedling" stage', () => {
      const preset = getQuickPreset('seedling');
      expect(preset.ppfd).toBe(200);
      expect(preset.lightHours).toBe(18);
      expect(preset.dli).toBeCloseTo(12.96, 2);
    });

    it('should return correct values for "vegetative" stage', () => {
      const preset = getQuickPreset('vegetative');
      expect(preset.ppfd).toBe(400);
      expect(preset.lightHours).toBe(18);
    });

    it('should return correct values for "flowering" stage', () => {
      const preset = getQuickPreset('flowering');
      expect(preset.ppfd).toBe(700);
      expect(preset.lightHours).toBe(12);
    });

    it('should throw an error for unknown preset', () => {
      expect(() => getQuickPreset('alien-stage' as any)).toThrowError('Unknown preset');
    });
  });
});
