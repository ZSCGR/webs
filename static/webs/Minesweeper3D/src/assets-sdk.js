// mapp（Discourse 微应用）构建的资源来源：走 SDK 读包内文件。
// 这些路径必须与 manifest.json 的 assets 一致，否则沙箱会拒读。

let sdk = null;

/** main.js 在 SDK 就绪后注入 */
export function bindSdk(instance) {
  sdk = instance;
}

export const ASSET_PATHS = [
  'sfx/reveal.mp3',
  'sfx/flood.mp3',
  'sfx/flag.mp3',
  'sfx/ui_click.mp3',
  'sfx/boom.mp3',
  'sfx/win.mp3',
  'models/cube.glb',
  'models/mine.glb',
];

export async function loadAsset(path) {
  if (!sdk) throw new Error('SDK 尚未就绪');
  return sdk.assets.readBytes(`assets/${path}`);
}
