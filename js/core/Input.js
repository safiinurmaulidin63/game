export class Input {
  constructor(canvas) {
    this.canvas = canvas;

    // Keyboard
    this.keys = {};
    this.justPressed = {};

    // Mouse
    this.mouse = { x: 0, y: 0 };
    this.mouseDown = false;

    // Mobile
    this.mobileMove = { x: 0, y: 0 };
    this.mobileAim = { x: 1, y: 0 };

    this.isTouchDevice =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches;

    if (this.isTouchDevice) {
      document.body.classList.add('touch-device');
    }

    this._bindDesktopControls();
    this._bindMobileControls();
  }

  _bindDesktopControls() {
    window.addEventListener('keydown', (e) => {
      if (!this.keys[e.code]) {
        this.justPressed[e.code] = true;
      }
      this.keys[e.code] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouseDown = true;
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
    });
  }

  _bindMobileControls() {
    const moveJoystick = document.getElementById('moveJoystick');
    const moveStick = document.getElementById('moveStick');
    const aimJoystick = document.getElementById('aimJoystick');
    const aimStick = document.getElementById('aimStick');
    const pauseButton = document.getElementById('mobilePauseButton');
    const fireButton = document.getElementById('mobileFireButton');

    const MAX_DISTANCE = 46;

    // ---------- MOVE ----------
    let movePointerId = null;

    const resetMove = () => {
      movePointerId = null;
      this.mobileMove.x = 0;
      this.mobileMove.y = 0;

      if (moveStick) {
        moveStick.style.transform = 'translate(0px, 0px)';
      }
    };

    const updateMove = (e) => {
      if (!moveJoystick || !moveStick) return;

      const rect = moveJoystick.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let dx = e.clientX - centerX;
      let dy = e.clientY - centerY;

      const distance = Math.hypot(dx, dy);

      if (distance > MAX_DISTANCE) {
        const scale = MAX_DISTANCE / distance;
        dx *= scale;
        dy *= scale;
      }

      moveStick.style.transform = `translate(${dx}px, ${dy}px)`;
      this.mobileMove.x = dx / MAX_DISTANCE;
      this.mobileMove.y = dy / MAX_DISTANCE;
    };

    if (moveJoystick && moveStick) {
      moveJoystick.addEventListener('pointerdown', (e) => {
        e.preventDefault();

        if (movePointerId !== null) return;

        movePointerId = e.pointerId;
        moveJoystick.setPointerCapture?.(e.pointerId);
        updateMove(e);
      });

      moveJoystick.addEventListener('pointermove', (e) => {
        if (e.pointerId !== movePointerId) return;
        e.preventDefault();
        updateMove(e);
      });

      moveJoystick.addEventListener('pointerup', (e) => {
        if (e.pointerId !== movePointerId) return;
        e.preventDefault();
        resetMove();
      });

      moveJoystick.addEventListener('pointercancel', resetMove);
      moveJoystick.addEventListener('lostpointercapture', resetMove);
    }

    // ---------- AIM ----------
    let aimPointerId = null;

    const resetAimStick = () => {
      aimPointerId = null;

      // Arah TERAKHIR tetap disimpan.
      // Yang kembali ke tengah hanya visual stick.
      if (aimStick) {
        aimStick.style.transform = 'translate(0px, 0px)';
      }
    };

    const updateAim = (e) => {
      if (!aimJoystick || !aimStick) return;

      const rect = aimJoystick.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let dx = e.clientX - centerX;
      let dy = e.clientY - centerY;

      const distance = Math.hypot(dx, dy);

      if (distance > MAX_DISTANCE) {
        const scale = MAX_DISTANCE / distance;
        dx *= scale;
        dy *= scale;
      }

      aimStick.style.transform = `translate(${dx}px, ${dy}px)`;

      // Deadzone kecil.
      const len = Math.hypot(dx, dy);
      if (len >= 8) {
        this.mobileAim.x = dx / len;
        this.mobileAim.y = dy / len;
      }
    };

    if (aimJoystick && aimStick) {
      aimJoystick.addEventListener('pointerdown', (e) => {
        e.preventDefault();

        if (aimPointerId !== null) return;

        aimPointerId = e.pointerId;
        aimJoystick.setPointerCapture?.(e.pointerId);
        updateAim(e);
      });

      aimJoystick.addEventListener('pointermove', (e) => {
        if (e.pointerId !== aimPointerId) return;
        e.preventDefault();
        updateAim(e);
      });

      aimJoystick.addEventListener('pointerup', (e) => {
        if (e.pointerId !== aimPointerId) return;
        e.preventDefault();
        resetAimStick();
      });

      aimJoystick.addEventListener('pointercancel', resetAimStick);
      aimJoystick.addEventListener('lostpointercapture', resetAimStick);
    }

    // ---------- PAUSE ----------
    if (pauseButton) {
      pauseButton.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.justPressed.Escape = true;
      });
    }

    // ---------- FIRE ----------
    if (fireButton) {
      fireButton.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.mouseDown = true;
        fireButton.setPointerCapture?.(e.pointerId);
      });

      const stopFire = (e) => {
        e?.preventDefault?.();
        this.mouseDown = false;
      };

      fireButton.addEventListener('pointerup', stopFire);
      fireButton.addEventListener('pointercancel', stopFire);
      fireButton.addEventListener('lostpointercapture', stopFire);
    }

    // ---------- RESET ----------
    window.addEventListener('blur', () => {
      resetMove();
      resetAimStick();
      this.mouseDown = false;
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        resetMove();
        resetAimStick();
        this.mouseDown = false;
      }
    });
  }

  isDown(code) {
    return !!this.keys[code];
  }

  wasJustPressed(code) {
    return !!this.justPressed[code];
  }

  clearFrame() {
    this.justPressed = {};
  }
}
