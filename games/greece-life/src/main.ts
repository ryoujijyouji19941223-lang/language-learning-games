// Ασπρόγιαλος (greece-life) — game entry: builds the world, runs the clock,
// reads input, routes interactions to panels and saves.

import './style.css';
import * as THREE from 'three';
import { Speech } from './tts';
import { Ambient } from './audio';
import { buildTown, type TownWorld } from './world/town3d';
import { buildInterior } from './world/interiors';
import { buildHome, type HomeArea } from './world/home3d';
import { People } from './world/people3d';
import { PlayerModel } from './world/characters';
import { Sky } from './world/sky';
import { CameraRig, moveWithCollisions, groundY, WALK_SPEED, RUN_SPEED } from './world/motion';
import { getLayout, districtAt } from './world/layout';
import type { Area, Interactable } from './world/types';
import { UI, h, en, button, ask } from './ui/dom';
import type { Ctx, WorldApi } from './ui/ctx';
import { Hud } from './ui/hud';
import { showTitle, showIntro } from './ui/title';
import { openTalk } from './ui/talk';
import { openShop } from './ui/shop';
import { openRental } from './ui/rental';
import { openKitchen } from './ui/cooking';
import { openBag } from './ui/bag';
import { openPhone } from './ui/phone';
import { openMap } from './ui/map';
import { openSettings } from './ui/settings';
import { openLexicon } from './ui/lexicon';
import { openEdit } from './ui/edit';
import { openJob } from './ui/jobs';
import { newGame, type GameState, type Result, tx } from './core/state';
import { readSave, writeSave } from './core/save';
import { advance, sleep, waitHour } from './core/time';
import { refreshOffers, deliverParcel, destLabel, parcelLabel } from './core/delivery';
import { rentHome } from './core/housing';
import { whyNotStart, startJob } from './core/jobs';
import { noteWord, type LexKind } from './core/lexicon';
import { isOpen, hoursToday } from './core/hours';
import { dateOf, GAME_MINUTES_PER_REAL_SECOND } from './core/calendar';
import { coastZ, clamp } from './core/geo';
import { weatherAt, weatherText } from './core/weather';
import { SHOP_BY_ID, DISTRICTS, OPEN_SIGN } from './data/shops';
import { HOME_BY_ID } from './data/homes';
import { NPC_BY_ID } from './data/npcs';
import { VOICE_HELP, UI as UIL } from './data/phrases';
import { JOBS } from './data/jobs';
import { DELIVERY_LINES } from './data/deliveries';
import { euro } from './core/money';
import { pointInShape } from './core/geo';

type Vec = { x: number; z: number };

class Game implements Ctx {
  state: GameState = newGame();
  ui: UI;
  speech = Speech.fromWindow();
  ambient = new Ambient();
  world!: WorldApi;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2500);
  private rig: CameraRig;
  private sky: Sky;
  private town!: TownWorld;
  private areas = new Map<string, Area>();
  private homes = new Map<string, HomeArea>();
  private people!: People;
  private player!: PlayerModel;
  private pos = new THREE.Vector3();
  private yaw = 0;
  private walkPhase = 0;
  private speed = 0;
  private areaId = 'town';
  private keys = new Set<string>();
  private playing = false;
  private viewing: string | null = null;
  private editing = false;
  private hud!: Hud;
  private npcShapes: import('./core/geo').Shape[] = [];
  private npcInteract: Interactable[] = [];
  private nearest: Interactable | null = null;
  private lastSave = 0;
  private lastVoiceHelp = -Infinity;
  private autopilot: { pts: Vec[]; i: number; run: boolean; resolve: (r: { ok: boolean; at: Vec }) => void; lastProgress: number; best: number } | null = null;
  private clockAcc = 0;
  private t = 0;
  private plateTimer = 0;
  private lastDistrict = '';

  constructor(private root: HTMLElement, canvas: HTMLCanvasElement) {
    this.ui = new UI(root);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.rig = new CameraRig(this.camera, canvas);
    this.sky = new Sky(this.scene);
    this.ui.onChange(() => this.keys.clear());
    this.world = this.makeWorldApi();
  }

  // ── setup ─────────────────────────────────────────────────────────
  build() {
    this.town = buildTown();
    this.areas.set('town', this.town.area);
    this.scene.add(this.town.area.group);
    const lay = getLayout();
    let i = 0;
    for (const lot of lay.lots) {
      const shop = lot.shop ? SHOP_BY_ID[lot.shop] : null;
      if (shop?.interior) {
        const a = buildInterior(shop.interior, shop.id, i++, lot);
        this.areas.set(a.id, a);
        this.scene.add(a.group);
      }
    }
    let k = 0;
    for (const lot of lay.lots) {
      if (!lot.home) continue;
      const a = buildHome(lot.home, k++, lot);
      this.areas.set(a.id, a);
      this.homes.set(lot.home, a);
      this.scene.add(a.group);
    }
    this.people = new People(this.areas);
    this.player = new PlayerModel(this.state.clothes.worn);
    this.player.root.traverse((o) => { o.castShadow = true; });
    this.scene.add(this.player.root);
    this.hud = new Hud(this, {
      map: () => this.toggle('map', () => openMap(this)),
      bag: () => this.toggle('bag', () => openBag(this)),
      phone: () => this.toggle('phone', () => openPhone(this)),
      lexicon: () => this.toggle('lexicon', () => openLexicon(this)),
      settings: () => this.toggle('settings', () => this.openSettingsPanel()),
      edit: () => this.startEdit(),
      clothes: () => openBag(this, 'clothes'),
      interact: () => this.interact(),
    });
    this.hud.el.classList.add('off');
    this.root.append(this.hud.el);
    // a calm harbour view behind the title screen
    this.pos.set(150, 1.2, 40);
    this.yaw = Math.PI * 0.85;
    this.rig.yaw = Math.PI * 0.85;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.bindInput();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { if (this.playing) this.save(); this.ambient.suspend(); }
      else this.ambient.resume();
    });
    window.addEventListener('pagehide', () => { if (this.playing) this.save(); });
  }

  private resize() {
    const w = window.innerWidth;
    const hgt = window.innerHeight;
    this.renderer.setSize(w, hgt, false);
    this.camera.aspect = w / hgt;
    this.camera.updateProjectionMatrix();
  }

  private toggle(id: string, open: () => void) {
    if (!this.playing) return;
    if (this.ui.has(id)) this.ui.close(id);
    else open();
  }

  // ── Ctx ───────────────────────────────────────────────────────────
  commit(r: Result, opts: { save?: boolean; toast?: boolean } = {}): boolean {
    if (!r.ok) {
      this.ui.toast(r.error.el, r.error.en, 'error');
      return false;
    }
    this.state = r.state;
    if (r.msg && opts.toast !== false) this.ui.toast(r.msg.el, r.msg.en, 'good');
    if (opts.save) this.save();
    return true;
  }

  mutate(fn: (s: GameState) => void, save = false) {
    fn(this.state);
    if (save) this.save();
  }

  note(el: string, enText: string, cat: string, kind: LexKind = 'seen') {
    if (!el) return;
    noteWord(this.state, el, enText, cat, kind);
  }

  say(text: string, opts: { slow?: boolean; lexEl?: string; lexEn?: string; cat?: string } = {}) {
    const s = this.state.settings;
    const r = this.speech.speak(text, { rate: opts.slow ? 0.8 : s.rate, voiceURI: s.voiceURI, enabled: s.tts });
    if (r.ok) {
      this.state.stats.listened++;
      if (opts.lexEl) this.note(opts.lexEl, opts.lexEn ?? '', opts.cat ?? 'phrase', 'listened');
    } else {
      this.state.stats.noVoicePlays++;
      const now = performance.now();
      if (now - this.lastVoiceHelp > 15000 || r.reason === 'off') {
        this.lastVoiceHelp = now;
        const help = r.reason === 'unsupported' ? VOICE_HELP.unsupported : r.reason === 'off' ? VOICE_HELP.off : VOICE_HELP.none;
        this.ui.toast('Χωρίς φωνή', help, 'error', 9000);
      }
    }
    return r;
  }

  save(manual = false) {
    if (this.viewing) {
      const lot = getLayout().lots.find((l) => l.home === this.viewing)!;
      this.state.player = { area: 'town', x: lot.front.x, z: lot.front.z, yaw: lot.rot };
    } else {
      this.state.player = { area: this.areaId, x: this.pos.x, z: this.pos.z, yaw: this.yaw };
    }
    const r = writeSave(this.state);
    this.lastSave = performance.now();
    if (!r.ok) this.ui.toast('Δεν αποθηκεύτηκε.', `Could not save (${r.error}). You can keep playing; try "Export save file" in Settings.`, 'error', 8000);
    else if (manual) this.ui.toast('Αποθηκεύτηκε.', 'Saved.', 'good');
  }

  refresh() { /* HUD refreshes every frame */ }

  private makeWorldApi(): WorldApi {
    return {
      enterArea: (id, at) => this.enterArea(id, at),
      areaId: () => this.areaId,
      playerPos: () => ({ x: this.pos.x, z: this.pos.z }),
      refreshHome: () => this.refreshHome(),
      setEdit: (on) => { this.editing = on; this.rig.overhead = on; },
      viewHome: (id) => this.viewHome(id),
      viewing: () => this.viewing,
      dress: () => this.player.dress(this.state.clothes.worn),
    };
  }

  // ── areas ─────────────────────────────────────────────────────────
  private enterArea(id: string, at?: { x: number; z: number; yaw: number }) {
    const next = this.areas.get(id);
    if (!next) return;
    for (const a of this.areas.values()) a.group.visible = a.id === id;
    const spot = at ?? next.spawn;
    this.areaId = id;
    this.pos.set(spot.x, groundY(next, spot.x, spot.z), spot.z);
    this.yaw = spot.yaw;
    this.rig.yaw = spot.yaw;
    this.state.player = { area: id, x: spot.x, z: spot.z, yaw: spot.yaw };
    this.syncPeople(true);
  }

  private refreshHome() {
    for (const [id, a] of this.homes) {
      if (this.viewing === id) a.setFurniture([], true);
      else if (this.state.home === id) a.setFurniture(this.state.furniture, false);
      else a.setFurniture([], true);
    }
  }

  private viewHome(id: string | null) {
    if (id === null) {
      this.viewing = null;
      this.refreshHome();
      return;
    }
    this.viewing = id;
    this.refreshHome();
    this.enterArea(`home:${id}`);
  }

  private syncPeople(force = false) {
    this.people.place(this.state.time, !!this.state.home);
    const a = this.areas.get(this.areaId)!;
    const r = this.people.sync(this.scene, this.areaId, a.floorY);
    this.npcShapes = r.shapes;
    this.npcInteract = r.interact;
    void force;
  }

  // ── game start ────────────────────────────────────────────────────
  start(state: GameState, fresh: boolean) {
    this.state = state;
    this.commit(tx(this.state, (s) => refreshOffers(s, Math.floor(s.time / 1440))), { toast: false });
    this.player.dress(this.state.clothes.worn);
    this.viewing = null;
    this.refreshHome();
    const p = this.state.player;
    const lay = getLayout();
    const office = lay.lots.find((l) => l.shop === 'home_office')!;
    if (fresh || !this.areas.has(p.area) || (p.area.startsWith('home:') && p.area !== `home:${this.state.home}`)) {
      this.enterArea('town', { x: office.front.x, z: office.front.z + 0.6, yaw: office.rot });
    } else {
      this.enterArea(p.area, { x: p.x, z: p.z, yaw: p.yaw });
    }
    this.playing = true;
    this.hud.el.classList.remove('off');
    this.ambient.set(this.state.settings.ambient, this.state.settings.volume);
    if (!this.state.home && !this.state.introDone) {
      showIntro(this, () => { this.mutate((s) => { s.introDone = true; }); openRental(this); }, () => {
        this.mutate((s) => { s.introDone = true; });
        if (this.commit(rentHome(this.state, 'h01'), { save: true })) { this.refreshHome(); this.enterArea('home:h01'); }
      });
    }
    this.save();
  }

  private openSettingsPanel() {
    openSettings(this, {
      onImport: (st) => { this.ui.closeAll(); this.start(st as GameState, false); },
      onNewGame: () => { this.ui.closeAll(); this.start(newGame(this.state.settings), true); },
      onAmbient: (on, vol) => this.ambient.set(on, vol),
    });
  }

  private startEdit() {
    if (!this.state.home || this.areaId !== `home:${this.state.home}`) return;
    openEdit(this, { scene: this.scene, camera: this.camera, canvas: this.renderer.domElement, home: () => this.homes.get(this.state.home!) ?? null });
  }

  // ── input ─────────────────────────────────────────────────────────
  private bindInput() {
    const movement = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift']);
    window.addEventListener('keydown', (e) => {
      this.ambient.start();
      if (!this.playing) return;
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      const k = e.key.toLowerCase();
      if (k === 'escape') {
        e.preventDefault();
        if (typing) (e.target as HTMLElement).blur();
        if (this.ui.stack.length) this.ui.close();
        else this.openSettingsPanel();
        return;
      }
      if (typing) return;
      if (k === 'tab') e.preventDefault();
      const top = this.ui.top()?.id;
      if (this.ui.blocking()) {
        if ((k === 'm' && top === 'map') || (k === 'tab' && top === 'bag') || (k === 'p' && top === 'phone') || (k === 'l' && top === 'lexicon')) this.ui.close();
        return;
      }
      if (movement.has(k)) { this.keys.add(k); if (k.startsWith('arrow')) e.preventDefault(); return; }
      if (k === 'e' || k === 'enter') { this.interact(); e.preventDefault(); return; }
      if (k === 'm') openMap(this);
      else if (k === 'tab') openBag(this);
      else if (k === 'p') openPhone(this);
      else if (k === 'l') openLexicon(this);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());
    window.addEventListener('pointerdown', () => this.ambient.start());
  }

  // ── interactions ──────────────────────────────────────────────────
  private available(): Interactable[] {
    const area = this.areas.get(this.areaId)!;
    const list = [...area.interactables, ...this.npcInteract];
    return list.filter((it) => {
      if (it.kind === 'dest') return this.state.deliveries.active.some((d) => d.dest === it.ref && d.status === 'carrying');
      if (it.ref === 'agora_laiki') return this.town.laiki.visible;
      return true;
    });
  }

  private pickNearest(): Interactable | null {
    let best: Interactable | null = null;
    let bestScore = Infinity;
    const fx = Math.sin(this.yaw);
    const fz = Math.cos(this.yaw);
    for (const it of this.available()) {
      const dx = it.x - this.pos.x;
      const dz = it.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > it.r) continue;
      const facing = d < 0.4 ? 1 : (dx * fx + dz * fz) / d;
      // what you face wins; people a little more than doors
      const score = d - facing * 1.2 + (it.kind === 'npc' ? -0.4 : 0) + (it.kind === 'dest' ? -0.5 : 0);
      if (score < bestScore) { bestScore = score; best = it; }
    }
    return best;
  }

  private promptFor(it: Interactable): { el: string; en: string } {
    const s = this.state;
    switch (it.kind) {
      case 'npc': { const n = NPC_BY_ID[it.ref]; return { el: `Μίλα με ${n.name}`, en: `Talk to ${n.name} (${n.role.en})` }; }
      case 'enter': { const sh = SHOP_BY_ID[it.ref]; const open = isOpen(sh, s.time); return { el: `${sh.el} · ${open ? OPEN_SIGN.open.el : OPEN_SIGN.closed.el}`, en: `${open ? 'Enter' : 'Closed'}: ${sh.en}` }; }
      case 'exit': return this.viewing ? { el: 'Βγες έξω', en: 'Go outside (end the viewing)' } : { el: 'Βγες έξω', en: 'Go outside' };
      case 'homeDoor': return s.home === it.ref ? { el: UIL.home.el, en: 'Enter your home' } : { el: `${UIL.forRent.el} · ${UIL.viewRoom.el}`, en: `For rent: view the room (${euro(HOME_BY_ID[it.ref].rent)}/month)` };
      case 'counter': { const sh = SHOP_BY_ID[it.ref]; const open = isOpen(sh, s.time); return { el: `${sh.el} · ${open ? OPEN_SIGN.open.el : OPEN_SIGN.closed.el}`, en: sh.catalog ? `Shop: ${sh.en}` : sh.en }; }
      case 'office': return { el: SHOP_BY_ID.home_office.el, en: 'Rental office: the rooms' };
      case 'bench': return { el: 'Κάθισε λίγο', en: 'Sit down (wait one hour)' };
      case 'bed': return { el: 'Κοιμήσου', en: 'Sleep until 08:00 (saves the game)' };
      case 'kitchen': return { el: 'Μαγείρεψε', en: 'Cook in your kitchen' };
      case 'wardrobe':
      case 'mirror': return { el: 'Άλλαξε ρούχα', en: 'Change clothes' };
      case 'jobStation': return { el: JOBS[it.ref as keyof typeof JOBS].el, en: `Work: ${JOBS[it.ref as keyof typeof JOBS].en}` };
      case 'dest': { const d = destLabel(it.ref); return { el: `Παράδοση: ${d.el}`, en: `Hand over the parcel: ${d.en}` }; }
      default: return { el: '…', en: '' };
    }
  }

  interact() {
    if (!this.playing || this.ui.blocking()) return;
    const it = this.nearest;
    if (!it) return;
    const s = this.state;
    switch (it.kind) {
      case 'npc': openTalk(this, it.ref); break;
      case 'enter': {
        const sh = SHOP_BY_ID[it.ref];
        if (!isOpen(sh, s.time) && !(s.jobs.active && JOBS[s.jobs.active.kind].shop === sh.id)) {
          const hrs = hoursToday(sh, s.time);
          this.ui.toast(`${OPEN_SIGN.closed.el}`, `${sh.en} is closed. ${hrs ? `Today: ${hrs}` : 'Closed today.'}`, 'error');
          return;
        }
        this.enterArea(`int:${sh.id}`);
        break;
      }
      case 'exit': {
        const area = this.areas.get(this.areaId)!;
        const wasViewing = this.viewing;
        if (wasViewing) this.viewHome(null);
        if (area.exit) this.enterArea(area.exit.area, area.exit);
        if (wasViewing && !this.state.home) openRental(this);
        break;
      }
      case 'homeDoor':
        if (s.home === it.ref) { this.refreshHome(); this.enterArea(`home:${it.ref}`); }
        else this.viewHome(it.ref);
        break;
      case 'counter': {
        const sh = SHOP_BY_ID[it.ref];
        if (sh.catalog) openShop(this, sh.id);
        else {
          const staff = sh.staff?.find((id) => this.people.spots.get(id)?.area === this.areaId);
          if (staff && isOpen(sh, s.time)) openTalk(this, staff);
          else { const hrs = hoursToday(sh, s.time); this.ui.toast(sh.el, `${sh.en}. ${isOpen(sh, s.time) ? 'Open' : 'Closed'} — ${hrs ? `today ${hrs}` : 'closed today'}.`); }
        }
        break;
      }
      case 'office':
        if (!s.home || isOpen('home_office', s.time)) openRental(this);
        else { const hrs = hoursToday('home_office', s.time); this.ui.toast(OPEN_SIGN.closed.el, `The rental office is closed. ${hrs ? `Today: ${hrs}` : 'Closed today.'}`, 'error'); }
        break;
      case 'bench':
        ask(this.ui, 'Περιμένεις μια ώρα;', 'Sit here and let one hour pass?', 'Ναι', () => { this.commit(waitHour(this.state), { save: true }); this.syncPeople(true); });
        break;
      case 'bed':
        ask(this.ui, 'Καληνύχτα;', 'Go to sleep until 08:00? The game is saved.', 'Καληνύχτα!', () => { if (this.commit(sleep(this.state), { save: true })) this.syncPeople(true); }, 'Good night!');
        break;
      case 'kitchen': openKitchen(this); break;
      case 'wardrobe':
      case 'mirror': openBag(this, 'clothes'); break;
      case 'jobStation': {
        const kind = it.ref as keyof typeof JOBS;
        if (s.jobs.active?.kind === kind) { openJob(this); break; }
        const why = whyNotStart(s, kind);
        if (why) { this.ui.toast(why.el, why.en, 'error'); break; }
        ask(this.ui, `${JOBS[kind].el};`, `Start the ${JOBS[kind].en.toLowerCase()} now? ${JOBS[kind].minutes / 60} h, ${euro(JOBS[kind].pay)}.`, 'Ναι!', () => { if (this.commit(startJob(this.state, kind), { save: true })) openJob(this); });
        break;
      }
      case 'dest': {
        const d = s.deliveries.active.find((x) => x.dest === it.ref && x.status === 'carrying');
        if (!d) return;
        const lab = parcelLabel(d);
        if (this.commit(deliverParcel(this.state, d.id, it.ref), { save: true })) {
          this.ui.toast(DELIVERY_LINES.deliverReply.el, `${lab.en} — delivered.`, 'good');
          this.note(DELIVERY_LINES.deliver.el, DELIVERY_LINES.deliver.en, 'delivery');
        }
        break;
      }
    }
  }

  // ── frame ─────────────────────────────────────────────────────────
  fps = 0;
  frame(dt: number, draw = true) {
    this.t += dt;
    this.fps += (1 / Math.max(dt, 0.001) - this.fps) * 0.05;
    const area = this.areas.get(this.areaId)!;
    const blocked = !this.playing || this.ui.blocking() || this.editing;
    // clock: only while walking around (stops in menus, conversations, editing, hidden tab)
    if (this.playing && !blocked && !document.hidden) {
      this.clockAcc += dt * GAME_MINUTES_PER_REAL_SECOND;
      if (this.clockAcc >= 0.25) {
        const events = advance(this.state, this.clockAcc);
        this.clockAcc = 0;
        for (const e of events) this.ui.toast(e.el, e.en, 'info', 7000);
        if (events.length) this.save();
      }
    }
    // movement
    let mx = 0;
    let mz = 0;
    let run = this.keys.has('shift');
    if (!blocked) {
      if (this.autopilot) {
        const ap = this.autopilot;
        const target = ap.pts[ap.i];
        const dx = target.x - this.pos.x;
        const dz = target.z - this.pos.z;
        const d = Math.hypot(dx, dz);
        const here = { x: this.pos.x, z: this.pos.z };
        if (d < 0.7) {
          // reached this waypoint: aim for the next one
          ap.i++;
          ap.best = Infinity;
          ap.lastProgress = this.t;
          if (ap.i >= ap.pts.length) { this.autopilot = null; ap.resolve({ ok: true, at: here }); }
        } else {
          mx = dx / d;
          mz = dz / d;
          run = ap.run;
          if (d < ap.best - 0.3) { ap.best = d; ap.lastProgress = this.t; }
          // no progress for 4 s: something blocks the way
          if (this.t - ap.lastProgress > 4) { this.autopilot = null; ap.resolve({ ok: false, at: here }); }
        }
      } else {
        const b = this.rig.basis();
        const f = (this.keys.has('w') || this.keys.has('arrowup') ? 1 : 0) - (this.keys.has('s') || this.keys.has('arrowdown') ? 1 : 0);
        const r = (this.keys.has('d') || this.keys.has('arrowright') ? 1 : 0) - (this.keys.has('a') || this.keys.has('arrowleft') ? 1 : 0);
        mx = b.fx * f + b.rx * r;
        mz = b.fz * f + b.rz * r;
        const l = Math.hypot(mx, mz);
        if (l > 0) { mx /= l; mz /= l; }
      }
    }
    const target = Math.hypot(mx, mz) > 0 ? (run ? RUN_SPEED : WALK_SPEED) : 0;
    this.speed += (target - this.speed) * Math.min(1, dt * 10);
    if (this.speed > 0.05 && (mx || mz)) {
      const p = moveWithCollisions(area, this.pos.x, this.pos.z, mx * this.speed * dt, mz * this.speed * dt, this.npcShapes);
      const moved = Math.hypot(p.x - this.pos.x, p.z - this.pos.z);
      this.pos.x = p.x;
      this.pos.z = p.z;
      this.walkPhase += moved * 3.2;
      let want = Math.atan2(mx, mz);
      let diff = want - this.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.yaw += diff * Math.min(1, dt * 12);
      want = 0;
    }
    const gy = groundY(area, this.pos.x, this.pos.z);
    this.pos.y += (gy - this.pos.y) * Math.min(1, dt * 14);
    this.player.root.position.copy(this.pos);
    this.player.root.rotation.y = this.yaw;
    this.player.animate(this.walkPhase, this.speed);

    // people, interactions, world details
    this.people.place(this.state.time, !!this.state.home);
    const r = this.people.sync(this.scene, this.areaId, area.floorY);
    this.npcShapes = r.shapes;
    this.npcInteract = r.interact;
    this.people.animate(this.t, this.pos.x, this.pos.z);
    this.nearest = blocked ? null : this.pickNearest();
    area.update?.(dt, this.t);
    const mod = dateOf(this.state.time).minuteOfDay;
    const inside = area.floorY !== null;
    const wx = weatherAt(this.state.time);
    const windy = wx.wind === 'calm' ? 0 : 1;
    this.sky.setWeather({ clear: 0, partly: 0.3, cloudy: 0.7, rain: 0.95 }[wx.nowSky], wx.raining, dt, windy);
    this.sky.update(mod, this.pos, inside);
    const seaShader = this.town.seaMaterial.userData.shader as unknown as { uniforms: { uWind?: { value: number } } } | undefined;
    if (seaShader?.uniforms.uWind) seaShader.uniforms.uWind.value += ((windy ? 2.2 : 1) - seaShader.uniforms.uWind.value) * Math.min(1, dt);
    (this.town.lanterns.material as THREE.MeshStandardMaterial).emissiveIntensity = this.sky.night > 0.3 ? 2.2 : 0;
    this.plateTimer -= dt;
    if (this.plateTimer <= 0) {
      this.plateTimer = 1;
      for (const p of this.town.openPlates) (p.mesh.material as THREE.MeshBasicMaterial).map = isOpen(p.shop, this.state.time) ? this.town.openTextures.open : this.town.openTextures.closed;
      this.town.laiki.visible = isOpen('agora_laiki', this.state.time);
      this.town.area.group.traverse((o) => { if (o.name.startsWith('rentplate:')) o.visible = o.name.slice(10) !== this.state.home; });
    }
    // camera & cut-away walls
    const focus = new THREE.Vector3(this.pos.x, this.pos.y + (this.editing ? 0 : 1.45), this.pos.z);
    if (this.editing) { const hm = this.homes.get(this.state.home!); if (hm) focus.set(hm.ox, 0, hm.oz + 0.6); }
    this.rig.update(dt, focus, area, this.npcShapes);
    for (const w of area.walls) {
      const out = (this.camera.position.x - w.px) * w.nx + (this.camera.position.z - w.pz) * w.nz < 0;
      const m = w.mesh.material as THREE.MeshLambertMaterial;
      const target2 = out ? 0.12 : 1;
      m.opacity += (target2 - m.opacity) * Math.min(1, dt * 8);
      m.depthWrite = m.opacity > 0.9;
    }
    // ambient sound
    const sea = inside ? 0.2 : clamp(1 - (coastZ(this.pos.x) - this.pos.z) / 45, 0, 1);
    const dId = inside ? 'agora' : districtAt(this.pos.x, this.pos.z);
    this.ambient.mix(sea, (inside ? 0 : this.pos.y) + windy * 25, dId === 'agora' ? 1 : 0.2, inside);
    // HUD
    const dist = inside ? (() => {
      const id = this.areaId.split(':')[1];
      if (this.areaId.startsWith('home:')) return this.viewing ? { el: HOME_BY_ID[id].el, en: `Viewing: ${HOME_BY_ID[id].en}` } : { el: UIL.home.el, en: 'Your home' };
      return { el: SHOP_BY_ID[id].el, en: SHOP_BY_ID[id].en };
    })() : DISTRICTS[dId];
    if (!inside && dId !== this.lastDistrict) {
      if (this.lastDistrict) this.ui.toast(DISTRICTS[dId].el, DISTRICTS[dId].en, 'info', 2500);
      this.lastDistrict = dId;
      this.note(DISTRICTS[dId].el, DISTRICTS[dId].en, 'place');
    }
    this.hud.update(this.state, {
      weather: weatherText(this.state.time),
      district: dist,
      prompt: this.nearest ? this.promptFor(this.nearest) : null,
      atHome: !!this.state.home && this.areaId === `home:${this.state.home}` && !this.ui.blocking(),
      banner: this.bannerEl(),
    });
    this.updateSign(inside);
    this.updateTags();
    if (this.playing && performance.now() - this.lastSave > 120000) this.save();
    if (draw) this.renderer.render(this.scene, this.camera);
  }

  private bannerCache: { key: string; el: HTMLElement | null } = { key: '', el: null };
  private bannerEl(): HTMLElement | null {
    const job = this.state.jobs.active;
    const key = `${this.viewing}|${job?.id ?? ''}|${this.editing}|${this.ui.has('job')}`;
    if (this.bannerCache.key === key) return this.bannerCache.el;
    let el: HTMLElement | null = null;
    if (this.viewing) {
      const hm = HOME_BY_ID[this.viewing];
      el = h('div', null, h('span', { lang: 'el' }, `${hm.el} · ${euro(hm.rent)}/μήνα`), en(` Viewing ${hm.en}. Walk around; leave by the door.`, 'en small'),
        button(UIL.takeRoom.el, () => {
          const id = this.viewing!;
          const go = () => {
            if (this.commit(rentHome(this.state, id), { save: true })) {
              this.viewing = null;
              this.mutate((s) => { s.introDone = true; });
              this.refreshHome();
              this.enterArea(`home:${id}`);
            }
          };
          if (this.state.home) ask(this.ui, 'Μετακόμιση;', `Move here? Moving costs 20 € and your furniture goes to the storage box.`, 'Ναι', go);
          else go();
        }, { cls: 'btn primary small', enLabel: UIL.takeRoom.en, testid: 'banner-take' }));
    } else if (job && !this.ui.has('job')) {
      el = h('div', null, h('span', { lang: 'el' }, JOBS[job.kind].el), en(' — shift paused. Go to the work spot or talk to the boss to continue.', 'en small'),
        button('Συνέχεια', () => openJob(this), { cls: 'btn small', enLabel: 'resume', testid: 'banner-job' }));
    }
    this.bannerCache = { key, el };
    return el;
  }

  private updateSign(inside: boolean) {
    if (inside || this.ui.blocking()) { this.hud.showSign(null, ''); return; }
    let best: (typeof this.town.signs)[number] | null = null;
    let bd = 7.5;
    for (const s of this.town.signs) {
      const d = Math.hypot(s.x - this.pos.x, s.z - this.pos.z);
      if (d < bd) { bd = d; best = s; }
    }
    this.hud.showSign(best, best ? `${best.x},${best.z}` : '');
  }

  private tagEls = new Map<string, HTMLElement>();
  private updateTags() {
    const seen = new Set<string>();
    if (!this.ui.blocking()) {
      const v = new THREE.Vector3();
      for (const [id, m] of this.people.meshes) {
        if (!m.parent) continue;
        const d = Math.hypot(m.position.x - this.pos.x, m.position.z - this.pos.z);
        if (d > 9) continue;
        v.set(m.position.x, m.position.y + 2.05, m.position.z).project(this.camera);
        if (v.z > 1) continue;
        seen.add(id);
        let el = this.tagEls.get(id);
        if (!el) {
          const n = NPC_BY_ID[id];
          el = h('div', { class: 'tag-name' }, h('span', { lang: 'el' }, n.name), h('span', { class: 'role', lang: 'el' }, ` · ${n.role.el}`));
          this.tagEls.set(id, el);
          this.hud.tags.append(el);
        }
        el.style.transform = `translate(${((v.x + 1) / 2) * window.innerWidth}px, ${((1 - v.y) / 2) * window.innerHeight}px) translate(-50%, -100%)`;
        el.style.opacity = String(clamp(1.4 - d / 8, 0, 1));
      }
    }
    for (const [id, el] of this.tagEls) if (!seen.has(id)) { el.remove(); this.tagEls.delete(id); }
  }

  // ── test hooks (used by the Playwright tests; harmless in play) ──────
  debugApi() {
    return {
      ready: true,
      state: () => structuredClone(this.state),
      player: () => ({ area: this.areaId, x: this.pos.x, z: this.pos.z, y: this.pos.y, yaw: this.yaw }),
      teleport: (area: string, x: number, z: number, yaw = 0) => this.enterArea(area, { x, z, yaw }),
      setTime: (minutes: number) => { this.state.time = minutes; this.people.place(minutes, !!this.state.home); },
      setMoney: (cents: number) => { this.state.money = cents; },
      walk: (pts: [number, number][], run = true) => new Promise<{ ok: boolean; at: Vec }>((resolve) => {
        this.autopilot = { pts: pts.map(([x, z]) => ({ x, z })), i: 0, run, resolve, lastProgress: this.t, best: Infinity };
      }),
      /** Same movement and collisions as play, but stepped without drawing (fast in tests). */
      walkFast: (pts: [number, number][], run = true, maxSeconds = 900) => {
        let result: { ok: boolean; at: Vec } | null = null;
        this.autopilot = { pts: pts.map(([x, z]) => ({ x, z })), i: 0, run, resolve: (r) => { result = r; }, lastProgress: this.t, best: Infinity };
        for (let i = 0; i < maxSeconds * 20 && !result; i++) this.frame(0.05, false);
        this.autopilot = null;
        return result ?? { ok: false, at: { x: this.pos.x, z: this.pos.z } };
      },
      cameraInside: () => this.rig.insideSomething(this.areas.get(this.areaId)!, this.npcShapes),
      cameraYaw: (y: number) => { this.rig.yaw = y; },
      nearest: () => (this.nearest ? { ...this.nearest } : null),
      lot: (id: string) => getLayout().lots.find((l) => l.id === id || l.shop === id || l.home === id),
      npcSpot: (id: string) => this.people.spots.get(id),
      npcHome: (id: string) => getLayout().npcHome[id]?.front,
      insideBuilding: () => getLayout().lots.some((l) => pointInShape({ kind: 'box', x: l.x, z: l.z, hw: l.w / 2, hd: l.d / 2, rot: l.rot, top: 10 }, this.pos.x, this.pos.z)),
      panels: () => this.ui.stack.map((p) => p.id),
      areaIds: () => [...this.areas.keys()],
      interactables: () => this.available().map((i) => ({ ...i })),
      allDest: () => this.town.area.interactables.filter((i) => i.kind === 'dest').map((i) => ({ ...i })),
      fps: () => this.fps,
      roads: () => getLayout().roads.map((r) => ({ id: r.id, pts: r.pts })),
    };
  }
}

async function boot() {
  const root = document.getElementById('app')!;
  const canvas = document.getElementById('scene') as HTMLCanvasElement;
  const loading = document.getElementById('loading');
  try {
    await Promise.race([
      Promise.all([document.fonts.load('400 20px "Noto Sans"', 'Καλημέρα'), document.fonts.load('700 20px "Noto Sans"', 'ΦΟΥΡΝΟΣ')]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch { /* fonts are optional for play */ }
  let game: Game;
  try {
    game = new Game(root, canvas);
  } catch (e) {
    if (loading) loading.innerHTML = '<p lang="en">This browser could not start 3D graphics (WebGL). Please try Microsoft Edge or Google Chrome, and make sure hardware acceleration is on.</p>';
    throw e;
  }
  game.build();
  void game.speech.init(3000);
  loading?.remove();
  let last = performance.now();
  const loop = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    game.frame(dt);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  (window as unknown as { __greece: unknown }).__greece = game.debugApi();
  const save = readSave();
  showTitle(root, save, {
    onContinue: (st) => game.start(st, false),
    onNew: () => game.start(newGame(save.kind === 'ok' ? save.state.settings : undefined), true),
    onImport: (st) => game.start(st, false),
  }, () => ({ greek: game.speech.greekVoices().length, supported: game.speech.supported }));
  game.speech.onChange(() => {
    const el = document.querySelector('[data-testid=title-voice]');
    if (el) el.textContent = !game.speech.supported ? VOICE_HELP.unsupported : game.speech.greekVoices().length ? `🔊 ${game.speech.greekVoices().length} Greek voice(s) found.` : `🔇 ${VOICE_HELP.none}`;
  });
}

void boot();
