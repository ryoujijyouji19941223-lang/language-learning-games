# Language Learning Games

語学学習ゲームを、言語・学習方法・遊びに合わせて一本ずつ制作するリポジトリ。

## 方針

- 一つの巨大なゲームへ集約しない。各作品の学習目標・ゲームルール・教材順を独立して設計する。
- 一作品が複数言語を扱うことも、特定言語だけを扱うこともできる。単語の翻訳差替えだけで完成とはしない。
- 一本ずつ遊べる状態にして、操作・教材・楽しさを確認して改良する。
- 音声、直接入力、画面キーボード等は必要に応じて共有できるが、共通エンジンを先に完成させる必要はない。
- 研究・仮説・実装・動作確認・学習効果の検証を区別する。

## 入口

制作を始めるときは [docs/START_HERE.md](docs/START_HERE.md) を読む。

| 内容 | 場所 |
|---|---|
| 制作担当への指示 | [AGENTS.md](AGENTS.md) |
| 作品一覧・候補 | [docs/GAMES.md](docs/GAMES.md) |
| 調査資料の参照 | [docs/RESEARCH.md](docs/RESEARCH.md) |
| 地域の生活ゲーム：賃貸・暮らし・会話・季節の設計 | [docs/REGIONAL_LIFE_SIM_DESIGN.md](docs/REGIONAL_LIFE_SIM_DESIGN.md) |
| 現在の新規対象：日本の暮らし | [games/japan-life/README.md](games/japan-life/README.md) |
| 日本版の制作依頼文・完成条件 | [games/japan-life/CODEX_TASKS.md](games/japan-life/CODEX_TASKS.md) |
| 既存の英語試作 | [games/english-errands/README.md](games/english-errands/README.md) |
| 既存の英語試作の仕様 | [games/english-errands/SPEC.md](games/english-errands/SPEC.md) |

## 現在の状態

2026-10-17：一作目案「ことばの小さなおつかい」の遊べる初期試作を実装。[起動方法](games/english-errands/README.md)と[検証結果・未確認点](games/english-errands/TESTING.md)を作品フォルダに記録。一作目の英語・順序・題名は提案であり、本人の確定選択ではない。

コード、素材、起動手順、検証結果は作品ごとに保存する。実装で使う技術・起動方法は作品のREADMEを参照する。


2026-10-18：地域の生活シミュレーションの[設計方針v0.1](docs/REGIONAL_LIFE_SIM_DESIGN.md)を作成。賃貸一室・単一住居と引っ越し、家具・壁飾り、固定の街並み、仕事と料理、短い選択会話、時間と季節を整理。この構想時点では対象の国・町・正式SPECは未確定。旧12語の試作をこの完成形とは扱わない。

2026-10-18追記：最初の生活ゲームは本人が検証できる日本に決定。[日本版](games/japan-life/README.md)のSPEC・初期内容・文化資料・Codexへの依頼文を用意。現在の対象と手順は[制作入口](docs/START_HERE.md)を参照。日本版のゲーム本体・配布物は未実装。架空の港町・地域・技術・数値は変更可能な初期案。
