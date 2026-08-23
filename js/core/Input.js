// Input.js
// Menangani input keyboard, mouse, joystick mobile, tombol pause, dan tombol fire.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;

    // Status tombol keyboard
    this.keys = {};

    // Tombol yang baru ditekan pada frame ini
    this.justPressed = {};

    // Posisi mouse relatif terhadap canvas
    this.mouse = {
      x: 0,
      y: 0
    };

    // Klik kiri mouse / tombol FIRE mobile
    this.mouseDown = false;

    // Input joystick mobile
    // Nilai x dan y berkisar -1 sampai 1
    this.mobileMove = {
      x: 0,
      y: 0
    };

    // Event keyboard dan mouse
    this._bindEvents();

    // Deteksi perangkat touchscreen
    const isTouchDevice =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches;

    if (isTouchDevice) {
      document.body.classList.add('touch-device');
    }

    // Event kontrol mobile
    this._bindMobileControls();
  }

  // =========================================================
  // KEYBOARD + MOUSE
  // =========================================================
  _bindEvents() {
    // Keyboard ditekan
    window.addEventListener('keydown', (e) => {
      if (!this.keys[e.code]) {
        this.justPressed[e.code] = true;
      }

      this.keys[e.code] = true;
    });

    // Keyboard dilepas
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Mouse bergerak
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();

      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
    });

    // Klik kiri ditekan
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.mouseDown = true;
      }
    });

    // Klik kiri dilepas
    this.canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.mouseDown = false;
      }
    });

    // Kalau mouse keluar canvas saat klik ditahan
    this.canvas.addEventListener('mouseleave', () => {
      this.mouseDown = false;
    });
  }

  // =========================================================
  // MOBILE CONTROLS
  // =========================================================
  _bindMobileControls() {
    const joystick = document.getElementById('moveJoystick');
    const stick = document.getElementById('moveStick');

    const pauseButton =
      document.getElementById('mobilePauseButton');

    const fireButton =
      document.getElementById('mobileFireButton');

    // Kalau joystick tidak ada, kontrol PC tetap bisa jalan
    if (!joystick || !stick) {
      return;
    }

    let activePointerId = null;

    // Jarak maksimal stick dari tengah joystick
    const maxDistance = 46;

    // =====================================================
    // RESET JOYSTICK
    // =====================================================
    const resetJoystick = () => {
      activePointerId = null;

      this.mobileMove.x = 0;
      this.mobileMove.y = 0;

      stick.style.transform =
        'translate(0px, 0px)';
    };

    // =====================================================
    // UPDATE JOYSTICK
    // =====================================================
    const updateJoystick = (e) => {
      const rect =
        joystick.getBoundingClientRect();

      const centerX =
        rect.left + rect.width / 2;

      const centerY =
        rect.top + rect.height / 2;

      let dx =
        e.clientX - centerX;

      let dy =
        e.clientY - centerY;

      const distance =
        Math.hypot(dx, dy);

      // Batasi stick supaya tidak keluar lingkaran
      if (distance > maxDistance) {
        const scale =
          maxDistance / distance;

        dx *= scale;
        dy *= scale;
      }

      // Gerakkan visual joystick
      stick.style.transform =
        `translate(${dx}px, ${dy}px)`;

      // Simpan nilai input
      this.mobileMove.x =
        dx / maxDistance;

      this.mobileMove.y =
        dy / maxDistance;
    };

    // =====================================================
    // JOYSTICK POINTER DOWN
    // =====================================================
    joystick.addEventListener(
      'pointerdown',
      (e) => {
        e.preventDefault();

        if (activePointerId !== null) {
          return;
        }

        activePointerId =
          e.pointerId;

        joystick.setPointerCapture?.(
          e.pointerId
        );

        updateJoystick(e);
      }
    );

    // =====================================================
    // JOYSTICK POINTER MOVE
    // =====================================================
    joystick.addEventListener(
      'pointermove',
      (e) => {
        if (
          e.pointerId !==
          activePointerId
        ) {
          return;
        }

        e.preventDefault();

        updateJoystick(e);
      }
    );

    // =====================================================
    // JOYSTICK POINTER UP
    // =====================================================
    joystick.addEventListener(
      'pointerup',
      (e) => {
        if (
          e.pointerId !==
          activePointerId
        ) {
          return;
        }

        e.preventDefault();

        resetJoystick();
      }
    );

    // Kalau touch dibatalkan browser
    joystick.addEventListener(
      'pointercancel',
      (e) => {
        if (
          e.pointerId !==
          activePointerId
        ) {
          return;
        }

        resetJoystick();
      }
    );

    // =====================================================
    // TOMBOL PAUSE MOBILE
    // =====================================================
    if (pauseButton) {
      pauseButton.addEventListener(
        'pointerdown',
        (e) => {
          e.preventDefault();

          // Meniru tombol ESC
          // Game.js tetap memakai sistem pause lama
          this.justPressed.Escape = true;
        }
      );
    }

    // =====================================================
    // TOMBOL FIRE MOBILE
    // =====================================================
    if (fireButton) {
      fireButton.addEventListener(
        'pointerdown',
        (e) => {
          e.preventDefault();

          // Meniru klik kiri mouse
          this.mouseDown = true;

          fireButton.setPointerCapture?.(
            e.pointerId
          );
        }
      );

      fireButton.addEventListener(
        'pointerup',
        (e) => {
          e.preventDefault();

          this.mouseDown = false;
        }
      );

      fireButton.addEventListener(
        'pointercancel',
        () => {
          this.mouseDown = false;
        }
      );

      fireButton.addEventListener(
        'lostpointercapture',
        () => {
          this.mouseDown = false;
        }
      );
    }

    // =====================================================
    // RESET SAAT APP KEHILANGAN FOKUS
    // =====================================================
    window.addEventListener(
      'blur',
      () => {
        resetJoystick();

        this.mouseDown = false;
      }
    );

    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) {
          resetJoystick();

          this.mouseDown = false;
        }
      }
    );
  }

  // =========================================================
  // HELPER
  // =========================================================

  // Apakah tombol sedang ditekan?
  isDown(code) {
    return !!this.keys[code];
  }

  // Apakah tombol baru saja ditekan frame ini?
  wasJustPressed(code) {
    return !!this.justPressed[code];
  }

  // Dipanggil Game.js di akhir setiap frame
  clearFrame() {
    this.justPressed = {};
  }
}