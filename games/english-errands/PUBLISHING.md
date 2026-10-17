# ゲームの配信

## ダウンロード

公開用の `gh-pages` ブランチには、単一HTMLの `index.html`、`english-errands.zip`、`.nojekyll` を配置しています。

[ゲームのZIPをダウンロード](https://raw.githubusercontent.com/ryoujijyouji19941223-lang/language-learning-games/gh-pages/english-errands.zip)

ZIPを解凍して `english-errands.html` を通常のPCブラウザで開きます。チャット内のファイルプレビューで実行するものではありません。サーバー起動は不要です。

2026-10-17：上記URLのHTTP 200、ZIPの整合性、同梱HTMLと検証対象ファイルの完全一致を確認済み。

## GitHub Pagesを有効にする

リポジトリ所有者が [Settings → Pages](https://github.com/ryoujijyouji19941223-lang/language-learning-games/settings/pages) を開き、次を設定します。

1. **Source**：Deploy from a branch
2. **Branch**：gh-pages、フォルダ：/ (root)
3. **Save**を押す

GitHubでビルドと公開が完了すると、同じ設定画面に表示されたサイトURLから遊べます。初回には少し時間がかかります。画面に出た公開URLと実際の応答で確認してください。

現在のクラウド環境ではGitHubのGit操作は成功しますが、`api.github.com` への接続がForbidden、GitHub Pagesホストへの接続もプロキシで403となりました。APIでのPages設定変更・公開サイトの応答確認はできていません。`gh-pages`へのpushだけで公開済みとは扱っていません。

## 更新時

ソースは `games/english-errands/` に保存します。`npm run build:standalone` で新しい単一HTMLを生成し、単一版ブラウザテストで確認してから、ZIPを含めて `gh-pages` の公開用ファイルを更新します。公開用ブランチと開発ソース用の `main` は別です。

公開サイト・手元のHTML・開発サーバーではブラウザの保存範囲が異なります。途中の記録を移す場合は、設定のJSON書き出し／読み込みを使ってください。
