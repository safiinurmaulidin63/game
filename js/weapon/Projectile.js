// Projectile.js
// Projectile player configurable + VFX procedural.

import { assetLoader } from '../core/AssetLoader.js';

export class Projectile {
  constructor(x, y, angle, options = {}) {
    this.angle = angle;

    const spawnOffset = options.spawnOffset ?? 14;

    this.x = x + Math.cos(angle) * spawnOffset;
    this.y = y + Math.sin(angle) * spawnOffset;

    this.speed = options.speed ?? 480;
    this.radius = options.radius ?? 6;
    this.lifeTime = options.lifeTime ?? 1.5;
    this.damage = options.damage ?? 1;

    this.color = options.color ?? '#ef4444';
    this.style = options.style ?? 'default';

    this.coreColor = options.coreColor ?? '#e0f2fe';
    this.glowColor = options.glowColor ?? '#38bdf8';
    this.trailColor = options.trailColor ?? this.glowColor;

    this.piercing = options.piercing ?? false;
    this.stunDuration = options.stunDuration ?? 0;

    this.age = 0;
    this.dead = false;

    this.hitTargets = new Set();
    this.trail = [];
  }

  hasHit(target) {
    return this.hitTargets.has(target);
  }

  registerHit(target) {
    this.hitTargets.add(target);
  }

  update(dt, tileMap) {
    if (this.style === 'magic' || this.style === 'arcane') {
      this.trail.unshift({ x: this.x, y: this.y });
      if (this.trail.length > 6) this.trail.pop();
    }

    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;

    this.age += dt;

    if (this.age >= this.lifeTime) {
      this.dead = true;
    }

    if (tileMap && tileMap.isWallAtWorld(this.x, this.y)) {
      this.dead = true;
    }
  }

  draw(ctx, camera) {
    if (this.style === 'magic' || this.style === 'arcane') {
      this._drawMagicOrb(ctx, camera);
      return;
    }

    const screen = camera.worldToScreen(this.x, this.y);
    const sprite = assetLoader.get('playerBullet');

    if (sprite) {
      ctx.save();
      ctx.translate(screen.x, screen.y);
      ctx.rotate(this.angle);

      const size = this.radius * 2.5;

      ctx.drawImage(
        sprite,
        -size / 2,
        -size / 2,
        size,
        size
      );

      ctx.restore();
      return;
    }

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawMagicOrb(ctx, camera) {
    ctx.save();

    for (let i = this.trail.length - 1; i >= 0; i--) {
      const item = this.trail[i];
      const screen = camera.worldToScreen(item.x, item.y);
      const ratio = 1 - i / Math.max(1, this.trail.length);

      ctx.globalAlpha = ratio * 0.22;
      ctx.fillStyle = this.trailColor;

      ctx.beginPath();
      ctx.arc(
        screen.x,
        screen.y,
        Math.max(2, this.radius * ratio * 0.9),
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    const screen = camera.worldToScreen(this.x, this.y);

    ctx.globalAlpha = 1;
    ctx.shadowBlur = this.style === 'arcane' ? 20 : 13;
    ctx.shadowColor = this.glowColor;

    ctx.fillStyle = this.glowColor;
    ctx.globalAlpha = this.style === 'arcane' ? 0.72 : 0.58;
    ctx.beginPath();
    ctx.arc(
      screen.x,
      screen.y,
      this.radius * 1.45,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.fillStyle = this.coreColor;
    ctx.beginPath();
    ctx.arc(
      screen.x,
      screen.y,
      this.radius * 0.7,
      0,
      Math.PI * 2
    );
    ctx.fill();

    if (this.style === 'arcane') {
      ctx.fillStyle = '#a78bfa';
      ctx.beginPath();
      ctx.arc(
        screen.x,
        screen.y,
        this.radius * 0.28,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    ctx.restore();
  }
}
