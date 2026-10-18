# ギリシャ版：初期コンテンツの計画

2026-10-18。SPEC v0.1 の初期データ。店名・人名・台詞はすべて架空の独自原稿。価格・数量・時間はゲーム用の値で、実際の物価・賃金・実用レシピではない（価格は実勢を参考にした目安。RESEARCH.md）。

**ギリシャ語はネイティブ未確認。** Claude Code は文法・アクセント・自然さに疑問があれば直してよいが、直した行を PROGRESS.md に記録する。本人またはネイティブの確認が終わるまで「確認済み」と表示しない。

## 1. 町と店

町：Ασπρόγιαλος（仮）。店名は全部架空。実在店の看板・写真・ロゴを使わない。

| ID | 看板（ギリシャ語） | 英語 | 地区 | 営業（ゲーム用） |
|---|---|---|---|---|
| port_fish | Ιχθυοπωλείο «Ο Γλάρος» | fishmonger "The Seagull" | Λιμάνι | 07:00–14:00、日休 |
| port_taverna | Ψαροταβέρνα «Το Κύμα» | fish taverna "The Wave" | Λιμάνι | 12:00–16:00, 19:00–24:00、毎日 |
| port_depot | Σημείο παραλαβής δεμάτων | parcel pick-up point | Λιμάνι | 08:00–20:00、日休 |
| port_kiosk | Περίπτερο | kiosk | Λιμάνι | 07:00–24:00、毎日 |
| port_tickets | Πρακτορείο εισιτηρίων | ferry ticket agency | Λιμάνι | 見た目と会話だけ |
| agora_bakery | Φούρνος «Το Προζύμι» | bakery "The Sourdough" | Αγορά | 06:00–14:30、日は 07:00–12:00 |
| agora_cafe | Καφετέρια «Μπλε Πόρτα» | café "Blue Door" | Αγορά | 08:00–24:00、毎日 |
| agora_greengrocer | Μανάβικο «Ο Κήπος» | greengrocer "The Garden" | Αγορά | A |
| agora_minimarket | Μίνι μάρκετ «Ήλιος» | mini market "Sun" | Αγορά | 08:00–21:00、日は 10:00–15:00 |
| agora_souvlaki | Σουβλατζίδικο «Η Σούβλα» | souvlaki shop "The Skewer" | Αγορά | 12:00–24:00、毎日 |
| agora_pastry | Ζαχαροπλαστείο «Μέλι» | patisserie "Honey" | Αγορά | 09:00–22:00、毎日 |
| agora_butcher | Κρεοπωλείο | butcher | Αγορά | A |
| agora_cheese | Τυροπωλείο | cheese shop | Αγορά | A |
| agora_furniture | Έπιπλα «Ξύλο & Φως» | furniture "Wood & Light" | Αγορά | A |
| agora_clothes | Ρούχα «Αλάτι» | clothes "Salt" | Αγορά | A |
| agora_florist | Ανθοπωλείο «Βουκαμβίλια» | florist "Bougainvillea" | Αγορά | A |
| agora_home | Είδη σπιτιού «Πηλός» | homeware "Clay" | Αγορά | A |
| agora_laiki | Λαϊκή | open-air market | Αγορά | 毎週土 07:00–14:00 |
| chora_kafeneio | Καφενείο «Η Πλατεία» | coffeehouse "The Square" | Χώρα | 07:00–23:00、毎日 |
| chora_church | Ενορία Αγίου Νικολάου | parish church | Χώρα | 外観と行事 |
| chora_post | Ταχυδρομείο | post office | Χώρα | 08:00–14:00、土日休 |
| chora_townhall | Δημοτικό γραφείο | town office | Χώρα | 08:00–14:00、土日休 |
| chora_pharmacy | Φαρμακείο | pharmacy | Χώρα | A |
| chora_barber | Κουρείο | barber | Χώρα | A |
| chora_books | Βιβλιοπωλείο | bookshop | Χώρα | A |
| chora_guesthouse | Ξενώνας «Αύρα» | guesthouse "Breeze" | Χώρα | 会話だけ |
| home_office | Γραφείο ενοικίων | rental office | Γειτονιά | 09:00–15:00、日休 |
| beach_kantina | Καντίνα | beach snack stand | Παραλία | 10:00–20:00（6～9月のみ） |
| hill_windmill | Ανεμόμυλος | windmill | λόφος | 見晴らし |
| hill_chapel | Εκκλησάκι | small chapel | λόφος | 見晴らし |

**営業A（小さな店のゲーム用の型）**：月・水・土 09:00–15:00／火・木・金 09:00–14:30 と 17:30–20:30／日休。実際の営業時間は店・地域・季節で違う。全ギリシャの決まりとして説明しない。閉店中は `Κλειστό`、営業中は `Ανοιχτό`。

## 2. 食材 32品

価格は1単位。ゲーム内の小分け単位で整数管理。水と氷（`παγάκια`）は台所にあるので買わない。

| ID | ギリシャ語 | 英語 | 価格 | 店 |
|---|---|---|---:|---|
| tomato | ντομάτα | tomato | 0,60 € | 八百屋／λαϊκή |
| cucumber | αγγούρι | cucumber | 0,50 € | 八百屋／λαϊκή |
| onion | κρεμμύδι | onion | 0,30 € | 八百屋／λαϊκή |
| green_pepper | πράσινη πιπεριά | green pepper | 0,40 € | 八百屋／λαϊκή |
| potato | πατάτα | potato | 0,40 € | 八百屋／λαϊκή |
| zucchini | κολοκυθάκι | courgette | 0,50 € | 八百屋／λαϊκή |
| lemon | λεμόνι | lemon | 0,40 € | 八百屋／λαϊκή |
| garlic | σκόρδο | garlic | 0,30 € | 八百屋 |
| dill | άνηθος | dill | 0,60 € | 八百屋 |
| mint | δυόσμος | mint | 0,60 € | 八百屋 |
| parsley | μαϊντανός | parsley | 0,50 € | 八百屋 |
| olives | ελιές | olives | 2,00 € | 八百屋／λαϊκή |
| capers | κάππαρη | capers | 2,50 € | ミニマーケット |
| feta | φέτα | feta cheese | 3,00 € | チーズ屋／ミニマーケット |
| yogurt | στραγγιστό γιαούρτι | strained yoghurt | 1,50 € | ミニマーケット |
| butter | βούτυρο | butter | 1,80 € | ミニマーケット |
| eggs | αυγά | eggs (2) | 0,80 € | ミニマーケット／λαϊκή |
| filo | φύλλο κρούστας | filo pastry | 2,20 € | ミニマーケット |
| flour | αλεύρι | flour | 0,90 € | ミニマーケット |
| rice | ρύζι | rice | 1,20 € | ミニマーケット |
| lentils | φακές | lentils | 1,50 € | ミニマーケット |
| olive_oil | ελαιόλαδο | olive oil | 1,00 € | ミニマーケット |
| vinegar | ξίδι | vinegar | 0,50 € | ミニマーケット |
| salt | αλάτι | salt | 0,30 € | ミニマーケット |
| oregano | ρίγανη | oregano | 1,00 € | ミニマーケット／λαϊκή |
| honey | θυμαρίσιο μέλι | thyme honey | 4,50 € | ミニマーケット／λαϊκή |
| walnuts | καρύδια | walnuts | 2,50 € | ミニマーケット |
| pita | πίτα | pita bread | 0,40 € | 肉屋／ミニマーケット |
| pork | χοιρινό | pork | 2,50 € | 肉屋 |
| octopus | χταπόδι | octopus | 6,00 € | 魚屋 |
| sardines | σαρδέλες | sardines | 3,00 € | 魚屋 |
| coffee_greek | ελληνικός καφές | Greek coffee (ground) | 2,50 € | ミニマーケット |

新規開始時の所持：salt 3、olive_oil 3、oregano 1、coffee_greek 1、ζάχαρη（砂糖、台所の常備扱い）。他は買う。

すぐ食べられる買い物（料理ではない）：κουλούρι 0,50 €、τυρόπιτα 2,00 €、μπουγάτσα 2,50 €、σουβλάκι πίτα 3,50 €、φρέντο εσπρέσο 3,00 €、μπακλαβάς 2,50 €、νερό 0,50 €、τοστ 2,50 €。

## 3. 料理 13品（自宅の台所）

数量と時間はゲーム用。台所の初期器具：コンロ（`κουζίνα`）、オーブン（`φούρνος`）、まな板、鍋、フライパン、`μπρίκι`（ギリシャコーヒー用の小鍋）。`ψησταριά`（炭火グリル）は家具店で 45 € の道具として買い、バルコニーか中庭に置く（h01・h03 は台所のグリル板で代用可）。

| ID | 料理 | 英語 | 材料（ID:数） | 工程（簡略） | 時間／完成数 |
|---|---|---|---|---|---|
| r01 | Χωριάτικη σαλάτα | Greek village salad | tomato:2, cucumber:1, onion:1, green_pepper:1, olives:1, feta:1, oregano:1, olive_oil:1 | 切る → 器に盛る → フェタを塊のまま上にのせる → オレガノ → オリーブオイル | 10分／2皿 |
| r02 | Τζατζίκι | tzatziki | yogurt:1, cucumber:1, garlic:1, olive_oil:1, dill:1 | きゅうりをすりおろして水気を切る → にんにく → 混ぜる → オイル | 10分／2皿 |
| r03 | Τυρόπιτα (ταψί) | cheese pie (tray) | filo:1, feta:2, eggs:1, butter:1 | 具を混ぜる → 生地を重ねる → 具を入れる → 焼く | 50分／4切れ |
| r04 | Ελληνικός καφές | Greek coffee | coffee_greek:1 | 水と粉（と砂糖）を μπρίκι へ → 弱火 → 泡（`καϊμάκι`）が上がったら止める → 注ぐ | 5分／1杯 |
| r05 | Σουβλάκι πίτα | souvlaki wrap | pita:1, pork:1, tomato:1, onion:1, 完成品 r02:1, r13:1 | 串を焼く → ピタを温める → 具を巻く | 20分／2本 |
| r06 | Φακές | lentil soup | lentils:1, onion:1, garlic:1, olive_oil:1, vinegar:1 | 煮る → 具を足す → 最後に酢を少し | 45分／3杯 |
| r07 | Γεμιστά | stuffed tomatoes & peppers | tomato:3, green_pepper:2, rice:1, onion:1, parsley:1, mint:1, olive_oil:2, potato:1 | 中をくりぬく → 米と具を詰める → じゃがいもと並べる → オーブン | 80分／3皿 |
| r08 | Κολοκυθοκεφτέδες | courgette fritters | zucchini:2, feta:1, eggs:1, flour:1, mint:1, onion:1, olive_oil:1 | すりおろして水気を切る → 混ぜる → 丸めて焼く | 30分／2皿 |
| r09 | Χταπόδι στα κάρβουνα | grilled octopus | octopus:1, olive_oil:1, lemon:1, oregano:1, vinegar:1 | 下ゆで → 切る → グリル → オイルとレモン | 60分／2皿 |
| r10 | Σαρδέλες ψητές | grilled sardines | sardines:1, salt:1, olive_oil:1, lemon:1 | 塩をふる → グリル → レモン | 20分／2皿 |
| r11 | Γιαούρτι με μέλι και καρύδια | yoghurt with honey & walnuts | yogurt:1, honey:1, walnuts:1 | 器に盛る → はちみつ → くるみ | 5分／2皿 |
| r12 | Ταραμοσαλάτα | fish roe dip | M3で材料（`ταραμάς`）追加後に有効化 | — | M3 |
| r13 | Πατάτες τηγανητές | fried potatoes | potato:2, olive_oil:1, salt:1 | 切る → 揚げる → 塩 | 20分／2皿 |

- r05 は完成品 r02 と r13 を材料に使う（料理の組み合わせを体験させる）。完成品と食材はIDを分ける。
- r01 にレタスを入れない。キクラデス風の任意材料として capers を足せる（RESEARCH.md G03）。
- r12 は名前だけ登録し、M2では「材料がまだ売っていない」と表示して選べない。M2の合格は他の12品で判定。
- 実在の家庭・地域で作り方は違う。ゲームの工程は省略版と表示する。

## 4. 家具 40種

床は0.5mマス。価格はゲーム用。「外」はバルコニー・中庭にも置ける。

| ID | ギリシャ語 | 英語 | 設置・占有 | 価格 |
|---|---|---|---|---:|
| f01 | Μονό κρεβάτι | single bed | 床2×4、使用位置あり | 120 € |
| f02 | Διπλό κρεβάτι | double bed | 床3×4、使用位置あり | 180 € |
| f03 | Γραφείο | desk | 床2×2 | 70 € |
| f04 | Καρέκλα | chair | 床1×1、座る | 25 € |
| f05 | Ψάθινη καρέκλα | rush-seat chair | 床1×1、座る、外 | 35 € |
| f06 | Τραπέζι φαγητού | dining table | 床2×3 | 90 € |
| f07 | Τραπεζάκι σαλονιού | coffee table | 床2×2 | 45 € |
| f08 | Καναπές | sofa | 床4×2、座る | 160 € |
| f09 | Πολυθρόνα | armchair | 床2×2、座る | 85 € |
| f10 | Ντουλάπα | wardrobe | 床2×1、高い、着替え | 110 € |
| f11 | Συρταριέρα | chest of drawers | 床2×1 | 65 € |
| f12 | Βιβλιοθήκη | bookcase | 床2×1、高い | 60 € |
| f13 | Κομοδίνο | bedside table | 床1×1、小物の置き場1 | 30 € |
| f14 | Μπαούλο | wooden chest | 床2×1 | 55 € |
| f15 | Πουφ | pouffe | 床1×1、座る | 20 € |
| f16 | Κρεμάστρα | coat stand | 床1×1、高い | 22 € |
| f17 | Φωτιστικό δαπέδου | floor lamp | 床1×1 | 40 € |
| f18 | Κουρελού | rag rug | 床2×3、敷物（上に家具可） | 30 € |
| f19 | Μπλε χαλί | blue rug | 床3×3、敷物（上に家具可） | 50 € |
| f20 | Ψάθινο καλάθι | wicker basket | 床1×1 | 12 € |
| f21 | Γλάστρα με βασιλικό | pot of basil | 床1×1、外 | 8 € |
| f22 | Γλάστρα με γεράνι | pot of geraniums | 床1×1、外 | 10 € |
| f23 | Λεμονιά σε γλάστρα | potted lemon tree | 床1×1、高い、外 | 35 € |
| f24 | Βουκαμβίλια σε γλάστρα | potted bougainvillea | 床1×1、高い、外 | 30 € |
| f25 | Τραπεζάκι μπαλκονιού | bistro table | 床1×1、外 | 30 € |
| f26 | Ψησταριά | charcoal grill | 床1×2、外、料理道具 | 45 € |
| f27 | Καθρέφτης | mirror | 壁1×2 | 35 € |
| f28 | Ρολόι τοίχου | wall clock | 壁1×1 | 18 € |
| f29 | Πίνακας με καΐκι | painting of a caique | 壁2×2 | 40 € |
| f30 | Πίνακας με ανεμόμυλο | painting of a windmill | 壁2×2 | 40 € |
| f31 | Χάρτης του νησιού | map of the island | 壁2×2 | 15 € |
| f32 | Ράφι τοίχου | wall shelf | 壁2×1 | 25 € |
| f33 | Ματάκι | evil-eye charm | 壁1×1 | 6 € |
| f34 | Κεραμικό πιάτο | decorative ceramic plate | 壁1×1 | 20 € |
| f35 | Λευκή κουρτίνα | white curtain | 窓 | 25 € |
| f36 | Μπλε κουρτίνα | blue curtain | 窓 | 25 € |
| f37 | Κουρτίνα με δαντέλα | lace curtain | 窓 | 30 € |
| f38 | Κομπολόι | worry beads | 机上の置き場 | 10 € |
| f39 | Βάζο με λουλούδια | vase of flowers | 机上の置き場 | 14 € |
| f40 | Φανάρι με κερί | candle lantern | 机上の置き場 | 16 € |

- 初期所有：f01・f03・f04 を1つずつ、f35 を窓の数だけ。
- 家具店（agora_furniture）：f01–f20, f25–f28, f32。花屋：f21–f24、f39。雑貨店：f29–f31、f33、f34、f37、f38、f40。カーテン f35・f36 は家具店と雑貨店の両方。
- 買ったとき店員が `Με γεια!`（新しい物を手に入れた人へのお祝いの言葉）と言う。

## 5. 服 20点

| 枠 | ID と品（ギリシャ語／英語） | 価格の目安 |
|---|---|---|
| 上 | c01 Λευκό μπλουζάκι / white T-shirt、c02 Λινό πουκάμισο / linen shirt、c03 Ριγέ μπλούζα / striped top、c04 Φούτερ / sweatshirt、c05 Πλεκτή ζακέτα / knitted cardigan、c06 Αμάνικο / sleeveless top、c07 Αδιάβροχο μπουφάν / rain jacket | 12–45 € |
| 下 | c08 Λινό παντελόνι / linen trousers、c09 Τζιν / jeans、c10 Σορτς / shorts、c11 Βερμούδα / knee-length shorts、c12 Μακριά φούστα / long skirt、c13 Μαγιό / swimwear | 15–40 € |
| 靴 | c14 Δερμάτινα σανδάλια / leather sandals、c15 Αθλητικά / trainers、c16 Εσπαντρίγιες / espadrilles、c17 Μποτάκια / ankle boots | 20–60 € |
| 小物 | c18 Ψάθινο καπέλο / straw hat、c19 Καπέλο ψαρά / fisherman's cap、c20 Γυαλιά ηλίου / sunglasses | 8–25 € |

初期の着用：c01、c09、c15。服は服店で買い、ντουλάπα（f10）か着替えメニューで着る。M2ではワードローブがなくても部屋のメニューで着替えられる。

## 6. 住民 72人と最初の一言

全員架空。外見は現代の普段着を基本に、役割と暮らしが分かる色・髪・体形・小物で見分ける。Claude Code は各人の話題に合う返答2～3個と短い反応を作り、会話データへ書く（M2）。全員の一言は独自原稿でネイティブ未確認。

### Λιμάνι（港）15人

| ID | 名前／役割 | 最初の一言 | English |
|---|---|---|---|
| g01 | Μανώλης／ψαράς（漁師） | Σήμερα το πρωί η θάλασσα ήταν λάδι. | The sea was as smooth as oil this morning. |
| g02 | Κατερίνα／ιχθυοπώλισσα（魚屋） | Φρέσκα είναι, από το πρωί. Τι θα πάρεις; | They're fresh, from this morning. What will you have? |
| g03 | Σταύρος／καπετάνιος（船長） | Το πλοίο για τον Πειραιά αργεί λίγο σήμερα. | The ferry to Piraeus is a bit late today. |
| g04 | Ελένη／切符売り場 | Αν ταξιδεύεις, κράτα το εισιτήριο κοντά σου. | If you're travelling, keep your ticket close. |
| g05 | Γιάννης／集荷場の受付 | Έχω δύο δέματα για τη Χώρα. Τα παίρνεις; | I've got two parcels for the Chora. Will you take them? |
| g06 | Δέσποινα／διανομέας（配達員） | Από τα σκαλάκια πίσω από την εκκλησία κόβεις δρόμο. | The little steps behind the church are a shortcut. |
| g07 | Παναγιώτης／防波堤に座る年金生活者 | Κάθε απόγευμα έρχομαι εδώ να δω τα καΐκια. | Every afternoon I come here to watch the boats. |
| g08 | Χρυσούλα／網を繕う人 | Αυτό το δίχτυ θέλει υπομονή. Πολλή υπομονή. | This net needs patience. Lots of patience. |
| g09 | Νίκος／写真好き | Το φως εδώ το απόγευμα είναι απίστευτο. | The light here in the afternoon is incredible. |
| g10 | Αργυρώ／港の περίπτερο | Νερό, εφημερίδα, κάρτα; Όλα τα έχει το περίπτερο. | Water, a newspaper, a postcard? The kiosk has it all. |
| g11 | Θανάσης／船の整備 | Αυτή η μηχανή είναι παλιά, αλλά δουλεύει σαν ρολόι. | This engine is old, but it runs like clockwork. |
| g12 | Μαρίνα／タベルナの店主 | Απόψε έχουμε φρέσκο χταπόδι στα κάρβουνα. | Tonight we have fresh grilled octopus. |
| g13 | Κώστας／タベルナの給仕 | Καλησπέρα! Για πόσα άτομα; | Good evening! For how many people? |
| g14 | Ρένα／タベルナの料理人 | Το μυστικό είναι το καλό λάδι. Τίποτα άλλο. | The secret is good olive oil. Nothing else. |
| g15 | Αλέκος／猫と暮らす漁師 | Η γάτα μου ξέρει πότε γυρίζει η βάρκα. Δεν ξέρω πώς. | My cat knows when the boat comes back. I don't know how. |

### Αγορά（商店通り）16人

| ID | 名前／役割 | 最初の一言 | English |
|---|---|---|---|
| g16 | Βασίλης／パン屋の主人 | Η τυρόπιτα βγήκε τώρα από τον φούρνο. Ζεστή ακόμα! | The cheese pie just came out of the oven. Still warm! |
| g17 | Σοφία／パン屋の店員 | Κουλούρι ή κάτι γλυκό; Πες μου. | A koulouri or something sweet? Tell me. |
| g18 | Λευτέρης／喫茶店の主人 | Ο φρέντο εσπρέσο θέλει καλό χτύπημα. Αυτό είναι όλο. | A freddo espresso needs a good shake. That's all. |
| g19 | Ιωάννα／バリスタ | Τον θέλεις σκέτο, μέτριο ή γλυκό; | Do you want it unsweetened, medium or sweet? |
| g20 | Μιχάλης／八百屋 | Οι ντομάτες σήμερα είναι από το χωριό. Μύρισέ τες! | Today's tomatoes are from the village. Smell them! |
| g21 | Φωτεινή／ミニマーケット | Αν δεν βρίσκεις κάτι, ρώτα με. Είναι κάπου εδώ. | If you can't find something, ask me. It's around here somewhere. |
| g22 | Τάσος／スブラキ屋 | Πίτα με όλα; Τζατζίκι, ντομάτα, κρεμμύδι; | Pita with everything? Tzatziki, tomato, onion? |
| g23 | Ευαγγελία／菓子職人 | Δοκίμασε μια μπουγάτσα. Δεν θα το μετανιώσεις. | Try a bougatsa. You won't regret it. |
| g24 | Ηλίας／家具店の主人 | Μέτρησες το δωμάτιό σου; Ο καναπές είναι μεγάλος. | Did you measure your room? The sofa is big. |
| g25 | Άννα／家具店の手伝い | Αν θέλεις, σου το φέρνω στο σπίτι. | If you like, I'll bring it to your home. |
| g26 | Ζωή／服店の主人 | Αυτό το χρώμα σού πάει πολύ. | That colour really suits you. |
| g27 | Στέλιος／花屋 | Ένας βασιλικός στο μπαλκόνι, και το σπίτι αλλάζει. | One basil plant on the balcony and the home changes. |
| g28 | Λίνα／雑貨店 | Τα κεραμικά αυτά τα φτιάχνει μια κυρία από το νησί. | A lady from the island makes these ceramics. |
| g29 | Πέτρος／肉屋 | Για σουβλάκι θέλεις χοιρινό. Πόσο να σου βάλω; | For souvlaki you want pork. How much shall I give you? |
| g30 | Μαρία／チーズ屋 | Αυτή η φέτα είναι από πρόβειο γάλα. Δοκίμασε. | This feta is made from sheep's milk. Have a taste. |
| g31 | Αντώνης／喫茶店の常連 | Κάθε πρωί, ίδιο τραπέζι, ίδιος καφές. | Every morning, same table, same coffee. |

### Χώρα（旧市街と広場）14人

| ID | 名前／役割 | 最初の一言 | English |
|---|---|---|---|
| g32 | Γεωργία／καφενείο の店主 | Ελληνικό καφέ; Τον φτιάχνω στο μπρίκι, όπως παλιά. | Greek coffee? I make it in the briki, the old way. |
| g33 | Μπάμπης／τάβλι 好きの年配 | Παίζεις τάβλι; Κάθισε, θα σου μάθω. | Do you play backgammon? Sit down, I'll teach you. |
| g34 | Θοδωρής／τάβλι 仲間 | Πάλι κέρδισε ο Μπάμπης. Πάλι! | Babis won again. Again! |
| g35 | π. Νικόλαος／教区の司祭 | Η καμπάνα χτυπάει κάθε Κυριακή πρωί. | The bell rings every Sunday morning. |
| g36 | Ευτυχία／鉢植えの多い家の人 | Τα γεράνια μου θέλουν νερό κάθε απόγευμα. | My geraniums need water every afternoon. |
| g37 | Άρης／小学校の先生 | Το σχολείο κλείνει νωρίς σήμερα. Τα παιδιά χάρηκαν! | School closes early today. The kids were happy! |
| g38 | Βούλα／郵便局 | Για γράμμα ή για δέμα; Πάρε χαρτάκι από το μηχάνημα. | For a letter or a parcel? Take a ticket from the machine. |
| g39 | Σπύρος／薬剤師 | Αν σε πείραξε ο ήλιος, φόρα καπέλο. | If the sun's bothering you, wear a hat. |
| g40 | Δήμητρα／役場の窓口 | Το πανηγύρι του Αυγούστου θέλει πολλή προετοιμασία. | The August festival takes a lot of preparation. |
| g41 | Λευτερία／扉を塗る画家 | Το μπλε στις πόρτες εδώ έχει κάθε φορά άλλη απόχρωση. | The blue on the doors here is a different shade every time. |
| g42 | Φίλιππος／ブズーキ弾き | Το βράδυ θα παίξω λίγο στην πλατεία. Έλα. | I'll play a bit in the square tonight. Come. |
| g43 | Ευανθία／民宿の主人 | Το καλοκαίρι γεμίζουμε. Τώρα έχει ησυχία. | In summer we're full. Now it's quiet. |
| g44 | Λάμπρος／床屋 | Λίγο κοντά στο πλάι; Ή όπως πάντα; | A bit short at the sides? Or the usual? |
| g45 | Ροδάνθη／本屋 | Έχουμε και βιβλία στα αγγλικά, αν θέλεις. | We also have books in English, if you like. |

### Γειτονιά（住宅地）15人

| ID | 名前／役割 | 最初の一言 | English |
|---|---|---|---|
| g46 | Ουρανία／大家さん（賃貸窓口） | Θέλεις να δεις το δωμάτιο; Έχω τα κλειδιά εδώ. | Want to see the room? I have the keys here. |
| g47 | Χρήστος／建物の持ち主 | Αν χαλάσει κάτι, πάρε με τηλέφωνο. | If anything breaks, give me a call. |
| g48 | Μελίνα／隣の人 | Καλώς ήρθες στη γειτονιά! Μένω δίπλα. | Welcome to the neighbourhood! I live next door. |
| g49 | Τάκης／料理好き | Έφτιαξα γεμιστά. Πολλά. Θέλεις λίγα; | I made stuffed vegetables. Lots. Want some? |
| g50 | Νεφέλη／学生 | Διαβάζω για εξετάσεις. Μετά, θάλασσα! | I'm studying for exams. After that, the sea! |
| g51 | Γρηγόρης／港の夜勤 | Δουλεύω νύχτα. Τώρα για μένα είναι «πρωί». | I work nights. For me it's "morning" now. |
| g52 | Αθηνά／家庭菜園 | Η ντοματιά μου έβγαλε επιτέλους ντομάτες! | My tomato plant finally gave tomatoes! |
| g53 | Μάρκος／自転車好き | Η ανηφόρα για τον μύλο με κουράζει κάθε φορά. | The climb to the windmill tires me out every time. |
| g54 | Ξανθή／猫の世話をする人 | Αυτές οι γάτες δεν είναι δικές μου. Αλλά και λίγο δικές μου. | These cats aren't mine. But also a little bit mine. |
| g55 | Ορέστης／最近越してきた人 | Ακόμα χάνομαι στα στενά. Όλα μοιάζουν ίδια! | I still get lost in the alleys. They all look the same! |
| g56 | Πολυξένη／編み物好き | Πλέκω ένα κασκόλ. Ο χειμώνας εδώ έχει αέρα. | I'm knitting a scarf. Winter here is windy. |
| g57 | Ζήσης／何でも直す職人 | Ένα ράφι; Δυο βίδες και τελειώσαμε. | A shelf? Two screws and we're done. |
| g58 | Βαγγελιώ／おもてなし好きの年配 | Πάρε ένα γλυκό του κουταλιού. Το έφτιαξα μόνη μου. | Have a spoon sweet. I made it myself. |
| g59 | Λουκάς／若い料理人 | Θέλω κάποτε να ανοίξω δικό μου μαγαζί. | Someday I want to open my own place. |
| g60 | Ηρώ／ピアノの先生 | Αν ακούσεις πιάνο το απόγευμα, είμαι εγώ. Συγγνώμη! | If you hear a piano in the afternoon, it's me. Sorry! |

### Παραλία & λόφος（浜と丘）12人

| ID | 名前／役割 | 最初の一言 | English |
|---|---|---|---|
| g61 | Ανδρέας／ライフガード | Σήμερα έχει λίγο κύμα. Πρόσεχε. | There are some waves today. Be careful. |
| g62 | Ιφιγένεια／浜の καντίνα | Κρύο νερό, φραπέ, τοστ. Τι θες; | Cold water, frappé, toastie. What do you want? |
| g63 | Μιλτιάδης／一年中泳ぐ人 | Κολυμπάω κάθε μέρα, και τον Γενάρη! | I swim every day, even in January! |
| g64 | Σταματία／小石を集める人 | Κοίτα αυτό το βότσαλο. Είναι σαν καρδιά. | Look at this pebble. It's like a heart. |
| g65 | Αριστείδης／風車の番 | Ο μύλος δεν αλέθει πια, αλλά τον φροντίζουμε. | The mill doesn't grind any more, but we look after it. |
| g66 | Καλλιόπη／ヤギ飼い | Οι κατσίκες ξέρουν τον δρόμο καλύτερα από μένα. | The goats know the way better than I do. |
| g67 | Ευάγγελος／養蜂家 | Το θυμαρίσιο μέλι του νησιού είναι το καλύτερο. | The island's thyme honey is the best. |
| g68 | Ασπασία／礼拝堂の世話をする人 | Από εδώ πάνω φαίνεται όλο το λιμάνι. | From up here you can see the whole harbour. |
| g69 | Περικλής／山歩き好き | Το μονοπάτι για τον φάρο είναι όμορφο, αλλά πάρε νερό. | The path to the lighthouse is lovely, but take water. |
| g70 | Δανάη／夕日を描く人 | Περιμένω το ηλιοβασίλεμα. Κάθε μέρα είναι διαφορετικό. | I'm waiting for the sunset. It's different every day. |
| g71 | Τίμος／素潜り好き | Τα ψάρια σήμερα κρύβονταν. Αύριο πάλι. | The fish were hiding today. Again tomorrow. |
| g72 | Ευδοκία／浜でヨガをする人 | Ο ήχος των κυμάτων με ηρεμεί. | The sound of the waves calms me. |

- 各地区の住民は朝・昼・夕・夜で職場・買い物・散歩・自宅の入口を回る。昼の休み時間は家の近くにいる人が多い。
- 名簿は定住者。日替わりの通行人は人数に含めない。
- 店の人は営業中は店、閉店後は町を歩く。
- M2の返答の作り方：共感、別の好み、やんわり苦手、質問、今はやめておく、などから話題に合うものを選ぶ。どれも成立する返答にする。

## 7. 会話と仕事の初期例

### 喫茶店の注文（意味と行動の対応）

| 客の言葉 | English | 作る物 |
|---|---|---|
| Έναν φρέντο εσπρέσο μέτριο, παρακαλώ. | One medium-sweet freddo espresso, please. | φρέντο εσπρέσο・砂糖普通・店内 |
| Δύο φραπέδες, έναν γλυκό κι έναν σκέτο. Πακέτο. | Two frappés, one sweet and one unsweetened. To go. | φραπέ2・甘い1と無糖1・持ち帰り |
| Έναν ελληνικό σκέτο, εδώ. | One unsweetened Greek coffee, here. | ελληνικός καφές・無糖・店内 |
| Έναν φρέντο καπουτσίνο γλυκό. Και ένα νερό. | One sweet freddo cappuccino. And a water. | φρέντο καπουτσίνο・甘い＋水 |
| Μπορείτε να τον κάνετε μέτριο; | Could you make it medium-sweet? | 直前の注文の砂糖を変える（文脈あり） |

最後の行は直前の注文を受けた文脈でだけ出す。完成前に意味と表示を人が確認する。

### 短い雑談の例

g31「Κάθε πρωί, ίδιο τραπέζι, ίδιος καφές.」
1. `Σε καταλαβαίνω. Μου αρέσει η ρουτίνα.`（I get it. I like routine.）→「Ε, βέβαια. Έτσι ξεκινάει καλά η μέρα.」
2. `Εγώ προτιμώ να αλλάζω καφέ.`（I prefer changing my coffee.）→「Κι αυτό ωραίο. Τι πίνεις σήμερα;」
3. `Δεν πίνω πολύ καφέ, για να πω την αλήθεια.`（To be honest, I don't drink much coffee.）→「Α, δεν πειράζει! Έχει και χυμό εδώ.」

返答のあと会話を必ず続ける必要はない。プレイヤーは「Τα λέμε!」などで終えられる。

### 配達

集荷点は8か所（集荷場、パン屋、八百屋、ミニマーケット、家具店、雑貨店、花屋、薬局）、届け先は住民の家の入口・店・港・礼拝堂など16か所から組み合わせる。品名・数・店・届け先・距離をデータで一致させる。荷札はギリシャ語（例：`2 × Τυρόπιτα → Οδός Ανέμων 5`）で、英語訳を見られる。

## 8. 行事と季節

| 時期（ゲーム暦） | 名前 | 種類 | 町で起きること |
|---|---|---|---|
| 5月1日（開始日） | Πρωτομαγιά | 実在の習慣 | 花屋で花輪（`μαγιάτικο στεφάνι`）を作って部屋の壁に飾れる |
| 毎週土曜 | Λαϊκή | 町の日常 | 通りに市場。野菜・果物・はちみつが少し安い |
| 6月下旬 | Γιορτή της Σαρδέλας | **ゲーム独自** | 港でいわしを焼く夕べ。短い手伝い仕事 |
| 8月15日前後 | Πανηγύρι της Παναγίας | 実在の習慣（要確認） | 広場と礼拝堂で音楽・踊り・食べ物。民宿が満室 |
| 8月 | Μελτέμι の日 | 天気 | 強い北風。浜の καντίνα が早じまいする日がある |
| 10月28日 | Επέτειος του «Όχι» | 実在の祝日（要確認） | 旗と行進。店の一部が休み |
| 12月 | Χριστούγεννα | 実在の習慣（要確認） | 広場に飾りの船（`καραβάκι`）、菓子屋に `μελομακάρονα` と `κουραμπιέδες` |
| 1月1日 | Πρωτοχρονιά | 実在の習慣（要確認） | `βασιλόπιτα` を切って硬貨（`φλουρί`）が入っていたら幸運 |
| 早春（ゲーム暦で固定） | Καθαρά Δευτέρα | 実在の移動祝日（要確認） | 丘で凧（`χαρταετός`）あげ、`λαγάνα` というパン |
| 春（ゲーム暦で固定） | Πάσχα | 実在の移動祝日（要確認） | 赤い卵、`τσουρέκι`。M3 で詳しく |

- 「要確認」は M3 で出典を調べてから説明文を付ける。M2 では名前と飾りだけでよい。
- 移動祝日をゲーム暦の固定日にしたことを画面の説明で明記する。
- 毎日を行事にしない。不参加でも罰しない。

## 9. 未完成の内容と検証

この計画は完成したギリシャ語教材や全会話集ではない。M2で使う返答、看板・物の説明、依頼の具体文は制作時に追加し、どれを追加したか記録する。

全データについて、参照ID、数量、商品と店の対応、部屋に置けること、人物の居場所と台詞の矛盾、文字の正規化（NFC、古代用文字・U+037E なし）をテストで確認する。数だけ満たす無意味な短文を増やさない。
