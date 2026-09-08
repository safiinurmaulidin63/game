// EnemyManager.js
// Tugas: menyimpan daftar semua Enemy (termasuk Boss) yang aktif,
// menyimpan daftar peluru musuh ranged (this.projectiles), meng-spawn
// musuh sesuai lantai, lalu meneruskan update + draw + collision.

import { Enemy } from './Enemy.js';
import { Boss } from './Boss.js';
import { soundManager } from '../core/SoundManager.js';

export class EnemyManager {
  constructor() {
    this.enemies = [];
    this.projectiles = []; // peluru musuh ranged, menyerang player

    // ItemManager membaca event ini setelah damage player diproses.
    this.deathEvents = [];
  }

  spawn(x, y, type = 'melee') {
    this.enemies.push(new Enemy(x, y, type));
  }

  spawnBossAt(x, y) {
    this.enemies.push(new Boss(x, y));
  }

  getBoss() {
    return (
      this.enemies.find(
        (enemy) => enemy instanceof Boss
      ) || null
    );
  }

  // API untuk Step 2: Seal Node / altar dapat mengirim progress
  // tanpa perlu tahu implementasi internal Boss.
  enableBossMechanism(required = 3) {
    const boss = this.getBoss();

    boss?.enableExternalMechanism(
      required
    );
  }

  setBossMechanismProgress(
    progress,
    required = 3
  ) {
    const boss = this.getBoss();

    boss?.setMechanismProgress(
      progress,
      required
    );
  }

  addBossMechanismProgress(
    amount = 1
  ) {
    const boss = this.getBoss();

    boss?.addMechanismProgress(
      amount
    );
  }

  breakBossShield() {
    const boss = this.getBoss();

    boss?.breakShield();
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
    this.deathEvents = [];
  }

  consumeDeathEvents() {
    const events =
      this.deathEvents;

    this.deathEvents = [];

    return events;
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

  // Attack PLAYER vs musuh.
  // Mendukung projectile biasa, melee multi-target, dan stun.
  handleProjectileHits(playerProjectiles) {
    let scoreGained = 0;

    for (const enemy of this.enemies) {
      if (enemy.dead) continue;

      for (const attack of playerProjectiles) {
        if (attack.dead) continue;

        if (
          attack.hasHit &&
          attack.hasHit(enemy)
        ) {
          continue;
        }

        let dist;

        if (
          attack.segmentCollision &&
          Number.isFinite(
            attack.segmentStartX
          ) &&
          Number.isFinite(
            attack.segmentStartY
          )
        ) {
          // Distance enemy center ke segment:
          // start(player) -> end(attack.x, attack.y).
          //
          // Ini membuat melee cepat lebih reliable melawan boss yang
          // bergerak ekstrem, tanpa mengubah projectile/magic.
          const ax =
            attack.segmentStartX;

          const ay =
            attack.segmentStartY;

          const bx =
            attack.x;

          const by =
            attack.y;

          const abX = bx - ax;
          const abY = by - ay;

          const apX =
            enemy.x - ax;

          const apY =
            enemy.y - ay;

          const abLengthSq =
            abX * abX +
            abY * abY;

          let t =
            abLengthSq > 0
              ? (
                  apX * abX +
                  apY * abY
                ) /
                abLengthSq
              : 0;

          t =
            Math.max(
              0,
              Math.min(
                1,
                t
              )
            );

          const closestX =
            ax +
            abX * t;

          const closestY =
            ay +
            abY * t;

          const dx =
            enemy.x -
            closestX;

          const dy =
            enemy.y -
            closestY;

          dist =
            Math.sqrt(
              dx * dx +
              dy * dy
            );
        } else {
          const dx =
            enemy.x -
            attack.x;

          const dy =
            enemy.y -
            attack.y;

          dist =
            Math.sqrt(
              dx * dx +
              dy * dy
            );
        }

        const hitDistance =
          enemy.size / 2 +
          attack.radius;

        if (dist >= hitDistance) {
          continue;
        }

        enemy.takeDamage(
          attack.damage
        );

        if (
          attack.stunDuration > 0 &&
          enemy.applyStun
        ) {
          enemy.applyStun(
            attack.stunDuration
          );

          if (!attack.stunSoundPlayed) {
            attack.stunSoundPlayed = true;
            soundManager.play('stun');
          }
        }

        attack.registerHit?.(enemy);

        if (!attack.piercing) {
          attack.dead = true;
        }

        if (enemy.dead) {
          scoreGained +=
            enemy.scoreValue;

          this.deathEvents.push({
            x: enemy.x,
            y: enemy.y,
            type:
              enemy.type ??
              'boss',
            isBoss:
              enemy instanceof Boss,
          });

          break;
        }
      }
    }

    this.enemies =
      this.enemies.filter(
        (enemy) => !enemy.dead
      );

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
