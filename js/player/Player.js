// Player.js
// Tugas: menyimpan posisi player di WORLD, menangani gerakan
// WASD + joystick mobile, menghitung arah hadap berdasarkan mouse,
// dan menggambar player.

import { assetLoader } from '../core/AssetLoader.js';
import { soundManager } from '../core/SoundManager.js';

export class Player {
  constructor(x, y) {
    this.x = x; // posisi world
    this.y = y;
    this.size = 32; // lebar/tinggi kotak
    this.speed = 220; // pixel per detik
    this.color = '#3b82f6'; // biru
    this.angle = 0; // arah hadap (radian), dipakai Weapon.js

    this.maxHp = 10;
    this.hp = this.maxHp;

    // "Invulnerable time" / i-frame
    this.invulnerableDuration = 0.5;
    this.invulnerableTimer = 0;

    this.hazardDamage = 1;
  }

  // Dipanggil dari Enemy.js saat musuh menyerang player
  takeDamage(amount) {
    if (this.invulnerableTimer > 0) return;
    this.hp -= amount;
    if (this.hp < 0) this.hp = 0;

    this.invulnerableTimer = this.invulnerableDuration;
    soundManager.play('playerHurt');
  }

  update(dt, input, camera, tileMap) {
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
    }

    let dx = 0;
    let dy = 0;

    // Keyboard PC tetap bekerja seperti sebelumnya.
    if (input.isDown('KeyW')) dy -= 1;
    if (input.isDown('KeyS')) dy += 1;
    if (input.isDown('KeyA')) dx -= 1;
    if (input.isDown('KeyD')) dx += 1;

    // Tambahkan joystick HP tanpa menggantikan input keyboard.
    dx += input.mobileMove?.x ?? 0;
    dy += input.mobileMove?.y ?? 0;

    // Normalisasi supaya gerak diagonal tidak lebih cepat.
    // Untuk joystick analog yang belum mencapai batas lingkaran,
    // besar input dipertahankan agar gerak bisa lebih pelan.
    const magnitude = Math.hypot(dx, dy);
    if (magnitude > 1) {
      dx /= magnitude;
      dy /= magnitude;
    }

    const moveX = dx * this.speed * dt;
    const moveY = dy * this.speed * dt;

    // Gerak per sumbu supaya collision lama tetap sama.
    const newX = this.x + moveX;
    if (!this._collidesWithWall(newX, this.y, tileMap)) {
      this.x = newX;
    }

    const newY = this.y + moveY;
    if (!this._collidesWithWall(this.x, newY, tileMap)) {
      this.y = newY;
    }

    // Sistem aim mouse tetap dipertahankan.
    const mouseWorld = camera.screenToWorld(input.mouse.x, input.mouse.y);
    this.angle = Math.atan2(mouseWorld.y - this.y, mouseWorld.x - this.x);

    if (tileMap && tileMap.isHazardAtWorld(this.x, this.y)) {
      this.takeDamage(this.hazardDamage);
    }
  }

  _collidesWithWall(x, y, tileMap) {
    if (!tileMap) return false;

    const half = this.size / 2;

    return (
      tileMap.isWallAtWorld(x - half, y - half) ||
      tileMap.isWallAtWorld(x + half, y - half) ||
      tileMap.isWallAtWorld(x - half, y + half) ||
      tileMap.isWallAtWorld(x + half, y + half)
    );
  }

  draw(ctx, camera) {
    const screen = camera.worldToScreen(this.x, this.y);
    const sprite = assetLoader.get('player');

    ctx.save();
    ctx.translate(screen.x, screen.y);
    ctx.rotate(this.angle);

    ctx.globalAlpha = this.invulnerableTimer > 0 ? 0.5 : 1;

    if (sprite) {
      ctx.drawImage(sprite, -this.size / 2, -this.size / 2, this.size, this.size);
    } else {
      ctx.fillStyle = this.color;
      ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);

      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(this.size, 0);
      ctx.stroke();
    }

    ctx.restore();
  }
}
