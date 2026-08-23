// Input.js
// Tugas: mencatat tombol keyboard yang sedang ditekan,
// posisi mouse di layar, status klik kiri, serta input joystick mobile.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;

    // Menyimpan status tombol keyboard, contoh: { KeyW: true, KeyA: false }
    this.keys = {};

    // Tombol yang BARU SAJA ditekan di frame ini (edge-trigger).
    this.justPressed = {};

    // Posisi mouse RELATIF terhadap canvas.
    this.mouse = { x: 0, y: 0 };

    // Apakah klik kiri sedang ditekan.
    this.mouseDown = false;

    // Vektor gerak joystick mobile.
    // Rentang masing-masing sumbu: -1 sampai 1.
    this.mobileMove = { x: 0, y: 0 };

    this._bindEvents();
    const isTouchDevice =
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches;

if (isTouchDevice) {
    document.body.classList.add('touch-device');
}
    this._bindMobileControls();
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

  _bindMobileControls() {
    const joystick = document.getElementById('moveJoystick');
    const stick = document.getElementById('moveStick');
    const pauseButton = document.getElementById('mobilePauseButton');

    // Kalau elemen mobile tidak ada, keyboard/mouse tetap bekerja seperti biasa.
    if (!joystick || !stick) return;

    let activePointerId = null;
    const maxDistance = 46;

    const resetJoystick = () => {
      activePointerId = null;
      this.mobileMove.x = 0;
      this.mobileMove.y = 0;
      stick.style.transform = 'translate(0px, 0px)';
    };

    const updateJoystick = (e) => {
      const rect = joystick.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let dx = e.clientX - centerX;
      let dy = e.clientY - centerY;

      const distance = Math.hypot(dx, dy);
      if (distance > maxDistance) {
        const scale = maxDistance / distance;
        dx *= scale;
        dy *= scale;
      }

      stick.style.transform = `translate(${dx}px, ${dy}px)`;

      this.mobileMove.x = dx / maxDistance;
      this.mobileMove.y = dy / maxDistance;
    };

    joystick.addEventListener('pointerdown', (e) => {
      e.preventDefault();

      if (activePointerId !== null) return;
      activePointerId = e.pointerId;

      joystick.setPointerCapture?.(e.pointerId);
      updateJoystick(e);
    });

    joystick.addEventListener('pointermove', (e) => {
      if (e.pointerId !== activePointerId) return;
      e.preventDefault();
      updateJoystick(e);
    });

    joystick.addEventListener('pointerup', (e) => {
      if (e.pointerId !== activePointerId) return;
      e.preventDefault();
      resetJoystick();
    });

    joystick.addEventListener('pointercancel', (e) => {
      if (e.pointerId !== activePointerId) return;
      resetJoystick();
    });

    // Tombol mobile memakai aksi Escape virtual.
    // Game.js yang sudah ada tetap menangani pause/resume seperti sebelumnya.
    if (pauseButton) {
      pauseButton.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.justPressed.Escape = true;
      });
    }

    // Mencegah joystick tersangkut saat tab/app kehilangan fokus.
    window.addEventListener('blur', resetJoystick);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) resetJoystick();
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

  // Dipanggil Game.js di akhir tiap frame.
  clearFrame() {
    this.justPressed = {};
  }
}
