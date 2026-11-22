// 棋盘逻辑。不碰 DOM、不碰 three，可以在 node 下直接测。
// 索引约定与 Godot 版一致：i = x + sx * (y + sy * z)

export const HIDDEN = 0;
export const REVEALED = 1;
export const FLAGGED = 2;
export const QUESTION = 3;

// 六个面的法线轴：+Z -Z +X -X +Y -Y
export const FACE_AXIS = [2, 2, 0, 0, 1, 1];

// 每格 6 个面的雷数统计的是「该面所在平面内的 8 个邻格」。
// 推论：轴向邻格落在 2 个坐标平面里、被 4 个面统计；棱对角 1 个平面、2 个面；
// 体对角邻格不落在任何坐标平面里，任何一面都看不到它。
const RING = [];
for (let a = -1; a <= 1; a++) {
  for (let b = -1; b <= 1; b++) {
    if (a === 0 && b === 0) continue;
    RING.push([a, b]);
  }
}

const OFFSETS = [];
for (let z = -1; z <= 1; z++) {
  for (let y = -1; y <= 1; y++) {
    for (let x = -1; x <= 1; x++) {
      if (x === 0 && y === 0 && z === 0) continue;
      OFFSETS.push([x, y, z]);
    }
  }
}

/** 确定性随机数，测试用；默认走 Math.random */
export function seededRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Board {
  constructor(side, mines, rng = Math.random) {
    this.side = side;
    this.total = side * side * side;
    this.mineTotal = Math.max(1, Math.min(mines, this.total - 1));
    this.rng = rng;

    this.mines = new Uint8Array(this.total);
    this.counts = new Uint8Array(this.total);
    this.faceCounts = new Uint8Array(this.total * 6);
    this.states = new Uint8Array(this.total);

    this.generated = false;
    this.revealedCount = 0;
    this.flagCount = 0;
    this.hitIndex = -1;
    this.gameOver = false;
    this.won = false;
  }

  index(x, y, z) {
    return x + this.side * (y + this.side * z);
  }

  coord(i) {
    const plane = this.side * this.side;
    return [i % this.side, Math.floor(i / this.side) % this.side, Math.floor(i / plane)];
  }

  inBounds(x, y, z) {
    return x >= 0 && y >= 0 && z >= 0 && x < this.side && y < this.side && z < this.side;
  }

  neighbors(i) {
    const [x, y, z] = this.coord(i);
    const out = [];
    for (const [dx, dy, dz] of OFFSETS) {
      const nx = x + dx;
      const ny = y + dy;
      const nz = z + dz;
      if (this.inBounds(nx, ny, nz)) out.push(this.index(nx, ny, nz));
    }
    return out;
  }

  /** 某一面所在平面内的 8 个邻格 */
  faceNeighbors(i, face) {
    const [x, y, z] = this.coord(i);
    const axis = FACE_AXIS[face];
    const out = [];
    for (const [a, b] of RING) {
      let nx = x;
      let ny = y;
      let nz = z;
      if (axis === 2) {
        nx = x + a;
        ny = y + b;
      } else if (axis === 0) {
        ny = y + a;
        nz = z + b;
      } else {
        nx = x + a;
        nz = z + b;
      }
      if (this.inBounds(nx, ny, nz)) out.push(this.index(nx, ny, nz));
    }
    return out;
  }

  faceCountsOf(i) {
    const out = [];
    for (let f = 0; f < 6; f++) out.push(this.faceCounts[i * 6 + f]);
    return out;
  }

  /** 首击之后再布雷：首击格的闭邻域为空，保证第一下必然展开 */
  placeMines(first, rng = this.rng) {
    const excluded = new Set([first, ...this.neighbors(first)]);
    let candidates = [];
    for (let i = 0; i < this.total; i++) if (!excluded.has(i)) candidates.push(i);

    // 盘面太小、剔除闭邻域后装不下，退化为只排除首击格
    if (candidates.length < this.mineTotal) {
      candidates = [];
      for (let i = 0; i < this.total; i++) if (i !== first) candidates.push(i);
    }

    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    for (let k = 0; k < this.mineTotal; k++) this.mines[candidates[k]] = 1;

    this.recompute();
    this.generated = true;
  }

  recompute() {
    for (let i = 0; i < this.total; i++) {
      if (this.mines[i] === 1) {
        this.counts[i] = 0;
      } else {
        let c = 0;
        for (const n of this.neighbors(i)) c += this.mines[n];
        this.counts[i] = c;
      }
      for (let f = 0; f < 6; f++) {
        if (this.mines[i] === 1) {
          this.faceCounts[i * 6 + f] = 0;
          continue;
        }
        let c = 0;
        for (const n of this.faceNeighbors(i, f)) c += this.mines[n];
        this.faceCounts[i * 6 + f] = c;
      }
    }
  }

  /** 返回 { opened: number[], boom: boolean } */
  reveal(i, opened = []) {
    const boom = false;
    if (this.gameOver || !this.generated) return { opened, boom };
    if (i < 0 || i >= this.total || this.states[i] === REVEALED) return { opened, boom };
    if (this.states[i] === FLAGGED) return { opened, boom };

    if (this.mines[i] === 1) {
      this.states[i] = REVEALED;
      this.hitIndex = i;
      this.gameOver = true;
      opened.push(i);
      return { opened, boom: true };
    }

    const stack = [i];
    while (stack.length) {
      const cur = stack.pop();
      if (this.states[cur] === REVEALED || this.states[cur] === FLAGGED) continue;
      if (this.mines[cur] === 1) continue;
      this.states[cur] = REVEALED;
      this.revealedCount++;
      opened.push(cur);

      // 某一面为 0，说明该平面内 8 格必无雷，整片打开
      for (let f = 0; f < 6; f++) {
        if (this.faceCounts[cur * 6 + f] !== 0) continue;
        for (const n of this.faceNeighbors(cur, f)) {
          if (this.states[n] === HIDDEN || this.states[n] === QUESTION) stack.push(n);
        }
      }
    }

    if (this.revealedCount === this.total - this.mineTotal) {
      this.won = true;
      this.gameOver = true;
    }
    return { opened, boom: false };
  }

  /** 右键三态：未标记 → 旗 → 问号 → 未标记。只有旗计数。 */
  cycleMark(i) {
    if (this.gameOver) return;
    if (i < 0 || i >= this.total || this.states[i] === REVEALED) return;
    switch (this.states[i]) {
      case HIDDEN:
        this.states[i] = FLAGGED;
        this.flagCount++;
        break;
      case FLAGGED:
        this.states[i] = QUESTION;
        this.flagCount--;
        break;
      default:
        this.states[i] = HIDDEN;
    }
  }

  /** 和弦按平面判定：点哪一面，就只在这一面所属的平面里比旗数 */
  chordFace(i, face) {
    const opened = [];
    if (this.gameOver || !this.generated) return { opened, boom: false };
    if (i < 0 || i >= this.total || face < 0 || face > 5) return { opened, boom: false };
    if (this.states[i] !== REVEALED) return { opened, boom: false };

    const need = this.faceCounts[i * 6 + face];
    if (need === 0) return { opened, boom: false };

    const ring = this.faceNeighbors(i, face);
    let flagged = 0;
    const targets = [];
    for (const n of ring) {
      if (this.states[n] === FLAGGED) flagged++;
      else if (this.states[n] === HIDDEN || this.states[n] === QUESTION) targets.push(n);
    }
    if (flagged !== need) return { opened, boom: false };

    let boom = false;
    for (const n of targets) {
      const res = this.reveal(n);
      opened.push(...res.opened);
      if (res.boom) {
        boom = true;
        break;
      }
    }
    return { opened, boom };
  }

  remainingMines() {
    return this.mineTotal - this.flagCount;
  }

  mineIndices() {
    const out = [];
    for (let i = 0; i < this.total; i++) if (this.mines[i] === 1) out.push(i);
    return out;
  }
}

/** 推荐的雷数：30% 密度 */
export function recommendedMines(side) {
  const total = side * side * side;
  return Math.max(1, Math.min(Math.round(total * 0.3), total - 1));
}
