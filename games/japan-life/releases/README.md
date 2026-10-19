# 道路と海辺のバス停プレビュー v0.3.2

配布物：`japan-life-streets-preview.zip`。車道の接続・歩道・横断歩道・海岸柵の衝突・屋根付きバス待合所を追加。バスの運行と乗車は未実装。単体47件と影響範囲のブラウザ9件が成功。実行範囲と制限は一つ上のTESTING.md。

ZIPをすべて解凍し、Python 3のある手元のPCで解凍先から実行します（Node.js不要）。

```sh
python3 -m http.server 4182 --bind 127.0.0.1
```

Windowsは`python3`の代わりに`py -3`。同じPCのブラウザで`http://localhost:4182`。直接HTMLを開く方法は管理環境のfile URL禁止で未確認です。別の場所へ記録を移すときは、旧版の設定でJSONを書き出し、新版へ読み込みます。

製品ソースとZIPのコミット：`ee985d6bab0f5c7b1468857bcdfaa3a94e4b968d`。[固定ダウンロードURL](https://raw.githubusercontent.com/ryoujijyouji19941223-lang/language-learning-games/ee985d6bab0f5c7b1468857bcdfaa3a94e4b968d/games/japan-life/releases/japan-life-streets-preview.zip)。4,199,052 bytes、SHA-256 `6a9f2a6c71ba77a99ab6600737d4719679db0c4bb1e1bcacff5a7d1b5cccc419`。GitHubからHTTP200で再取得し、ローカルとのバイト一致・CRC・ビルドHTML一致を確認済み。mainとgh-pagesは更新していません。

以下は以前の配布物の記録です。

# 秋の町と店プレビュー v0.3.1

配布物：`japan-life-rural-preview.zip`。新UI・門・車・生活一巡をブラウザで確認済み（20項目を分割で成功確認）。過去のZIPを新しい版と読み替えない。

ZIPをすべて解凍し、Python 3がある手元のPCで解凍先から実行する（Node.js不要）。

```sh
python3 -m http.server 4182 --bind 127.0.0.1
```

Windowsは`python3`の代わりに`py -3`。同じPCのブラウザで`http://localhost:4182`。直接HTMLを開く方法は管理環境のfile URL禁止で未確認。新しい場所へセーブを移す場合は、前の版の設定でJSONを書き出し、新しい版の設定で読み込む。

SHA-256：`c5e86c18e27a4d0b1bc681c7c3d47629ece5c70be598a82037588f37a662647a`、4,196,453 bytes。CRCと同梱HTMLのビルドとの一致を確認。修正後の配布コミット`170cf50ed8d23f5076cc9eb8c0cfedf20cade1f8`をpushし、[固定URL](https://raw.githubusercontent.com/ryoujijyouji19941223-lang/language-learning-games/170cf50ed8d23f5076cc9eb8c0cfedf20cade1f8/games/japan-life/releases/japan-life-rural-preview.zip)からHTTP200で再取得。バイト一致・CRC・HTML一致を確認済み。ブラウザ20項目は分割で成功確認。詳細はTESTING.md。


## 以前の配布物（v0.3.0）

# 秋の街区プレビュー v0.3.0

2026-10-19 日本時間。ZIPをすべて解凍してください。Node.js不要。直接`index.html`を開けない場合は、解凍先でPython 3を使います。

```sh
python3 -m http.server 4182 --bind 127.0.0.1
```

Windowsは`python3`の代わりに`py -3`。同じPCのブラウザで`http://localhost:4182`を開きます。このHTTP起動は実ブラウザの入居・歩行まで確認済み。管理環境ではfile URLが禁止されており、直接HTML起動は未確認です。外部通信不要の単一HTML。旧セーブの移行は設定のJSON書き出し／読み込みを使ってください。

SHA-256: `fc501f3523b896650df7e4b57d65f18df10459f1db3b8c4b3081da3aa8dedda1`

最新の結果と未確認は一つ上のTESTING.md、素材条件はART_DIRECTION.md、実画面の不足はART_REVIEW.md。Farthest Frontierと同じ完成品質には達していません。旧gh-pages配布とmainは更新していません。

[検証済みZIPの固定ダウンロードURL](https://raw.githubusercontent.com/ryoujijyouji19941223-lang/language-learning-games/e3de39e4882536614082effa29d6dd4d0145e053/games/japan-life/releases/japan-life-autumn-preview.zip)。配布コミット`e3de39e4882536614082effa29d6dd4d0145e053`。GitHubからHTTP200で取得し、上のSHA-256とローカルZIPのバイト一致・CRC・HTML一致を確認しました。
