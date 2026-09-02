// MeleeHit.js
// Hitbox serangan jarak dekat yang hidup sangat singkat.
// Dipakai Fighter, Swordsman, dan Monk.
// EnemyManager lama tetap bisa memprosesnya karena object ini punya
// x, y, radius, damage, dead, update(), dan draw() seperti projectile.

export class MeleeHit {
  constructor(x, y, angle, options = {}) {
    this.angle = angle;

    this.range = options.range ?? 34;
    this.radius = options.radius ?? 20;
    this.damage = options.damage ?? 1;
    this.type = options.type ?? 'melee';

    this.x = x + Math.cos(angle) * this.range;
    this.y = y + Math.sin(angle) * this.range;

    this.lifeTime = options.lifeTime ?? 0.11;
    this.age = 0;
    this.dead = false;
  }

  update(dt) {
    this.age += dt;

    if (this.age >= this.lifeTime) {
      this.dead = true;
    }
  }

  draw(ctx, camera) {
    const screen = camera.worldToScreen(this.x, this.y);

    const progress = Math.min(this.age / this.lifeTime, 1);
    const alpha = 1 - progress;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(screen.x, screen.y);
    ctx.rotate(this.angle);

    // Efek visual sederhana, non-grafis.
    if (this.type === 'fist') {
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.72, 0, Math.PI * 2);
      ctx.stroke();
    } else if (this.type === 'sword') {
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(-8, 0, this.radius + 6, -0.85, 0.85);
      ctx.stroke();
    } else if (this.type === 'staff') {
      ctx.strokeStyle = '#86efac';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-this.radius, 0);
      ctx.lineTo(this.radius, 0);
      ctx.stroke();
    }

    ctx.restore();
  }
}
