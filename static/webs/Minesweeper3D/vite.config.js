import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import pkg from './package.json' with { type: 'json' };

const resolvePath = (path) => fileURLToPath(new URL(path, import.meta.url));

// 单文件构建：所有资源内联，产物是一个可以双击打开的 HTML。
// mapp 构建见 vite.config.app.js。
export default defineConfig({
  plugins: [
    {
      name: 'inline-template',
      transformIndexHtml(html) {
        return html.replace('<!--app-->', readFileSync(resolvePath('./src/template.html'), 'utf8'));
      },
    },
    viteSingleFile(),
  ],
  resolve: {
    alias: {
      '@assets': resolvePath('./src/assets-inline.js'),
      '@platform': resolvePath('./src/platform-web.js'),
    },
  },
  assetsInclude: ['**/*.glb'],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: {
    target: 'es2020',
    cssCodeSplit: false,
    assetsInlineLimit: 64 * 1024 * 1024,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
