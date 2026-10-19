# 追加フィードバック反映の検証（2026-10-19）

途中実装の単体42件成功・ビルド成功。追加の3件は全住居／配達先の門口が追加障害物で塞がらない幾何検査、旧v0.3の障害物位置の安全な移行と財産・日付の維持、桜の花と紅葉・他樹種の区別。最初の移行テストは内見をしていないテスト準備の不備で失敗し、正規の内見→契約へ修正して42件成功。

実WebGLブラウザで海岸・二階建ての商店街・住宅・軽トラ・松・刈り跡・魚屋・食料店・服店の9画角、PCと390px幅の地図と道案内の選択を確認。画角間は設定のJSON読込を使い、連続徒歩の証拠とは分ける。ページ例外0。画像は`evidence/rural/`。見てから米袋の棚の高さ、地図の縦幅、松の樹冠、歩行者用の標識を調整したため、該当画像は最終撮り直しが残る。

最初の一括ブラウザ実行で、住宅側の横道を塀が狭め、位置(-55.74,-2.73)から配達先へ横移動できない問題を確認。通路の安全幅を全道路・路地へ適用し、横道を道路と地図へ明示し、実際に失敗した経路の幾何回帰テストを追加した。衝突を切る・テストをスキップする対応はしない。初回の新規衝突テストは建物の衝突半径内を開始点にしたテスト準備の問題もあり、壁の外側へ開始点を直した。最終版を一括で再検証する。前回の結果は以下に履歴として残す。

# 検証記録

## 最新：秋の街区プレビューv0.3.0（2026-10-19 日本時間）

SPEC v0.5／PLAYTEST_REDESIGN v0.3を基準とする。Linux、Node.js 24.19.0、npm 11.9.0、Three.js 0.186.1、Chromium 154.0.8037.57、Playwright 1.61.1。実際のThree.js／WebGLとDOM・キーボード・タッチを操作した。描画をモックや完成予想図へ置換していない。

```sh
cd games/japan-life
npm test
npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:browser
# 最後の窓明かり修正後の追加確認
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:browser -- --grep 'R1 秋'
```

単体 **39件成功**。ブラウザは **18件成功・失敗0・スキップ0（15.7分）**。その後、横向き住宅の窓明かりの向き・寸法を修正し、影響するR1を追加で **1件成功（約1.1分）**。最後のHTMLはPythonの実HTTP配信でも新規開始から歩行まで操作した。

| 確認 | 結果・実行範囲 |
| --- | --- |
| 一街区の実歩行 | 海岸→坂→丘の自宅前をキーボードで連続移動。標高差5m超、実移動に伴う歩行／走行／停止。昼夕夜は同じ自宅前の位置、丘から海は開けた公道から別の画角 |
| 生活一巡 | **6.2分で成功**。三室内見→買い物→道具で四客勤務→別二店舗で集荷→二住宅へ配達→家具・服購入→帰宅・着替え→ごはん／たこめしと食事→壁・床・机上の家具とラジオ→睡眠→再読込→家具を保持する一住居の転居。場面間のテスト用瞬間移動・衝突無効化なし |
| 喫茶店 | 実際にカウンターを回って器具を扱い、四客・紙カップ二杯・ふた・別添えミルク・抽出途中の再読込。報酬2,000円と120分を一度だけ加算。品物は手元・器具・トレーへ移る |
| 会話4件 | 選択なしで聞く話、二人の発話者交替、任意の返しと反応を同じ枠に保持。390×844／150%文字、勤務のはい／いいえ、自動送りの手動停止・再開・最終選択を自動決定しない。二人は単独時に本人の固有の話を使う |
| 全60人 | 各人の有効な時間・場所のJSONをUIから復元し、固有の話を聞いて終える。**全員への連続徒歩巡回ではない** |
| 既存記録 | コミット4585638の旧エンジンで生成した実形式の記録を使用。財産・日付・家具・服・運搬中の仕事・会話・ラジオと提供待ちの勤務を保持し、実HTTPで起動・歩行。新しいfreshを旧形式らしく見せたものではない |
| 配布HTML・入力・保存 | 外部通信なしの起動・3D・歩行、保存禁止でも続行、破損した保存の案内、壁の衝突と右ドラッグ、タッチの移動／視点、JSON入出力・不正拒否。他作品の保存キーを保持 |
| 音楽4件 | 実WebAudioで5曲を復号・場所切替・フェード・同曲継続・ラジオ・消音保存。検証用TTSで実GainNodeの減衰と完了／取消／失敗、非表示停止、再生拒否／音源不良での続行。**実際の日本語音声や音楽の聞こえ方は未確認** |
| 四季の基礎比較 | 同じ海岸の位置・視点・14時。日付は有効な保存状態で個別に設定し、数か月の連続生活の証拠とはしない。春は暫定の淡色葉、冬は屋根・地面・裸木・服の基礎。桜・祭り・降雪の完成確認ではない |

## 配布HTMLを手元と同じ方法で起動

`python3 -m http.server 4182 --bind 127.0.0.1 --directory dist`を実行し、Chromiumで実際のHTTP応答を開いた。入居→町へ出る→キーボードで約7.2m移動。ページ例外0、外部HTTPリクエスト0。UIのJSON読み込みで別の夜の位置へ移し、横向き住宅の窓明かりが窓の向きに合う画面を確認。夜の画角は撮影用の保存状態で、昼からそこまで連続歩行した証拠とは分ける。記録は`evidence/art/python-http-check.json`。Canvasの264描画呼出し／419,093三角形はその夜の画角の値で、FPSや実機の性能保証ではない。

**file URLは未確認**。配布HTMLを直接開く試行は、管理Chromiumの`ERR_BLOCKED_BY_ADMINISTRATOR`で拒否された（[画面](evidence/art/file-policy-block.png)）。ポリシーを解除せず通常HTTPを検証した。直接開く方法がこの環境で成功したとは報告しない。手元でも開けなければ、解凍先でREADME／同梱のPython 3のHTTP手順を使う。

## 実画面と動き

| 場面 | 証拠 |
| --- | --- |
| 秋の海岸と丘から海 | [海岸](evidence/art/coast-autumn-day.png)・[丘から海](evidence/art/hill-to-sea.png) |
| 住宅前の昼夕夜 | [昼](evidence/art/hill-autumn-day.png)・[夕](evidence/art/hill-autumn-evening.png)・[夜](evidence/art/hill-autumn-night.png) |
| 庭・住宅の別画角、横向き住宅の灯り | [庭](evidence/art/garden-house-detail.png)・[夜の窓](evidence/art/coast-night-windows.png) |
| 会話 | [魚屋](evidence/art/dialogue-fish.png)・[二人](evidence/art/dialogue-neighbors.png)・[スマホ幅150%](evidence/art/dialogue-mobile-150.png) |
| 喫茶店の実物 | [トレー](evidence/art/cafe-carry-tray.png)・[できた紙カップ](evidence/art/cafe-filled-paper-cup.png)・[勤務終了](evidence/art/cafe-shift-complete.png) |
| 四季の同地点 | [春](evidence/art/season-spring.png)・[夏](evidence/art/season-summer.png)・[秋](evidence/art/season-autumn.png)・[冬](evidence/art/season-winter.png) |
| HTTPの配布物 | [旧記録から再開](evidence/art/packaged-legacy-http.png)・[Python HTTPで歩行](evidence/art/python-http-start.png) |
| 動画 | [海岸→丘の実歩行](evidence/art/walk-coast-hill.mp4) **約34秒**・[器具で作り運ぶ作業](evidence/art/cafe-make-and-serve.mp4) **約10秒** |

動画はCDPの実フレームを時刻どおりffmpegでH.264へ符号化した無音の960×600。最後の歩行録画は49実フレーム・約32.6秒区間、MP4全体は34.2秒。15fpsへ符号化しても元の描画は約1.5fpsで、滑らかな実機性能の証明ではない。ソフトウェアでは解像度0.8倍・BasicShadowMap1024、通常GPUはPCFSoft2048。メニュー背景はソフトウェアだけ変更時と1秒ごとの描画にする。実機PC・スマホ・Safari／Firefox・音声実聴は未確認。

`evidence/04`〜`16`の生活画像も現行版へ更新。旧v0.2当時の画像はGitの過去コミット4585638から取得できる。モデル・材質・人物・植生・光の残る差は[ART_REVIEW.md](ART_REVIEW.md)、素材条件は[ART_DIRECTION.md](ART_DIRECTION.md)。参考作品と同等の完成美術とはしない。

## ZIPとGitHub

- 最新ZIP：`releases/japan-life-autumn-preview.zip`、**4,188,458 bytes**。
- SHA-256：`fc501f3523b896650df7e4b57d65f18df10459f1db3b8c4b3081da3aa8dedda1`。
- 標準ZIPのCRC、含まれるHTMLと`dist/index.html`の一致、同梱の遊び方・Three.js MIT・新規素材のCC0-1.0条件を確認。
- 作業ブランチ`codex/japan-life-autumn-art`にソースとZIPを置く。**従来のgh-pagesのZIP／公開ページは旧v0.2.0**。mainへ自動マージしない。
- 配布コミット`e3de39e4882536614082effa29d6dd4d0145e053`をpush後、[固定URL](https://raw.githubusercontent.com/ryoujijyouji19941223-lang/language-learning-games/e3de39e4882536614082effa29d6dd4d0145e053/games/japan-life/releases/japan-life-autumn-preview.zip)から再取得し、**HTTP200・4,188,458 bytes・ローカルとのバイト一致・CRC・HTML一致**を確認。GitHubのリポジトリページもHTTP200、Public／isPrivate:falseを確認。
- 基準f0004f8からの全変更が`games/japan-life/`内であることを確認。他作品に差分なし。

最初の一括試行は15件中12件成功・3件失敗。カウンターや住民を直進する旧テスト経路と、室内店員の旧固有名ラベルを修正。その後の分割試行ではfile URLの禁止と低FPSの短い入力・旧海辺経路が残ったため、HTTP配信、実フレーム待ちと歩行者の迂回、岸沿いの公道からの移動を使った。これらを経て上記18件が成功。失敗をスキップや衝突無効化で隠していない。

クラウドの再開用`start_skill`草稿は更新済み。設定の公開・新しい環境での復元は別で未確認。

以下はv0.2.0の検証履歴。当時の10件成功を改修の達成へ読み替えない。

2026-10-18／japan-life v0.2.0。環境：Linux、Node.js 24.19.0、npm 11.9.0、Chromium 154.0.8037.57、Playwright 1.61.1。実際のThree.js／WebGL描画とDOM操作を使い、ゲームの描画を画像やモックへ置換していない。専用の検証サーバーはクラウド内部用で、利用者向け公開URLではない。

## 実行した確認

```sh
cd games/japan-life
npm ci --cache /tmp/japan-life-npm
npm test
npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:browser
```

ブラウザはSwiftShaderによるソフトウェア描画。連続テストでは設定UIから影をオフにした。衝突・NPC・実際の3D描画は有効。最終の一括実行は **10件成功・失敗0・スキップ0（7.0分）**。音楽追加前に実行した6ケースの分割検証に加え、v0.2.0で音楽4ケースとラジオ入りの連続プレイを追加した。

| 確認 | 結果・範囲 |
| --- | --- |
| 状態管理 | 29件成功。取引失敗の原子性、勤務・配達・料理の一度だけ処理、全6料理の工程、全25家具の実形状と配置、出口・使用面、壁飾りと机の独立、服、転居の家具保持、複数月の家賃、JSON不正・保存禁止 |
| 生活の連続プレイ | 成功。三室内見→一室選択→住宅地から商店街へ徒歩→買い物→喫茶店4客と報酬→二件受注・別店舗集荷→海辺→二箇所へ配達→家具・服購入→帰宅→着替え→ごはん・たこめしの手操作と食事→壁・机・小物・床家具の編集→ラジオ購入・机上配置・自宅選曲→睡眠→再読込→転居。途中の場面移動をテスト用瞬間移動で省略していない |
| 公園・会話支援 | 成功。公園まで徒歩、地図のNPC道案内、人物の会話、会話中のW入力で移動しない、日本語の声が無い場合の文字続行・失敗記録、任意転記でIME変換中Enterを無視 |
| 全60人 | 成功。個別の有効なセーブJSONを設定UIから読み込み、本人の近くへ復元し、専用台詞→選択→固有反応を確認。全員への連続徒歩巡回の証拠ではない |
| タッチとJSON | 成功。390×844、Chromiumの実タッチイベントで左スティック移動と右視点、横にはみ出さない、JSONダウンロード／復元、不正JSONで現状維持、削除しても英語版の別キーを保持 |
| 配布HTML | 成功。実ビルドHTMLを一つの応答として渡し、オフライン設定で外部リクエスト0、3D生成・歩行・保存禁止時の待機継続を確認 |
| 衝突・カメラ・破損 | 成功。店舗の壁に前進しても通り抜けない、右ドラッグで壁際の視点変更、壊れた保存の案内と新規内見への復旧 |
| 音楽4ケース | 5音源をネイティブWebAudioで復号・再生し場所と昼夜の切替、同曲の継続、試聴取消、選曲と停止・消音の保存を確認。TTSは検証用音声バックエンドで開始／終了／取消／失敗を制御し、実際のGainNodeの減衰と復元を確認。非表示時のAudioContext停止・再開、再生拒否・音源破損でも待機できることを確認 |
| 配布ZIP | 標準ZIPとしてCRC／内容を検査。`index.html`がビルドHTMLと一致し、遊び方・Three.jsのMITライセンスを含む |
| 英語試作 | リポジトリ基準コミット`9472995`と比較し、`games/english-errands/`の差分なし。日本版は専用保存キーのみを使う |

音楽追加前のブラウザ6ケースは分割した実行でそれぞれ成功した。公園テストの初回は歩行経路上の住民と衝突し停止したため失敗した。衝突を無効化せず、人を避ける実歩行経路に変更した。次の試行では、名簿の折りたたみを開く操作がテスト側に抜けていたため待機失敗。折りたたみを通常のクリックで開く操作を追加し、最後の公園・会話・IMEケースは35秒で成功した。その後v0.2.0で10ケースの一括検証を実行。追加音楽テストの初回にはテスト側の設定ボタン選択が曖昧、TTS検証用オブジェクトの型が不一致、古い保存時刻を比較する問題があり、実際のUI対象と音声バックエンド・保存済みの基準時刻を修正して再確認した。タッチ検証は端末実機ではなくChromiumのエミュレーション。

## 公開配布の確認

v0.2.0の公開更新まで確認した。

- 配布コミット：`bbefa45d50ef39101d8b2ab7385e0a95019b9068`。`gh-pages/japan-life/index.html`と`japan-life/japan-life.zip`だけを更新。
- [実際の配布ZIP](https://raw.githubusercontent.com/ryoujijyouji19941223-lang/language-learning-games/gh-pages/japan-life/japan-life.zip)を通常のHTTPS経路で再取得し、HTTP **200**、**1,876,929 bytes**、検証済みZIPとのバイト一致・CRC・HTML一致を確認。
- ZIPのSHA-256：`9e0c34bc2a34c5ed6558fe750e1fe7a3eb35f304622e3a9f46e7e02edb6473c8`。
- 元の配布ブランチのルート`index.html`、`english-errands.zip`、`.nojekyll`はGitのblob IDが親コミットと同一。v0.1.0の配布追加コミットは`d4c8657`で、その後の更新でも英語版を保持した。
- GitHub Pagesの想定パス`/language-learning-games/japan-life/`は、この管理環境のプロキシがCONNECTを403で拒否するため開けていない。サイトが公開済みとは報告しない。上のZIPダウンロードは別に取得成功を確認した。

クラウド環境の`install_script`と`start_skill`へ、日本版の依存復元・ビルド・開発サーバー・ブラウザ検証の再開手順を保存した。現在の環境で各操作を実行済み。設定の有効化・公開、新しいタスクでの復元は別で、この検証では実行していない。

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
| 卓上ラジオ取得後の自宅選曲 | [16-home-radio.png](evidence/16-home-radio.png) |

## 未実行・限界

- 管理環境のChromiumは`file://`をポリシーで禁止するため、ZIPをPCへ解凍してダブルクリックする操作自体は未確認。単一HTMLの実行は上記の応答方式で確認した。ローカルファイルの保存可否はブラウザによって異なるため、JSON退避を用意した。
- iPhone／Android実機、Safari／Firefox、物理キーボードと実際の日本語IME操作は未確認。IMEの検証はcompositionイベントによる変換中Enterの確認まで。
- 日本語の声が無い環境でのフォールバックを確認した。実際の日本語発声、再聴の聞こえ方、端末の音量・自動再生制限、合成環境音・BGMの実聴は未確認。TTSイベントを制御した検証は実際の日本語発声を確認したものではない。
- 全道路・全角度・長時間のプレイ、実機性能、全仕事12件の連続徒歩完了、全家具を全室へ全配置の総当たりは未確認。共通状態管理は単体テストで補った。
- 日本語・地域表現の本人確認、教材としての自然さや学習効果は自動テストでは確認できない。[残件](PROGRESS.md)に区別して記録。
