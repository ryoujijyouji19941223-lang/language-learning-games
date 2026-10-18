// Shared Greek phrases and UI labels (Greek in game, English as help).

import type { Line } from './npcs';

const L = (el: string, en: string): Line => ({ el, en });

export const SHOP_FLOW = {
  greetMorning: L('Καλημέρα!', 'Good morning!'),
  greetEvening: L('Καλησπέρα!', 'Good evening!'),
  staffAsk: L('Τι θα θέλατε;', 'What would you like?'),
  order: L('Θα ήθελα αυτά, παρακαλώ.', "I'd like these, please."),
  here: L('Ορίστε.', 'Here you are.'),
  howMuch: L('Πόσο κάνει;', 'How much is it?'),
  pay: L('Ορίστε.', 'Here you are. (handing over money)'),
  thanks: L('Ευχαριστώ!', 'Thank you!'),
  thanksStaff: L('Ευχαριστώ κι εγώ! Καλή συνέχεια!', 'Thank you too! Have a nice day!'),
  noMoney: L('Ωχ, δεν μου φτάνουν τα λεφτά.', "Oh, I don't have enough money."),
  noMoneyReply: L('Δεν πειράζει. Αλλάξτε κάτι αν θέλετε.', "No problem. Change something if you like."),
  closed: L('Κλειστό', 'Closed'),
  open: L('Ανοιχτό', 'Open'),
  sell: L('Θέλω να πουλήσω κάτι.', "I'd like to sell something."),
  sellReply: L('Να δούμε. Σας δίνω τα μισά από την τιμή.', "Let's see. I'll give you half the price."),
  justLooking: L('Μόνο κοιτάζω, ευχαριστώ.', "I'm just looking, thanks."),
};

export const UI = {
  title: L('Ασπρόγιαλος', 'Asprogialos — a (fictional) Greek island town'),
  continue: L('Συνέχεια', 'Continue'),
  newGame: L('Νέο παιχνίδι', 'New game'),
  settings: L('Ρυθμίσεις', 'Settings'),
  map: L('Χάρτης', 'Map'),
  bag: L('Τσάντα', 'Bag'),
  phone: L('Κινητό', 'Phone'),
  lexicon: L('Λεξικό', 'Dictionary'),
  save: L('Αποθήκευση', 'Save'),
  load: L('Φόρτωση', 'Load'),
  close: L('Κλείσιμο', 'Close'),
  back: L('Πίσω', 'Back'),
  yes: L('Ναι', 'Yes'),
  no: L('Όχι', 'No'),
  talk: L('Μίλα', 'Talk'),
  enter: L('Μπες', 'Enter'),
  exit: L('Βγες', 'Go out'),
  look: L('Κοίτα', 'Look'),
  buy: L('Ψώνια', 'Shop'),
  work: L('Δουλειά', 'Work'),
  cook: L('Μαγείρεμα', 'Cook'),
  sleep: L('Ύπνος', 'Sleep'),
  wait: L('Περίμενε μια ώρα', 'Wait one hour'),
  rest: L('Ξεκούραση', 'Rest (skip days)'),
  edit: L('Διακόσμηση', 'Arrange furniture'),
  wardrobe: L('Ρούχα', 'Clothes'),
  deliveries: L('Παραδόσεις', 'Deliveries'),
  calendar: L('Ημερολόγιο', 'Calendar'),
  storage: L('Κουτί αποθήκευσης', 'Storage box'),
  money: L('Λεφτά', 'Money'),
  rentDue: L('Ενοίκιο', 'Rent'),
  owed: L('Χρωστάς', 'You owe'),
  play: L('🔊', 'Play the Greek audio'),
  slow: L('🐢', 'Play slowly'),
  showEn: L('EN', 'Show the English translation'),
  sayBye: L('Τα λέμε!', 'See you!'),
  giveGift: L('Σου έφερα κάτι.', "I've brought you something."),
  giveGiftFormal: L('Σας έφερα κάτι.', "I've brought you something."),
  eat: L('Φάε', 'Eat'),
  wear: L('Φόρεσε', 'Wear'),
  remove: L('Βγάλε', 'Take off'),
  rooms: L('Τα δωμάτια', 'The rooms'),
  viewRoom: L('Δες το δωμάτιο', 'View the room'),
  takeRoom: L('Το παίρνω!', "I'll take it!"),
  payRent: L('Πλήρωσε το ενοίκιο', 'Pay the rent owed'),
  home: L('Σπίτι μου', 'My home'),
  forRent: L('Ενοικιάζεται', 'For rent'),
};

export const GREETINGS_BY_TIME = (minuteOfDay: number): Line =>
  minuteOfDay >= 4 * 60 && minuteOfDay < 13 * 60 ? SHOP_FLOW.greetMorning : SHOP_FLOW.greetEvening;

export const WEEKDAYS: Line[] = [
  L('Δευτέρα', 'Monday'), L('Τρίτη', 'Tuesday'), L('Τετάρτη', 'Wednesday'), L('Πέμπτη', 'Thursday'),
  L('Παρασκευή', 'Friday'), L('Σάββατο', 'Saturday'), L('Κυριακή', 'Sunday'),
];

/** Month names: genitive for dates ("1 Μαΐου"), nominative for headings. */
export const MONTHS: { gen: string; nom: string; en: string }[] = [
  { gen: 'Ιανουαρίου', nom: 'Ιανουάριος', en: 'January' },
  { gen: 'Φεβρουαρίου', nom: 'Φεβρουάριος', en: 'February' },
  { gen: 'Μαρτίου', nom: 'Μάρτιος', en: 'March' },
  { gen: 'Απριλίου', nom: 'Απρίλιος', en: 'April' },
  { gen: 'Μαΐου', nom: 'Μάιος', en: 'May' },
  { gen: 'Ιουνίου', nom: 'Ιούνιος', en: 'June' },
  { gen: 'Ιουλίου', nom: 'Ιούλιος', en: 'July' },
  { gen: 'Αυγούστου', nom: 'Αύγουστος', en: 'August' },
  { gen: 'Σεπτεμβρίου', nom: 'Σεπτέμβριος', en: 'September' },
  { gen: 'Οκτωβρίου', nom: 'Οκτώβριος', en: 'October' },
  { gen: 'Νοεμβρίου', nom: 'Νοέμβριος', en: 'November' },
  { gen: 'Δεκεμβρίου', nom: 'Δεκέμβριος', en: 'December' },
];

export const SEASONS: Record<'spring' | 'summer' | 'autumn' | 'winter', Line> = {
  spring: L('Άνοιξη', 'Spring'),
  summer: L('Καλοκαίρι', 'Summer'),
  autumn: L('Φθινόπωρο', 'Autumn'),
  winter: L('Χειμώνας', 'Winter'),
};

/** Holidays shown on the calendar. M2 shows names only; descriptions come in M3 after checking sources. */
export const EVENTS = [
  { month: 4, day: 1, el: 'Πρωτομαγιά', en: 'May Day', kind: 'real' },
  { month: 5, day: 27, el: 'Γιορτή της Σαρδέλας', en: 'Sardine evening (made up for this game)', kind: 'game' },
  { month: 7, day: 15, el: 'Πανηγύρι της Παναγίας', en: 'Feast of the Virgin Mary (to be checked)', kind: 'real' },
  { month: 9, day: 28, el: 'Επέτειος του «Όχι»', en: '"Ochi" Day (to be checked)', kind: 'real' },
  { month: 11, day: 25, el: 'Χριστούγεννα', en: 'Christmas (to be checked)', kind: 'real' },
  { month: 0, day: 1, el: 'Πρωτοχρονιά', en: "New Year's Day (to be checked)", kind: 'real' },
  { month: 2, day: 2, el: 'Καθαρά Δευτέρα', en: 'Clean Monday — a movable feast, fixed on this date in the game calendar', kind: 'movable' },
  { month: 3, day: 20, el: 'Πάσχα', en: 'Easter — a movable feast, fixed on this date in the game calendar', kind: 'movable' },
];

export const VOICE_HELP = {
  none: 'No Greek voice was found, so the 🔊 buttons stay silent. You can keep playing with text. To hear Greek: open the game in Microsoft Edge, or add a Greek voice in Windows Settings › Time & language › Speech › Add voices (Greek / Ελληνικά), then restart the browser completely.',
  unsupported: 'This browser has no speech synthesis. You can keep playing with text; try Microsoft Edge or Google Chrome to hear Greek.',
  off: 'Speech is turned off in Settings (Ρυθμίσεις).',
};
