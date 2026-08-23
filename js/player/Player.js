// Player.js
// Tugas: menyimpan posisi player di WORLD, menangani gerakan
// WASD, menghitung arah hadap berdasarkan mouse, dan menggambar
// player — pakai sprite kalau ada, fallback ke kotak biru kalau belum.

import { assetLoader } from '../core/AssetLoader.js';
import { soundManager } from '../core/SoundManager.js';

export class Player {
  constructor(x, y) {
    this.x = x; // posisi world
    this.y = y;
    this.size = 32; // lebar/tinggi kotak
    this.speed = 220; // pixel per detik
    this.color = '#3b82f6'; // biru
    this.angle = 0; // arah hadap (radian), dipakai Weapon.js

    this.maxHp = 10;
    this.hp = this.maxHp;

    // "Invulnerable time" / i-frame: sesaat setelah kena serangan,
    // player kebal dulu. Supaya tidak instan habis HP kalau
    // dikepung banyak musuh sekaligus dalam 1 frame yang sama.
    this.invulnerableDuration = 0.5;
    this.invulnerableTimer = 0;

    this.hazardDamage = 1; // damage per "tick" kalau berdiri di atas jebakan
  }

  // Dipanggil dari Enemy.js saat musuh menyerang player
  takeDamage(amount) {
    if (this.invulnerableTimer > 0) return; // masih kebal, serangan diabaikan

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

    if (input.isDown('KeyW')) dy -= 1;
    if (input.isDown('KeyS')) dy += 1;
    if (input.isDown('KeyA')) dx -= 1;
    if (input.isDown('KeyD')) dx += 1;

    // Normalisasi supaya gerak diagonal tidak lebih cepat
    if (dx !== 0 || dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy);
      dx /= length;
      dy /= length;
    }

    const moveX = dx * this.speed * dt;
    const moveY = dy * this.speed * dt;

    // Gerak per SUMBU (X dulu, baru Y), bukan langsung digabung.
    // Ini trik umum collision AABB sederhana: kalau gerak X mentok
    // dinding, gerak Y tetap boleh jalan (jadi player "meluncur"
    // menyusuri dinding, bukan berhenti total).
    const newX = this.x + moveX;
    if (!this._collidesWithWall(newX, this.y, tileMap)) {
      this.x = newX;
    }

    const newY = this.y + moveY;
    if (!this._collidesWithWall(this.x, newY, tileMap)) {
      this.y = newY;
    }

    // Hitung arah hadap player menuju posisi mouse (dalam world)
    const mouseWorld = camera.screenToWorld(input.mouse.x, input.mouse.y);
    this.angle = Math.atan2(mouseWorld.y - this.y, mouseWorld.x - this.x);

    // Kena jebakan (hazard) kalau sedang berdiri di atasnya. Pakai
    // takeDamage() yang sama supaya tetap dilindungi i-frame — efeknya
    // seperti damage-tick berkala selama masih berdiri di situ.
    if (tileMap && tileMap.isHazardAtWorld(this.x, this.y)) {
      this.takeDamage(this.hazardDamage);
    }
  }

  // Cek 4 sudut kotak player di posisi (x, y) yang diusulkan.
  // Kalau salah satu sudut menyentuh dinding, dianggap tabrakan.
  _collidesWithWall(x, y, tileMap) {
    if (!tileMap) return false; // aman kalau suatu saat dipanggil tanpa map

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

    // Kalau sedang kebal (baru saja kena serang), bikin agak transparan
    // supaya kelihatan "berkedip" sebagai tanda visual i-frame
    ctx.globalAlpha = this.invulnerableTimer > 0 ? 0.5 : 1;

    if (sprite) {
      // Asumsi: gambar sprite menghadap KANAN secara default,
      // supaya rotasi otomatis sinkron dengan arah mouse (this.angle)
      ctx.drawImage(sprite, -this.size / 2, -this.size / 2, this.size, this.size);
    } else {
      // Fallback: kotak biru + garis arah, kalau sprite belum dipasang
      ctx.fillStyle = this.color;
      ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);

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
