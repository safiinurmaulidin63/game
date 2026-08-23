// Player.js
// Menangani posisi, gerakan, collision, HP, dan arah hadap.

import { assetLoader } from '../core/AssetLoader.js';
import { soundManager } from '../core/SoundManager.js';

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;

    this.size = 32;
    this.speed = 220;
    this.color = '#3b82f6';

    // Arah hadap dalam radian.
    this.angle = 0;

    this.maxHp = 10;
    this.hp = this.maxHp;

    this.invulnerableDuration = 0.5;
    this.invulnerableTimer = 0;

    this.hazardDamage = 1;
  }

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

    // PC
    if (input.isDown('KeyW')) dy -= 1;
    if (input.isDown('KeyS')) dy += 1;
    if (input.isDown('KeyA')) dx -= 1;
    if (input.isDown('KeyD')) dx += 1;

    // HP
    dx += input.mobileMove.x;
    dy += input.mobileMove.y;

    const magnitude = Math.hypot(dx, dy);

    if (magnitude > 1) {
      dx /= magnitude;
      dy /= magnitude;
    }

    const moveX = dx * this.speed * dt;
    const moveY = dy * this.speed * dt;

    const newX = this.x + moveX;

    if (!this._collidesWithWall(newX, this.y, tileMap)) {
      this.x = newX;
    }

    const newY = this.y + moveY;

    if (!this._collidesWithWall(this.x, newY, tileMap)) {
      this.y = newY;
    }

    // Arah hadap.
    if (input.isTouchDevice) {
      // HP -> joystick AIM.
      this.angle = Math.atan2(
        input.mobileAim.y,
        input.mobileAim.x
      );
    } else {
      // PC -> mouse.
      const mouseWorld = camera.screenToWorld(
        input.mouse.x,
        input.mouse.y
      );

      this.angle = Math.atan2(
        mouseWorld.y - this.y,
        mouseWorld.x - this.x
      );
    }

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

    ctx.globalAlpha =
      this.invulnerableTimer > 0 ? 0.5 : 1;

    if (sprite) {
      ctx.drawImage(
        sprite,
        -this.size / 2,
        -this.size / 2,
        this.size,
        this.size
      );
    } else {
      ctx.fillStyle = this.color;

      ctx.fillRect(
        -this.size / 2,
        -this.size / 2,
        this.size,
        this.size
      );

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
