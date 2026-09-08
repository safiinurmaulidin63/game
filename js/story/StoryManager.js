// StoryManager.js
// Dialog sederhana yang membekukan dunia saat aktif.
// PC: Enter / Space / E
// HP: tap pada canvas/dialog untuk lanjut.

import { assetLoader } from '../core/AssetLoader.js';

export class StoryManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.pages = [];
    this.pageIndex = 0;
    this.active = false;
    this.seen = new Set();

    this._bindControls();
  }

  _bindControls() {
    window.addEventListener('keydown', (event) => {
      if (!this.active) return;

      if (
        event.code === 'Enter' ||
        event.code === 'Space' ||
        event.code === 'KeyE'
      ) {
        event.preventDefault();
        this.next();
      }
    });

    this.canvas.addEventListener('pointerdown', (event) => {
      if (!this.active) return;
      event.preventDefault();
      this.next();
    });
  }

  show(id, pages) {
    if (!pages || pages.length === 0) return false;
    if (id && this.seen.has(id)) return false;

    if (id) this.seen.add(id);

    this.pages = pages;
    this.pageIndex = 0;
    this.active = true;
    return true;
  }

  next() {
    if (!this.active) return;

    this.pageIndex += 1;

    if (this.pageIndex >= this.pages.length) {
      this.active = false;
      this.pages = [];
      this.pageIndex = 0;
    }
  }

  isActive() {
    return this.active;
  }

  resetAll() {
    this.pages = [];
    this.pageIndex = 0;
    this.active = false;
    this.seen.clear();
  }

  draw(ctx) {
    if (!this.active) return;

    const page = this.pages[this.pageIndex];
    if (!page) return;

    const maxWidth = Math.min(this.canvas.width - 32, 900);
    const boxHeight = Math.min(170, Math.max(132, this.canvas.height * 0.22));
    const x = (this.canvas.width - maxWidth) / 2;
    const y = this.canvas.height - boxHeight - 26;

    ctx.save();

    // Gelapkan sedikit area permainan, tapi tetap kelihatan.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const box = assetLoader.get('dialogueBox');

    if (box) {
      ctx.drawImage(box, x, y, maxWidth, boxHeight);
    } else {
      ctx.fillStyle = 'rgba(5, 8, 16, 0.94)';
      ctx.fillRect(x, y, maxWidth, boxHeight);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, maxWidth, boxHeight);
    }

    // Lapisan tipis supaya teks tetap terbaca meski asset dialog punya area transparan.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(x + 10, y + 10, maxWidth - 20, boxHeight - 20);

    const padding = 28;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(page.speaker || '...', x + padding, y + 22);

    ctx.fillStyle = '#fff';
    ctx.font = '17px monospace';

    this._drawWrappedText(
      ctx,
      page.text || '',
      x + padding,
      y + 52,
      maxWidth - padding * 2,
      24
    );

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(
      this._isTouchDevice()
        ? 'TAP UNTUK LANJUT'
        : 'ENTER / SPACE / E',
      x + maxWidth - padding,
      y + boxHeight - 28
    );

    ctx.restore();
  }

  _drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = String(text).split(/\s+/);
    let line = '';
    let lineY = y;

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;

      if (ctx.measureText(testLine).width > maxWidth && line) {
        ctx.fillText(line, x, lineY);
        line = word;
        lineY += lineHeight;
      } else {
        line = testLine;
      }
    }

    if (line) {
      ctx.fillText(line, x, lineY);
    }
  }

  _isTouchDevice() {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches
    );
  }
}
