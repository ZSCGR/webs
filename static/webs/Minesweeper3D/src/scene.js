import * as THREE from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { makeNumberTexture, makeFlagTexture, makeQuestionTexture, makeWrongTexture } from './geometry.js';
import { Board, HIDDEN, REVEALED, FLAGGED, QUESTION } from './logic.js';

// 立方体边长与收缩比例，和 Godot 版保持一致
export const HIDDEN_SIZE = 0.88;
export const REVEALED_SIZE = 0.70;
// 格距超过这个值，方块之间的缝隙已经宽到能看见所有面
export const OPEN_VIEW_PITCH = 1.15;

const COLORS = {
  hidden: 0xe0e5ee,
  flag: 0xe0cda4,
  question: 0xb4bdcd,
  open: 0x363f50,
  mine: 0xa32832,
  hit: 0xff5151,
  wrong: 0x8f3038,
};

// 面的顺序 +Z -Z +X -X +Y -Y，与 logic.js 的 FACE_AXIS 对齐
const FACE_NORMALS = [
  [0, 0, 1], [0, 0, -1],
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
];

const DIRS = [
  [0, 0, 1], [0, 0, -1],
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
];

export function faceFromNormal(n) {
  const ax = Math.abs(n.x);
  const ay = Math.abs(n.y);
  const az = Math.abs(n.z);
  if (az >= ax && az >= ay) return n.z > 0 ? 0 : 1;
  if (ax >= ay) return n.x > 0 ? 2 : 3;
  return n.y > 0 ? 4 : 5;
}

export class World {
  constructor(canvas, cubeGeometry, mineParts = []) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setClearColor(0xc8cfdd);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 400);

    // 相机：球坐标绕 pivot 转，pivot 可平移
    this.yaw = 38;
    // 相机俯仰用角度；this.pitch 是格距倍率，两者不能共用一个字段
    this.cameraPitch = 34;
    this.distance = 8;
    this.pivot = new THREE.Vector3();

    this.scene.add(new THREE.AmbientLight(0xb8c2dd, 1.15));
    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(-6, 12, 8);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xc6d6ff, 0.7);
    fill.position.set(8, -4, -9);
    this.scene.add(fill);

    this.cubeGeo = cubeGeometry;
    this.mineParts = mineParts;
    this.faceGeo = new THREE.PlaneGeometry(1, 1);

    this.materials = {
      hidden: new THREE.MeshStandardMaterial({ color: COLORS.hidden, roughness: 0.62, metalness: 0 }),
      flag: new THREE.MeshStandardMaterial({ color: COLORS.flag, roughness: 0.78, metalness: 0 }),
      question: new THREE.MeshStandardMaterial({ color: COLORS.question, roughness: 0.78, metalness: 0 }),
      open: new THREE.MeshStandardMaterial({ color: COLORS.open, roughness: 0.55, metalness: 0 }),
      mine: new THREE.MeshStandardMaterial({ color: COLORS.mine, roughness: 0.45, metalness: 0 }),
      hit: new THREE.MeshStandardMaterial({ color: COLORS.hit, roughness: 0.4, emissive: 0xff2222, emissiveIntensity: 0.35 }),
      wrong: new THREE.MeshStandardMaterial({ color: COLORS.wrong, roughness: 0.6, metalness: 0 }),
    };

    // 踩中的那颗整体染红并自发光，和 Godot 版一致
    this.hitMineMaterials = mineParts.map((part) => {
      const material = part.material.clone();
      material.color.setRGB(0.86, 0.22, 0.24, THREE.LinearSRGBColorSpace);
      material.emissive = new THREE.Color(0xd8353c);
      material.emissiveIntensity = 0.75;
      return material;
    });

    this.numberMats = [];
    for (let n = 1; n <= 9; n++) {
      this.numberMats[n] = new THREE.MeshBasicMaterial({
        map: makeNumberTexture(n), transparent: true, depthWrite: false,
      });
    }
    this.flagMat = new THREE.MeshBasicMaterial({ map: makeFlagTexture(), transparent: true, depthWrite: false });
    this.questionMat = new THREE.MeshBasicMaterial({ map: makeQuestionTexture(), transparent: true, depthWrite: false });
    this.wrongMat = new THREE.MeshBasicMaterial({ map: makeWrongTexture(), transparent: true, depthWrite: false });

    this.group = new THREE.Group();
    this.axesGroup = new THREE.Group();
    this.gridGroup = new THREE.Group();
    this.scene.add(this.group, this.axesGroup, this.gridGroup);

    this.showAxes = false;
    this.showGrid = false;
    this.axisWidth = 2;
    this.gridWidth = 1;
    this.axisOpacity = 0.9;
    this.gridOpacity = 0.28;
    this.cells = [];
    this.meshes = [];
    this.pitch = 1;
    this.openView = false;
    this.dirtyFacing = true;
    this.cutawayDistance = 0;

    this._resize();
  }

  _resize() {
    const w = this.canvas.clientWidth || 1;
    const h = this.canvas.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    for (const group of [this.axesGroup, this.gridGroup]) {
      if (!group) continue;
      for (const child of group.children) child.material?.resolution?.set(w, h);
    }
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  resize() {
    this._resize();
    this.dirtyFacing = true;
  }

  /* ---------------- 辅助线 ---------------- */

  setGuides(options) {
    this.showAxes = !!options.showAxes;
    this.showGrid = !!options.showGrid;
    this.axisWidth = Math.max(1, Number(options.axisWidth) || 2);
    this.gridWidth = Math.max(1, Number(options.gridWidth) || 1);
    this.axisOpacity = Math.min(1, Math.max(0, Number(options.axisOpacity) / 100));
    this.gridOpacity = Math.min(1, Math.max(0, Number(options.gridOpacity) / 100));
    this.axesGroup.visible = this.showAxes;
    this.gridGroup.visible = this.showGrid;
    this._buildGuides();
  }

  _clearGuides(group) {
    for (const child of [...group.children]) {
      group.remove(child);
      child.geometry?.dispose();
      child.material?.dispose();
    }
  }

  _guideMaterial(color, opacity, width) {
    const mat = new LineMaterial({
      color,
      linewidth: width,
      transparent: true,
      opacity,
      depthTest: true,
      depthWrite: false,
    });
    mat.resolution.set(this.canvas.clientWidth || 1, this.canvas.clientHeight || 1);
    return mat;
  }

  _buildGuides() {
    this._clearGuides(this.axesGroup);
    this._clearGuides(this.gridGroup);
    if (!this.board) return;

    const n = this.board.side;
    const half = (n * this.pitch) / 2;
    // 只到盘面边界外一点点，避免看起来像无限延伸
    const extent = half + this.pitch * 0.25;

    for (const [dir, color] of [
      [[1, 0, 0], 0xe5484d],
      [[0, 1, 0], 0x4bb96a],
      [[0, 0, 1], 0x4f7fe8],
    ]) {
      const geo = new LineSegmentsGeometry();
      geo.setPositions([
        -dir[0] * extent, -dir[1] * extent, -dir[2] * extent,
        dir[0] * extent, dir[1] * extent, dir[2] * extent,
      ]);
      const line = new LineSegments2(geo, this._guideMaterial(color, this.axisOpacity, this.axisWidth));
      this.axesGroup.add(line);
    }

    const points = [];
    for (let a = 0; a <= n; a++) {
      const u = -half + a * this.pitch;
      for (let b = 0; b <= n; b++) {
        const v = -half + b * this.pitch;
        points.push(-half, u, v, half, u, v);
        points.push(u, -half, v, u, half, v);
        points.push(u, v, -half, u, v, half);
      }
    }
    const geo = new LineSegmentsGeometry();
    geo.setPositions(points);
    const grid = new LineSegments2(geo, this._guideMaterial(0x9aa8c0, this.gridOpacity, this.gridWidth));
    this.gridGroup.add(grid);

    this.axesGroup.visible = this.showAxes;
    this.gridGroup.visible = this.showGrid;
  }

  /* ---------------- 相机 ---------------- */

  applyCamera() {
    const y = (this.yaw * Math.PI) / 180;
    const p = (this.cameraPitch * Math.PI) / 180;
    const dir = new THREE.Vector3(Math.cos(p) * Math.sin(y), Math.sin(p), Math.cos(p) * Math.cos(y));
    this.camera.position.copy(this.pivot).addScaledVector(dir, this.distance);
    this.camera.lookAt(this.pivot);
    this.dirtyFacing = true;
  }

  frame(side) {
    this.pivot.set(0, 0, 0);
    this.distance = Math.min(Math.max(side * 2.7, 6), 44);
    this.applyCamera();
  }

  orbit(dx, dy) {
    this.yaw -= dx * 0.32;
    this.cameraPitch = Math.min(86, Math.max(-86, this.cameraPitch + dy * 0.32));
    this.applyCamera();
  }

  pan(dx, dy) {
    const scale = this.distance * 0.0016;
    const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 1);
    this.pivot.addScaledVector(right, -dx * scale).addScaledVector(up, dy * scale);
    this.applyCamera();
  }

  zoom(delta) {
    this.distance = Math.min(Math.max(this.distance + delta, 3), 90);
    this.applyCamera();
  }

  /* ---------------- 盘面 ---------------- */

  build(board, pitch) {
    this.board = board;
    this.pitch = pitch;
    this.openView = pitch >= OPEN_VIEW_PITCH;

    for (const cell of this.cells) this.group.remove(cell.root);
    this.cells = [];
    this.meshes = [];

    const n = board.side;
    const offset = ((n - 1) * pitch) / 2;

    for (let z = 0; z < n; z++) {
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          const i = board.index(x, y, z);
          const cell = this._makeCell(i);
          cell.root.position.set(x * pitch - offset, y * pitch - offset, z * pitch - offset);
          cell.basePosition.copy(cell.root.position);
          cell.coord = [x, y, z];
          this.group.add(cell.root);
          this.cells[i] = cell;
          this.meshes.push(cell.cube);
          this._applyCell(i);
        }
      }
    }
    this._buildGuides();
    this.dirtyFacing = true;
  }

  /** 每个面片一份材质：透明度、贴图都逐片控制 */
  _faceMaterial() {
    return new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false });
  }

  /** 镜头距离小于该值时开始剥离；越靠近剥得越多，远离后自动恢复 */
  setCutaway(distance) {
    this.cutawayDistance = Math.max(0, Number(distance) || 0);
    this.dirtyFacing = true;
  }

  _makeCell(i) {
    const root = new THREE.Group();

    const cube = new THREE.Mesh(this.cubeGeo, this.materials.hidden);
    cube.userData.cellIndex = i;
    cube.userData.baseVisible = true;
    cube.userData.mineBaseVisible = false;
    cube.userData.peeled = false;
    cube.userData.peelT = 0;
    cube.userData.wrongFlag = false;
    cube.userData.forceRevealed = false;
    root.add(cube);

    const faces = [];
    const marks = [];
    for (let f = 0; f < 6; f++) {
      const nrm = new THREE.Vector3(...FACE_NORMALS[f]);
      const sign = new THREE.Mesh(this.faceGeo, this._faceMaterial());
      sign.rotation.x = f === 4 ? -Math.PI / 2 : f === 5 ? Math.PI / 2 : 0;
      sign.rotation.y = f === 0 ? 0 : f === 1 ? Math.PI : f === 2 ? Math.PI / 2 : f === 3 ? -Math.PI / 2 : 0;
      sign.visible = false;
      root.add(sign);
      faces.push(sign);

      const mark = new THREE.Mesh(this.faceGeo, this._faceMaterial());
      mark.rotation.copy(sign.rotation);
      mark.visible = false;
      root.add(mark);
      marks.push(mark);
    }

    return {
      root, cube, faces, marks, sign: 0, mask: 0,
      basePosition: new THREE.Vector3(),
      planes: new Array(6).fill(null),
      markPlanes: new Array(6).fill(null),
      mine: undefined,
    };
  }

  /** 相邻格是否已揭示（决定哪些面朝外可见） */
  faceMask(i) {
    if (this.openView) return 63;
    const board = this.board;
    const [x, y, z] = board.coord(i);
    let mask = 0;
    for (let f = 0; f < 6; f++) {
      const [dx, dy, dz] = DIRS[f];
      const nx = x + dx;
      const ny = y + dy;
      const nz = z + dz;
      if (!board.inBounds(nx, ny, nz)) {
        mask |= 1 << f;
      } else if (board.states[board.index(nx, ny, nz)] === REVEALED) {
        mask |= 1 << f;
      }
    }
    return mask;
  }

  _applyCell(i) {
    const board = this.board;
    const cell = this.cells[i];
    const cube = cell.cube;
    const state = cube.userData.forceRevealed ? REVEALED : board.states[i];

    for (const f of cell.faces) f.visible = false;
    for (const m of cell.marks) m.visible = false;
    cell.mask = 0;
    cell.planes.fill(null);
    cell.markPlanes.fill(null);
    cube.userData.mineBaseVisible = false;
    if (cell.mine) cell.mine.visible = false;

    if (state === FLAGGED || state === QUESTION) {
      const size = REVEALED_SIZE;
      const wrong = state === FLAGGED && cube.userData.wrongFlag;
      cube.material = state === FLAGGED
        ? (wrong ? this.materials.wrong : this.materials.flag)
        : this.materials.question;
      cube.scale.setScalar(size);
      cube.visible = true;
      cube.userData.baseVisible = true;
      const mask = this.faceMask(i);
      const mat = wrong ? this.wrongMat : state === FLAGGED ? this.flagMat : this.questionMat;
      for (let f = 0; f < 6; f++) {
        if (!(mask & (1 << f))) continue;
        const m = cell.marks[f];
        if (m.material.map !== mat.map) {
          m.material.map = mat.map;
          m.material.needsUpdate = true;
        }
        m.material.opacity = 1;
        m.scale.setScalar(size * 0.5);
        m.position.copy(new THREE.Vector3(...FACE_NORMALS[f]).multiplyScalar(size * 0.5 + 0.004));
        m.visible = true;
        cell.markPlanes[f] = m;
      }
      cell.mask = mask;
      return;
    }

    if (state !== REVEALED) {
      cube.material = this.materials.hidden;
      cube.scale.setScalar(HIDDEN_SIZE);
      cube.visible = true;
      cube.userData.baseVisible = true;
      cell.sign = 0;
      return;
    }

    // 已揭示：任一面有数字才留下方块，全 0 的整颗消失
    const fc = board.faceCountsOf(i);
    let has = 0;
    for (const v of fc) has = Math.max(has, v);

    if (has === 0) {
      cube.visible = false;
      cube.userData.baseVisible = false;
      cell.sign = 0;
      return;
    }

    cube.visible = true;
    cube.userData.baseVisible = true;
    cube.material = this.materials.open;
    cube.scale.setScalar(REVEALED_SIZE);

    const mask = this.faceMask(i);
    for (let f = 0; f < 6; f++) {
      if (!(mask & (1 << f))) continue;
      if (fc[f] <= 0) continue;
      const sign = cell.faces[f];
      const tex = this.numberMats[Math.min(fc[f], 9)].map;
      if (sign.material.map !== tex) {
        sign.material.map = tex;
        sign.material.needsUpdate = true;
      }
      sign.material.opacity = 1;
      sign.scale.setScalar(REVEALED_SIZE * 0.56);
      sign.position.copy(new THREE.Vector3(...FACE_NORMALS[f]).multiplyScalar(REVEALED_SIZE * 0.5 + 0.004));
      sign.visible = true;
      cell.planes[f] = sign;
    }
    cell.mask = mask;
    cell.sign = 1;
  }

  /** 界面状态变化后重画单格 */
  refresh(i) {
    this._applyCell(i);
    this.dirtyFacing = true;
  }

  refreshArea(indices) {
    const seen = new Set();
    for (const i of indices) {
      for (const n of [i, ...this.board.neighbors(i)]) seen.add(n);
    }
    for (const i of seen) this._applyCell(i);
    this.dirtyFacing = true;
  }

  /** 结算时把雷摊开：用模型替换方块，踩中的那颗放大并发光 */
  markMines() {
    const board = this.board;
    for (const i of board.mineIndices()) {
      const cell = this.cells[i];
      if (!cell) continue;
      // 已经正确插旗的雷位保留旗面，不被雷模型盖掉
      if (board.states[i] === FLAGGED) continue;

      cell.cube.visible = false;
      cell.cube.userData.baseVisible = false;
      cell.cube.userData.mineBaseVisible = true;
      for (const f of cell.faces) f.visible = false;
      for (const m of cell.marks) m.visible = false;
      cell.planes.fill(null);
      cell.markPlanes.fill(null);

      const mine = this._mineFor(cell);
      if (!mine) continue;
      const hit = i === board.hitIndex;
      mine.visible = true;
      cell.cube.userData.mineBaseVisible = true;
      // 模型原始直径约 0.79，格子是 1.0；缩到 0.62 才像嵌在格子里
      mine.scale.setScalar(hit ? 0.78 : 0.62);
      mine.rotation.y = ((i * 37) % 17) * 0.37;
      for (const child of mine.children) {
        child.material = hit ? this.hitMineMaterials[child.userData.partIndex] : child.userData.baseMaterial;
      }
    }
    this.dirtyFacing = true;
  }

  /** 结算时标出插错的旗，问号则翻出底下的数字 */
  markWrongFlags() {
    const board = this.board;
    for (let i = 0; i < board.total; i++) {
      if (board.mines[i] === 1) continue;
      const state = board.states[i];
      if (state !== FLAGGED && state !== QUESTION) continue;
      const cell = this.cells[i];
      if (!cell) continue;
      if (state === FLAGGED) cell.cube.userData.wrongFlag = true;
      else cell.cube.userData.forceRevealed = true;
      this._applyCell(i);
    }
    this.dirtyFacing = true;
  }

  /** 雷模型按需创建：只有结算时才需要，别在开局就铺满整盘 */
  _mineFor(cell) {
    if (cell.mine !== undefined) return cell.mine;
    if (!this.mineParts.length) {
      cell.mine = null;
      return null;
    }
    const group = new THREE.Group();
    this.mineParts.forEach((part, index) => {
      const mesh = new THREE.Mesh(part.geometry, part.material);
      mesh.userData.baseMaterial = part.material;
      mesh.userData.partIndex = index;
      group.add(mesh);
    });
    group.visible = false;
    cell.root.add(group);
    cell.mine = group;
    return group;
  }

  /** 间距只挪位置，方块尺寸不变 */
  relayout(pitch) {
    this.pitch = pitch;
    const wasOpen = this.openView;
    this.openView = pitch >= OPEN_VIEW_PITCH;
    const board = this.board;
    if (!board) return;
    const n = board.side;
    const offset = ((n - 1) * pitch) / 2;
    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i];
      if (!cell) continue;
      const [x, y, z] = cell.coord;
      cell.root.position.set(x * pitch - offset, y * pitch - offset, z * pitch - offset);
      cell.basePosition.copy(cell.root.position);
    }
    // 可见面集合变了才需要重画数字
    if (wasOpen !== this.openView) {
      for (let i = 0; i < this.cells.length; i++) if (this.cells[i]) this._applyCell(i);
      // 重画按 states 走，会把结算时摊开的雷和错旗盖回方块，补一遍
      if (board.gameOver && !board.won) {
        this.markMines();
        this.markWrongFlags();
      }
    }
    this._buildGuides();
    this.dirtyFacing = true;
  }

  /** 每帧重算剥离层：优先整面剥离，视线接近对角时改为整角剥离 */
  updateCutaway(delta = 1 / 60) {
    // 距离按 5 阶盘标定；大棋盘取景更远，阈值同步放大，避免要拉到很远才剥离
    const threshold = (this.cutawayDistance * this.board.side) / 5;
    const layers = Math.max(0, Math.floor(threshold - this.distance));
    const toCam = this.camera.position.clone().normalize();

    // 相机正对某一面时剥整面，接近斜角时剥整角，避免切出零碎的一层
    const axisValues = [toCam.x, toCam.y, toCam.z];
    const order = axisValues.map((v, i) => ({ i, v })).sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
    const cornerCut = Math.abs(order[1].v) >= Math.abs(order[0].v) * 0.6;
    const signs = axisValues.map((v) => (v >= 0 ? 1 : -1));
    let peelDir;
    if (cornerCut) {
      peelDir = new THREE.Vector3(signs[0], signs[1], signs[2]).normalize();
    } else {
      peelDir = new THREE.Vector3(0, 0, 0);
      peelDir.setComponent(order[0].i, signs[order[0].i]);
    }

    const side = this.board.side;
    const mid = (side - 1) / 2;
    const count = Math.min(layers, side - 1);
    let radius = 0;
    for (const cell of this.cells) {
      if (cell) radius = Math.max(radius, cell.basePosition.length());
    }

    // 整块沿同一方向飞出；起飞二次缓入加速，回位保留指数缓出减速
    const escape = this.distance + radius + 5;
    const returnEase = 1 - Math.exp(-9 * delta);
    for (const cell of this.cells) {
      if (!cell) continue;
      const [x, y, z] = cell.coord;
      const edge = [
        mid - signs[0] * (x - mid),
        mid - signs[1] * (y - mid),
        mid - signs[2] * (z - mid),
      ];
      const peeled = count > 0 && (cornerCut
        ? edge[0] < count && edge[1] < count && edge[2] < count
        : edge[order[0].i] < count);
      if (cell.cube.userData.peeled !== peeled) {
        cell.cube.userData.peeled = peeled;
        this.dirtyFacing = true;
      }
      if (!peeled && cell.root.position.distanceToSquared(cell.basePosition) > 1e-4) {
        this.dirtyFacing = true;
      }
      if (peeled) {
        const t = Math.min(1, cell.cube.userData.peelT + delta / 0.25);
        cell.cube.userData.peelT = t;
        cell.root.position.copy(cell.basePosition).addScaledVector(peelDir, escape * t * t);
      } else {
        cell.cube.userData.peelT = 0;
        cell.root.position.lerp(cell.basePosition, returnEase);
      }
      cell.cube.visible = cell.cube.userData.baseVisible;
      if (cell.mine) cell.mine.visible = cell.cube.userData.mineBaseVisible;
    }
  }

  /** 掠射角上的数字淡出，否则「1」会被压成别的形状 */
  updateFacing() {
    if (!this.dirtyFacing) return;
    this.dirtyFacing = false;
    const cam = this.camera.position;
    const half = REVEALED_SIZE * 0.5;

    for (const cell of this.cells) {
      if (!cell) continue;
      for (let f = 0; f < 6; f++) {
        const mark = cell.markPlanes[f];
        if (mark) {
          mark.material.opacity = 1;
          mark.visible = true;
        }
        const target = cell.planes[f];
        if (!target) continue;
        const n = new THREE.Vector3(...FACE_NORMALS[f]);
        const center = cell.root.position.clone().addScaledVector(n, half);
        const toFace = cam.clone().sub(center).normalize();
        // 掠射角仍留一点可见度：从 dot=0.06 起淡入，0.24 起完全不透明
        const facing = Math.min(1, Math.max(0, (n.dot(toFace) - 0.06) / 0.18));
        target.material.opacity = facing;
        target.visible = facing > 0.01;
      }
    }
  }

  /** 屏幕坐标 → { index, face } */
  pick(px, py) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((px - rect.left) / rect.width) * 2 - 1,
      -((py - rect.top) / rect.height) * 2 + 1
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const hits = ray.intersectObjects(this.meshes, false);
    for (const hit of hits) {
      if (!hit.object.visible || hit.object.userData.peeled) continue;
      const idx = hit.object.userData.cellIndex;
      const n = hit.face ? hit.face.normal : new THREE.Vector3(0, 1, 0);
      return { index: idx, face: faceFromNormal(n), point: hit.point };
    }
    return null;
  }

  render(delta = 1 / 60) {
    this.updateCutaway(delta);
    this.updateFacing();
    this.renderer.render(this.scene, this.camera);
  }
}
