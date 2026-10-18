# ギリシャの暮らし（仮）／greece-life — Ασπρόγιαλος

現代ギリシャの架空の島の港町「Ασπρόγιαλος（アスプロヤロス）」で暮らす、独立した3D生活ゲーム。ゲーム内の文字・会話・看板はギリシャ語、解説と訳は英語。ギリシャ語はPCの音声で読み上げる。

状態（2026-10-19）：**M1・M2 を実装し、ブラウザで一巡を自動テスト済み**。ギリシャ語はネイティブ未確認、3Dは仮の素材、Windows実機の音声は未確認（[TESTING.md](TESTING.md)、[PROGRESS.md](PROGRESS.md)）。

## 遊び方（日本語）

起動方法は次の3つです。

1. **`dist/greece-life.html` をダブルクリック**（いちばん簡単。サーバー不要、インターネット不要）。Microsoft Edge か Google Chrome で開きます。
2. **`start-greece.cmd` をダブルクリック**（Node.js が必要。初回は部品を自動で入れ、ブラウザが開きます。遊んでいる間は黒い窓を閉じない）。
3. このフォルダで **`npm start`**（2 と同じ。ポート 4175）。

操作：WASD／矢印キーで歩く、Shift で走る、右ドラッグで視点、ホイールで寄る・引く、E／Enter で話す・調べる・使う、Esc で戻る・メニュー、M 地図、Tab 持ち物、P スマホ（配達・暦・休む）、L 図鑑。文字入力中は移動キーが効きません。

一日の流れの例：4つの部屋を内見して1つ借りる → 商店通りで食材を買う（Καλημέρα → Θα ήθελα… → Πόσο κάνει; → Ορίστε → Ευχαριστώ）→ 喫茶店・パン屋・タベルナで働く → スマホで配達を受ける → 家具を買って並べる → 台所で料理 → 食べる → ベッドで眠る（自動保存）。

- 食事：一度食べると、次の昼夜の切り替わり（06:00／18:00）まで満腹で食べられません。飲み物はいつでも可。空腹の罰はありません。
- 天気：ナクソス島の観測値（月ごとの雨の日数・日照時間）を参考に、夏は晴れが多く、冬は雨と曇りが多くなります。夏は μελτέμι（強い北風）が数日続くことがあり、浜のカンティーナが早じまいします。
- 住民の家は外から見るだけです（表札・郵便受け・小物で誰の家か分かります。中には入れません）。
- ギリシャ語の声：Edge なら追加設定なしで使える見込み。Chrome では Windows の設定 › 時刻と言語 › 音声 › 音声を追加 で Greek（Ελληνικά）を入れ、ブラウザを再起動。声がなくても文字で遊べます（その場合「聞き取り」は記録しません）。
- 保存：ブラウザの保存領域（キー `greece-life:v1`）に自動保存。設定から手動保存、JSON の書き出し・読み込み、新しく始める、ができます。

## How to play (English)

Three ways to start:

1. **Double-click `dist/greece-life.html`** (simplest; no server, works offline). Use Microsoft Edge or Google Chrome.
2. **Double-click `start-greece.cmd`** (needs Node.js; installs parts on first run and opens the browser; keep the black window open while playing).
3. Run **`npm start`** in this folder (same as 2, port 4175).

Keys: WASD/arrows walk, Shift run, right-drag camera, wheel zoom, E/Enter talk/use, Esc back/menu, M map, Tab bag, P phone (deliveries, calendar, rest), L dictionary. Typing in a text box never moves the player.

Meals fill you up until the next day/night switch (06:00 / 18:00); drinks are always fine; there is no hunger penalty. Weather follows real Cycladic monthly figures. Residents' houses are outside-only. With no Greek voice installed the game stays playable with text.

## 開発者向け

| コマンド | 内容 |
|---|---|
| `npm test` | 単体テスト（vitest） |
| `npm run test:e2e` | ブラウザの通しテスト（Playwright、`npx playwright install chromium` が初回に必要） |
| `npm run build:standalone` | `dist/greece-life.html` を作る（スクリプト・CSS・フォントを内蔵した約0.9MBの1ファイル） |
| `npm run typecheck` | 型チェック |

配布に必要なファイル：`dist/greece-life.html` の1つだけ。ソースから動かす場合はこのフォルダ全体（`node_modules` は不要、初回に自動導入）。

構成：`src/data/`（教材・店・住民・家具などのデータ、NFC）、`src/core/`（時計・取引・住居・料理・仕事・配達・天気・保存の純粋な処理）、`src/world/`（three.js の町・室内・人物）、`src/ui/`（HTMLの画面）、`tests/`（unit／e2e、画面証拠は `tests/artifacts/`）。

## 素材と条件

- フォント：Noto Sans（latin＋greek、400/700）、SIL Open Font License 1.1（`assets/fonts/OFL.txt`）。@fontsource/noto-sans 5.2.10 から取り出して同梱。
- 3Dモデル・看板・絵・環境音：すべて three.js の基本形状・Canvas・Web Audio で作った仮素材。外部の画像・モデル・音声ファイルは使っていない。
- 外部サービス・APIキー・生成AIは使っていない。音声はブラウザ標準の Web Speech API。

## 担当と変更しない場所

制作は Claude Code。games/japan-life/（Codex担当）、games/english-errands/、AGENTS.md、ルートの設定は変更しない。仕様は [SPEC.md](SPEC.md)・[CONTENT_PLAN.md](CONTENT_PLAN.md)、制作順は [CLAUDE_TASKS.md](CLAUDE_TASKS.md)、出典は [RESEARCH.md](RESEARCH.md)。
