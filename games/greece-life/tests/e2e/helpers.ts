import { expect, type Page } from '@playwright/test';

/** Fake Web Speech API: records every utterance. `voices` empty = no Greek voice installed. */
export async function mockSpeech(page: Page, voices: { name: string; lang: string }[]) {
  await page.addInitScript((list) => {
    const vs = list.map((v) => ({ ...v, voiceURI: v.name, localService: true, default: false }));
    (window as any).__spoken = [];
    const synth = {
      getVoices: () => vs,
      speak: (u: any) => (window as any).__spoken.push({ text: u.text, lang: u.lang, voice: u.voice?.name, rate: u.rate }),
      cancel() {},
      addEventListener() {},
      speaking: false,
      pending: false,
    };
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    (window as any).SpeechSynthesisUtterance = class { text: string; voice: unknown = null; lang = ''; rate = 1; onend: unknown = null; constructor(t: string) { this.text = t; } };
  }, voices);
}

export const ATHINA = { name: 'Microsoft Athina Online (Natural) - Greek (Greece)', lang: 'el-GR' };

export async function boot(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => (window as any).__greece?.ready, null, { timeout: 120_000 });
}

export const g = <T = any>(page: Page, fn: string, ...args: unknown[]) =>
  page.evaluate(([f, a]) => (window as any).__greece[f as string](...(a as unknown[])), [fn, args] as const) as Promise<T>;

export async function newGameSkipIntro(page: Page) {
  await page.getByTestId('new').click();
  await page.getByTestId('intro-skip').click();
  await expect.poll(() => g(page, 'player').then((p: any) => p.area)).toBe('home:h01');
}

/** Teleport and wait a moment so the interaction prompt updates. */
export async function tp(page: Page, area: string, x: number, z: number, yaw = 0) {
  await g(page, 'teleport', area, x, z, yaw);
  await page.waitForTimeout(350);
}

export async function pressE(page: Page) {
  await page.keyboard.press('e');
  await page.waitForTimeout(250);
}

export async function standAt(page: Page, kind: string, ref: string) {
  const list = await g<any[]>(page, 'interactables');
  const it = list.find((i) => i.kind === kind && i.ref === ref);
  if (!it) throw new Error(`no interactable ${kind}:${ref} in ${await g(page, 'player').then((p: any) => p.area)}`);
  await tp(page, it.area, it.x, it.z, 0);
  return it;
}

export const state = (page: Page) => g<any>(page, 'state');
