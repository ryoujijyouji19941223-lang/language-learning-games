# 検証記録

2026-10-18／japan-life v0.1.0。環境：Linux、Node.js 24.19.0、npm 11.9.0、Chromium 154.0.8037.57、Playwright 1.61.1。実際のThree.js／WebGL描画とDOM操作を使い、ゲームの描画を画像やモックへ置換していない。専用の検証サーバーはクラウド内部用で、利用者向け公開URLではない。

## 実行した確認

```sh
cd games/japan-life
npm ci --cache /tmp/japan-life-npm
npm test
npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:browser -- --grep '実際に歩き'
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:browser -- --grep '60人|タッチ|建物の衝突'
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:browser -- --grep '公園まで|配布HTML'
```

ブラウザはSwiftShaderによるソフトウェア描画。連続テストでは設定UIから影をオフにした。衝突・NPC・実際の3D描画は有効。テストは独立した6ケースで、上のように分割実行できる。`npm run test:browser`で全ケースを順に実行する設定もある。

| 確認 | 結果・範囲 |
| --- | --- |
| 状態管理 | 23件成功。取引失敗の原子性、勤務・配達・料理の一度だけ処理、全6料理の工程、全24家具の実形状と配置、出口・使用面、壁飾りと机の独立、服、転居の家具保持、複数月の家賃、JSON不正・保存禁止 |
| 生活の連続プレイ | 成功。三室内見→一室選択→住宅地から商店街へ徒歩→買い物→喫茶店4客と報酬→二件受注・別店舗集荷→海辺→二箇所へ配達→家具・服購入→帰宅→着替え→ごはん・たこめしの手操作と食事→壁・机・小物・床家具の編集→睡眠→再読込→転居。途中の場面移動をテスト用瞬間移動で省略していない |
| 公園・会話支援 | 成功。公園まで徒歩、地図のNPC道案内、人物の会話、会話中のW入力で移動しない、日本語の声が無い場合の文字続行・失敗記録、任意転記でIME変換中Enterを無視 |
| 全60人 | 成功。個別の有効なセーブJSONを設定UIから読み込み、本人の近くへ復元し、専用台詞→選択→固有反応を確認。全員への連続徒歩巡回の証拠ではない |
| タッチとJSON | 成功。390×844、Chromiumの実タッチイベントで左スティック移動と右視点、横にはみ出さない、JSONダウンロード／復元、不正JSONで現状維持、削除しても英語版の別キーを保持 |
| 配布HTML | 成功。実ビルドHTMLを一つの応答として渡し、オフライン設定で外部リクエスト0、3D生成・歩行・保存禁止時の待機継続を確認 |
| 衝突・カメラ・破損 | 成功。店舗の壁に前進しても通り抜けない、右ドラッグで壁際の視点変更、壊れた保存の案内と新規内見への復旧 |
| 配布ZIP | 標準ZIPとしてCRC／内容を検査。`index.html`がビルドHTMLと一致し、遊び方・Three.jsのMITライセンスを含む |
| 英語試作 | リポジトリ基準コミット`9472995`と比較し、`games/english-errands/`の差分なし。日本版は専用保存キーのみを使う |

ブラウザ6ケースは分割した実行でそれぞれ成功した。公園テストの初回は歩行経路上の住民と衝突し停止したため失敗した。衝突を無効化せず、人を避ける実歩行経路に変更した。次の試行では、名簿の折りたたみを開く操作がテスト側に抜けていたため待機失敗。折りたたみを通常のクリックで開く操作を追加し、最後の公園・会話・IMEケースは35秒で成功した。全件一括実行の最終結果とは区別する。タッチ検証は端末実機ではなくChromiumのエミュレーション。

## 公開配布の確認

- `gh-pages`の`japan-life/index.html`と`japan-life/japan-life.zip`だけを追加。配布コミット：`d4c8657f3899e994f019049c42b6fcf37e34044c`。
- [実際の配布ZIP](https://raw.githubusercontent.com/ryoujijyouji19941223-lang/language-learning-games/gh-pages/japan-life/japan-life.zip)を通常のHTTPS経路で再ダウンロードし、HTTP **200**、**179,751 bytes**、検証済みZIPとのバイト一致・CRC・HTML一致を確認。
- ZIPのSHA-256：`4b116a7ab04b9ce70022f28903b0dcd3fb3931f126726bd39b366f87903ce1eb`。
- 元の配布ブランチのルート`index.html`、`english-errands.zip`、`.nojekyll`はGitのblob IDが親コミットと同一。
- GitHub Pagesの想定パス`/language-learning-games/japan-life/`は、この管理環境のプロキシがCONNECTを403で拒否するため開けていない。サイトが公開済みとは報告しない。上のZIPダウンロードは別に取得成功を確認した。

## 画面証拠

| 場面 | 画像 |
| --- | --- |
| 自室の契約 | [04-contract-room.png](evidence/04-contract-room.png) |
| 店で買い物 | [05-shopping.png](evidence/05-shopping.png) |
| 喫茶店の勤務 | [06-cafe-work.png](evidence/06-cafe-work.png) |
| 海辺と集荷した荷物 | [07-harbour-parcel.png](evidence/07-harbour-parcel.png) |
| 実際の届け先で配達 | [08-delivery.png](evidence/08-delivery.png) |
| 自宅の地域料理 | [09-cooking.png](evidence/09-cooking.png) |
| 家具の編集 | [10-furniture.png](evidence/10-furniture.png) |
| 駅前公園 | [11-station-park.png](evidence/11-station-park.png) |
| 固有の会話 | [12-conversation.png](evidence/12-conversation.png) |
| タッチ操作 | [13-mobile-controls.png](evidence/13-mobile-controls.png) |
| 配布用の単一HTML | [14-packaged-offline.png](evidence/14-packaged-offline.png) |
| 壁際の視点 | [15-wall-camera.png](evidence/15-wall-camera.png) |

## 未実行・限界

- 管理環境のChromiumは`file://`をポリシーで禁止するため、ZIPをPCへ解凍してダブルクリックする操作自体は未確認。単一HTMLの実行は上記の応答方式で確認した。ローカルファイルの保存可否はブラウザによって異なるため、JSON退避を用意した。
- iPhone／Android実機、Safari／Firefox、物理キーボードと実際の日本語IME操作は未確認。IMEの検証はcompositionイベントによる変換中Enterの確認まで。
- 日本語の声が無い環境でのフォールバックを確認した。実際の日本語発声、再聴の聞こえ方、端末の音量・自動再生制限、合成環境音の実聴は未確認。
- 全道路・全角度・長時間のプレイ、実機性能、全仕事12件の連続徒歩完了、全家具を全室へ全配置の総当たりは未確認。共通状態管理は単体テストで補った。
- 日本語・地域表現の本人確認、教材としての自然さや学習効果は自動テストでは確認できない。[残件](PROGRESS.md)に区別して記録。
