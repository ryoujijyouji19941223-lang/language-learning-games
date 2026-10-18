// Shops and places, CONTENT_PLAN §1. Opening hours are a game simplification
// (not a rule for all of Greece). Minutes from midnight; 1440 = 24:00.

export type DistrictId = 'limani' | 'agora' | 'chora' | 'geitonia' | 'paralia';

export const DISTRICTS: Record<DistrictId, { el: string; en: string }> = {
  limani: { el: 'Λιμάνι', en: 'Harbour' },
  agora: { el: 'Αγορά', en: 'Market street' },
  chora: { el: 'Χώρα', en: 'Old town & square' },
  geitonia: { el: 'Γειτονιά', en: 'Neighbourhood' },
  paralia: { el: 'Παραλία & λόφος', en: 'Beach & hill' },
};

/** Seven weekdays, Monday first; each a list of [open, close) intervals. */
export type Week = [number, number][][];

const H = (h: number, m = 0) => h * 60 + m;
const every = (...iv: [number, number][]): Week => Array.from({ length: 7 }, () => iv);
const weekdays = (wk: [number, number][], sat: [number, number][], sun: [number, number][]): Week => [wk, wk, wk, wk, wk, sat, sun];

/** "Pattern A" for small shops: Mon/Wed/Sat 09–15, Tue/Thu/Fri 09–14:30 & 17:30–20:30, Sun closed. */
export const PATTERN_A: Week = [
  [[H(9), H(15)]],
  [[H(9), H(14, 30)], [H(17, 30), H(20, 30)]],
  [[H(9), H(15)]],
  [[H(9), H(14, 30)], [H(17, 30), H(20, 30)]],
  [[H(9), H(14, 30)], [H(17, 30), H(20, 30)]],
  [[H(9), H(15)]],
  [],
];

export type CatalogKind = 'item' | 'furniture' | 'clothes';
export interface CatalogEntry { kind: CatalogKind; id: string; stock: number }

export type InteriorKind = 'cafe' | 'bakery' | 'taverna' | 'minimarket' | 'furniture' | 'clothes' | 'kafeneio';

export interface ShopDef {
  id: string;
  district: DistrictId;
  /** Name as written normally (used for speech and the dictionary). */
  el: string;
  /** Sign text: capitals without accents (dialytika stays). */
  sign: string;
  en: string;
  week?: Week;
  /** Months (0 = January) when the place opens at all. */
  months?: number[];
  hoursNote?: string;
  /** Not a shop: look and talk only. */
  noTrade?: boolean;
  interior?: InteriorKind;
  catalog?: CatalogEntry[];
  /** Can buy back furniture / clothes at half price. */
  buysBack?: boolean;
  staff?: string[];
}

const items = (ids: string[], stock = 20): CatalogEntry[] => ids.map((id) => ({ kind: 'item', id, stock }));
const furn = (ids: string[], stock = 2): CatalogEntry[] => ids.map((id) => ({ kind: 'furniture', id, stock }));
const range = (a: number, b: number, prefix = 'f') => Array.from({ length: b - a + 1 }, (_, i) => `${prefix}${String(a + i).padStart(2, '0')}`);

export const SHOPS: ShopDef[] = [
  { id: 'port_fish', district: 'limani', el: 'Ιχθυοπωλείο «Ο Γλάρος»', sign: 'ΙΧΘΥΟΠΩΛΕΙΟ «Ο ΓΛΑΡΟΣ»', en: 'fishmonger "The Seagull"',
    week: weekdays([[H(7), H(14)]], [[H(7), H(14)]], []), catalog: items(['octopus', 'sardines'], 8), staff: ['g02'] },
  { id: 'port_taverna', district: 'limani', el: 'Ψαροταβέρνα «Το Κύμα»', sign: 'ΨΑΡΟΤΑΒΕΡΝΑ «ΤΟ ΚΥΜΑ»', en: 'fish taverna "The Wave"',
    week: every([H(12), H(16)], [H(19), H(24)]), interior: 'taverna', staff: ['g12', 'g13', 'g14'] },
  { id: 'port_depot', district: 'limani', el: 'Σημείο παραλαβής δεμάτων', sign: 'ΣΗΜΕΙΟ ΠΑΡΑΛΑΒΗΣ ΔΕΜΑΤΩΝ', en: 'parcel pick-up point',
    week: weekdays([[H(8), H(20)]], [[H(8), H(20)]], []), staff: ['g05'], noTrade: true },
  { id: 'port_kiosk', district: 'limani', el: 'Περίπτερο', sign: 'ΠΕΡΙΠΤΕΡΟ', en: 'kiosk',
    week: every([H(7), H(24)]), catalog: items(['food:water'], 40), staff: ['g10'] },
  { id: 'port_tickets', district: 'limani', el: 'Πρακτορείο εισιτηρίων', sign: 'ΠΡΑΚΤΟΡΕΙΟ ΕΙΣΙΤΗΡΙΩΝ', en: 'ferry ticket agency',
    week: every([H(7), H(21)]), noTrade: true, hoursNote: 'Look and talk only.', staff: ['g04'] },
  { id: 'agora_bakery', district: 'agora', el: 'Φούρνος «Το Προζύμι»', sign: 'ΦΟΥΡΝΟΣ «ΤΟ ΠΡΟΖΥΜΙ»', en: 'bakery "The Sourdough"',
    week: weekdays([[H(6), H(14, 30)]], [[H(6), H(14, 30)]], [[H(7), H(12)]]), interior: 'bakery',
    catalog: items(['food:koulouri', 'food:tyropita', 'food:bougatsa'], 15), staff: ['g16', 'g17'] },
  { id: 'agora_cafe', district: 'agora', el: 'Καφετέρια «Μπλε Πόρτα»', sign: 'ΚΑΦΕΤΕΡΙΑ «ΜΠΛΕ ΠΟΡΤΑ»', en: 'café "Blue Door"',
    week: every([H(8), H(24)]), interior: 'cafe', catalog: items(['food:freddo', 'food:tost', 'food:water'], 30), staff: ['g18', 'g19'] },
  { id: 'agora_greengrocer', district: 'agora', el: 'Μανάβικο «Ο Κήπος»', sign: 'ΜΑΝΑΒΙΚΟ «Ο ΚΗΠΟΣ»', en: 'greengrocer "The Garden"',
    week: PATTERN_A, catalog: items(['tomato', 'cucumber', 'onion', 'green_pepper', 'potato', 'zucchini', 'lemon', 'garlic', 'dill', 'mint', 'parsley', 'olives']), staff: ['g20'] },
  { id: 'agora_minimarket', district: 'agora', el: 'Μίνι μάρκετ «Ήλιος»', sign: 'ΜΙΝΙ ΜΑΡΚΕΤ «ΗΛΙΟΣ»', en: 'mini market "Sun"',
    week: weekdays([[H(8), H(21)]], [[H(8), H(21)]], [[H(10), H(15)]]), interior: 'minimarket',
    catalog: items(['capers', 'feta', 'yogurt', 'butter', 'eggs', 'filo', 'flour', 'rice', 'lentils', 'olive_oil', 'vinegar', 'salt', 'oregano', 'honey', 'walnuts', 'pita', 'coffee_greek', 'food:water']), staff: ['g21'] },
  { id: 'agora_souvlaki', district: 'agora', el: 'Σουβλατζίδικο «Η Σούβλα»', sign: 'ΣΟΥΒΛΑΤΖΙΔΙΚΟ «Η ΣΟΥΒΛΑ»', en: 'souvlaki shop "The Skewer"',
    week: every([H(12), H(24)]), catalog: items(['food:souvlaki', 'food:water'], 30), staff: ['g22'] },
  { id: 'agora_pastry', district: 'agora', el: 'Ζαχαροπλαστείο «Μέλι»', sign: 'ΖΑΧΑΡΟΠΛΑΣΤΕΙΟ «ΜΕΛΙ»', en: 'patisserie "Honey"',
    week: every([H(9), H(22)]), catalog: items(['food:baklavas', 'food:bougatsa'], 15), staff: ['g23'] },
  { id: 'agora_butcher', district: 'agora', el: 'Κρεοπωλείο', sign: 'ΚΡΕΟΠΩΛΕΙΟ', en: 'butcher',
    week: PATTERN_A, catalog: items(['pork', 'pita']), staff: ['g29'] },
  { id: 'agora_cheese', district: 'agora', el: 'Τυροπωλείο', sign: 'ΤΥΡΟΠΩΛΕΙΟ', en: 'cheese shop',
    week: PATTERN_A, catalog: items(['feta']), staff: ['g30'] },
  { id: 'agora_furniture', district: 'agora', el: 'Έπιπλα «Ξύλο & Φως»', sign: 'ΕΠΙΠΛΑ «ΞΥΛΟ & ΦΩΣ»', en: 'furniture "Wood & Light"',
    week: PATTERN_A, interior: 'furniture', buysBack: true,
    catalog: furn([...range(1, 20), 'f25', 'f26', 'f27', 'f28', 'f32', 'f35', 'f36'], 3), staff: ['g24', 'g25'] },
  { id: 'agora_clothes', district: 'agora', el: 'Ρούχα «Αλάτι»', sign: 'ΡΟΥΧΑ «ΑΛΑΤΙ»', en: 'clothes "Salt"',
    week: PATTERN_A, interior: 'clothes', buysBack: true,
    catalog: range(1, 20, 'c').map((id) => ({ kind: 'clothes' as const, id, stock: 1 })), staff: ['g26'] },
  { id: 'agora_florist', district: 'agora', el: 'Ανθοπωλείο «Βουκαμβίλια»', sign: 'ΑΝΘΟΠΩΛΕΙΟ «ΒΟΥΚΑΜΒΙΛΙΑ»', en: 'florist "Bougainvillea"',
    week: PATTERN_A, catalog: furn(['f21', 'f22', 'f23', 'f24', 'f39'], 4), staff: ['g27'] },
  { id: 'agora_home', district: 'agora', el: 'Είδη σπιτιού «Πηλός»', sign: 'ΕΙΔΗ ΣΠΙΤΙΟΥ «ΠΗΛΟΣ»', en: 'homeware "Clay"',
    week: PATTERN_A, buysBack: true, catalog: furn(['f29', 'f30', 'f31', 'f33', 'f34', 'f35', 'f36', 'f37', 'f38', 'f40'], 3), staff: ['g28'] },
  { id: 'agora_laiki', district: 'agora', el: 'Λαϊκή', sign: 'ΛΑΪΚΗ', en: 'open-air market (Saturdays)',
    week: [[], [], [], [], [], [[H(7), H(14)]], []],
    catalog: items(['tomato', 'cucumber', 'onion', 'green_pepper', 'potato', 'zucchini', 'lemon', 'olives', 'eggs', 'oregano', 'honey'], 25),
    hoursNote: 'Saturdays only. Vegetables, eggs and honey are a little cheaper here.' },
  { id: 'chora_kafeneio', district: 'chora', el: 'Καφενείο «Η Πλατεία»', sign: 'ΚΑΦΕΝΕΙΟ «Η ΠΛΑΤΕΙΑ»', en: 'coffeehouse "The Square"',
    week: every([H(7), H(23)]), interior: 'kafeneio', catalog: items(['food:elliniko', 'food:water'], 30), staff: ['g32'] },
  { id: 'chora_church', district: 'chora', el: 'Ενορία Αγίου Νικολάου', sign: 'ΕΝΟΡΙΑ ΑΓΙΟΥ ΝΙΚΟΛΑΟΥ', en: 'parish church of Saint Nicholas',
    noTrade: true, week: every([H(7), H(12)], [H(17), H(20)]), staff: ['g35'] },
  { id: 'chora_post', district: 'chora', el: 'Ταχυδρομείο', sign: 'ΤΑΧΥΔΡΟΜΕΙΟ', en: 'post office',
    week: weekdays([[H(8), H(14)]], [], []), noTrade: true, staff: ['g38'] },
  { id: 'chora_townhall', district: 'chora', el: 'Δημοτικό γραφείο', sign: 'ΔΗΜΟΤΙΚΟ ΓΡΑΦΕΙΟ', en: 'town office',
    week: weekdays([[H(8), H(14)]], [], []), noTrade: true, staff: ['g40'] },
  { id: 'chora_pharmacy', district: 'chora', el: 'Φαρμακείο', sign: 'ΦΑΡΜΑΚΕΙΟ', en: 'pharmacy',
    week: PATTERN_A, noTrade: true, staff: ['g39'] },
  { id: 'chora_barber', district: 'chora', el: 'Κουρείο', sign: 'ΚΟΥΡΕΙΟ', en: 'barber',
    week: PATTERN_A, noTrade: true, staff: ['g44'] },
  { id: 'chora_books', district: 'chora', el: 'Βιβλιοπωλείο', sign: 'ΒΙΒΛΙΟΠΩΛΕΙΟ', en: 'bookshop',
    week: PATTERN_A, noTrade: true, staff: ['g45'] },
  { id: 'chora_guesthouse', district: 'chora', el: 'Ξενώνας «Αύρα»', sign: 'ΞΕΝΩΝΑΣ «ΑΥΡΑ»', en: 'guesthouse "Breeze"',
    week: every([H(8), H(22)]), noTrade: true, hoursNote: 'Talk only.', staff: ['g43'] },
  { id: 'home_office', district: 'geitonia', el: 'Γραφείο ενοικίων', sign: 'ΓΡΑΦΕΙΟ ΕΝΟΙΚΙΩΝ', en: 'rental office',
    week: weekdays([[H(9), H(15)]], [[H(9), H(15)]], []), noTrade: true, staff: ['g46'] },
  { id: 'beach_kantina', district: 'paralia', el: 'Καντίνα', sign: 'ΚΑΝΤΙΝΑ', en: 'beach snack stand',
    week: every([H(10), H(20)]), months: [5, 6, 7, 8], hoursNote: 'June to September only.',
    catalog: items(['food:water', 'food:tost'], 30), staff: ['g62'] },
  { id: 'hill_windmill', district: 'paralia', el: 'Ανεμόμυλος', sign: 'ΑΝΕΜΟΜΥΛΟΣ', en: 'windmill', noTrade: true },
  { id: 'hill_chapel', district: 'paralia', el: 'Εκκλησάκι', sign: 'ΕΚΚΛΗΣΑΚΙ', en: 'small chapel', noTrade: true },
];

export const SHOP_BY_ID: Record<string, ShopDef> = Object.fromEntries(SHOPS.map((s) => [s.id, s]));

/** Laiki prices: 10% off (rounded to 5 cents). */
export const LAIKI_DISCOUNT = 0.9;

export const OPEN_SIGN = { open: { el: 'Ανοιχτό', en: 'Open' }, closed: { el: 'Κλειστό', en: 'Closed' } };
