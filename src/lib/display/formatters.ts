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

// Effect categories — consolidate similar effects into one display name
// Priority: lower number = higher priority (shown first)
const EFFECT_CATEGORIES: Record<string, { display: string; priority: number }> = {
  // Entspannung group (heavy/physical)
  'Entspannung': { display: 'Entspannung', priority: 1 },
  'Entspannend': { display: 'Entspannung', priority: 1 },
  'Schläfrig': { display: 'Entspannung', priority: 1 },
  'Müde': { display: 'Entspannung', priority: 1 },
  'Sedativ': { display: 'Entspannung', priority: 1 },
  'Narkotisch': { display: 'Entspannung', priority: 1 },
  'Couch-Lock': { display: 'Entspannung', priority: 1 },
  'Körperlich': { display: 'Entspannung', priority: 1 },
  'Schwer': { display: 'Entspannung', priority: 1 },
  'Beruhigend': { display: 'Entspannung', priority: 1 },
  'Schmerzlinderung': { display: 'Entspannung', priority: 1 },
  'Appetitanregend': { display: 'Entspannung', priority: 1 },

  // Energie group
  'Energie': { display: 'Energie', priority: 2 },
  'Erhebend': { display: 'Energie', priority: 2 },
  'Erfrischend': { display: 'Energie', priority: 2 },
  'Weckend': { display: 'Energie', priority: 2 },
  'Aktiviert': { display: 'Energie', priority: 2 },

  // Fokus group
  'Fokus': { display: 'Fokus', priority: 3 },
  'Fokussiert': { display: 'Fokus', priority: 3 },
  'Konzentriert': { display: 'Fokus', priority: 3 },
  'Kopf': { display: 'Fokus', priority: 3 },
  'Cerebral': { display: 'Fokus', priority: 3 },

  // Euphorie group
  'Euphorie': { display: 'Euphorie', priority: 4 },
  'Euphorisch': { display: 'Euphorie', priority: 4 },
  'Glücklich': { display: 'Euphorie', priority: 4 },
  'Lachend': { display: 'Euphorie', priority: 4 },
  'Kichernd': { display: 'Euphorie', priority: 4 },
  'Entspannt': { display: 'Euphorie', priority: 4 },
  'Stimmungshebend': { display: 'Euphorie', priority: 4 },
  'Stimmungsaufheller': { display: 'Euphorie', priority: 4 },

  // Kreativität group
  'Kreativ': { display: 'Kreativ', priority: 5 },
  'Kreativität': { display: 'Kreativ', priority: 5 },
  'Meditativ': { display: 'Meditativ', priority: 5 },

  // Ausgeglichen group (anxiety/stress)
  'Angstlösend': { display: 'Ausgeglichen', priority: 6 },
  'Stressabbau': { display: 'Ausgeglichen', priority: 6 },

  // Psychedelisch group
  'Psychedelisch': { display: 'Psychedelisch', priority: 7 },
  'Spacig': { display: 'Psychedelisch', priority: 7 },
  'Kopfreise': { display: 'Psychedelisch', priority: 7 },
  'Spirituell': { display: 'Psychedelisch', priority: 7 },
  'Introspektiv': { display: 'Psychedelisch', priority: 7 },

  // Medical
  'Medizinisch': { display: 'Medizinisch', priority: 8 },
};

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
    if (normalizedEffects.length === 0) {
        return strain.is_medical ? "Medizinisch" : fallback;
    }

    // Translate all effects to German first
    const translatedEffects = normalizedEffects.map(e => translate(e, EFFECT_TRANSLATIONS));

    // Deduplicate — remove exact duplicates
    const unique = [...new Set(translatedEffects)];

    // Find the best category (lowest priority number = highest display priority)
    let best: { display: string; priority: number } | null = null;
    for (const effect of unique) {
        const cat = EFFECT_CATEGORIES[effect];
        if (cat && (best === null || cat.priority < best.priority)) {
            best = cat;
        } else if (!cat && (best === null || best.priority === 99)) {
            // No category match — use the raw translated effect as fallback
            best = { display: effect, priority: 99 };
        }
    }

    if (best) {
        return best.display;
    }

    return fallback;
}
