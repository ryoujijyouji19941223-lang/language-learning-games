# greece-life：作業の規則（Claude Code用）

- 書き込むのはこのフォルダ（games/greece-life/）だけ。games/japan-life/、games/english-errands/、AGENTS.md、ルートの設定は変えない。
- 仕様の正本は SPEC.md と CONTENT_PLAN.md。制作順と合格条件は CLAUDE_TASKS.md。
- ゲーム内の文字はギリシャ語、訳と解説は英語。文字列はデータファイルに集め、NFC で保存。古代用の拡張文字（U+1F00～U+1FFF）と U+037E を使わない。
- 音声は Web Speech API。`speak()` は操作の中だけ。声がなくても遊べる。
- 保存キーは `greece-life:v1`。
- 起動は `npm start`（ポート4175）、`start-greece.cmd`、`dist/greece-life.html` の3つだけ。オプションを増やさない。
- 変更したら、ブラウザで実際に操作して確かめる（Playwright）。ビルド成功だけで完了にしない。
- 進捗・実行したテスト・未確認は PROGRESS.md と TESTING.md に書く。ギリシャ語の自然さと Windows 実機の音声は「未確認」として残す。
- main に直接 push しない。作業ブランチにして PR を作る。
