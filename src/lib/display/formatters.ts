import { Strain } from "@/lib/types";
import { normalizeDisplayList } from "./normalization";

const DEFAULT_TASTE_FALLBACK = "Zitrus, Erdig";
const DEFAULT_EFFECT_FALLBACK = "Euphorie";

// English → German translations for effects
const EFFECT_TRANSLATIONS: Record<string, string> = {
  // Energy / Stimulation
  'Energy': 'Energie',
  'Energizing': 'Energie',
  'Uplifting': 'Erhebend',
  'Activating': 'Aktiviert',
  'Invigorating': 'Erfrischend',
  'Awakening': 'Weckend',

  // Mental / Focus
  'Focus': 'Fokus',
  'Focused': 'Fokussiert',
  'Concentrated': 'Konzentriert',
  'Cerebral': 'Cerebral',
  'Psychedelic': 'Psychedelisch',
  'Head': 'Kopf',

  // Body / Physical
  'Relax': 'Entspannung',
  'Relaxing': 'Entspannend',
  'Body': 'Körper',
  'Physical': 'Körperlich',
  'Calming': 'Beruhigend',
  'Sleepy': 'Schläfrig',
  'Drowsy': 'Müde',
  'Narcotic': 'Narkotisch',
  'Pain Relief': 'Schmerzlinderung',
  'Appetizing': 'Appetitanregend',

  // Mood / Emotions
  'Euphoria': 'Euphorie',
  'Euphoric': 'Euphorisch',
  'Happy': 'Glücklich',
  'Laughing': 'Lachend',
  'Giggling': 'Kichernd',
  'Relaxed': 'Entspannt',
  'Mood Elevating': 'Stimmungshebend',
  'Mood enhancer': 'Stimmungsaufheller',
  'Anxiety Relief': 'Angstlösend',
  'Anti-anxiety': 'Angstlösend',
  'Stress Relief': 'Stressabbau',
  'Calming': 'Beruhigend',

  // Sensory / Perception
  'Creative': 'Kreativ',
  'Creativity': 'Kreativität',
  'Meditative': 'Meditativ',
  'Psychedelic': 'Psychedelisch',
  'Spacy': 'Spacig',
  'Head Trip': 'Kopfreise',

  // Couch / Heavy
  'Couch Lock': 'Couch-Lock',
  'Couchlock': 'Couch-Lock',
  'Sleepy': 'Schläfrig',
  'Sedative': 'Sedativ',
  'Heavy': 'Schwer',

  // Medical
  'Medical': 'Medizinisch',
  'Appetite': 'Appetit',
  'Nausea Relief': 'Übelkeit lindernd',
  'Headache': 'Kopfschmerzen',

  // Perception effects
  'Mind': 'Geist',
  'Spiritual': 'Spirituell',
  'Introspective': 'Introspektiv',

  // Common OCR-fixes / variants
  'UPT2': 'Energie',
  'N2': 'Fokus',
  'FOCUS': 'Fokus',
  'FOCUS2': 'Fokus',
  'SLEEP': 'Schläfrig',
  'SLEEP2': 'Schläfrig',
  'PAIN': 'Schmerzlinderung',
};

// English → German translations for flavors / terpenes
const TASTE_TRANSLATIONS: Record<string, string> = {
  // Citrus
  'Citrus': 'Zitrus',
  'Lemon': 'Zitrone',
  'Lime': 'Limette',
  'Orange': 'Orange',
  'Grapefruit': 'Grapefruit',
  'Sour': 'Sauer',
  'Tangy': 'Säuerlich',

  // Fruits
  'Sweet': 'Süß',
  'Fruity': 'Fruchtig',
  'Berry': 'Beere',
  'Strawberry': 'Erdbeere',
  'Blueberry': 'Blaubeere',
  'Raspberry': 'Himbeere',
  'Grape': 'Traube',
  'Grapes': 'Trauben',
  'Apple': 'Apfel',
  'Banana': 'Banane',
  'Mango': 'Mango',
  'Pineapple': 'Ananas',
  'Tropical': 'Tropisch',
  'Stone Fruit': 'Steinobst',
  'Peach': 'Pfirsich',
  'Apricot': 'Aprikose',
  'Melon': 'Melone',

  // Earth / Woody
  'Earthy': 'Erdig',
  'Wood': 'Holzig',
  'Woody': 'Holzig',
  'Pine': 'Kiefer',
  'Piney': 'Kieferig',
  'Forest': 'Wald',
  'Musk': 'Moschus',
  'Sandlewood': 'Sandelholz',
  'Cedar': 'Zeder',
  'Hash': 'Hash',

  // Herbs / Spices
  'Herbal': 'Kräuter',
  'Sage': 'Salbei',
  'Thyme': 'Thymian',
  'Basil': 'Basilikum',
  'Mint': 'Minze',
  'Pepper': 'Pfeffer',
  'Spicy': 'Würzig',
  'Cinnamon': 'Zimt',
  'Clove': 'Nelke',
  'Anise': 'Anis',

  // Chemical / Fuel
  'Diesel': 'Diesel',
  'Fuel': 'Kraftstoff',
  'Gasoline': 'Benzin',
  'Chemical': 'Chemisch',
  'Plastic': 'Plastik',
  'Ammonia': 'Ammoniak',

  // Other distinctive
  'Cheese': 'Käse',
  'Skunk': 'Skunk',
  'Pungent': 'Stechend',
  'Floral': 'Blumig',
  'Flowery': 'Blumig',
  'Rose': 'Rose',
  'Lavender': 'Lavendel',
  'Vanilla': 'Vanille',
  'Chocolate': 'Schokolade',
  'Coffee': 'Kaffee',
  'Caramel': 'Karamell',
  'Butterscotch': 'Karamell',
  'Honey': 'Honig',
  'Nutty': 'Nussig',
  'Nuts': 'Nüsse',
  'Almond': 'Mandel',

  // Plant / Vegetal
  'Green': 'Grün',
  'Grass': 'Gras',
  'Hay': 'Heu',
  'Tea': 'Tee',
  'Tobacco': 'Tabak',
  'Rot': 'Fäule',

  // Sour / Fermented
  'Sour': 'Sauer',
  'Acidic': 'Säuerlich',
  'Vinegar': 'Essig',
  'Fermented': 'Fermentiert',
  'Spoiled': 'Verdorben',
};

function translate(value: string, translations: Record<string, string>): string {
  return translations[value] ?? value;
}

function translateList(values: string[], translations: Record<string, string>): string[] {
  return values.map(v => translate(v, translations));
}

export function formatPercent(value: number | null | undefined, fallback: string) {
    return typeof value === "number" && Number.isFinite(value) ? `${value}%` : fallback;
}

export function getTasteDisplay(strain: Strain, fallback = DEFAULT_TASTE_FALLBACK) {
    const normalizedFlavors = normalizeDisplayList(strain.flavors);
    if (normalizedFlavors.length > 0) {
        const translated = translateList(normalizedFlavors.slice(0, 2), TASTE_TRANSLATIONS);
        return translated.join(", ");
    }

    const normalizedTerpenes = normalizeDisplayList(strain.terpenes);
    if (normalizedTerpenes.length > 0) {
        const translated = translateList(normalizedTerpenes.slice(0, 2), TASTE_TRANSLATIONS);
        return translated.join(", ");
    }

    return fallback;
}

export function getEffectDisplay(strain: Strain, fallback = DEFAULT_EFFECT_FALLBACK) {
    const normalizedEffects = normalizeDisplayList(strain.effects);
    if (normalizedEffects.length > 0) {
        return translate(normalizedEffects[0], EFFECT_TRANSLATIONS);
    }

    return strain.is_medical ? "Medizinisch" : fallback;
}
