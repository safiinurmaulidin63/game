// CharacterData.js
// Data karakter + sprite 4 arah.
// Semua sprite gameplay sudah di-crop menjadi 64x64.

export const CHARACTERS = {
  mage: {
    id: 'mage',
    name: 'Mage',
    role: 'Sihir',
    weaponType: 'magic',
    maxHp: 10,
    speed: 220,
    previewPath: './assets/player/characters/mage_down.png?v=81',
    spriteKeys: {
      up: 'playerMageUp',
      down: 'playerMageDown',
      left: 'playerMageLeft',
      right: 'playerMageRight',
    },
  },

  fighter: {
    id: 'fighter',
    name: 'Fighter',
    role: 'Tinju',
    weaponType: 'fist',
    maxHp: 10,
    speed: 220,
    previewPath: './assets/player/characters/fighter_down.png?v=81',
    spriteKeys: {
      up: 'playerFighterUp',
      down: 'playerFighterDown',
      left: 'playerFighterLeft',
      right: 'playerFighterRight',
    },
  },

  swordsman: {
    id: 'swordsman',
    name: 'Swordsman',
    role: 'Pedang',
    weaponType: 'sword',
    maxHp: 10,
    speed: 220,
    previewPath: './assets/player/characters/swordsman_down.png?v=81',
    spriteKeys: {
      up: 'playerSwordsmanUp',
      down: 'playerSwordsmanDown',
      left: 'playerSwordsmanLeft',
      right: 'playerSwordsmanRight',
    },
  },

  monk: {
    id: 'monk',
    name: 'Monk',
    role: 'Tongkat',
    weaponType: 'staff',
    maxHp: 10,
    speed: 220,
    previewPath: './assets/player/characters/monk_down.png?v=81',
    spriteKeys: {
      up: 'playerMonkUp',
      down: 'playerMonkDown',
      left: 'playerMonkLeft',
      right: 'playerMonkRight',
    },
  },
};

export const CHARACTER_ORDER = ['mage', 'fighter', 'swordsman', 'monk'];

export function getCharacter(characterId) {
  return CHARACTERS[characterId] || CHARACTERS.swordsman;
}
