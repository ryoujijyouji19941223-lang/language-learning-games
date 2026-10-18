// Ingredients (CONTENT_PLAN §2), ready-to-eat shop food and cooked dishes.
// Prices are game values in cents, not real Greek prices.

export type ItemKind = 'ingredient' | 'food' | 'dish';

export interface ItemDef {
  id: string;
  el: string;
  /** Plural, used in lists such as "2 × ντομάτες". */
  elPl?: string;
  en: string;
  kind: ItemKind;
  price: number;
  emoji: string;
  note?: string;
}

const ing = (id: string, el: string, elPl: string, en: string, price: number, emoji: string, note?: string): ItemDef => ({
  id, el, elPl, en, kind: 'ingredient', price, emoji, note,
});

export const INGREDIENTS: ItemDef[] = [
  ing('tomato', 'ντομάτα', 'ντομάτες', 'tomato', 60, '🍅'),
  ing('cucumber', 'αγγούρι', 'αγγούρια', 'cucumber', 50, '🥒'),
  ing('onion', 'κρεμμύδι', 'κρεμμύδια', 'onion', 30, '🧅'),
  ing('green_pepper', 'πράσινη πιπεριά', 'πράσινες πιπεριές', 'green pepper', 40, '🫑'),
  ing('potato', 'πατάτα', 'πατάτες', 'potato', 40, '🥔'),
  ing('zucchini', 'κολοκυθάκι', 'κολοκυθάκια', 'courgette', 50, '🥒', 'κολοκυθάκι = small courgette (diminutive of κολοκύθι)'),
  ing('lemon', 'λεμόνι', 'λεμόνια', 'lemon', 40, '🍋'),
  ing('garlic', 'σκόρδο', 'σκόρδα', 'garlic', 30, '🧄'),
  ing('dill', 'άνηθος', 'άνηθος', 'dill', 60, '🌿'),
  ing('mint', 'δυόσμος', 'δυόσμος', 'mint', 60, '🌿'),
  ing('parsley', 'μαϊντανός', 'μαϊντανός', 'parsley', 50, '🌿'),
  ing('olives', 'ελιές', 'ελιές', 'olives', 200, '🫒'),
  ing('capers', 'κάππαρη', 'κάππαρη', 'capers', 250, '🫙', 'Some Cycladic cooks add capers to the village salad.'),
  ing('feta', 'φέτα', 'φέτες', 'feta cheese', 300, '🧀'),
  ing('yogurt', 'στραγγιστό γιαούρτι', 'γιαούρτια', 'strained yoghurt', 150, '🥣'),
  ing('butter', 'βούτυρο', 'βούτυρα', 'butter', 180, '🧈'),
  ing('eggs', 'αυγά', 'αυγά', 'eggs (2)', 80, '🥚'),
  ing('filo', 'φύλλο κρούστας', 'φύλλα κρούστας', 'filo pastry', 220, '📜'),
  ing('flour', 'αλεύρι', 'αλεύρια', 'flour', 90, '🌾'),
  ing('rice', 'ρύζι', 'ρύζια', 'rice', 120, '🍚'),
  ing('lentils', 'φακές', 'φακές', 'lentils', 150, '🫘'),
  ing('olive_oil', 'ελαιόλαδο', 'ελαιόλαδα', 'olive oil', 100, '🫒'),
  ing('vinegar', 'ξίδι', 'ξίδια', 'vinegar', 50, '🍶'),
  ing('salt', 'αλάτι', 'αλάτια', 'salt', 30, '🧂'),
  ing('oregano', 'ρίγανη', 'ρίγανη', 'oregano', 100, '🌿'),
  ing('honey', 'θυμαρίσιο μέλι', 'μέλια', 'thyme honey', 450, '🍯'),
  ing('walnuts', 'καρύδια', 'καρύδια', 'walnuts', 250, '🌰'),
  ing('pita', 'πίτα', 'πίτες', 'pita bread', 40, '🫓'),
  ing('pork', 'χοιρινό', 'χοιρινά', 'pork', 250, '🥩'),
  ing('octopus', 'χταπόδι', 'χταπόδια', 'octopus', 600, '🐙'),
  ing('sardines', 'σαρδέλες', 'σαρδέλες', 'sardines', 300, '🐟'),
  ing('coffee_greek', 'ελληνικός καφές', 'ελληνικοί καφέδες', 'Greek coffee (ground)', 250, '☕'),
];

const food = (id: string, el: string, en: string, price: number, emoji: string, note?: string): ItemDef => ({
  id: `food:${id}`, el, en, kind: 'food', price, emoji, note,
});

/** Ready to eat; bought in shops, not cooked. */
export const FOODS: ItemDef[] = [
  food('koulouri', 'κουλούρι', 'koulouri (sesame bread ring)', 50, '🥯'),
  food('tyropita', 'τυρόπιτα', 'cheese pie', 200, '🥧'),
  food('bougatsa', 'μπουγάτσα', 'bougatsa (custard pastry)', 250, '🥮'),
  food('souvlaki', 'σουβλάκι πίτα', 'souvlaki wrap', 350, '🌯'),
  food('freddo', 'φρέντο εσπρέσο', 'freddo espresso (iced)', 300, '🧋'),
  food('baklavas', 'μπακλαβάς', 'baklava', 250, '🍯'),
  food('water', 'νερό', 'bottle of water', 50, '💧'),
  food('tost', 'τοστ', 'toastie', 250, '🥪'),
  food('elliniko', 'ελληνικός καφές (φλιτζάνι)', 'Greek coffee (a cup)', 200, '☕', 'Added for the kafeneio: served in a small cup.'),
];

export const ALL_ITEMS: ItemDef[] = [...INGREDIENTS, ...FOODS];

export const ITEM_BY_ID: Record<string, ItemDef> = Object.fromEntries(ALL_ITEMS.map((i) => [i.id, i]));

/** Sugar is always in the kitchen (not an inventory item). Water and ice too. */
export const KITCHEN_STAPLES = { el: 'ζάχαρη, νερό, παγάκια', en: 'sugar, water, ice cubes' };

/** Drinks never fill you up (water, coffee). Ids of food items and cooked dishes. */
export const DRINKS = new Set(['food:water', 'food:freddo', 'food:elliniko', 'dish:r04']);

/**
 * Fullness: after a meal you are not hungry until the next switch between day and
 * night (06:00 and 18:00, game simplification). There is no penalty for hunger.
 */
export const MEAL_SWITCHES = [6 * 60, 18 * 60];

export const START_INVENTORY: Record<string, number> = { salt: 3, olive_oil: 3, oregano: 1, coffee_greek: 1 };
