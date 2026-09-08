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
  boss: './assets/enemies/aster_boss.png?v=aster7',
  tileFloor: './assets/tiles/floor.png',
  tileWall: './assets/tiles/wall.png',
  tileStairs: './assets/tiles/stairs.png',
  tileObstacle: './assets/tiles/obstacle.png',
  tileHazard: './assets/tiles/hazard.png',

  // =====================================================
  // CUSTOM DUNGEON VISUAL SYSTEM
  // Floor variants
  // =====================================================
  tileFloor01: './assets/tiles/variants/floor_01.png?v=visual1',
  tileFloor02: './assets/tiles/variants/floor_02.png?v=visual1',
  tileFloor03: './assets/tiles/variants/floor_03.png?v=visual1',
  tileFloor04: './assets/tiles/variants/floor_04.png?v=visual1',
  tileFloor05: './assets/tiles/variants/floor_05.png?v=visual1',
  tileFloor06: './assets/tiles/variants/floor_06.png?v=visual1',
  tileFloor07: './assets/tiles/variants/floor_07.png?v=visual1',
  tileFloor08: './assets/tiles/variants/floor_08.png?v=visual1',
  tileFloor09: './assets/tiles/variants/floor_09.png?v=visual1',
  tileFloor10: './assets/tiles/variants/floor_10.png?v=visual1',
  tileFloor11: './assets/tiles/variants/floor_11.png?v=visual1',
  tileFloor12: './assets/tiles/variants/floor_12.png?v=visual1',

  // Wall overlays/detail. Wall utama tetap tileWall agar collision
  // dan bentuk map tidak berubah.
  wallDetail01: './assets/tiles/variants/wall_01.png?v=visual1',
  wallDetail02: './assets/tiles/variants/wall_02.png?v=visual1',
  wallDetail03: './assets/tiles/variants/wall_03.png?v=visual1',
  wallDetail04: './assets/tiles/variants/wall_04.png?v=visual1',
  wallDetail05: './assets/tiles/variants/wall_05.png?v=visual1',
  wallDetail06: './assets/tiles/variants/wall_06.png?v=visual1',
  wallDetail07: './assets/tiles/variants/wall_07.png?v=visual1',
  wallDetail08: './assets/tiles/variants/wall_08.png?v=visual1',

  // Props/dekorasi.
  propBones: './assets/props/bones.png?v=visual1',
  propSmallRocks: './assets/props/small_rocks.png?v=visual1',
  propUrn: './assets/props/urn.png?v=visual1',
  propCrackedBlock: './assets/props/cracked_block.png?v=visual1',
  propRubbleBlock: './assets/props/rubble_block.png?v=visual1',
  propMossBlock: './assets/props/moss_block.png?v=visual1',
  propFloorRune: './assets/props/floor_rune.png?v=visual1',
  propFloorGrate: './assets/props/floor_grate.png?v=visual1',

  // Dungeon magical details.
  propCrystal: './assets/puzzle/crystal.png?v=visual1',
  propTorchOn: './assets/puzzle/torch_on.png?v=visual1',
  propTorchOff: './assets/puzzle/torch_off.png?v=torch4',
  propAltarInactive: './assets/puzzle/altar_inactive.png?v=visual1',
  propAltarActive: './assets/puzzle/altar_active.png?v=altar5',
  sealFragment: './assets/puzzle/seal_fragment.png?v=fragment5',

  // Puzzle + story.
  puzzleSwitchOff: './assets/puzzle/pressure_switch_off.png?v=custom1',
  puzzleSwitchOn: './assets/puzzle/pressure_switch_on.png?v=custom1',

  // Level 2: segel Matahari & Bulan.
  puzzleSunOff: './assets/puzzle/sun_switch_off.png?v=sunmoon1',
  puzzleSunOn: './assets/puzzle/sun_switch_on.png?v=sunmoon1',
  puzzleMoonOff: './assets/puzzle/moon_switch_off.png?v=sunmoon1',
  puzzleMoonOn: './assets/puzzle/moon_switch_on.png?v=sunmoon1',

  // Level 3: rune Bintang.
  puzzleStarOff: './assets/puzzle/star_switch_off.png?v=rune3',
  puzzleStarOn: './assets/puzzle/star_switch_on.png?v=rune3',
  sealedDoorClosed: './assets/puzzle/sealed_door_closed.png',
  sealedDoorOpen: './assets/puzzle/sealed_door_open.png',

  // Story props custom.
  dungeonMonument: './assets/story/dungeon_monument.png?v=monument1',
  expeditionJournal: './assets/story/expedition_journal.png?v=journal1',

  // Level 7 finale.
  theCore: './assets/story/the_core.png?v=core7',
  theCoreRestored: './assets/story/the_core_restored.png?v=core7',

  dialogueBox: './assets/ui/dialoguebox1.png',
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
