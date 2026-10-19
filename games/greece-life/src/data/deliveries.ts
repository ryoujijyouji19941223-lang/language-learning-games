// Delivery jobs, SPEC §11 and CONTENT_PLAN §7. 8 pick-up points × 16 destinations.
// Pay and deadline depend on the walking distance tier.

import type { Line } from './npcs';

const L = (el: string, en: string): Line => ({ el, en });

export interface PickupDef { id: string; shop: string; parcel: Line; count: number }

export const PICKUPS: PickupDef[] = [
  { id: 'p_depot', shop: 'port_depot', parcel: L('Δέμα', 'parcel'), count: 1 },
  { id: 'p_bakery', shop: 'agora_bakery', parcel: L('Τυρόπιτα', 'cheese pie'), count: 2 },
  { id: 'p_greengrocer', shop: 'agora_greengrocer', parcel: L('Τελάρο με ντομάτες', 'crate of tomatoes'), count: 1 },
  { id: 'p_minimarket', shop: 'agora_minimarket', parcel: L('Σακούλα με ψώνια', 'bag of groceries'), count: 1 },
  { id: 'p_furniture', shop: 'agora_furniture', parcel: L('Καρέκλα', 'chair'), count: 1 },
  { id: 'p_home', shop: 'agora_home', parcel: L('Κεραμικό πιάτο', 'ceramic plate'), count: 1 },
  { id: 'p_florist', shop: 'agora_florist', parcel: L('Ανθοδέσμη', 'bunch of flowers'), count: 1 },
  { id: 'p_pharmacy', shop: 'chora_pharmacy', parcel: L('Σακουλάκι από το φαρμακείο', 'pharmacy bag'), count: 1 },
];

export type DestRef =
  | { kind: 'home'; npc: string }
  | { kind: 'shop'; shop: string; npc?: string }
  | { kind: 'spot'; spot: string; el: string; en: string; npc?: string };

export interface DestDef { id: string; ref: DestRef; landmark: Line }

export const DESTINATIONS: DestDef[] = [
  { id: 'd01', ref: { kind: 'home', npc: 'g48' }, landmark: L('δίπλα στο γραφείο ενοικίων', 'next to the rental office') },
  { id: 'd02', ref: { kind: 'home', npc: 'g49' }, landmark: L('στη Γειτονιά, στον μεγάλο δρόμο', 'in the Neighbourhood, on the main street') },
  { id: 'd03', ref: { kind: 'home', npc: 'g52' }, landmark: L('κοντά στον κήπο με τις ντομάτες', 'near the vegetable garden') },
  { id: 'd04', ref: { kind: 'home', npc: 'g36' }, landmark: L('στο στενό με τα γεράνια', 'in the alley with the geraniums') },
  { id: 'd05', ref: { kind: 'shop', shop: 'chora_kafeneio', npc: 'g32' }, landmark: L('στην πλατεία, κάτω από τον πλάτανο', 'on the square, under the plane tree') },
  { id: 'd06', ref: { kind: 'shop', shop: 'chora_church', npc: 'g35' }, landmark: L('η εκκλησία με το καμπαναριό', 'the church with the bell tower') },
  { id: 'd07', ref: { kind: 'shop', shop: 'chora_guesthouse', npc: 'g43' }, landmark: L('στην πλατεία της Χώρας', 'on the Chora square') },
  { id: 'd08', ref: { kind: 'shop', shop: 'port_taverna', npc: 'g12' }, landmark: L('στο λιμάνι, δίπλα στη θάλασσα', 'at the harbour, by the sea') },
  { id: 'd09', ref: { kind: 'shop', shop: 'port_tickets', npc: 'g04' }, landmark: L('στο λιμάνι, κοντά στο πλοίο', 'at the harbour, near the ferry') },
  { id: 'd10', ref: { kind: 'spot', spot: 'chapel_door', el: 'Εκκλησάκι στον λόφο', en: 'chapel on the hill', npc: 'g68' }, landmark: L('πάνω στον λόφο, το άσπρο εκκλησάκι', 'up on the hill, the white chapel') },
  { id: 'd11', ref: { kind: 'spot', spot: 'windmill_door', el: 'Ανεμόμυλος', en: 'windmill', npc: 'g65' }, landmark: L('στην κορυφή του λόφου', 'at the top of the hill') },
  { id: 'd12', ref: { kind: 'shop', shop: 'beach_kantina', npc: 'g62' }, landmark: L('στην παραλία', 'on the beach') },
  { id: 'd13', ref: { kind: 'home', npc: 'g67' }, landmark: L('στον δρόμο για τους μύλους', 'on the road to the windmills') },
  { id: 'd14', ref: { kind: 'shop', shop: 'chora_barber', npc: 'g44' }, landmark: L('στο στενό κάτω από την πλατεία', 'in the alley below the square') },
  { id: 'd15', ref: { kind: 'home', npc: 'g56' }, landmark: L('στη Γειτονιά, κοντά στις γάτες', 'in the Neighbourhood, near the cats') },
  { id: 'd16', ref: { kind: 'shop', shop: 'chora_books', npc: 'g45' }, landmark: L('στο στενό με τη βουκαμβίλια', 'in the alley with the bougainvillea') },
];

/** Distance tiers (metres, straight line between pick-up and destination). */
export const DELIVERY_TIERS = [
  { maxDist: 120, pay: 400, minutes: 90 },
  { maxDist: 240, pay: 600, minutes: 120 },
  { maxDist: Infinity, pay: 800, minutes: 180 },
];

export const MAX_ACTIVE_DELIVERIES = 3;
export const OFFERS_PER_DAY = 6;

export const DELIVERY_LINES = {
  pickup: L('Ήρθα για το δέμα.', "I've come for the parcel."),
  pickupReply: L('Ορίστε. Προσέξτε το!', 'Here you are. Take care of it!'),
  deliver: L('Έχω ένα δέμα για εσάς.', 'I have a parcel for you.'),
  deliverReply: L('Ευχαριστώ πολύ! Ορίστε.', 'Thank you very much! Here you go.'),
  late: L('Λίγο αργά, αλλά ευχαριστώ.', 'A little late, but thank you.'),
  leftAtDoor: L('Το άφησα στην πόρτα.', 'I left it at the door.'),
};
