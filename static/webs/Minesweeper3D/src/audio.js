// 音效：六段 CC0 素材。单文件构建内联，mapp 构建从包内读。
// 浏览器要求用户手势后才能播放，所以解码和 AudioContext 的启动都推迟到第一次交互。

import { loadAsset } from '@assets';

const SOURCES = {
  reveal: 'sfx/reveal.mp3',
  flood: 'sfx/flood.mp3',
  flag: 'sfx/flag.mp3',
  ui: 'sfx/ui_click.mp3',
  boom: 'sfx/boom.mp3',
  win: 'sfx/win.mp3',
};

export class Sfx {
  constructor(volume = 70, muted = false) {
    this.volume = volume;
    this.muted = muted;
    this.ctx = null;
    this.gain = null;
    this.buffers = {};
    this.ready = false;
    this._decoding = null;
  }

  setVolume(v) {
    this.volume = v;
    this._applyGain();
  }

  setMuted(m) {
    this.muted = m;
    this._applyGain();
  }

  _applyGain() {
    if (!this.gain) return;
    const v = this.muted ? 0 : Math.max(0, Math.min(1, this.volume / 100));
    this.gain.gain.value = v * v; // 感知上更接近线性
  }

  /** 第一次用户手势时调用 */
  async unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.gain = this.ctx.createGain();
      this.gain.connect(this.ctx.destination);
      this._applyGain();
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    if (this.ready || this._decoding) return this._decoding;

    this._decoding = (async () => {
      const entries = Object.entries(SOURCES);
      await Promise.all(
        entries.map(async ([name, path]) => {
          try {
            const bytes = await loadAsset(path);
            // decodeAudioData 会接管 ArrayBuffer，传副本避免共用同一块内存
            this.buffers[name] = await this.ctx.decodeAudioData(bytes.buffer.slice(0));
          } catch {
            // 单个音效解码失败不该拖垮整局
          }
        })
      );
      this.ready = true;
    })();
    return this._decoding;
  }

  play(name) {
    if (!this.ctx || !this.buffers[name]) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffers[name];
    src.connect(this.gain);
    src.start();
  }
}
