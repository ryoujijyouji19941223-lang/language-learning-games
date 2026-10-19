// Clothes, CONTENT_PLAN §5. Four slots; `shape` drives the player model.

export type Slot = 'top' | 'bottom' | 'shoes' | 'acc';

export interface ClothesDef {
  id: string;
  el: string;
  en: string;
  slot: Slot;
  price: number;
  color: string;
  /** Second colour (stripes, laces, brims). */
  color2?: string;
  shape: string;
}

const C = (id: string, el: string, en: string, slot: Slot, price: number, shape: string, color: string, color2?: string): ClothesDef => ({
  id, el, en, slot, price: price * 100, shape, color, color2,
});

export const CLOTHES: ClothesDef[] = [
  C('c01', 'Λευκό μπλουζάκι', 'white T-shirt', 'top', 12, 'tee', '#f4f1ea'),
  C('c02', 'Λινό πουκάμισο', 'linen shirt', 'top', 35, 'shirt', '#d9cfb8'),
  C('c03', 'Ριγέ μπλούζα', 'striped top', 'top', 22, 'stripes', '#f4f1ea', '#1f4e8c'),
  C('c04', 'Φούτερ', 'sweatshirt', 'top', 30, 'sweat', '#7a8a6a'),
  C('c05', 'Πλεκτή ζακέτα', 'knitted cardigan', 'top', 40, 'cardigan', '#b5653e'),
  C('c06', 'Αμάνικο', 'sleeveless top', 'top', 14, 'sleeveless', '#e2b33c'),
  C('c07', 'Αδιάβροχο μπουφάν', 'rain jacket', 'top', 45, 'jacket', '#d6452f'),
  C('c08', 'Λινό παντελόνι', 'linen trousers', 'bottom', 32, 'trousers', '#e8e0cc'),
  C('c09', 'Τζιν', 'jeans', 'bottom', 35, 'trousers', '#3d5a80'),
  C('c10', 'Σορτς', 'shorts', 'bottom', 18, 'shorts', '#c9a66b'),
  C('c11', 'Βερμούδα', 'knee-length shorts', 'bottom', 22, 'bermuda', '#5b7f6a'),
  C('c12', 'Μακριά φούστα', 'long skirt', 'bottom', 40, 'skirt', '#2f6f8f'),
  C('c13', 'Μαγιό', 'swimwear', 'bottom', 15, 'swim', '#1aa0b8'),
  C('c14', 'Δερμάτινα σανδάλια', 'leather sandals', 'shoes', 38, 'sandals', '#8b5a2b'),
  C('c15', 'Αθλητικά', 'trainers', 'shoes', 45, 'trainers', '#f2f2f2', '#2f6fd6'),
  C('c16', 'Εσπαντρίγιες', 'espadrilles', 'shoes', 20, 'espadrilles', '#2b3f73', '#d8c49a'),
  C('c17', 'Μποτάκια', 'ankle boots', 'shoes', 60, 'boots', '#4a3424'),
  C('c18', 'Ψάθινο καπέλο', 'straw hat', 'acc', 18, 'strawhat', '#e0c27a', '#3b3b3b'),
  C('c19', 'Καπέλο ψαρά', "fisherman's cap", 'acc', 15, 'fishercap', '#1f2f4f'),
  C('c20', 'Γυαλιά ηλίου', 'sunglasses', 'acc', 25, 'sunglasses', '#151515'),
];

export const CLOTHES_BY_ID: Record<string, ClothesDef> = Object.fromEntries(CLOTHES.map((c) => [c.id, c]));

export const START_WORN = { top: 'c01', bottom: 'c09', shoes: 'c15', acc: null as string | null };

export const SLOT_LABEL: Record<Slot, { el: string; en: string }> = {
  top: { el: 'Πάνω', en: 'Top' },
  bottom: { el: 'Κάτω', en: 'Bottom' },
  shoes: { el: 'Παπούτσια', en: 'Shoes' },
  acc: { el: 'Αξεσουάρ', en: 'Accessory' },
};
