# Panduan taruh sprite

Download pack "Tiny Dungeon" dari Kenney (gratis, CC0):
https://kenney.nl/assets/tiny-dungeon

Extract, lalu pilih gambar mana saja yang cocok, RENAME sesuai nama
di bawah, dan taruh di folder yang sesuai. Nama file HARUS PERSIS
sama (termasuk huruf besar/kecil) supaya kepakai otomatis.

Belum sempat pasang semua? Tidak apa-apa — game tetap jalan pakai
kotak warna untuk sprite yang belum ada filenya.

## assets/player/
- player.png       -> karakter utama (hero). Cari sprite yang MENGHADAP KANAN,
                       soalnya kode akan mutar sprite ini otomatis
                       mengikuti arah mouse.

## assets/enemies/
- melee.png         -> musuh jarak dekat dasar (kotak hijau sebelumnya)
- ranged.png         -> musuh jarak jauh (kotak ungu sebelumnya)
- brute.png          -> musuh tebal & lambat, pukulannya sakit (kotak coklat sebelumnya)
- swarm.png          -> musuh cepat & rapuh, gerak sedikit liar (kotak pink sebelumnya)
- boss.png           -> boss lantai 7 (kotak merah besar sebelumnya).
                       Cari monster yang paling besar/serem di pack-nya.

## assets/tiles/
- floor.png          -> tile lantai (ukuran berapa saja, akan di-stretch ke 64x64)
- wall.png            -> tile dinding/tembok labirin
- stairs.png          -> tile tangga (exit ke lantai berikutnya)
- obstacle.png        -> rintangan tambahan di labirin (menghalangi jalan, PERMANEN,
                       tidak bisa dihancurkan peluru — kotak coklat tua sebelumnya)
- hazard.png          -> jebakan (TIDAK menghalangi jalan, tapi menyakiti kalau
                       diinjak — cari sprite yang terlihat "berbahaya"/menyala,
                       kotak merah tua sebelumnya)

## assets/projectiles/
- player_bullet.png    -> peluru yang ditembakkan player
- enemy_bullet.png      -> peluru yang ditembakkan musuh ranged

---
Kalau butuh lebih banyak variasi monster, cek juga paket komunitas
"Tiny Creatures" (kompatibel gaya sama Tiny Dungeon):
https://opengameart.org/content/tiny-creatures
