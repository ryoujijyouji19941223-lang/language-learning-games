// Money is kept in integer cents and shown the Greek way: "3,50 €".

const fmt = new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR' });

export const euro = (cents: number) => fmt.format(cents / 100);

const UNITS = ['μηδέν', 'ένα', 'δύο', 'τρία', 'τέσσερα', 'πέντε', 'έξι', 'επτά', 'οκτώ', 'εννέα'];
const TEENS = ['δέκα', 'έντεκα', 'δώδεκα', 'δεκατρία', 'δεκατέσσερα', 'δεκαπέντε', 'δεκαέξι', 'δεκαεπτά', 'δεκαοκτώ', 'δεκαεννέα'];
const TENS = ['', '', 'είκοσι', 'τριάντα', 'σαράντα', 'πενήντα', 'εξήντα', 'εβδομήντα', 'ογδόντα', 'ενενήντα'];
const HUNDREDS = ['', 'εκατό', 'διακόσια', 'τριακόσια', 'τετρακόσια', 'πεντακόσια', 'εξακόσια', 'επτακόσια', 'οκτακόσια', 'εννιακόσια'];

/** Cardinal number in neuter gender (ευρώ and λεπτά are neuter). 0–999 999. */
export function greekNumber(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n < 10) return UNITS[n];
  if (n < 20) return TEENS[n - 10];
  if (n < 100) return n % 10 ? `${TENS[Math.floor(n / 10)]} ${UNITS[n % 10]}` : TENS[n / 10];
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const rest = n % 100;
    if (!rest) return HUNDREDS[h];
    return `${h === 1 ? 'εκατόν' : HUNDREDS[h]} ${greekNumber(rest)}`;
  }
  const th = Math.floor(n / 1000);
  const rest = n % 1000;
  // χιλιάδες is feminine: τρεις / τέσσερις / μία
  const fem = greekNumber(th)
    .replace(/δεκατρία$/, 'δεκατρείς').replace(/(^|\s)τρία$/, '$1τρεις')
    .replace(/τέσσερα$/, 'τέσσερις').replace(/(^|\s)ένα$/, '$1μία');
  const head = th === 1 ? 'χίλια' : `${fem} χιλιάδες`;
  return rest ? `${head} ${greekNumber(rest)}` : head;
}

/** Spoken price for the speech synthesiser: "τρία ευρώ και πενήντα λεπτά". */
export function euroSpeech(cents: number): string {
  const e = Math.floor(cents / 100);
  const c = cents % 100;
  const euros = `${greekNumber(e)} ευρώ`;
  if (!c) return euros;
  const lepta = `${greekNumber(c)} ${c === 1 ? 'λεπτό' : 'λεπτά'}`;
  return e ? `${euros} και ${lepta}` : lepta;
}
