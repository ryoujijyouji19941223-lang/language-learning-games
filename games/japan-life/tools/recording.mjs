import { mkdtemp, writeFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";

// Actual browser frames, encoded with the installed system ffmpeg. No rendered mockups.
export async function recordBrowser(page, output) {
  const dir = await mkdtemp(join(tmpdir(), "shiomachi-video-")),
    cdp = await page.context().newCDPSession(page),
    frames = [],
    writes = [];
  let previous = -Infinity;
  cdp.on("Page.screencastFrame", (event) => {
    void cdp
      .send("Page.screencastFrameAck", { sessionId: event.sessionId })
      .catch(() => {});
    const timestamp = event.metadata.timestamp;
    if (timestamp - previous < 0.12) return;
    previous = timestamp;
    const path = join(dir, String(frames.length).padStart(5, "0") + ".jpg");
    frames.push({ path, timestamp });
    writes.push(writeFile(path, Buffer.from(event.data, "base64")));
  });
  await cdp.send("Page.startScreencast", {
    format: "jpeg",
    quality: 77,
    maxWidth: 960,
    maxHeight: 600,
    everyNthFrame: 1,
  });
  return async () => {
    await cdp.send("Page.stopScreencast");
    await Promise.all(writes);
    if (frames.length < 2)
      throw Error("No actual browser video frames were captured");
    const list = frames
      .map(
        (f, i) =>
          `file '${f.path}'\nduration ${Math.max(0.04, (frames[i + 1]?.timestamp ?? f.timestamp + 0.2) - f.timestamp)}`,
      )
      .join("\n");
    await writeFile(join(dir, "frames.txt"), list);
    await mkdir(dirname(output), { recursive: true });
    execFileSync("/usr/bin/ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      join(dir, "frames.txt"),
      "-vf",
      "fps=15,format=yuv420p",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "24",
      output,
    ]);
    await cdp.detach();
    await rm(dir, { recursive: true, force: true });
    return {
      frames: frames.length,
      seconds: frames.at(-1).timestamp - frames[0].timestamp,
    };
  };
}
