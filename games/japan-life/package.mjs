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
const instructions = `汐待町 ― 日本の暮らし v0.3.3 自販機と小公園プレビュー\n\n1. ZIPをすべて解凍してください。\n2. index.htmlをPCのChromeやEdgeなどWebGL 2対応ブラウザで開きます。\n3. 三つの部屋を内見し、一つを選びます。\n\nWASD/矢印：歩く、Shift：走る、右ドラッグ：視点、E/Enter：調べる、Esc：戻る、M：地図。\nタッチは左スティック、右ドラッグ、調べるボタン。実機スマホは未検証です。\n地図は道案内で、瞬間移動しません。人や扉に近づいてEを押します。\n店内のカウンターでEを押すと買い物・勤務・集荷ができます。\n食料店と魚屋は8時、喫茶店は9時、家具・服店は10時から。家具店は水曜休み。\n手帳の「休む・待つ」で時間を進められます。確認中は時計停止です。\n自宅の台所で料理、保管箱で家具配置、ベッドで睡眠。\n\nサーバー・アカウント・外部AI・APIキーは不要です。ゲームのプログラム・3Dライブラリ・素材はHTMLに含まれています。\n保存はこのブラウザ内。保存不可でも画面内では続行できます。設定のJSONで記録を退避・移行できます。\n日本語音声が無い場合は文字で進められます。\n場所ごとに5つの仮の独自BGMが切り替わります。設定で音楽・声・環境音の音量と消音を別に変えられます。\n家具店の卓上ラジオ（1,800円）を買うと、手帳の「自宅のラジオ」で試聴・選曲・停止できます。机上に配置したラジオからも操作できます。保管・転居でも選曲は残ります。完成曲の実聴と監修は未確認です。\nチャットやスマホのファイルプレビューでなく通常のブラウザを使ってください。直接開けない場合は、Python 3があるPCで解凍先に移動し、python3 -m http.server 4182 --bind 127.0.0.1 を実行して、同じPCのブラウザで http://localhost:4182 を開けます。Windowsは python3 の代わりに py -3。ソースからのNode.js起動方法はREADMEにあります。この管理環境のブラウザはfile URLを禁止しているため、直接起動の確認は未達で、HTTP配信を検証しています。\n\nバス停と駅前公園へ自販機と飲料容器の回収箱を追加。Eで飲料を買い、持ち物から飲んで、専用回収箱へ空き缶とPETを戻せます。元の駅前公園を、秋の木陰・園路・ベンチ・砂場・ブランコ・すべり台・水飲み場・管理用ごみ箱のある小公園へ改修。遊具は景観用で、水道操作・手持ち容器の3D・現金投入／釣銭・在庫切れは未実装です。車道を幹線と海岸道路へ接続して町外まで延ばし、車道脇の歩道と専用の横断歩道、すり抜けない海岸柵、木板とトタン屋根のバス待合所を追加しました。バスの運行・乗車は未実装です。秋の海岸から坂と丘へ歩ける街区、敷地の塀と門・駐車車両・歩行者専用の商店街と二階建て・海沿いの松・刈り跡の田、業種別の店内商品、大きい時計と行き先を選べる地図を含むプレビューです。Pはスマホ・配達、Jは手帳・持ち物。店舗二階の賃貸は今後の候補です。
喫茶店ではカウンター左を回り、店内用／持ち帰りカップの棚、マシンかポット、ふた、ミルクの置き場、トレーへ歩いてEで扱います。器具は空カップを置く→もう一度で抽出→待ってから取る。ミルクの「別で」は小さい容器へ注いでトレーへ置きます。トレーを持って客に渡してください。返却口で作り直せます。
以前のセーブは保持します。設定の「開始日と季節」から任意で季節を合わせられます。先にJSONを書き出すこともできます。別の場所で開くHTMLではブラウザの保存領域が別になる場合があるため、JSONで移行してください。
独自の簡易モデルとDRAFT会話。文化監修・完成素材・実機スマホ・学習効果は未確認です。役場の導入、住民の連続した帰宅、路面電車・寺社、桜・祭り・降雪等は残件です。Farthest Frontierと同じ見た目には達していません。\n料理と価格・家賃・時間はゲーム用で、実用レシピや現実の日本の相場・制度の解説ではありません。\n`;
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
  "ART_DIRECTION.md": await readFile(new URL("./ART_DIRECTION.md",import.meta.url),"utf8"),
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
