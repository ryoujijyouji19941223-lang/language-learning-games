const rows = [
  ["water", "水", "Water, please.", "水をお願いします。"],
  ["tea", "お茶", "Tea, please.", "お茶をお願いします。"],
  ["coffee", "コーヒー", "Coffee, please.", "コーヒーをお願いします。"],
  ["milk", "牛乳", "Milk, please.", "牛乳をお願いします。"],
  ["bread", "パン", "Some bread, please.", "パンをお願いします。"],
  ["rice", "ご飯", "Some rice, please.", "ご飯をお願いします。"],
  ["apple", "りんご", "An apple, please.", "りんごを1つお願いします。"],
  ["banana", "バナナ", "A banana, please.", "バナナを1本お願いします。"],
  ["cup", "カップ", "A cup, please.", "カップを1つお願いします。"],
  ["plate", "皿", "A plate, please.", "皿を1枚お願いします。"],
  ["spoon", "スプーン", "A spoon, please.", "スプーンを1本お願いします。"],
  ["bowl", "ボウル／深鉢", "A bowl, please.", "ボウルを1つお願いします。"],
];

export const items = rows.map(
  ([lemma, meaningJa, requestEn, requestJa], index) => ({
    id: `en${String(index + 1).padStart(3, "0")}`,
    lemma,
    meaningJa,
    requestEn,
    requestJa,
    group: Math.floor(index / 4) + 1,
    imageVariants: [`assets/${lemma}-1.svg`, `assets/${lemma}-2.svg`],
    // 教材IDから音声ファイルへ差し替えられる参照。現版は端末のTTS。
    audioWord: { type: "tts", text: lemma, lang: "en" },
    audioRequest: { type: "tts", text: requestEn, lang: "en" },
  }),
);
export const byId = Object.fromEntries(items.map((item) => [item.id, item]));
export const groupNames = {
  1: "飲みもののおつかい",
  2: "おいしいおつかい",
  3: "食卓のおつかい",
  4: "まぜて、おつかい",
};
