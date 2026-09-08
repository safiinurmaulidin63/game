// HealPickup.js
// Item world-drop procedural, jadi tidak membutuhkan sprite baru.

export class HealPickup {
  constructor(
    x,
    y,
    type = 'heal'
  ) {
    this.x = x;
    this.y = y;

    this.type = type;

    this.radius =
      type === 'potion'
        ? 18
        : 15;

    this.age = 0;
    this.lifeTime = 18;
    this.dead = false;

    this.bobOffset =
      Math.random() *
      Math.PI *
      2;
  }

  update(dt) {
    this.age += dt;

    if (
      this.age >=
      this.lifeTime
    ) {
      this.dead = true;
    }
  }

  draw(ctx, camera) {
    const screen =
      camera.worldToScreen(
        this.x,
        this.y
      );

    const bob =
      Math.sin(
        this.age * 4 +
        this.bobOffset
      ) *
      4;

    const y =
      screen.y +
      bob;

    const fadeStart = 14;

    let alpha = 1;

    if (
      this.age > fadeStart
    ) {
      alpha =
        Math.max(
          0,
          1 -
          (
            this.age -
            fadeStart
          ) /
          (
            this.lifeTime -
            fadeStart
          )
        );
    }

    ctx.save();

    ctx.globalAlpha = alpha;

    if (
      this.type === 'potion'
    ) {
      // Shadow.
      ctx.globalAlpha =
        alpha * 0.30;

      ctx.fillStyle = '#000';

      ctx.beginPath();

      ctx.ellipse(
        screen.x,
        screen.y + 18,
        15,
        6,
        0,
        0,
        Math.PI * 2
      );

      ctx.fill();

      ctx.globalAlpha = alpha;

      // Potion glow.
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#fb7185';

      // Bottle neck.
      ctx.fillStyle = '#f8fafc';

      ctx.fillRect(
        screen.x - 6,
        y - 20,
        12,
        8
      );

      ctx.fillStyle = '#94a3b8';

      ctx.fillRect(
        screen.x - 8,
        y - 23,
        16,
        5
      );

      // Bottle body.
      ctx.fillStyle = '#be123c';

      ctx.beginPath();

      ctx.roundRect(
        screen.x - 14,
        y - 12,
        28,
        29,
        8
      );

      ctx.fill();

      ctx.strokeStyle = '#fecdd3';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Liquid highlight.
      ctx.fillStyle = '#fb7185';

      ctx.fillRect(
        screen.x - 8,
        y + 1,
        16,
        10
      );

      // Cross.
      ctx.fillStyle = '#ffffff';

      ctx.fillRect(
        screen.x - 2,
        y - 7,
        4,
        14
      );

      ctx.fillRect(
        screen.x - 7,
        y - 2,
        14,
        4
      );
    } else {
      // HEAL SHARD / ORB.
      ctx.shadowBlur = 22;
      ctx.shadowColor = '#4ade80';

      ctx.fillStyle = '#22c55e';

      ctx.beginPath();

      ctx.arc(
        screen.x,
        y,
        14,
        0,
        Math.PI * 2
      );

      ctx.fill();

      ctx.strokeStyle = '#bbf7d0';
      ctx.lineWidth = 3;
      ctx.stroke();

      // White medical cross.
      ctx.fillStyle = '#ffffff';

      ctx.fillRect(
        screen.x - 3,
        y - 9,
        6,
        18
      );

      ctx.fillRect(
        screen.x - 9,
        y - 3,
        18,
        6
      );
    }

    ctx.restore();
  }
}
