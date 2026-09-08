// BossProjectile.js
// Projectile khusus Aster.
// Compatible dengan EnemyManager.projectiles:
// - update(dt, tileMap)
// - draw(ctx, camera)
// - x/y/radius/damage/dead

export class BossProjectile {
  constructor(
    x,
    y,
    angle,
    options = {}
  ) {
    const spawnOffset =
      options.spawnOffset ?? 22;

    this.x =
      x +
      Math.cos(angle) *
      spawnOffset;

    this.y =
      y +
      Math.sin(angle) *
      spawnOffset;

    this.angle = angle;

    this.speed =
      options.speed ?? 360;

    this.damage =
      options.damage ?? 1;

    this.radius =
      options.radius ?? 8;

    this.lifeTime =
      options.lifeTime ?? 2.4;

    this.style =
      options.style ?? 'rune';

    this.color =
      options.color ?? '#a78bfa';

    this.coreColor =
      options.coreColor ?? '#f5f3ff';

    this.passWalls =
      options.passWalls ?? false;

    this.age = 0;
    this.dead = false;

    this.trail = [];
  }

  update(dt, tileMap) {
    this.trail.unshift({
      x: this.x,
      y: this.y,
    });

    if (this.trail.length > 5) {
      this.trail.pop();
    }

    this.x +=
      Math.cos(this.angle) *
      this.speed *
      dt;

    this.y +=
      Math.sin(this.angle) *
      this.speed *
      dt;

    this.age += dt;

    if (
      this.age >=
      this.lifeTime
    ) {
      this.dead = true;
    }

    if (
      !this.passWalls &&
      tileMap &&
      tileMap.isWallAtWorld(
        this.x,
        this.y
      )
    ) {
      this.dead = true;
    }
  }

  draw(ctx, camera) {
    ctx.save();

    // Short glowing trail.
    for (
      let i =
        this.trail.length - 1;
      i >= 0;
      i--
    ) {
      const point =
        this.trail[i];

      const screen =
        camera.worldToScreen(
          point.x,
          point.y
        );

      const ratio =
        1 -
        i /
        Math.max(
          1,
          this.trail.length
        );

      ctx.globalAlpha =
        ratio * 0.18;

      ctx.fillStyle =
        this.color;

      ctx.beginPath();

      ctx.arc(
        screen.x,
        screen.y,
        Math.max(
          2,
          this.radius *
          ratio *
          0.8
        ),
        0,
        Math.PI * 2
      );

      ctx.fill();
    }

    const screen =
      camera.worldToScreen(
        this.x,
        this.y
      );

    ctx.globalAlpha = 1;

    ctx.translate(
      screen.x,
      screen.y
    );

    ctx.rotate(
      this.angle
    );

    ctx.shadowBlur =
      this.style === 'shock'
        ? 20
        : 15;

    ctx.shadowColor =
      this.color;

    if (this.style === 'shock') {
      // Chunky shockwave shard.
      ctx.fillStyle =
        this.color;

      ctx.beginPath();

      ctx.moveTo(
        this.radius * 1.5,
        0
      );

      ctx.lineTo(
        0,
        this.radius * 0.9
      );

      ctx.lineTo(
        -this.radius * 1.15,
        0
      );

      ctx.lineTo(
        0,
        -this.radius * 0.9
      );

      ctx.closePath();
      ctx.fill();

      ctx.globalAlpha = 0.95;
      ctx.strokeStyle =
        this.coreColor;

      ctx.lineWidth = 3;

      ctx.stroke();
    } else {
      // Rune / corruption bolt.
      ctx.fillStyle =
        this.color;

      ctx.beginPath();

      ctx.moveTo(
        this.radius * 1.45,
        0
      );

      ctx.lineTo(
        0,
        this.radius
      );

      ctx.lineTo(
        -this.radius * 1.15,
        0
      );

      ctx.lineTo(
        0,
        -this.radius
      );

      ctx.closePath();
      ctx.fill();

      ctx.globalAlpha = 1;
      ctx.fillStyle =
        this.coreColor;

      ctx.beginPath();

      ctx.moveTo(
        this.radius * 0.65,
        0
      );

      ctx.lineTo(
        0,
        this.radius * 0.42
      );

      ctx.lineTo(
        -this.radius * 0.48,
        0
      );

      ctx.lineTo(
        0,
        -this.radius * 0.42
      );

      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}
