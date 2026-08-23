// Input.js
// Tugas: mencatat tombol keyboard yang sedang ditekan,
// posisi mouse di layar, dan status klik kiri.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;

    // Menyimpan status tombol keyboard, contoh: { KeyW: true, KeyA: false }
    this.keys = {};

    // Tombol yang BARU SAJA ditekan di frame ini (edge-trigger, bukan
    // "sedang ditahan"). Dipakai buat aksi sekali-tekan seperti restart/mute,
    // supaya tidak ke-trigger berkali-kali selama tombolnya ditahan.
    this.justPressed = {};

    // Posisi mouse RELATIF terhadap canvas (bukan world/koordinat game)
    this.mouse = { x: 0, y: 0 };

    // Apakah klik kiri sedang ditekan
    this.mouseDown = false;

    this._bindEvents();
  }

  _bindEvents() {
    // Keyboard
    window.addEventListener('keydown', (e) => {
      if (!this.keys[e.code]) {
        this.justPressed[e.code] = true;
      }
      this.keys[e.code] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Mouse bergerak -> update posisi relatif ke canvas
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
    });

    // Klik kiri ditekan / dilepas
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouseDown = true;
    });

    this.canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
    });
  }

  // Helper sederhana supaya kode di Player.js lebih enak dibaca
  isDown(code) {
    return !!this.keys[code];
  }

  // true HANYA di frame tombol itu pertama kali ditekan
  wasJustPressed(code) {
    return !!this.justPressed[code];
  }

  // Dipanggil Game.js di akhir tiap frame, supaya wasJustPressed()
  // otomatis kembali false di frame berikutnya
  clearFrame() {
    this.justPressed = {};
  }
}
