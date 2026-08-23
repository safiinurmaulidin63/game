// main.js
// Entry point game.

import { Game } from './core/Game.js';
import { assetLoader } from './core/AssetLoader.js';
import { soundManager } from './core/SoundManager.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const manifest = {
  player: './assets/player/player.png',
  enemyMelee: './assets/enemies/melee.png',
  enemyRanged: './assets/enemies/ranged.png',
  enemyBrute: './assets/enemies/brute.png',
  enemySwarm: './assets/enemies/swarm.png',
  boss: './assets/enemies/boss.png',
  tileFloor: './assets/tiles/floor.png',
  tileWall: './assets/tiles/wall.png',
  tileStairs: './assets/tiles/stairs.png',
  tileObstacle: './assets/tiles/obstacle.png',
  tileHazard: './assets/tiles/hazard.png',
  playerBullet: './assets/projectiles/player_bullet.png',
  enemyBullet: './assets/projectiles/enemy_bullet.png',
};

ctx.fillStyle = '#111';
ctx.fillRect(0, 0, canvas.width || 300, canvas.height || 150);
ctx.fillStyle = '#fff';
ctx.font = '16px sans-serif';
ctx.fillText('Loading assets...', 20, 30);

window.addEventListener('pointerdown', () => soundManager.unlock(), { once: true });
window.addEventListener('keydown', () => soundManager.unlock(), { once: true });

assetLoader.loadAll(manifest).then(() => {
  const game = new Game(canvas);
  game.start();
});
