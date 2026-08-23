// AssetLoader.js
// Tugas: preload semua gambar sprite SEBELUM game mulai, supaya tidak
// ada sprite yang "kedip" kosong pas pertama kali muncul di layar.
//
// Dipakai sebagai SINGLETON: file manapun cukup
//   import { assetLoader } from '.../core/AssetLoader.js'
// lalu panggil assetLoader.get('namaKey') untuk ambil gambar yang
// siap dipakai di ctx.drawImage().
//
// PENTING: kalau sebuah key belum ada file gambarnya (atau gagal
// dimuat), get() akan return null — bukan error. Setiap draw() di
// file lain WAJIB cek null itu dan fallback ke kotak warna, supaya
// game tetap jalan walau belum semua sprite terpasang.

class AssetLoader {
  constructor() {
    this.images = {}; // key -> HTMLImageElement (atau null kalau gagal)
  }

  // manifest = { key: 'path/ke/file.png', ... }
  // Return Promise yang selesai kalau SEMUA entry sudah diproses,
  // baik berhasil maupun gagal dimuat.
  loadAll(manifest) {
    const promises = Object.entries(manifest).map(([key, path]) => {
      return new Promise((resolve) => {
        const img = new Image();

        img.onload = () => {
          this.images[key] = img;
          resolve();
        };

        img.onerror = () => {
          console.warn(
            `[AssetLoader] Gagal memuat "${key}" dari ${path} — pakai kotak warna sebagai fallback.`
          );
          this.images[key] = null;
          resolve(); // tetap resolve, biar loading tidak macet gara-gara 1 file
        };

        img.src = path;
      });
    });

    return Promise.all(promises);
  }

  get(key) {
    return this.images[key] || null;
  }
}

// Satu instance dipakai bersama oleh SEMUA file (Player, Enemy, TileMap, dst)
export const assetLoader = new AssetLoader();
