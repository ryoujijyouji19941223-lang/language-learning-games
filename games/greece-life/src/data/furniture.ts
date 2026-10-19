// Furniture & wall decor, CONTENT_PLAN §4. Floor cells are 0.5 m.

export type Mount = 'floor' | 'wall' | 'window' | 'anchor';

export interface FurnitureDef {
  id: string;
  el: string;
  en: string;
  mount: Mount;
  /** Footprint in cells (floor: width × depth, wall: width × height). */
  w: number;
  d: number;
  price: number;
  /** Can stand on a balcony / courtyard as well as indoors. */
  outdoor?: boolean;
  /** Rugs: other furniture may stand on them; they do not block the path. */
  rug?: boolean;
  tall?: boolean;
  sit?: boolean;
  bed?: boolean;
  wardrobe?: boolean;
  grill?: boolean;
  /** Number of small-item anchors on top (desk-top objects). */
  anchors?: number;
  note?: string;
}

const F = (id: string, el: string, en: string, mount: Mount, w: number, d: number, price: number, extra: Partial<FurnitureDef> = {}): FurnitureDef => ({
  id, el, en, mount, w, d, price: price * 100, ...extra,
});

export const FURNITURE: FurnitureDef[] = [
  F('f01', 'Μονό κρεβάτι', 'single bed', 'floor', 2, 4, 120, { bed: true }),
  F('f02', 'Διπλό κρεβάτι', 'double bed', 'floor', 3, 4, 180, { bed: true }),
  F('f03', 'Γραφείο', 'desk', 'floor', 2, 2, 70, { anchors: 2 }),
  F('f04', 'Καρέκλα', 'chair', 'floor', 1, 1, 25, { sit: true }),
  F('f05', 'Ψάθινη καρέκλα', 'rush-seat chair', 'floor', 1, 1, 35, { sit: true, outdoor: true }),
  F('f06', 'Τραπέζι φαγητού', 'dining table', 'floor', 2, 3, 90, { anchors: 2 }),
  F('f07', 'Τραπεζάκι σαλονιού', 'coffee table', 'floor', 2, 2, 45, { anchors: 1 }),
  F('f08', 'Καναπές', 'sofa', 'floor', 4, 2, 160, { sit: true }),
  F('f09', 'Πολυθρόνα', 'armchair', 'floor', 2, 2, 85, { sit: true }),
  F('f10', 'Ντουλάπα', 'wardrobe', 'floor', 2, 1, 110, { tall: true, wardrobe: true }),
  F('f11', 'Συρταριέρα', 'chest of drawers', 'floor', 2, 1, 65),
  F('f12', 'Βιβλιοθήκη', 'bookcase', 'floor', 2, 1, 60, { tall: true }),
  F('f13', 'Κομοδίνο', 'bedside table', 'floor', 1, 1, 30, { anchors: 1 }),
  F('f14', 'Μπαούλο', 'wooden chest', 'floor', 2, 1, 55),
  F('f15', 'Πουφ', 'pouffe', 'floor', 1, 1, 20, { sit: true }),
  F('f16', 'Κρεμάστρα', 'coat stand', 'floor', 1, 1, 22, { tall: true }),
  F('f17', 'Φωτιστικό δαπέδου', 'floor lamp', 'floor', 1, 1, 40),
  F('f18', 'Κουρελού', 'rag rug', 'floor', 2, 3, 30, { rug: true }),
  F('f19', 'Μπλε χαλί', 'blue rug', 'floor', 3, 3, 50, { rug: true }),
  F('f20', 'Ψάθινο καλάθι', 'wicker basket', 'floor', 1, 1, 12),
  F('f21', 'Γλάστρα με βασιλικό', 'pot of basil', 'floor', 1, 1, 8, { outdoor: true }),
  F('f22', 'Γλάστρα με γεράνι', 'pot of geraniums', 'floor', 1, 1, 10, { outdoor: true }),
  F('f23', 'Λεμονιά σε γλάστρα', 'potted lemon tree', 'floor', 1, 1, 35, { tall: true, outdoor: true }),
  F('f24', 'Βουκαμβίλια σε γλάστρα', 'potted bougainvillea', 'floor', 1, 1, 30, { tall: true, outdoor: true }),
  F('f25', 'Τραπεζάκι μπαλκονιού', 'bistro table', 'floor', 1, 1, 30, { outdoor: true }),
  F('f26', 'Ψησταριά', 'charcoal grill', 'floor', 1, 2, 45, { outdoor: true, grill: true, note: 'A cooking tool: needed for grilled dishes in rooms without a griddle.' }),
  F('f27', 'Καθρέφτης', 'mirror', 'wall', 1, 2, 35),
  F('f28', 'Ρολόι τοίχου', 'wall clock', 'wall', 1, 1, 18),
  F('f29', 'Πίνακας με καΐκι', 'painting of a caique', 'wall', 2, 2, 40),
  F('f30', 'Πίνακας με ανεμόμυλο', 'painting of a windmill', 'wall', 2, 2, 40),
  F('f31', 'Χάρτης του νησιού', 'map of the island', 'wall', 2, 2, 15),
  F('f32', 'Ράφι τοίχου', 'wall shelf', 'wall', 2, 1, 25),
  F('f33', 'Ματάκι', 'evil-eye charm', 'wall', 1, 1, 6, { note: 'The blue "eye" is a popular charm against the evil eye (το μάτι).' }),
  F('f34', 'Κεραμικό πιάτο', 'decorative ceramic plate', 'wall', 1, 1, 20),
  F('f35', 'Λευκή κουρτίνα', 'white curtain', 'window', 1, 1, 25),
  F('f36', 'Μπλε κουρτίνα', 'blue curtain', 'window', 1, 1, 25),
  F('f37', 'Κουρτίνα με δαντέλα', 'lace curtain', 'window', 1, 1, 30),
  F('f38', 'Κομπολόι', 'worry beads', 'anchor', 1, 1, 10),
  F('f39', 'Βάζο με λουλούδια', 'vase of flowers', 'anchor', 1, 1, 14),
  F('f40', 'Φανάρι με κερί', 'candle lantern', 'anchor', 1, 1, 16),
];

export const FURNITURE_BY_ID: Record<string, FurnitureDef> = Object.fromEntries(FURNITURE.map((f) => [f.id, f]));

/** What the shopkeeper says when you buy something new (CONTENT_PLAN §4). */
export const NEW_THING_WISH = { el: 'Με γεια!', en: 'Enjoy it! (said to someone with a new thing)' };
