import { residents } from "./data.js";
// Original short scripts. The seed line remains attached to its original speaker.
export function conversationFor(id) {
  const p = residents.find((p) => p.id === id);
  if (["p33", "p34"].includes(id))
    return {
      kind: "neighbors",
      lines: [
        { speaker: "p33", text: "晩ごはん、今日は何にしようかな。" },
        {
          speaker: "p34",
          text: "魚屋をのぞいてきたよ。たこめしにしようと思って。",
        },
        { speaker: "p33", text: "いいね。私は野菜を買って帰ろう。" },
      ],
    };
  const lines = [{ speaker: id, text: p.line }];
  if (id === "p01")
    lines.push({
      speaker: id,
      text: "さっき届いた分も並べたところ。よかったら、ゆっくり見ていってね。",
    });
  if (id === "p16")
    lines.push({
      speaker: id,
      text: "今から少し働く？ 四人のお客さんをお願いしたいんだ。",
    });
  return {
    kind: id === "p16" ? "work" : id === "p28" ? "optional" : "listen",
    lines,
  };
}
export const speakerLabel = (id) =>
  residents.find((p) => p.id === id)?.role || "近所の人";
