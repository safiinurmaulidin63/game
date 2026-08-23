// EnemyProjectile.js
// Peluru yang ditembakkan musuh tipe 'ranged' ke arah PLAYER.
// Sengaja dipisah dari weapon/Projectile.js (punya player, menyerang
// musuh) supaya jelas: file ini urusannya menyerang player.

import { assetLoader } from '../core/AssetLoader.js';

export class EnemyProjectile {
  constructor(x, y, angle, speed = 300, damage = 1) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = speed;
    this.damage = damage;
    this.radius = 6;
    this.color = '#a855f7'; // ungu, senada warna musuh ranged

    this.lifeTime = 3;
    this.age = 0;
    this.dead = false;
  }

  update(dt, tileMap) {
    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;

    this.age += dt;
    if (this.age >= this.lifeTime) this.dead = true;

    // Peluru berhenti (hilang) kalau nabrak dinding/rintangan
    if (tileMap && tileMap.isWallAtWorld(this.x, this.y)) {
      this.dead = true;
    }
  }

  draw(ctx, camera) {
    const screen = camera.worldToScreen(this.x, this.y);
    const sprite = assetLoader.get('enemyBullet');

    ctx.save();
    ctx.translate(screen.x, screen.y);
    ctx.rotate(this.angle);

    if (sprite) {
      const size = this.radius * 2.5;
      ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
    } else {
      // Bentuk diamond, sengaja beda dari peluru player yang bulat
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(this.radius, 0);
      ctx.lineTo(0, this.radius);
      ctx.lineTo(-this.radius, 0);
      ctx.lineTo(0, -this.radius);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}
