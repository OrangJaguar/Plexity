export const UNIT_CATEGORIES = [
  { id: 'length', label: 'Length' },
  { id: 'weight', label: 'Weight' },
  { id: 'volume', label: 'Volume' },
  { id: 'time', label: 'Time' },
  { id: 'temperature', label: 'Temperature' },
  { id: 'currency', label: 'Currency' },
];

/** Most-used units first within each category. */
export const UNIT_POPULARITY = {
  length: ['m', 'km', 'ft', 'mi', 'cm', 'in', 'mm', 'yd', 'nmi', 'dm', 'um', 'nm', 'hm', 'ly'],
  weight: ['kg', 'lb', 'g', 'oz', 'mg', 't', 'st', 'ug', 'ton_us', 'ct'],
  volume: ['l', 'ml', 'gal', 'cup', 'floz', 'qt', 'pt', 'm3', 'cl', 'dl', 'tbsp', 'tsp', 'imp_gal', 'hl', 'kl'],
  time: ['hr', 'min', 's', 'day', 'week', 'month', 'year', 'ms', 'fortnight', 'decade'],
  temperature: ['C', 'F', 'K'],
  currency: [
    'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'MXN',
    'BRL', 'KRW', 'SGD', 'HKD', 'NOK', 'SEK', 'NZD', 'ZAR', 'TRY', 'PLN',
    'THB', 'IDR', 'AED', 'SAR', 'ILS', 'PHP', 'MYR', 'TWD', 'DKK', 'CZK',
    'HUF', 'RON', 'PKR', 'EGP', 'NGN', 'ARS', 'CLP', 'COP', 'VND', 'UAH',
  ],
};

const LINEAR = {
  length: {
    km: 1000,
    hm: 100,
    dam: 10,
    m: 1,
    dm: 0.1,
    cm: 0.01,
    mm: 0.001,
    um: 1e-6,
    nm: 1e-9,
    angstrom: 1e-10,
    mi: 1609.344,
    yd: 0.9144,
    ft: 0.3048,
    in: 0.0254,
    nmi: 1852,
    ly: 9.4607e15,
  },
  weight: {
    t: 1000,
    kg: 1,
    g: 0.001,
    mg: 0.000001,
    ug: 1e-9,
    lb: 0.45359237,
    oz: 0.028349523125,
    st: 6.35029,
    ton_us: 907.18474,
    ton_uk: 1016.0469088,
    ct: 0.0002,
  },
  volume: {
    kl: 1000,
    hl: 100,
    dal: 10,
    l: 1,
    dl: 0.1,
    cl: 0.01,
    ml: 0.001,
    m3: 1000,
    cm3: 0.001,
    gal: 3.785411784,
    qt: 0.946352946,
    pt: 0.473176473,
    cup: 0.2365882365,
    floz: 0.0295735295625,
    tbsp: 0.0147867647813,
    tsp: 0.00492892159375,
    imp_gal: 4.54609,
    imp_qt: 1.1365225,
    imp_pt: 0.56826125,
    imp_floz: 0.0284130625,
  },
  time: {
    ms: 0.001,
    s: 1,
    min: 60,
    hr: 3600,
    day: 86400,
    week: 604800,
    fortnight: 1209600,
    month: 2629800,
    year: 31557600,
    decade: 315576000,
    century: 3155760000,
  },
  currency: {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    JPY: 157,
    CAD: 1.36,
    AUD: 1.52,
    CHF: 0.88,
    CNY: 7.24,
    INR: 83.5,
    MXN: 17.2,
    BRL: 5.05,
    KRW: 1340,
    SGD: 1.34,
    HKD: 7.82,
    NOK: 10.6,
    SEK: 10.4,
    NZD: 1.64,
    ZAR: 18.2,
    TRY: 32.5,
    PLN: 3.95,
    THB: 35.8,
    IDR: 15800,
    AED: 3.67,
    SAR: 3.75,
    ILS: 3.65,
    PHP: 56.5,
    MYR: 4.72,
    TWD: 32.1,
    DKK: 6.87,
    CZK: 23.1,
    HUF: 360,
    RON: 4.57,
    PKR: 278,
    EGP: 48.5,
    NGN: 1550,
    ARS: 880,
    CLP: 940,
    COP: 3950,
    VND: 24800,
    UAH: 41.2,
    RUB: 92,
  },
};

const UNIT_LABELS = {
  km: 'Kilometers', hm: 'Hectometers', dam: 'Decameters', m: 'Meters', dm: 'Decimeters',
  cm: 'Centimeters', mm: 'Millimeters', um: 'Micrometers', nm: 'Nanometers',
  angstrom: 'Angstroms', mi: 'Miles', yd: 'Yards', ft: 'Feet', in: 'Inches',
  nmi: 'Nautical miles', ly: 'Light years',
  t: 'Metric tons', kg: 'Kilograms', g: 'Grams', mg: 'Milligrams', ug: 'Micrograms',
  lb: 'Pounds', oz: 'Ounces', st: 'Stone', ton_us: 'US tons', ton_uk: 'UK tons', ct: 'Carats',
  kl: 'Kiloliters', hl: 'Hectoliters', dal: 'Decaliters', l: 'Liters', dl: 'Deciliters',
  cl: 'Centiliters', ml: 'Milliliters', m3: 'Cubic meters', cm3: 'Cubic centimeters',
  gal: 'US gallons', qt: 'US quarts', pt: 'US pints', cup: 'US cups', floz: 'US fluid ounces',
  tbsp: 'Tablespoons', tsp: 'Teaspoons',
  imp_gal: 'Imperial gallons', imp_qt: 'Imperial quarts', imp_pt: 'Imperial pints',
  imp_floz: 'Imperial fluid ounces',
  ms: 'Milliseconds', s: 'Seconds', min: 'Minutes', hr: 'Hours', day: 'Days',
  week: 'Weeks', fortnight: 'Fortnights', month: 'Months', year: 'Years',
  decade: 'Decades', century: 'Centuries',
  USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound', JPY: 'Japanese Yen',
  CAD: 'Canadian Dollar', AUD: 'Australian Dollar', CHF: 'Swiss Franc',
  CNY: 'Chinese Yuan', INR: 'Indian Rupee', MXN: 'Mexican Peso',
  BRL: 'Brazilian Real', KRW: 'South Korean Won', SGD: 'Singapore Dollar',
  HKD: 'Hong Kong Dollar', NOK: 'Norwegian Krone', SEK: 'Swedish Krona',
  NZD: 'New Zealand Dollar', ZAR: 'South African Rand', TRY: 'Turkish Lira',
  PLN: 'Polish Zloty', THB: 'Thai Baht', IDR: 'Indonesian Rupiah',
  AED: 'UAE Dirham', SAR: 'Saudi Riyal', ILS: 'Israeli Shekel', PHP: 'Philippine Peso',
  MYR: 'Malaysian Ringgit', TWD: 'Taiwan Dollar', DKK: 'Danish Krone',
  CZK: 'Czech Koruna', HUF: 'Hungarian Forint', RON: 'Romanian Leu',
  PKR: 'Pakistani Rupee', EGP: 'Egyptian Pound', NGN: 'Nigerian Naira',
  ARS: 'Argentine Peso', CLP: 'Chilean Peso', COP: 'Colombian Peso',
  VND: 'Vietnamese Dong', UAH: 'Ukrainian Hryvnia', RUB: 'Russian Ruble',
  C: 'Celsius', F: 'Fahrenheit', K: 'Kelvin',
};

export function getUnitsForCategory(category) {
  if (category === 'temperature') return ['C', 'F', 'K'];
  return Object.keys(LINEAR[category] || {});
}

export function getUnitLabel(unit) {
  return UNIT_LABELS[unit] || unit;
}

export function getCategoryLabel(categoryId) {
  return UNIT_CATEGORIES.find((c) => c.id === categoryId)?.label ?? categoryId;
}

export function getAlternateUnits(category, excludeUnits = []) {
  const exclude = new Set(excludeUnits);
  const popularity = UNIT_POPULARITY[category] || [];
  const all = getUnitsForCategory(category);
  const ordered = [
    ...popularity.filter((u) => all.includes(u)),
    ...all.filter((u) => !popularity.includes(u)),
  ];
  return ordered.filter((u) => !exclude.has(u));
}

function convertTemperature(value, from, to) {
  let c;
  if (from === 'C') c = value;
  else if (from === 'F') c = (value - 32) * (5 / 9);
  else c = value - 273.15;

  if (to === 'C') return c;
  if (to === 'F') return c * (9 / 5) + 32;
  return c + 273.15;
}

export function convertUnits(value, from, to, category) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (from === to) return n;

  if (category === 'temperature') {
    return convertTemperature(n, from, to);
  }

  const table = LINEAR[category];
  if (!table?.[from] || !table?.[to]) return null;
  const base = n * table[from];
  return base / table[to];
}

function formatFactor(value) {
  if (!Number.isFinite(value)) return '—';
  if (value >= 1000 || value < 0.001) return value.toExponential(4);
  return value.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

export function formatConverted(value) {
  if (value == null || !Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (abs >= 1) return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return value.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

export function getConversionFormula(category, from, to, amount = 0) {
  const fromLabel = getUnitLabel(from);
  const toLabel = getUnitLabel(to);
  const amt = Number(amount);
  const safeAmount = Number.isFinite(amt) ? amt : 0;

  if (from === to) {
    return `1 ${fromLabel} = 1 ${toLabel}`;
  }

  if (category === 'temperature') {
    if (from === 'C' && to === 'F') return '°F = (°C × 9/5) + 32';
    if (from === 'F' && to === 'C') return '°C = (°F − 32) × 5/9';
    if (from === 'C' && to === 'K') return 'K = °C + 273.15';
    if (from === 'K' && to === 'C') return '°C = K − 273.15';
    if (from === 'F' && to === 'K') return 'K = (°F − 32) × 5/9 + 273.15';
    if (from === 'K' && to === 'F') return '°F = (K − 273.15) × 9/5 + 32';
    return `${fromLabel} → ${toLabel}`;
  }

  const table = LINEAR[category];
  if (!table?.[from] || !table?.[to]) return `${fromLabel} → ${toLabel}`;

  const oneToOne = table[from] / table[to];
  const result = convertUnits(safeAmount, from, to, category);
  return [
    `1 ${fromLabel} = ${formatFactor(oneToOne)} ${toLabel}`,
    `${safeAmount} ${fromLabel} = ${formatConverted(result)} ${toLabel}`,
  ].join('\n');
}

export function defaultUnitsForCategory(category) {
  const units = getUnitsForCategory(category);
  const popular = getAlternateUnits(category);
  const from = popular[0] || units[0];
  const to = popular.find((u) => u !== from) || units[1] || units[0];
  return { from, to };
}

/** Normalize amount input — never allow empty; minimum display is 0. */
export function normalizeAmountInput(raw) {
  if (raw === '' || raw === '-' || raw == null) return '0';
  if (raw === '.') return '0.';
  if (/^0\.$/.test(raw)) return raw;
  if (/^\d*\.?\d*$/.test(raw)) {
    const n = parseFloat(raw);
    if (Number.isFinite(n) && n < 0) return '0';
    return raw;
  }
  return '0';
}

export function finalizeAmount(raw) {
  const normalized = normalizeAmountInput(raw);
  if (normalized === '0.' || normalized.endsWith('.')) {
    return String(parseFloat(normalized) || 0);
  }
  return normalized;
}
