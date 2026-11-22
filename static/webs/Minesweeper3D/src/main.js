import './style.css';
import { Board, REVEALED, FLAGGED, seededRng } from './logic.js';
import { World } from './scene.js';
import { loadCubeGeometry, loadModel } from './cube-model.js';
import { Sfx } from './audio.js';
import { createUi } from './ui.js';
import { connectHost } from '@platform';
import messages from './strings.json';

const STORE_KEY = 'minesweeper3d.settings';
const DRAG_THRESHOLD = 4;
const CHORD_SLOP = 14;
const ACTIONS = ['none', 'reveal', 'flag', 'chord', 'pan'];

const defaults = {
  side: 5,
  mines: 38,
  volume: 70,
  muted: false,
  showFps: false,
  showAxes: false,
  showGrid: false,
  axisWidth: 2,
  gridWidth: 1,
  axisOpacity: 90,
  gridOpacity: 30,
  spacing: 100,
  // 镜头距离小于这个值时开始剥离，越近剥得越多
  cutawayDistance: 15,
  mouseMap: ['reveal', 'pan', 'flag'],
};

function clampNumber(value, lo, hi, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
}

/* ---------------- 多语言 ---------------- */

let locale = 'zh_CN';

function t(key, vars = {}) {
  const table = messages[locale] || messages.zh_CN;
  const text = table[key] ?? messages.zh_CN[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ''));
}

function localize() {
  for (const el of document.querySelectorAll('[data-text]')) {
    el.textContent = t(el.dataset.text);
  }
}

/* ---------------- 主题 ---------------- */

function applyTheme(theme, world) {
  if (!theme) return;
  const root = document.documentElement;
  const set = (name, value) => value && root.style.setProperty(name, value);
  set('--paper', theme.background);
  set('--sky', theme.background);
  set('--ink', theme.text);
  set('--ink-soft', theme.text);
  set('--line', theme.border);
  set('--accent', theme.accent);
  root.style.colorScheme = theme.mode || 'light';
  if (world) {
    const hex = String(theme.background || '').replace('#', '');
    const color = parseInt(hex, 16);
    if (!Number.isNaN(color) && hex.length === 6) world.renderer.setClearColor(color);
  }
}

/* ---------------- 状态 ---------------- */

const state = {
  board: null,
  elapsed: 0,
  timing: false,
  paused: false,
  started: false,
};

let world = null;
let sfx = null;
let settings = { ...defaults };
let host = null;
let ui = null;

const canvas = document.getElementById('view');

function save() {
  if (host) host.save(STORE_KEY, JSON.stringify(settings));
}

async function loadSettings() {
  const raw = await host.load(STORE_KEY);
  if (!raw) return { ...defaults };
  try {
    const saved = JSON.parse(raw);
    const merged = {
      ...defaults,
      ...saved,
      cutawayDistance: clampNumber(saved.cutawayDistance, 0, 40, defaults.cutawayDistance),
      showAxes: saved.showAxes === true,
      showGrid: saved.showGrid === true,
      axisWidth: clampNumber(saved.axisWidth, 1, 8, defaults.axisWidth),
      gridWidth: clampNumber(saved.gridWidth, 1, 8, defaults.gridWidth),
      axisOpacity: clampNumber(saved.axisOpacity, 0, 100, defaults.axisOpacity),
      gridOpacity: clampNumber(saved.gridOpacity, 0, 100, defaults.gridOpacity),
      mouseMap:
        Array.isArray(saved.mouseMap) && saved.mouseMap.length === 3
          ? saved.mouseMap.map((a) => (ACTIONS.includes(a) ? a : 'none'))
          : [...defaults.mouseMap],
    };
    delete merged.fadeDepth;
    delete merged.nearOpacity;
    return merged;
  } catch {
    return { ...defaults };
  }
}

/* ---------------- 提示行 ---------------- */

const ACTION_TEXT = { reveal: 'reveal', flag: 'flag', chord: 'chord', pan: 'pan' };

function updateHint() {
  const names = ['mouseLeft', 'mouseMiddle', 'mouseRight'];
  const parts = [];
  settings.mouseMap.forEach((action, i) => {
    if (!ACTION_TEXT[action]) return;
    parts.push(`${t(names[i])} ${t(ACTION_TEXT[action])}`);
  });
  parts.push(t('hintChord'), t('hintWheel'), t('hintRestart'), settings.muted ? t('hintMuteOn') : t('hintMute'));
  ui.setHint(parts.join(' · '));
}

/* ---------------- 开局 ---------------- */

const seedParam = new URLSearchParams(location.search).get('seed');
const rng = seedParam === null ? Math.random : seededRng(Number(seedParam) || 1);

function newGame(side, mines) {
  if (!world) return;
  state.board = new Board(side, mines, rng);
  state.elapsed = 0;
  state.timing = false;
  state.paused = false;
  state.started = false;

  world.frame(side);
  world.build(state.board, settings.spacing / 100);
  world.applyCamera();
  ui.hideResult();
  ui.setTime(0);
  ui.setStats(state.board.mineTotal, 0, 0, state.board.total - state.board.mineTotal);
  ui.setStatus(t('statusStart'));
  updateHint();
}

function anyOverlayOpen() {
  return ui.isBoardOpen() || ui.isOptionsOpen() || ui.isResultOpen();
}

/* ---------------- 动作 ---------------- */

function updateStats() {
  const b = state.board;
  ui.setStats(b.mineTotal, b.flagCount, b.revealedCount, b.total - b.mineTotal);
}

function doReveal(px, py) {
  const board = state.board;
  if (board.gameOver) return;
  const hit = world.pick(px, py);
  if (!hit) return;
  const st = board.states[hit.index];
  if (st === REVEALED || st === FLAGGED) return;

  if (!board.generated) {
    board.placeMines(hit.index);
    state.elapsed = 0;
    state.timing = true;
    state.started = true;
  }

  const res = board.reveal(hit.index);
  world.refreshArea(res.opened);
  updateStats();

  if (res.boom) {
    finish(false);
  } else {
    if (res.opened.length >= 3) sfx.play('flood');
    else if (res.opened.length > 0) sfx.play('reveal');
    if (board.won) finish(true);
  }
}

function doFlag(px, py) {
  const board = state.board;
  if (board.gameOver) return;
  const hit = world.pick(px, py);
  if (!hit) return;
  if (board.states[hit.index] === REVEALED) return;
  const prev = board.states[hit.index];
  board.cycleMark(hit.index);
  world.refresh(hit.index);
  updateStats();
  sfx.play(board.states[hit.index] === FLAGGED && prev !== FLAGGED ? 'flag' : 'ui');
}

function doChord(px, py) {
  const board = state.board;
  if (board.gameOver) return;
  const hit = world.pick(px, py);
  if (!hit) return;
  const res = board.chordFace(hit.index, hit.face);
  if (!res.opened.length && !res.boom) return;
  world.refreshArea(res.opened);
  updateStats();
  if (res.boom) {
    finish(false);
  } else {
    sfx.play('flood');
    if (board.won) finish(true);
  }
}

function finish(won) {
  state.timing = false;
  const board = state.board;
  if (!won) {
    world.markMines();
    world.markWrongFlags();
  }
  ui.setTime(state.elapsed);
  sfx.play(won ? 'win' : 'boom');
  ui.showResult(won, state.elapsed, board.side, board.mineTotal, {
    title: won ? t('resultWon') : t('resultLost'),
    detail: t('resultDetail', { side: board.side, mines: board.mineTotal }),
  });
  ui.setStatus(won ? t('statusWon') : t('statusLost'));
  updateStats();
}

/* ---------------- 输入 ---------------- */

const down = new Set();
let pressPos = { x: 0, y: 0 };
let dragging = false;
let chordArmed = false;
let actionDone = false;
let lastPointer = { x: 0, y: 0 };

const isClickAction = (action) => action === 'reveal' || action === 'flag' || action === 'chord';
const panningHeld = () => [...down].some((b) => settings.mouseMap[b] === 'pan');

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

canvas.addEventListener('mousedown', (e) => {
  if (anyOverlayOpen() || !state.board) return;
  sfx.unlock();
  const slot = e.button;
  if (slot > 2) return;

  if (down.size === 0) {
    pressPos = { x: e.clientX, y: e.clientY };
    dragging = false;
    chordArmed = false;
    actionDone = false;
  }
  down.add(slot);
  lastPointer = { x: e.clientX, y: e.clientY };

  if (down.has(0) && down.has(2) && isClickAction(settings.mouseMap[0]) && isClickAction(settings.mouseMap[2])) {
    chordArmed = true;
    if (Math.hypot(e.clientX - pressPos.x, e.clientY - pressPos.y) <= CHORD_SLOP) dragging = false;
  }
});

window.addEventListener('mousemove', (e) => {
  if (anyOverlayOpen() || down.size === 0) return;
  const dx = e.clientX - lastPointer.x;
  const dy = e.clientY - lastPointer.y;
  lastPointer = { x: e.clientX, y: e.clientY };

  // 和弦手势期间不转相机，否则手一抖和弦就没了
  if (chordArmed) return;

  if (!dragging && Math.hypot(e.clientX - pressPos.x, e.clientY - pressPos.y) > DRAG_THRESHOLD) {
    dragging = true;
  }
  if (!dragging) return;

  if (panningHeld()) world.pan(dx, dy);
  else world.orbit(dx, dy);
});

window.addEventListener('mouseup', (e) => {
  const slot = e.button;
  if (slot > 2 || !down.has(slot)) return;
  down.delete(slot);

  if (!anyOverlayOpen() && !actionDone && !dragging && state.board) {
    const action = settings.mouseMap[slot];
    if (action !== 'none' && action !== 'pan') {
      if (chordArmed || action === 'chord') {
        doChord(e.clientX, e.clientY);
        actionDone = true;
      } else if (action === 'reveal') {
        doReveal(e.clientX, e.clientY);
        actionDone = true;
      } else if (action === 'flag') {
        doFlag(e.clientX, e.clientY);
        actionDone = true;
      }
    }
  }

  if (down.size === 0) {
    chordArmed = false;
    actionDone = false;
    dragging = false;
  }
});

canvas.addEventListener(
  'wheel',
  (e) => {
    if (anyOverlayOpen()) return;
    e.preventDefault();
    world.zoom(e.deltaY > 0 ? 0.55 : -0.55);
  },
  { passive: false }
);

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeTopOverlay();
    return;
  }
  const restartKey = e.key === 'r' || e.key === 'R';
  // 结算弹窗打开时 R 也能直接重开，不必先关弹窗或去点按钮
  if (restartKey && ui.isResultOpen()) {
    newGame(settings.side, settings.mines);
    return;
  }
  if (anyOverlayOpen()) return;
  if (restartKey) newGame(settings.side, settings.mines);
  else if (e.key === 'm' || e.key === 'M') {
    settings.muted = !settings.muted;
    sfx.setMuted(settings.muted);
    ui.syncMute(settings.muted);
    save();
    updateHint();
  }
});

function closeTopOverlay() {
  if (ui.isResultOpen()) {
    ui.hideResult();
    return;
  }
  if (ui.isOptionsOpen()) {
    ui.closeOptions();
    return;
  }
  if (ui.isBoardOpen()) ui.closeBoard();
}

window.addEventListener('resize', () => {
  if (world) world.resize();
});

function pause() {
  if (state.timing) {
    state.paused = true;
    state.timing = false;
  }
}

/* ---------------- 循环 ---------------- */

let last = performance.now();
let fpsAcc = 0;
let fpsFrames = 0;

function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;

  if (state.timing && !anyOverlayOpen()) {
    state.elapsed += dt;
    ui.setTime(state.elapsed);
  }

  if (settings.showFps) {
    fpsAcc += dt;
    fpsFrames++;
    if (fpsAcc >= 0.5) {
      ui.setFps(Math.round(fpsFrames / fpsAcc));
      fpsAcc = 0;
      fpsFrames = 0;
    }
  } else if (ui && ui.el.fps.textContent) {
    ui.setFps(-1);
  }

  if (world) world.render(dt);
  requestAnimationFrame(loop);
}

/* ---------------- 启动 ---------------- */

async function boot() {
  host = await connectHost();
  locale = host.locale || locale;
  const theme = await host.applyTheme();
  localize();

  settings = await loadSettings();
  sfx = new Sfx(settings.volume, settings.muted);

  ui = createUi({
    onRestart: () => newGame(settings.side, settings.mines),
    onOpenBoard: () => {
      sfx.play('ui');
      pause();
      ui.openBoard(settings.side, settings.mines);
    },
    onOpenOptions: () => {
      sfx.play('ui');
      pause();
      ui.openOptions({ ...settings, version: __APP_VERSION__ });
    },
    onApplyBoard: (side, mines) => {
      sfx.play('ui');
      settings.side = side;
      settings.mines = mines;
      save();
      newGame(side, mines);
    },
    onSpacing: (pct) => {
      settings.spacing = pct;
      world.relayout(pct / 100);
      ui.setSpacing(pct);
      save();
    },
    onOptions: (patch) => {
      if (patch.volume !== undefined) {
        settings.volume = patch.volume;
        sfx.setVolume(patch.volume);
        ui.syncVolume(patch.volume);
      }
      if (patch.muted !== undefined) {
        settings.muted = patch.muted;
        sfx.setMuted(patch.muted);
        ui.syncMute(patch.muted);
        updateHint();
      }
      if (patch.showFps !== undefined) {
        settings.showFps = patch.showFps;
        ui.el.showFps.setAttribute('aria-pressed', String(patch.showFps));
      }
      if (patch.cutawayDistance !== undefined) {
        settings.cutawayDistance = patch.cutawayDistance;
        world.setCutaway(settings.cutawayDistance);
        ui.setCutawayDistance(settings.cutawayDistance);
      }
      if (['showAxes', 'showGrid', 'axisWidth', 'gridWidth', 'axisOpacity', 'gridOpacity']
        .some((key) => patch[key] !== undefined)) {
        Object.assign(settings, patch);
        world.setGuides(settings);
        ui.syncGuides(settings);
      }
      if (patch.mapSlot !== undefined) {
        settings.mouseMap[patch.mapSlot] = patch.mapAction;
        updateHint();
      }
      save();
    },
  }, t);

  const [cubeGeometry, mineParts] = await Promise.all([
    loadCubeGeometry(),
    loadModel('models/mine.glb'),
  ]);
  world = new World(canvas, cubeGeometry, mineParts);
  applyTheme(theme, world);
  host.onThemeChange((next) => applyTheme(next, world));

  world.resize();
  world.setCutaway(settings.cutawayDistance);
  world.setGuides(settings);
  newGame(settings.side, settings.mines);
  ui.setSpacing(settings.spacing);
  ui.setCutawayDistance(settings.cutawayDistance);
  ui.syncGuides(settings);
  ui.syncVolume(settings.volume);
  ui.syncMute(settings.muted);

  window.minesweeper3d = { world, state, settings, ui };

  await host.ready();
  requestAnimationFrame(loop);
}

boot().catch((error) => {
  console.error('启动失败', error);
  const hint = document.getElementById('hint');
  if (hint) hint.textContent = String(error && error.message);
});
