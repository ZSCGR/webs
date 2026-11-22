// 端到端检查：用真实浏览器打开构建产物，模拟鼠标操作，断言盘面状态。
// 只在本地跑（CI 里没有稳定的 Chrome 路径）：
//   node scripts/e2e.mjs [path/to/dist/index.html]
//
// macOS 默认用系统 Chrome，其他平台用 CHROME_PATH 环境变量。

import puppeteer from 'puppeteer-core';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

const chrome = CANDIDATES.find((p) => existsSync(p));
if (!chrome) {
  console.error('找不到 Chrome，设置 CHROME_PATH 再跑');
  process.exit(1);
}

const target = resolve(process.argv[2] || 'dist/index.html');
if (!existsSync(target)) {
  console.error(`产物不存在：${target}，先跑 npm run build`);
  process.exit(1);
}

let failures = 0;
const check = (ok, msg) => {
  console.log(`${ok ? '  ok  ' : '  x  '}${msg}`);
  if (!ok) failures++;
};

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--window-size=1280,720'],
  defaultViewport: { width: 1280, height: 720 },
});

try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  await page.goto(`${pathToFileURL(target).href}?seed=20261112`);
  await page.waitForFunction(() => window.minesweeper3d && window.minesweeper3d.state.board, { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 600));

  const stats = () => page.evaluate(() => ({
    mines: window.minesweeper3d.state.board.mineTotal,
    revealed: window.minesweeper3d.state.board.revealedCount,
    flags: window.minesweeper3d.state.board.flagCount,
    over: window.minesweeper3d.state.board.gameOver,
    generated: window.minesweeper3d.state.board.generated,
  }));

  // 找一个能点到的方块：把中心方块投影到屏幕坐标
  const centerOf = (x, y, z) =>
    page.evaluate((x, y, z) => {
      const { world, state } = window.minesweeper3d;
      const i = state.board.index(x, y, z);
      const cell = world.cells[i];
      if (!cell) return null;
      const v = cell.root.position.clone();
      v.project(world.camera);
      return { x: (v.x * 0.5 + 0.5) * 1280, y: (-v.y * 0.5 + 0.5) * 720, index: i };
    }, x, y, z);

  const side = await page.evaluate(() => window.minesweeper3d.state.board.side);
  const hi = side - 1;
  const target1 = await centerOf(hi, hi, hi);
  check(target1 !== null, '取到面向相机那个角格的屏幕坐标');

  // 左键揭示
  const before = await stats();
  await page.mouse.click(target1.x, target1.y);
  await new Promise((r) => setTimeout(r, 300));
  const afterReveal = await stats();
  check(afterReveal.generated, '首次点击后布雷完成');
  check(afterReveal.revealed > before.revealed, `左键揭示生效（${before.revealed} → ${afterReveal.revealed}）`);
  check(afterReveal.mines === before.mines, '雷数不变');

  // 掠射角：+X 面与视线夹角接近 84°，数字仍应有一点可见度
  const grazing = await page.evaluate(() => {
    const { world } = window.minesweeper3d;
    const cell = world.cells.find((c) => c && !c.cube.userData.peeled && c.planes[2]);
    if (!cell) return null;
    const state = { index: world.cells.indexOf(cell), yaw: world.yaw, pitch: world.cameraPitch };
    world.yaw = (Math.asin(0.1) * 180) / Math.PI;
    world.cameraPitch = 0;
    world.applyCamera();
    return state;
  });
  if (grazing) {
    await new Promise((r) => setTimeout(r, 150));
    const edge = await page.evaluate((i) => {
      const f = window.minesweeper3d.world.cells[i].planes[2];
      return { visible: f.visible, opacity: f.material.opacity };
    }, grazing.index);
    check(edge.visible && edge.opacity > 0.1,
      `极限角度仍能读到数字（透明度 ${edge.opacity.toFixed(2)}）`);
    await page.evaluate((s) => {
      const { world } = window.minesweeper3d;
      world.yaw = s.yaw;
      world.cameraPitch = s.pitch;
      world.applyCamera();
    }, grazing);
    await new Promise((r) => setTimeout(r, 150));
  } else {
    check(false, '没找到可测掠射角的数字面');
  }

  // 右键三次循环：旗 → 问号 → 未标记
  // 找一个「从相机看过去能直接点到」的未揭示格：
  // 光靠投影中心不行，深处的格子会被外层挡住
  const hidden = await page.evaluate(() => {
    const { state, world } = window.minesweeper3d;
    const b = state.board;
    const W = 1280;
    const H = 720;
    for (let i = 0; i < b.total; i++) {
      if (b.states[i] !== 0 || b.mines[i] === 1) continue;
      const cell = world.cells[i];
      const v = cell.root.position.clone().project(world.camera);
      // 浏览器鼠标事件会把坐标取整，探测时也用取整后的位置
      const sx = Math.round((v.x * 0.5 + 0.5) * W);
      const sy = Math.round((-v.y * 0.5 + 0.5) * H);
      if (sx < 0 || sy < 0 || sx > W || sy > H) continue;
      const hit = world.pick(sx, sy);
      if (hit && hit.index === i) return { x: sx, y: sy, index: i };
    }
    return null;
  });
  const spot = hidden;
  if (spot) {
    await page.mouse.click(spot.x, spot.y, { button: 'right' });
    await new Promise((r) => setTimeout(r, 150));
    let s = await page.evaluate((i) => window.minesweeper3d.state.board.states[i], spot.index);
    check(s === 2, '右键插旗');
    await page.mouse.click(spot.x, spot.y, { button: 'right' });
    await new Promise((r) => setTimeout(r, 150));
    s = await page.evaluate((i) => window.minesweeper3d.state.board.states[i], spot.index);
    check(s === 3, '右键第二下变问号');
    await page.mouse.click(spot.x, spot.y, { button: 'right' });
    await new Promise((r) => setTimeout(r, 150));
    s = await page.evaluate((i) => window.minesweeper3d.state.board.states[i], spot.index);
    check(s === 0, '右键第三下回到未标记');
  } else {
    check(false, '没找到可标记的格子');
  }

  // 间距滑块：只挪位置，不改方块尺寸
  const beforeSpacing = await page.evaluate(() => ({
    pos: window.minesweeper3d.world.cells[0].basePosition.x,
    scale: window.minesweeper3d.world.cells[0].cube.scale.x,
    peeled: window.minesweeper3d.world.cells.filter((c) => c && c.cube.userData.peeled).length,
  }));
  await page.evaluate(() => {
    const el = document.getElementById('spacing');
    el.value = '150';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await new Promise((r) => setTimeout(r, 200));
  const moved = await page.evaluate(() => ({
    pos: window.minesweeper3d.world.cells[0].basePosition.x,
    scale: window.minesweeper3d.world.cells[0].cube.scale.x,
    peeled: window.minesweeper3d.world.cells.filter((c) => c && c.cube.userData.peeled).length,
  }));
  check(Math.abs(moved.pos - beforeSpacing.pos) > 1e-6, '间距变化后方块位置改变');
  check(Math.abs(moved.scale - beforeSpacing.scale) < 1e-6, `方块尺寸不变（${beforeSpacing.scale.toFixed(2)}）`);
  check(moved.peeled === beforeSpacing.peeled,
    `间距变化不改变剥离数量（${beforeSpacing.peeled} → ${moved.peeled}）`);

  // 和弦：左右同按。先探出射线实际命中的面，再按那一面的数字插旗
  const chordSetup = await page.evaluate(() => {
    const { state, world } = window.minesweeper3d;
    const b = state.board;
    const W = 1280;
    const H = 720;
    for (let i = 0; i < b.total; i++) {
      if (b.states[i] !== 1) continue;
      const cell = world.cells[i];
      const v = cell.root.position.clone().project(world.camera);
      const sx = (v.x * 0.5 + 0.5) * W;
      const sy = (-v.y * 0.5 + 0.5) * H;
      const hit = world.pick(sx, sy);
      if (!hit || hit.index !== i) continue;

      const face = hit.face;
      const need = b.faceCounts[i * 6 + face];
      if (need === 0) continue;
      const hidden = b.faceNeighbors(i, face).filter((n) => b.states[n] === 0);
      // 至少要留一格给和弦去开，否则看不出效果
      if (hidden.length <= need) continue;

      // 直接摆状态，不管旗插的是不是雷：这一项测的是「左右同按会不会走和弦」
      for (let k = 0; k < need; k++) {
        b.states[hidden[k]] = 2;
        b.flagCount++;
        world.refresh(hidden[k]);
      }
      world.refresh(i);
      return { x: sx, y: sy, need, face, revealed: b.revealedCount };
    }
    return null;
  });
  if (chordSetup) {
    // 记录实际到达画布的事件序列，便于定位是浏览器没发还是逻辑没走
    await page.evaluate(() => {

    });
    await page.mouse.move(chordSetup.x, chordSetup.y);
    await page.mouse.down({ button: 'left' });
    await page.mouse.down({ button: 'right' });
    await page.mouse.up({ button: 'left' });
    await page.mouse.up({ button: 'right' });
    await new Promise((r) => setTimeout(r, 250));
    const after = await page.evaluate(() => ({
      revealed: window.minesweeper3d.state.board.revealedCount,
      over: window.minesweeper3d.state.board.gameOver,
    }));
    check(after.revealed > chordSetup.revealed || after.over,
      `左右同按触发和弦（面 ${chordSetup.face}，需 ${chordSetup.need} 旗，${chordSetup.revealed} → ${after.revealed}）`);
  } else {
    check(false, '找不到可用于和弦的格子');
  }

  // 和弦可能踩雷，结算弹窗会盖住界面；先收掉再测浮层
  await page.evaluate(() => window.minesweeper3d.ui.hideResult());
  await new Promise((r) => setTimeout(r, 100));

  // 布局：浮层开关
  await page.click('#btn-options');
  await new Promise((r) => setTimeout(r, 200));
  check(await page.$eval('#options-panel', (e) => !e.hidden), '选项页可以打开');
  const shownVersion = await page.$eval('#version', (e) => e.textContent);
  const pkgVersion = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
  check(shownVersion.includes(pkgVersion), `版本号来自 package.json（${shownVersion.trim()}）`);

  // 坐标轴与网格开关：即时生效、写入设置、可以关闭
  await page.click('#show-axes');
  await page.click('#show-grid');
  await new Promise((r) => setTimeout(r, 150));
  const guidesOn = await page.evaluate(() => {
    const { world, settings } = window.minesweeper3d;
    return {
      axes: world.axesGroup.visible,
      grid: world.gridGroup.visible,
      settings: settings.showAxes && settings.showGrid,
      saved: JSON.parse(localStorage.getItem('minesweeper3d.settings')),
      buttons: [document.getElementById('show-axes'), document.getElementById('show-grid')]
        .map((b) => b.getAttribute('aria-pressed')),
    };
  });
  check(guidesOn.axes && guidesOn.grid && guidesOn.settings, '坐标轴与网格开关即时生效');
  check(guidesOn.saved.showAxes && guidesOn.saved.showGrid, '开关写入 localStorage');
  check(guidesOn.buttons.every((v) => v === 'true'), '按钮状态与设置同步');

  await page.evaluate(() => {
    for (const [id, value] of [
      ['axis-width', '4'], ['axis-opacity', '55'],
      ['grid-width', '3'], ['grid-opacity', '40'],
    ]) {
      const el = document.getElementById(id);
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await new Promise((r) => setTimeout(r, 150));
  const guideStyle = await page.evaluate(() => {
    const { world, settings } = window.minesweeper3d;
    return {
      axis: [world.axesGroup.children[0].material.linewidth, world.axesGroup.children[0].material.opacity],
      grid: [world.gridGroup.children[0].material.linewidth, world.gridGroup.children[0].material.opacity],
      settings: [settings.axisWidth, settings.axisOpacity, settings.gridWidth, settings.gridOpacity],
    };
  });
  check(guideStyle.axis[0] === 4 && Math.abs(guideStyle.axis[1] - 0.55) < 0.01
    && guideStyle.grid[0] === 3 && Math.abs(guideStyle.grid[1] - 0.4) < 0.01,
  `辅助线粗细与透明度可调（${guideStyle.axis} / ${guideStyle.grid}）`);
  check(guideStyle.settings.join(',') === '4,55,3,40', '辅助线样式写入设置');

  await page.click('#show-axes');
  await page.click('#show-grid');
  await new Promise((r) => setTimeout(r, 150));
  const guidesOff = await page.evaluate(() => {
    const { world } = window.minesweeper3d;
    return world.axesGroup.visible || world.gridGroup.visible;
  });
  check(!guidesOff, '坐标轴与网格都可以关闭');

  // 剥离：按镜头距离触发，缩远不剥离、拉近剥得更多；剥出的方块移出视野且不吃点击
  await page.evaluate(() => {
    const el = document.getElementById('cutaway-distance');
    el.value = '150';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await new Promise((r) => setTimeout(r, 200));
  const cutaway = await page.evaluate(() => {
    const { world, settings } = window.minesweeper3d;
    const peeledCells = world.cells.filter((c) => c && c.cube.userData.peeled);
    const target = peeledCells[0];
    const v = target.basePosition.clone().project(world.camera);
    const rect = world.canvas.getBoundingClientRect();
    const sx = Math.round((v.x * 0.5 + 0.5) * rect.width + rect.left);
    const sy = Math.round((-v.y * 0.5 + 0.5) * rect.height + rect.top);
    const hit = world.pick(sx, sy);
    return {
      distance: settings.cutawayDistance,
      cameraDistance: world.distance,
      saved: JSON.parse(localStorage.getItem('minesweeper3d.settings')),
      peeled: peeledCells.length,
      coords: peeledCells.map((c) => c.coord.join(',')),
      moved: target.root.position.distanceTo(target.basePosition),
      kept: world.cells.filter((c) => c && !c.cube.userData.peeled && c.cube.userData.baseVisible).length,
      targetIndex: world.cells.indexOf(target),
      pickedIndex: hit ? hit.index : -1,
      oldRow: !!document.getElementById('fade-depth'),
      label: document.getElementById('cutaway-distance-value').textContent.trim(),
    };
  });
  check(cutaway.distance === 15 && !cutaway.oldRow, '剥离距离即时生效，旧滑块已移除');
  check(cutaway.label === '15.0', `滑块数字随拖动更新（${cutaway.label}）`);
  check(cutaway.saved.cutawayDistance === 15 && cutaway.saved.fadeDepth === undefined,
    '剥离距离写入 localStorage，旧字段不再保存');
  check(cutaway.peeled > 0 && cutaway.kept > 0,
    `镜头距离 ${cutaway.cameraDistance.toFixed(1)} 时剥离外层（移出 ${cutaway.peeled} / 保留 ${cutaway.kept}）`);
  check(cutaway.peeled <= 8, `剥离按整面/整角成块，不切零碎层（${cutaway.coords.join(' ')}）`);
  check(cutaway.moved > cutaway.cameraDistance, '被剥离的方块沿视线反向移出视野');
  check(cutaway.pickedIndex !== cutaway.targetIndex, '被剥离的方块不再吃掉点击');

  const anim = await page.evaluate(() => {
    const { world } = window.minesweeper3d;
    const cell = world.cells.find((c) => c && c.cube.userData.peeled);
    cell.root.position.copy(cell.basePosition);
    cell.cube.userData.peelT = 0;
    world.updateCutaway(0);
    const start = cell.root.position.distanceTo(cell.basePosition);
    world.updateCutaway(0.05);
    const first = cell.root.position.distanceTo(cell.basePosition);
    world.updateCutaway(0.05);
    const second = cell.root.position.distanceTo(cell.basePosition);
    world.updateCutaway(1);
    const end = cell.root.position.distanceTo(cell.basePosition);
    return { start, first, second, end };
  });
  check(anim.start < anim.first && anim.first < anim.second && anim.second < anim.end,
    `剥离是加速动画（${anim.start.toFixed(2)} → ${anim.first.toFixed(2)} → ${anim.second.toFixed(2)} → ${anim.end.toFixed(2)}）`);
  check(anim.second - anim.first > anim.first - anim.start, '起飞阶段速度递增');

  const zoom = await page.evaluate(() => {
    const { world } = window.minesweeper3d;
    const original = world.distance;
    world.zoom(10);
    world.updateCutaway();
    const far = world.cells.filter((c) => c && c.cube.userData.peeled).length;
    world.zoom(-15);
    world.updateCutaway();
    const near = world.cells.filter((c) => c && c.cube.userData.peeled).length;
    world.distance = original;
    world.applyCamera();
    return { far, near };
  });
  check(zoom.far === 0, `缩远到距离外不剥离（移出 ${zoom.far}）`);
  check(zoom.near > cutaway.peeled, `拉近后剥离更多（${cutaway.peeled} → ${zoom.near}）`);

  await page.evaluate(() => {
    const el = document.getElementById('cutaway-distance');
    el.value = '150';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });

  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 200));
  check(await page.$eval('#options-panel', (e) => e.hidden), 'Esc 关掉选项页');

  // 结算弹窗：直接揭示到胜利
  await page.evaluate(() => {
    const { state, world } = window.minesweeper3d;
    const b = state.board;
    for (let i = 0; i < b.total; i++) {
      if (b.mines[i] === 0) {
        const res = b.reveal(i);
        world.refreshArea(res.opened);
      }
    }
    window.minesweeper3d.ui?.updateStats?.();
  });
  await new Promise((r) => setTimeout(r, 300));
  const won = await page.evaluate(() => window.minesweeper3d.state.board.won);

  check(errors.length === 0, `控制台无报错${errors.length ? '：' + errors.slice(0, 2).join(' | ') : ''}`);

  // 结算时插错的旗显示红叉，而不是继续伪装成正确旗
  const wrongFlag = await page.evaluate(() => {
    const { world, state } = window.minesweeper3d;
    const b = state.board;
    let i = 0;
    while (i < b.total && b.mines[i] === 1) i++;
    const previous = b.states[i];
    b.states[i] = 2;
    world.refresh(i);
    world.markWrongFlags();
    const cell = world.cells[i];
    const result = {
      wrong: cell.cube.userData.wrongFlag,
      red: cell.cube.material === world.materials.wrong,
      cross: cell.markPlanes.some((m) => m && m.material.map === world.wrongMat.map),
    };
    cell.cube.userData.wrongFlag = false;
    b.states[i] = previous;
    world.refresh(i);
    return result;
  });
  check(wrongFlag.wrong && wrongFlag.red && wrongFlag.cross, '踩雷后插错的旗显示红色叉号');

  // 踩雷后调间距：重绘会把摊开的雷盖回方块，这里守住
  const spacingKeepsMines = await page.evaluate(() => {
    const { world, state } = window.minesweeper3d;
    const b = state.board;
    const mine = b.mineIndices()[0];
    b.hitIndex = mine;
    b.gameOver = true;
    b.won = false;
    world.markMines();
    const cell = world.cells[mine];
    const before = !!(cell.mine && cell.mine.visible) && !cell.cube.visible;
    world.relayout(1.35);
    const after = !!(cell.mine && cell.mine.visible) && !cell.cube.visible;
    world.relayout(1.0);
    const back = !!(cell.mine && cell.mine.visible);
    return { before, after, back };
  });
  check(spacingKeepsMines.before, '踩雷后雷模型显示、方块隐藏');
  check(spacingKeepsMines.after, '调大间距跨过阈值后雷不消失');
  check(spacingKeepsMines.back, '拖回原间距雷仍在');

  // 结算弹窗：直接调 UI，验证文案与按钮
  await page.evaluate(() => window.minesweeper3d.ui.showResult(true, 83.4, 5, 38));
  await new Promise((r) => setTimeout(r, 150));
  check(await page.$eval('#result', (e) => !e.hidden), '结算弹窗可以打开');
  check((await page.$eval('#result-title', (e) => e.textContent)) === '清空', '胜利标题是「清空」');
  check((await page.$eval('#result-time', (e) => e.textContent)) === '01:23', '用时格式化成 mm:ss');

  await page.keyboard.press('r');
  await new Promise((r) => setTimeout(r, 300));
  const byKey = await page.evaluate(() => ({
    revealed: window.minesweeper3d.state.board.revealedCount,
    hidden: document.getElementById('result').hidden,
  }));
  check(byKey.hidden && byKey.revealed === 0, '结算弹窗打开时按 R 直接重开');

  await page.evaluate(() => window.minesweeper3d.ui.showResult(true, 83.4, 5, 38));
  await new Promise((r) => setTimeout(r, 100));
  await page.click('#result-again');
  await new Promise((r) => setTimeout(r, 300));
  const restarted = await page.evaluate(() => ({
    revealed: window.minesweeper3d.state.board.revealedCount,
    hidden: document.getElementById('result').hidden,
  }));
  check(restarted.hidden, '再来一局会关掉弹窗');
  check(restarted.revealed === 0, '再来一局重置盘面');

  // 截图前把间距还原成 100%，便于看默认观感
  await page.evaluate(() => {
    const el = document.getElementById('spacing');
    el.value = '100';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await new Promise((r) => setTimeout(r, 400));

  // 转动视角不应重新切掉一批方块，数字不会因视角变化突然消失
  const peelKey = () => page.evaluate(() => window.minesweeper3d.world.cells
    .map((c) => (c && c.cube.userData.peeled ? '1' : '0')).join(''));
  const beforeRotate = await peelKey();
  await page.evaluate(() => window.minesweeper3d.world.orbit(180, 0));
  await new Promise((r) => setTimeout(r, 200));
  const rotated = await page.evaluate(() => {
    const cells = window.minesweeper3d.world.cells.filter((c) => c);
    return {
      peeled: cells.filter((c) => c.cube.userData.peeled).length,
      kept: cells.filter((c) => !c.cube.userData.peeled && c.cube.userData.baseVisible).length,
    };
  });
  check(rotated.peeled > 0 && rotated.kept > 0,
    `旋转后仍只剥离外层（移出 ${rotated.peeled} / 保留 ${rotated.kept}）`);
  check((await peelKey()) !== beforeRotate, '旋转视角会重新计算切面');
  await page.evaluate(() => window.minesweeper3d.world.orbit(-180, 0));
  await new Promise((r) => setTimeout(r, 200));

  await page.screenshot({ path: 'dist/e2e.png' });
  console.log(`\n${failures === 0 ? 'PASS' : `FAIL ${failures}`}`);
  process.exitCode = failures === 0 ? 0 : 1;
} finally {
  await browser.close();
}
