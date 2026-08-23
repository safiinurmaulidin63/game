// Boss.js
// Musuh terakhir di lantai 7. Mekanik utamanya: boss punya siklus fase
// yang berulang terus:
//
//   ATTACK     - boss mengejar & menyerang normal (pakai perilaku melee
//                dari class Enemy, lewat super.update()). Damage yang
//                masuk dari peluru player DIKURANGI BANYAK (boss tahan
//                banting, cuma masuk 15%).
//   ROAR       - boss BERHENTI TOTAL sebentar, "mengerang" kelelahan
//                (visual: warna oranye + teks "ROAR...!"). Damage yang
//                masuk masih dikurangi sama seperti ATTACK.
//   VULNERABLE - boss kelelahan: gerak sangat lambat, TIDAK menyerang,
//                dan damage yang masuk DILIPATGANDAKAN (x3). Ini jendela
//                waktu terbaik buat player all-out menembak.
//
// Setelah VULNERABLE habis waktunya, siklus balik lagi ke ATTACK.

import { Enemy } from './Enemy.js';
import { assetLoader } from '../core/AssetLoader.js';
import { soundManager } from '../core/SoundManager.js';

const PHASE = {
  ATTACK: 'attack',
  ROAR: 'roar',
  VULNERABLE: 'vulnerable',
};

export class Boss extends Enemy {
  constructor(x, y) {
    super(x, y, 'melee'); // dasarnya pakai perilaku melee (kejar + nempel nyerang)

    // Override statistik dasar Enemy, boss jauh lebih kuat
    this.size = 64;
    this.speed = 70;
    this.color = '#dc2626'; // merah tua
    this.maxHp = 60;
    this.hp = this.maxHp;
    this.scoreValue = 500;

    this.attackDamage = 2; // lebih sakit dari musuh biasa (yang cuma 1)
    this.attackCooldown = 1.2;
    this.attackTimer = 0;

    // --- State machine fase boss ---
    this.phase = PHASE.ATTACK;

    this.durations = {
      [PHASE.ATTACK]: 8,
      [PHASE.ROAR]: 1.5,
      [PHASE.VULNERABLE]: 4,
    };
    this.phaseTimer = this.durations[PHASE.ATTACK];

    // Seberapa besar damage player efektif masuk, tergantung fase saat ini
    this.damageMultiplier = {
      [PHASE.ATTACK]: 0.15,
      [PHASE.ROAR]: 0.15,
      [PHASE.VULNERABLE]: 3,
    };
  }

  // Override takeDamage bawaan Enemy: damage dikalikan sesuai fase
  takeDamage(amount) {
    const multiplier = this.damageMultiplier[this.phase] ?? 1;
    const effectiveAmount = amount * multiplier;

    this.hp -= effectiveAmount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      soundManager.play('enemyDeath');
    } else {
      soundManager.play('enemyHit');
    }
  }

  update(dt, player, others, enemyProjectiles, tileMap) {
    this._updatePhase(dt);

    if (this.phase === PHASE.ROAR) {
      // Diam total selagi "mengerang" — jangan gerak, jangan nyerang
      return;
    }

    if (this.phase === PHASE.VULNERABLE) {
      // Gerak sangat lambat, TIDAK menyerang, fokus jadi sasaran DPS
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const stepX = (dx / dist) * (this.speed * 0.2) * dt;
      const stepY = (dy / dist) * (this.speed * 0.2) * dt;
      this._moveWithCollision(stepX, stepY, tileMap);
      return;
    }

    // Fase ATTACK: pakai perilaku melee biasa dari class induk (Enemy)
    super.update(dt, player, others, enemyProjectiles, tileMap);
  }

  _updatePhase(dt) {
    this.phaseTimer -= dt;
    if (this.phaseTimer > 0) return;

    if (this.phase === PHASE.ATTACK) {
      this.phase = PHASE.ROAR;
      soundManager.play('bossRoar');
    } else if (this.phase === PHASE.ROAR) {
      this.phase = PHASE.VULNERABLE;
      soundManager.play('bossVulnerable');
    } else {
      this.phase = PHASE.ATTACK;
    }

    this.phaseTimer = this.durations[this.phase];
  }

  draw(ctx, camera) {
    const screen = camera.worldToScreen(this.x, this.y);

    // --- Health bar, lebih lebar dari musuh biasa ---
    const barWidth = 120;
    const barHeight = 8;
    const barX = screen.x - barWidth / 2;
    const barY = screen.y - this.size / 2 - 22;
    const hpRatio = this.hp / this.maxHp;

    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    // --- Warna indikator fase: dipakai sebagai GLOW (bekerja baik
    // dipakai sprite ATAU fallback kotak) ---
    let phaseColor = this.color;
    if (this.phase === PHASE.ROAR) phaseColor = '#f97316'; // oranye = mulai lelah
    if (this.phase === PHASE.VULNERABLE) phaseColor = '#facc15'; // kuning = rentan!

    const sprite = assetLoader.get('boss');

    ctx.save();
    ctx.shadowColor = phaseColor;
    ctx.shadowBlur = 25;

    if (sprite) {
      ctx.drawImage(
        sprite,
        screen.x - this.size / 2,
        screen.y - this.size / 2,
        this.size,
        this.size
      );
    } else {
      ctx.fillStyle = phaseColor;
      ctx.fillRect(screen.x - this.size / 2, screen.y - this.size / 2, this.size, this.size);
    }
    ctx.restore();

    // --- Label fase, di atas health bar ---
    let label = 'BOSS';
    if (this.phase === PHASE.ROAR) label = 'ROAR...!';
    if (this.phase === PHASE.VULNERABLE) label = 'VULNERABLE!';

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, screen.x, barY - 6);
    ctx.textAlign = 'left';
  }
}
