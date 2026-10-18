// Rental rooms, SPEC §6. Cells are 0.5 m. x runs west→east (columns), z north→south (rows).
// Rents are game values, not the real Greek market.

export type WallSide = 'n' | 'e' | 's' | 'w';

export interface WallOpening { wall: WallSide; col: number; width: number }

export interface OutdoorDef {
  kind: 'balcony' | 'courtyard';
  el: string;
  en: string;
  w: number;
  d: number;
  /** Which main-room wall it is attached to and where the opening is. */
  wall: WallSide;
  /** Column of the area's first cell along that wall (in main-room coordinates). */
  offset: number;
  /** Door between room and outdoor area, in main-room wall columns. */
  door: { col: number; width: number };
}

export interface HomeDef {
  id: string;
  district: 'geitonia' | 'agora' | 'chora';
  el: string;
  en: string;
  w: number;
  d: number;
  rent: number;
  door: WallOpening;
  windows: (WallOpening & { view: 'sea' | 'street' | 'hill' })[];
  /** Fixed kitchen counter cells (x0, z0, w, d) and the cells you stand on to cook. */
  kitchen: { x: number; z: number; w: number; d: number; wall: WallSide; use: [number, number][] };
  /** h01 and h03 have a griddle plate in the kitchen that stands in for a charcoal grill. */
  griddle: boolean;
  outdoor?: OutdoorDef;
  featureEl: string;
  featureEn: string;
}

export const HOMES: HomeDef[] = [
  {
    id: 'h01', district: 'geitonia', el: 'Δωμάτιο στη Γειτονιά', en: 'Room in the neighbourhood', w: 6, d: 8, rent: 22000,
    door: { wall: 's', col: 4, width: 2 },
    windows: [{ wall: 'e', col: 2, width: 2, view: 'street' }],
    kitchen: { x: 0, z: 0, w: 3, d: 1, wall: 'n', use: [[0, 1], [1, 1], [2, 1]] },
    griddle: true,
    featureEl: 'Μικρό δωμάτιο με κουζινούλα και ένα παράθυρο.', featureEn: 'A small room with a little kitchen and one window.',
  },
  {
    id: 'h02', district: 'geitonia', el: 'Δωμάτιο με μπαλκόνι', en: 'Room with a balcony', w: 8, d: 8, rent: 30000,
    door: { wall: 'w', col: 6, width: 2 },
    windows: [{ wall: 'e', col: 1, width: 2, view: 'hill' }],
    kitchen: { x: 0, z: 0, w: 4, d: 1, wall: 'n', use: [[0, 1], [1, 1], [2, 1], [3, 1]] },
    griddle: false,
    outdoor: { kind: 'balcony', el: 'Μπαλκόνι', en: 'balcony', w: 4, d: 2, wall: 's', offset: 2, door: { col: 3, width: 2 } },
    featureEl: 'Μπαλκόνι με θέα στη θάλασσα.', featureEn: 'A balcony with a sea view.',
  },
  {
    id: 'h03', district: 'agora', el: 'Δωμάτιο πάνω από μαγαζί', en: 'Room above a shop', w: 8, d: 10, rent: 34000,
    door: { wall: 's', col: 0, width: 2 },
    windows: [{ wall: 'n', col: 2, width: 2, view: 'street' }, { wall: 'n', col: 5, width: 2, view: 'sea' }],
    kitchen: { x: 0, z: 0, w: 1, d: 4, wall: 'w', use: [[1, 0], [1, 1], [1, 2], [1, 3]] },
    griddle: true,
    featureEl: 'Στον πρώτο όροφο, πάνω από την αγορά. Δύο παράθυρα.', featureEn: 'First floor above the market street. Two windows; shops are close.',
  },
  {
    id: 'h04', district: 'chora', el: 'Δωμάτιο σε παλιό σπίτι', en: 'Room in an old house', w: 10, d: 10, rent: 42000,
    door: { wall: 'e', col: 7, width: 2 },
    windows: [{ wall: 'n', col: 6, width: 2, view: 'hill' }, { wall: 'e', col: 2, width: 2, view: 'street' }],
    kitchen: { x: 0, z: 0, w: 4, d: 1, wall: 'n', use: [[0, 1], [1, 1], [2, 1], [3, 1]] },
    griddle: false,
    outdoor: { kind: 'courtyard', el: 'Αυλή', en: 'courtyard', w: 4, d: 4, wall: 's', offset: 3, door: { col: 4, width: 2 } },
    featureEl: 'Παλιό σπίτι στη Χώρα με μικρή αυλή.', featureEn: 'An old house in the Chora with a small courtyard.',
  },
];

export const HOME_BY_ID: Record<string, HomeDef> = Object.fromEntries(HOMES.map((h) => [h.id, h]));

export const MOVE_FEE = 2000;
export const START_MONEY = 15000;
/** Starting furniture: bed, desk, chair, and one white curtain per window. */
export const START_FURNITURE = ['f01', 'f03', 'f04'];
