// Weapon.js
// Mengelola projectile dan menggunakan arah hadap Player.

import { Projectile } from './Projectile.js';
import { soundManager } from '../core/SoundManager.js';

export class Weapon {
  constructor() {
    this.projectiles = [];

    // Jeda antar tembakan
    this.cooldown = 0.25;
    this.cooldownTimer = 0;
  }

  update(dt, input, player, camera, tileMap) {

    // Kurangi cooldown
    if (this.cooldownTimer > 0) {
      this.cooldownTimer -= dt;
    }

    // Mouse PC maupun tombol FIRE HP
    // sama-sama mengubah input.mouseDown.
    if (
      input.mouseDown &&
      this.cooldownTimer <= 0
    ) {
      this._fire(player);

      this.cooldownTimer =
        this.cooldown;
    }

    // Update projectile
    for (const projectile of this.projectiles) {
      projectile.update(dt, tileMap);
    }

    // Hapus projectile yang sudah selesai
    this.projectiles =
      this.projectiles.filter(
        projectile => !projectile.dead
      );
  }

  _fire(player) {

    // INI BAGIAN PENTING.
    //
    // PC:
    // mouse → Player.angle
    //
    // HP:
    // aim joystick → mobileAim → Player.angle
    //
    // Weapon tinggal memakai angle tersebut.
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