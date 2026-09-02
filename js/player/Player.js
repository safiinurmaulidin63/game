// Player.js
// Player memakai sprite 4 arah: atas, bawah, kiri, kanan.
// Arah visual mengikuti arah aim, sedangkan projectile tetap memakai angle 360 derajat.

import { assetLoader } from '../core/AssetLoader.js';
import { soundManager } from '../core/SoundManager.js';
import { getCharacter } from './CharacterData.js';

export class Player {
  constructor(x, y, characterId = 'swordsman') {
    this.x = x;
    this.y = y;

    const character = getCharacter(characterId);

    this.characterId = character.id;
    this.characterName = character.name;
    this.weaponType = character.weaponType;
    this.weaponLabel = character.role;
    this.spriteKeys = character.spriteKeys;

    // Collision tetap 32px, tapi gambar sprite dibuat lebih besar.
    this.size = 32;
    this.drawHeight = 52;
    this.speed = character.speed;
    this.color = '#3b82f6';

    // Aim tetap 360 derajat untuk sistem tembak.
    this.angle = 0;

    // Sprite hanya punya 4 arah.
    this.facing = 'down';

    this.maxHp = character.maxHp;
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

    // Mobile
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

    // Aim.
    if (input.isTouchDevice) {
      this.angle = Math.atan2(input.mobileAim.y, input.mobileAim.x);
    } else {
      const mouseWorld = camera.screenToWorld(input.mouse.x, input.mouse.y);

      this.angle = Math.atan2(
        mouseWorld.y - this.y,
        mouseWorld.x - this.x
      );
    }

    // Pilih sprite terdekat dari 4 arah.
    this._updateFacingFromAngle();

    if (tileMap && tileMap.isHazardAtWorld(this.x, this.y)) {
      this.takeDamage(this.hazardDamage);
    }
  }

  _updateFacingFromAngle() {
    const x = Math.cos(this.angle);
    const y = Math.sin(this.angle);

    if (Math.abs(x) > Math.abs(y)) {
      this.facing = x >= 0 ? 'right' : 'left';
    } else {
      this.facing = y >= 0 ? 'down' : 'up';
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

    const spriteKey = this.spriteKeys?.[this.facing];
    const sprite = assetLoader.get(spriteKey) || assetLoader.get('player');

    ctx.save();
    ctx.translate(screen.x, screen.y);

    // Jangan rotate karakter lagi.
    // Yang berubah sekarang adalah sprite up/down/left/right.
    ctx.globalAlpha = this.invulnerableTimer > 0 ? 0.5 : 1;

    if (sprite) {
      ctx.imageSmoothingEnabled = false;

      // PNG sudah di-trim dari area transparan besar.
      // Pertahankan rasio sprite supaya tidak gepeng.
      const drawHeight = this.drawHeight;
      const drawWidth = drawHeight * (sprite.width / sprite.height);

      ctx.drawImage(
        sprite,
        -drawWidth / 2,
        -drawHeight / 2,
        drawWidth,
        drawHeight
      );
    } else {
      ctx.fillStyle = this.color;
      ctx.fillRect(
        -this.size / 2,
        -this.size / 2,
        this.size,
        this.size
      );
    }

    ctx.restore();
  }
}
