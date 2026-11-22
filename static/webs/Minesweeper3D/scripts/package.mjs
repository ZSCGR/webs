// 把 dist/app 的构建产物和包内资源组装成平台要求的 app.zip。
// 用法：MINI_APP_ID=<应用ID> MINI_APP_VERSION=1.1.0 npm run build:app

import { readFile } from 'node:fs/promises';
import { pack } from '@discourse-mini-app/sdk/pack';

const SOURCE_ROOT = new URL('../../prototypes/minecube/assets/', import.meta.url);

const manifest = JSON.parse(await readFile(new URL('../manifest.json', import.meta.url), 'utf8'));
manifest.id = process.env.MINI_APP_ID || manifest.id;
manifest.version = process.env.MINI_APP_VERSION || manifest.version;

const PLACEHOLDER_ID = '01a1966e-935a-79e0-8c76-9b0f7552c578';
if (manifest.id === PLACEHOLDER_ID) {
  console.warn('提示：manifest 里还是官方示例的 ID，上传会被拒（APP_ID_MISMATCH）。');
}

const files = {};
files['index.html'] = await readFile(new URL('../src/template.html', import.meta.url));
files['strings.json'] = await readFile(new URL('../src/strings.json', import.meta.url));
files['app.js'] = await readFile(new URL('../build/app/app.js', import.meta.url));
files['app.css'] = await readFile(new URL('../build/app/app.css', import.meta.url));

// 包内路径与 Godot 工程里的源文件不一定同名，这里显式映射
const SOURCE_OF = {
  'assets/models/cube.glb': 'cube_rounded.glb',
  'assets/models/mine.glb': 'mine.glb',
};

for (const path of manifest.assets || []) {
  const relative = SOURCE_OF[path] ?? path.replace(/^assets\//, '');
  files[path] = await readFile(new URL(relative, SOURCE_ROOT));
}

const result = await pack({
  manifest,
  files,
  outputDirectory: new URL('../build/package/', import.meta.url).pathname,
});

console.log(`app.zip  ${result.size} 字节  sha256=${result.zipSha256}`);
console.log(`应用 ${manifest.id} · 版本 ${manifest.version}`);
