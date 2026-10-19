# 秋の町と店プレビュー v0.3.1（検証中）

配布物：`japan-life-rural-preview.zip`。現在ブラウザで新UI・門・車・生活機能を再確認中。過去のZIPを新しい版と読み替えない。

ZIPをすべて解凍し、Python 3がある手元のPCで解凍先から実行する（Node.js不要）。

```sh
python3 -m http.server 4182 --bind 127.0.0.1
```

Windowsは`python3`の代わりに`py -3`。同じPCのブラウザで`http://localhost:4182`。直接HTMLを開く方法は管理環境のfile URL禁止で未確認。新しい場所へセーブを移す場合は、前の版の設定でJSONを書き出し、新しい版の設定で読み込む。

SHA-256：`b714c1a9745b371b14a742bb55ea8d2e5bab03bd7b5d1afcf706e80c9333c0a4`、4,196,368 bytes。CRCと同梱HTMLのビルドとの一致を確認。GitHubからの再取得はpush後に確認する。


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
