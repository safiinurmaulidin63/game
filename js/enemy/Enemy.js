// Enemy.js
// Tugas: satu musuh, empat tipe:
//
// 'melee'  - kejar player terus, serang kalau nempel (kontak langsung).
// 'brute'  - sama seperti melee, tapi lambat & tebal, pukulannya sakit.
// 'swarm'  - sama seperti melee, tapi cepat & rapuh, gerakannya sedikit
//            "liar" (wobble) supaya berasa gesit/susah ditembak presisi.
// 'ranged' - jaga jarak ideal dari player, dan HANYA menembak kalau ada
//            garis pandang langsung (tidak terhalang dinding/rintangan).
//
// Semua tipe sekarang bergerak lewat PATH (BFS dari TileMap), bukan garis
// lurus — supaya bisa muter lewat lorong labirin, bukan nyangkut di
// dinding. Gerakan juga sudah dicek tabrakan dinding/rintangan, sama
// seperti Player.
//
// Separation tetap dipakai supaya musuh tidak saling numpuk jadi satu titik.

import { EnemyProjectile } from './EnemyProjectile.js';
import { assetLoader } from '../core/AssetLoader.js';
import { soundManager } from '../core/SoundManager.js';

const SPRITE_KEY_BY_TYPE = {
  melee: 'enemyMelee',
  ranged: 'enemyRanged',
  brute: 'enemyBrute',
  swarm: 'enemySwarm',
};

export class Enemy {
  constructor(x, y, type = 'melee') {
    this.x = x;
    this.y = y;
    this.type = type;

    if (type === 'ranged') {
      this.size = 26;
      this.speed = 70;
      this.color = '#a855f7'; // ungu
      this.maxHp = 2; // lebih rapuh, karena bahaya justru dari jarak jauh
      this.scoreValue = 20;

      this.preferredDistance = 280; // jarak ideal dari player
      this.shootCooldown = 1.8;
      this.shootTimer = Math.random() * this.shootCooldown;
      this.projectileSpeed = 320;
      this.projectileDamage = 1;
    } else if (type === 'brute') {
      this.size = 40;
      this.speed = 55; // lambat
      this.color = '#92400e'; // coklat tua
      this.maxHp = 7; // tebal
      this.scoreValue = 35;

      this.attackDamage = 2; // pukulannya sakit
      this.attackCooldown = 1.3;
      this.attackTimer = 0;
    } else if (type === 'swarm') {
      this.size = 20;
      this.speed = 135; // cepat
      this.color = '#f472b6'; // pink terang, gampang dikenali "rapuh & gesit"
      this.maxHp = 1; // mati sekali kena
      this.scoreValue = 8;

      this.attackDamage = 1;
      this.attackCooldown = 0.6;
      this.attackTimer = 0;
    } else {
      // melee (default)
      this.size = 28;
      this.speed = 90;
      this.color = '#22c55e'; // hijau
      this.maxHp = 3;
      this.scoreValue = 10;

      this.attackDamage = 1;
      this.attackCooldown = 1;
      this.attackTimer = 0;
    }

    this.hp = this.maxHp;
    this.dead = false;

    // --- State untuk path-following ---
    this._path = null;
    this._pathTimer = Math.random() * 0.3; // diacak biar tidak semua recompute bebarengan
    this._jitterPhase = Math.random() * 10;
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      soundManager.play('enemyDeath');
    } else {
      soundManager.play('enemyHit');
    }
  }

  // others = semua Enemy aktif (dipakai untuk separation)
  // enemyProjectiles = array milik EnemyManager, dipakai musuh ranged
  // tileMap = dipakai untuk pathfinding, garis pandang, dan tabrakan dinding
  update(dt, player, others, enemyProjectiles, tileMap) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distToPlayer = Math.sqrt(dx * dx + dy * dy) || 1;
    const dirX = dx / distToPlayer;
    const dirY = dy / distToPlayer;

    // --- Recompute jalur ke player secara berkala (BFS), bukan tiap frame ---
    this._pathTimer -= dt;
    if (tileMap && this._pathTimer <= 0) {
      this._path = tileMap.findWorldPath(this.x, this.y, player.x, player.y);
      this._pathTimer = 0.4 + Math.random() * 0.2;
    }

    // Buang waypoint yang sudah terlewati/kedekatan, ambil target berikutnya
    let toTargetX = dirX;
    let toTargetY = dirY;

    if (tileMap && this._path && this._path.length > 0) {
      while (this._path.length > 1) {
        const wp = this._path[0];
        if (Math.hypot(wp.x - this.x, wp.y - this.y) < 28) {
          this._path.shift();
        } else {
          break;
        }
      }
      const wp = this._path[0];
      const tdx = wp.x - this.x;
      const tdy = wp.y - this.y;
      const tdist = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
      toTargetX = tdx / tdist;
      toTargetY = tdy / tdist;
    }

    // --- Arah gerak dasar, beda antara ranged dan tipe "kontak" (melee/brute/swarm) ---
    let chaseX = 0;
    let chaseY = 0;
    const canSeePlayer = !tileMap || tileMap.hasLineOfSight(this.x, this.y, player.x, player.y);

    if (this.type === 'ranged') {
      const buffer = 20;

      if (!canSeePlayer) {
        // Belum kelihatan player -> terus kejar lewat jalur menuju dia
        chaseX = toTargetX;
        chaseY = toTargetY;
      } else if (distToPlayer > this.preferredDistance + buffer) {
        chaseX = toTargetX;
        chaseY = toTargetY;
      } else if (distToPlayer < this.preferredDistance - buffer) {
        chaseX = -dirX; // mundur menjauhi player (arah lurus, sudah cukup dekat)
        chaseY = -dirY;
      }
      // Di rentang ideal & sudah lihat player: diam, siap nembak
    } else {
      chaseX = toTargetX;
      chaseY = toTargetY;
    }

    // --- Separation (menjauh dari musuh lain yang kedekatan) ---
    let sepX = 0;
    let sepY = 0;
    const separationRadius = this.size * 1.6;

    for (const other of others) {
      if (other === this) continue;
      const ox = this.x - other.x;
      const oy = this.y - other.y;
      const d = Math.sqrt(ox * ox + oy * oy);
      if (d > 0 && d < separationRadius) {
        const strength = (separationRadius - d) / separationRadius;
        sepX += (ox / d) * strength;
        sepY += (oy / d) * strength;
      }
    }

    let moveX = chaseX + sepX * 1.2;
    let moveY = chaseY + sepY * 1.2;

    const moveLen = Math.sqrt(moveX * moveX + moveY * moveY);
    if (moveLen > 0.001) {
      moveX /= moveLen;
      moveY /= moveLen;

      // Swarm bergerak agak "liar" (wobble), bukan garis lurus sempurna
      if (this.type === 'swarm') {
        this._jitterPhase += dt * 6;
        const wobble = Math.sin(this._jitterPhase) * 0.4;
        const cos = Math.cos(wobble);
        const sin = Math.sin(wobble);
        const wx = moveX * cos - moveY * sin;
        const wy = moveX * sin + moveY * cos;
        moveX = wx;
        moveY = wy;
      }

      const stepX = moveX * this.speed * dt;
      const stepY = moveY * this.speed * dt;
      this._moveWithCollision(stepX, stepY, tileMap);
    }

    // --- Serangan ---
    if (this.type === 'ranged') {
      this.shootTimer -= dt;
      if (this.shootTimer <= 0) {
        if (canSeePlayer && enemyProjectiles) {
          const angle = Math.atan2(dy, dx);
          enemyProjectiles.push(
            new EnemyProjectile(this.x, this.y, angle, this.projectileSpeed, this.projectileDamage)
          );
          soundManager.play('enemyShoot');
          this.shootTimer = this.shootCooldown;
        } else {
          this.shootTimer = 0.2; // belum lihat player, cek lagi sebentar lagi
        }
      }
    } else {
      if (this.attackTimer > 0) this.attackTimer -= dt;
      const attackRange = this.size / 2 + player.size / 2;
      if (distToPlayer <= attackRange && this.attackTimer <= 0) {
        player.takeDamage(this.attackDamage);
        this.attackTimer = this.attackCooldown;
      }
    }
  }

  // Gerak per-sumbu dengan cek tabrakan dinding/rintangan, sama seperti Player.
  // tileMap null (mis. dipanggil tanpa map) -> gerak bebas, tidak dicek.
  _moveWithCollision(stepX, stepY, tileMap) {
    if (!tileMap) {
      this.x += stepX;
      this.y += stepY;
      return;
    }

    const half = this.size / 2;

    const newX = this.x + stepX;
    if (!this._blockedAt(newX, this.y, half, tileMap)) {
      this.x = newX;
    }

    const newY = this.y + stepY;
    if (!this._blockedAt(this.x, newY, half, tileMap)) {
      this.y = newY;
    }
  }

  _blockedAt(x, y, half, tileMap) {
    return (
      tileMap.isWallAtWorld(x - half, y - half) ||
      tileMap.isWallAtWorld(x + half, y - half) ||
      tileMap.isWallAtWorld(x - half, y + half) ||
      tileMap.isWallAtWorld(x + half, y + half)
    );
  }

  draw(ctx, camera) {
    const screen = camera.worldToScreen(this.x, this.y);

    const barWidth = this.size;
    const barHeight = 5;
    const barX = screen.x - barWidth / 2;
    const barY = screen.y - this.size / 2 - 10;
    const hpRatio = this.hp / this.maxHp;

    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    ctx.fillStyle = hpRatio > 0.5 ? '#4ade80' : hpRatio > 0.25 ? '#facc15' : '#ef4444';
    ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

    const spriteKey = SPRITE_KEY_BY_TYPE[this.type] || 'enemyMelee';
    const sprite = assetLoader.get(spriteKey);

    if (sprite) {
      ctx.drawImage(
        sprite,
        screen.x - this.size / 2,
        screen.y - this.size / 2,
        this.size,
        this.size
      );
    } else {
      ctx.fillStyle = this.color;
      ctx.fillRect(screen.x - this.size / 2, screen.y - this.size / 2, this.size, this.size);
    }
  }
}
