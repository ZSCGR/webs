// 单文件构建的宿主：没有社区，全部能力来自浏览器原生 API。
// mapp 构建通过 vite alias 换成 platform-mapp.js。

export async function connectHost() {
  return {
    connected: false,
    locale: navigator.language?.startsWith('zh') ? 'zh_CN' : 'en',
    async load(key) {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    async save(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch {
        /* 隐私模式写不进去，不影响本局 */
      }
    },
    async applyTheme() {},
    onThemeChange() {},
    async ready() {},
  };
}
