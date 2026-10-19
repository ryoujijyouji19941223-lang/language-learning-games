// Text rules (SPEC §16): NFC, modern monotonic accents only, no Greek-extended
// block (U+1F00–U+1FFF) and no Greek question mark U+037E.

export const FORBIDDEN_GREEK = /[ἀ-῿;]/u;

export function textProblem(s: string): string | null {
  if (s !== s.normalize('NFC')) return 'not NFC';
  if (FORBIDDEN_GREEK.test(s)) return 'uses U+1F00–U+1FFF or U+037E';
  return null;
}

/** Every string inside a data structure, with a path for error messages. */
export function collectStrings(value: unknown, path = '$', out: { path: string; value: string }[] = []) {
  if (typeof value === 'string') out.push({ path, value });
  else if (Array.isArray(value)) value.forEach((v, i) => collectStrings(v, `${path}[${i}]`, out));
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) collectStrings(v, `${path}.${k}`, out);
  return out;
}

/** Compare typed Greek: lower case, final sigma, optional accent stripping. */
export function normaliseAnswer(s: string, stripAccents: boolean): string {
  let t = s.normalize('NFC').trim().toLocaleLowerCase('el').replace(/ς/g, 'σ').replace(/\s+/g, ' ').replace(/[.!;,]+$/u, '');
  if (stripAccents) t = t.normalize('NFD').replace(/[́̈]/g, '').normalize('NFC');
  return t;
}

export type AnswerResult = 'exact' | 'accents' | 'wrong';

/** "exact": correct with accents; "accents": right letters, accents missing or wrong (counts as assisted). */
export function checkAnswer(typed: string, expected: string): AnswerResult {
  if (normaliseAnswer(typed, false) === normaliseAnswer(expected, false)) return 'exact';
  if (normaliseAnswer(typed, true) === normaliseAnswer(expected, true)) return 'accents';
  return 'wrong';
}
