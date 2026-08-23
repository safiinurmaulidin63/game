// Weapon.js
// Tugas: mengelola daftar peluru (projectiles), membuat peluru
// baru saat klik kiri (dengan jeda/cooldown), dan meneruskan
// update + draw ke setiap Projectile.

import { Projectile } from './Projectile.js';
import { soundManager } from '../core/SoundManager.js';

export class Weapon {
  constructor() {
    this.projectiles = [];
    this.cooldown = 0.25; // detik antar tembakan
    this.cooldownTimer = 0;
  }

  update(dt, input, player, camera, tileMap) {
    // Kurangi timer cooldown setiap frame
    if (this.cooldownTimer > 0) {
      this.cooldownTimer -= dt;
    }

    // Kalau mouse ditekan DAN cooldown sudah habis -> tembak
    if (input.mouseDown && this.cooldownTimer <= 0) {
      this._fire(player, input, camera);
      this.cooldownTimer = this.cooldown;
    }

    // Update semua peluru yang sedang aktif
    for (const p of this.projectiles) {
      p.update(dt, tileMap);
    }

    // Buang peluru yang sudah "mati" (lifeTime habis)
    this.projectiles = this.projectiles.filter((p) => !p.dead);
  }

  _fire(player, input, camera) {
    const mouseWorld = camera.screenToWorld(input.mouse.x, input.mouse.y);
    const angle = Math.atan2(mouseWorld.y - player.y, mouseWorld.x - player.x);

    this.projectiles.push(new Projectile(player.x, player.y, angle));
    soundManager.play('shoot');
  }

  draw(ctx, camera) {
    for (const p of this.projectiles) {
      p.draw(ctx, camera);
    }
  }
}
