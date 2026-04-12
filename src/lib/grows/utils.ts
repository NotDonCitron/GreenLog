import type { GrowEntryType } from '@/lib/types';

// DLI = PPFD × LightHours × 0.0036
export function calculateDLI(ppfd: number, lightHours: number): number {
  return Math.round(ppfd * lightHours * 0.0036 * 100) / 100;
}

// Validation for entry_type content shapes
export function validateEntryContent(entryType: GrowEntryType, content: Record<string, unknown>): boolean {
  switch (entryType) {
    case 'watering':
      return typeof content.amount_liters === 'number' && content.amount_liters > 0;
    case 'feeding':
      return typeof content.nutrient === 'string' && content.amount?.length > 0;
    case 'note':
      return typeof content.note_text === 'string';
    case 'photo':
      return typeof content.photo_url === 'string';
    case 'ph_ec':
      return typeof content.ph === 'number' && typeof content.ec === 'number';
    case 'dli':
      return typeof content.ppfd === 'number' && typeof content.light_hours === 'number';
    case 'milestone':
      return typeof content.milestone_phase === 'string';
    default:
      return false;
  }
}
