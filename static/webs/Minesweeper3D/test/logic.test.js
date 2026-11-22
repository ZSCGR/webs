import test from 'node:test';
import assert from 'node:assert/strict';
import {
  Board,
  HIDDEN,
  REVEALED,
  FLAGGED,
  QUESTION,
  FACE_AXIS,
  seededRng,
  recommendedMines,
} from '../src/logic.js';

const RING_ALL = [];
for (const [dx, dy, dz] of [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
  [1, 1, 0], [1, -1, 0], [-1, 1, 0], [-1, -1, 0],
  [1, 0, 1], [1, 0, -1], [-1, 0, 1], [-1, 0, -1],
  [0, 1, 1], [0, 1, -1], [0, -1, 1], [0, -1, -1],
]) RING_ALL.push([dx, dy, dz]);

function emptyBoard(side, mines = 1) {
  const b = new Board(side, mines, seededRng(1));
  b.generated = true;
  return b;
}

function putMines(b, coords) {
  for (const [x, y, z] of coords) b.mines[b.index(x, y, z)] = 1;
  b.recompute();
}

test('邻格数：角 7、棱 11、面心 17、体心 26', () => {
  const b = emptyBoard(3);
  assert.equal(b.neighbors(b.index(0, 0, 0)).length, 7);
  assert.equal(b.neighbors(b.index(1, 0, 0)).length, 11);
  assert.equal(b.neighbors(b.index(1, 1, 0)).length, 17);
  assert.equal(b.neighbors(b.index(1, 1, 1)).length, 26);
});

test('面邻格是平面内的 3×3 去心，最多 8 格', () => {
  const b = emptyBoard(3);
  for (let f = 0; f < 6; f++) {
    assert.equal(b.faceNeighbors(b.index(1, 1, 1), f).length, 8);
  }
  // 角格在每个平面上只剩 3 个同伴
  assert.equal(b.faceNeighbors(b.index(0, 0, 0), 0).length, 3);
});

test('面法线轴顺序与渲染层的面顺序一致', () => {
  assert.deepEqual(FACE_AXIS, [2, 2, 0, 0, 1, 1]);
});

test('面计数：一颗雷只出现在含它的那几面', () => {
  const b = emptyBoard(3);
  putMines(b, [[1, 1, 1]]);

  // (0,0,1) 与雷同在 z=1 平面 → ±Z 两面为 1
  assert.deepEqual(b.faceCountsOf(b.index(0, 0, 1)), [1, 1, 0, 0, 0, 0]);
  // (1,0,1) 的雷在 z=1 与 x=1 两个平面里 → 四面为 1
  assert.deepEqual(b.faceCountsOf(b.index(1, 0, 1)), [1, 1, 1, 1, 0, 0]);
  // (1,1,0) 在雷正下方：z 平面不同层，但 x=1 与 y=1 两个平面都含有这颗雷
  // → ±X ±Y 四面为 1，±Z 为 0
  assert.deepEqual(b.faceCountsOf(b.index(1, 1, 0)), [0, 0, 1, 1, 1, 1]);
  // (2,2,0) 与雷的偏移是 (1,1,1)（体对角）→ 任何一面都看不到
  assert.deepEqual(b.faceCountsOf(b.index(2, 2, 0)), [0, 0, 0, 0, 0, 0]);
});

test('随机盘面不变量：每面 ≤ 8、加权和吻合、同轴两面相同', () => {
  const rng = seededRng(20261112);
  let checked = 0;
  for (let trial = 0; trial < 40; trial++) {
    const side = 3 + (trial % 5);
    const b = new Board(side, recommendedMines(side), rng);
    b.placeMines(Math.floor(rng() * b.total), rng);

    for (let i = 0; i < b.total; i++) {
      if (b.mines[i] === 1) continue;
      checked++;
      const fc = b.faceCountsOf(i);
      for (const v of fc) assert.ok(v >= 0 && v <= 8, `面计数越界 ${v}`);

      // 轴向邻格权重 4、棱对角 2、体对角 0
      const [x, y, z] = b.coord(i);
      let expect = 0;
      for (const [dx, dy, dz] of RING_ALL) {
        const nx = x + dx;
        const ny = y + dy;
        const nz = z + dz;
        if (!b.inBounds(nx, ny, nz)) continue;
        if (b.mines[b.index(nx, ny, nz)] !== 1) continue;
        const nz1 = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
        expect += nz1 === 1 ? 4 : 2;
      }
      assert.equal(fc.reduce((a, v) => a + v, 0), expect, `六面之和与加权和不符 @${i}`);
      assert.ok(fc[0] === fc[1] && fc[2] === fc[3] && fc[4] === fc[5], '同轴两面应相同');
    }
  }
  assert.ok(checked > 1000, `覆盖不足：${checked}`);
});

test('首击安全：首击格及其闭邻域无雷', () => {
  const rng = seededRng(7);
  for (const side of [3, 4, 5]) {
    const b = new Board(side, recommendedMines(side), rng);
    const first = Math.floor(rng() * b.total);
    b.placeMines(first, rng);
    for (const n of [first, ...b.neighbors(first)]) {
      if (side === 3) continue; // 3 阶装不下时会退化，单独看
      assert.equal(b.mines[n], 0, `首击邻域 ${n} 不应有雷`);
    }
  }
});

test('按面展开：某一面为 0 就打开该平面内的格子', () => {
  const b = emptyBoard(3);
  putMines(b, [[0, 1, 1]]);
  const center = b.index(1, 1, 1);
  const fc = b.faceCountsOf(center);
  assert.equal(fc[2], 0, '±X 面应为 0');

  b.reveal(center);
  assert.equal(b.states[b.index(1, 0, 1)], REVEALED, '±X 平面内的格子应被打开');
  assert.equal(b.states[b.index(0, 1, 1)], HIDDEN, '雷本身不能被展开');
});

test('三态标记：未标记 → 旗 → 问号 → 未标记，只有旗计数', () => {
  const b = emptyBoard(3);
  const i = b.index(1, 1, 1);
  assert.equal(b.flagCount, 0);
  b.cycleMark(i);
  assert.equal(b.states[i], FLAGGED);
  assert.equal(b.flagCount, 1);
  b.cycleMark(i);
  assert.equal(b.states[i], QUESTION);
  assert.equal(b.flagCount, 0);
  b.cycleMark(i);
  assert.equal(b.states[i], HIDDEN);
});

test('按平面和弦：点哪面只判哪面', () => {
  const b = emptyBoard(3, 3);
  putMines(b, [[0, 1, 1], [1, 0, 1], [1, 1, 0]]);
  const center = b.index(1, 1, 1);
  b.reveal(center);
  assert.deepEqual(b.faceCountsOf(center), [2, 2, 2, 2, 2, 2]);

  // 没插旗：不触发
  assert.equal(b.chordFace(center, 0).opened.length, 0);

  // 只在 +Z 平面插旗
  b.cycleMark(b.index(1, 0, 1));
  b.cycleMark(b.index(0, 1, 1));

  // 别的平面旗数为 0，不触发
  assert.equal(b.chordFace(center, 4).opened.length, 0, '+Y 面不该被 +Z 的旗带动');

  // +Z 面旗数对上，揭开该平面其余 6 格
  const res = b.chordFace(center, 0);
  assert.equal(res.boom, false);
  for (const [x, y] of [[0, 0], [2, 0], [2, 1], [0, 2], [1, 2], [2, 2]]) {
    assert.equal(b.states[b.index(x, y, 1)], REVEALED, `(${x},${y},1) 应被揭开`);
  }
  assert.equal(b.states[b.index(1, 1, 0)], HIDDEN, '平面外的雷不该被揭开');
});

test('旗插错位置：旗数凑够但会引爆', () => {
  const b = emptyBoard(3, 3);
  putMines(b, [[0, 1, 1], [1, 0, 1], [1, 1, 0]]);
  const center = b.index(1, 1, 1);
  b.reveal(center);

  b.cycleMark(b.index(1, 0, 1)); // 真雷
  b.cycleMark(b.index(2, 2, 1)); // 空位
  const res = b.chordFace(center, 0);
  assert.equal(res.boom, true);
  assert.equal(b.gameOver, true);
  assert.equal(b.won, false);
});

test('清空判胜', () => {
  const b = emptyBoard(3, 1);
  putMines(b, [[0, 0, 0]]);
  for (let i = 0; i < b.total; i++) {
    if (b.mines[i] === 0) b.reveal(i);
  }
  assert.equal(b.won, true);
  assert.equal(b.gameOver, true);
});

test('推荐雷数按 30% 密度', () => {
  assert.equal(recommendedMines(5), 38);
  assert.equal(recommendedMines(3), 8);
});
