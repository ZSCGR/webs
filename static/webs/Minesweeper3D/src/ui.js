const $ = (id) => document.getElementById(id);

// 取值顺序与 logic / main 里的动作名一致
export const ACTION_KEYS = ['none', 'reveal', 'flag', 'chord', 'pan'];

export function formatTime(sec) {
  const t = Math.max(0, Math.floor(sec));
  const m = String(Math.floor(t / 60)).padStart(2, '0');
  const s = String(t % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export function createUi(handlers, t) {
  const el = {
    stats: $('stats'),
    time: $('time'),
    fps: $('fps'),
    hint: $('hint'),
    status: $('status'),
    spacing: $('spacing'),
    spacingValue: $('spacing-value'),
    boardPanel: $('board-panel'),
    side: $('side'),
    sideValue: $('side-value'),
    mines: $('mines'),
    minesValue: $('mines-value'),
    boardHint: $('board-hint'),
    optionsPanel: $('options-panel'),
    volume: $('volume'),
    volumeValue: $('volume-value'),
    cutawayDistance: $('cutaway-distance'),
    cutawayDistanceValue: $('cutaway-distance-value'),
    mute: $('mute'),
    showFps: $('show-fps'),
    showAxes: $('show-axes'),
    showGrid: $('show-grid'),
    axisWidth: $('axis-width'),
    axisWidthValue: $('axis-width-value'),
    axisOpacity: $('axis-opacity'),
    axisOpacityValue: $('axis-opacity-value'),
    gridWidth: $('grid-width'),
    gridWidthValue: $('grid-width-value'),
    gridOpacity: $('grid-opacity'),
    gridOpacityValue: $('grid-opacity-value'),
    mapLeft: $('map-left'),
    mapMiddle: $('map-middle'),
    mapRight: $('map-right'),
    result: $('result'),
    resultTitle: $('result-title'),
    resultTime: $('result-time'),
    resultDetail: $('result-detail'),
    version: $('version'),
  };

  // 鼠标映射下拉
  for (const sel of [el.mapLeft, el.mapMiddle, el.mapRight]) {
    for (const key of ACTION_KEYS) {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = t(key);
      sel.append(opt);
    }
  }

  $('btn-restart').addEventListener('click', () => handlers.onRestart());
  $('btn-board').addEventListener('click', () => handlers.onOpenBoard());
  $('btn-options').addEventListener('click', () => handlers.onOpenOptions());
  $('board-cancel').addEventListener('click', () => closeBoard());
  $('board-start').addEventListener('click', () => {
    const side = Number(el.side.value);
    const mines = Number(el.mines.value);
    closeBoard();
    handlers.onApplyBoard(side, mines);
  });
  $('options-close').addEventListener('click', () => closeOptions());
  $('result-close').addEventListener('click', () => hideResult());
  $('result-again').addEventListener('click', () => {
    hideResult();
    handlers.onRestart();
  });

  el.spacing.addEventListener('input', () => {
    handlers.onSpacing(Number(el.spacing.value));
  });

  el.volume.addEventListener('input', () => {
    handlers.onOptions({ volume: Number(el.volume.value) });
  });
  el.cutawayDistance.addEventListener('input', () => {
    handlers.onOptions({ cutawayDistance: Number(el.cutawayDistance.value) / 10 });
  });
  el.mute.addEventListener('click', () => {
    handlers.onOptions({ muted: el.mute.getAttribute('aria-pressed') !== 'true' });
  });
  el.showFps.addEventListener('click', () => {
    handlers.onOptions({ showFps: el.showFps.getAttribute('aria-pressed') !== 'true' });
  });
  el.showAxes.addEventListener('click', () => {
    handlers.onOptions({ showAxes: el.showAxes.getAttribute('aria-pressed') !== 'true' });
  });
  el.showGrid.addEventListener('click', () => {
    handlers.onOptions({ showGrid: el.showGrid.getAttribute('aria-pressed') !== 'true' });
  });
  for (const [input, key] of [
    [el.axisWidth, 'axisWidth'], [el.gridWidth, 'gridWidth'],
    [el.axisOpacity, 'axisOpacity'], [el.gridOpacity, 'gridOpacity'],
  ]) {
    input.addEventListener('input', () => handlers.onOptions({ [key]: Number(input.value) }));
  }

  const bindMap = (sel, slot) =>
    sel.addEventListener('change', () => handlers.onOptions({ mapSlot: slot, mapAction: sel.value }));
  bindMap(el.mapLeft, 0);
  bindMap(el.mapMiddle, 1);
  bindMap(el.mapRight, 2);

  // 阶数变化时按 30% 密度重算雷数
  el.side.addEventListener('input', () => {
    const side = Number(el.side.value);
    const total = side ** 3;
    const mines = Math.max(1, Math.min(Math.round(total * 0.3), total - 1));
    el.mines.max = String(Math.max(1, total - 1));
    el.mines.value = String(mines);
    syncBoardHint();
  });
  el.mines.addEventListener('input', syncBoardHint);

  function syncBoardHint() {
    const side = Number(el.side.value);
    const mines = Number(el.mines.value);
    const total = side ** 3;
    const density = ((mines / total) * 100).toFixed(1);
    const rec = Math.max(1, Math.min(Math.round(total * 0.3), total - 1));
    el.sideValue.value = String(side);
    el.minesValue.value = String(mines);
    el.boardHint.textContent = t('boardHint', { side, total, density, rec });
  }

  function closeBoard() {
    el.boardPanel.hidden = true;
  }
  function closeOptions() {
    el.optionsPanel.hidden = true;
  }
  function hideResult() {
    el.result.hidden = true;
  }

  return {
    el,
    setStats(mines, flags, opened, need) {
      el.stats.textContent = t('stats', { mines, flags, opened, need });
    },
    setTime(sec) {
      el.time.textContent = formatTime(sec);
    },
    setFps(v) {
      if (v < 0) {
        el.fps.textContent = '';
        return;
      }
      el.fps.textContent = `${v} FPS`;
    },
    setHint(text) {
      el.hint.textContent = text;
    },
    setStatus(text) {
      if (el.status) el.status.textContent = text;
    },
    setSpacing(pct) {
      el.spacing.value = String(pct);
      el.spacingValue.textContent = `${pct}%`;
    },
    openBoard(side, mines) {
      const total = side ** 3;
      el.side.value = String(side);
      el.mines.max = String(Math.max(1, total - 1));
      el.mines.value = String(mines);
      syncBoardHint();
      el.boardPanel.hidden = false;
    },
    setCutawayDistance(distance) {
      el.cutawayDistance.value = String(Math.round(distance * 10));
      el.cutawayDistanceValue.textContent = distance.toFixed(1);
    },
    syncGuides(s) {
      for (const [btn, on] of [[el.showAxes, s.showAxes], [el.showGrid, s.showGrid]]) {
        btn.setAttribute('aria-pressed', String(on));
        btn.textContent = t(on ? 'toggleOn' : 'toggleOff');
      }
      el.axisWidth.value = String(s.axisWidth);
      el.axisWidthValue.textContent = String(s.axisWidth);
      el.gridWidth.value = String(s.gridWidth);
      el.gridWidthValue.textContent = String(s.gridWidth);
      el.axisOpacity.value = String(s.axisOpacity);
      el.axisOpacityValue.textContent = `${s.axisOpacity}%`;
      el.gridOpacity.value = String(s.gridOpacity);
      el.gridOpacityValue.textContent = `${s.gridOpacity}%`;
    },
    openOptions(s) {
      el.volume.value = String(s.volume);
      el.volumeValue.value = String(s.volume);
      this.setCutawayDistance(s.cutawayDistance);
      el.mute.setAttribute('aria-pressed', String(s.muted));
      el.showFps.setAttribute('aria-pressed', String(s.showFps));
      this.syncGuides(s);
      el.mapLeft.value = s.mouseMap[0];
      el.mapMiddle.value = s.mouseMap[1];
      el.mapRight.value = s.mouseMap[2];
      el.version.textContent = t('version', { version: s.version });
      el.optionsPanel.hidden = false;
    },
    syncVolume(v) {
      el.volume.value = String(v);
      el.volumeValue.value = String(v);
    },
    syncMute(m) {
      el.mute.setAttribute('aria-pressed', String(m));
    },
    showResult(won, sec, side, mines, copy = {}) {
      el.result.classList.toggle('won', won);
      el.result.classList.toggle('lost', !won);
      el.resultTitle.textContent = copy.title ?? t(won ? 'resultWon' : 'resultLost');
      el.resultTime.textContent = formatTime(sec);
      el.resultDetail.textContent = copy.detail ?? t('resultDetail', { side, mines });
      el.result.hidden = false;
    },

    isBoardOpen: () => !el.boardPanel.hidden,
    isOptionsOpen: () => !el.optionsPanel.hidden,
    isResultOpen: () => !el.result.hidden,
    closeBoard,
    closeOptions,
    hideResult,
  };
}
