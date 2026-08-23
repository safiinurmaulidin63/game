// SoundManager.js
// Tugas: menghasilkan semua sound effect game secara PROSEDURAL lewat
// Web Audio API (oscillator + noise) — TIDAK butuh file audio apapun,
// beda dengan sprite yang perlu di-download dari Kenney. Semua bunyi di
// sini dibikin langsung dari kode (bunyi "synth" ala game 8-bit lama).
//
// PENTING: browser MEMBLOKIR audio sebelum ada interaksi user (klik/
// keydown pertama). Makanya AudioContext baru dibuat & di-resume lewat
// unlock(), dipanggil sekali di listener klik/keydown pertama di main.js.

class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  unlock() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMuted() {
    this.muted = !this.muted;
    return this.muted;
  }

  // Satu nada sederhana: frekuensi (boleh "meluncur" dari freq -> freqEnd),
  // dengan envelope volume yang meluruh (exponential decay) supaya tidak
  // klik/pop kasar di ujung bunyi.
  _tone({ freq, duration = 0.1, type = 'square', volume = 0.2, freqEnd = null, delay = 0 }) {
    if (!this.ctx || this.muted) return;

    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t0 + duration);
    }

    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  // Noise burst singkat: buat efek "hit"/"hurt" yang lebih kasar/organik
  // dibanding nada oscillator murni.
  _noise({ duration = 0.15, volume = 0.2, delay = 0 }) {
    if (!this.ctx || this.muted) return;

    const t0 = this.ctx.currentTime + delay;
    const bufferSize = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

    noise.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t0);
  }

  play(key) {
    if (!this.ctx || this.muted) return;

    switch (key) {
      case 'shoot':
        this._tone({ freq: 700, freqEnd: 300, duration: 0.08, type: 'square', volume: 0.12 });
        break;

      case 'enemyShoot':
        this._tone({ freq: 500, freqEnd: 250, duration: 0.1, type: 'triangle', volume: 0.1 });
        break;

      case 'enemyHit':
        this._noise({ duration: 0.06, volume: 0.15 });
        break;

      case 'enemyDeath':
        this._tone({ freq: 300, freqEnd: 60, duration: 0.25, type: 'sawtooth', volume: 0.18 });
        break;

      case 'playerHurt':
        this._noise({ duration: 0.18, volume: 0.25 });
        this._tone({ freq: 180, freqEnd: 80, duration: 0.18, type: 'sawtooth', volume: 0.15 });
        break;

      case 'levelUp':
        this._tone({ freq: 440, duration: 0.12, type: 'square', volume: 0.15 });
        this._tone({ freq: 660, duration: 0.15, type: 'square', volume: 0.15, delay: 0.12 });
        this._tone({ freq: 880, duration: 0.2, type: 'square', volume: 0.15, delay: 0.24 });
        break;

      case 'gameOver':
        this._tone({ freq: 300, freqEnd: 80, duration: 0.6, type: 'sawtooth', volume: 0.2 });
        break;

      case 'victory':
        this._tone({ freq: 523, duration: 0.15, type: 'square', volume: 0.18 });
        this._tone({ freq: 659, duration: 0.15, type: 'square', volume: 0.18, delay: 0.15 });
        this._tone({ freq: 784, duration: 0.15, type: 'square', volume: 0.18, delay: 0.3 });
        this._tone({ freq: 1046, duration: 0.35, type: 'square', volume: 0.2, delay: 0.45 });
        break;

      case 'bossRoar':
        this._tone({ freq: 90, freqEnd: 50, duration: 0.8, type: 'sawtooth', volume: 0.25 });
        break;

      case 'bossVulnerable':
        this._tone({ freq: 500, duration: 0.1, type: 'square', volume: 0.18 });
        this._tone({ freq: 750, duration: 0.15, type: 'square', volume: 0.18, delay: 0.1 });
        break;

      default:
        break;
    }
  }
}

// Satu instance dipakai bersama semua file, sama seperti AssetLoader
export const soundManager = new SoundManager();
