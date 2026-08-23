// Projectile.js
// Tugas: merepresentasikan satu peluru yang bergerak lurus
// menuju arah tertentu, lalu hilang setelah waktu tertentu.

import { assetLoader } from '../core/AssetLoader.js';

export class Projectile {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = 480; // pixel per detik, lebih cepat dari player
    this.radius = 6;
    this.color = '#ef4444'; // merah

    this.lifeTime = 1.5; // detik, sebelum otomatis dihapus
    this.age = 0;
    this.dead = false;

    this.damage = 1; // berapa HP musuh berkurang kalau kena peluru ini
  }

  update(dt, tileMap) {
    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;

    this.age += dt;
    if (this.age >= this.lifeTime) {
      this.dead = true;
    }

    // Peluru berhenti (hilang) kalau nabrak dinding/rintangan
    if (tileMap && tileMap.isWallAtWorld(this.x, this.y)) {
      this.dead = true;
    }
  }

  draw(ctx, camera) {
    const screen = camera.worldToScreen(this.x, this.y);
    const sprite = assetLoader.get('playerBullet');

    if (sprite) {
      ctx.save();
      ctx.translate(screen.x, screen.y);
      ctx.rotate(this.angle);
      const size = this.radius * 2.5;
      ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
      ctx.restore();
    } else {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
