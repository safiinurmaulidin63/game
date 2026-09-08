// MeleeHit.js
// Hitbox melee + VFX procedural untuk basic dan skill.

export class MeleeHit {
  constructor(x, y, angle, options = {}) {
    this.angle = angle;

    this.range = options.range ?? 34;
    this.radius = options.radius ?? 20;
    this.damage = options.damage ?? 1;
    this.type = options.type ?? 'melee';

    this.stunDuration = options.stunDuration ?? 0;
    this.empowered = options.empowered ?? false;

    this.piercing = options.piercing ?? true;
    this.hitTargets = new Set();

    // Optional capsule/segment collision.
    // Fighter memakai ini agar seluruh jalur pukulan dari tubuh sampai
    // ujung hitbox aktif, bukan cuma satu lingkaran di ujung.
    this.segmentCollision =
      options.segmentCollision ?? false;

    this.segmentStartX = x;
    this.segmentStartY = y;

    this.x = x + Math.cos(angle) * this.range;
    this.y = y + Math.sin(angle) * this.range;

    this.lifeTime = options.lifeTime ?? 0.12;
    this.age = 0;
    this.dead = false;
  }

  hasHit(target) {
    return this.hitTargets.has(target);
  }

  registerHit(target) {
    this.hitTargets.add(target);
  }

  update(dt) {
    this.age += dt;
    if (this.age >= this.lifeTime) this.dead = true;
  }

  draw(ctx, camera) {
    const screen = camera.worldToScreen(this.x, this.y);
    const progress = Math.min(this.age / this.lifeTime, 1);
    const alpha = 1 - progress;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(screen.x, screen.y);
    ctx.rotate(this.angle);

    if (this.type === 'fist') this._drawFist(ctx, progress);
    if (this.type === 'sword') this._drawSword(ctx, progress);
    if (this.type === 'staff') this._drawStaff(ctx, progress);
    if (this.type === 'dashPunch') this._drawDashPunch(ctx, progress);
    if (this.type === 'crescent') this._drawCrescent(ctx, progress);
    if (this.type === 'shockwave') this._drawShockwave(ctx, progress);

    ctx.restore();
  }

  _drawFist(ctx, progress) {
    const heavy =
      this.empowered;

    ctx.shadowBlur =
      heavy
        ? 22
        : 10;

    ctx.shadowColor =
      heavy
        ? '#fb923c'
        : '#f8fafc';

    ctx.strokeStyle =
      heavy
        ? '#fef3c7'
        : '#f8fafc';

    ctx.lineWidth =
      heavy
        ? 8
        : 5;

    const r =
      this.radius *
      (
        heavy
          ? 0.92 + progress * 0.34
          : 0.75 + progress * 0.2
      );

    ctx.beginPath();
    ctx.arc(
      0,
      0,
      r,
      -1.08,
      1.08
    );
    ctx.stroke();

    // Heavy Jab punya secondary orange arc.
    if (heavy) {
      ctx.globalAlpha *= 0.72;
      ctx.strokeStyle = '#fb923c';
      ctx.lineWidth = 5;

      ctx.beginPath();
      ctx.arc(
        -8,
        0,
        Math.max(8, r - 9),
        -1.0,
        1.0
      );
      ctx.stroke();
    }

    ctx.globalAlpha *= 0.55;

    ctx.strokeStyle =
      heavy
        ? '#fbbf24'
        : '#f8fafc';

    ctx.lineWidth =
      heavy
        ? 4
        : 5;

    ctx.beginPath();

    ctx.moveTo(
      -this.radius *
      (
        heavy
          ? 1.55
          : 0.9
      ),
      -7
    );

    ctx.lineTo(
      this.radius *
      (
        heavy
          ? 0.65
          : 0.45
      ),
      -7
    );

    ctx.stroke();
  }

  _drawSword(ctx, progress) {
    const r = this.radius + 11 + progress * 7;

    ctx.shadowBlur = 14;
    ctx.shadowColor = '#fde68a';
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 7;

    ctx.beginPath();
    ctx.arc(-11, 0, r, -1.08, 1.08);
    ctx.stroke();

    ctx.globalAlpha *= 0.5;
    ctx.strokeStyle = '#fff7cc';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(-11, 0, r - 7, -1.0, 1.0);
    ctx.stroke();
  }

  _drawStaff(ctx, progress) {
    ctx.shadowBlur = this.empowered ? 18 : 9;
    ctx.shadowColor = this.empowered ? '#67e8f9' : '#86efac';

    ctx.strokeStyle = this.empowered ? '#67e8f9' : '#86efac';
    ctx.lineWidth = this.empowered ? 7 : 5;

    const extend = this.radius * (0.8 + progress * 0.25);

    ctx.beginPath();
    ctx.moveTo(-extend, 0);
    ctx.lineTo(extend, 0);
    ctx.stroke();

    if (this.empowered) {
      ctx.strokeStyle = '#cffafe';
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.arc(extend, 0, 8 + progress * 9, 0, Math.PI * 2);
      ctx.stroke();

      for (let i = 0; i < 3; i++) {
        const a = i * (Math.PI * 2 / 3) + progress * 2;
        ctx.beginPath();
        ctx.moveTo(
          extend + Math.cos(a) * 9,
          Math.sin(a) * 9
        );
        ctx.lineTo(
          extend + Math.cos(a) * 16,
          Math.sin(a) * 16
        );
        ctx.stroke();
      }
    }
  }

  _drawDashPunch(ctx, progress) {
    const r =
      this.radius *
      (0.68 + progress * 0.72);

    ctx.shadowBlur = 30;
    ctx.shadowColor = '#fb923c';

    // Glow luar.
    ctx.globalAlpha *= 0.28;
    ctx.strokeStyle = '#fb923c';
    ctx.lineWidth = 22;

    ctx.beginPath();
    ctx.arc(0, 0, r, -1.28, 1.28);
    ctx.stroke();

    // Main punch arc.
    ctx.globalAlpha /= 0.28;
    ctx.globalAlpha *= 0.92;
    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = 14;

    ctx.beginPath();
    ctx.arc(0, 0, r, -1.2, 1.2);
    ctx.stroke();

    // Orange inner arc.
    ctx.globalAlpha *= 0.76;
    ctx.strokeStyle = '#fb923c';
    ctx.lineWidth = 8;

    ctx.beginPath();
    ctx.arc(0, 0, Math.max(8, r - 11), -1.08, 1.08);
    ctx.stroke();

    // Thick speed lines.
    ctx.globalAlpha *= 0.72;

    for (let i = -2; i <= 2; i++) {
      ctx.strokeStyle =
        i % 2 === 0
          ? '#fef3c7'
          : '#fb923c';

      ctx.lineWidth =
        i === 0
          ? 7
          : 4;

      ctx.beginPath();

      ctx.moveTo(
        -68,
        i * 11
      );

      ctx.lineTo(
        14,
        i * 7
      );

      ctx.stroke();
    }
  }

  _drawCrescent(ctx, progress) {
    const r =
      this.radius *
      (0.50 + progress * 0.56);

    ctx.rotate(progress * 1.05);

    ctx.shadowBlur = 34;
    ctx.shadowColor = '#facc15';

    // Outer glow ring.
    ctx.globalAlpha *= 0.24;
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 24;

    ctx.beginPath();
    ctx.arc(0, 0, r * 0.88, 0, Math.PI * 2);
    ctx.stroke();

    // 4 big crescent arcs.
    ctx.globalAlpha /= 0.24;

    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.rotate(i * Math.PI / 2);

      ctx.globalAlpha *=
        i % 2 === 0
          ? 0.96
          : 0.78;

      ctx.strokeStyle =
        i % 2 === 0
          ? '#fff7cc'
          : '#facc15';

      ctx.lineWidth =
        i % 2 === 0
          ? 15
          : 11;

      ctx.beginPath();

      ctx.arc(
        0,
        0,
        r *
        (
          i % 2 === 0
            ? 0.90
            : 0.73
        ),
        -0.88,
        0.88
      );

      ctx.stroke();
      ctx.restore();
    }

    // Core ring.
    ctx.globalAlpha *= 0.56;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;

    ctx.beginPath();

    ctx.arc(
      0,
      0,
      Math.max(
        12,
        r * 0.42
      ),
      0,
      Math.PI * 2
    );

    ctx.stroke();
  }

  _drawShockwave(ctx, progress) {
    const r =
      12 +
      this.radius *
      (
        1 -
        Math.pow(
          1 - progress,
          2
        )
      );

    ctx.shadowBlur = 34;
    ctx.shadowColor = '#22d3ee';

    // Outer energy glow.
    ctx.globalAlpha *= 0.22;
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 26;

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha /= 0.22;

    // Triple strong ring.
    const rings = [
      [1.00, 13, '#cffafe'],
      [0.76, 9, '#22d3ee'],
      [0.52, 6, '#67e8f9'],
    ];

    for (
      const [
        ratio,
        width,
        color
      ] of rings
    ) {
      ctx.globalAlpha *= 0.88;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;

      ctx.beginPath();

      ctx.arc(
        0,
        0,
        r * ratio,
        0,
        Math.PI * 2
      );

      ctx.stroke();

      ctx.globalAlpha /= 0.88;
    }

    // 12 strong energy spokes.
    for (let i = 0; i < 12; i++) {
      const a =
        i * Math.PI / 6;

      ctx.globalAlpha *=
        i % 2 === 0
          ? 0.78
          : 0.52;

      ctx.strokeStyle =
        i % 3 === 0
          ? '#ffffff'
          : '#67e8f9';

      ctx.lineWidth =
        i % 2 === 0
          ? 6
          : 4;

      ctx.beginPath();

      ctx.moveTo(
        Math.cos(a) * r * 0.34,
        Math.sin(a) * r * 0.34
      );

      ctx.lineTo(
        Math.cos(a + 0.05) * r * 0.66,
        Math.sin(a + 0.05) * r * 0.66
      );

      ctx.lineTo(
        Math.cos(a) * r * 1.02,
        Math.sin(a) * r * 1.02
      );

      ctx.stroke();

      ctx.globalAlpha /=
        i % 2 === 0
          ? 0.78
          : 0.52;
    }
  }
}
