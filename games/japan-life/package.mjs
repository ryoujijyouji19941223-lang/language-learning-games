import { readFile, writeFile } from "node:fs/promises";
import { deflateRawSync } from "node:zlib";
const license = await readFile(
  new URL("./node_modules/three/LICENSE", import.meta.url),
  "utf8",
);
let html = await readFile(
  new URL("./dist/index.html", import.meta.url),
  "utf8",
);
if (!html.includes("THREE.JS LICENSE"))
  html = html.replace(
    "</head>",
    `<!-- THREE.JS LICENSE\n${license.replaceAll("--", "—")}\n-->\n</head>`,
  );
await writeFile(new URL("./dist/index.html", import.meta.url), html);
const instructions = `汐待町 ― 日本の暮らし M1/M2初期試作\n\n1. ZIPをすべて解凍してください。\n2. index.htmlをPCのChromeやEdgeなどWebGL 2対応ブラウザで開きます。\n3. 三つの部屋を内見し、一つを選びます。\n\nWASD/矢印：歩く、Shift：走る、右ドラッグ：視点、E/Enter：調べる、Esc：戻る、M：地図。\nタッチは左スティック、右ドラッグ、調べるボタン。実機スマホは未検証です。\n地図は道案内で、瞬間移動しません。人や扉に近づいてEを押します。\n店内のカウンターでEを押すと買い物・勤務・集荷ができます。\n食料店と魚屋は8時、喫茶店は9時、家具・服店は10時から。家具店は水曜休み。\n手帳の「休む・待つ」で時間を進められます。確認中は時計停止です。\n自宅の台所で料理、保管箱で家具配置、ベッドで睡眠。\n\nサーバー・アカウント・外部AI・APIキーは不要です。ゲームのプログラム・3Dライブラリ・素材はHTMLに含まれています。\n保存はこのブラウザ内。保存不可でも画面内では続行できます。設定のJSONで記録を退避・移行できます。\n日本語音声が無い場合は文字で進められます。\nチャットやスマホのファイルプレビューでなく通常のブラウザを使ってください。管理環境がローカルHTMLの実行を禁止する場合は、Node.jsでソースから配信する方法もREADMEにあります。\n\n独自の簡易モデルとDRAFT会話。文化監修・完成素材・実機スマホ・学習効果は未確認です。M3以降は未実装です。\n料理と価格・家賃・時間はゲーム用で、実用レシピや現実の日本の相場・制度の解説ではありません。\n`;
const table = Array.from({ length: 256 }, (_, n) => {
  for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
const crc32 = (buffer) => {
  let crc = 0xffffffff;
  for (const b of buffer) crc = table[(crc ^ b) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};
const locals = [],
  centrals = [];
let offset = 0;
const files = {
  "index.html": html,
  "あそびかた.txt": instructions,
  "THIRD_PARTY_NOTICES.txt": "Three.js\n" + license,
};
for (const [name, text] of Object.entries(files)) {
  const filename = Buffer.from(name),
    data = Buffer.from(text),
    compressed = deflateRawSync(data),
    crc = crc32(data),
    local = Buffer.alloc(30),
    central = Buffer.alloc(46);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0x800, 6);
  local.writeUInt16LE(8, 8);
  local.writeUInt16LE(33, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(compressed.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(filename.length, 26);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0x800, 8);
  central.writeUInt16LE(8, 10);
  central.writeUInt16LE(33, 14);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(compressed.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(filename.length, 28);
  central.writeUInt32LE(offset, 42);
  locals.push(local, filename, compressed);
  centrals.push(central, filename);
  offset += local.length + filename.length + compressed.length;
}
const directory = Buffer.concat(centrals),
  end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(Object.keys(files).length, 8);
end.writeUInt16LE(Object.keys(files).length, 10);
end.writeUInt32LE(directory.length, 12);
end.writeUInt32LE(offset, 16);
await writeFile(
  new URL("./dist/japan-life.zip", import.meta.url),
  Buffer.concat([...locals, directory, end]),
);
console.log(
  `Built self-contained HTML (${Buffer.byteLength(html)} bytes) and japan-life.zip, with instructions and Three.js license.`,
);
