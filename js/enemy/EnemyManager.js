// EnemyManager.js
// Tugas: menyimpan daftar semua Enemy (termasuk Boss) yang aktif,
// menyimpan daftar peluru musuh ranged (this.projectiles), meng-spawn
// musuh sesuai lantai, lalu meneruskan update + draw + collision.

import { Enemy } from './Enemy.js';
import { Boss } from './Boss.js';

export class EnemyManager {
  constructor() {
    this.enemies = [];
    this.projectiles = []; // peluru musuh ranged, menyerang player
  }

  spawn(x, y, type = 'melee') {
    this.enemies.push(new Enemy(x, y, type));
  }

  spawnBossAt(x, y) {
    this.enemies.push(new Boss(x, y));
  }

  // Dipanggil tiap pindah ke lantai baru (lantai biasa, bukan lantai boss).
  // Makin tinggi lantai, makin banyak musuh & makin beragam tipenya.
  // Posisi spawn diambil dari sel lantai KOSONG yang benar-benar valid di
  // labirin (lewat tileMap), bukan rumus lingkaran seperti sebelumnya —
  // supaya musuh tidak pernah muncul di dalam dinding/rintangan.
  spawnForFloor(floorNumber, tileMap, player) {
    const meleeCount = 2 + floorNumber;
    const rangedCount = Math.floor(floorNumber / 2); // mulai muncul lantai 2
    const bruteCount = floorNumber >= 3 ? Math.floor((floorNumber - 1) / 2) : 0; // mulai lantai 3
    const swarmCount = floorNumber >= 2 ? 1 + Math.floor(floorNumber / 2) : 0; // mulai lantai 2

    const types = [
      ...Array(meleeCount).fill('melee'),
      ...Array(rangedCount).fill('ranged'),
      ...Array(bruteCount).fill('brute'),
      ...Array(swarmCount).fill('swarm'),
    ];

    const positions = tileMap.getRandomOpenWorldPositions(types.length, player.x, player.y, 260);

    types.forEach((type, i) => {
      const pos = positions[i] || positions[positions.length - 1] || { x: 0, y: 0 };
      this.spawn(pos.x, pos.y, type);
    });
  }

  // Dipanggil khusus untuk lantai terakhir (boss)
  spawnBossFloor() {
    this.spawnBossAt(0, -300);
  }

  clear() {
    this.enemies = [];
    this.projectiles = [];
  }

  update(dt, player, tileMap) {
    for (const enemy of this.enemies) {
      enemy.update(dt, player, this.enemies, this.projectiles, tileMap);
    }

    for (const p of this.projectiles) {
      p.update(dt, tileMap);
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead);
  }

  // Peluru PLAYER vs musuh. Return TOTAL skor dari musuh yang mati
  // di frame ini (dijumlahkan oleh Game.js ke this.score).
  handleProjectileHits(playerProjectiles) {
    let scoreGained = 0;

    for (const enemy of this.enemies) {
      if (enemy.dead) continue;

      for (const p of playerProjectiles) {
        if (p.dead) continue;

        const dx = enemy.x - p.x;
        const dy = enemy.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const hitDistance = enemy.size / 2 + p.radius;

        if (dist < hitDistance) {
          enemy.takeDamage(p.damage);
          p.dead = true;

          if (enemy.dead) {
            scoreGained += enemy.scoreValue;
            break;
          }
        }
      }
    }

    this.enemies = this.enemies.filter((e) => !e.dead);
    return scoreGained;
  }

  // Peluru MUSUH (dari tipe ranged) vs player
  handleEnemyProjectileHits(player) {
    for (const p of this.projectiles) {
      if (p.dead) continue;

      const dx = player.x - p.x;
      const dy = player.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const hitDistance = player.size / 2 + p.radius;

      if (dist < hitDistance) {
        player.takeDamage(p.damage);
        p.dead = true;
      }
    }
  }

  draw(ctx, camera) {
    for (const enemy of this.enemies) {
      enemy.draw(ctx, camera);
    }
    for (const p of this.projectiles) {
      p.draw(ctx, camera);
    }
  }
}
