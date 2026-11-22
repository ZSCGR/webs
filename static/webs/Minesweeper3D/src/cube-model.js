// 模型来自 Godot 版同一批 Blender 产物（assets/build_cube.py / build_mine.py）。
// 按 GLB 结构取出顶点即可，不引 GLTFLoader。
// 好处是两个版本的模型完全一致：方块六个面平直、棱直、角圆；雷也是同一颗。

import * as THREE from 'three';
import { loadAsset } from '@assets';

const CHUNK_JSON = 0x4e4f534a;
const CHUNK_BIN = 0x004e4942;

const COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
const ARRAY_TYPES = { 5121: Uint8Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };

function readAccessor(json, bin, index) {
  const accessor = json.accessors[index];
  const view = json.bufferViews[accessor.bufferView];
  const Type = ARRAY_TYPES[accessor.componentType];
  const size = COMPONENTS[accessor.type];
  const offset = (view.byteOffset || 0) + (accessor.byteOffset || 0);
  return new Type(bin.buffer, bin.byteOffset + offset, accessor.count * size);
}

function parseGlb(bytes) {
  const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const totalLength = header.getUint32(8, true);

  let json = null;
  let bin = null;
  let offset = 12;
  while (offset < totalLength) {
    const length = header.getUint32(offset, true);
    const type = header.getUint32(offset + 4, true);
    const chunk = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === CHUNK_JSON) json = JSON.parse(new TextDecoder().decode(chunk));
    else if (type === CHUNK_BIN) bin = chunk;
    offset += 8 + length;
  }
  if (!json || !bin) throw new Error('GLB 解析失败：缺少 JSON 或 BIN 块');
  return { json, bin };
}

function materialOf(json, primitive) {
  const definition = json.materials?.[primitive.material];
  const pbr = definition?.pbrMetallicRoughness ?? {};
  const base = pbr.baseColorFactor ?? [1, 1, 1, 1];
  return new THREE.MeshStandardMaterial({
    // glTF 的颜色是线性空间，Three 的 Color 默认按 sRGB 解释，这里显式转换
    color: new THREE.Color().setRGB(base[0], base[1], base[2], THREE.LinearSRGBColorSpace),
    metalness: pbr.metallicFactor ?? 0.2,
    roughness: pbr.roughnessFactor ?? 0.8,
    side: definition?.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
  });
}

function geometryOf(json, bin, primitive) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(readAccessor(json, bin, primitive.attributes.POSITION), 3));
  if (primitive.attributes.NORMAL !== undefined) {
    geo.setAttribute('normal', new THREE.BufferAttribute(readAccessor(json, bin, primitive.attributes.NORMAL), 3));
  }
  if (primitive.indices !== undefined) {
    geo.setIndex(new THREE.BufferAttribute(readAccessor(json, bin, primitive.indices), 1));
  }
  geo.computeBoundingSphere();
  return geo;
}

/** 读一个 GLB，按 primitive 拆成 { geometry, material } 列表 */
export async function loadModel(path) {
  const { json, bin } = parseGlb(await loadAsset(path));
  const parts = [];
  for (const mesh of json.meshes) {
    for (const primitive of mesh.primitives) {
      parts.push({ geometry: geometryOf(json, bin, primitive), material: materialOf(json, primitive) });
    }
  }
  return parts;
}

/** 方块只有单个 primitive，取第一份几何 */
export async function loadCubeGeometry() {
  const [part] = await loadModel('models/cube.glb');
  return part.geometry;
}
