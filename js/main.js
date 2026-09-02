// main.js
// Entry point game + menu pemilihan karakter.

import { Game } from './core/Game.js';
import { assetLoader } from './core/AssetLoader.js';
import { soundManager } from './core/SoundManager.js';
import { CHARACTERS, CHARACTER_ORDER } from './player/CharacterData.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const characterSelect = document.getElementById('characterSelect');
const characterList = document.getElementById('characterList');
const startGameButton = document.getElementById('startGameButton');

const manifest = {
  // Player lama tetap disimpan sebagai fallback.
  player: './assets/player/player.png',

  // Sprite karakter 4 arah.
  playerMageUp: './assets/player/characters/mage_up.png?v=81',
  playerMageDown: './assets/player/characters/mage_down.png?v=81',
  playerMageLeft: './assets/player/characters/mage_left.png?v=81',
  playerMageRight: './assets/player/characters/mage_right.png?v=81',

  playerFighterUp: './assets/player/characters/fighter_up.png?v=81',
  playerFighterDown: './assets/player/characters/fighter_down.png?v=81',
  playerFighterLeft: './assets/player/characters/fighter_left.png?v=81',
  playerFighterRight: './assets/player/characters/fighter_right.png?v=81',

  playerSwordsmanUp: './assets/player/characters/swordsman_up.png?v=81',
  playerSwordsmanDown: './assets/player/characters/swordsman_down.png?v=81',
  playerSwordsmanLeft: './assets/player/characters/swordsman_left.png?v=81',
  playerSwordsmanRight: './assets/player/characters/swordsman_right.png?v=81',

  playerMonkUp: './assets/player/characters/monk_up.png?v=81',
  playerMonkDown: './assets/player/characters/monk_down.png?v=81',
  playerMonkLeft: './assets/player/characters/monk_left.png?v=81',
  playerMonkRight: './assets/player/characters/monk_right.png?v=81',

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

let selectedCharacterId = null;
let gameStarted = false;

function buildCharacterMenu() {
  characterList.innerHTML = '';

  for (const characterId of CHARACTER_ORDER) {
    const character = CHARACTERS[characterId];

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'character-card';
    button.dataset.characterId = characterId;

    button.innerHTML = `
      <img
        class="character-card-image"
        src="${character.previewPath}"
        alt="${character.name}"
      />
      <span class="character-card-name">${character.name}</span>
      <span class="character-card-role">${character.role}</span>
    `;

    button.addEventListener('click', () => {
      selectedCharacterId = characterId;

      document
        .querySelectorAll('.character-card')
        .forEach((card) => card.classList.remove('selected'));

      button.classList.add('selected');
      startGameButton.disabled = false;
      startGameButton.textContent = `MAIN SEBAGAI ${character.name.toUpperCase()}`;
    });

    characterList.appendChild(button);
  }
}

function startSelectedCharacter() {
  if (!selectedCharacterId || gameStarted) return;

  gameStarted = true;
  characterSelect.hidden = true;
  document.body.classList.add('game-running');

  const game = new Game(canvas, selectedCharacterId);
  game.start();
}

startGameButton.addEventListener('click', startSelectedCharacter);

assetLoader.loadAll(manifest).then(() => {
  buildCharacterMenu();
  characterSelect.hidden = false;
});
