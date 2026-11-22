// 单文件构建的资源来源：全部以 data URI 内联，双击 HTML 就能跑。
// mapp 构建会通过 vite alias 换成 assets-sdk.js，那边走 sdk.assets.readBytes。

import glbUrl from '../../prototypes/minecube/assets/cube_rounded.glb?url';
import mineUrl from '../../prototypes/minecube/assets/mine.glb?url';
import revealUrl from '../../prototypes/minecube/assets/sfx/reveal.mp3?url';
import floodUrl from '../../prototypes/minecube/assets/sfx/flood.mp3?url';
import flagUrl from '../../prototypes/minecube/assets/sfx/flag.mp3?url';
import uiUrl from '../../prototypes/minecube/assets/sfx/ui_click.mp3?url';
import boomUrl from '../../prototypes/minecube/assets/sfx/boom.mp3?url';
import winUrl from '../../prototypes/minecube/assets/sfx/win.mp3?url';

const INLINE = {
  'models/cube.glb': glbUrl,
  'models/mine.glb': mineUrl,
  'sfx/reveal.mp3': revealUrl,
  'sfx/flood.mp3': floodUrl,
  'sfx/flag.mp3': flagUrl,
  'sfx/ui_click.mp3': uiUrl,
  'sfx/boom.mp3': boomUrl,
  'sfx/win.mp3': winUrl,
};

export const ASSET_PATHS = Object.keys(INLINE);

function dataUriToBytes(uri) {
  const binary = atob(uri.slice(uri.indexOf(',') + 1));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export async function loadAsset(path) {
  const uri = INLINE[path];
  if (!uri) throw new Error(`未知资源：${path}`);
  return dataUriToBytes(uri);
}

export function initSdk() {}
