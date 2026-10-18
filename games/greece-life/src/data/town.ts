// Town plan of Ασπρόγιαλος (fictional). Metres; x = east, z = south (north is -z).
// Roads are polylines. Shops sit on lots placed along roads or at fixed spots.

import type { DistrictId } from './shops';

export type RoadKind = 'quay' | 'street' | 'alley' | 'path';
export type Side = 'L' | 'R';

export interface RoadDef {
  id: string;
  el: string;
  en: string;
  pts: [number, number][];
  width: number;
  kind: RoadKind;
  district: DistrictId;
  /** Sides that get ordinary houses (L = left of travel direction, R = right). */
  fill: Side[];
  /** Stop filling after this distance (m) along the road. */
  fillTo?: number;
  /** Street-name plate at the start. */
  plate?: boolean;
}

export const ROADS: RoadDef[] = [
  { id: 'port', el: 'Οδός Λιμανιού', en: 'Harbour Street', kind: 'quay', width: 10, district: 'limani', fill: ['R'], plate: true,
    pts: [[252, 40], [105, 40], [96, 30], [92, 24]] },
  { id: 'agora', el: 'Οδός Αγοράς', en: 'Market Street', kind: 'street', width: 7, district: 'agora', fill: ['L', 'R'], plate: true,
    pts: [[92, 24], [12, 24]] },
  { id: 'church', el: 'Οδός Εκκλησίας', en: 'Church Street', kind: 'street', width: 5, district: 'chora', fill: ['L', 'R'], plate: true,
    pts: [[12, 24], [2, 20], [-12, 10], [-29, -6]] },
  { id: 'bougainvillea', el: 'Οδός Βουκαμβίλιας', en: 'Bougainvillea Street', kind: 'alley', width: 3.5, district: 'chora', fill: ['L', 'R'], plate: true,
    pts: [[-45, -1], [-47, 10], [-60, 18], [-80, 22], [-104, 27]] },
  { id: 'mills', el: 'Οδός Μύλων', en: 'Windmills Street', kind: 'street', width: 4, district: 'chora', fill: ['L', 'R'], fillTo: 62, plate: true,
    pts: [[-61, -24], [-80, -32], [-105, -42], [-130, -52], [-152, -62], [-172, -70], [-186, -72]] },
  { id: 'lane', el: 'Στενό της Γειτονιάς', en: 'Neighbourhood Lane', kind: 'alley', width: 3.5, district: 'chora', fill: ['L', 'R'], plate: true,
    pts: [[-31, -27], [-30, -42], [-27, -56]] },
  { id: 'winds', el: 'Οδός Ανέμων', en: 'Street of the Winds', kind: 'street', width: 6, district: 'geitonia', fill: ['L', 'R'], plate: true,
    pts: [[-27, -56], [-24, -76], [-4, -86], [30, -90], [64, -88], [92, -80], [112, -66]] },
  { id: 'sun', el: 'Οδός Ηλίου', en: 'Sun Street', kind: 'street', width: 5, district: 'geitonia', fill: ['L', 'R'], fillTo: 30, plate: true,
    pts: [[30, -90], [32, -112], [36, -132]] },
  { id: 'gulls', el: 'Οδός Γλάρων', en: 'Seagull Street', kind: 'street', width: 6, district: 'geitonia', fill: ['L', 'R'], plate: true,
    pts: [[112, -66], [116, -40], [110, -10], [100, 14]] },
  { id: 'seafront', el: 'Παραλιακή οδός', en: 'Seafront Road', kind: 'street', width: 6, district: 'agora', fill: ['R'], plate: true,
    pts: [[105, 40], [90, 48], [40, 49], [0, 46], [-30, 40], [-56, 34], [-90, 30], [-104, 27]] },
  { id: 'sunset', el: 'Οδός Ηλιοβασιλέματος', en: 'Sunset Street', kind: 'path', width: 4, district: 'paralia', fill: [], plate: true,
    pts: [[-104, 27], [-125, 24], [-145, 20], [-160, 14]] },
  { id: 'hillbeach', el: 'Μονοπάτι της παραλίας', en: 'Beach path', kind: 'path', width: 3, district: 'paralia', fill: [],
    pts: [[-152, -62], [-155, -35], [-160, -10], [-160, 14]] },
  { id: 'lighthouse', el: 'Μονοπάτι του φάρου', en: 'Lighthouse path', kind: 'path', width: 2.5, district: 'paralia', fill: [],
    pts: [[-186, -72], [-210, -66], [-236, -58], [-258, -44], [-268, -34]] },
  { id: 'chapel', el: 'Μονοπάτι του εκκλησακιού', en: 'Chapel path', kind: 'path', width: 2.5, district: 'paralia', fill: [],
    pts: [[-186, -72], [-200, -58], [-208, -48]] },
  { id: 'lookout', el: 'Μονοπάτι της βίγλας', en: 'Lookout path', kind: 'path', width: 2.5, district: 'paralia', fill: [],
    pts: [[-172, -70], [-172, -88], [-168, -98]] },
  { id: 'breakwater', el: 'Μώλος', en: 'Breakwater', kind: 'quay', width: 6, district: 'limani', fill: [],
    pts: [[250, 46], [251, 120], [214, 128]] },
  { id: 'pier', el: 'Προβλήτα', en: 'Ferry pier', kind: 'quay', width: 9, district: 'limani', fill: [],
    pts: [[155, 46], [155, 96]] },
];

/** Paved open areas (no houses). */
export const PLAZAS: { id: string; el: string; en: string; x0: number; z0: number; x1: number; z1: number; kind: 'square' | 'quay' | 'market' | 'lookout' | 'garden' }[] = [
  { id: 'square', el: 'Πλατεία του Πλατάνου', en: 'Plane Tree Square', x0: -61, z0: -27, x1: -29, z1: -1, kind: 'square' },
  { id: 'agora_plaza', el: 'Πλατεία της Αγοράς', en: 'Market square', x0: 92, z0: 12, x1: 106, z1: 36, kind: 'market' },
  { id: 'quay', el: 'Προκυμαία', en: 'Quayside', x0: 104, z0: 44, x1: 252, z1: 52, kind: 'quay' },
  { id: 'windmills', el: 'Μύλοι', en: 'Windmill hilltop', x0: -204, z0: -90, x1: -170, z1: -58, kind: 'lookout' },
  { id: 'lookout', el: 'Βίγλα', en: 'Lookout point', x0: -176, z0: -106, x1: -160, z1: -94, kind: 'lookout' },
  { id: 'garden', el: 'Μποστάνι', en: 'Vegetable garden', x0: 26, z0: -142, x1: 48, z1: -126, kind: 'garden' },
];

export interface LotSpec {
  id: string;
  kind: 'shop' | 'home';
  shop?: string;
  home?: string;
  /** Along a road… */
  road?: string;
  t?: number;
  side?: Side;
  /** …or at a fixed spot, front facing `face`. */
  x?: number;
  z?: number;
  face?: 'n' | 's' | 'e' | 'w';
  w: number;
  d: number;
  floors: number;
  awning?: string;
}

export const SPECIAL_LOTS: LotSpec[] = [
  // Λιμάνι
  { id: 'port_fish', kind: 'shop', shop: 'port_fish', road: 'port', t: 24, side: 'R', w: 10, d: 9, floors: 2, awning: '#2a6fb0' },
  { id: 'port_taverna', kind: 'shop', shop: 'port_taverna', road: 'port', t: 47, side: 'R', w: 14, d: 10, floors: 2, awning: '#1f5f8b' },
  { id: 'port_depot', kind: 'shop', shop: 'port_depot', road: 'port', t: 70, side: 'R', w: 11, d: 9, floors: 1, awning: '#e3a33b' },
  { id: 'port_tickets', kind: 'shop', shop: 'port_tickets', road: 'port', t: 88, side: 'R', w: 9, d: 8, floors: 2, awning: '#2e7d6b' },
  // Αγορά (north side R, south side L)
  { id: 'agora_bakery', kind: 'shop', shop: 'agora_bakery', road: 'agora', t: 10, side: 'R', w: 9, d: 9, floors: 2, awning: '#c8823a' },
  { id: 'agora_cafe', kind: 'shop', shop: 'agora_cafe', road: 'agora', t: 21, side: 'R', w: 11, d: 10, floors: 2, awning: '#1f4e8c' },
  { id: 'agora_greengrocer', kind: 'shop', shop: 'agora_greengrocer', road: 'agora', t: 32, side: 'R', w: 9, d: 9, floors: 2, awning: '#4f8a3b' },
  { id: 'agora_minimarket', kind: 'shop', shop: 'agora_minimarket', road: 'agora', t: 43, side: 'R', w: 11, d: 10, floors: 2, awning: '#d84a2f' },
  { id: 'agora_souvlaki', kind: 'shop', shop: 'agora_souvlaki', road: 'agora', t: 54, side: 'R', w: 9, d: 9, floors: 2, awning: '#a0522d' },
  { id: 'agora_pastry', kind: 'shop', shop: 'agora_pastry', road: 'agora', t: 64, side: 'R', w: 9, d: 9, floors: 2, awning: '#d77fa1' },
  { id: 'h03', kind: 'home', home: 'h03', road: 'agora', t: 73, side: 'R', w: 8, d: 9, floors: 2 },
  { id: 'agora_furniture', kind: 'shop', shop: 'agora_furniture', road: 'agora', t: 11, side: 'L', w: 13, d: 11, floors: 2, awning: '#7a5230' },
  { id: 'agora_clothes', kind: 'shop', shop: 'agora_clothes', road: 'agora', t: 25, side: 'L', w: 11, d: 10, floors: 2, awning: '#2f6f8f' },
  { id: 'agora_florist', kind: 'shop', shop: 'agora_florist', road: 'agora', t: 36, side: 'L', w: 8, d: 8, floors: 1, awning: '#b0307a' },
  { id: 'agora_home', kind: 'shop', shop: 'agora_home', road: 'agora', t: 45, side: 'L', w: 9, d: 9, floors: 2, awning: '#c46a3a' },
  { id: 'agora_butcher', kind: 'shop', shop: 'agora_butcher', road: 'agora', t: 55, side: 'L', w: 8, d: 8, floors: 2, awning: '#8e2f2f' },
  { id: 'agora_cheese', kind: 'shop', shop: 'agora_cheese', road: 'agora', t: 64, side: 'L', w: 8, d: 8, floors: 2, awning: '#e0b84a' },
  // Χώρα — around the square
  { id: 'chora_kafeneio', kind: 'shop', shop: 'chora_kafeneio', x: -45, z: -31.5, face: 's', w: 12, d: 9, floors: 1, awning: '#2a4f7a' },
  { id: 'chora_guesthouse', kind: 'shop', shop: 'chora_guesthouse', x: -58, z: -32, face: 's', w: 8, d: 10, floors: 2 },
  { id: 'chora_post', kind: 'shop', shop: 'chora_post', x: -53.5, z: 3.5, face: 'n', w: 10, d: 9, floors: 1, awning: '#f2c200' },
  { id: 'chora_townhall', kind: 'shop', shop: 'chora_townhall', x: -37.5, z: 3.5, face: 'n', w: 10, d: 9, floors: 2 },
  { id: 'chora_pharmacy', kind: 'shop', shop: 'chora_pharmacy', x: -24.5, z: -20, face: 'w', w: 9, d: 9, floors: 2, awning: '#2e8b57' },
  { id: 'chora_barber', kind: 'shop', shop: 'chora_barber', road: 'bougainvillea', t: 18, side: 'L', w: 7, d: 7, floors: 1 },
  { id: 'chora_books', kind: 'shop', shop: 'chora_books', road: 'bougainvillea', t: 31, side: 'L', w: 8, d: 7, floors: 2, awning: '#6d4c41' },
  { id: 'h04', kind: 'home', home: 'h04', road: 'bougainvillea', t: 36, side: 'R', w: 9, d: 9, floors: 1 },
  // Γειτονιά
  { id: 'home_office', kind: 'shop', shop: 'home_office', road: 'winds', t: 50, side: 'R', w: 9, d: 8, floors: 2, awning: '#3f6fb5' },
  { id: 'h01', kind: 'home', home: 'h01', road: 'winds', t: 62, side: 'L', w: 8, d: 9, floors: 3 },
  { id: 'h02', kind: 'home', home: 'h02', road: 'winds', t: 118, side: 'R', w: 9, d: 9, floors: 3 },
];

/** Fixed landmarks: church, chapel, windmills, lighthouse, kiosk, kantina, plane tree. */
export const LANDMARKS = {
  church: { x: -68.5, z: -13, face: 'e' as const, w: 14, d: 15 },
  chapel: { x: -211, z: -44, face: 's' as const },
  windmills: [
    { x: -186, z: -82 },
    { x: -196, z: -66 },
    { x: -178, z: -60 },
  ],
  lighthouse: { x: -272, z: -28 },
  kiosk: { x: 138, z: 47.5 },
  kantina: { x: -150, z: 17 },
  planeTree: { x: -45, z: -14 },
  ferry: { x: 170, z: 78 },
};

/** Hang-out spots for residents (zone → points). Interior zones start with "int:". */
export const ZONES: Record<string, [number, number][]> = {
  quay: [[112, 47], [118, 48.5], [124, 47.5], [131, 48], [146, 48], [165, 48.5], [172, 47], [178, 48.5], [186, 47.5],
    [192, 49], [218, 48], [224, 46.5], [230, 48.5], [236, 47], [242, 48.5], [246, 46.5], [120, 44], [176, 44], [232, 44], [196, 46]],
  breakwater: [[250, 62], [250.5, 74], [250.5, 86], [251, 98], [251, 110], [238, 124], [226, 126]],
  ferry_pier: [[153, 62], [157, 72], [153, 84]],
  agora_street: [[86, 26], [79, 22], [74, 26.5], [63, 22], [58, 26.5], [52, 22], [47, 26.5], [41, 22], [35, 26.5], [30, 22], [26, 26.5], [17, 25]],
  cafe_terrace: [[67.5, 21.4], [70.5, 21.4], [74, 21.4]],
  square: [[-55, -22], [-50, -24], [-38, -23], [-33, -20], [-56, -8], [-52, -4], [-36, -5], [-32, -10], [-40, -15], [-50, -15], [-45, -6], [-45, -22], [-58, -15], [-31, -15], [-42, -9], [-48, -19]],
  square_bench: [[-45, -9.5], [-49.5, -14], [-40.5, -14], [-45, -18.5], [-48, -10.5], [-42, -17.5]],
  kafeneio_out: [[-51, -24.5], [-48, -24.5], [-44, -24.5], [-41, -24.5], [-38, -24.5], [-53, -24.5]],
  kafeneio_in: [],
  cafe_table: [],
  church_steps: [[-59, -18], [-59, -14], [-59, -9], [-57.5, -11.5], [-57.5, -16]],
  chora_alley: [[-46.5, 6], [-52, 13.5], [-56, 16], [-66, 19], [-74, 21], [-90, 24.5]],
  geitonia_street: [[-25, -66], [-14, -80], [0, -86.5], [12, -88], [22, -89.5], [40, -89.5], [52, -88.5], [76, -84.5], [86, -81.5], [100, -74.5], [114, -54], [113, -30]],
  geitonia_garden: [[30, -130], [34, -134], [40, -131], [44, -136], [38, -138], [28, -137]],
  beach: [[-230, 14], [-222, 20], [-212, 12], [-202, 22], [-192, 15], [-184, 23], [-176, 11], [-168, 21], [-140, 22], [-132, 13], [-124, 21], [-118, 15], [-198, 8], [-160, 24]],
  windmill: [[-183, -77], [-192, -70], [-181, -64]],
  chapel: [[-208, -40], [-214, -41], [-205, -47]],
  hill_path: [[-150, -50], [-156, -30], [-140, -56], [-164, -66]],
  lighthouse_path: [[-222, -62], [-246, -52], [-262, -38]],
  lookout: [[-169, -100], [-165, -97], [-172, -101], [-162, -99]],
  mills_road: [[-92, -37], [-112, -45], [-126, -50]],
};

/** Preferred home roads by district, plus a few residents with a specific street. */
export const HOME_ROADS: Record<DistrictId, string[]> = {
  limani: ['port', 'seafront', 'gulls'],
  agora: ['seafront', 'gulls', 'church'],
  chora: ['bougainvillea', 'church', 'lane', 'mills'],
  geitonia: ['winds', 'sun', 'gulls'],
  paralia: ['mills', 'bougainvillea'],
};

export const HOME_PREFS: Record<string, { road: string; near?: string }> = {
  g48: { road: 'winds', near: 'home_office' },
  g36: { road: 'bougainvillea' },
  g52: { road: 'sun' },
  g56: { road: 'sun' },
  g67: { road: 'mills' },
};

export const WORLD_BOUNDS = { x0: -300, x1: 268, z0: -165, z1: 132 };
