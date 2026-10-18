# 制作開始

このリポジトリは語学ゲーム全体の管理場所。現在の対象は日本の生活ゲームです。

## 現在の対象

- 対象フォルダ：[games/japan-life/](../games/japan-life/README.md)
- 作品：日本の暮らし（仮）
- 本人の選択：日本を最初に作り、暮らし・日本語を本人が検証する。料理は国と地域の特色を生かす。
- 状態：試作v0.2.0と配布ZIPあり。本人の初回プレイで体験の不足を確認し、SPEC v0.5・PLAYTEST_REDESIGNへ改修条件を保存。改修コードは未実装。
- [制作仕様](../games/japan-life/SPEC.md)
- [食材・料理・家具・住民の初期内容](../games/japan-life/CONTENT_PLAN.md)
- [出典と残る不足](../games/japan-life/RESEARCH.md)
- [Codexへ貼る依頼文・制作順と完成条件](../games/japan-life/CODEX_TASKS.md)

町名「汐待町」、明石周辺を参考にすること、技術・価格・時計・人数等は変更可能な初期設定。実在の明石の忠実な再現や、完成済みの外国人初心者向け日本語教材とは扱わない。

- **継続制作の最優先**：[初回プレイ後の改修仕様](../games/japan-life/PLAYTEST_REDESIGN.md)。旧M3の内容追加より、街・生活・文字・カフェ作業を作り直す。見た目はFarthest Frontier、聞いて進む会話はStardew Valley／ポケモン、物を扱う仕事はThe Boba Teashopを本人の参考指定として使う。最初に、海岸から坂を上がって丘へ歩ける一街区の美術を確認する。開始時は現実の月日に合わせた季節、今回は10月の秋。以後は独自時計で進む。高低差・遠山・路面電車・寺社と四季の服装／景観はPLAYTEST_REDESIGN §13を参照する。

## Codexへ渡す短い依頼文

> AGENTS.mdとdocs/START_HERE.mdを読み、games/japan-life/CODEX_TASKS.md §0とPLAYTEST_REDESIGN.mdのR1〜R4に従い、日本版v0.2.0を改修・ブラウザ確認してください。足が動く歩行、住宅と生活する住民、地域景観、役場からの導入、読める会話、道具を使う喫茶店を優先し、配布物と残件を更新してください。他作品は変更しないでください。

詳しい依頼文と確認項目はCODEX_TASKS.mdを使う。依頼前に、Codexの作業対象がこのリポジトリの最新内容であることを確認する。

## 制作担当へ

ルートAGENTSと日本版README・SPEC・内容計画を読んで進める。計画を残したら実装し、ブラウザで操作して確かめる。各段階の進捗・実行した検証・未確認・次の残件を対象作品内へ保存する。M1/M2だけで全作品の完成を報告しない。

外部生成AI・APIキー・全言語共通エンジンを先行条件にしない。利用者にとって遊べる配布物や配信手順を用意し、クラウド内パスやlocalhostを公開URLとして案内しない。

## ギリシャ版（Claude Code担当）

本人の決定で、日本版と並行して [games/greece-life/](../games/greece-life/README.md) を作る。制作はClaude Code。ゲーム内はギリシャ語、解説は英語、ギリシャ語を音声で読み上げる。依頼文と合格条件は [CLAUDE_TASKS.md](../games/greece-life/CLAUDE_TASKS.md)。Codexの対象は引き続き日本版で、両方の作業は互いのフォルダを変更しない。

## 既存の英語試作

[games/english-errands/](../games/english-errands/README.md)は12語の固定画面試作として保存。保守を頼まれた場合は同作品のREADME・SPEC・検証結果を読む。これは日本版や生活ゲーム全体の教材数・規模の上限ではない。

この入口の保存は、別のCodexセッションの起動・自動実行を意味しない。
