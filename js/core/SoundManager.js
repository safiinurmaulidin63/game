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

  _chirp({
    freqA,
    freqB,
    duration = 0.1,
    type = 'square',
    volume = 0.12,
  }) {
    this._tone({
      freq: freqA,
      freqEnd: freqB,
      duration,
      type,
      volume,
    });

    this._tone({
      freq: freqB * 1.5,
      freqEnd: freqB,
      duration: duration * 0.75,
      type: 'triangle',
      volume: volume * 0.55,
      delay: 0.02,
    });
  }

  play(key) {
    if (!this.ctx || this.muted) return;

    switch (key) {
      case 'shoot':
        this._tone({ freq: 700, freqEnd: 300, duration: 0.08, type: 'square', volume: 0.12 });
        break;

      case 'mageShot':
        this._chirp({
          freqA: 880,
          freqB: 460,
          duration: 0.075,
          type: 'triangle',
          volume: 0.08,
        });
        break;

      case 'fighterSwing':
        this._noise({ duration: 0.035, volume: 0.055 });
        this._tone({
          freq: 155,
          freqEnd: 95,
          duration: 0.055,
          type: 'triangle',
          volume: 0.07,
        });
        break;

      case 'swordSwing':
        this._tone({
          freq: 950,
          freqEnd: 300,
          duration: 0.105,
          type: 'sawtooth',
          volume: 0.07,
        });
        break;

      case 'staffSwing':
        this._tone({
          freq: 280,
          freqEnd: 180,
          duration: 0.08,
          type: 'triangle',
          volume: 0.07,
        });
        break;

      case 'staffEmpowered':
        this._tone({
          freq: 420,
          freqEnd: 720,
          duration: 0.12,
          type: 'triangle',
          volume: 0.1,
        });
        this._tone({
          freq: 840,
          freqEnd: 520,
          duration: 0.11,
          type: 'square',
          volume: 0.055,
          delay: 0.03,
        });
        break;

      case 'skillArcaneBurst':
        this._tone({
          freq: 260,
          freqEnd: 760,
          duration: 0.24,
          type: 'triangle',
          volume: 0.12,
        });
        this._tone({
          freq: 1040,
          freqEnd: 520,
          duration: 0.2,
          type: 'square',
          volume: 0.07,
          delay: 0.06,
        });
        break;

      case 'skillDashPunch':
        this._noise({ duration: 0.12, volume: 0.13 });
        this._tone({
          freq: 160,
          freqEnd: 70,
          duration: 0.18,
          type: 'sawtooth',
          volume: 0.13,
        });
        break;

      case 'skillCrescentSlash':
        this._tone({
          freq: 1250,
          freqEnd: 240,
          duration: 0.26,
          type: 'sawtooth',
          volume: 0.11,
        });
        this._tone({
          freq: 720,
          freqEnd: 390,
          duration: 0.18,
          type: 'triangle',
          volume: 0.08,
          delay: 0.04,
        });
        break;

      case 'skillShockwave':
        this._noise({ duration: 0.2, volume: 0.1 });
        this._tone({
          freq: 110,
          freqEnd: 55,
          duration: 0.3,
          type: 'sine',
          volume: 0.14,
        });
        this._tone({
          freq: 440,
          freqEnd: 220,
          duration: 0.22,
          type: 'triangle',
          volume: 0.07,
          delay: 0.03,
        });
        break;

      case 'stun':
        this._tone({
          freq: 760,
          freqEnd: 1040,
          duration: 0.08,
          type: 'square',
          volume: 0.055,
        });
        this._tone({
          freq: 1040,
          freqEnd: 720,
          duration: 0.09,
          type: 'triangle',
          volume: 0.045,
          delay: 0.06,
        });
        break;

      // =====================================================
      // HEAL / ITEM
      // =====================================================

      case 'healPickup':
        this._tone({
          freq: 620,
          freqEnd: 880,
          duration: 0.12,
          type: 'triangle',
          volume: 0.09,
        });
        break;

      case 'potionPickup':
        this._tone({
          freq: 520,
          duration: 0.08,
          type: 'square',
          volume: 0.08,
        });
        this._tone({
          freq: 780,
          duration: 0.12,
          type: 'triangle',
          volume: 0.08,
          delay: 0.06,
        });
        break;

      case 'potionUse':
        this._tone({
          freq: 340,
          freqEnd: 760,
          duration: 0.20,
          type: 'triangle',
          volume: 0.10,
        });
        this._tone({
          freq: 900,
          freqEnd: 640,
          duration: 0.16,
          type: 'sine',
          volume: 0.07,
          delay: 0.05,
        });
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

      // =====================================================
      // ASTER STEP 3 — BRUTAL ATTACK SFX
      // =====================================================

      case 'bossDashCharge':
        this._tone({
          freq: 180,
          freqEnd: 720,
          duration: 0.18,
          type: 'sawtooth',
          volume: 0.09,
        });
        break;

      case 'bossDash':
        this._noise({
          duration: 0.12,
          volume: 0.16,
        });
        this._tone({
          freq: 240,
          freqEnd: 70,
          duration: 0.16,
          type: 'sawtooth',
          volume: 0.14,
        });
        break;

      case 'bossBurstCharge':
        this._tone({
          freq: 260,
          freqEnd: 980,
          duration: 0.28,
          type: 'triangle',
          volume: 0.1,
        });
        break;

      case 'bossBurst':
        this._tone({
          freq: 980,
          freqEnd: 260,
          duration: 0.22,
          type: 'square',
          volume: 0.10,
        });
        this._noise({
          duration: 0.10,
          volume: 0.08,
          delay: 0.02,
        });
        break;

      case 'bossSlamCharge':
        this._tone({
          freq: 110,
          freqEnd: 65,
          duration: 0.34,
          type: 'sine',
          volume: 0.12,
        });
        break;

      case 'bossSlam':
        this._noise({
          duration: 0.28,
          volume: 0.22,
        });
        this._tone({
          freq: 95,
          freqEnd: 42,
          duration: 0.38,
          type: 'sawtooth',
          volume: 0.18,
        });
        break;

      case 'bossTeleportCharge':
        this._tone({
          freq: 420,
          freqEnd: 1120,
          duration: 0.24,
          type: 'triangle',
          volume: 0.09,
        });
        break;

      case 'bossTeleport':
        this._tone({
          freq: 1080,
          freqEnd: 180,
          duration: 0.12,
          type: 'square',
          volume: 0.10,
        });
        break;

      case 'bossTeleportStrike':
        this._noise({
          duration: 0.16,
          volume: 0.16,
        });
        this._tone({
          freq: 600,
          freqEnd: 90,
          duration: 0.20,
          type: 'sawtooth',
          volume: 0.12,
        });
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
