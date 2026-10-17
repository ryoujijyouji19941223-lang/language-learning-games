# 研究資料

調査・語学全体の継続記録は共通資料庫を参照する。ここには各ゲームの制作仕様と実装を保存する。

- [共通資料庫](https://github.com/ryoujijyouji19941223-lang/totomaru-knowledge-base)
- [学習ゲーム研究 v0.4](https://github.com/ryoujijyouji19941223-lang/totomaru-knowledge-base/blob/main/research/language-learning/LANGUAGE_GAME_REMAKING_RESEARCH_v01.md)
- [継続研究記録](https://github.com/ryoujijyouji19941223-lang/totomaru-knowledge-base/blob/main/research/language-learning/RESEARCH_STATE.md)

2026-10-17時点で研究は、既存作の学習上の役割、教材データと攻略、各言語への再設計、タイピング8種類、学習研究と評価まで。原作全編の実プレイ・内部式全取得・新作の学習効果確認は未完了。

一作目のSPEC.mdは共通資料庫の LANGUAGE_GAME_SERIES_FIRST_SPEC_v01.md から収録したv0.1。制作開始後はこのリポジトリの対象作品のSPECを実装に対する正本とし、変更理由・版を残す。調査上の新発見は共通資料庫へ根拠とともに反映する。


## 街を探索し、依頼を選ぶ配達ゲームの追加調査（2026-10-18）

[研究v0.4の§26–31](https://github.com/ryoujijyouji19941223-lang/totomaru-knowledge-base/blob/main/research/language-learning/LANGUAGE_GAME_REMAKING_RESEARCH_v01.md)へ、街の語学学習・配達・地域文化に関する12作品の比較と18出典を追加。

現在の希望は、ゲーム内スマホで依頼を選び、街を移動して店で品物を伝え、受け取り、届ける遊び。期限・複数受注・経路選択、任意の散策、物・建物の言葉の確認、住民から直接受けるお願い、地域の町の特色を含む。固定画面の12語は旧試作の範囲であり、完成版の目標・教材量・遊びを縛るものではない。

参考の役割：Delivery Simulator（2020）はスマホ受注・複数注文・期限、Parcel Corpsは移動と経路、Noun Townは街と語彙、Wagotabiは現地の地理と文化、Lake等は配達と住民との関わり。すべてを満たす既発売作品は今回の公開資料では確認できていない。Fluent Townの予告を実装確認済み機能と混同しない。

この更新は調査結果と現在の希望の記録。街を探索する版の正式SPEC・コードの改訂は未実施。既存の固定画面試作は現在のREADMEで実装済みと確認したが、今回その実行やテストの独立検証はしていない。
