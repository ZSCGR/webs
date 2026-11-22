import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import pkg from './package.json' with { type: 'json' };

const resolvePath = (path) => fileURLToPath(new URL(path, import.meta.url));

// mapp（Discourse 微应用）构建：输出平台要求的 app.js / app.css，
// 由 scripts/package.mjs 组装成 dist/package/app.zip。
// 资源不内联，改由 SDK 从包内读取，见 src/assets-sdk.js。
export default defineConfig({
  resolve: {
    alias: {
      '@assets': resolvePath('./src/assets-sdk.js'),
      '@platform': resolvePath('./src/platform-mapp.js'),
    },
  },
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: {
    // 不和单文件构建（dist/）互相清空
    outDir: 'build/app',
    emptyOutDir: true,
    target: 'es2022',
    cssCodeSplit: false,
    modulePreload: false,
    lib: {
      entry: resolvePath('./src/main.js'),
      name: 'Minesweeper3D',
      formats: ['iife'],
      fileName: () => 'app.js',
      cssFileName: 'app',
    },
  },
});
