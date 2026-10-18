// 72 residents, CONTENT_PLAN §6. All fictional. Greek lines are original game text,
// NOT checked by a native speaker yet. Lines edited from CONTENT_PLAN are listed
// in PROGRESS.md (shop staff now open politely with σας, SPEC §13).

import type { DistrictId } from './shops';

export interface Line { el: string; en: string }
export interface Reply { say: Line; react: Line; gift?: string }

export interface NpcDef {
  id: string;
  name: string;
  /** Short role in Greek and English (name tag). */
  role: Line;
  district: DistrictId;
  /** true: polite plural (σας) with the player; false: casual (σου). */
  formal: boolean;
  /**
   * Look: "sex age skin hair hairStyle top bottom bottomType build acc,acc".
   * sex m/f · age y/m/o · skin 0–4 · hairStyle short|long|bun|bald|curly|pony|scarf|cropped.
   */
  look: string;
  /** Workplace (shop id): at work while it is open. */
  work?: string;
  /** Hang-out zones for morning and evening; the home door at midday break and night. */
  am: string;
  pm: string;
  /** Where they are at night instead of home (night workers). */
  night?: string;
  topic: Line;
  replies: Reply[];
}

const L = (el: string, en: string): Line => ({ el, en });
const R = (sayEl: string, sayEn: string, reactEl: string, reactEn: string, gift?: string): Reply => ({
  say: L(sayEl, sayEn), react: L(reactEl, reactEn), gift,
});

export const NPCS: NpcDef[] = [
  // ── Λιμάνι (harbour) ────────────────────────────────────────────────
  { id: 'g01', name: 'Μανώλης', role: L('ψαράς', 'fisherman'), district: 'limani', formal: false,
    look: 'm o 3 #d8d8d8 short #23395b #3b3b3b trousers broad fishercap,mustache', am: 'quay', pm: 'breakwater',
    topic: L('Σήμερα το πρωί η θάλασσα ήταν λάδι.', 'The sea was as smooth as oil this morning.'),
    replies: [
      R('Τέλεια μέρα για ψάρεμα, λοιπόν!', 'A perfect day for fishing, then!', 'Ναι! Γύρισα με γεμάτα δίχτυα.', 'Yes! I came back with full nets.'),
      R('Εγώ προτιμώ λίγο κύμα.', 'I prefer a few waves.', 'Ε, για βόλτα ίσως. Για ψάρεμα, όχι!', 'Well, for a stroll maybe. For fishing, no!'),
      R('Δεν ξέρω να ψαρεύω, για να πω την αλήθεια.', "To be honest, I don't know how to fish.", 'Δεν πειράζει. Έλα κάποιο πρωί να δεις.', 'Never mind. Come along some morning and watch.'),
    ] },
  { id: 'g02', name: 'Κατερίνα', role: L('ιχθυοπώλισσα', 'fishmonger'), district: 'limani', formal: true,
    look: 'f m 2 #3a2a1e bun #eaf2f2 #2c3e50 trousers avg apron', work: 'port_fish', am: 'quay', pm: 'agora_street',
    topic: L('Φρέσκα είναι, από το πρωί. Τι θα πάρετε;', "They're fresh, from this morning. What will you have?"),
    replies: [
      R('Τι μου προτείνετε σήμερα;', 'What do you suggest today?', 'Οι σαρδέλες είναι πολύ καλές. Για τη σχάρα!', 'The sardines are very good. For the grill!'),
      R('Μόνο κοιτάζω, ευχαριστώ.', "I'm just looking, thanks.", 'Κανένα πρόβλημα. Κοιτάξτε με την ησυχία σας.', 'No problem. Take your time.'),
      R('Δεν τρώω πολύ ψάρι, για να πω την αλήθεια.', "To be honest, I don't eat much fish.", 'Α, κρίμα! Ίσως ένα χταπόδι σας αλλάξει γνώμη.', 'Ah, pity! Maybe an octopus will change your mind.'),
    ] },
  { id: 'g03', name: 'Σταύρος', role: L('καπετάνιος', 'ship captain'), district: 'limani', formal: false,
    look: 'm o 2 #f0f0f0 short #f4f4f4 #1c2a44 trousers tall captain,beard', am: 'ferry_pier', pm: 'quay',
    topic: L('Το πλοίο για τον Πειραιά αργεί λίγο σήμερα.', 'The ferry to Piraeus is a bit late today.'),
    replies: [
      R('Πόσο θα αργήσει;', 'How late will it be?', 'Καμιά ώρα. Έχει αέρα στο ανοιχτό πέλαγος.', "About an hour. It's windy out on the open sea."),
      R('Εγώ δεν βιάζομαι. Μένω εδώ.', "I'm not in a hurry. I live here.", 'Ωραία! Τότε το πλοίο είναι για τους άλλους.', 'Nice! Then the ferry is for everybody else.'),
      R('Ταξιδεύεις κάθε μέρα με το πλοίο;', 'Do you sail every day?', 'Σχεδόν. Τριάντα χρόνια στη θάλασσα!', 'Almost. Thirty years at sea!'),
    ] },
  { id: 'g04', name: 'Ελένη', role: L('υπάλληλος εισιτηρίων', 'ticket agent'), district: 'limani', formal: true,
    look: 'f y 1 #5a3a22 long #2f6fa8 #222831 skirt slim glasses', work: 'port_tickets', am: 'agora_street', pm: 'square',
    topic: L('Αν ταξιδεύετε, κρατήστε το εισιτήριο κοντά σας.', "If you're travelling, keep your ticket close."),
    replies: [
      R('Ευχαριστώ για τη συμβουλή.', 'Thanks for the advice.', 'Παρακαλώ. Στο λιμάνι έχει πάντα κόσμο.', "You're welcome. The harbour is always busy."),
      R('Δεν ταξιδεύω. Μένω στο νησί.', "I'm not travelling. I live on the island.", 'Α, καλώς ορίσατε τότε! Θα τα λέμε.', "Ah, welcome then! We'll see each other around."),
      R('Πόσο κάνει το εισιτήριο για τον Πειραιά;', 'How much is a ticket to Piraeus?', 'Εξαρτάται από το πλοίο. Ρωτήστε με όποτε θέλετε.', 'It depends on the ship. Ask me whenever you like.'),
    ] },
  { id: 'g05', name: 'Γιάννης', role: L('υπάλληλος δεμάτων', 'parcel clerk'), district: 'limani', formal: true,
    look: 'm m 2 #2a2a2a short #e3a33b #3b3b3b trousers broad vest', work: 'port_depot', am: 'quay', pm: 'agora_street',
    topic: L('Έχω δύο δέματα για τη Χώρα. Τα παίρνετε;', "I've got two parcels for the Chora. Will you take them?"),
    replies: [
      R('Ναι, μπορώ να βοηθήσω.', 'Yes, I can help.', 'Ωραία! Δείτε τα στο κινητό σας, στις παραδόσεις.', 'Great! Look at them on your phone, under deliveries.'),
      R('Όχι τώρα, ευχαριστώ.', 'Not now, thanks.', 'Κανένα πρόβλημα. Είμαι εδώ ως τις οκτώ.', "No problem. I'm here until eight."),
      R('Είναι βαριά;', 'Are they heavy?', 'Όχι, ελαφριά. Μόνο τα σκαλιά είναι βαριά!', 'No, light. Only the steps are heavy!'),
    ] },
  { id: 'g06', name: 'Δέσποινα', role: L('διανομέας', 'courier'), district: 'limani', formal: false,
    look: 'f y 3 #1e1e1e pony #e8562f #2b2b2b shorts slim bag,cap', am: 'church_steps', pm: 'quay',
    topic: L('Από τα σκαλάκια πίσω από την εκκλησία κόβεις δρόμο.', 'The little steps behind the church are a shortcut.'),
    replies: [
      R('Ευχαριστώ, θα το θυμάμαι.', "Thanks, I'll remember that.", 'Τίποτα. Εμείς οι διανομείς ξέρουμε όλα τα μυστικά.', 'No worries. We couriers know all the secrets.'),
      R('Εγώ χάνομαι συνέχεια στα στενά.', 'I keep getting lost in the alleys.', 'Κοίτα τον χάρτη στο κινητό. Και ρώτα!', 'Check the map on your phone. And ask!'),
      R('Εγώ προτιμώ τον μεγάλο δρόμο.', 'I prefer the main road.', 'Κι εγώ, όταν δεν βιάζομαι.', "Me too, when I'm not in a hurry."),
    ] },
  { id: 'g07', name: 'Παναγιώτης', role: L('συνταξιούχος', 'pensioner'), district: 'limani', formal: false,
    look: 'm o 2 #e6e6e6 bald #8a7e6a #4b4b4b trousers short cane,mustache', am: 'square_bench', pm: 'breakwater',
    topic: L('Κάθε απόγευμα έρχομαι εδώ να δω τα καΐκια.', 'Every afternoon I come here to watch the boats.'),
    replies: [
      R('Είναι πολύ όμορφα, με τα χρώματά τους.', "They're so pretty, with their colours.", 'Έτσι είναι. Το καθένα έχει το όνομα μιας γυναίκας!', "That's right. Each one has a woman's name!"),
      R('Μπορώ να κάτσω μαζί σου λίγο;', 'May I sit with you for a bit?', 'Βέβαια! Κάθισε. Η θέα είναι δωρεάν.', 'Of course! Sit down. The view is free.'),
      R('Εγώ προτιμώ το βουνό από τη θάλασσα.', 'I prefer the mountains to the sea.', 'Ε, το νησί έχει και τα δύο. Τι τύχη!', 'Well, the island has both. What luck!'),
    ] },
  { id: 'g08', name: 'Χρυσούλα', role: L('μαστόρισσα στα δίχτυα', 'net mender'), district: 'limani', formal: false,
    look: 'f o 3 #bdbdbd scarf #4d6b3c #3a2f28 skirt short scarf', am: 'quay', pm: 'quay',
    topic: L('Αυτό το δίχτυ θέλει υπομονή. Πολλή υπομονή.', 'This net needs patience. Lots of patience.'),
    replies: [
      R('Μπορείς να μου δείξεις πώς το κάνεις;', 'Can you show me how you do it?', 'Κάθισε και κοίτα τα χέρια μου. Σιγά σιγά.', 'Sit and watch my hands. Slowly, slowly.'),
      R('Εγώ δεν έχω καθόλου υπομονή!', "I've got no patience at all!", 'Χα! Τότε μην πιάσεις ποτέ δίχτυ.', 'Ha! Then never pick up a net.'),
      R('Πόσα χρόνια κάνεις αυτή τη δουλειά;', 'How many years have you done this?', 'Από μικρό κορίτσι. Μου το έμαθε η μάνα μου.', 'Since I was a little girl. My mother taught me.'),
    ] },
  { id: 'g09', name: 'Νίκος', role: L('λάτρης της φωτογραφίας', 'photography fan'), district: 'limani', formal: false,
    look: 'm y 1 #3b2618 curly #2e7d6b #c9b48a shorts slim camera', am: 'breakwater', pm: 'lookout',
    topic: L('Το φως εδώ το απόγευμα είναι απίστευτο.', 'The light here in the afternoon is incredible.'),
    replies: [
      R('Ναι, όλα γίνονται χρυσά.', 'Yes, everything turns golden.', 'Ακριβώς! Γι’ αυτό έχω πάντα την κάμερα μαζί μου.', 'Exactly! That is why I always carry my camera.'),
      R('Εγώ βγάζω φωτογραφίες μόνο με το κινητό.', 'I only take photos with my phone.', 'Δεν πειράζει. Το μάτι μετράει, όχι η κάμερα.', "Doesn't matter. The eye counts, not the camera."),
      R('Εγώ προτιμώ το πρωινό φως.', 'I prefer the morning light.', 'Κι αυτό έχει τη χάρη του. Πιο καθαρό.', 'That has its charm too. Clearer.'),
    ] },
  { id: 'g10', name: 'Αργυρώ', role: L('περιπτερού', 'kiosk keeper'), district: 'limani', formal: true,
    look: 'f m 2 #6b3a1e curly #c2185b #33302e trousers avg glasses', work: 'port_kiosk', am: 'quay', pm: 'quay',
    topic: L('Νερό, εφημερίδα, κάρτα; Όλα τα έχει το περίπτερο.', 'Water, a newspaper, a postcard? The kiosk has it all.'),
    replies: [
      R('Πουλάτε και κάρτες με το νησί;', 'Do you sell postcards of the island too?', 'Βέβαια! Με τον μύλο, με το λιμάνι, με όλα.', 'Of course! With the windmill, the harbour, everything.'),
      R('Ανοίγετε πολύ νωρίς, έτσι δεν είναι;', "You open very early, don't you?", 'Από τις επτά. Και κλείνω τα μεσάνυχτα!', 'From seven. And I close at midnight!'),
      R('Τίποτα σήμερα, ευχαριστώ.', 'Nothing today, thanks.', 'Εντάξει. Όποτε θέλετε, εδώ είμαι.', "All right. Whenever you like, I'm here."),
    ] },
  { id: 'g11', name: 'Θανάσης', role: L('μηχανικός σκαφών', 'boat mechanic'), district: 'limani', formal: false,
    look: 'm m 3 #262626 short #3d4f63 #2f3640 trousers broad cap,beard', am: 'quay', pm: 'quay',
    topic: L('Αυτή η μηχανή είναι παλιά, αλλά δουλεύει σαν ρολόι.', 'This engine is old, but it runs like clockwork.'),
    replies: [
      R('Τα παλιά πράγματα κρατάνε πιο πολύ.', 'Old things last longer.', 'Σωστά! Αρκεί να τα φροντίζεις.', 'Right! As long as you look after them.'),
      R('Δεν καταλαβαίνω τίποτα από μηχανές.', "I don't understand a thing about engines.", 'Ούτε η μηχανή από ανθρώπους. Είμαστε πάτσι!', "Nor does the engine understand people. We're even!"),
      R('Πόσων χρονών είναι;', 'How old is it?', 'Πιο μεγάλη από μένα, νομίζω!', 'Older than me, I think!'),
    ] },
  { id: 'g12', name: 'Μαρίνα', role: L('ιδιοκτήτρια ταβέρνας', 'taverna owner'), district: 'limani', formal: true,
    look: 'f m 1 #2b1a12 bun #8e2f3c #2a2a2a skirt avg apron', work: 'port_taverna', am: 'agora_street', pm: 'quay',
    topic: L('Απόψε έχουμε φρέσκο χταπόδι στα κάρβουνα.', 'Tonight we have fresh grilled octopus.'),
    replies: [
      R('Ακούγεται υπέροχο!', 'That sounds wonderful!', 'Ελάτε το βράδυ. Θα σας κρατήσω τραπέζι δίπλα στη θάλασσα.', "Come in the evening. I'll keep you a table by the sea."),
      R('Ψάχνετε άνθρωπο για δουλειά;', 'Are you looking for someone to work?', 'Ναι, για τα βράδια. Ελάτε μετά τις επτά.', 'Yes, for the evenings. Come after seven.'),
      R('Δεν μου αρέσει πολύ το χταπόδι.', "I'm not keen on octopus.", 'Δεν πειράζει, έχουμε και σαρδέλες. Και χωριάτικη, φυσικά!', 'No matter, we have sardines too. And a village salad, of course!'),
    ] },
  { id: 'g13', name: 'Κώστας', role: L('σερβιτόρος', 'waiter'), district: 'limani', formal: true,
    look: 'm y 2 #1b1b1b short #f2f2f2 #1f1f1f trousers slim vest', work: 'port_taverna', am: 'beach', pm: 'quay',
    topic: L('Καλησπέρα! Για πόσα άτομα;', 'Good evening! For how many people?'),
    replies: [
      R('Για ένα άτομο, παρακαλώ.', 'For one, please.', 'Ελάτε από εδώ. Νερό και ψωμί έρχονται αμέσως.', 'This way, please. Water and bread are coming right away.'),
      R('Μόνο περνούσα, ευχαριστώ.', 'I was only passing by, thanks.', 'Καλή βόλτα! Όποτε θέλετε, σας περιμένουμε.', "Enjoy your walk! We're here whenever you like."),
      R('Πάντα φέρνετε νερό και ψωμί;', 'Do you always bring water and bread?', 'Πάντα! Πρώτα νερό και ψωμί, μετά η παραγγελία.', 'Always! First water and bread, then the order.'),
    ] },
  { id: 'g14', name: 'Ρένα', role: L('μαγείρισσα', 'cook'), district: 'limani', formal: false,
    look: 'f m 3 #4a2c1c scarf #f5f5f5 #3c3c3c trousers broad apron', work: 'port_taverna', am: 'agora_street', pm: 'quay',
    topic: L('Το μυστικό είναι το καλό λάδι. Τίποτα άλλο.', 'The secret is good olive oil. Nothing else.'),
    replies: [
      R('Και λίγη ρίγανη, ίσως;', 'And a little oregano, maybe?', 'Ε, ναι, και ρίγανη. Αλλά μην το πεις σε κανέναν!', "Well, yes, and oregano. But don't tell anyone!"),
      R('Εγώ μαγειρεύω πολύ απλά.', 'I cook very simply.', 'Το απλό είναι το καλύτερο. Ντομάτα, λάδι, αλάτι.', 'Simple is best. Tomato, oil, salt.'),
      R('Μπορείς να μου μάθεις μια συνταγή;', 'Can you teach me a recipe?', 'Φτιάξε μια χωριάτικη. Τη φέτα από πάνω, ολόκληρη!', 'Make a village salad. The feta on top, in one piece!'),
    ] },
  { id: 'g15', name: 'Αλέκος', role: L('ψαράς με γάτα', 'fisherman with a cat'), district: 'limani', formal: false,
    look: 'm o 3 #a0a0a0 short #5c3b2e #3f3f3f trousers avg fishercap,beard', am: 'quay', pm: 'breakwater',
    topic: L('Η γάτα μου ξέρει πότε γυρίζει η βάρκα. Δεν ξέρω πώς.', "My cat knows when the boat comes back. I don't know how."),
    replies: [
      R('Οι γάτες ξέρουν πολλά μυστικά.', 'Cats know a lot of secrets.', 'Ναι. Και τρώνε και τα καλύτερα ψάρια!', 'Yes. And they eat the best fish, too!'),
      R('Πώς τη λένε τη γάτα σου;', "What's your cat called?", 'Καπετάνισσα. Αυτή κάνει κουμάντο στη βάρκα.', "Kapetanissa — 'lady captain'. She runs the boat."),
      R('Εγώ προτιμώ τους σκύλους.', 'I prefer dogs.', 'Μην το λες δυνατά. Η Καπετάνισσα ακούει!', "Don't say it out loud. Kapetanissa is listening!"),
    ] },

  // ── Αγορά (market street) ───────────────────────────────────────────
  { id: 'g16', name: 'Βασίλης', role: L('φούρναρης', 'baker'), district: 'agora', formal: true,
    look: 'm m 1 #3d2b1f short #fafafa #6d6d6d trousers broad apron,bakerhat,mustache', work: 'agora_bakery', am: 'square', pm: 'agora_street',
    topic: L('Η τυρόπιτα βγήκε τώρα από τον φούρνο. Ζεστή ακόμα!', 'The cheese pie just came out of the oven. Still warm!'),
    replies: [
      R('Μυρίζει υπέροχα!', 'It smells wonderful!', 'Βούτυρο και φέτα. Το πρωί είναι η καλύτερη ώρα.', 'Butter and feta. Morning is the best time.'),
      R('Ξυπνάτε πολύ νωρίς για τον φούρνο;', 'Do you get up very early for the bakery?', 'Στις τέσσερις! Αν θέλετε δουλειά, ελάτε στις έξι.', 'At four! If you want work, come at six.'),
      R('Προτιμώ κάτι γλυκό το πρωί.', 'I prefer something sweet in the morning.', 'Τότε δοκιμάστε μια μπουγάτσα. Με κανέλα!', 'Then try a bougatsa. With cinnamon!'),
    ] },
  { id: 'g17', name: 'Σοφία', role: L('πωλήτρια στον φούρνο', 'bakery assistant'), district: 'agora', formal: true,
    look: 'f y 2 #7a4a26 pony #f6d7a7 #3b3b3b trousers slim apron', work: 'agora_bakery', am: 'agora_street', pm: 'beach',
    topic: L('Κουλούρι ή κάτι γλυκό; Πείτε μου.', 'A koulouri or something sweet? Tell me.'),
    replies: [
      R('Ένα κουλούρι μου φτάνει.', 'A koulouri is enough for me.', 'Απλό και καλό. Με σουσάμι, φρέσκο.', 'Simple and good. With sesame, fresh.'),
      R('Κάτι γλυκό, σίγουρα!', 'Something sweet, definitely!', 'Σας καταλαβαίνω. Η μπουγάτσα φεύγει πρώτη!', 'I understand. The bougatsa sells out first!'),
      R('Δεν ξέρω ακόμα. Κοιτάζω.', "I don't know yet. I'm looking.", 'Με την ησυχία σας. Όλα είναι του πρωινού.', "Take your time. It's all from this morning."),
    ] },
  { id: 'g18', name: 'Λευτέρης', role: L('ιδιοκτήτης καφετέριας', 'café owner'), district: 'agora', formal: true,
    look: 'm m 2 #1c1c1c cropped #1f4e8c #2b2b2b trousers tall beard', work: 'agora_cafe', am: 'quay', pm: 'square',
    topic: L('Ο φρέντο εσπρέσο θέλει καλό χτύπημα. Αυτό είναι όλο.', 'A freddo espresso needs a good shake. That is all.'),
    replies: [
      R('Μπορείτε να μου δείξετε;', 'Can you show me?', 'Ελάτε να δουλέψετε εδώ και θα μάθετε! Δύο ώρες, δεκαοκτώ ευρώ.', "Come and work here and you'll learn! Two hours, eighteen euros."),
      R('Εγώ πίνω πάντα ζεστό καφέ.', 'I always drink hot coffee.', 'Και τον Αύγουστο; Είστε γενναίος άνθρωπος!', "Even in August? You're a brave person!"),
      R('Ο φραπές είναι καλύτερος, νομίζω.', 'I think the frappé is better.', 'Α, ο φραπές είναι κλασικός. Δεν θα μαλώσουμε!', "Ah, the frappé is a classic. We won't argue!"),
    ] },
  { id: 'g19', name: 'Ιωάννα', role: L('μπαρίστα', 'barista'), district: 'agora', formal: true,
    look: 'f y 1 #c48a3a pony #263238 #263238 trousers slim apron', work: 'agora_cafe', am: 'beach', pm: 'agora_street',
    topic: L('Τον θέλετε σκέτο, μέτριο ή γλυκό;', 'Do you want it unsweetened, medium or sweet?'),
    replies: [
      R('Σκέτο, παρακαλώ.', 'No sugar, please.', 'Σκέτο, χωρίς ζάχαρη. Δυνατός καφές, μπράβο!', 'No sugar at all. A strong coffee, well done!'),
      R('Μέτριο. Λίγη ζάχαρη μόνο.', 'Medium. Just a little sugar.', 'Μέτριο, η χρυσή τομή. Ωραία επιλογή.', 'Medium, the golden mean. Nice choice.'),
      R('Γλυκό! Μου αρέσει η ζάχαρη.', 'Sweet! I like sugar.', 'Γλυκό, λοιπόν. Η ζωή θέλει και λίγη γλύκα!', 'Sweet it is. Life needs a little sweetness!'),
    ] },
  { id: 'g20', name: 'Μιχάλης', role: L('μανάβης', 'greengrocer'), district: 'agora', formal: true,
    look: 'm o 3 #9e9e9e short #6b8e23 #4a4a4a trousers broad apron,cap', work: 'agora_greengrocer', am: 'quay', pm: 'kafeneio_out',
    topic: L('Οι ντομάτες σήμερα είναι από το χωριό. Μυρίστε τες!', "Today's tomatoes are from the village. Smell them!"),
    replies: [
      R('Μυρίζουν καλοκαίρι!', 'They smell of summer!', 'Έτσι ακριβώς! Για χωριάτικη, είναι τέλειες.', 'Exactly! Perfect for a village salad.'),
      R('Είναι λίγο ακριβές, όμως.', "They're a bit expensive, though.", 'Τα καλά πράγματα κοστίζουν. Το Σάββατο στη λαϊκή είναι πιο φτηνές.', 'Good things cost. On Saturday at the street market they are cheaper.'),
      R('Δεν μου αρέσουν πολύ οι ντομάτες.', "I don't really like tomatoes.", 'Κρίμα! Έχω και κολοκυθάκια, και πατάτες, και λεμόνια.', 'Pity! I have courgettes, potatoes and lemons too.'),
    ] },
  { id: 'g21', name: 'Φωτεινή', role: L('ταμίας στο μίνι μάρκετ', 'mini-market cashier'), district: 'agora', formal: true,
    look: 'f m 0 #d9b25f long #e53935 #2e2e2e trousers avg glasses', work: 'agora_minimarket', am: 'square', pm: 'geitonia_street',
    topic: L('Αν δεν βρίσκετε κάτι, ρωτήστε με. Είναι κάπου εδώ.', "If you can't find something, ask me. It's around here somewhere."),
    replies: [
      R('Πού είναι το φύλλο κρούστας;', 'Where is the filo pastry?', 'Στο ψυγείο, δίπλα στο βούτυρο. Για πίτα;', 'In the fridge, next to the butter. For a pie?'),
      R('Ευχαριστώ, τα βρήκα όλα.', 'Thanks, I found everything.', 'Μπράβο! Σπάνιο αυτό την πρώτη φορά.', "Well done! That's rare the first time."),
      R('Έχετε ελληνικό καφέ;', 'Do you have Greek coffee?', 'Βέβαια, στο τρίτο ράφι. Για μπρίκι.', 'Of course, on the third shelf. For the briki.'),
    ] },
  { id: 'g22', name: 'Τάσος', role: L('σουβλατζής', 'souvlaki cook'), district: 'agora', formal: true,
    look: 'm m 3 #222222 short #fdfdfd #263238 trousers broad apron,mustache', work: 'agora_souvlaki', am: 'beach', pm: 'quay',
    topic: L('Πίτα με όλα; Τζατζίκι, ντομάτα, κρεμμύδι;', 'Pita with everything? Tzatziki, tomato, onion?'),
    replies: [
      R('Ναι, με όλα!', 'Yes, with everything!', 'Έτσι μπράβο! Με όλα είναι η σωστή πίτα.', "That's the way! With everything is the proper pita."),
      R('Χωρίς κρεμμύδι, παρακαλώ.', 'No onion, please.', 'Χωρίς κρεμμύδι, κανένα πρόβλημα. Με λίγες πατάτες;', 'No onion, no problem. With a few chips?'),
      R('Όχι τώρα. Θα έρθω αργότερα.', "Not now. I'll come later.", 'Είμαι εδώ ως τα μεσάνυχτα. Σας περιμένω!', "I'm here until midnight. See you then!"),
    ] },
  { id: 'g23', name: 'Ευαγγελία', role: L('ζαχαροπλάστρια', 'pastry chef'), district: 'agora', formal: true,
    look: 'f m 1 #8d5524 curly #f8bbd0 #4e342e skirt avg apron', work: 'agora_pastry', am: 'church_steps', pm: 'square',
    topic: L('Δοκιμάστε μια μπουγάτσα. Δεν θα το μετανιώσετε.', "Try a bougatsa. You won't regret it."),
    replies: [
      R('Με κρέμα ή με τυρί;', 'With custard or with cheese?', 'Η δική μου είναι με κρέμα, ζάχαρη άχνη και κανέλα.', 'Mine is with custard, icing sugar and cinnamon.'),
      R('Μου αρέσει πιο πολύ ο μπακλαβάς.', 'I like baklava more.', 'Κι αυτός φτιάχνεται εδώ, με μέλι του νησιού!', "That's made here too, with island honey!"),
      R('Δεν τρώω πολλά γλυκά.', "I don't eat many sweets.", 'Τότε μόνο μια μικρή μπουκιά. Για τη γνωριμία!', 'Then just a little bite. To get acquainted!'),
    ] },
  { id: 'g24', name: 'Ηλίας', role: L('επιπλοποιός', 'furniture maker'), district: 'agora', formal: true,
    look: 'm o 2 #bcbcbc short #795548 #3e2723 trousers tall apron,glasses', work: 'agora_furniture', am: 'kafeneio_out', pm: 'square',
    topic: L('Μετρήσατε το δωμάτιό σας; Ο καναπές είναι μεγάλος.', 'Did you measure your room? The sofa is big.'),
    replies: [
      R('Όχι ακόμα. Θα το μετρήσω.', "Not yet. I'll measure it.", 'Καλή ιδέα. Η πόρτα πρέπει να μένει ελεύθερη!', 'Good idea. The door has to stay clear!'),
      R('Το δωμάτιό μου είναι μικρό.', 'My room is small.', 'Τότε μια πολυθρόνα ή ένα πουφ. Μικρά και βολικά.', 'Then an armchair or a pouffe. Small and handy.'),
      R('Ψάχνω κάτι για το μπαλκόνι.', "I'm looking for something for the balcony.", 'Μια ψάθινη καρέκλα κι ένα τραπεζάκι. Τέλεια για καφέ.', 'A rush-seat chair and a little table. Perfect for coffee.'),
    ] },
  { id: 'g25', name: 'Άννα', role: L('βοηθός στο κατάστημα επίπλων', 'furniture shop helper'), district: 'agora', formal: true,
    look: 'f y 2 #3e2723 pony #a5d6a7 #37474f trousers slim', work: 'agora_furniture', am: 'beach', pm: 'agora_street',
    topic: L('Αν θέλετε, σας το φέρνω στο σπίτι.', "If you like, I'll bring it to your home."),
    replies: [
      R('Ευχαριστώ, πολύ ευγενικό.', "Thank you, that's very kind.", 'Τίποτα! Έτσι κάνουμε εδώ στο νησί.', "It's nothing! That's how we do it here on the island."),
      R('Το σπίτι μου έχει πολλά σκαλιά.', 'My home has a lot of steps.', 'Όλα τα σπίτια εδώ έχουν σκαλιά! Το έχω συνηθίσει.', "Every house here has steps! I'm used to it."),
      R('Θα το πάω εγώ, ευχαριστώ.', "I'll carry it myself, thanks.", 'Όπως θέλετε. Προσοχή στις στροφές!', 'As you wish. Careful on the corners!'),
    ] },
  { id: 'g26', name: 'Ζωή', role: L('ιδιοκτήτρια ρούχων', 'clothes shop owner'), district: 'agora', formal: true,
    look: 'f m 1 #111111 long #ffffff #1565c0 skirt slim glasses,bag', work: 'agora_clothes', am: 'square', pm: 'lookout',
    topic: L('Αυτό το χρώμα σας πάει πολύ.', 'That colour really suits you.'),
    replies: [
      R('Ευχαριστώ! Μου αρέσει το μπλε.', 'Thank you! I like blue.', 'Το μπλε του νησιού! Είναι παντού εδώ.', "The island's blue! It's everywhere here."),
      R('Ψάχνω κάτι για τη θάλασσα.', "I'm looking for something for the beach.", 'Έχουμε μαγιό, σορτς και ψάθινα καπέλα.', 'We have swimwear, shorts and straw hats.'),
      R('Μόνο κοιτάζω σήμερα.', "I'm just looking today.", 'Βέβαια. Ο καθρέφτης είναι εκεί, δοκιμάστε ελεύθερα.', 'Of course. The mirror is over there; try things on freely.'),
    ] },
  { id: 'g27', name: 'Στέλιος', role: L('ανθοπώλης', 'florist'), district: 'agora', formal: true,
    look: 'm y 2 #5d4037 curly #81c784 #5d4037 trousers slim apron', work: 'agora_florist', am: 'geitonia_garden', pm: 'chapel',
    topic: L('Ένας βασιλικός στο μπαλκόνι, και το σπίτι αλλάζει.', 'One basil plant on the balcony and the home changes.'),
    replies: [
      R('Μυρίζει τόσο ωραία ο βασιλικός!', 'Basil smells so good!', 'Ναι! Και λένε ότι κρατάει μακριά τα κουνούπια.', 'Yes! And they say it keeps mosquitoes away.'),
      R('Δεν έχω μπαλκόνι, δυστυχώς.', "I don't have a balcony, unfortunately.", 'Τότε στο παράθυρο! Ο βασιλικός δεν είναι δύσκολος.', "Then on the window sill! Basil isn't difficult."),
      R('Μου αρέσουν πιο πολύ τα γεράνια.', 'I like geraniums more.', 'Ωραία επιλογή. Αντέχουν πολύ τον ήλιο.', 'Nice choice. They cope well with the sun.'),
    ] },
  { id: 'g28', name: 'Λίνα', role: L('πωλήτρια ειδών σπιτιού', 'homeware seller'), district: 'agora', formal: true,
    look: 'f m 2 #6d4c41 bun #ffab91 #4e342e skirt avg', work: 'agora_home', am: 'kafeneio_out', pm: 'square',
    topic: L('Τα κεραμικά αυτά τα φτιάχνει μια κυρία από το νησί.', 'A lady from the island makes these ceramics.'),
    replies: [
      R('Είναι πανέμορφα!', "They're beautiful!", 'Θα της το πω. Θα χαρεί πολύ.', "I'll tell her. She'll be very pleased."),
      R('Τι είναι αυτό το μπλε μάτι;', 'What is this blue eye?', 'Το ματάκι. Λένε ότι προστατεύει από το κακό μάτι.', "The 'mataki'. They say it protects you from the evil eye."),
      R('Ψάχνω κάτι για τον τοίχο.', "I'm looking for something for the wall.", 'Ένα πιάτο ή ένας πίνακας με καΐκι; Έχουμε πολλά.', 'A plate or a painting of a caique? We have plenty.'),
    ] },
  { id: 'g29', name: 'Πέτρος', role: L('χασάπης', 'butcher'), district: 'agora', formal: true,
    look: 'm m 3 #2b2b2b short #ffffff #5d4037 trousers broad apron', work: 'agora_butcher', am: 'quay', pm: 'kafeneio_out',
    topic: L('Για σουβλάκι θέλετε χοιρινό. Πόσο να σας βάλω;', 'For souvlaki you want pork. How much shall I give you?'),
    replies: [
      R('Λίγο, για δύο σουβλάκια.', 'A little, for two souvlakia.', 'Σωστά. Κομματάκια, και λίγη ρίγανη!', 'Right. Small pieces, and a little oregano!'),
      R('Δεν τρώω κρέας.', "I don't eat meat.", 'Κανένα πρόβλημα! Οι κολοκυθοκεφτέδες είναι εξίσου νόστιμοι.', 'No problem! Courgette fritters are just as tasty.'),
      R('Δεν ξέρω ακόμα. Το σκέφτομαι.', "I don't know yet. I'm thinking about it.", 'Σκεφτείτε το με την ησυχία σας. Δεν βιαζόμαστε.', "Think it over. There's no rush."),
    ] },
  { id: 'g30', name: 'Μαρία', role: L('τυροπώλισσα', 'cheese seller'), district: 'agora', formal: true,
    look: 'f o 2 #e0e0e0 bun #fff3e0 #6d4c41 skirt short apron', work: 'agora_cheese', am: 'church_steps', pm: 'geitonia_street',
    topic: L('Αυτή η φέτα είναι από πρόβειο γάλα. Δοκιμάστε.', "This feta is made from sheep's milk. Have a taste."),
    replies: [
      R('Πολύ νόστιμη! Λίγο αλμυρή.', 'Very tasty! A little salty.', 'Έτσι είναι η καλή φέτα. Θέλει και ένα ποτήρι νερό!', "That's good feta for you. It wants a glass of water too!"),
      R('Ποια είναι καλή για σαλάτα;', 'Which one is good for a salad?', 'Αυτή εδώ. Βάλτε την ολόκληρη πάνω στη χωριάτικη.', 'This one. Put it whole on top of the village salad.'),
      R('Δεν μου αρέσει πολύ το τυρί.', "I'm not a big fan of cheese.", 'Σπάνιο αυτό στην Ελλάδα! Αλλά δεν πειράζει.', "That's rare in Greece! But never mind."),
    ] },
  { id: 'g31', name: 'Αντώνης', role: L('θαμώνας της καφετέριας', 'café regular'), district: 'agora', formal: false,
    look: 'm o 2 #d0d0d0 short #9e9d24 #424242 trousers avg glasses,mustache', am: 'cafe_table', pm: 'kafeneio_out',
    topic: L('Κάθε πρωί, ίδιο τραπέζι, ίδιος καφές.', 'Every morning, same table, same coffee.'),
    replies: [
      R('Σε καταλαβαίνω. Μου αρέσει η ρουτίνα.', 'I get it. I like routine.', 'Ε, βέβαια. Έτσι ξεκινάει καλά η μέρα.', "Well, of course. That's how the day starts well."),
      R('Εγώ προτιμώ να αλλάζω καφέ.', 'I prefer to change my coffee.', 'Κι αυτό ωραίο. Τι πίνεις σήμερα;', "That's nice too. What are you having today?"),
      R('Δεν πίνω πολύ καφέ, για να πω την αλήθεια.', "To be honest, I don't drink much coffee.", 'Α, δεν πειράζει! Έχει και χυμό εδώ.', "Ah, that's fine! They have juice here too."),
    ] },

  // ── Χώρα (old town & square) ────────────────────────────────────────
  { id: 'g32', name: 'Γεωργία', role: L('καφετζού', 'coffeehouse keeper'), district: 'chora', formal: true,
    look: 'f o 1 #cfcfcf bun #37474f #212121 skirt avg apron', work: 'chora_kafeneio', am: 'church_steps', pm: 'square',
    topic: L('Ελληνικό καφέ; Τον φτιάχνω στο μπρίκι, όπως παλιά.', 'Greek coffee? I make it in the briki, the old way.'),
    replies: [
      R('Ναι, έναν μέτριο, παρακαλώ.', 'Yes, a medium-sweet one, please.', 'Αμέσως. Με καϊμάκι, όπως πρέπει.', 'Right away. With foam on top, as it should be.'),
      R('Πώς βγαίνει το καϊμάκι;', 'How do you get the foam?', 'Σιγανή φωτιά και υπομονή. Μόλις ανέβει, το βγάζεις.', 'Low heat and patience. As soon as it rises, you take it off.'),
      R('Όχι καφέ σήμερα. Ίσως ένα νερό.', 'No coffee today. Maybe a water.', 'Βέβαια. Το νερό είναι πάντα κερασμένο εδώ.', 'Of course. Water is always on the house here.'),
    ] },
  { id: 'g33', name: 'Μπάμπης', role: L('παίκτης τάβλι', 'backgammon player'), district: 'chora', formal: false,
    look: 'm o 3 #f5f5f5 bald #5d4037 #3e2723 trousers broad mustache,cap', am: 'kafeneio_in', pm: 'kafeneio_out',
    topic: L('Παίζεις τάβλι; Κάθισε, θα σου μάθω.', "Do you play backgammon? Sit down, I'll teach you."),
    replies: [
      R('Ναι, αλλά παίζω πολύ άσχημα!', 'Yes, but I play really badly!', 'Τέλεια! Μου αρέσει να κερδίζω.', 'Perfect! I like winning.'),
      R('Όχι, δεν ξέρω. Μου μαθαίνεις;', "No, I don't know how. Will you teach me?", 'Με χαρά! Πρώτα τα πούλια, μετά τα ζάρια.', 'Gladly! First the pieces, then the dice.'),
      R('Ίσως άλλη φορά.', 'Maybe another time.', 'Το τάβλι δεν φεύγει. Ούτε κι εγώ!', "The board isn't going anywhere. Neither am I!"),
    ] },
  { id: 'g34', name: 'Θοδωρής', role: L('φίλος του τάβλι', 'backgammon friend'), district: 'chora', formal: false,
    look: 'm o 2 #8d8d8d short #1e88e5 #37474f trousers short glasses', am: 'kafeneio_in', pm: 'kafeneio_out',
    topic: L('Πάλι κέρδισε ο Μπάμπης. Πάλι!', 'Babis won again. Again!'),
    replies: [
      R('Ίσως την επόμενη φορά κερδίσεις εσύ.', "Maybe next time you'll win.", 'Το λέω αυτό εδώ και είκοσι χρόνια!', "I've been saying that for twenty years!"),
      R('Μήπως κλέβει;', 'Maybe he cheats?', 'Σσσ! Το σκέφτομαι κι εγώ, αλλά δεν το λέω.', "Shh! I think so too, but I don't say it."),
      R('Εγώ δεν παίζω τάβλι.', "I don't play backgammon.", 'Καλά κάνεις. Γλιτώνεις τα νεύρα σου!', "Good for you. You save your nerves!"),
    ] },
  { id: 'g35', name: 'π. Νικόλαος', role: L('ιερέας της ενορίας', 'parish priest'), district: 'chora', formal: false,
    look: 'm o 2 #9e9e9e short #111111 #111111 robe tall beard,kalimavki', work: 'chora_church', am: 'square', pm: 'square_bench',
    topic: L('Η καμπάνα χτυπάει κάθε Κυριακή πρωί.', 'The bell rings every Sunday morning.'),
    replies: [
      R('Την ακούω από το σπίτι μου.', 'I can hear it from my home.', 'Ωραία. Έτσι ξέρεις ότι ήρθε η Κυριακή.', 'Good. That way you know Sunday has come.'),
      R('Η εκκλησία είναι πολύ όμορφη.', 'The church is very beautiful.', 'Είναι παλιά, από το 1850. Έλα να δεις μέσα κάποια μέρα.', "It's old, from 1850. Come and see inside some day."),
      R('Ακούγεται πολύ δυνατά!', 'It sounds very loud!', 'Ε, αυτή είναι η δουλειά της. Να ξυπνάει όλη τη Χώρα!', "Well, that's its job. To wake up the whole Chora!"),
    ] },
  { id: 'g36', name: 'Ευτυχία', role: L('γυναίκα με τα γεράνια', 'woman with the geraniums'), district: 'chora', formal: false,
    look: 'f o 1 #bdbdbd bun #ad1457 #4a148c skirt short', am: 'chora_alley', pm: 'chora_alley',
    topic: L('Τα γεράνια μου θέλουν νερό κάθε απόγευμα.', 'My geraniums need water every afternoon.'),
    replies: [
      R('Είναι πανέμορφα, τόσα χρώματα!', 'They are beautiful, so many colours!', 'Ευχαριστώ! Τα έχω είκοσι χρόνια, σαν παιδιά μου.', "Thank you! I've had them twenty years, like my children."),
      R('Κι εγώ θέλω να βάλω λουλούδια.', 'I want to put out flowers too.', 'Ξεκίνα με ένα γεράνι. Δεν θα σε προδώσει.', "Start with a geranium. It won't let you down."),
      R('Εγώ ξεχνάω πάντα να ποτίζω.', 'I always forget to water.', 'Ε, τότε πάρε έναν κάκτο! Χα χα.', 'Well, then get a cactus! Ha ha.'),
    ] },
  { id: 'g37', name: 'Άρης', role: L('δάσκαλος', 'primary teacher'), district: 'chora', formal: false,
    look: 'm m 1 #4e342e short #4caf50 #3e2723 trousers avg glasses,bag', am: 'square', pm: 'beach',
    topic: L('Το σχολείο κλείνει νωρίς σήμερα. Τα παιδιά χάρηκαν!', 'School closes early today. The kids were happy!'),
    replies: [
      R('Κι εσύ χάρηκες, νομίζω!', 'And you were happy too, I think!', 'Λίγο, ναι. Μην το πεις στον διευθυντή!', "A little, yes. Don't tell the head teacher!"),
      R('Τι μαθαίνουν τα παιδιά τώρα;', 'What are the kids learning now?', 'Την ιστορία του νησιού. Τους αρέσουν οι πειρατές!', "The island's history. They love the pirates!"),
      R('Εγώ μαθαίνω ακόμα ελληνικά.', "I'm still learning Greek.", 'Μπράβο! Μιλάς ήδη καλά. Σιγά σιγά!', 'Well done! You already speak well. Step by step!'),
    ] },
  { id: 'g38', name: 'Βούλα', role: L('υπάλληλος ταχυδρομείου', 'post office clerk'), district: 'chora', formal: true,
    look: 'f m 2 #3e2723 cropped #fdd835 #37474f trousers avg glasses', work: 'chora_post', am: 'agora_street', pm: 'geitonia_street',
    topic: L('Για γράμμα ή για δέμα; Πάρτε χαρτάκι από το μηχάνημα.', 'For a letter or a parcel? Take a ticket from the machine.'),
    replies: [
      R('Για γράμμα. Πόσο κάνει το γραμματόσημο;', 'For a letter. How much is a stamp?', 'Εξαρτάται πού πάει. Ελάτε στο γκισέ.', 'It depends where it goes. Come to the counter.'),
      R('Μόνο ρωτάω πού είναι το κουτί.', "I'm only asking where the post box is.", 'Το κίτρινο κουτί είναι έξω, δίπλα στην πόρτα.', 'The yellow box is outside, next to the door.'),
      R('Έχει πολλή ουρά σήμερα;', 'Is there a long queue today?', 'Μπα, ησυχία. Το πρωί της Δευτέρας είναι το δύσκολο.', 'Nah, quiet. Monday morning is the hard one.'),
    ] },
  { id: 'g39', name: 'Σπύρος', role: L('φαρμακοποιός', 'pharmacist'), district: 'chora', formal: true,
    look: 'm m 0 #5d4037 short #ffffff #455a64 trousers tall glasses', work: 'chora_pharmacy', am: 'kafeneio_out', pm: 'lookout',
    topic: L('Αν σας πείραξε ο ήλιος, φορέστε καπέλο.', "If the sun's bothering you, wear a hat."),
    replies: [
      R('Ναι, σήμερα καίει πολύ.', "Yes, it's scorching today.", 'Και πίνετε νερό. Πολύ νερό!', 'And drink water. Lots of water!'),
      R('Έχετε αντηλιακό;', 'Do you have sunscreen?', 'Βέβαια, εδώ στο ράφι. Ο ήλιος του νησιού δεν αστειεύεται.', "Of course, here on the shelf. The island sun is no joke."),
      R('Είμαι καλά, ευχαριστώ.', "I'm fine, thanks.", 'Ωραία! Πάντα έτσι.', 'Good! May it always be so.'),
    ] },
  { id: 'g40', name: 'Δήμητρα', role: L('υπάλληλος του δήμου', 'town office clerk'), district: 'chora', formal: true,
    look: 'f m 1 #212121 long #7e57c2 #263238 skirt avg', work: 'chora_townhall', am: 'cafe_terrace', pm: 'square',
    topic: L('Το πανηγύρι του Αυγούστου θέλει πολλή προετοιμασία.', 'The August festival takes a lot of preparation.'),
    replies: [
      R('Μπορώ να βοηθήσω κι εγώ;', 'Can I help too?', 'Θα χαρούμε πολύ! Ελάτε τον Αύγουστο να σας πω.', "We'd be delighted! Come in August and I'll tell you."),
      R('Τι γίνεται στο πανηγύρι;', 'What happens at the festival?', 'Μουσική, χορός και φαγητό στην πλατεία. Όλο το βράδυ!', 'Music, dancing and food in the square. All night long!'),
      R('Ακούγεται κουραστικό!', 'Sounds tiring!', 'Είναι! Αλλά μετά χορεύουμε όλοι μαζί.', 'It is! But afterwards we all dance together.'),
    ] },
  { id: 'g41', name: 'Λευτερία', role: L('ζωγράφος', 'painter'), district: 'chora', formal: false,
    look: 'f y 1 #ff7043 curly #eceff1 #1e88e5 trousers slim scarf', am: 'chora_alley', pm: 'lookout',
    topic: L('Το μπλε στις πόρτες εδώ έχει κάθε φορά άλλη απόχρωση.', 'The blue on the doors here is a different shade every time.'),
    replies: [
      R('Ποιο μπλε σου αρέσει πιο πολύ;', 'Which blue do you like best?', 'Το σκούρο, σαν τη θάλασσα το βράδυ.', 'The dark one, like the sea at night.'),
      R('Εγώ θα έβαζα πράσινο!', "I'd go for green!", 'Υπάρχουν και πράσινες πόρτες. Αλλά λίγες!', 'There are green doors too. But not many!'),
      R('Δεν το είχα προσέξει.', "I hadn't noticed.", 'Κοίτα από κοντά. Καμία πόρτα δεν είναι ίδια.', 'Look closely. No two doors are the same.'),
    ] },
  { id: 'g42', name: 'Φίλιππος', role: L('μπουζουξής', 'bouzouki player'), district: 'chora', formal: false,
    look: 'm m 3 #1b1b1b curly #212121 #3e2723 trousers slim beard', am: 'geitonia_street', pm: 'square',
    topic: L('Το βράδυ θα παίξω λίγο στην πλατεία. Έλα.', "Tonight I'll play a bit in the square. Come along."),
    replies: [
      R('Θα έρθω σίγουρα!', "I'll definitely come!", 'Ωραία! Φέρε και φίλους.', 'Great! Bring friends too.'),
      R('Τι τραγούδια παίζεις;', 'What songs do you play?', 'Νησιώτικα, κυρίως. Και λίγο ρεμπέτικο.', 'Island songs mostly. And a little rebetiko.'),
      R('Δεν μπορώ απόψε, δυστυχώς.', "I can't tonight, unfortunately.", 'Κανένα πρόβλημα. Παίζω σχεδόν κάθε βράδυ.', 'No problem. I play almost every night.'),
    ] },
  { id: 'g43', name: 'Ευανθία', role: L('ιδιοκτήτρια ξενώνα', 'guesthouse owner'), district: 'chora', formal: true,
    look: 'f m 2 #6d4c41 bun #4fc3f7 #ffffff skirt avg', work: 'chora_guesthouse', am: 'agora_street', pm: 'church_steps',
    topic: L('Το καλοκαίρι γεμίζουμε. Τώρα έχει ησυχία.', "In summer we're full. Now it's quiet."),
    replies: [
      R('Εμένα μου αρέσει η ησυχία.', 'I like the quiet.', 'Κι εμένα, να σας πω την αλήθεια!', 'Me too, to tell you the truth!'),
      R('Έρχεται πολύς κόσμος τον Αύγουστο;', 'Do many people come in August?', 'Πάρα πολύς! Για το πανηγύρι, όλα τα δωμάτια είναι γεμάτα.', 'Loads! For the festival every room is full.'),
      R('Ο ξενώνας σας είναι πολύ όμορφος.', 'Your guesthouse is very pretty.', 'Ευχαριστώ! Τον έβαψα μόνη μου, λευκό και μπλε.', 'Thank you! I painted it myself, white and blue.'),
    ] },
  { id: 'g44', name: 'Λάμπρος', role: L('κουρέας', 'barber'), district: 'chora', formal: true,
    look: 'm m 2 #000000 cropped #b0bec5 #263238 trousers avg mustache', work: 'chora_barber', am: 'kafeneio_out', pm: 'quay',
    topic: L('Λίγο κοντά στο πλάι; Ή όπως πάντα;', 'A bit short at the sides? Or the usual?'),
    replies: [
      R('Όπως πάντα, παρακαλώ.', 'The usual, please.', 'Πρώτη φορά σας βλέπω! Αλλά εντάξει, θα μαντέψω.', "It's the first time I've seen you! But fine, I'll guess."),
      R('Μόνο λίγο, για φρεσκάρισμα.', 'Just a little, to freshen up.', 'Ένα φρεσκάρισμα, λοιπόν. Καθίστε.', 'A freshen-up, then. Have a seat.'),
      R('Όχι σήμερα, ευχαριστώ.', 'Not today, thanks.', 'Όποτε θέλετε. Εδώ είμαι, με το ψαλίδι.', "Whenever you like. I'm here, with my scissors."),
    ] },
  { id: 'g45', name: 'Ροδάνθη', role: L('βιβλιοπώλισσα', 'bookseller'), district: 'chora', formal: true,
    look: 'f m 0 #a1887f long #8d6e63 #3e2723 skirt slim glasses,scarf', work: 'chora_books', am: 'cafe_terrace', pm: 'lookout',
    topic: L('Έχουμε και βιβλία στα αγγλικά, αν θέλετε.', 'We also have books in English, if you like.'),
    replies: [
      R('Ψάχνω ένα εύκολο βιβλίο στα ελληνικά.', "I'm looking for an easy book in Greek.", 'Έχω παιδικά βιβλία με εικόνες. Μη γελάτε, βοηθάνε πολύ!', "I have children's picture books. Don't laugh, they help a lot!"),
      R('Έχετε βιβλία για την ιστορία του νησιού;', "Do you have books on the island's history?", 'Ένα μικρό, με παλιές φωτογραφίες. Είναι εκεί.', "A small one, with old photos. It's over there."),
      R('Μου αρέσει να διαβάζω στην παραλία.', 'I like reading on the beach.', 'Τότε πάρτε κάτι ελαφρύ. Και αντηλιακό!', 'Then take something light. And sunscreen!'),
    ] },

  // ── Γειτονιά (neighbourhood) ────────────────────────────────────────
  { id: 'g46', name: 'Ουρανία', role: L('σπιτονοικοκυρά', 'landlady'), district: 'geitonia', formal: true,
    look: 'f o 2 #9e9e9e bun #5c6bc0 #37474f skirt avg glasses,bag', work: 'home_office', am: 'kafeneio_out', pm: 'geitonia_street',
    topic: L('Θέλετε να δείτε το δωμάτιο; Έχω τα κλειδιά εδώ.', 'Would you like to see the room? I have the keys here.'),
    replies: [
      R('Ναι, θέλω να δω τα δωμάτια.', "Yes, I'd like to see the rooms.", 'Ωραία. Έχω τέσσερα. Διαλέξτε με την ησυχία σας.', 'Good. I have four. Choose in your own time.'),
      R('Υπάρχει δωμάτιο με μπαλκόνι;', 'Is there a room with a balcony?', 'Ναι, εδώ στη γειτονιά. Βλέπει θάλασσα!', 'Yes, here in the neighbourhood. It looks out over the sea!'),
      R('Πόσο είναι το ενοίκιο;', 'How much is the rent?', 'Από διακόσια είκοσι ως τετρακόσια είκοσι τον μήνα.', 'From two hundred and twenty to four hundred and twenty a month.'),
    ] },
  { id: 'g47', name: 'Χρήστος', role: L('ιδιοκτήτης κτιρίου', 'building owner'), district: 'geitonia', formal: true,
    look: 'm o 1 #e0e0e0 short #6d4c41 #3e2723 trousers broad glasses', am: 'kafeneio_out', pm: 'geitonia_street',
    topic: L('Αν χαλάσει κάτι, πάρτε με τηλέφωνο.', 'If anything breaks, give me a call.'),
    replies: [
      R('Ευχαριστώ, θα το θυμάμαι.', "Thanks, I'll remember that.", 'Και μην ανησυχείτε. Ο Ζήσης τα φτιάχνει όλα.', "And don't worry. Zisis fixes everything."),
      R('Η βρύση στάζει λίγο.', 'The tap drips a little.', 'Α, πάλι; Θα περάσω αύριο το πρωί.', "Oh, again? I'll drop by tomorrow morning."),
      R('Όλα είναι εντάξει μέχρι τώρα.', 'Everything is fine so far.', 'Πολύ ωραία. Έτσι να συνεχίσει!', 'Very good. May it stay that way!'),
    ] },
  { id: 'g48', name: 'Μελίνα', role: L('γειτόνισσα', 'neighbour'), district: 'geitonia', formal: false,
    look: 'f y 2 #4e342e long #ffb74d #3949ab trousers slim bag', am: 'geitonia_street', pm: 'agora_street',
    topic: L('Καλώς ήρθες στη γειτονιά! Μένω δίπλα.', 'Welcome to the neighbourhood! I live next door.'),
    replies: [
      R('Ευχαριστώ! Χαίρομαι πολύ.', "Thank you! I'm very glad.", 'Κι εγώ! Αν χρειαστείς κάτι, χτύπα την πόρτα.', 'Me too! If you need anything, knock on the door.'),
      R('Είναι ήσυχη η γειτονιά;', 'Is the neighbourhood quiet?', 'Πολύ. Μόνο οι γάτες κάνουν φασαρία το βράδυ!', 'Very. Only the cats make a racket at night!'),
      R('Πού να ψωνίσω φρούτα και λαχανικά;', 'Where should I buy fruit and vegetables?', 'Στο μανάβικο της αγοράς. Ή το Σάββατο στη λαϊκή!', 'At the greengrocer on the market street. Or on Saturday at the street market!'),
    ] },
  { id: 'g49', name: 'Τάκης', role: L('μερακλής μάγειρας', 'keen home cook'), district: 'geitonia', formal: false,
    look: 'm m 2 #616161 short #ef6c00 #424242 trousers broad apron,mustache', am: 'geitonia_street', pm: 'geitonia_garden',
    topic: L('Έφτιαξα γεμιστά. Πολλά. Θέλεις λίγα;', 'I made stuffed vegetables. Lots. Want some?'),
    replies: [
      R('Ναι, ευχαριστώ πολύ!', 'Yes, thank you very much!', 'Ορίστε ένα πιατάκι. Μετά να μου πεις τη γνώμη σου!', 'Here is a little plate. Tell me what you think afterwards!', 'dish:r07'),
      R('Τι βάζεις μέσα;', 'What do you put inside?', 'Ρύζι, μυρωδικά και πολύ λάδι. Και μια πατάτα στο πλάι.', 'Rice, herbs and lots of oil. And a potato on the side.'),
      R('Όχι, ευχαριστώ. Μόλις έφαγα.', "No, thanks. I've just eaten.", 'Κρίμα! Τότε αύριο. Θα έχουν μείνει, πίστεψέ με.', "Pity! Tomorrow, then. There'll be some left, believe me."),
    ] },
  { id: 'g50', name: 'Νεφέλη', role: L('φοιτήτρια', 'university student'), district: 'geitonia', formal: false,
    look: 'f y 1 #3e2723 pony #ce93d8 #1a237e shorts slim bag,glasses', am: 'cafe_terrace', pm: 'beach',
    topic: L('Διαβάζω για εξετάσεις. Μετά, θάλασσα!', "I'm studying for exams. After that, the sea!"),
    replies: [
      R('Καλή επιτυχία!', 'Good luck!', 'Ευχαριστώ! Θα τη χρειαστώ.', "Thanks! I'll need it."),
      R('Τι σπουδάζεις;', 'What are you studying?', 'Βιολογία. Θέλω να μελετάω τα ψάρια του Αιγαίου.', 'Biology. I want to study the fish of the Aegean.'),
      R('Κι εγώ προτιμώ τη θάλασσα από τα βιβλία.', 'I prefer the sea to books too.', 'Μη μου το λες! Δεν θα διαβάσω τίποτα τώρα.', "Don't tell me that! Now I won't study a thing."),
    ] },
  { id: 'g51', name: 'Γρηγόρης', role: L('νυχτοφύλακας στο λιμάνι', 'night watchman at the harbour'), district: 'geitonia', formal: false,
    look: 'm m 2 #424242 short #283593 #212121 trousers broad cap', am: 'geitonia_street', pm: 'geitonia_street', night: 'quay',
    topic: L('Δουλεύω νύχτα. Τώρα για μένα είναι «πρωί».', 'I work nights. For me it\'s "morning" now.'),
    replies: [
      R('Καλημέρα τότε!', 'Good morning, then!', 'Χα! Καλημέρα και σε σένα. Ή μήπως καληνύχτα;', 'Ha! Good morning to you too. Or is it good night?'),
      R('Δεν είναι κουραστικό;', "Isn't it tiring?", 'Λίγο. Αλλά το λιμάνι τη νύχτα έχει πολλή ησυχία.', 'A bit. But the harbour at night is very peaceful.'),
      R('Πήγαινε να ξεκουραστείς!', 'Go and get some rest!', 'Αυτό θα κάνω. Μετά τον καφέ!', "That's what I'll do. After my coffee!"),
    ] },
  { id: 'g52', name: 'Αθηνά', role: L('κηπουρός της γειτονιάς', 'neighbourhood gardener'), district: 'geitonia', formal: false,
    look: 'f m 3 #5d4037 scarf #8bc34a #6d4c41 trousers avg strawhat', am: 'geitonia_garden', pm: 'geitonia_garden',
    topic: L('Η ντοματιά μου έβγαλε επιτέλους ντομάτες!', 'My tomato plant has finally produced tomatoes!'),
    replies: [
      R('Συγχαρητήρια! Πόσες έβγαλε;', 'Congratulations! How many?', 'Τρεις. Μικρές, αλλά δικές μου!', 'Three. Small, but mine!'),
      R('Κι εγώ θέλω να φυτέψω κάτι.', 'I want to plant something too.', 'Ξεκίνα με βασιλικό. Είναι εύκολος.', "Start with basil. It's easy."),
      R('Εγώ τις αγοράζω στη λαϊκή.', 'I buy mine at the street market.', 'Κι εγώ, μέχρι σήμερα! Από αύριο, όχι πια.', 'So did I, until today! From tomorrow, not any more.'),
    ] },
  { id: 'g53', name: 'Μάρκος', role: L('ποδηλάτης', 'cyclist'), district: 'geitonia', formal: false,
    look: 'm y 2 #6d4c41 cropped #00bcd4 #212121 shorts slim cap', am: 'mills_road', pm: 'geitonia_street',
    topic: L('Η ανηφόρα για τον μύλο με κουράζει κάθε φορά.', 'The climb to the windmill wears me out every time.'),
    replies: [
      R('Εγώ ανεβαίνω με τα πόδια.', 'I walk up.', 'Ακόμα πιο δύσκολο! Μπράβο σου.', 'Even harder! Good for you.'),
      R('Η θέα από πάνω αξίζει όμως.', 'The view from the top is worth it, though.', 'Αυτό λέω κι εγώ. Μετά την ανηφόρα, όλα είναι ωραία.', "That's what I say too. After the climb, everything is lovely."),
      R('Γιατί δεν παίρνεις ηλεκτρικό ποδήλατο;', "Why don't you get an e-bike?", 'Ποτέ! Θέλω να ιδρώνω τίμια.', 'Never! I want to sweat honestly.'),
    ] },
  { id: 'g54', name: 'Ξανθή', role: L('φίλη των γατών', 'friend of the cats'), district: 'geitonia', formal: false,
    look: 'f m 0 #f0d58c long #f48fb1 #5d4037 skirt avg bag', am: 'geitonia_garden', pm: 'geitonia_street',
    topic: L('Αυτές οι γάτες δεν είναι δικές μου. Αλλά και λίγο δικές μου.', "These cats aren't mine. But they're a little bit mine too."),
    replies: [
      R('Πόσες γάτες είναι;', 'How many cats are there?', 'Επτά. Ή οκτώ. Αλλάζει κάθε μέρα!', 'Seven. Or eight. It changes every day!'),
      R('Κι εγώ λατρεύω τις γάτες.', 'I love cats too.', 'Τότε θα γίνουμε φίλοι. Αυτή η άσπρη σε συμπάθησε ήδη.', "Then we'll be friends. That white one likes you already."),
      R('Εγώ φοβάμαι λίγο τις γάτες.', "I'm a little afraid of cats.", 'Μη φοβάσαι. Αυτές φοβούνται πιο πολύ από σένα.', "Don't be. They're more afraid than you are."),
    ] },
  { id: 'g55', name: 'Ορέστης', role: L('καινούργιος στο νησί', 'newcomer to the island'), district: 'geitonia', formal: false,
    look: 'm y 0 #c0a060 short #90a4ae #263238 trousers tall bag', am: 'chora_alley', pm: 'geitonia_street',
    topic: L('Ακόμα χάνομαι στα στενά. Όλα μοιάζουν ίδια!', 'I still get lost in the alleys. They all look the same!'),
    replies: [
      R('Κι εγώ! Όλα είναι άσπρα και μπλε.', "Me too! It's all white and blue.", 'Ακριβώς! Ευτυχώς υπάρχει ο χάρτης στο κινητό.', "Exactly! Luckily there's the map on the phone."),
      R('Κοίτα τα καμπαναριά. Βοηθάνε.', 'Look for the bell towers. They help.', 'Καλή ιδέα! Θα το δοκιμάσω.', "Good idea! I'll try that."),
      R('Πότε ήρθες στο νησί;', 'When did you come to the island?', 'Τον Μάρτιο. Κι εσύ; Μάλλον τώρα, ε;', 'In March. And you? Just now, I guess?'),
    ] },
  { id: 'g56', name: 'Πολυξένη', role: L('πλέκει όλη μέρα', 'keen knitter'), district: 'geitonia', formal: false,
    look: 'f o 2 #e0e0e0 bun #4db6ac #455a64 skirt short glasses', am: 'geitonia_street', pm: 'geitonia_street',
    topic: L('Πλέκω ένα κασκόλ. Ο χειμώνας εδώ έχει αέρα.', "I'm knitting a scarf. Winter here is windy."),
    replies: [
      R('Τι ωραίο χρώμα!', 'What a lovely colour!', 'Μπλε, φυσικά. Για τον εγγονό μου.', 'Blue, of course. For my grandson.'),
      R('Ο χειμώνας εδώ είναι κρύος;', 'Is winter here cold?', 'Όχι πολύ, αλλά ο αέρας περνάει παντού!', 'Not very, but the wind gets in everywhere!'),
      R('Εγώ δεν ξέρω να πλέκω.', "I don't know how to knit.", 'Έλα κάποιο απόγευμα. Θα σου δείξω.', "Come round some afternoon. I'll show you."),
    ] },
  { id: 'g57', name: 'Ζήσης', role: L('μάστορας για όλα', 'handyman'), district: 'geitonia', formal: false,
    look: 'm m 3 #3e2723 short #8d6e63 #1565c0 trousers broad cap,mustache', am: 'agora_street', pm: 'geitonia_street',
    topic: L('Ένα ράφι; Δυο βίδες και τελειώσαμε.', "A shelf? Two screws and we're done."),
    replies: [
      R('Μπορείς να με βοηθήσεις κάποια μέρα;', 'Could you help me some day?', 'Βέβαια. Πες μου πότε, και φέρνω τα εργαλεία.', "Sure. Tell me when and I'll bring the tools."),
      R('Εγώ τα κάνω όλα με κόλλα!', 'I do everything with glue!', 'Με κόλλα; Ωχ. Καλύτερα πάρε με τηλέφωνο!', 'With glue? Oh dear. Better give me a call!'),
      R('Τα φτιάχνεις όλα;', 'Do you fix everything?', 'Σχεδόν όλα. Εκτός από ραγισμένες καρδιές!', 'Almost everything. Except broken hearts!'),
    ] },
  { id: 'g58', name: 'Βαγγελιώ', role: L('φιλόξενη γιαγιά', 'hospitable grandmother'), district: 'geitonia', formal: false,
    look: 'f o 3 #f5f5f5 scarf #1a1a1a #1a1a1a skirt short scarf', am: 'geitonia_street', pm: 'geitonia_street',
    topic: L('Πάρε ένα γλυκό του κουταλιού. Το έφτιαξα μόνη μου.', 'Have a spoon sweet. I made it myself.'),
    replies: [
      R('Ευχαριστώ, είναι πεντανόστιμο!', "Thank you, it's delicious!", 'Από τα κεράσια του κήπου μου. Πάρε κι άλλο!', 'From the cherries in my garden. Have some more!'),
      R('Τι φρούτο είναι;', 'What fruit is it?', 'Κεράσι. Του χρόνου θα κάνω και σύκο.', "Cherry. Next year I'll make fig too."),
      R('Δεν τρώω γλυκά, συγγνώμη.', "I don't eat sweets, sorry.", 'Δεν πειράζει, παιδί μου. Ένα ποτήρι νερό τότε.', "That's all right, dear. A glass of water, then."),
    ] },
  { id: 'g59', name: 'Λουκάς', role: L('νέος μάγειρας', 'young cook'), district: 'geitonia', formal: false,
    look: 'm y 1 #212121 curly #fafafa #212121 trousers slim apron', am: 'agora_street', pm: 'quay',
    topic: L('Θέλω κάποτε να ανοίξω δικό μου μαγαζί.', 'Someday I want to open my own place.'),
    replies: [
      R('Τι μαγαζί θέλεις να ανοίξεις;', 'What kind of place do you want to open?', 'Μια μικρή ταβέρνα, με φαγητά της γιαγιάς μου.', "A little taverna, with my grandmother's dishes."),
      R('Θα έρθω την πρώτη μέρα!', "I'll come on the first day!", 'Υπόσχεση; Θα σου κρατήσω το καλύτερο τραπέζι.', "Promise? I'll keep you the best table."),
      R('Είναι δύσκολο να ανοίξεις μαγαζί.', "It's hard to open a place.", 'Το ξέρω. Γι’ αυτό μαζεύω λεφτά από τώρα.', "I know. That's why I'm saving money now."),
    ] },
  { id: 'g60', name: 'Ηρώ', role: L('δασκάλα πιάνου', 'piano teacher'), district: 'geitonia', formal: false,
    look: 'f m 1 #4a2c2a long #3949ab #eeeeee skirt slim glasses', am: 'geitonia_street', pm: 'square_bench',
    topic: L('Αν ακούσεις πιάνο το απόγευμα, είμαι εγώ. Συγγνώμη!', "If you hear a piano in the afternoon, it's me. Sorry!"),
    replies: [
      R('Μου αρέσει πολύ να σε ακούω.', 'I really like listening to you.', 'Αλήθεια; Τότε θα παίζω πιο δυνατά!', "Really? Then I'll play louder!"),
      R('Τι παίζεις συνήθως;', 'What do you usually play?', 'Λίγο Χατζιδάκι, λίγο Σοπέν. Ό,τι θέλει η μέρα.', 'A little Hadjidakis, a little Chopin. Whatever the day wants.'),
      R('Δεν ακούω τίποτα από το σπίτι μου.', "I can't hear anything from my home.", 'Ωραία! Τότε δεν ενοχλώ κανέναν.', "Good! Then I'm not bothering anyone."),
    ] },

  // ── Παραλία & λόφος (beach & hill) ──────────────────────────────────
  { id: 'g61', name: 'Ανδρέας', role: L('ναυαγοσώστης', 'lifeguard'), district: 'paralia', formal: false,
    look: 'm y 3 #2b1d0e cropped #e53935 #e53935 shorts tall whistle,cap', am: 'beach', pm: 'beach',
    topic: L('Σήμερα έχει λίγο κύμα. Πρόσεχε.', 'There are some waves today. Be careful.'),
    replies: [
      R('Ευχαριστώ, θα προσέχω.', "Thanks, I'll be careful.", 'Μπράβο. Και κολύμπα μέσα στις σημαδούρες.', 'Good. And swim inside the buoys.'),
      R('Μου αρέσουν τα κύματα!', 'I like waves!', 'Κι εμένα. Αλλά από μακριά, όταν δουλεύω!', "Me too. But from a distance, when I'm working!"),
      R('Σήμερα δεν θα κολυμπήσω.', "I won't swim today.", 'Καλή ιδέα. Αύριο θα είναι λάδι, λένε.', "Good idea. They say tomorrow it'll be flat calm."),
    ] },
  { id: 'g62', name: 'Ιφιγένεια', role: L('ιδιοκτήτρια της καντίνας', 'snack stand owner'), district: 'paralia', formal: true,
    look: 'f m 2 #6d4c41 pony #ffeb3b #0277bd shorts avg cap,apron', work: 'beach_kantina', am: 'agora_street', pm: 'beach',
    topic: L('Κρύο νερό, φραπέ, τοστ. Τι θα πάρετε;', 'Cold water, frappé, toastie. What will you have?'),
    replies: [
      R('Ένα τοστ θα ήταν τέλειο.', 'A toastie would be perfect.', 'Ζεστό και τραγανό. Πείτε μου όποτε θέλετε.', 'Hot and crispy. Just say when.'),
      R('Ανοίγετε όλο τον χρόνο;', 'Are you open all year?', 'Όχι, μόνο από τον Ιούνιο ως τον Σεπτέμβριο.', 'No, only from June to September.'),
      R('Τίποτα τώρα, ευχαριστώ.', 'Nothing now, thanks.', 'Καλή βουτιά τότε!', 'Enjoy your swim, then!'),
    ] },
  { id: 'g63', name: 'Μιλτιάδης', role: L('κολυμπά όλο τον χρόνο', 'all-year swimmer'), district: 'paralia', formal: false,
    look: 'm o 3 #eeeeee bald #0288d1 #0288d1 swim avg mustache', am: 'beach', pm: 'beach',
    topic: L('Κολυμπάω κάθε μέρα, και τον Γενάρη!', 'I swim every day, even in January!'),
    replies: [
      R('Δεν κρυώνεις;', "Don't you get cold?", 'Στην αρχή, ναι. Μετά νιώθω σαν είκοσι χρονών!', 'At first, yes. Then I feel twenty again!'),
      R('Μπράβο σου! Εγώ μόνο τον Αύγουστο.', 'Good for you! I only swim in August.', 'Ε, ξεκίνα από τον Ιούνιο. Σιγά σιγά!', 'Well, start in June. Step by step!'),
      R('Θέλω να έρθω μαζί σου κάποια φορά.', 'I want to come with you some time.', 'Έλα αύριο στις επτά. Το νερό είναι πιο καθαρό το πρωί.', 'Come tomorrow at seven. The water is clearer in the morning.'),
    ] },
  { id: 'g64', name: 'Σταματία', role: L('μαζεύει βότσαλα', 'pebble collector'), district: 'paralia', formal: false,
    look: 'f m 1 #8d6e63 curly #fff59d #6d4c41 skirt avg strawhat,bag', am: 'beach', pm: 'beach',
    topic: L('Κοίτα αυτό το βότσαλο. Είναι σαν καρδιά.', "Look at this pebble. It's like a heart."),
    replies: [
      R('Πράγματι! Τι ωραίο!', 'It really is! How lovely!', 'Το κρατάω. Έχω ένα βάζο γεμάτο στο σπίτι.', "I'm keeping it. I have a full jar at home."),
      R('Εγώ βρήκα ένα σαν ψάρι.', 'I found one like a fish.', 'Αλήθεια; Δείξε μου! Τα ψάρια είναι σπάνια.', 'Really? Show me! Fish are rare.'),
      R('Για μένα όλα τα βότσαλα είναι ίδια.', 'To me all pebbles look the same.', 'Όχι! Κοίτα πιο προσεκτικά. Το καθένα έχει ιστορία.', 'No! Look more closely. Each one has a story.'),
    ] },
  { id: 'g65', name: 'Αριστείδης', role: L('φύλακας του μύλου', 'windmill keeper'), district: 'paralia', formal: false,
    look: 'm o 2 #bdbdbd short #a1887f #4e342e trousers tall cap,beard,cane', am: 'windmill', pm: 'windmill',
    topic: L('Ο μύλος δεν αλέθει πια, αλλά τον φροντίζουμε.', "The mill doesn't grind any more, but we look after it."),
    replies: [
      R('Είναι πολύ όμορφα εδώ πάνω.', "It's very beautiful up here.", 'Ευχαριστώ. Τα πανιά τα αλλάξαμε πέρσι.', 'Thank you. We replaced the sails last year.'),
      R('Πόσο παλιός είναι;', 'How old is it?', 'Πάνω από διακόσια χρόνια. Πιο παλιός κι από το λιμάνι.', 'Over two hundred years. Older than the harbour.'),
      R('Γιατί δεν αλέθει πια;', "Why doesn't it grind any more?", 'Τώρα το αλεύρι έρχεται με το πλοίο. Αλλά ο αέρας είναι ακόμα εδώ!', 'Now the flour comes by ferry. But the wind is still here!'),
    ] },
  { id: 'g66', name: 'Καλλιόπη', role: L('βοσκός με κατσίκες', 'goatherd'), district: 'paralia', formal: false,
    look: 'f m 3 #3e2723 scarf #6d4c41 #33691e trousers broad scarf,cane', am: 'hill_path', pm: 'hill_path',
    topic: L('Οι κατσίκες ξέρουν τον δρόμο καλύτερα από μένα.', 'The goats know the way better than I do.'),
    replies: [
      R('Πόσες κατσίκες έχεις;', 'How many goats do you have?', 'Δεκαπέντε. Και όλες έχουν όνομα!', 'Fifteen. And every one has a name!'),
      R('Μπορώ να τις χαϊδέψω;', 'Can I pet them?', 'Ναι, αλλά πρόσεχε την τσάντα σου. Τρώνε τα πάντα!', 'Yes, but watch your bag. They eat everything!'),
      R('Εγώ θα χανόμουν εδώ πάνω.', "I'd get lost up here.", 'Ακολούθα τις κατσίκες. Πάντα γυρίζουν στη Χώρα.', 'Follow the goats. They always come back to the Chora.'),
    ] },
  { id: 'g67', name: 'Ευάγγελος', role: L('μελισσοκόμος', 'beekeeper'), district: 'paralia', formal: false,
    look: 'm m 2 #5d4037 short #fff8e1 #8d6e63 trousers avg strawhat,beard', am: 'hill_path', pm: 'kafeneio_out',
    topic: L('Το θυμαρίσιο μέλι του νησιού είναι το καλύτερο.', "The island's thyme honey is the best."),
    replies: [
      R('Συμφωνώ! Είναι πολύ αρωματικό.', 'I agree! It is very fragrant.', 'Είναι το θυμάρι του λόφου. Οι μέλισσες το λατρεύουν.', 'It is the thyme on the hill. The bees adore it.'),
      R('Πού μπορώ να το αγοράσω;', 'Where can I buy it?', 'Στο μίνι μάρκετ, ή το Σάββατο στη λαϊκή.', 'At the mini market, or on Saturday at the street market.'),
      R('Φοβάμαι λίγο τις μέλισσες.', "I'm a little scared of bees.", 'Αν δεν τις ενοχλείς, δεν σε ενοχλούν. Είναι δίκαιες.', "If you don't bother them, they won't bother you. They're fair."),
    ] },
  { id: 'g68', name: 'Ασπασία', role: L('φροντίζει το εκκλησάκι', 'keeper of the chapel'), district: 'paralia', formal: false,
    look: 'f o 2 #e0e0e0 scarf #283593 #212121 skirt short scarf', am: 'chapel', pm: 'chapel',
    topic: L('Από εδώ πάνω φαίνεται όλο το λιμάνι.', 'From up here you can see the whole harbour.'),
    replies: [
      R('Είναι υπέροχη θέα!', "It's a wonderful view!", 'Είναι. Γι’ αυτό ανεβαίνω κάθε μέρα, με ή χωρίς λόγο.', 'It is. That is why I climb up every day, with or without a reason.'),
      R('Φροντίζεις εσύ το εκκλησάκι;', 'Do you look after the chapel?', 'Ναι, το ασπρίζω κάθε άνοιξη. Λευκό σαν το γάλα.', 'Yes, I whitewash it every spring. White as milk.'),
      R('Βλέπω και το σπίτι μου!', 'I can even see my home!', 'Αλήθεια; Τότε θα σε βλέπω από εδώ πάνω!', "Really? Then I'll be watching you from up here!"),
    ] },
  { id: 'g69', name: 'Περικλής', role: L('πεζοπόρος', 'hiker'), district: 'paralia', formal: false,
    look: 'm m 1 #8d6e63 short #ff8f00 #5d4037 bermuda tall bag,cap', am: 'lighthouse_path', pm: 'lookout',
    topic: L('Το μονοπάτι για τον φάρο είναι όμορφο, αλλά πάρε νερό.', 'The path to the lighthouse is lovely, but take water.'),
    replies: [
      R('Πόση ώρα είναι μέχρι τον φάρο;', 'How long is it to the lighthouse?', 'Καμιά ώρα με τα πόδια. Ξεκίνα πρωί.', 'About an hour on foot. Start early.'),
      R('Εγώ προτιμώ την παραλία.', 'I prefer the beach.', 'Κι η παραλία καλή είναι. Αλλά ο φάρος έχει ησυχία.', 'The beach is nice too. But the lighthouse has peace and quiet.'),
      R('Ευχαριστώ, θα πάρω νερό.', "Thanks, I'll take water.", 'Και καπέλο! Εκεί πάνω δεν έχει σκιά.', "And a hat! There's no shade up there."),
    ] },
  { id: 'g70', name: 'Δανάη', role: L('ζωγραφίζει ηλιοβασιλέματα', 'sunset painter'), district: 'paralia', formal: false,
    look: 'f y 2 #b71c1c long #ffccbc #5d4037 skirt slim scarf,bag', am: 'lookout', pm: 'lookout',
    topic: L('Περιμένω το ηλιοβασίλεμα. Κάθε μέρα είναι διαφορετικό.', "I'm waiting for the sunset. It's different every day."),
    replies: [
      R('Μπορώ να δω τον πίνακά σου;', 'Can I see your painting?', 'Ακόμα δεν τελείωσε. Αλλά κοίτα, αν θέλεις.', "It isn't finished yet. But have a look, if you like."),
      R('Το χθεσινό ήταν πολύ κόκκινο.', "Yesterday's was very red.", 'Ναι! Είχε λίγη σκόνη από την Αφρική, λένε.', 'Yes! There was a little dust from Africa, they say.'),
      R('Εγώ προτιμώ την ανατολή.', 'I prefer the sunrise.', 'Τότε πρέπει να ξυπνάς νωρίς. Εγώ δεν μπορώ!', "Then you have to get up early. I can't!"),
    ] },
  { id: 'g71', name: 'Τίμος', role: L('ελεύθερος δύτης', 'free-diver'), district: 'paralia', formal: false,
    look: 'm y 3 #1b1b1b cropped #00838f #00838f swim tall', am: 'beach', pm: 'beach',
    topic: L('Τα ψάρια σήμερα κρύβονταν. Αύριο πάλι.', 'The fish were hiding today. Again tomorrow.'),
    replies: [
      R('Τι ψάρια βλέπεις συνήθως;', 'What fish do you usually see?', 'Σαργούς, γοφάρια, και καμιά φορά χταπόδι.', 'Sea bream, bluefish, and now and then an octopus.'),
      R('Εγώ φοβάμαι τα βαθιά νερά.', "I'm afraid of deep water.", 'Τότε μείνε κοντά στα βράχια. Έχει πολλά να δεις κι εκεί.', 'Then stay near the rocks. There is a lot to see there too.'),
      R('Ίσως αύριο να είσαι πιο τυχερός.', "Maybe you'll be luckier tomorrow.", 'Μακάρι! Αύριο θα έχει λιγότερο κύμα.', 'I hope so! There will be fewer waves tomorrow.'),
    ] },
  { id: 'g72', name: 'Ευδοκία', role: L('κάνει γιόγκα στην παραλία', 'beach yoga lover'), district: 'paralia', formal: false,
    look: 'f m 0 #d7b56d bun #b2dfdb #4db6ac trousers slim', am: 'beach', pm: 'beach',
    topic: L('Ο ήχος των κυμάτων με ηρεμεί.', 'The sound of the waves calms me.'),
    replies: [
      R('Κι εμένα. Είναι σαν μουσική.', "Me too. It's like music.", 'Η καλύτερη μουσική. Και δωρεάν!', 'The best music. And free!'),
      R('Κάνεις γιόγκα κάθε πρωί;', 'Do you do yoga every morning?', 'Κάθε πρωί, πριν έρθει ο κόσμος στην παραλία.', 'Every morning, before the crowds come to the beach.'),
      R('Εγώ προτιμώ τη μουσική από τα κύματα.', 'I prefer music to waves.', 'Ο καθένας με τον ρυθμό του.', 'Each to their own rhythm.'),
    ] },
];

export const NPC_BY_ID: Record<string, NpcDef> = Object.fromEntries(NPCS.map((n) => [n.id, n]));

/** Closing lines the player can always choose. */
export const GOODBYES: Line[] = [
  L('Τα λέμε!', 'See you!'),
  L('Γεια σου!', 'Bye! (casual)'),
  L('Γεια σας!', 'Goodbye! (polite)'),
];

/** Short line when you talk to someone again on the same day. */
export const AGAIN: { formal: Line; casual: Line } = {
  formal: L('Γεια σας πάλι! Τι κάνετε;', 'Hello again! How are you?'),
  casual: L('Γεια σου πάλι! Τι κάνεις;', 'Hi again! How are you doing?'),
};

export const GIFT_THANKS: Line = L('Για μένα; Ευχαριστώ πολύ! Τι ωραίο!', 'For me? Thank you so much! How lovely!');
