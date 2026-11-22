import * as THREE from 'three';

// 数字与标记的贴图。方块本身的几何来自 cube-model.js（内联的 GLB）。

// 削角立方体：八个顶点各被一块球面切掉，十二条棱保持直边。
// 用「沿方向求最大半径」的方式生成——形状是凸的，所以球面参数化不会自交。
// cut 是沿棱从顶点切掉的长度（边长按 1 计），与 Godot 版 Blender 脚本里的 0.30 一致。

// 数字配色：深色方块上要够亮
const NUMBER_COLORS = [
  'transparent',
  '#7FB0FF', // 1
  '#7FE3A1', // 2
  '#FF8E8E', // 3
  '#C9A6FF', // 4
  '#FFC178', // 5
  '#7FE0E0', // 6
  '#E8EDF7', // 7
  '#B9C2D4', // 8
  '#9AA3B5', // 9
];

function canvasTexture(size, draw) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** 数字贴图：透明底上的粗体数字，1..9 */
export function makeNumberTexture(n) {
  return canvasTexture(256, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    ctx.fillStyle = NUMBER_COLORS[n] || '#E8EDF7';
    ctx.font = `700 ${Math.round(s * 0.72)}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(n), s / 2, s * 0.54);
  });
}

/** 旗：粗杆 + 小三角旗面，缩到 0.34 单位还能认出来 */
export function makeFlagTexture() {
  return canvasTexture(256, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    const ink = '#2A2118';
    ctx.fillStyle = ink;
    ctx.fillRect(s * 0.27, s * 0.1, s * 0.1 * 1.4, s * 0.8);
    ctx.beginPath();
    ctx.moveTo(s * 0.41, s * 0.13);
    ctx.lineTo(s * 0.82, s * 0.3);
    ctx.lineTo(s * 0.41, s * 0.47);
    ctx.closePath();
    ctx.fill();
  });
}

/** 结算时标出插错的旗：红色叉 */
export function makeWrongTexture() {
  return canvasTexture(256, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    ctx.strokeStyle = '#E5484D';
    ctx.lineWidth = s * 0.13;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s * 0.24, s * 0.24);
    ctx.lineTo(s * 0.76, s * 0.76);
    ctx.moveTo(s * 0.76, s * 0.24);
    ctx.lineTo(s * 0.24, s * 0.76);
    ctx.stroke();
  });
}

/** 问号 */
export function makeQuestionTexture() {
  return canvasTexture(256, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    ctx.fillStyle = '#2E3541';
    ctx.font = `700 ${Math.round(s * 0.66)}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', s / 2, s * 0.54);
  });
}
