// Boss.js
// ASTER — THE CORRUPTED WARDEN
//
// STEP 1 FOUNDATION
// -----------------
// Boss sekarang punya fondasi pertarungan final yang benar-benar terpisah
// dari enemy biasa:
//
// 1. SEAL_LOCKED
//    - Aster dilindungi barrier Seventh Seal.
//    - Damage = 0.
//    - Stun tidak bekerja.
//    - Step 2 nanti akan menyambungkan 3 Seal Node ke state ini.
//
// 2. STAGGER
//    - Barrier pecah.
//    - Aster diam sebentar.
//
// 3. VULNERABLE
//    - Jendela burst damage.
//    - Damage player mendapat bonus.
//
// 4. HUNT
//    - Aster mengejar player sangat cepat.
//    - Sudah bisa menerima damage.
//
// 5. ENRAGED
//    - Aktif otomatis ketika HP <= 33%.
//    - Kecepatan + attack rate naik tajam.
//
// Agar Step 1 tetap bisa dites tanpa soft-lock, ada temporary fallback:
// barrier pecah otomatis setelah beberapa detik.
// STEP 2 akan mematikan fallback tersebut saat Seal Node sungguhan dipasang.

import { Enemy } from './Enemy.js';
import { BossProjectile } from './BossProjectile.js';
import { assetLoader } from '../core/AssetLoader.js';
import { soundManager } from '../core/SoundManager.js';

const STATE = {
  SEAL_LOCKED: 'seal_locked',
  STAGGER: 'stagger',
  VULNERABLE: 'vulnerable',
  HUNT: 'hunt',
  ENRAGED: 'enraged',
};

export class Boss extends Enemy {
  constructor(x, y) {
    super(x, y, 'melee');

    // =====================================================
    // IDENTITY / BASE STATS
    // =====================================================
    this.size = 70;
    this.color = '#7c3aed';

    // Combat v2 punya damage yang jauh lebih besar dari prototype lama.
    // 60 HP sudah terlalu cepat habis, jadi fondasi boss dinaikkan.
    this.maxHp = 180;
    this.hp = this.maxHp;

    this.scoreValue = 1000;

    this.baseSpeed = 185;
    this.enragedSpeed = 285;
    this.speed = this.baseSpeed;

    this.attackDamage = 2;
    this.attackCooldown = 0.72;
    this.attackTimer = 0;

    // =====================================================
    // BOSS STATE
    // =====================================================
    this.state = STATE.SEAL_LOCKED;
    this.stateTimer = 0;

    this.vulnerableDuration = 5.5;
    this.staggerDuration = 1.15;

    // Damage masuk pada state yang memang boleh menerima damage.
    this.damageMultiplier = {
      [STATE.SEAL_LOCKED]: 0,
      [STATE.STAGGER]: 0,
      [STATE.VULNERABLE]: 1.75,
      [STATE.HUNT]: 1,
      [STATE.ENRAGED]: 1,
    };

    // =====================================================
    // SEVENTH SEAL MECHANISM FOUNDATION
    // =====================================================
    this.shieldActive = true;

    this.mechanismProgress = 0;
    this.mechanismRequired = 3;

    // Step 1-only fallback supaya boss masih bisa dites sekarang.
    // Step 2 akan call enableExternalMechanism().
    this.temporaryFallbackEnabled = true;
    this.temporaryUnlockTimer = 6.5;

    // Threshold untuk barrier kembali aktif.
    // Jadi final boss nantinya bisa punya beberapa mechanic cycle.
    this.sealThresholds = [
      0.66,
      0.33,
    ];

    this.triggeredThresholds = new Set();

    // =====================================================
    // VISUAL FEEDBACK
    // =====================================================
    this.shieldPulse = 0;
    this.stateFlashTimer = 0;

    // =====================================================
    // STEP 3 — BRUTAL ATTACK AI
    // =====================================================
    //
    // combatAction sengaja dipisah dari state boss utama.
    // Jadi Step 2 tetap bisa membaca:
    // seal_locked / vulnerable / hunt / enraged.
    this.combatAction = 'idle';
    this.combatActionTimer = 0;
    this.combatActionDuration = 0;

    this.attackDecisionTimer = 0.65;

    this.lockedAttackAngle = 0;

    this.teleportTargetX = this.x;
    this.teleportTargetY = this.y;

    this.dashSpeed = 0;
    this.dashHitDone = false;

    this.lastSpecialAttack = null;
    this.comboRemaining = 0;

    this.attackImpactTimer = 0;
    this.attackImpactKind = '';

    this.contactAttackTimer = 0;

    // Fairness layer:
    // saat player sedang menyelesaikan mekanisme Seal Node,
    // Aster harus tetap berbahaya tetapi tidak menempel tanpa henti.
    this.sealNodeGraceTimer = 0;

    // Attack damage khusus.
    this.dashDamage = 2;
    this.teleportDamage = 2;
    this.slamDamage = 2;
  }

  // =====================================================
  // PUBLIC API UNTUK STEP 2
  // =====================================================

  enableExternalMechanism(required = 3) {
    this.mechanismRequired = Math.max(1, required);
    this.mechanismProgress = 0;

    // Begitu mechanism sungguhan aktif, auto-unlock demo dimatikan.
    this.temporaryFallbackEnabled = false;
  }

  setMechanismProgress(progress, required = this.mechanismRequired) {
    this.temporaryFallbackEnabled = false;

    this.mechanismRequired = Math.max(1, required);

    const previousProgress =
      this.mechanismProgress;

    this.mechanismProgress = Math.max(
      0,
      Math.min(
        progress,
        this.mechanismRequired
      )
    );

    // Setiap Seal Node selesai, player mendapat waktu singkat
    // untuk berpindah ke node berikutnya.
    if (
      this.shieldActive &&
      this.mechanismProgress > previousProgress &&
      this.mechanismProgress < this.mechanismRequired
    ) {
      this.sealNodeGraceTimer = 1.15;

      this._resetCombatAction();

      // Jeda sesudah node selesai tidak dihitung sebagai combo.
      this.comboRemaining = 0;
      this.attackDecisionTimer = 1.15;
    }

    if (
      this.shieldActive &&
      this.mechanismProgress >= this.mechanismRequired
    ) {
      this.breakShield();
    }
  }

  addMechanismProgress(amount = 1) {
    this.setMechanismProgress(
      this.mechanismProgress + amount,
      this.mechanismRequired
    );
  }

  resetMechanismProgress(required = this.mechanismRequired) {
    this.mechanismRequired = Math.max(1, required);
    this.mechanismProgress = 0;
  }

  isShielded() {
    return this.shieldActive;
  }

  isVulnerable() {
    return this.state === STATE.VULNERABLE;
  }

  getState() {
    return this.state;
  }

  getMechanismProgress() {
    return {
      current: this.mechanismProgress,
      required: this.mechanismRequired,
      shieldActive: this.shieldActive,
    };
  }

  // =====================================================
  // SHIELD / PHASE CONTROL
  // =====================================================

  activateShield({
    resetProgress = true,
  } = {}) {
    if (this.dead) return;

    this.shieldActive = true;
    this.state = STATE.SEAL_LOCKED;
    this.stateTimer = 0;

    this.speed =
      this.hp / this.maxHp <= 0.33
        ? this.enragedSpeed
        : this.baseSpeed;

    if (resetProgress) {
      this.mechanismProgress = 0;
    }

    if (this.temporaryFallbackEnabled) {
      this.temporaryUnlockTimer =
        this.hp / this.maxHp <= 0.33
          ? 4.4
          : 6.5;
    }

    this.stateFlashTimer = 0.35;

    this._resetCombatAction();

    soundManager.play('bossRoar');
  }

  breakShield() {
    if (
      this.dead ||
      !this.shieldActive
    ) {
      return;
    }

    this.shieldActive = false;

    this.state = STATE.STAGGER;
    this.stateTimer = this.staggerDuration;

    this.stateFlashTimer = 0.55;

    this._resetCombatAction();

    soundManager.play('bossVulnerable');
  }

  _enterVulnerable() {
    this.state = STATE.VULNERABLE;
    this.stateTimer = this.vulnerableDuration;

    this.speed = 0;
    this.stateFlashTimer = 0.28;

    this._resetCombatAction();
  }

  _enterHunt() {
    const hpRatio =
      this.hp / this.maxHp;

    if (hpRatio <= 0.33) {
      this.state = STATE.ENRAGED;
      this.speed = this.enragedSpeed;

      this.attackDamage = 3;
      this.attackCooldown = 0.42;
    } else {
      this.state = STATE.HUNT;
      this.speed = this.baseSpeed;

      this.attackDamage = 2;
      this.attackCooldown = 0.72;
    }

    this.stateTimer = 0;

    this._resetCombatAction();

    this.attackDecisionTimer =
      this.state === STATE.ENRAGED
        ? 0.18
        : 0.48;
  }

  // =====================================================
  // DAMAGE / STUN
  // =====================================================

  takeDamage(amount) {
    if (this.dead) return;

    const multiplier =
      this.damageMultiplier[this.state] ?? 1;

    // Barrier / stagger benar-benar invulnerable.
    if (
      this.shieldActive ||
      multiplier <= 0
    ) {
      this.shieldPulse = 0.16;
      soundManager.play('enemyHit');
      return;
    }

    this.hitFlashTimer = 0.09;

    const effectiveAmount =
      amount * multiplier;

    this.hp -= effectiveAmount;

    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;

      soundManager.play('enemyDeath');
      return;
    }

    soundManager.play('enemyHit');

    this._checkSealThresholds();
  }

  applyStun(duration) {
    if (
      !duration ||
      duration <= 0 ||
      this.shieldActive ||
      this.state === STATE.STAGGER
    ) {
      return;
    }

    // Boss tetap punya resistensi kuat.
    // Vulnerable lebih mudah dikontrol daripada Hunt/Enraged.
    const resistance =
      this.state === STATE.VULNERABLE
        ? 0.45
        : 0.18;

    this.stunTimer = Math.max(
      this.stunTimer,
      duration * resistance
    );
  }

  _checkSealThresholds() {
    const hpRatio =
      this.hp / this.maxHp;

    for (
      const threshold of this.sealThresholds
    ) {
      if (
        hpRatio <= threshold &&
        !this.triggeredThresholds.has(threshold)
      ) {
        this.triggeredThresholds.add(threshold);

        this.activateShield({
          resetProgress: true,
        });

        break;
      }
    }
  }

  // =====================================================
  // UPDATE
  // =====================================================

  update(
    dt,
    player,
    others,
    enemyProjectiles,
    tileMap
  ) {
    this._updateTimers(dt);

    if (this.dead) {
      return;
    }

    // Temporary Step 1 fallback.
    // Step 2 mematikannya lewat enableExternalMechanism().
    if (
      this.state === STATE.SEAL_LOCKED &&
      this.temporaryFallbackEnabled
    ) {
      this.temporaryUnlockTimer -= dt;

      if (
        this.temporaryUnlockTimer <= 0
      ) {
        this.breakShield();
        return;
      }
    }

    // Stagger setelah barrier pecah.
    if (
      this.state === STATE.STAGGER
    ) {
      this.stateTimer -= dt;

      if (
        this.stateTimer <= 0
      ) {
        this._enterVulnerable();
      }

      return;
    }

    // Monk stun hanya bekerja saat shield tidak aktif.
    if (
      this.stunTimer > 0
    ) {
      this.stunTimer =
        Math.max(
          0,
          this.stunTimer - dt
        );

      return;
    }

    // Vulnerable = burst window.
    if (
      this.state === STATE.VULNERABLE
    ) {
      this.stateTimer -= dt;

      if (
        this.stateTimer <= 0
      ) {
        this._enterHunt();
      }

      return;
    }

    // SEAL_LOCKED / HUNT / ENRAGED:
    // semuanya sekarang memakai Brutal Attack AI.
    this._updateBrutalCombat(
      dt,
      player,
      enemyProjectiles,
      tileMap
    );
  }

  _updateTimers(dt) {
    if (
      this.hitFlashTimer > 0
    ) {
      this.hitFlashTimer =
        Math.max(
          0,
          this.hitFlashTimer - dt
        );
    }

    if (
      this.shieldPulse > 0
    ) {
      this.shieldPulse =
        Math.max(
          0,
          this.shieldPulse - dt
        );
    }

    if (
      this.stateFlashTimer > 0
    ) {
      this.stateFlashTimer =
        Math.max(
          0,
          this.stateFlashTimer - dt
        );
    }

    if (
      this.attackImpactTimer > 0
    ) {
      this.attackImpactTimer =
        Math.max(
          0,
          this.attackImpactTimer - dt
        );
    }

    if (
      this.contactAttackTimer > 0
    ) {
      this.contactAttackTimer =
        Math.max(
          0,
          this.contactAttackTimer - dt
        );
    }

    if (
      this.sealNodeGraceTimer > 0
    ) {
      this.sealNodeGraceTimer =
        Math.max(
          0,
          this.sealNodeGraceTimer - dt
        );
    }
  }

  _resetCombatAction() {
    this.combatAction = 'idle';
    this.combatActionTimer = 0;
    this.combatActionDuration = 0;

    this.dashHitDone = false;

    this.comboRemaining = 0;
    this.attackDecisionTimer = 0.45;
  }

  _isEnragedPressure() {
    return (
      this.state === STATE.ENRAGED ||
      this.hp / this.maxHp <= 0.33
    );
  }

  _updateBrutalCombat(
    dt,
    player,
    enemyProjectiles,
    tileMap
  ) {
    // Setelah Seal Node selesai:
    // Aster benar-benar berhenti sebentar agar player bisa rotasi.
    if (
      this.shieldActive &&
      this.sealNodeGraceTimer > 0
    ) {
      return;
    }

    if (
      this.combatAction !== 'idle'
    ) {
      this._updateCombatAction(
        dt,
        player,
        enemyProjectiles,
        tileMap
      );

      return;
    }

    this.attackDecisionTimer -= dt;

    // =====================================================
    // SHIELDED MODE
    // =====================================================
    // Saat player mengurus pilar, jangan kejar nonstop.
    // Aster hanya mendekat kalau terlalu jauh, lalu memberi ruang.
    if (this.shieldActive) {
      const dist =
        Math.hypot(
          player.x - this.x,
          player.y - this.y
        );

      if (dist > 245) {
        this._chasePlayer(
          dt,
          player,
          tileMap
        );
      }

      if (
        this.attackDecisionTimer > 0
      ) {
        return;
      }

      const attack =
        this._chooseSpecialAttack(
          player
        );

      this._startSpecialAttack(
        attack,
        player,
        tileMap
      );

      return;
    }

    // =====================================================
    // HUNT / ENRAGED
    // =====================================================
    // Di fase combat murni, Aster boleh mengejar aktif.
    this._chasePlayer(
      dt,
      player,
      tileMap
    );

    if (
      this.attackDecisionTimer > 0
    ) {
      return;
    }

    const attack =
      this._chooseSpecialAttack(
        player
      );

    this._startSpecialAttack(
      attack,
      player,
      tileMap
    );
  }

  _chasePlayer(
    dt,
    player,
    tileMap
  ) {
    const dx =
      player.x - this.x;

    const dy =
      player.y - this.y;

    const dist =
      Math.hypot(
        dx,
        dy
      ) || 1;

    // Saat shield aktif, Aster sedikit lebih lambat agar
    // Seal Node tetap manusiawi untuk diselesaikan.
    let chaseSpeed;

    if (this.shieldActive) {
      chaseSpeed =
        this._isEnragedPressure()
          ? 185
          : 120;
    } else {
      chaseSpeed =
        this.state === STATE.ENRAGED
          ? this.enragedSpeed
          : this.baseSpeed;
    }

    const moveX =
      (dx / dist) *
      chaseSpeed *
      dt;

    const moveY =
      (dy / dist) *
      chaseSpeed *
      dt;

    this._moveWithCollision(
      moveX,
      moveY,
      tileMap
    );

    const contactRange =
      this.size / 2 +
      player.size / 2 +
      4;

    if (
      dist <= contactRange &&
      this.contactAttackTimer <= 0
    ) {
      player.takeDamage(
        this._isEnragedPressure()
          ? 3
          : 2
      );

      this.contactAttackTimer =
        this._isEnragedPressure()
          ? 0.42
          : 0.68;
    }
  }

  _chooseSpecialAttack(player) {
    const dist =
      Math.hypot(
        player.x - this.x,
        player.y - this.y
      );

    let pool;

    if (dist < 120) {
      pool = [
        'slam',
        'slam',
        'dash',
        'dash',
        'teleport',
        'burst',
      ];
    } else if (dist > 280) {
      pool = [
        'dash',
        'dash',
        'dash',
        'teleport',
        'teleport',
        'burst',
      ];
    } else {
      pool = [
        'dash',
        'dash',
        'burst',
        'burst',
        'teleport',
        'slam',
      ];
    }

    let attack =
      pool[
        Math.floor(
          Math.random() *
          pool.length
        )
      ];

    // Hindari pola terlalu repetitif.
    if (
      attack ===
      this.lastSpecialAttack &&
      pool.length > 1
    ) {
      attack =
        pool[
          (
            pool.indexOf(
              attack
            ) +
            1 +
            Math.floor(
              Math.random() *
              (pool.length - 1)
            )
          ) %
          pool.length
        ];
    }

    this.lastSpecialAttack =
      attack;

    // Combo chain.
    if (
      this.comboRemaining <= 0 &&
      !this.shieldActive
    ) {
      if (
        this.state === STATE.ENRAGED &&
        Math.random() < 0.42
      ) {
        // Enraged masih bisa combo, tapi bukan setiap saat.
        this.comboRemaining =
          Math.random() < 0.35
            ? 2
            : 1;
      } else if (
        this.state === STATE.HUNT &&
        Math.random() < 0.14
      ) {
        this.comboRemaining = 1;
      }
    }

    return attack;
  }

  _startSpecialAttack(
    attack,
    player,
    tileMap
  ) {
    const enraged =
      this._isEnragedPressure();

    if (attack === 'dash') {
      this.combatAction =
        'dash_telegraph';

      this.combatActionDuration =
        enraged
          ? 0.22
          : this.shieldActive
            ? 0.58
            : 0.34;

      this.combatActionTimer =
        this.combatActionDuration;

      this.lockedAttackAngle =
        Math.atan2(
          player.y - this.y,
          player.x - this.x
        );

      soundManager.play(
        'bossDashCharge'
      );

      return;
    }

    if (attack === 'burst') {
      this.combatAction =
        'burst_telegraph';

      this.combatActionDuration =
        enraged
          ? 0.30
          : this.shieldActive
            ? 0.70
            : 0.44;

      this.combatActionTimer =
        this.combatActionDuration;

      soundManager.play(
        'bossBurstCharge'
      );

      return;
    }

    if (attack === 'slam') {
      this.combatAction =
        'slam_telegraph';

      this.combatActionDuration =
        enraged
          ? 0.40
          : this.shieldActive
            ? 0.82
            : 0.56;

      this.combatActionTimer =
        this.combatActionDuration;

      soundManager.play(
        'bossSlamCharge'
      );

      return;
    }

    // TELEPORT STRIKE
    this.combatAction =
      'teleport_telegraph';

    this.combatActionDuration =
      enraged
        ? 0.28
        : this.shieldActive
          ? 0.68
          : 0.44;

    this.combatActionTimer =
      this.combatActionDuration;

    const target =
      this._findTeleportSpot(
        player,
        tileMap
      );

    this.teleportTargetX =
      target.x;

    this.teleportTargetY =
      target.y;

    soundManager.play(
      'bossTeleportCharge'
    );
  }

  _updateCombatAction(
    dt,
    player,
    enemyProjectiles,
    tileMap
  ) {
    if (
      this.combatAction ===
      'dash_telegraph'
    ) {
      this.combatActionTimer -= dt;

      if (
        this.combatActionTimer <= 0
      ) {
        this._beginDash();
      }

      return;
    }

    if (
      this.combatAction === 'dash'
    ) {
      this._updateDash(
        dt,
        player,
        tileMap
      );

      return;
    }

    if (
      this.combatAction ===
      'burst_telegraph'
    ) {
      this.combatActionTimer -= dt;

      if (
        this.combatActionTimer <= 0
      ) {
        this._fireRuneBurst(
          player,
          enemyProjectiles
        );
      }

      return;
    }

    if (
      this.combatAction ===
      'slam_telegraph'
    ) {
      this.combatActionTimer -= dt;

      if (
        this.combatActionTimer <= 0
      ) {
        this._groundRupture(
          player,
          enemyProjectiles
        );
      }

      return;
    }

    if (
      this.combatAction ===
      'teleport_telegraph'
    ) {
      this.combatActionTimer -= dt;

      if (
        this.combatActionTimer <= 0
      ) {
        this.x =
          this.teleportTargetX;

        this.y =
          this.teleportTargetY;

        this.combatAction =
          'teleport_strike';

        this.combatActionDuration =
          this._isEnragedPressure()
            ? 0.11
            : 0.17;

        this.combatActionTimer =
          this.combatActionDuration;

        soundManager.play(
          'bossTeleport'
        );
      }

      return;
    }

    if (
      this.combatAction ===
      'teleport_strike'
    ) {
      this.combatActionTimer -= dt;

      if (
        this.combatActionTimer <= 0
      ) {
        this._performTeleportStrike(
          player,
          enemyProjectiles
        );
      }

      return;
    }

    if (
      this.combatAction ===
      'recovery'
    ) {
      this.combatActionTimer -= dt;

      if (
        this.combatActionTimer <= 0
      ) {
        this._finishSpecialAttack();
      }
    }
  }

  _beginDash() {
    const enraged =
      this._isEnragedPressure();

    this.combatAction = 'dash';

    this.combatActionDuration =
      enraged
        ? 0.17
        : 0.20;

    this.combatActionTimer =
      this.combatActionDuration;

    this.dashSpeed =
      enraged
        ? 1320
        : 940;

    this.dashDamage =
      enraged
        ? 3
        : 2;

    this.dashHitDone = false;

    soundManager.play(
      'bossDash'
    );
  }

  _updateDash(
    dt,
    player,
    tileMap
  ) {
    const expectedStep =
      this.dashSpeed *
      dt;

    const beforeX = this.x;
    const beforeY = this.y;

    this._moveWithCollision(
      Math.cos(
        this.lockedAttackAngle
      ) *
      expectedStep,
      Math.sin(
        this.lockedAttackAngle
      ) *
      expectedStep,
      tileMap
    );

    const moved =
      Math.hypot(
        this.x - beforeX,
        this.y - beforeY
      );

    const hitDistance =
      this.size / 2 +
      player.size / 2 +
      24;

    if (
      !this.dashHitDone &&
      Math.hypot(
        player.x - this.x,
        player.y - this.y
      ) <=
      hitDistance
    ) {
      player.takeDamage(
        this.dashDamage
      );

      this.dashHitDone = true;

      this.attackImpactTimer =
        0.24;

      this.attackImpactKind =
        'dash';
    }

    this.combatActionTimer -= dt;

    // Hentikan dash lebih awal kalau menabrak dinding.
    if (
      moved <
      expectedStep *
      0.25
    ) {
      this.combatActionTimer = 0;
    }

    if (
      this.combatActionTimer <= 0
    ) {
      this._beginRecovery(
        this._isEnragedPressure()
          ? 0.08
          : 0.16
      );
    }
  }

  _fireRuneBurst(
    player,
    enemyProjectiles
  ) {
    const enraged =
      this._isEnragedPressure();

    const radialCount =
      enraged
        ? 16
        : this.shieldActive
          ? 8
          : 11;

    const aimedCount =
      enraged
        ? 5
        : this.shieldActive
          ? 2
          : 3;

    const speed =
      enraged
        ? 460
        : this.shieldActive
          ? 330
          : 385;

    const offset =
      Math.random() *
      Math.PI;

    // Full radial burst.
    for (
      let i = 0;
      i < radialCount;
      i++
    ) {
      const angle =
        offset +
        (
          Math.PI *
          2 *
          i
        ) /
        radialCount;

      enemyProjectiles.push(
        new BossProjectile(
          this.x,
          this.y,
          angle,
          {
            speed,
            damage: 1,
            radius:
              enraged
                ? 9
                : 8,
            lifeTime: 2.5,
            style: 'rune',
            color:
              enraged
                ? '#ef4444'
                : '#a855f7',
            coreColor:
              '#f5f3ff',
          }
        )
      );
    }

    // Fan aimed at current player position.
    const aim =
      Math.atan2(
        player.y - this.y,
        player.x - this.x
      );

    const spread =
      enraged
        ? 0.18
        : 0.24;

    for (
      let i = 0;
      i < aimedCount;
      i++
    ) {
      const center =
        (aimedCount - 1) / 2;

      const angle =
        aim +
        (i - center) *
        spread;

      enemyProjectiles.push(
        new BossProjectile(
          this.x,
          this.y,
          angle,
          {
            speed:
              speed + 55,
            damage: 1,
            radius: 8,
            lifeTime: 2.2,
            style: 'rune',
            color: '#7c3aed',
            coreColor: '#ffffff',
          }
        )
      );
    }

    this.attackImpactTimer =
      0.30;

    this.attackImpactKind =
      'burst';

    soundManager.play(
      'bossBurst'
    );

    this._beginRecovery(
      enraged
        ? 0.08
        : 0.20
    );
  }

  _groundRupture(
    player,
    enemyProjectiles
  ) {
    const enraged =
      this._isEnragedPressure();

    const radius =
      enraged
        ? 172
        : 142;

    this.slamDamage =
      enraged
        ? 3
        : 2;

    if (
      Math.hypot(
        player.x - this.x,
        player.y - this.y
      ) <=
      radius +
      player.size / 2
    ) {
      player.takeDamage(
        this.slamDamage
      );
    }

    const count =
      enraged
        ? 18
        : 12;

    const speed =
      enraged
        ? 345
        : 270;

    for (
      let i = 0;
      i < count;
      i++
    ) {
      const angle =
        (
          Math.PI *
          2 *
          i
        ) /
        count;

      enemyProjectiles.push(
        new BossProjectile(
          this.x,
          this.y,
          angle,
          {
            speed,
            damage: 1,
            radius:
              enraged
                ? 10
                : 9,
            lifeTime: 1.75,
            style: 'shock',
            color:
              enraged
                ? '#f97316'
                : '#8b5cf6',
            coreColor:
              '#ffffff',
          }
        )
      );
    }

    this.attackImpactTimer =
      0.38;

    this.attackImpactKind =
      'slam';

    soundManager.play(
      'bossSlam'
    );

    this._beginRecovery(
      enraged
        ? 0.10
        : 0.24
    );
  }

  _findTeleportSpot(
    player,
    tileMap
  ) {
    const half =
      this.size / 2;

    const base =
      Math.random() *
      Math.PI *
      2;

    const distances = [
      105,
      135,
      165,
    ];

    // Coba beberapa posisi di sekitar player.
    for (
      let ring = 0;
      ring <
      distances.length;
      ring++
    ) {
      const distance =
        distances[ring];

      for (
        let i = 0;
        i < 8;
        i++
      ) {
        const angle =
          base +
          (
            Math.PI *
            2 *
            i
          ) /
          8;

        const x =
          player.x +
          Math.cos(angle) *
          distance;

        const y =
          player.y +
          Math.sin(angle) *
          distance;

        if (
          !tileMap ||
          !this._blockedAt(
            x,
            y,
            half,
            tileMap
          )
        ) {
          return {
            x,
            y,
          };
        }
      }
    }

    // Fallback aman: tetap di posisi sekarang.
    return {
      x: this.x,
      y: this.y,
    };
  }

  _performTeleportStrike(
    player,
    enemyProjectiles
  ) {
    const enraged =
      this._isEnragedPressure();

    const radius =
      enraged
        ? 112
        : 88;

    this.teleportDamage =
      enraged
        ? 3
        : 2;

    if (
      Math.hypot(
        player.x - this.x,
        player.y - this.y
      ) <=
      radius +
      player.size / 2
    ) {
      player.takeDamage(
        this.teleportDamage
      );
    }

    const projectileCount =
      enraged
        ? 12
        : 8;

    for (
      let i = 0;
      i <
      projectileCount;
      i++
    ) {
      const angle =
        (
          Math.PI *
          2 *
          i
        ) /
        projectileCount;

      enemyProjectiles.push(
        new BossProjectile(
          this.x,
          this.y,
          angle,
          {
            speed:
              enraged
                ? 420
                : 330,
            damage: 1,
            radius: 8,
            lifeTime: 1.7,
            style: 'rune',
            color:
              enraged
                ? '#ef4444'
                : '#c026d3',
            coreColor:
              '#ffffff',
          }
        )
      );
    }

    this.attackImpactTimer =
      0.32;

    this.attackImpactKind =
      'teleport';

    soundManager.play(
      'bossTeleportStrike'
    );

    this._beginRecovery(
      enraged
        ? 0.07
        : 0.18
    );
  }

  _beginRecovery(duration) {
    this.combatAction =
      'recovery';

    this.combatActionDuration =
      duration;

    this.combatActionTimer =
      duration;
  }

  _finishSpecialAttack() {
    this.combatAction = 'idle';

    if (
      this.comboRemaining > 0
    ) {
      this.comboRemaining -= 1;

      // Combo nyaris tanpa jeda.
      this.attackDecisionTimer =
        this._isEnragedPressure()
          ? 0.18
          : 0.26;

      return;
    }

    if (this.shieldActive) {
      // SHIELDED:
      // pilar adalah objective utama, jadi ada global cooldown nyata.
      this.attackDecisionTimer =
        this._isEnragedPressure()
          ? 1.05
          : 1.55;

      return;
    }

    // HUNT / ENRAGED:
    // masih brutal, tapi tidak lagi chain tanpa napas.
    this.attackDecisionTimer =
      this.state === STATE.ENRAGED
        ? 0.48
        : 0.78;
  }

  _attackTelegraphProgress() {
    if (
      this.combatActionDuration <= 0
    ) {
      return 0;
    }

    return Math.max(
      0,
      Math.min(
        1,
        1 -
        this.combatActionTimer /
        this.combatActionDuration
      )
    );
  }

  _getAttackLabel() {
    const labels = {
      dash_telegraph:
        'DASH CHARGE',
      dash:
        'DASH SLASH',
      burst_telegraph:
        'RUNE BURST',
      slam_telegraph:
        'GROUND RUPTURE',
      teleport_telegraph:
        'BLINK TARGET',
      teleport_strike:
        'TELEPORT STRIKE',
    };

    return (
      labels[
        this.combatAction
      ] ??
      ''
    );
  }

  _drawAttackTelegraph(
    ctx,
    camera
  ) {
    const progress =
      this._attackTelegraphProgress();

    const screen =
      camera.worldToScreen(
        this.x,
        this.y
      );

    // ===============================================
    // DASH — locked direction line
    // ===============================================
    if (
      this.combatAction ===
      'dash_telegraph'
    ) {
      const length =
        this._isEnragedPressure()
          ? 360
          : 300;

      const endWorldX =
        this.x +
        Math.cos(
          this.lockedAttackAngle
        ) *
        length;

      const endWorldY =
        this.y +
        Math.sin(
          this.lockedAttackAngle
        ) *
        length;

      const end =
        camera.worldToScreen(
          endWorldX,
          endWorldY
        );

      ctx.save();

      ctx.lineCap = 'round';

      // Outer danger line.
      ctx.globalAlpha =
        0.22 +
        progress * 0.36;

      ctx.strokeStyle =
        this._isEnragedPressure()
          ? '#ef4444'
          : '#a855f7';

      ctx.lineWidth =
        20 +
        progress * 10;

      ctx.shadowBlur = 24;
      ctx.shadowColor =
        ctx.strokeStyle;

      ctx.beginPath();
      ctx.moveTo(
        screen.x,
        screen.y
      );
      ctx.lineTo(
        end.x,
        end.y
      );
      ctx.stroke();

      // White center line.
      ctx.globalAlpha =
        0.75 +
        progress * 0.25;

      ctx.strokeStyle =
        '#ffffff';

      ctx.lineWidth =
        3 +
        progress * 3;

      ctx.beginPath();
      ctx.moveTo(
        screen.x,
        screen.y
      );
      ctx.lineTo(
        end.x,
        end.y
      );
      ctx.stroke();

      ctx.restore();
    }

    // Dash afterimages.
    if (
      this.combatAction === 'dash'
    ) {
      const sprite =
        assetLoader.get('boss');

      if (sprite) {
        ctx.save();

        for (
          let i = 1;
          i <= 3;
          i++
        ) {
          const ghost =
            camera.worldToScreen(
              this.x -
              Math.cos(
                this.lockedAttackAngle
              ) *
              i *
              28,
              this.y -
              Math.sin(
                this.lockedAttackAngle
              ) *
              i *
              28
            );

          ctx.globalAlpha =
            0.22 /
            i;

          ctx.filter =
            'hue-rotate(260deg) brightness(1.5)';

          ctx.drawImage(
            sprite,
            ghost.x -
            this.size / 2,
            ghost.y -
            this.size / 2,
            this.size,
            this.size
          );
        }

        ctx.restore();
      }
    }

    // ===============================================
    // RUNE BURST
    // ===============================================
    if (
      this.combatAction ===
      'burst_telegraph'
    ) {
      const r =
        40 +
        progress * 38;

      ctx.save();

      ctx.translate(
        screen.x,
        screen.y
      );

      ctx.rotate(
        performance.now() *
        0.0014
      );

      ctx.shadowBlur = 24;
      ctx.shadowColor = '#a855f7';

      for (
        let ring = 0;
        ring < 3;
        ring++
      ) {
        ctx.globalAlpha =
          0.48 +
          progress * 0.18;

        ctx.strokeStyle =
          ring === 0
            ? '#ffffff'
            : ring === 1
              ? '#c4b5fd'
              : '#a855f7';

        ctx.lineWidth =
          5 - ring;

        ctx.beginPath();

        ctx.arc(
          0,
          0,
          r -
          ring * 11,
          0,
          Math.PI * 2
        );

        ctx.stroke();
      }

      for (
        let i = 0;
        i < 12;
        i++
      ) {
        const a =
          (
            Math.PI *
            2 *
            i
          ) /
          12;

        ctx.globalAlpha =
          0.45 +
          progress * 0.4;

        ctx.strokeStyle =
          i % 2 === 0
            ? '#ffffff'
            : '#a78bfa';

        ctx.lineWidth =
          i % 2 === 0
            ? 4
            : 2;

        ctx.beginPath();

        ctx.moveTo(
          Math.cos(a) *
          (r - 12),
          Math.sin(a) *
          (r - 12)
        );

        ctx.lineTo(
          Math.cos(a) *
          (r + 18),
          Math.sin(a) *
          (r + 18)
        );

        ctx.stroke();
      }

      ctx.restore();
    }

    // ===============================================
    // GROUND RUPTURE
    // ===============================================
    if (
      this.combatAction ===
      'slam_telegraph'
    ) {
      const dangerRadius =
        this._isEnragedPressure()
          ? 172
          : 142;

      const drawRadius =
        dangerRadius *
        (
          0.62 +
          progress * 0.38
        );

      ctx.save();

      ctx.globalAlpha =
        0.10 +
        progress * 0.20;

      ctx.fillStyle =
        this._isEnragedPressure()
          ? '#ef4444'
          : '#7c3aed';

      ctx.beginPath();

      ctx.arc(
        screen.x,
        screen.y,
        drawRadius,
        0,
        Math.PI * 2
      );

      ctx.fill();

      ctx.globalAlpha =
        0.55 +
        progress * 0.35;

      ctx.strokeStyle =
        progress > 0.72
          ? '#ffffff'
          : '#f97316';

      ctx.lineWidth =
        5 +
        progress * 5;

      ctx.shadowBlur = 22;
      ctx.shadowColor =
        '#f97316';

      ctx.beginPath();

      ctx.arc(
        screen.x,
        screen.y,
        drawRadius,
        0,
        Math.PI * 2
      );

      ctx.stroke();

      // Cracks.
      for (
        let i = 0;
        i < 10;
        i++
      ) {
        const a =
          (
            Math.PI *
            2 *
            i
          ) /
          10;

        ctx.beginPath();

        ctx.moveTo(
          screen.x +
          Math.cos(a) *
          drawRadius *
          0.32,
          screen.y +
          Math.sin(a) *
          drawRadius *
          0.32
        );

        ctx.lineTo(
          screen.x +
          Math.cos(a + 0.05) *
          drawRadius *
          0.70,
          screen.y +
          Math.sin(a + 0.05) *
          drawRadius *
          0.70
        );

        ctx.stroke();
      }

      ctx.restore();
    }

    // ===============================================
    // TELEPORT TARGET
    // ===============================================
    if (
      this.combatAction ===
      'teleport_telegraph'
    ) {
      const target =
        camera.worldToScreen(
          this.teleportTargetX,
          this.teleportTargetY
        );

      const r =
        68 -
        progress * 20;

      ctx.save();

      ctx.shadowBlur = 25;
      ctx.shadowColor = '#c026d3';

      ctx.globalAlpha =
        0.55 +
        progress * 0.38;

      ctx.strokeStyle =
        progress > 0.72
          ? '#ffffff'
          : '#e879f9';

      ctx.lineWidth =
        6 +
        progress * 4;

      ctx.beginPath();

      ctx.arc(
        target.x,
        target.y,
        r,
        0,
        Math.PI * 2
      );

      ctx.stroke();

      // Cross.
      ctx.beginPath();

      ctx.moveTo(
        target.x - r,
        target.y
      );

      ctx.lineTo(
        target.x + r,
        target.y
      );

      ctx.moveTo(
        target.x,
        target.y - r
      );

      ctx.lineTo(
        target.x,
        target.y + r
      );

      ctx.stroke();

      // Link from Aster to target.
      ctx.globalAlpha *= 0.35;
      ctx.lineWidth = 3;

      ctx.beginPath();

      ctx.moveTo(
        screen.x,
        screen.y
      );

      ctx.lineTo(
        target.x,
        target.y
      );

      ctx.stroke();

      ctx.restore();
    }

    if (
      this.combatAction ===
      'teleport_strike'
    ) {
      const r =
        38 +
        progress * 58;

      ctx.save();

      ctx.globalAlpha =
        1 - progress * 0.5;

      ctx.strokeStyle =
        '#ffffff';

      ctx.lineWidth = 8;

      ctx.shadowBlur = 30;
      ctx.shadowColor = '#d946ef';

      ctx.beginPath();

      ctx.arc(
        screen.x,
        screen.y,
        r,
        0,
        Math.PI * 2
      );

      ctx.stroke();

      ctx.restore();
    }

    // ===============================================
    // AFTER-IMPACT RING
    // ===============================================
    if (
      this.attackImpactTimer > 0
    ) {
      const p =
        1 -
        this.attackImpactTimer /
        (
          this.attackImpactKind ===
          'slam'
            ? 0.38
            : 0.32
        );

      const r =
        22 +
        p *
        (
          this.attackImpactKind ===
          'slam'
            ? 150
            : 90
        );

      ctx.save();

      ctx.globalAlpha =
        Math.max(
          0,
          1 - p
        ) *
        0.72;

      ctx.strokeStyle =
        this.attackImpactKind ===
        'slam'
          ? '#f97316'
          : this.attackImpactKind ===
            'dash'
            ? '#ef4444'
            : '#d946ef';

      ctx.lineWidth =
        8 *
        (
          1 - p
        ) +
        2;

      ctx.shadowBlur = 22;
      ctx.shadowColor =
        ctx.strokeStyle;

      ctx.beginPath();

      ctx.arc(
        screen.x,
        screen.y,
        r,
        0,
        Math.PI * 2
      );

      ctx.stroke();

      ctx.restore();
    }
  }

  // =====================================================
  // DRAW
  // =====================================================

  draw(ctx, camera) {
    const screen =
      camera.worldToScreen(
        this.x,
        this.y
      );

    const hpRatio =
      this.hp / this.maxHp;

    // =============================
    // BOSS HP BAR
    // =============================
    const barWidth = 180;
    const barHeight = 10;

    const barX =
      screen.x -
      barWidth / 2;

    const barY =
      screen.y -
      this.size / 2 -
      46;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(
      barX,
      barY,
      barWidth,
      barHeight
    );

    ctx.fillStyle =
      hpRatio > 0.66
        ? '#ef4444'
        : hpRatio > 0.33
          ? '#f97316'
          : '#a855f7';

    ctx.fillRect(
      barX,
      barY,
      barWidth * hpRatio,
      barHeight
    );

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;

    ctx.strokeRect(
      barX,
      barY,
      barWidth,
      barHeight
    );

    // =============================
    // SHIELD PROGRESS BAR
    // =============================
    if (this.shieldActive) {
      const shieldRatio =
        Math.min(
          1,
          this.mechanismProgress /
          this.mechanismRequired
        );

      const shieldY =
        barY + 14;

      ctx.fillStyle =
        '#111827';

      ctx.fillRect(
        barX,
        shieldY,
        barWidth,
        7
      );

      ctx.fillStyle =
        '#60a5fa';

      ctx.fillRect(
        barX,
        shieldY,
        barWidth * shieldRatio,
        7
      );

      ctx.strokeStyle =
        '#93c5fd';

      ctx.lineWidth = 1;

      ctx.strokeRect(
        barX,
        shieldY,
        barWidth,
        7
      );
    }

    // =============================
    // BOSS SPRITE
    // =============================
    const sprite =
      assetLoader.get('boss');

    let stateColor = '#a855f7';

    if (
      this.state === STATE.VULNERABLE ||
      this.state === STATE.STAGGER
    ) {
      stateColor = '#facc15';
    }

    if (this.state === STATE.ENRAGED) {
      stateColor = '#ef4444';
    }

    if (this.shieldActive) {
      stateColor = '#60a5fa';
    }

    ctx.save();

    ctx.shadowColor = stateColor;

    ctx.shadowBlur =
      this.shieldActive
        ? 32
        : 24;

    if (sprite) {
      ctx.drawImage(
        sprite,
        screen.x - this.size / 2,
        screen.y - this.size / 2,
        this.size,
        this.size
      );
    } else {
      ctx.fillStyle = stateColor;

      ctx.fillRect(
        screen.x - this.size / 2,
        screen.y - this.size / 2,
        this.size,
        this.size
      );
    }

    ctx.restore();

    // =============================
    // SEVENTH SEAL BARRIER
    // =============================
    if (this.shieldActive) {
      const pulse =
        1 +
        Math.sin(
          performance.now() * 0.008
        ) * 0.05;

      const shieldRadius =
        (
          this.size * 0.72 +
          16
        ) *
        pulse;

      ctx.save();

      ctx.globalAlpha =
        this.shieldPulse > 0
          ? 0.98
          : 0.68;

      ctx.shadowBlur = 22;
      ctx.shadowColor = '#60a5fa';

      // Outer ring.
      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth =
        this.shieldPulse > 0
          ? 8
          : 5;

      ctx.beginPath();

      ctx.arc(
        screen.x,
        screen.y,
        shieldRadius,
        0,
        Math.PI * 2
      );

      ctx.stroke();

      // Inner rotating segmented seal.
      ctx.translate(
        screen.x,
        screen.y
      );

      ctx.rotate(
        performance.now() * 0.0006
      );

      ctx.strokeStyle = '#c4b5fd';
      ctx.lineWidth = 4;

      for (let i = 0; i < 6; i++) {
        const a =
          (Math.PI * 2 * i) / 6;

        ctx.beginPath();

        ctx.moveTo(
          Math.cos(a) *
          (shieldRadius - 8),
          Math.sin(a) *
          (shieldRadius - 8)
        );

        ctx.lineTo(
          Math.cos(a) *
          (shieldRadius + 10),
          Math.sin(a) *
          (shieldRadius + 10)
        );

        ctx.stroke();
      }

      ctx.restore();
    }

    // Special attack telegraph / afterimage / impact VFX.
    this._drawAttackTelegraph(
      ctx,
      camera
    );

    // Hit flash.
    if (this.hitFlashTimer > 0) {
      ctx.save();

      if (sprite) {
        ctx.globalAlpha =
          Math.min(
            0.72,
            this.hitFlashTimer / 0.09
          );

        ctx.filter =
          'brightness(4) saturate(0)';

        ctx.drawImage(
          sprite,
          screen.x - this.size / 2,
          screen.y - this.size / 2,
          this.size,
          this.size
        );
      } else {
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = '#fff';

        ctx.fillRect(
          screen.x - this.size / 2,
          screen.y - this.size / 2,
          this.size,
          this.size
        );
      }

      ctx.restore();
    }

    // =============================
    // LABEL
    // =============================
    let label =
      'ASTER — THE CORRUPTED WARDEN';

    if (this.state === STATE.SEAL_LOCKED) {
      label =
        `SEVENTH SEAL • LOCKED ${this.mechanismProgress}/${this.mechanismRequired}`;
    }

    if (this.state === STATE.STAGGER) {
      label = 'SHIELD BREAK!';
    }

    if (this.state === STATE.VULNERABLE) {
      label = 'ASTER • VULNERABLE!';
    }

    if (this.state === STATE.HUNT) {
      label = 'ASTER • HUNT';
    }

    if (this.state === STATE.ENRAGED) {
      label = 'ASTER • ENRAGED';
    }

    const attackLabel =
      this._getAttackLabel();

    if (attackLabel) {
      label +=
        ` • ${attackLabel}`;
    }

    ctx.fillStyle =
      this.state === STATE.ENRAGED
        ? '#f87171'
        : this.shieldActive
          ? '#bfdbfe'
          : this.state === STATE.VULNERABLE
            ? '#fde68a'
            : '#ffffff';

    ctx.font =
      'bold 14px sans-serif';

    ctx.textAlign = 'center';

    ctx.fillText(
      label,
      screen.x,
      barY - 9
    );

    if (this.stunTimer > 0) {
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 3;

      ctx.beginPath();

      ctx.arc(
        screen.x,
        barY - 30,
        9,
        0,
        Math.PI * 2
      );

      ctx.stroke();
    }

    ctx.textAlign = 'left';
  }
}
