// Home cooking, CONTENT_PLAN §3. Quantities, times and steps are a simplified game
// version, not a practical recipe. Dish item IDs are `dish:<recipe id>`.

export type StepOp = 'chop' | 'grate' | 'mix' | 'tap' | 'add' | 'hold' | 'watch' | 'choice';

export interface RecipeStep {
  op: StepOp;
  el: string;
  en: string;
  /** Clicks needed for chop / grate / mix / tap. */
  n?: number;
  /** For `add`: the ingredient (or dish) to pick among the reserved ones. */
  pick?: string;
  /** For `hold`: milliseconds to keep the button pressed. */
  ms?: number;
  /** For `choice`: options that are all fine (a preference, not a test). */
  options?: { el: string; en: string }[];
}

export interface RecipeDef {
  id: string;
  el: string;
  en: string;
  ingredients: Record<string, number>;
  minutes: number;
  yield: number;
  steps: RecipeStep[];
  needsGrill?: boolean;
  disabled?: { el: string; en: string };
  note?: string;
}

const s = (op: StepOp, el: string, en: string, extra: Partial<RecipeStep> = {}): RecipeStep => ({ op, el, en, ...extra });

export const RECIPES: RecipeDef[] = [
  {
    id: 'r01', el: 'Χωριάτικη σαλάτα', en: 'Greek village salad', minutes: 10, yield: 2,
    ingredients: { tomato: 2, cucumber: 1, onion: 1, green_pepper: 1, olives: 1, feta: 1, oregano: 1, olive_oil: 1 },
    note: 'No lettuce in a χωριάτικη. Feta goes on top in one piece.',
    steps: [
      s('chop', 'Κόψε ντομάτες, αγγούρι, κρεμμύδι και πιπεριά.', 'Cut the tomatoes, cucumber, onion and pepper.', { n: 4 }),
      s('add', 'Βάλε τις ελιές.', 'Add the olives.', { pick: 'olives' }),
      s('add', 'Βάλε τη φέτα ολόκληρη από πάνω.', 'Put the feta on top, in one piece.', { pick: 'feta' }),
      s('add', 'Ρίξε ρίγανη.', 'Sprinkle oregano.', { pick: 'oregano' }),
      s('add', 'Ρίξε ελαιόλαδο.', 'Pour olive oil.', { pick: 'olive_oil' }),
    ],
  },
  {
    id: 'r02', el: 'Τζατζίκι', en: 'tzatziki', minutes: 10, yield: 2,
    ingredients: { yogurt: 1, cucumber: 1, garlic: 1, olive_oil: 1, dill: 1 },
    steps: [
      s('grate', 'Τρίψε το αγγούρι.', 'Grate the cucumber.', { n: 4 }),
      s('hold', 'Στράγγιξε το νερό.', 'Squeeze out the water.', { ms: 1200 }),
      s('add', 'Βάλε το σκόρδο.', 'Add the garlic.', { pick: 'garlic' }),
      s('mix', 'Ανακάτεψε με το γιαούρτι.', 'Mix with the yoghurt.', { n: 3 }),
      s('add', 'Βάλε άνηθο.', 'Add dill.', { pick: 'dill' }),
      s('add', 'Ρίξε λίγο ελαιόλαδο.', 'Pour a little olive oil.', { pick: 'olive_oil' }),
    ],
  },
  {
    id: 'r03', el: 'Τυρόπιτα (ταψί)', en: 'cheese pie (tray)', minutes: 50, yield: 4,
    ingredients: { filo: 1, feta: 2, eggs: 1, butter: 1 },
    steps: [
      s('mix', 'Ανακάτεψε τη φέτα με τα αυγά.', 'Mix the feta with the eggs.', { n: 3 }),
      s('add', 'Άλειψε το ταψί με βούτυρο.', 'Butter the tray.', { pick: 'butter' }),
      s('tap', 'Στρώσε φύλλα στο ταψί.', 'Lay filo sheets in the tray.', { n: 3 }),
      s('tap', 'Βάλε τη γέμιση και σκέπασε.', 'Add the filling and cover.', { n: 1 }),
      s('hold', 'Ψήσε στον φούρνο.', 'Bake in the oven.', { ms: 1500 }),
    ],
  },
  {
    id: 'r04', el: 'Ελληνικός καφές', en: 'Greek coffee', minutes: 5, yield: 1,
    ingredients: { coffee_greek: 1 },
    note: 'Sugar goes in the μπρίκι before heating. The foam on top is the καϊμάκι.',
    steps: [
      s('add', 'Βάλε καφέ και νερό στο μπρίκι.', 'Put coffee and water in the briki.', { pick: 'coffee_greek' }),
      s('choice', 'Πόση ζάχαρη;', 'How much sugar?', {
        options: [
          { el: 'σκέτο', en: 'no sugar' },
          { el: 'μέτριο', en: 'medium sweet' },
          { el: 'γλυκό', en: 'sweet' },
        ],
      }),
      s('watch', 'Σβήσε τη φωτιά μόλις ανέβει το καϊμάκι!', 'Turn off the heat as soon as the foam rises!'),
      s('tap', 'Σέρβιρε στο φλιτζάνι.', 'Pour into the cup.', { n: 1 }),
    ],
  },
  {
    id: 'r05', el: 'Σουβλάκι πίτα', en: 'souvlaki wrap', minutes: 20, yield: 2,
    ingredients: { pita: 1, pork: 1, tomato: 1, onion: 1, 'dish:r02': 1, 'dish:r13': 1 },
    note: 'Uses two dishes you cooked: tzatziki and fried potatoes.',
    steps: [
      s('chop', 'Κόψε το χοιρινό κομματάκια.', 'Cut the pork into small pieces.', { n: 3 }),
      s('hold', 'Ψήσε τα καλαμάκια.', 'Grill the skewers.', { ms: 1200 }),
      s('hold', 'Ζέστανε την πίτα.', 'Warm the pita.', { ms: 700 }),
      s('add', 'Βάλε τζατζίκι.', 'Add tzatziki.', { pick: 'dish:r02' }),
      s('add', 'Βάλε ντομάτα.', 'Add tomato.', { pick: 'tomato' }),
      s('add', 'Βάλε πατάτες.', 'Add potatoes.', { pick: 'dish:r13' }),
      s('tap', 'Τύλιξε!', 'Wrap it!', { n: 1 }),
    ],
  },
  {
    id: 'r06', el: 'Φακές', en: 'lentil soup', minutes: 45, yield: 3,
    ingredients: { lentils: 1, onion: 1, garlic: 1, olive_oil: 1, vinegar: 1 },
    steps: [
      s('add', 'Βάλε τις φακές στην κατσαρόλα.', 'Put the lentils in the pot.', { pick: 'lentils' }),
      s('hold', 'Βράσε.', 'Boil.', { ms: 1000 }),
      s('chop', 'Κόψε κρεμμύδι και σκόρδο.', 'Chop onion and garlic.', { n: 2 }),
      s('add', 'Ρίξε ελαιόλαδο.', 'Pour olive oil.', { pick: 'olive_oil' }),
      s('hold', 'Σιγόβρασε.', 'Simmer.', { ms: 1200 }),
      s('add', 'Στο τέλος, λίγο ξίδι.', 'At the end, a little vinegar.', { pick: 'vinegar' }),
    ],
  },
  {
    id: 'r07', el: 'Γεμιστά', en: 'stuffed tomatoes & peppers', minutes: 80, yield: 3,
    ingredients: { tomato: 3, green_pepper: 2, rice: 1, onion: 1, parsley: 1, mint: 1, olive_oil: 2, potato: 1 },
    steps: [
      s('tap', 'Άδειασε τις ντομάτες και τις πιπεριές.', 'Hollow out the tomatoes and peppers.', { n: 3 }),
      s('mix', 'Ανακάτεψε ρύζι, κρεμμύδι, μαϊντανό και δυόσμο.', 'Mix rice, onion, parsley and mint.', { n: 3 }),
      s('tap', 'Γέμισε τα λαχανικά.', 'Stuff the vegetables.', { n: 3 }),
      s('add', 'Βάλε πατάτες ανάμεσα.', 'Put potatoes in between.', { pick: 'potato' }),
      s('add', 'Ρίξε ελαιόλαδο.', 'Pour olive oil.', { pick: 'olive_oil' }),
      s('hold', 'Ψήσε στον φούρνο.', 'Bake in the oven.', { ms: 1500 }),
    ],
  },
  {
    id: 'r08', el: 'Κολοκυθοκεφτέδες', en: 'courgette fritters', minutes: 30, yield: 2,
    ingredients: { zucchini: 2, feta: 1, eggs: 1, flour: 1, mint: 1, onion: 1, olive_oil: 1 },
    steps: [
      s('grate', 'Τρίψε τα κολοκυθάκια.', 'Grate the courgettes.', { n: 4 }),
      s('hold', 'Στράγγιξε το νερό.', 'Squeeze out the water.', { ms: 1000 }),
      s('add', 'Θρύψε τη φέτα.', 'Crumble the feta.', { pick: 'feta' }),
      s('mix', 'Ανακάτεψε με αυγό, αλεύρι και δυόσμο.', 'Mix with egg, flour and mint.', { n: 3 }),
      s('tap', 'Κάνε μπαλίτσες.', 'Shape small balls.', { n: 3 }),
      s('hold', 'Τηγάνισε.', 'Fry.', { ms: 1200 }),
    ],
  },
  {
    id: 'r09', el: 'Χταπόδι στα κάρβουνα', en: 'grilled octopus', minutes: 60, yield: 2, needsGrill: true,
    ingredients: { octopus: 1, olive_oil: 1, lemon: 1, oregano: 1, vinegar: 1 },
    steps: [
      s('hold', 'Βράσε λίγο το χταπόδι.', 'Boil the octopus a little.', { ms: 1200 }),
      s('chop', 'Κόψε τα πλοκάμια.', 'Cut the tentacles.', { n: 3 }),
      s('hold', 'Ψήσε στα κάρβουνα.', 'Grill over charcoal.', { ms: 1500 }),
      s('add', 'Ρίξε ελαιόλαδο.', 'Pour olive oil.', { pick: 'olive_oil' }),
      s('add', 'Στύψε λεμόνι.', 'Squeeze lemon.', { pick: 'lemon' }),
    ],
  },
  {
    id: 'r10', el: 'Σαρδέλες ψητές', en: 'grilled sardines', minutes: 20, yield: 2, needsGrill: true,
    ingredients: { sardines: 1, salt: 1, olive_oil: 1, lemon: 1 },
    steps: [
      s('add', 'Αλάτισε τις σαρδέλες.', 'Salt the sardines.', { pick: 'salt' }),
      s('hold', 'Ψήσε στη σχάρα.', 'Grill them.', { ms: 1200 }),
      s('add', 'Στύψε λεμόνι.', 'Squeeze lemon.', { pick: 'lemon' }),
    ],
  },
  {
    id: 'r11', el: 'Γιαούρτι με μέλι και καρύδια', en: 'yoghurt with honey & walnuts', minutes: 5, yield: 2,
    ingredients: { yogurt: 1, honey: 1, walnuts: 1 },
    steps: [
      s('tap', 'Βάλε γιαούρτι στο μπολ.', 'Put yoghurt in the bowl.', { n: 1 }),
      s('add', 'Ρίξε μέλι.', 'Drizzle honey.', { pick: 'honey' }),
      s('add', 'Πρόσθεσε καρύδια.', 'Add walnuts.', { pick: 'walnuts' }),
    ],
  },
  {
    id: 'r12', el: 'Ταραμοσαλάτα', en: 'fish roe dip', minutes: 15, yield: 2,
    ingredients: {},
    steps: [],
    disabled: { el: 'Ο ταραμάς δεν πουλιέται ακόμα στο νησί.', en: 'Fish roe (ταραμάς) is not sold on the island yet (planned for M3).' },
  },
  {
    id: 'r13', el: 'Πατάτες τηγανητές', en: 'fried potatoes', minutes: 20, yield: 2,
    ingredients: { potato: 2, olive_oil: 1, salt: 1 },
    steps: [
      s('chop', 'Κόψε τις πατάτες.', 'Cut the potatoes.', { n: 4 }),
      s('hold', 'Τηγάνισε σε ελαιόλαδο.', 'Fry in olive oil.', { ms: 1200 }),
      s('add', 'Αλάτισε.', 'Salt them.', { pick: 'salt' }),
    ],
  },
];

export const RECIPE_BY_ID: Record<string, RecipeDef> = Object.fromEntries(RECIPES.map((r) => [r.id, r]));

export const dishId = (recipeId: string) => `dish:${recipeId}`;

export const KITCHEN_TOOLS = [
  { el: 'κουζίνα', en: 'stove' },
  { el: 'φούρνος', en: 'oven' },
  { el: 'ξύλο κοπής', en: 'chopping board' },
  { el: 'κατσαρόλα', en: 'pot' },
  { el: 'τηγάνι', en: 'frying pan' },
  { el: 'μπρίκι', en: 'briki (small Greek-coffee pot)' },
];
