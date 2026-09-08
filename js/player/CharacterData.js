// CharacterData.js
// Data 4 karakter + balance Combat v2.
//
// Damage game tetap memakai skala HP musuh yang sekarang (1-60),
// jadi nilainya sengaja bukan "75/100" agar tidak merusak balance lama.

export const CHARACTERS = {
  mage: {
    id: 'mage',
    name: 'Mage',
    role: 'Sihir',
    weaponType: 'magic',
    maxHp: 10,
    speed: 220,

    passiveLabel: 'Jarak jauh • basic damage rendah',
    previewPath: './assets/player/characters/mage_down.png?v=82',

    combat: {
      basic: {
        cooldown: 0.38,
        damage: 1,
        projectileSpeed: 520,
        projectileLife: 1.35,
        projectileRadius: 6,
      },
    },

    skill: {
      id: 'arcaneBurst',
      name: 'ARCANE BURST',
      cooldown: 7,
      description: 'Menembakkan 8 proyektil sihir ke segala arah.',
    },

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

    passiveLabel: 'Attack tercepat • pukulan lebih panjang',
    previewPath: './assets/player/characters/fighter_down.png?v=82',

    combat: {
      basic: {
        cooldown: 0.24,
        damage: 1.2,

        // Fighter Boss Viability Fix:
        // range lebih nyaman + hitbox depan lebih lebar.
        range: 74,
        radius: 28,

        // Setiap pukulan ke-3 menjadi Heavy Jab.
        heavyEvery: 3,
        heavyRange: 96,
        heavyRadius: 34,
        heavyDamage: 1.65,
      },
    },

    skill: {
      id: 'dashPunch',
      name: 'DASH PUNCH',
      cooldown: 5,
      description: 'Dash ke arah aim lalu melancarkan pukulan kuat.',
    },

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

    passiveLabel: 'Basic attack dengan damage tertinggi',
    previewPath: './assets/player/characters/swordsman_down.png?v=82',

    combat: {
      basic: {
        cooldown: 0.42,
        damage: 2.25,
        range: 74,
        radius: 28,
      },
    },

    skill: {
      id: 'crescentSlash',
      name: 'CRESCENT SLASH',
      cooldown: 6,
      description: 'Tebasan 360° dengan radius besar dan damage tinggi.',
    },

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

    passiveLabel: 'Reach melee terjauh • hit ke-4 memberi stun',
    previewPath: './assets/player/characters/monk_down.png?v=82',

    combat: {
      basic: {
        cooldown: 0.38,
        damage: 1.5,
        range: 88,
        radius: 26,
        stunEvery: 4,
        stunDuration: 0.9,
      },
    },

    skill: {
      id: 'shockwave',
      name: 'SHOCKWAVE',
      cooldown: 7,
      description: 'Gelombang area yang memberi damage dan stun.',
    },

    spriteKeys: {
      up: 'playerMonkUp',
      down: 'playerMonkDown',
      left: 'playerMonkLeft',
      right: 'playerMonkRight',
    },
  },
};

export const CHARACTER_ORDER = [
  'mage',
  'fighter',
  'swordsman',
  'monk',
];

export function getCharacter(characterId) {
  return CHARACTERS[characterId] || CHARACTERS.swordsman;
}
