// Camera.js
// Tugas: menentukan bagian dunia game (world) mana yang
// sedang terlihat di layar, dengan cara mengikuti player.
//
// Konsep: setiap objek punya posisi WORLD (x, y) yang tetap,
// sedangkan kamera punya offset yang dipakai untuk mengonversi
// posisi world -> posisi layar (screen).

export class Camera {
  constructor(canvas) {
    this.canvas = canvas;
    this.x = 0; // posisi world pojok kiri-atas layar
    this.y = 0;
  }

  // Panggil setiap frame, sebelum menggambar, supaya kamera
  // selalu terpusat pada target (biasanya player)
  follow(target) {
    this.x = target.x - this.canvas.width / 2;
    this.y = target.y - this.canvas.height / 2;
  }

  // Konversi koordinat WORLD -> koordinat SCREEN (untuk digambar)
  worldToScreen(worldX, worldY) {
    return {
      x: worldX - this.x,
      y: worldY - this.y,
    };
  }

  // Konversi koordinat SCREEN (misalnya posisi mouse) -> WORLD
  // Dipakai supaya arah tembak menuju posisi mouse yang BENAR
  // walaupun kamera sudah bergeser.
  screenToWorld(screenX, screenY) {
    return {
      x: screenX + this.x,
      y: screenY + this.y,
    };
  }
}
