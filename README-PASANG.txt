CHARACTER COMBAT v2 + SKILLS + MOBILE TWIN-STICK

Patch dibuat dari ZIP project TERBARU yang kamu kirim.
Story/puzzle Level 1-7 dan finale Aster dipertahankan.

=====================================================
KONTROL BARU
=====================================================

HP / TOUCH:
- Analog kiri  = GERAK
- Analog kanan = AIM + BASIC ATTACK sekaligus
- Tombol SKILL = skill karakter
- Tombol II    = pause

Jadi tidak ada tombol SERANG terpisah lagi.
Tarik analog kanan melewati deadzone -> karakter langsung menyerang
ke arah analog sesuai attack cooldown masing-masing.

PC:
- WASD       = gerak
- Mouse      = aim
- Klik kiri  = basic attack
- Q          = skill
- ESC / P    = pause

=====================================================
BALANCE 4 KARAKTER
=====================================================

MAGE
Basic:
- damage 1
- cooldown 0.38s
- projectile speed 520
- jarak jauh

Skill: ARCANE BURST
- cooldown 7s
- 8 projectile ke segala arah

Tujuan balance:
Mage paling aman dari jauh, tapi basic damage paling rendah.

-----------------------------------------------------

FIGHTER
Basic:
- damage 1.2
- cooldown 0.24s
- range 58 + radius 24
- jauh lebih panjang dibanding tinju lama

Skill: DASH PUNCH
- cooldown 5s
- dash 110px dengan collision aman
- pukulan kuat damage 4
- bisa mengenai beberapa musuh

-----------------------------------------------------

SWORDSMAN
Basic:
- damage 2.25 (tertinggi)
- cooldown 0.42s
- range 74 + radius 28

Skill: CRESCENT SLASH
- cooldown 6s
- slash 360 derajat
- radius 90
- damage 4.5

-----------------------------------------------------

MONK
Basic:
- damage 1.5
- cooldown 0.38s
- range 88 + radius 26
- melee reach terjauh

Passive:
- setiap basic attack ke-4 menjadi empowered
- jika mengenai musuh -> stun 0.9s

Skill: SHOCKWAVE
- cooldown 7s
- radius 112
- damage 2.5
- stun 1.4s
- boss punya resistensi stun

=====================================================
UI
=====================================================

HUD baru:
Skill [Q]: NAMA SKILL • READY
atau
Skill [Q]: NAMA SKILL • 4.3s

Tombol skill HP juga otomatis menampilkan:
SKILL
READY

atau countdown:
SKILL
4.3s

Menu karakter sekarang menampilkan:
- role
- passive/keunggulan
- nama skill

=====================================================
FILE YANG DIGANTI
=====================================================

index.html
css/style.css

js/main.js

js/core/
- Game.js
- Input.js

js/player/
- CharacterData.js
- Player.js

js/weapon/
- Weapon.js
- Projectile.js
- MeleeHit.js

js/enemy/
- Enemy.js
- Boss.js
- EnemyManager.js

TIDAK MENGGANTI:
- LevelData.js
- TileMap.js
- PuzzleManager.js
- StoryManager.js
- asset dungeon/story/player

Jadi puzzle + story Level 1-7 tetap dipertahankan.

=====================================================
CARA PASANG
=====================================================

1. Backup / commit project sekarang.
2. Extract ZIP patch.
3. Copy index.html, css, dan js ke root RPG-GAME.
4. Replace file yang diminta.
5. Jangan hapus folder assets.
6. Ctrl + F5.
7. Tes semua 4 karakter di Level 1 dulu.

Urutan test yang disarankan:
1. Mage: tahan analog kanan -> auto fire.
2. Fighter: cek basic reach + DASH PUNCH.
3. Swordsman: cek basic damage/range + CRESCENT SLASH.
4. Monk: lihat basic ke-4 berwarna cyan + stun + SHOCKWAVE.
5. Pastikan Level 7 / Aster masih bisa berjalan.

CATATAN:
Nilai damage memakai skala HP game saat ini.
Musuh normal hanya punya HP sekitar 1-7 dan boss 60,
jadi damage 75/100 akan langsung merusak balance.
