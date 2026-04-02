export const EFFECT_OPTIONS = [
  { label: "Entspannt", value: "Relaxed" },
  { label: "Kreativ", value: "Creative" },
  { label: "Glücklich", value: "Happy" },
  { label: "Fokussiert", value: "Focused" },
  { label: "Euphörisch", value: "Euphoric" },
  { label: "Schläfrig", value: "Sleepy" },
  { label: "Energisch", value: "Energetic" },
  { label: "Gesprächig", value: "Talkative" },
  { label: "Hungrig", value: "Hungry" },
  { label: "Kichernd", value: "Giggly" },
  { label: "Beruhigend", value: "Calming" },
  { label: "Prickelnd", value: "Prickling" },
  { label: "Motiviert", value: "Motivated" },
  { label: "Klar", value: "Clear" },
] as const;

export const FLAVOR_OPTIONS = [
  { label: "Süß", value: "Sweet" },
  { label: "Sauer", value: "Sour" },
  { label: "Zitrus", value: "Citrus" },
  { label: "Tropisch", value: "Tropical" },
  { label: "Beerig", value: "Berry" },
  { label: "Käse", value: "Cheese" },
  { label: "Erdig", value: "Earthy" },
  { label: "Kräuter", value: "Herbal" },
  { label: "Pine", value: "Pine" },
  { label: "Scharf", value: "Spicy" },
  { label: "Nussig", value: "Nutty" },
  { label: "Moosig", value: "Musky" },
  { label: "Blumig", value: "Floral" },
  { label: "Zitronig", value: "Lemon" },
  { label: "Orangig", value: "Orange" },
  { label: "Minzig", value: "Minty" },
] as const;

export const THC_RANGE = { min: 0, max: 35 };
export const CBD_RANGE = { min: 0, max: 25 };
export const MAX_COMPARE_STRAINS = 3;
