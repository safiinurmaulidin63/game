// Game.js
// Tugas: memegang game loop utama (update -> draw, diulang terus),
// dan mengoordinasikan Input, Player, Camera, Weapon, EnemyManager,
// TileMap, serta progres lantai (1-7) dan skor.

import { Input } from './Input.js';
import { Camera } from './Camera.js';
import { Player } from '../player/Player.js';
import { Weapon } from '../weapon/Weapon.js';
import { EnemyManager } from '../enemy/EnemyManager.js';
import { TileMap } from '../world/TileMap.js';
import { soundManager } from './SoundManager.js';

const MAX_FLOOR = 7; // lantai ke-7 = lantai boss

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false; // pixel-art tetap tajam saat sprite di-scale

    this._resizeCanvas();
    window.addEventListener('resize', () => this._resizeCanvas());

    this.input = new Input(canvas);
    this.player = new Player(0, 0);
    this.camera = new Camera(canvas);
    this.weapon = new Weapon();
    this.enemyManager = new EnemyManager();

    this.score = 0;
    this.floor = 1;
    this.gameOver = false;
    this.victory = false;
    this.paused = false;

    // --- Compass: arah panah menuju tangga, dihitung lewat BFS TileMap ---
    this._compassPath = null;
    this._compassTimer = 0;
    this.compassAngle = null; // null = tidak perlu ditampilkan (misal lantai boss)

    this._setupFloor(this.floor);

    this.lastTime = performance.now();
    this._loop = this._loop.bind(this);
  }

  start() {
    requestAnimationFrame(this._loop);
  }

  _resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  // Disiapkan tiap kali masuk lantai baru: bikin map baru, bersihkan
  // & isi ulang musuh sesuai lantai, taruh player balik ke tengah.
  _setupFloor(floorNumber) {
    const isBossFloor = floorNumber === MAX_FLOOR;

    // Lantai boss: ruangan terbuka. Lantai lain: labirin acak (lihat TileMap.js)
    this.tileMap = new TileMap(!isBossFloor, floorNumber);

    const start = this.tileMap.startWorldPos;
    this.player.x = start.x;
    this.player.y = start.y;

    this.enemyManager.clear();
    if (isBossFloor) {
      this.enemyManager.spawnBossFloor();
    } else {
      this.enemyManager.spawnForFloor(floorNumber, this.tileMap, this.player);
    }

    // Sedikit heal tiap ganti lantai, reward kecil karena berhasil bertahan
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 3);

    // Reset compass: labirin baru = jalur lama sudah tidak valid
    this._compassPath = null;
    this._compassTimer = 0;
    this.compassAngle = null;
  }

  _nextFloor() {
    this.floor += 1;
    this._setupFloor(this.floor);
    soundManager.play('levelUp');
  }

  // Reset total: skor, lantai, status player, tapi TANPA reload halaman
  // (jadi asset & AudioContext yang sudah di-unlock tidak perlu dimuat ulang)
  _restart() {
    this.score = 0;
    this.floor = 1;
    this.gameOver = false;
    this.victory = false;
    this.paused = false;

    this.player.hp = this.player.maxHp;
    this.player.invulnerableTimer = 0;
    this.weapon.projectiles = [];

    this._setupFloor(this.floor);
  }

  _loop(currentTime) {
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.05);
    this.lastTime = currentTime;

    this._update(dt);
    this._draw();

    // Input sekali-tekan (R, M) sudah dipakai di _update() frame ini,
    // jadi aman di-reset supaya tidak nyangkut "true" ke frame berikutnya
    this.input.clearFrame();

    requestAnimationFrame(this._loop);
  }

  _update(dt) {
    // Mute bisa ditoggle kapan saja, termasuk pas lagi main
    if (this.input.wasJustPressed('KeyM')) {
      soundManager.toggleMuted();
    }

    if (this.gameOver || this.victory) {
      // Restart cuma berlaku di layar game over / menang
      if (this.input.wasJustPressed('KeyR')) {
        this._restart();
      }
      return;
    }

    // Toggle pause (P atau ESC) — tidak berlaku di layar game over/menang,
    // makanya pengecekan ini setelah return di atas
    if (this.input.wasJustPressed('KeyP') || this.input.wasJustPressed('Escape')) {
      this.paused = !this.paused;
    }

    if (this.paused) return; // bekukan semua logic, tapi _draw() tetap jalan (freeze-frame + overlay)

    if (this.player.hp <= 0) {
      this.gameOver = true;
      soundManager.play('gameOver');
      return;
    }

    this.player.update(dt, this.input, this.camera, this.tileMap);
    this.camera.follow(this.player);
    this.weapon.update(dt, this.input, this.player, this.camera, this.tileMap);
    this.enemyManager.update(dt, this.player, this.tileMap);

    const gained = this.enemyManager.handleProjectileHits(this.weapon.projectiles);
    this.score += gained;

    this.enemyManager.handleEnemyProjectileHits(this.player);

    this._updateCompass(dt);
    this._checkFloorTransition();
  }

  // Hitung arah panah menuju tangga lewat BFS (findWorldPath), sama
  // seperti cara Enemy.js mengejar player — supaya panahnya nunjuk arah
  // yang BENAR-BENAR bisa dilewati di labirin, bukan garis lurus tembus
  // dinding. BFS di-throttle (bukan tiap frame) karena murni alasan
  // kerapian gaya kode, konsisten dengan Enemy.js — labirinnya cuma
  // ~567 sel jadi sebenarnya aman dipanggil tiap frame sekalipun.
  _updateCompass(dt) {
    const stairsPos = this.tileMap.getStairsWorldPos();

    if (!stairsPos) {
      // Lantai boss (atau lantai tanpa tangga): tidak perlu compass
      this.compassAngle = null;
      return;
    }

    this._compassTimer -= dt;
    if (this._compassTimer <= 0) {
      this._compassPath = this.tileMap.findWorldPath(
        this.player.x,
        this.player.y,
        stairsPos.x,
        stairsPos.y
      );
      this._compassTimer = 0.4 + Math.random() * 0.2;
    }

    // Buang waypoint yang sudah kelewat/kedekatan, sama seperti Enemy.js
    if (this._compassPath && this._compassPath.length > 0) {
      while (this._compassPath.length > 1) {
        const wp = this._compassPath[0];
        if (Math.hypot(wp.x - this.player.x, wp.y - this.player.y) < 28) {
          this._compassPath.shift();
        } else {
          break;
        }
      }

      const wp = this._compassPath[0];
      const dx = wp.x - this.player.x;
      const dy = wp.y - this.player.y;
      this.compassAngle = Math.atan2(dy, dx);
    } else {
      // Path kosong = sudah sampai tangga (atau, secara teori, tidak
      // terjangkau — tapi BFS di _placeObstacles menjamin ini tidak terjadi)
      this.compassAngle = null;
    }
  }

  _checkFloorTransition() {
    const allEnemiesDead = this.enemyManager.enemies.length === 0;

    if (this.floor === MAX_FLOOR) {
      // Lantai boss: menang begitu boss mati
      if (allEnemiesDead) {
        this.victory = true;
        soundManager.play('victory');
      }
      return;
    }

    // Lantai biasa: harus bersih dari musuh DAN berdiri di atas tangga
    const onStairs = this.tileMap.isStairsAtWorld(this.player.x, this.player.y);
    if (allEnemiesDead && onStairs) {
      this._nextFloor();
    }
  }

  _draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.tileMap.draw(ctx, this.camera);
    this.enemyManager.draw(ctx, this.camera);
    this.player.draw(ctx, this.camera);
    this.weapon.draw(ctx, this.camera);

    this._drawHUD(ctx);
    this._drawCompass(ctx);

    if (this.gameOver) this._drawOverlay(ctx, 'GAME OVER', '#ef4444');
    if (this.victory) this._drawOverlay(ctx, 'YOU WIN!', '#4ade80');
    if (this.paused) this._drawPauseOverlay(ctx);
  }

  _drawHUD(ctx) {
    const barWidth = 220;
    const barHeight = 22;
    const x = 20;
    const y = 20;
    const hpRatio = this.player.hp / this.player.maxHp;

    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.fillStyle = hpRatio > 0.5 ? '#4ade80' : hpRatio > 0.25 ? '#facc15' : '#ef4444';
    ctx.fillRect(x, y, barWidth * hpRatio, barHeight);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);

    ctx.fillStyle = '#fff';
    ctx.font = '14px sans-serif';
    ctx.fillText(`HP: ${Math.ceil(this.player.hp)} / ${this.player.maxHp}`, x, y - 6);

    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`Skor: ${this.score}`, x, y + barHeight + 20);

    const floorLabel =
      this.floor === MAX_FLOOR
        ? `Lantai ${this.floor} (BOSS)`
        : `Lantai ${this.floor} / ${MAX_FLOOR}`;
    ctx.fillText(floorLabel, x, y + barHeight + 44);

    if (this.floor < MAX_FLOOR && this.enemyManager.enemies.length === 0) {
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('Semua musuh tumbang! Cari tangga (▲) untuk lanjut.', x, y + barHeight + 68);
    }

    // Indikator mute + pause, pojok kiri bawah — kecil & tidak mengganggu
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '12px sans-serif';
    ctx.fillText(
      `${soundManager.muted ? 'Suara: OFF' : 'Suara: ON'} (M)   Pause (P/ESC)`,
      x,
      this.canvas.height - 16
    );
  }

  // Widget bulat di pojok kanan atas: panah kuning menunjuk arah tangga
  // (mengikuti jalur BFS, bukan garis lurus). Warna & label berubah
  // tergantung apakah musuh sudah bersih (tangga "aktif") atau belum.
  _drawCompass(ctx) {
    if (this.compassAngle === null) return;

    const cx = this.canvas.width - 70;
    const cy = 70;
    const radius = 40;
    const allClear = this.enemyManager.enemies.length === 0;
    const arrowColor = allClear ? '#facc15' : '#9ca3af'; // kuning kalau siap, abu kalau masih ada musuh

    ctx.save();

    // Lingkaran dasar
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Panah, diputar sesuai arah tangga
    ctx.translate(cx, cy);
    ctx.rotate(this.compassAngle);
    ctx.fillStyle = arrowColor;
    ctx.beginPath();
    ctx.moveTo(radius - 10, 0);
    ctx.lineTo(-12, 12);
    ctx.lineTo(-12, -12);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Label di bawah widget
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(allClear ? 'TANGGA ▲' : 'Tangga (bersihkan musuh)', cx, cy + radius + 16);
    ctx.textAlign = 'left';
  }

  // Overlay pause: lebih transparan dari game over/victory (sengaja beda),
  // supaya kelihatan jelas ini cuma "jeda", bukan akhir permainan — dunia
  // di belakangnya masih kelihatan (freeze-frame), tidak digelapkan total.
  _drawPauseOverlay(ctx) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);

    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#facc15';
    ctx.fillText(
      'Tekan P atau ESC untuk lanjut',
      this.canvas.width / 2,
      this.canvas.height / 2 + 36
    );

    ctx.textAlign = 'left';
  }

  _drawOverlay(ctx, text, color) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = color;
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, this.canvas.width / 2, this.canvas.height / 2);

    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(`Skor akhir: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 40);

    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#facc15';
    ctx.fillText('Tekan R untuk main lagi', this.canvas.width / 2, this.canvas.height / 2 + 80);

    ctx.textAlign = 'left';
  }
}