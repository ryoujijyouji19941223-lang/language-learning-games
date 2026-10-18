// Work content, SPEC §11 and CONTENT_PLAN §7. Times are game minutes; pay in cents.

import type { Line } from './npcs';

const L = (el: string, en: string): Line => ({ el, en });

export type JobKind = 'cafe' | 'bakery' | 'taverna';

export interface JobDef {
  kind: JobKind;
  shop: string;
  boss: string;
  el: string;
  en: string;
  minutes: number;
  pay: number;
  bonusItem?: string;
  /** Start window (minutes from midnight) — the shop must also be open. */
  startFrom: number;
  startTo: number;
  customers: number;
}

export const JOBS: Record<JobKind, JobDef> = {
  cafe: { kind: 'cafe', shop: 'agora_cafe', boss: 'g18', el: 'Βάρδια στην καφετέρια', en: 'Café shift', minutes: 120, pay: 1800,
    startFrom: 8 * 60, startTo: 22 * 60, customers: 4 },
  bakery: { kind: 'bakery', shop: 'agora_bakery', boss: 'g16', el: 'Πρωινή βάρδια στον φούρνο', en: 'Morning bakery shift', minutes: 120, pay: 1600,
    bonusItem: 'food:koulouri', startFrom: 6 * 60, startTo: 7 * 60 + 30, customers: 4 },
  taverna: { kind: 'taverna', shop: 'port_taverna', boss: 'g12', el: 'Βραδινή βάρδια στην ταβέρνα', en: 'Evening taverna shift', minutes: 180, pay: 2800,
    startFrom: 19 * 60, startTo: 20 * 60, customers: 3 },
};

// ── Café ──────────────────────────────────────────────────────────────
export type Drink = 'freddo_espresso' | 'freddo_cappuccino' | 'frappe' | 'elliniko';
export type Sugar = 'sketo' | 'metrio' | 'glyko';
export type Where = 'edo' | 'paketo';

export const DRINKS: Record<Drink, Line> = {
  freddo_espresso: L('φρέντο εσπρέσο', 'freddo espresso (iced espresso)'),
  freddo_cappuccino: L('φρέντο καπουτσίνο', 'freddo cappuccino (iced, with milk foam)'),
  frappe: L('φραπέ', 'frappé (shaken instant coffee)'),
  elliniko: L('ελληνικός καφές', 'Greek coffee (hot, in a small cup)'),
};
export const SUGARS: Record<Sugar, Line> = {
  sketo: L('σκέτο', 'no sugar'),
  metrio: L('μέτριο', 'medium sweet'),
  glyko: L('γλυκό', 'sweet'),
};
export const WHERE: Record<Where, Line> = {
  edo: L('εδώ', 'here (to stay)'),
  paketo: L('πακέτο', 'to go'),
};

export interface CafeOrder {
  id: string;
  line: Line;
  cups: { drink: Drink; sugar: Sugar }[];
  water: boolean;
  /** Where the customer will drink it; null = they answer when you ask. */
  where: Where | null;
  answer?: Where;
  /** Only single-drink orders whose sugar is not μέτριο can be changed afterwards. */
  amendable?: boolean;
}

export const CAFE_ORDERS: CafeOrder[] = [
  { id: 'c1', line: L('Έναν φρέντο εσπρέσο μέτριο, παρακαλώ.', 'One medium-sweet freddo espresso, please.'),
    cups: [{ drink: 'freddo_espresso', sugar: 'metrio' }], water: false, where: null, answer: 'edo' },
  { id: 'c2', line: L('Δύο φραπέδες, έναν γλυκό κι έναν σκέτο. Πακέτο.', 'Two frappés, one sweet and one unsweetened. To go.'),
    cups: [{ drink: 'frappe', sugar: 'glyko' }, { drink: 'frappe', sugar: 'sketo' }], water: false, where: 'paketo' },
  { id: 'c3', line: L('Έναν ελληνικό σκέτο, εδώ.', 'One unsweetened Greek coffee, here.'),
    cups: [{ drink: 'elliniko', sugar: 'sketo' }], water: false, where: 'edo', amendable: true },
  { id: 'c4', line: L('Έναν φρέντο καπουτσίνο γλυκό. Και ένα νερό.', 'One sweet freddo cappuccino. And a water.'),
    cups: [{ drink: 'freddo_cappuccino', sugar: 'glyko' }], water: true, where: null, answer: 'paketo', amendable: true },
  { id: 'c5', line: L('Έναν φραπέ μέτριο, πακέτο, παρακαλώ.', 'One medium-sweet frappé to go, please.'),
    cups: [{ drink: 'frappe', sugar: 'metrio' }], water: false, where: 'paketo' },
  { id: 'c6', line: L('Έναν φρέντο καπουτσίνο σκέτο, για εδώ.', 'One unsweetened freddo cappuccino, for here.'),
    cups: [{ drink: 'freddo_cappuccino', sugar: 'sketo' }], water: false, where: 'edo', amendable: true },
  { id: 'c7', line: L('Δύο ελληνικούς, μέτριους. Εδώ.', 'Two Greek coffees, medium sweet. Here.'),
    cups: [{ drink: 'elliniko', sugar: 'metrio' }, { drink: 'elliniko', sugar: 'metrio' }], water: false, where: 'edo' },
  { id: 'c8', line: L('Έναν φρέντο εσπρέσο γλυκό κι έναν φρέντο καπουτσίνο σκέτο. Πακέτο.', 'One sweet freddo espresso and one unsweetened freddo cappuccino. To go.'),
    cups: [{ drink: 'freddo_espresso', sugar: 'glyko' }, { drink: 'freddo_cappuccino', sugar: 'sketo' }], water: false, where: 'paketo' },
  { id: 'c9', line: L('Έναν ελληνικό γλυκό, παρακαλώ.', 'One sweet Greek coffee, please.'),
    cups: [{ drink: 'elliniko', sugar: 'glyko' }], water: false, where: null, answer: 'edo', amendable: true },
  { id: 'c10', line: L('Έναν φραπέ σκέτο με ένα νερό, για εδώ.', 'One unsweetened frappé with a water, for here.'),
    cups: [{ drink: 'frappe', sugar: 'sketo' }], water: true, where: 'edo', amendable: true },
  { id: 'c11', line: L('Έναν φρέντο εσπρέσο σκέτο. Πακέτο, παρακαλώ.', 'One unsweetened freddo espresso. To go, please.'),
    cups: [{ drink: 'freddo_espresso', sugar: 'sketo' }], water: false, where: 'paketo', amendable: true },
  { id: 'c12', line: L('Ένα νερό κι έναν ελληνικό μέτριο. Εδώ.', 'A water and a medium-sweet Greek coffee. Here.'),
    cups: [{ drink: 'elliniko', sugar: 'metrio' }], water: true, where: 'edo' },
];

export const CAFE_LINES = {
  askWhere: L('Για εδώ ή πακέτο;', 'For here or to go?'),
  answer: { edo: L('Για εδώ.', 'For here.'), paketo: L('Πακέτο, παρακαλώ.', 'To go, please.') } as Record<Where, Line>,
  amend: L('Συγγνώμη! Μπορείτε να τον κάνετε μέτριο;', 'Sorry! Could you make it medium sweet?'),
  thanks: L('Ευχαριστώ πολύ!', 'Thank you very much!'),
  wrongDrink: L('Όχι, δεν ήθελα αυτόν τον καφέ.', "No, that's not the coffee I wanted."),
  wrongCount: L('Μάλλον λείπει κάτι… ή περισσεύει.', "I think something's missing… or there's one too many."),
  wrongSugar: L('Συγγνώμη, η ζάχαρη δεν είναι όπως την είπα.', "Sorry, the sugar isn't how I said."),
  wrongWhere: (w: Where): Line => (w === 'edo'
    ? L('Τον ήθελα για εδώ, όχι πακέτο.', 'I wanted it for here, not to go.')
    : L('Τον ήθελα πακέτο, όχι για εδώ.', 'I wanted it to go, not for here.')),
  noWhere: L('Δεν με ρωτήσατε: για εδώ ή πακέτο;', "You didn't ask me: for here or to go?"),
  water: L('Ξεχάσατε το νερό.', 'You forgot the water.'),
  extraWater: L('Νερό δεν ζήτησα, αλλά ευχαριστώ!', "I didn't ask for water — but thanks!"),
};

// ── Bakery ────────────────────────────────────────────────────────────
export type Bake = 'koulouri' | 'tyropita' | 'spanakopita' | 'bougatsa' | 'psomi';

export const BAKES: Record<Bake, { one: Line; many: string; sign: string; emoji: string }> = {
  koulouri: { one: L('κουλούρι', 'koulouri (sesame ring)'), many: 'κουλούρια', sign: 'ΚΟΥΛΟΥΡΙΑ', emoji: '🥯' },
  tyropita: { one: L('τυρόπιτα', 'cheese pie'), many: 'τυρόπιτες', sign: 'ΤΥΡΟΠΙΤΕΣ', emoji: '🥧' },
  spanakopita: { one: L('σπανακόπιτα', 'spinach pie'), many: 'σπανακόπιτες', sign: 'ΣΠΑΝΑΚΟΠΙΤΕΣ', emoji: '🥬' },
  bougatsa: { one: L('μπουγάτσα', 'bougatsa (custard pastry)'), many: 'μπουγάτσες', sign: 'ΜΠΟΥΓΑΤΣΕΣ', emoji: '🥮' },
  psomi: { one: L('ψωμί', 'loaf of bread'), many: 'ψωμιά', sign: 'ΨΩΜΙ', emoji: '🍞' },
};

export interface BakeryOrder { id: string; line: Line; items: Partial<Record<Bake, number>> }

export const BAKERY_ORDERS: BakeryOrder[] = [
  { id: 'b1', line: L('Δύο κουλούρια, παρακαλώ.', 'Two koulouria, please.'), items: { koulouri: 2 } },
  { id: 'b2', line: L('Μία τυρόπιτα κι ένα κουλούρι.', 'One cheese pie and one koulouri.'), items: { tyropita: 1, koulouri: 1 } },
  { id: 'b3', line: L('Τρία κουλούρια και δύο μπουγάτσες.', 'Three koulouria and two bougatsas.'), items: { koulouri: 3, bougatsa: 2 } },
  { id: 'b4', line: L('Ένα ψωμί κι ένα κουλούρι, παρακαλώ.', 'A loaf of bread and a koulouri, please.'), items: { psomi: 1, koulouri: 1 } },
  { id: 'b5', line: L('Δύο τυρόπιτες, για πακέτο.', 'Two cheese pies, to take away.'), items: { tyropita: 2 } },
  { id: 'b6', line: L('Μία σπανακόπιτα και δύο κουλούρια.', 'One spinach pie and two koulouria.'), items: { spanakopita: 1, koulouri: 2 } },
  { id: 'b7', line: L('Δύο ψωμιά και μία μπουγάτσα.', 'Two loaves and one bougatsa.'), items: { psomi: 2, bougatsa: 1 } },
  { id: 'b8', line: L('Μία τυρόπιτα και μία σπανακόπιτα.', 'One cheese pie and one spinach pie.'), items: { tyropita: 1, spanakopita: 1 } },
];

export const BAKERY_LINES = {
  shelvesIntro: L('Βγήκαν από τον φούρνο! Βάλ’ τα στα σωστά ράφια.', 'Fresh out of the oven! Put them on the right shelves.'),
  wrongShelf: L('Όχι εκεί. Κοίτα την ταμπέλα.', 'Not there. Look at the label.'),
  thanks: L('Ευχαριστώ, καλημέρα!', 'Thank you, have a good day!'),
  wrong: L('Συγγνώμη, δεν είναι αυτό που ζήτησα.', "Sorry, that's not what I asked for."),
};

// ── Taverna ───────────────────────────────────────────────────────────
export const TAVERNA_DISHES: Record<string, Line> = {
  r01: L('χωριάτικη', 'village salad'),
  r02: L('τζατζίκι', 'tzatziki'),
  r07: L('γεμιστά', 'stuffed vegetables'),
  r08: L('κολοκυθοκεφτέδες', 'courgette fritters'),
  r09: L('χταπόδι στα κάρβουνα', 'grilled octopus'),
  r10: L('σαρδέλες ψητές', 'grilled sardines'),
  r13: L('πατάτες τηγανητές', 'fried potatoes'),
};

export interface TavernaOrder { id: string; line: Line; dishes: Record<string, number> }

export const TAVERNA_ORDERS: TavernaOrder[] = [
  { id: 't1', line: L('Μία χωριάτικη κι ένα τζατζίκι, παρακαλώ.', 'One village salad and one tzatziki, please.'), dishes: { r01: 1, r02: 1 } },
  { id: 't2', line: L('Ένα χταπόδι στα κάρβουνα και μία μερίδα πατάτες.', 'One grilled octopus and a portion of chips.'), dishes: { r09: 1, r13: 1 } },
  { id: 't3', line: L('Σαρδέλες ψητές, μία χωριάτικη και πατάτες τηγανητές.', 'Grilled sardines, a village salad and fried potatoes.'), dishes: { r10: 1, r01: 1, r13: 1 } },
  { id: 't4', line: L('Δύο μερίδες γεμιστά κι ένα τζατζίκι.', 'Two portions of stuffed vegetables and one tzatziki.'), dishes: { r07: 2, r02: 1 } },
  { id: 't5', line: L('Μία μερίδα κολοκυθοκεφτέδες κι ένα χταπόδι.', 'A portion of courgette fritters and an octopus.'), dishes: { r08: 1, r09: 1 } },
  { id: 't6', line: L('Δύο χωριάτικες και σαρδέλες ψητές.', 'Two village salads and grilled sardines.'), dishes: { r01: 2, r10: 1 } },
];

export const TAVERNA_LINES = {
  waterFirst: L('Μας φέρνετε λίγο νερό και ψωμί;', 'Could you bring us some water and bread?'),
  waterThanks: L('Ευχαριστούμε! Ας δούμε τον κατάλογο.', "Thank you! Let's look at the menu."),
  ready: L('Είμαστε έτοιμοι να παραγγείλουμε.', "We're ready to order."),
  served: L('Τέλεια! Καλή όρεξη σε όλους μας!', 'Perfect! Enjoy our meal, everyone!'),
  wrong: L('Συγγνώμη, αυτό δεν το παραγγείλαμε.', "Sorry, we didn't order that."),
  missing: L('Λείπει ακόμα κάτι από την παραγγελία.', 'Something from the order is still missing.'),
  kitchen: L('Έτοιμο! Πάρ’ το για το τραπέζι!', 'Ready! Take it to the table!'),
};

export const SHIFT_LINES = {
  offer: L('Θέλετε να δουλέψετε λίγο; Πληρώνω το ίδιο βράδυ.', 'Would you like to work a little? I pay the same day.'),
  ask: L('Υπάρχει δουλειά;', 'Is there any work?'),
  notNow: L('Όχι τώρα. Ελάτε την ώρα της βάρδιας.', 'Not now. Come at shift time.'),
  done: L('Μπράβο, καλή δουλειά! Ορίστε τα λεφτά σας.', 'Well done, good work! Here is your pay.'),
  resume: L('Συνεχίζουμε από εκεί που σταματήσαμε;', 'Shall we carry on where we stopped?'),
};
