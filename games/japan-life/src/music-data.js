export const tracks = [
  {
    id: "jp_town_day",
    name: "潮風の通り",
    bpm: 96,
    file: "music/jp_town_day.wav",
    mood: "弦・笛を思わせる明るい港町の仮ループ",
  },
  {
    id: "jp_town_night",
    name: "灯りの帰り道",
    bpm: 72,
    file: "music/jp_town_night.wav",
    mood: "音数を減らした夕方と夜の仮ループ",
  },
  {
    id: "jp_shop_calm",
    name: "窓際の喫茶店",
    bpm: 84,
    file: "music/jp_shop_calm.wav",
    mood: "柔らかな鍵盤を思わせる喫茶の仮ループ",
  },
  {
    id: "jp_shop_lively",
    name: "商店街の昼下がり",
    bpm: 108,
    file: "music/jp_shop_lively.wav",
    mood: "小さく弾む拍の商店の仮ループ",
  },
  {
    id: "jp_home_default",
    name: "ただいまの部屋",
    bpm: 78,
    file: "music/jp_home_default.wav",
    mood: "落ち着いた短い旋律の自宅の仮ループ",
  },
].map((t) => ({
  ...t,
  region: "日本・架空の汐待町",
  loopStart: 0,
  loopEnd: Math.floor(((16 * 60) / t.bpm) * 16000) / 16000,
  author: "本試作用にCodexが新規制作",
  method: "tools/make_music.pyによる独自旋律・PCM合成",
  license: "本作品での利用・加工用。ASSETS.md参照",
  status: "仮・実聴と地域性の本人確認前",
}));
export const trackById = Object.fromEntries(tracks.map((t) => [t.id, t]));
export function musicFor(state) {
  if (state.scene === "town") {
    const h = Math.floor((state.clock % 1440) / 60);
    return h >= 6 && h < 18 ? "jp_town_day" : "jp_town_night";
  }
  if (state.scene === state.home || state.scene.startsWith("preview:"))
    return state.music.homeStopped
      ? null
      : trackById[state.music.homeTrack]
        ? state.music.homeTrack
        : "jp_home_default";
  return state.scene === "market_cafe" || state.scene === "home_office"
    ? "jp_shop_calm"
    : "jp_shop_lively";
}
