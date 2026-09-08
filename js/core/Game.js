// Game.js
// Tugas: memegang game loop utama (update -> draw, diulang terus),
// dan mengoordinasikan Input, Player, Camera, Weapon, EnemyManager,
// TileMap, serta progres lantai (1-7) dan skor.

import { Input } from './Input.js';
import { Camera } from './Camera.js';
import { Player } from '../player/Player.js';
import { Weapon } from '../weapon/Weapon.js';
import { EnemyManager } from '../enemy/EnemyManager.js';
import { ItemManager } from '../item/ItemManager.js';
import { TileMap } from '../world/TileMap.js';
import { PuzzleManager } from '../world/PuzzleManager.js';
import { StoryManager } from '../story/StoryManager.js';
import { soundManager } from './SoundManager.js';

const MAX_FLOOR = 7; // lantai ke-7 = lantai boss

export class Game {
  constructor(canvas, characterId = 'swordsman') {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false; // pixel-art tetap tajam saat sprite di-scale

    this._resizeCanvas();
    window.addEventListener('resize', () => this._resizeCanvas());

    this.input = new Input(canvas);
    this.player = new Player(0, 0, characterId);
    this.camera = new Camera(canvas);
    this.weapon = new Weapon();
    this.enemyManager = new EnemyManager();
    this.itemManager = new ItemManager();
    this.storyManager = new StoryManager(canvas);
    this.puzzleManager = null;

    this.score = 0;

    // =====================================================
    // DEV TEST MODE
    // =====================================================
    // Aktifkan lewat URL:
    //   ?dev=1&floor=7
    //
    // Contoh local Live Server:
    //   http://127.0.0.1:5500/?dev=1&floor=7
    //
    // Contoh GitHub Pages:
    //   https://...github.io/.../?dev=1&floor=7
    //
    // Kalau dev=1 tidak ada, game tetap mulai normal dari lantai 1.
    const devParams =
      new URLSearchParams(
        window.location.search
      );

    this.devMode =
      devParams.get('dev') === '1';

    const requestedDevFloor =
      Number(
        devParams.get('floor')
      );

    this.floor =
      this.devMode &&
      Number.isInteger(
        requestedDevFloor
      ) &&
      requestedDevFloor >= 1 &&
      requestedDevFloor <= MAX_FLOOR
        ? requestedDevFloor
        : 1;

    this.gameOver = false;
    this.victory = false;
    this.paused = false;

    // Final floor state.
    this.finalBossDefeated = false;

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

    if (isBossFloor) {
      this.finalBossDefeated = false;
    }

    // Lantai boss: ruangan terbuka. Lantai lain: labirin acak (lihat TileMap.js)
    this.tileMap = new TileMap(!isBossFloor, floorNumber);

    const start = this.tileMap.startWorldPos;
    this.player.x = start.x;
    this.player.y = start.y;

    // Jangan bawa hitbox/projectile/item world dari lantai sebelumnya.
    this.weapon.clearTransient();
    this.itemManager.clearFloor();

    this.enemyManager.clear();
    if (isBossFloor) {
      this.enemyManager.spawnBossFloor();
    } else {
      this.enemyManager.spawnForFloor(floorNumber, this.tileMap, this.player);
    }

    // PuzzleManager membaca simbol X / D / T dari TileMap.
    // Untuk patch pertama, puzzle aktif baru di Level 1.
    this.puzzleManager = new PuzzleManager(
      this.tileMap,
      floorNumber,
      this.storyManager,
      this.enemyManager
    );

    if (floorNumber === 1) {
      this.storyManager.show('level1-intro', [
        {
          speaker: this.player.characterName,
          text: 'Tempat ini lebih besar dari yang terlihat dari luar...'
        },
        {
          speaker: 'Misterious Dungeon',
          text: 'Mekanisme kuno masih bergerak di balik dinding yang telah lama ditinggalkan.'
        }
      ]);
    }

    if (floorNumber === 2) {
      this.storyManager.show('level2-intro', [
        {
          speaker: this.player.characterName,
          text: 'Lorong ini bercabang dua... dan keduanya terlihat masih aktif.'
        },
        {
          speaker: 'Misterious Dungeon',
          text: 'Dua segel kuno menjaga jalan menuju bagian dungeon yang lebih dalam.'
        }
      ]);
    }

    if (floorNumber === 3) {
      this.storyManager.show('level3-intro', [
        {
          speaker: this.player.characterName,
          text: 'Simbol-simbol di lantai ini berbeda dari yang sebelumnya...'
        },
        {
          speaker: 'Misterious Dungeon',
          text: 'Tiga rune kuno menunggu urutan yang telah lama dilupakan.'
        }
      ]);
    }

    if (floorNumber === 4) {
      this.storyManager.show('level4-intro', [
        {
          speaker: this.player.characterName,
          text: 'Ada sisa peralatan manusia di sini... Seseorang pernah membuat kemah di lantai ini.'
        },
        {
          speaker: 'Misterious Dungeon',
          text: 'Empat obor tua masih terhubung pada mekanisme gerbang ritual.'
        }
      ]);
    }

    if (floorNumber === 5) {
      this.storyManager.show('level5-intro', [
        {
          speaker: this.player.characterName,
          text: 'Segelnya benar-benar hancur di sini... Energinya bahkan terasa dari lantai.'
        },
        {
          speaker: 'Misterious Dungeon',
          text: 'Tiga pecahan segel tersebar di katakombe. Altar pusat menunggu bagian yang hilang.'
        }
      ]);
    }

    if (floorNumber === 6) {
      this.storyManager.show('level6-intro', [
        {
          speaker: this.player.characterName,
          text: 'Energinya jauh lebih kuat di sini... Ini pasti Segel Keenam.'
        },
        {
          speaker: 'Misterious Dungeon',
          text: 'Jaringan rune tua, dua stabilizer, dan altar utama masih terhubung menuju pintu terakhir.'
        }
      ]);
    }

    if (floorNumber === 7) {
      this.storyManager.show('level7-intro', [
        {
          speaker: 'Ancient Monument',
          text: 'Enam segel mengikat kekuatan. Segel ketujuh mengikat penjaganya.'
        },
        {
          speaker: this.player.characterName,
          text: 'Jadi penjaganya sendiri adalah bagian dari segel...'
        },
        {
          speaker: 'Aster',
          text: 'Aku sudah menyuruhmu pergi.'
        },
        {
          speaker: this.player.characterName,
          text: 'Kamulah Aster.'
        },
        {
          speaker: 'Aster',
          text: 'Dulu.'
        },
        {
          speaker: 'Aster',
          text: 'Sekarang aku hanya bagian dari segel ini.'
        },
        {
          speaker: 'Aster',
          text: 'Energinya sudah terlalu jauh mengambil alih. Jangan mendekat.'
        },
        {
          speaker: 'Ancient Mechanism',
          text: 'Barrier Seventh Seal terhubung pada tiga simpul rune di arena.'
        },
        {
          speaker: this.player.characterName,
          text: 'Matahari, Bulan, Bintang... Aku harus menahan posisi di rune yang menyala sampai barrier runtuh.'
        }
      ]);
    }

    // Rest heal kecil saja. Heal utama sekarang datang dari item.
    if (floorNumber > 1) {
      this.player.heal(1);
    }

    // Reset compass: labirin baru = jalur lama sudah tidak valid
    this._compassPath = null;
    this._compassTimer = 0;
    this.compassAngle = null;
  }

  _devJumpToFloor(floorNumber) {
    if (!this.devMode) {
      return;
    }

    const targetFloor =
      Math.max(
        1,
        Math.min(
          MAX_FLOOR,
          Math.floor(floorNumber)
        )
      );

    this.floor = targetFloor;

    this.gameOver = false;
    this.victory = false;
    this.paused = false;
    this.finalBossDefeated = false;

    // Testing harus cepat: selalu masuk lantai test dengan HP penuh.
    this.player.hp =
      this.player.maxHp;

    this.player.invulnerableTimer = 0;

    // Testing heal/boss tanpa grinding drop.
    this.itemManager.setPotions(
      this.itemManager.getMaxPotions()
    );

    // Tutup dialog dari lantai sebelumnya.
    this.storyManager.resetAll();

    // Reset attack/skill agar hasil test konsisten.
    this.weapon.reset();

    this._setupFloor(
      this.floor
    );

    soundManager.play('levelUp');
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
    this.finalBossDefeated = false;

    this.player.hp = this.player.maxHp;
    this.player.invulnerableTimer = 0;

    this.itemManager.resetRun();

    this.weapon.reset();
    this.storyManager.resetAll();

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
    // =====================================================
    // DEV TEST SHORTCUTS
    // Hanya aktif kalau URL mengandung ?dev=1
    // =====================================================
    if (this.devMode) {
      // B = langsung ke boss floor.
      if (this.input.wasJustPressed('KeyB')) {
        this._devJumpToFloor(MAX_FLOOR);
        return;
      }

      // H = full heal.
      if (this.input.wasJustPressed('KeyH')) {
        this.player.hp =
          this.player.maxHp;

        this.player.invulnerableTimer = 0;
      }

      // N = next floor cepat.
      if (this.input.wasJustPressed('KeyN')) {
        const nextFloor =
          this.floor >= MAX_FLOOR
            ? 1
            : this.floor + 1;

        this._devJumpToFloor(
          nextFloor
        );

        return;
      }
    }

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

    if (this.input.wasJustPressed('KeyP') || this.input.wasJustPressed('Escape')) {
      this.paused = !this.paused;
    }

    if (this.paused) return;

    // Saat dialog terbuka, dunia berhenti. Dialog tetap bisa dilanjutkan
    // dengan Enter/Space/E di PC atau tap pada dialog di HP.
    if (this.storyManager.isActive()) {
      return;
    }

    if (this.player.hp <= 0) {
      this.gameOver = true;
      soundManager.play('gameOver');
      return;
    }

    // R di gameplay = pakai potion.
    // R saat GAME OVER tetap restart karena branch di atas sudah return.
    if (
      this.input.wasJustPressed('KeyR') ||
      this.input.wasJustPressed('Heal')
    ) {
      this.itemManager.usePotion(
        this.player
      );
    }

    this.player.update(dt, this.input, this.camera, this.tileMap);
    this.camera.follow(this.player);
    this.weapon.update(dt, this.input, this.player, this.camera, this.tileMap);
    this.enemyManager.update(dt, this.player, this.tileMap);

    const gained =
      this.enemyManager.handleProjectileHits(
        this.weapon.projectiles
      );

    this.score += gained;

    // Musuh yang mati mengirim event ke ItemManager sebelum dihapus.
    this.itemManager.handleEnemyDeaths(
      this.enemyManager.consumeDeathEvents()
    );

    this.enemyManager.handleEnemyProjectileHits(
      this.player
    );

    this.itemManager.update(
      dt,
      this.player
    );

    if (this.puzzleManager) {
      this.puzzleManager.update(
        this.player,
        dt
      );
    }

    // Compass sengaja tidak dipakai lagi supaya eksplorasi lebih seru.
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
      // Boss mati bukan langsung menang. Player masih harus memulihkan
      // Seventh Seal melalui The Core.
      if (
        allEnemiesDead &&
        !this.finalBossDefeated
      ) {
        this.finalBossDefeated = true;

        if (this.puzzleManager) {
          this.puzzleManager.onBossDefeated(this.player);
        }

        return;
      }

      // Victory baru diberikan setelah Core dipulihkan DAN dialog ending
      // selesai dibaca.
      if (
        this.finalBossDefeated &&
        this.puzzleManager &&
        this.puzzleManager.isFinalSequenceComplete() &&
        !this.storyManager.isActive() &&
        !this.victory
      ) {
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

    if (this.puzzleManager) {
      this.puzzleManager.draw(ctx, this.camera);
    }

    this.enemyManager.draw(ctx, this.camera);

    this.itemManager.draw(
      ctx,
      this.camera
    );

    this.player.draw(ctx, this.camera);
    this.weapon.draw(ctx, this.camera);

    this._drawHUD(ctx);

    if (this.gameOver) this._drawOverlay(ctx, 'GAME OVER', '#ef4444');
    if (this.victory) {
      this._drawFinalVictoryOverlay(ctx);
    }
    if (this.paused) this._drawPauseOverlay(ctx);

    this.storyManager.draw(ctx);
  }

  _drawHUD(ctx) {
    this._syncMobileSkillButton();
    this._syncMobileHealButton();

    if (this.devMode) {
      this._drawDevHUD(ctx);
    }

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
    ctx.fillText(`${this.player.characterName} • ${this.player.weaponLabel}`, x, y + barHeight + 20);
    ctx.fillText(`Skor: ${this.score}`, x, y + barHeight + 42);

    const floorLabel =
      this.floor === MAX_FLOOR
        ? `Lantai ${this.floor} (BOSS)`
        : `Lantai ${this.floor} / ${MAX_FLOOR}`;
    ctx.fillText(floorLabel, x, y + barHeight + 66);

    const skillName =
      this.weapon.getSkillName(
        this.player
      );

    const skillRemaining =
      this.weapon.getSkillCooldownRemaining();

    const skillStatus =
      skillRemaining <= 0
        ? 'READY'
        : `${skillRemaining.toFixed(1)}s`;

    ctx.fillStyle =
      skillRemaining <= 0
        ? '#67e8f9'
        : '#94a3b8';

    ctx.font = 'bold 14px sans-serif';

    ctx.fillText(
      `Skill [Q]: ${skillName} • ${skillStatus}`,
      x,
      y + barHeight + 88
    );

    const potionCount =
      this.itemManager.getPotionCount();

    const maxPotions =
      this.itemManager.getMaxPotions();

    const potionHeal =
      this.itemManager.getPotionHealAmount();

    ctx.fillStyle =
      potionCount > 0
        ? '#fda4af'
        : '#94a3b8';

    ctx.font =
      'bold 14px sans-serif';

    ctx.fillText(
      `Potion [R]: ${potionCount}/${maxPotions} • Heal +${potionHeal}`,
      x,
      y + barHeight + 110
    );

    let messageY =
      y +
      barHeight +
      134;

    if (this.puzzleManager) {
      const puzzleText = this.puzzleManager.getStatusText();
      if (puzzleText) {
        ctx.fillStyle = '#c4b5fd';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(puzzleText, x, messageY);
        messageY += 22;
      }
    }

    if (this.floor < MAX_FLOOR && this.enemyManager.enemies.length === 0) {
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('Semua musuh tumbang! Cari jalan menuju tangga.', x, messageY);
    }

    // Indikator mute, pojok kiri bawah — kecil & tidak mengganggu
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '12px sans-serif';
    ctx.fillText(
      soundManager.muted ? 'Suara: OFF (M)' : 'Suara: ON (M)',
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


  _drawDevHUD(ctx) {
    ctx.save();

    const x =
      this.canvas.width - 18;

    const y = 18;

    const width = 255;
    const height = 64;

    ctx.fillStyle =
      'rgba(15, 23, 42, 0.86)';

    ctx.fillRect(
      x - width,
      y,
      width,
      height
    );

    ctx.strokeStyle =
      '#f59e0b';

    ctx.lineWidth = 2;

    ctx.strokeRect(
      x - width,
      y,
      width,
      height
    );

    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 13px monospace';

    ctx.fillText(
      `DEV MODE • FLOOR ${this.floor}`,
      x - 10,
      y + 9
    );

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '11px monospace';

    ctx.fillText(
      'B: BOSS   N: NEXT   H: FULL HEAL',
      x - 10,
      y + 34
    );

    ctx.restore();
  }

  _syncMobileSkillButton() {
    const button =
      document.getElementById(
        'mobileSkillButton'
      );

    if (!button) return;

    const remaining =
      this.weapon.getSkillCooldownRemaining();

    const skillName =
      this.weapon.getSkillName(
        this.player
      );

    button.setAttribute(
      'aria-label',
      `Skill ${skillName}`
    );

    if (remaining <= 0) {
      button.textContent =
        'SKILL\nREADY';

      button.classList.remove(
        'cooldown'
      );

      return;
    }

    button.textContent =
      `SKILL\n${remaining.toFixed(1)}s`;

    button.classList.add(
      'cooldown'
    );
  }

  _syncMobileHealButton() {
    const button =
      document.getElementById(
        'mobileHealButton'
      );

    if (!button) return;

    const count =
      this.itemManager.getPotionCount();

    const canUse =
      this.itemManager.canUsePotion(
        this.player
      );

    button.textContent =
      `HEAL\nx${count}`;

    button.setAttribute(
      'aria-label',
      `Heal potion. Tersisa ${count}`
    );

    if (canUse) {
      button.classList.remove(
        'disabled'
      );
    } else {
      button.classList.add(
        'disabled'
      );
    }
  }

  _drawFinalVictoryOverlay(ctx) {
    ctx.fillStyle = 'rgba(8, 10, 20, 0.82)';
    ctx.fillRect(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );

    ctx.textAlign = 'center';

    ctx.fillStyle = '#c4b5fd';
    ctx.font = 'bold 38px sans-serif';
    ctx.fillText(
      'THE SEVENTH SEAL',
      this.canvas.width / 2,
      this.canvas.height / 2 - 50
    );

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(
      'HAS BEEN RESTORED',
      this.canvas.width / 2,
      this.canvas.height / 2 - 10
    );

    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(
      `Skor akhir: ${this.score}`,
      this.canvas.width / 2,
      this.canvas.height / 2 + 38
    );

    ctx.fillStyle = '#a78bfa';
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText(
      'TO BE CONTINUED...',
      this.canvas.width / 2,
      this.canvas.height / 2 + 76
    );

    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(
      'Tekan R untuk main lagi',
      this.canvas.width / 2,
      this.canvas.height / 2 + 112
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
