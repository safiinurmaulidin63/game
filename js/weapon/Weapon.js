// Weapon.js
// Sistem attack berdasarkan class karakter.
// Mage      -> projectile sihir
// Fighter   -> serangan dekat
// Swordsman -> serangan dekat
// Monk      -> serangan dekat dengan jangkauan sedikit lebih jauh

import { Projectile } from './Projectile.js';
import { MeleeHit } from './MeleeHit.js';
import { soundManager } from '../core/SoundManager.js';

export class Weapon {
  constructor() {
    // Nama array tetap "projectiles" agar EnemyManager lama tidak perlu dibongkar.
    // Isinya sekarang bisa Projectile ATAU MeleeHit.
    this.projectiles = [];

    this.cooldownTimer = 0;
  }

  update(dt, input, player, camera, tileMap) {
    if (this.cooldownTimer > 0) {
      this.cooldownTimer -= dt;
    }

    if (input.mouseDown && this.cooldownTimer <= 0) {
      this._attack(player);
      this.cooldownTimer = this._getCooldown(player.weaponType);
    }

    for (const attack of this.projectiles) {
      attack.update(dt, tileMap);
    }

    this.projectiles = this.projectiles.filter(
      (attack) => !attack.dead
    );
  }

  _getCooldown(type) {
    switch (type) {
      case 'fist':
        return 0.24;

      case 'sword':
        return 0.36;

      case 'staff':
        return 0.42;

      case 'magic':
      default:
        return 0.25;
    }
  }

  _attack(player) {
    const angle = player.angle;

    switch (player.weaponType) {
      case 'fist':
        this.projectiles.push(
          new MeleeHit(player.x, player.y, angle, {
            type: 'fist',
            range: 26,
            radius: 17,
            damage: 1,
          })
        );
        break;

      case 'sword':
        this.projectiles.push(
          new MeleeHit(player.x, player.y, angle, {
            type: 'sword',
            range: 36,
            radius: 23,
            damage: 2,
          })
        );
        break;

      case 'staff':
        this.projectiles.push(
          new MeleeHit(player.x, player.y, angle, {
            type: 'staff',
            range: 44,
            radius: 20,
            damage: 2,
          })
        );
        break;

      case 'magic':
      default:
        this.projectiles.push(
          new Projectile(
            player.x,
            player.y,
            angle
          )
        );

        soundManager.play('shoot');
        break;
    }
  }

  draw(ctx, camera) {
    for (const attack of this.projectiles) {
      attack.draw(ctx, camera);
    }
  }
}
