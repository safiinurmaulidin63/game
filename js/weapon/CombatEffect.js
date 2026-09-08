// CombatEffect.js
// Skill VFX v2 Heavy.
// Mage tetap seperti v1.
// Fighter / Swordsman / Monk dibuat jauh lebih tebal dan "wah".

export class CombatEffect {
  constructor(type, options = {}) {
    this.type = type;

    this.x = options.x ?? 0;
    this.y = options.y ?? 0;

    this.fromX = options.fromX ?? this.x;
    this.fromY = options.fromY ?? this.y;
    this.toX = options.toX ?? this.x;
    this.toY = options.toY ?? this.y;

    this.angle = options.angle ?? 0;
    this.radius = options.radius ?? 48;

    this.color = options.color ?? '#67e8f9';
    this.color2 = options.color2 ?? '#c4b5fd';
    this.color3 = options.color3 ?? '#ffffff';

    this.duration = options.duration ?? 0.3;
    this.age = 0;
    this.dead = false;
  }

  update(dt) {
    this.age += dt;

    if (this.age >= this.duration) {
      this.dead = true;
    }
  }

  draw(ctx, camera) {
    const progress =
      Math.min(this.age / this.duration, 1);

    const alpha =
      1 - progress;

    if (this.type === 'castPulse') {
      this._drawCastPulse(
        ctx,
        camera,
        progress,
        alpha
      );
      return;
    }

    if (this.type === 'radialBurst') {
      this._drawRadialBurst(
        ctx,
        camera,
        progress,
        alpha
      );
      return;
    }

    if (this.type === 'dashTrail') {
      this._drawDashTrail(
        ctx,
        camera,
        progress,
        alpha
      );
      return;
    }

    if (this.type === 'impactPulse') {
      this._drawImpactPulse(
        ctx,
        camera,
        progress,
        alpha
      );
      return;
    }

    if (this.type === 'heavyImpact') {
      this._drawHeavyImpact(
        ctx,
        camera,
        progress,
        alpha
      );
      return;
    }

    if (this.type === 'bladeStorm') {
      this._drawBladeStorm(
        ctx,
        camera,
        progress,
        alpha
      );
      return;
    }

    if (this.type === 'shockNova') {
      this._drawShockNova(
        ctx,
        camera,
        progress,
        alpha
      );
    }
  }

  // =====================================================
  // MAGE / GENERIC — dipertahankan dari v1
  // =====================================================

  _drawCastPulse(
    ctx,
    camera,
    progress,
    alpha
  ) {
    const screen =
      camera.worldToScreen(
        this.x,
        this.y
      );

    const r =
      10 +
      this.radius * progress;

    ctx.save();

    ctx.globalAlpha = alpha;
    ctx.shadowBlur = 18;
    ctx.shadowColor = this.color;

    ctx.strokeStyle = this.color;
    ctx.lineWidth = 5;

    ctx.beginPath();
    ctx.arc(
      screen.x,
      screen.y,
      r,
      0,
      Math.PI * 2
    );
    ctx.stroke();

    ctx.globalAlpha =
      alpha * 0.55;

    ctx.strokeStyle = this.color2;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(
      screen.x,
      screen.y,
      Math.max(4, r - 9),
      0,
      Math.PI * 2
    );
    ctx.stroke();

    ctx.restore();
  }

  _drawRadialBurst(
    ctx,
    camera,
    progress,
    alpha
  ) {
    const screen =
      camera.worldToScreen(
        this.x,
        this.y
      );

    const inner =
      12 +
      this.radius *
      progress *
      0.35;

    const outer =
      24 +
      this.radius *
      progress;

    ctx.save();

    ctx.translate(
      screen.x,
      screen.y
    );

    ctx.globalAlpha = alpha;
    ctx.shadowBlur = 16;
    ctx.shadowColor = this.color;

    for (let i = 0; i < 8; i++) {
      const angle =
        this.angle +
        (Math.PI * 2 * i) / 8;

      ctx.strokeStyle =
        i % 2 === 0
          ? this.color
          : this.color2;

      ctx.lineWidth = 4;

      ctx.beginPath();

      ctx.moveTo(
        Math.cos(angle) * inner,
        Math.sin(angle) * inner
      );

      ctx.lineTo(
        Math.cos(angle) * outer,
        Math.sin(angle) * outer
      );

      ctx.stroke();
    }

    ctx.restore();
  }

  _drawDashTrail(
    ctx,
    camera,
    progress,
    alpha
  ) {
    const from =
      camera.worldToScreen(
        this.fromX,
        this.fromY
      );

    const to =
      camera.worldToScreen(
        this.toX,
        this.toY
      );

    ctx.save();

    ctx.lineCap = 'round';
    ctx.shadowBlur = 26;
    ctx.shadowColor = this.color;

    // Layer 1: glow besar.
    ctx.globalAlpha =
      alpha * 0.30;

    ctx.strokeStyle =
      this.color;

    ctx.lineWidth =
      34 * (1 - progress) + 10;

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    // Layer 2: body trail.
    ctx.globalAlpha =
      alpha * 0.72;

    ctx.strokeStyle =
      this.color;

    ctx.lineWidth =
      22 * (1 - progress) + 7;

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    // Layer 3: core putih.
    ctx.globalAlpha =
      alpha * 0.92;

    ctx.strokeStyle =
      this.color2;

    ctx.lineWidth = 5;

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    // 4 speed streak.
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len =
      Math.max(
        1,
        Math.hypot(dx, dy)
      );

    const nx = -dy / len;
    const ny = dx / len;

    ctx.globalAlpha =
      alpha * 0.52;

    ctx.lineWidth = 3;

    for (let i = -2; i <= 2; i++) {
      if (i === 0) continue;

      const offset = i * 8;

      ctx.beginPath();

      ctx.moveTo(
        from.x +
        nx * offset +
        dx * 0.15,
        from.y +
        ny * offset +
        dy * 0.15
      );

      ctx.lineTo(
        to.x +
        nx * offset -
        dx * 0.08,
        to.y +
        ny * offset -
        dy * 0.08
      );

      ctx.stroke();
    }

    ctx.restore();
  }

  _drawImpactPulse(
    ctx,
    camera,
    progress,
    alpha
  ) {
    const screen =
      camera.worldToScreen(
        this.x,
        this.y
      );

    const r =
      8 +
      this.radius * progress;

    ctx.save();

    ctx.translate(
      screen.x,
      screen.y
    );

    ctx.globalAlpha = alpha;
    ctx.shadowBlur = 18;
    ctx.shadowColor = this.color;

    ctx.strokeStyle = this.color;
    ctx.lineWidth = 6;

    ctx.beginPath();
    ctx.arc(
      0,
      0,
      r,
      0,
      Math.PI * 2
    );
    ctx.stroke();

    for (let i = 0; i < 4; i++) {
      const angle =
        this.angle +
        Math.PI / 4 +
        i * Math.PI / 2;

      const start =
        r * 0.55;

      const end =
        r + 13;

      ctx.strokeStyle =
        this.color2;

      ctx.lineWidth = 4;

      ctx.beginPath();

      ctx.moveTo(
        Math.cos(angle) * start,
        Math.sin(angle) * start
      );

      ctx.lineTo(
        Math.cos(angle) * end,
        Math.sin(angle) * end
      );

      ctx.stroke();
    }

    ctx.restore();
  }

  // =====================================================
  // FIGHTER — HEAVY IMPACT
  // =====================================================

  _drawHeavyImpact(
    ctx,
    camera,
    progress,
    alpha
  ) {
    const screen =
      camera.worldToScreen(
        this.x,
        this.y
      );

    const ease =
      1 -
      Math.pow(
        1 - progress,
        3
      );

    const outerR =
      14 +
      this.radius * ease;

    ctx.save();

    ctx.translate(
      screen.x,
      screen.y
    );

    ctx.shadowBlur = 30;
    ctx.shadowColor = this.color;

    // Big flash disc.
    ctx.globalAlpha =
      alpha * 0.22;

    ctx.fillStyle = this.color;

    ctx.beginPath();

    ctx.arc(
      0,
      0,
      outerR * 0.72,
      0,
      Math.PI * 2
    );

    ctx.fill();

    // Triple impact rings.
    const rings = [
      [1.00, 11, this.color],
      [0.72, 7, this.color2],
      [0.45, 4, this.color3],
    ];

    for (
      const [
        ratio,
        width,
        color
      ] of rings
    ) {
      ctx.globalAlpha =
        alpha *
        (0.9 - ratio * 0.18);

      ctx.strokeStyle = color;
      ctx.lineWidth = width;

      ctx.beginPath();

      ctx.arc(
        0,
        0,
        outerR * ratio,
        0,
        Math.PI * 2
      );

      ctx.stroke();
    }

    // 12 impact rays.
    for (let i = 0; i < 12; i++) {
      const a =
        this.angle +
        (Math.PI * 2 * i) / 12;

      const inner =
        outerR * 0.28;

      const length =
        outerR *
        (
          i % 2 === 0
            ? 1.25
            : 0.95
        );

      ctx.globalAlpha =
        alpha *
        (
          i % 2 === 0
            ? 0.95
            : 0.62
        );

      ctx.strokeStyle =
        i % 3 === 0
          ? this.color3
          : this.color2;

      ctx.lineWidth =
        i % 2 === 0
          ? 6
          : 4;

      ctx.beginPath();

      ctx.moveTo(
        Math.cos(a) * inner,
        Math.sin(a) * inner
      );

      ctx.lineTo(
        Math.cos(a) * length,
        Math.sin(a) * length
      );

      ctx.stroke();
    }

    // Chunky debris blocks.
    for (let i = 0; i < 8; i++) {
      const a =
        this.angle +
        0.3 +
        (Math.PI * 2 * i) / 8;

      const dist =
        outerR *
        (0.55 + (i % 3) * 0.16);

      const size =
        4 + (i % 3) * 2;

      ctx.globalAlpha =
        alpha * 0.8;

      ctx.fillStyle =
        i % 2 === 0
          ? this.color
          : this.color2;

      ctx.fillRect(
        Math.cos(a) * dist -
        size / 2,
        Math.sin(a) * dist -
        size / 2,
        size,
        size
      );
    }

    // Core white flash.
    ctx.globalAlpha =
      alpha * 0.88;

    ctx.fillStyle = this.color3;

    ctx.beginPath();

    ctx.arc(
      0,
      0,
      Math.max(
        2,
        11 * (1 - progress)
      ),
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.restore();
  }

  // =====================================================
  // SWORDSMAN — BLADE STORM
  // =====================================================

  _drawBladeStorm(
    ctx,
    camera,
    progress,
    alpha
  ) {
    const screen =
      camera.worldToScreen(
        this.x,
        this.y
      );

    const ease =
      Math.min(
        1,
        progress * 1.25
      );

    const r =
      28 +
      this.radius * ease;

    ctx.save();

    ctx.translate(
      screen.x,
      screen.y
    );

    ctx.rotate(
      this.angle +
      progress * 1.2
    );

    ctx.shadowBlur = 34;
    ctx.shadowColor = this.color;

    // Soft gold disc.
    ctx.globalAlpha =
      alpha * 0.12;

    ctx.fillStyle = this.color;

    ctx.beginPath();

    ctx.arc(
      0,
      0,
      r * 0.82,
      0,
      Math.PI * 2
    );

    ctx.fill();

    // 6 thick slash arcs.
    for (let i = 0; i < 6; i++) {
      const rot =
        i * Math.PI / 3;

      ctx.save();

      ctx.rotate(rot);

      ctx.globalAlpha =
        alpha *
        (
          i % 2 === 0
            ? 0.96
            : 0.72
        );

      ctx.strokeStyle =
        i % 3 === 0
          ? this.color3
          : (
            i % 2 === 0
              ? this.color2
              : this.color
          );

      ctx.lineWidth =
        i % 2 === 0
          ? 13
          : 8;

      ctx.lineCap = 'round';

      ctx.beginPath();

      ctx.arc(
        0,
        0,
        r *
        (
          0.70 +
          (i % 3) * 0.11
        ),
        -0.82,
        0.82
      );

      ctx.stroke();

      ctx.restore();
    }

    // Concentric sword rings.
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha =
        alpha *
        (
          0.55 -
          i * 0.12
        );

      ctx.strokeStyle =
        i === 0
          ? this.color3
          : this.color2;

      ctx.lineWidth =
        5 - i;

      ctx.beginPath();

      ctx.arc(
        0,
        0,
        r *
        (
          0.35 +
          i * 0.18
        ),
        0,
        Math.PI * 2
      );

      ctx.stroke();
    }

    // 16 spark streaks.
    for (let i = 0; i < 16; i++) {
      const a =
        (Math.PI * 2 * i) / 16 +
        progress * 0.9;

      const inner =
        r * 0.62;

      const outer =
        r *
        (
          0.92 +
          (i % 4) * 0.09
        );

      ctx.globalAlpha =
        alpha *
        (
          i % 2 === 0
            ? 0.72
            : 0.42
        );

      ctx.strokeStyle =
        i % 3 === 0
          ? this.color3
          : this.color;

      ctx.lineWidth =
        i % 2 === 0
          ? 4
          : 2;

      ctx.beginPath();

      ctx.moveTo(
        Math.cos(a) * inner,
        Math.sin(a) * inner
      );

      ctx.lineTo(
        Math.cos(a) * outer,
        Math.sin(a) * outer
      );

      ctx.stroke();
    }

    ctx.restore();
  }

  // =====================================================
  // MONK — SHOCK NOVA
  // =====================================================

  _drawShockNova(
    ctx,
    camera,
    progress,
    alpha
  ) {
    const screen =
      camera.worldToScreen(
        this.x,
        this.y
      );

    const ease =
      1 -
      Math.pow(
        1 - progress,
        2.4
      );

    const r =
      16 +
      this.radius * ease;

    ctx.save();

    ctx.translate(
      screen.x,
      screen.y
    );

    ctx.shadowBlur = 32;
    ctx.shadowColor = this.color;

    // Cyan energy field.
    ctx.globalAlpha =
      alpha * 0.14;

    ctx.fillStyle = this.color;

    ctx.beginPath();

    ctx.arc(
      0,
      0,
      r * 0.82,
      0,
      Math.PI * 2
    );

    ctx.fill();

    // 4 rings dengan ketebalan besar.
    const ringRatios = [
      1.0,
      0.78,
      0.56,
      0.34,
    ];

    for (
      let i = 0;
      i < ringRatios.length;
      i++
    ) {
      ctx.globalAlpha =
        alpha *
        (
          0.96 -
          i * 0.14
        );

      ctx.strokeStyle =
        i === 0
          ? this.color3
          : (
            i % 2 === 0
              ? this.color2
              : this.color
          );

      ctx.lineWidth =
        11 - i * 2;

      ctx.beginPath();

      ctx.arc(
        0,
        0,
        r * ringRatios[i],
        0,
        Math.PI * 2
      );

      ctx.stroke();
    }

    // 12 lightning spokes berbentuk zig-zag.
    for (let i = 0; i < 12; i++) {
      const a =
        (Math.PI * 2 * i) / 12;

      const a2 =
        a + 0.06 *
        (
          i % 2 === 0
            ? 1
            : -1
        );

      const p1 =
        r * 0.24;

      const p2 =
        r * 0.55;

      const p3 =
        r *
        (
          0.94 +
          (i % 3) * 0.08
        );

      ctx.globalAlpha =
        alpha *
        (
          i % 2 === 0
            ? 0.86
            : 0.58
        );

      ctx.strokeStyle =
        i % 3 === 0
          ? this.color3
          : this.color2;

      ctx.lineWidth =
        i % 2 === 0
          ? 5
          : 3;

      ctx.beginPath();

      ctx.moveTo(
        Math.cos(a) * p1,
        Math.sin(a) * p1
      );

      ctx.lineTo(
        Math.cos(a2) * p2,
        Math.sin(a2) * p2
      );

      ctx.lineTo(
        Math.cos(a) * p3,
        Math.sin(a) * p3
      );

      ctx.stroke();
    }

    // 10 energy particles.
    for (let i = 0; i < 10; i++) {
      const a =
        0.25 +
        (Math.PI * 2 * i) / 10 +
        progress * 0.4;

      const dist =
        r *
        (
          0.48 +
          (i % 4) * 0.14
        );

      const size =
        3 + (i % 3) * 2;

      ctx.globalAlpha =
        alpha * 0.86;

      ctx.fillStyle =
        i % 2 === 0
          ? this.color3
          : this.color2;

      ctx.fillRect(
        Math.cos(a) * dist -
        size / 2,
        Math.sin(a) * dist -
        size / 2,
        size,
        size
      );
    }

    // Central energy flash.
    ctx.globalAlpha =
      alpha * 0.9;

    ctx.fillStyle = this.color3;

    ctx.beginPath();

    ctx.arc(
      0,
      0,
      Math.max(
        3,
        13 * (1 - progress)
      ),
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.restore();
  }
}
