// src/lib/grows/dli-utils.ts

export interface DLIResult {
  ppfd: number;
  lightHours: number;
  dli: number;
}

export interface QuickPreset {
  name: string;
  ppfd: number;
  lightHours: number;
  dli: number;
}

/**
 * Calculate Daily Light Integral (DLI) in mol/m²/day
 * DLI = PPFD × LightHours × 0.0036
 */
export function calculateDLI(ppfd: number, lightHours: number): number {
  if (ppfd <= 0 || lightHours <= 0) return 0;
  return Math.round(ppfd * lightHours * 0.0036 * 100) / 100;
}

export function getQuickPreset(stage: 'seedling' | 'vegetative' | 'flowering'): QuickPreset {
  switch (stage) {
    case 'seedling':
      return { name: 'Seedling', ppfd: 200, lightHours: 18, dli: calculateDLI(200, 18) };
    case 'vegetative':
      return { name: 'Vegetative', ppfd: 400, lightHours: 18, dli: calculateDLI(400, 18) };
    case 'flowering':
      return { name: 'Flowering', ppfd: 700, lightHours: 12, dli: calculateDLI(700, 12) };
    default:
      throw new Error('Unknown preset');
  }
}
