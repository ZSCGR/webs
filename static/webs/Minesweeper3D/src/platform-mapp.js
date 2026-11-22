// mapp 构建的宿主：能力全部来自 @discourse-mini-app/sdk。
// 只申请真正用到的权限：theme.read、storage.read/write、audio.webAudio。
// 任何能力缺失都只是降级，游戏本身照常可玩。

import { getSDK } from '@discourse-mini-app/sdk';
import { bindSdk } from './assets-sdk.js';

let sdk = null;

export async function connectHost() {
  sdk = getSDK();
  await sdk.ready;
  bindSdk(sdk);

  const has = (p) => sdk.permissions.has(p);
  const canRead = has('storage.read');
  const canWrite = has('storage.write');

  const host = {
    connected: true,
    locale: 'zh_CN',
    get sdk() {
      return sdk;
    },

    async load(key) {
      if (!canRead) return null;
      try {
        return await sdk.localStorage.getItem(key);
      } catch {
        return null;
      }
    },

    async save(key, value) {
      if (!canWrite) return;
      try {
        await sdk.localStorage.setItem(key, value);
      } catch {
        /* 存储失败不该影响本局 */
      }
    },

    async applyTheme() {
      if (!has('theme.read')) return null;
      try {
        const theme = await sdk.theme.get();
        host.locale = theme.locale || host.locale;
        return theme;
      } catch {
        return null;
      }
    },

    onThemeChange(callback) {
      if (!has('theme.read')) return;
      try {
        sdk.theme.onChange(async () => {
          const theme = await host.applyTheme();
          if (theme) callback(theme);
        });
      } catch {
        /* 主题订阅失败不影响游戏 */
      }
    },

    async ready() {
      try {
        await sdk.lifecycle.ready();
      } catch {
        /* 首屏标记失败不阻塞 */
      }
    },
  };

  return host;
}
