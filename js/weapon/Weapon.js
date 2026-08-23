import { Projectile } from './Projectile.js';
import { soundManager } from '../core/SoundManager.js';

export class Weapon {
  constructor() {
    this.projectiles = [];

    this.cooldown = 0.25;
    this.cooldownTimer = 0;
  }

  update(dt, input, player, camera, tileMap) {
    if (this.cooldownTimer > 0) {
      this.cooldownTimer -= dt;
    }

    if (
      input.mouseDown &&
      this.cooldownTimer <= 0
    ) {
      this._fire(player);

      this.cooldownTimer =
        this.cooldown;
    }

    for (const projectile of this.projectiles) {
      projectile.update(dt, tileMap);
    }

    this.projectiles =
      this.projectiles.filter(
        projectile => !projectile.dead
      );
  }

  _fire(player) {
    // Pakai arah player.
    // PC: player.angle berasal dari mouse.
    // HP: player.angle berasal dari joystick aim.
    const angle = player.angle;

    this.projectiles.push(
      new Projectile(
        player.x,
        player.y,
        angle
      )
    );

    soundManager.play('shoot');
  }

  draw(ctx, camera) {
    for (const projectile of this.projectiles) {
      projectile.draw(ctx, camera);
    }
  }
}