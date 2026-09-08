// PuzzleManager.js
// Tahap pertama puzzle: Level 1 memakai 3 pressure switch.
// Semua switch aktif -> sealed door terbuka.
// Tablet cerita dipicu otomatis saat player mendekat.

import { assetLoader } from '../core/AssetLoader.js';

export class PuzzleManager {
  constructor(tileMap, floorNumber, storyManager) {
    this.tileMap = tileMap;
    this.floorNumber = floorNumber;
    this.storyManager = storyManager;

    const objects = tileMap.getPuzzleObjects();

    this.switches = objects.switches.map((item, index) => ({
      ...item,
      id: `switch-${index + 1}`,
      active: false,
    }));

    this.doors = objects.doors;
    this.tablets = objects.tablets.map((item, index) => ({
      ...item,
      id: `tablet-${index + 1}`,
      triggered: false,
    }));

    this.completed = this.switches.length === 0;

    // Pastikan door kembali tertutup saat level baru dibuat.
    if (this.doors.length > 0) {
      this.tileMap.setSealedDoorOpen(false);
    }
  }

  update(player) {
    if (this.floorNumber !== 1) return;

    this._updateSwitches(player);
    this._updateTablets(player);
  }

  _updateSwitches(player) {
    for (const sw of this.switches) {
      if (sw.active) continue;

      const distance = Math.hypot(player.x - sw.x, player.y - sw.y);

      // Cukup injak plate; tidak perlu tombol interact.
      if (distance <= 34) {
        sw.active = true;
      }
    }

    if (
      !this.completed &&
      this.switches.length > 0 &&
      this.switches.every((sw) => sw.active)
    ) {
      this.completed = true;
      this.tileMap.setSealedDoorOpen(true);

      this.storyManager.show('level1-puzzle-complete', [
        {
          speaker: 'Ancient Mechanism',
          text: 'Ketiga penjaga telah aktif. Suara batu bergeser terdengar dari bagian bawah dungeon.'
        }
      ]);
    }
  }

  _updateTablets(player) {
    for (let i = 0; i < this.tablets.length; i++) {
      const tablet = this.tablets[i];
      if (tablet.triggered) continue;

      const distance = Math.hypot(player.x - tablet.x, player.y - tablet.y);
      if (distance > 48) continue;

      tablet.triggered = true;

      if (i === 0) {
        this.storyManager.show('level1-tablet-1', [
          {
            speaker: 'Ancient Tablet',
            text: 'Tiga penjaga membuka jalan bagi mereka yang mengetahui urutannya.'
          },
          {
            speaker: 'Ancient Tablet',
            text: 'Bangunkan ketiga penjaga yang tertidur di aula ini.'
          }
        ]);
      } else {
        this.storyManager.show('level1-tablet-2', [
          {
            speaker: 'Ancient Tablet',
            text: 'Enam pintu melindungi pintu ketujuh.'
          },
          {
            speaker: player.characterName,
            text: 'Pintu ketujuh...? Apa sebenarnya yang disembunyikan di bawah tempat ini?'
          }
        ]);
      }
    }
  }

  getStatusText() {
    if (this.floorNumber !== 1 || this.switches.length === 0) {
      return '';
    }

    const activeCount = this.switches.filter((sw) => sw.active).length;

    if (this.completed) {
      return 'Segel pintu: TERBUKA';
    }

    return `Pressure switch: ${activeCount} / ${this.switches.length}`;
  }

  draw(ctx, camera) {
    if (this.floorNumber !== 1) return;

    this._drawSwitches(ctx, camera);
    this._drawDoors(ctx, camera);
    this._drawTablets(ctx, camera);
  }

  _drawSwitches(ctx, camera) {
    const sprite = assetLoader.get('puzzleSwitch');

    for (const sw of this.switches) {
      const screen = camera.worldToScreen(sw.x, sw.y);

      if (sprite) {
        ctx.drawImage(sprite, screen.x - 24, screen.y - 24, 48, 48);
      } else {
        ctx.fillStyle = sw.active ? '#4ade80' : '#a78bfa';
        ctx.fillRect(screen.x - 16, screen.y - 16, 32, 32);
      }

      if (sw.active) {
        ctx.save();
        ctx.strokeStyle = '#fde68a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, 24, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  _drawDoors(ctx, camera) {
    const key = this.completed ? 'sealedDoorOpen' : 'sealedDoorClosed';
    const sprite = assetLoader.get(key);

    for (const door of this.doors) {
      const screen = camera.worldToScreen(door.x, door.y);

      if (sprite) {
        ctx.drawImage(sprite, screen.x - 32, screen.y - 32, 64, 64);
      } else {
        ctx.fillStyle = this.completed ? '#475569' : '#7c3aed';
        ctx.fillRect(screen.x - 32, screen.y - 32, 64, 64);
      }
    }
  }

  _drawTablets(ctx, camera) {
    const sprite = assetLoader.get('ancientTablet');

    for (const tablet of this.tablets) {
      const screen = camera.worldToScreen(tablet.x, tablet.y);

      if (sprite) {
        ctx.drawImage(sprite, screen.x - 22, screen.y - 22, 44, 44);
      } else {
        ctx.fillStyle = '#d6d3d1';
        ctx.fillRect(screen.x - 14, screen.y - 18, 28, 36);
      }
    }
  }
}
