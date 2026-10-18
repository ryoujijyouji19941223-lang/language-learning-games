# ギリシャ版：出典と残る不足

2026-10-18。下の出典は、このチャットで行った調査（調査担当がWebで確認した内容の報告）から拾ったもの。制作担当（Claude Code）は、説明文やゲームの事実として使う前に、必要な出典を自分で開いて確認する。確認したら日付を書き足す。

## 1. ギリシャ語の音声（Web Speech API）

| ID | 内容 | 出典 | 状態 |
|---|---|---|---|
| T01 | Windows 10/11 のナレーター用ギリシャ語音声は男性の Stefanos 一つ | [Microsoft Support：Appendix A Supported languages and voices](https://support.microsoft.com/en-us/accessibility/windows/narrator/appendix-a-supported-languages-and-voices) | 調査報告で確認 |
| T02 | Edge はクラウド音声を `speechSynthesis` で開発者に公開。ギリシャ語は `Microsoft Athina Online (Natural)`／`Microsoft Nestoras Online (Natural)` | [Microsoft Edge 公式ブログ（2019-08-14）の紹介記事](https://thenextweb.com/news/microsoft-edge-can-now-read-aloud-websites-with-human-like-voices)、[WebView2Feedback #3091](https://github.com/MicrosoftEdge/WebView2Feedback/issues/3091) | 声の名前は第三者情報。実機で要確認 |
| T03 | Chrome 内蔵の Google 音声にギリシャ語はない。Windows の音声パック（Stefanos）を入れると Chrome にも出る | [talkrapp：speechSynthesis 音声一覧](https://talkrapp.com/speechSynthesis.html)、[Chromium issue 40863647](https://issues.chromium.org/issues/40863647) | 2019～2021年の第三者一覧。**2026年の公式一覧は未確認** |
| T04 | `getVoices()` は最初に空のことがあり、`voiceschanged` を待つ必要がある | [dev.to：Cross-browser speech synthesis](https://dev.to/jankapunkt/cross-browser-speech-synthesis-the-hard-way-and-the-easy-way-353) | 一般的な挙動 |
| T05 | Chrome 71 以降、ユーザー操作なしの `speak()` はエラー | Chrome for Developers「Deprecations and removals in Chrome 71」 | 調査報告で確認 |
| T06 | Windows で音声を追加する手順 | [Windows Loop：Install new TTS voices in Windows 11](https://windowsloop.com/how-to-install-new-tts-voices-in-windows-11/)、[Microsoft Q&A（追加できない事例）](https://learn.microsoft.com/en-us/answers/questions/4129581/cannot-install-new-system-voice-packages) | 手順は版で変わる可能性 |
| T07 | ヘッドレス Chromium では通常音声がない。自動テストではモックする | [Playwright headless の解説](https://www.testmuai.com/learning-hub/playwright-headless/) | 一般的な挙動 |

### 声を選ぶ処理の例（SPEC 15節の実装例）

```js
// src/tts.js（例。TypeScript にしてよい）
const PREFERRED = [/Athina/i, /Nestoras/i, /Stefanos/i];
let voices = [];
let current = null; // 再生が終わるまで保持（onend が呼ばれなくなる問題の対策）

export function initVoices(timeoutMs = 3000) {
  const synth = window.speechSynthesis;
  if (!synth) return Promise.resolve([]);
  synth.addEventListener('voiceschanged', () => { voices = synth.getVoices(); });
  voices = synth.getVoices();
  if (voices.length) return Promise.resolve(voices);
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve((voices = synth.getVoices())), timeoutMs);
    synth.addEventListener('voiceschanged', () => { clearTimeout(t); resolve((voices = synth.getVoices())); }, { once: true });
  });
}

export function pickGreekVoice(list = voices) {
  const el = list.filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith('el'));
  for (const re of PREFERRED) { const v = el.find((x) => re.test(x.name)); if (v) return v; }
  return el[0] ?? null;
}

// クリックなどの操作の中から呼ぶ
export function speakGreek(text, { rate = 1.0 } = {}) {
  if (!('speechSynthesis' in window)) return { ok: false, reason: 'unsupported' };
  const v = pickGreekVoice();
  if (!v) return { ok: false, reason: 'no-greek-voice' };
  speechSynthesis.cancel();
  current = new SpeechSynthesisUtterance(text.normalize('NFC'));
  current.voice = v; current.lang = v.lang; current.rate = rate;
  speechSynthesis.speak(current);
  return { ok: true, voice: v.name };
}
```

### Windows でギリシャ語の声を足す（README に利用者向けに書く）

1. いちばん簡単：Edge で開く（ネット接続があれば追加の設定なしで使える見込み）。
2. Chrome でも使う：設定（Windows + I）→ 時刻と言語 → 音声認識（Speech）→ 音声の管理「音声を追加」→ Greek（Ελληνικά）を追加。
3. ダウンロード後、ブラウザを完全に閉じて開き直す。ゲームの設定で `Microsoft Stefanos` が出れば成功。
4. 入らないとき：時刻と言語 → 言語と地域 → 言語の追加 でギリシャ語を追加し、「テキスト読み上げ」にチェック。

## 2. 文化・料理・価格

| ID | 内容 | 出典 | 状態 |
|---|---|---|---|
| G01 | 町の店の言葉（φούρνος、περίπτερο など） | [GreekPod101：Shops or services in town](https://www.greekpod101.com/lesson/culture-class-essential-greek-vocabulary-22-shops-or-services-in-town) | 調査報告で確認 |
| G02 | λαϊκή（週ごとの露天市場） | [Wikipedia：Laiki agora](https://en.wikipedia.org/wiki/Laiki_agora) | 調査報告で確認 |
| G03 | χωριάτικη σαλάτα の基本材料（トマト、きゅうり、フェタ、オリーブ、玉ねぎ、ピーマン、オリーブオイル、オレガノ、塩）。キクラデスではケイパーを足すことがある。レタスは入れない | [ギリシャ語版 Wikipedia：Χωριάτικη σαλάτα](https://el.wikipedia.org/wiki/%CE%A7%CF%89%CF%81%CE%B9%CE%AC%CF%84%CE%B9%CE%BA%CE%B7_%CF%83%CE%B1%CE%BB%CE%AC%CF%84%CE%B1) | 調査報告で確認 |
| G04 | 屋台料理（スブラキ、τυρόπιτα、κουλούρι） | [Go Greece Now：Greek street food](https://www.gogreecenow.com/en/eat-drink/greek-street-food) | 調査報告で確認 |
| G05 | スブラキの値上がり（地域により €2.30～4.70、島で最大 €5 程度） | [To Vima：souvlaki](https://www.tovima.com/society/souvlaki-greeces-beloved-street-food-now-a-luxury-for-some/) | 価格の目安 |
| G06 | 物価の目安 | [Day Trips from Athens：Athens on a budget](https://daytripsfromathens.com/articles/athens-on-a-budget)、[Far Guides：presupuesto Grecia](https://farguides.com/en/blog/presupuesto-grecia/) | 旅行ガイドの目安 |
| G07 | フレッド・エスプレッソの価格（チェーン店の持ち帰り 2.50 €前後、店内 4 €前後）、一年中飲まれる | 調査報告（Gregory's 公式メニュー、Greek City Times 2024年7月） | 個別ページは未確認 |
| G08 | 手のひらを相手に向けるしぐさ（μούτζα）は侮辱 | [Greek City Times：Greek hand gestures](https://greekcitytimes.com/2026/10/17/greek-hand-gestures)、[Greece for Americans](https://www.greeceforamericans.com/article/greek-etiquette-for-americans) | 調査報告で確認 |
| G09 | 旅行者の失敗例（コーヒーの呼び方、昼の休み時間など） | [Valentina's Travel Guide](https://www.valentinastravelguide.com/mistakes-to-avoid-in-greece/)、[Greece Unfiltered](https://greeceunfiltered.com/what-not-to-do-in-greece/)、[Greek Trip Planner](https://greektriplanner.me/blog/greek-customs-traditions) | 旅行ガイド。地域差あり |

**ゲームに入れる注意**
- NPC の手を振る動きで、手のひらを相手に向けて突き出さない（G08）。
- コーヒーは `ελληνικός καφές`（Greek coffee）と呼ぶ。
- 昼の休み時間・店の営業時間はゲーム用の簡略化として扱う。

## 3. 文字・フォント・技術

| ID | 内容 | 出典 |
|---|---|---|
| X01 | tonos（U+03AC など）と古代用 oxia（U+1F71 など）は見た目が同じ。NFC で oxia は tonos に変わる | [AnyKeyboard：Greek tonos](https://anykeyboard.io/utils/greek-tonos)、[TypeDrawers：tonos and oxia](https://typedrawers.com/discussion/3633/tonos-and-oxia)、[J. K. Tauber：Python, Unicode and Ancient Greek](https://jktauber.com/articles/python-unicode-ancient-greek/) |
| X02 | `lang="el"` の要素に `text-transform: uppercase` を使うとアクセントを外して大文字にするブラウザがある | [MDN：text-transform](https://developer.mozilla.org/en-US/docs/CSS/text-transform)、[W3C i18n tests：case conversion](https://w3.org/International/i18n-tests/results/case-conversion) |
| X03 | Noto Sans 本体がギリシャ文字を含む。Google Fonts に「Noto Sans Greek」という別ファミリーはない | [Noto docs：Use](https://notofonts.github.io/noto-docs/website/use/) |
| X04 | Claude Code の進め方（検証手段を渡す、調べる→計画→実装、CLAUDE.md を短く） | [Anthropic：Claude Code best practices](https://www.anthropic.com/engineering/claude-code-best-practices) |

## 4. 残る不足

- ギリシャ語の会話・看板・品名のネイティブ確認（全部未確認）。
- 行事（8月15日の πανηγύρι、10月28日、クリスマス・新年、Καθαρά Δευτέρα、Πάσχα）の出典確認と説明文。
- Windows 実機（Edge・Chrome）でどのギリシャ語の声が出るか。
- 実在の島の町並み・家・店の写真資料と、素材の利用条件。
- 英語の解説文の範囲（単語の訳だけか、文法の短い説明まで入れるか）は本人と相談。
