export class Input {
  constructor(canvas) {
    this.canvas = canvas;

    // =========================
    // KEYBOARD
    // =========================
    this.keys = {};
    this.justPressed = {};

    // =========================
    // MOUSE
    // =========================
    this.mouse = {
      x: 0,
      y: 0
    };

    this.mouseDown = false;

    // =========================
    // MOBILE MOVE
    // =========================
    this.mobileMove = {
      x: 0,
      y: 0
    };

    // =========================
    // MOBILE AIM
    // =========================
    this.mobileAim = {
      x: 1,
      y: 0
    };

    this._bindEvents();

    // Deteksi HP / touchscreen
    const isTouchDevice =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches;

    if (isTouchDevice) {
      document.body.classList.add(
        'touch-device'
      );
    }

    this._bindMobileControls();
  }

  // =====================================================
  // KEYBOARD + MOUSE
  // =====================================================
  _bindEvents() {

    window.addEventListener(
      'keydown',
      (e) => {

        if (!this.keys[e.code]) {
          this.justPressed[e.code] = true;
        }

        this.keys[e.code] = true;
      }
    );

    window.addEventListener(
      'keyup',
      (e) => {

        this.keys[e.code] = false;
      }
    );

    this.canvas.addEventListener(
      'mousemove',
      (e) => {

        const rect =
          this.canvas.getBoundingClientRect();

        this.mouse.x =
          e.clientX - rect.left;

        this.mouse.y =
          e.clientY - rect.top;
      }
    );

    this.canvas.addEventListener(
      'mousedown',
      (e) => {

        if (e.button === 0) {
          this.mouseDown = true;
        }
      }
    );

    this.canvas.addEventListener(
      'mouseup',
      (e) => {

        if (e.button === 0) {
          this.mouseDown = false;
        }
      }
    );

    this.canvas.addEventListener(
      'mouseleave',
      () => {

        this.mouseDown = false;
      }
    );
  }

  // =====================================================
  // MOBILE
  // =====================================================
  _bindMobileControls() {

    const moveJoystick =
      document.getElementById(
        'moveJoystick'
      );

    const moveStick =
      document.getElementById(
        'moveStick'
      );

    const aimJoystick =
      document.getElementById(
        'aimJoystick'
      );

    const aimStick =
      document.getElementById(
        'aimStick'
      );

    const pauseButton =
      document.getElementById(
        'mobilePauseButton'
      );

    const fireButton =
      document.getElementById(
        'mobileFireButton'
      );

    // =========================
    // JOYSTICK GERAK
    // =========================

    if (moveJoystick && moveStick) {

      let movePointerId = null;

      const maxDistance = 46;

      const resetMove = () => {

        movePointerId = null;

        this.mobileMove.x = 0;
        this.mobileMove.y = 0;

        moveStick.style.transform =
          'translate(0px, 0px)';
      };

      const updateMove = (e) => {

        const rect =
          moveJoystick
            .getBoundingClientRect();

        const centerX =
          rect.left +
          rect.width / 2;

        const centerY =
          rect.top +
          rect.height / 2;

        let dx =
          e.clientX - centerX;

        let dy =
          e.clientY - centerY;

        const distance =
          Math.hypot(dx, dy);

        if (distance > maxDistance) {

          const scale =
            maxDistance / distance;

          dx *= scale;
          dy *= scale;
        }

        moveStick.style.transform =
          `translate(${dx}px, ${dy}px)`;

        this.mobileMove.x =
          dx / maxDistance;

        this.mobileMove.y =
          dy / maxDistance;
      };

      moveJoystick.addEventListener(
        'pointerdown',
        (e) => {

          e.preventDefault();

          if (movePointerId !== null) {
            return;
          }

          movePointerId =
            e.pointerId;

          moveJoystick
            .setPointerCapture?.(
              e.pointerId
            );

          updateMove(e);
        }
      );

      moveJoystick.addEventListener(
        'pointermove',
        (e) => {

          if (
            e.pointerId !==
            movePointerId
          ) {
            return;
          }

          e.preventDefault();

          updateMove(e);
        }
      );

      moveJoystick.addEventListener(
        'pointerup',
        (e) => {

          if (
            e.pointerId !==
            movePointerId
          ) {
            return;
          }

          resetMove();
        }
      );

      moveJoystick.addEventListener(
        'pointercancel',
        resetMove
      );
    }

    // =========================
    // JOYSTICK AIM
    // =========================

    if (aimJoystick && aimStick) {

      let aimPointerId = null;

      const maxDistance = 46;

      const resetAim = () => {

        aimPointerId = null;

        aimStick.style.transform =
          'translate(0px, 0px)';
      };

      const updateAim = (e) => {

        const rect =
          aimJoystick
            .getBoundingClientRect();

        const centerX =
          rect.left +
          rect.width / 2;

        const centerY =
          rect.top +
          rect.height / 2;

        let dx =
          e.clientX - centerX;

        let dy =
          e.clientY - centerY;

        const distance =
          Math.hypot(dx, dy);

        if (distance > maxDistance) {

          const scale =
            maxDistance / distance;

          dx *= scale;
          dy *= scale;
        }

        aimStick.style.transform =
          `translate(${dx}px, ${dy}px)`;

        const length =
          Math.hypot(dx, dy);

        // Hindari noise di tengah joystick
        if (length > 5) {

          this.mobileAim.x =
            dx / length;

          this.mobileAim.y =
            dy / length;
        }
      };

      aimJoystick.addEventListener(
        'pointerdown',
        (e) => {

          e.preventDefault();

          if (aimPointerId !== null) {
            return;
          }

          aimPointerId =
            e.pointerId;

          aimJoystick
            .setPointerCapture?.(
              e.pointerId
            );

          updateAim(e);
        }
      );

      aimJoystick.addEventListener(
        'pointermove',
        (e) => {

          if (
            e.pointerId !==
            aimPointerId
          ) {
            return;
          }

          e.preventDefault();

          updateAim(e);
        }
      );

      aimJoystick.addEventListener(
        'pointerup',
        (e) => {

          if (
            e.pointerId !==
            aimPointerId
          ) {
            return;
          }

          resetAim();
        }
      );

      aimJoystick.addEventListener(
        'pointercancel',
        resetAim
      );
    }

    // =========================
    // PAUSE
    // =========================

    if (pauseButton) {

      pauseButton.addEventListener(
        'pointerdown',
        (e) => {

          e.preventDefault();

          this.justPressed.Escape = true;
        }
      );
    }

    // =========================
    // FIRE
    // =========================

    if (fireButton) {

      fireButton.addEventListener(
        'pointerdown',
        (e) => {

          e.preventDefault();

          this.mouseDown = true;

          fireButton
            .setPointerCapture?.(
              e.pointerId
            );
        }
      );

      fireButton.addEventListener(
        'pointerup',
        () => {

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

    // =========================
    // RESET
    // =========================

    window.addEventListener(
      'blur',
      () => {

        this.mobileMove.x = 0;
        this.mobileMove.y = 0;

        this.mouseDown = false;
      }
    );

    document.addEventListener(
      'visibilitychange',
      () => {

        if (document.hidden) {

          this.mobileMove.x = 0;
          this.mobileMove.y = 0;

          this.mouseDown = false;
        }
      }
    );
  }

  // =====================================================
  // HELPERS
  // =====================================================

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