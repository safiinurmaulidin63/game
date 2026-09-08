// Weapon.js
// Combat v2 + VFX/Sound v1.

import { Projectile } from './Projectile.js';
import { MeleeHit } from './MeleeHit.js';
import { CombatEffect } from './CombatEffect.js';
import { soundManager } from '../core/SoundManager.js';

export class Weapon {
  constructor() {
    this.projectiles = [];
    this.effects = [];

    this.cooldownTimer = 0;
    this.skillCooldownTimer = 0;

    this.staffAttackCounter = 0;

    // Fighter passive: setiap pukulan ke-3 = Heavy Jab.
    this.fighterAttackCounter = 0;
  }

  update(dt, input, player, camera, tileMap) {
    if (this.cooldownTimer > 0) {
      this.cooldownTimer = Math.max(0, this.cooldownTimer - dt);
    }

    if (this.skillCooldownTimer > 0) {
      this.skillCooldownTimer = Math.max(0, this.skillCooldownTimer - dt);
    }

    const basicAttackHeld =
      input.mouseDown ||
      input.mobileAimActive;

    if (basicAttackHeld && this.cooldownTimer <= 0) {
      this._attack(player);

      this.cooldownTimer =
        player.combat?.basic?.cooldown ??
        0.35;
    }

    const skillPressed =
      input.wasJustPressed('KeyQ') ||
      input.wasJustPressed('Skill');

    if (skillPressed && this.skillCooldownTimer <= 0) {
      this._useSkill(player, tileMap);
    }

    for (const attack of this.projectiles) {
      attack.update(dt, tileMap);
    }

    this.projectiles =
      this.projectiles.filter(
        (attack) => !attack.dead
      );

    for (const effect of this.effects) {
      effect.update(dt);
    }

    this.effects =
      this.effects.filter(
        (effect) => !effect.dead
      );
  }

  _attack(player) {
    const angle = player.angle;
    const basic = player.combat?.basic ?? {};

    switch (player.weaponType) {
      case 'fist': {
        this.fighterAttackCounter += 1;

        const heavyEvery =
          basic.heavyEvery ?? 3;

        const heavy =
          this.fighterAttackCounter %
          heavyEvery === 0;

        this.projectiles.push(
          new MeleeHit(
            player.x,
            player.y,
            angle,
            {
              type: 'fist',

              range:
                heavy
                  ? basic.heavyRange ?? 96
                  : basic.range ?? 74,

              radius:
                heavy
                  ? basic.heavyRadius ?? 34
                  : basic.radius ?? 28,

              damage:
                heavy
                  ? basic.heavyDamage ?? 1.65
                  : basic.damage ?? 1.2,

              lifeTime:
                heavy
                  ? 0.17
                  : 0.13,

              piercing: true,

              // Seluruh jalur pukulan aktif.
              segmentCollision: true,

              empowered: heavy,
            }
          )
        );

        soundManager.play(
          heavy
            ? 'staffEmpowered'
            : 'fighterSwing'
        );

        break;
      }

      case 'sword':
        this.projectiles.push(
          new MeleeHit(
            player.x,
            player.y,
            angle,
            {
              type: 'sword',
              range: basic.range ?? 74,
              radius: basic.radius ?? 28,
              damage: basic.damage ?? 2.25,
              lifeTime: 0.14,
              piercing: true,
            }
          )
        );

        soundManager.play('swordSwing');
        break;

      case 'staff': {
        this.staffAttackCounter += 1;

        const every = basic.stunEvery ?? 4;
        const empowered =
          this.staffAttackCounter % every === 0;

        this.projectiles.push(
          new MeleeHit(
            player.x,
            player.y,
            angle,
            {
              type: 'staff',
              range: basic.range ?? 88,
              radius: basic.radius ?? 26,
              damage: basic.damage ?? 1.5,
              lifeTime: 0.14,
              piercing: true,
              empowered,
              stunDuration:
                empowered
                  ? basic.stunDuration ?? 0.9
                  : 0,
            }
          )
        );

        soundManager.play(
          empowered
            ? 'staffEmpowered'
            : 'staffSwing'
        );
        break;
      }

      case 'magic':
      default:
        this.projectiles.push(
          new Projectile(
            player.x,
            player.y,
            angle,
            {
              damage: basic.damage ?? 1,
              speed: basic.projectileSpeed ?? 520,
              lifeTime: basic.projectileLife ?? 1.35,
              radius: basic.projectileRadius ?? 6,
              style: 'magic',
              coreColor: '#ecfeff',
              glowColor: '#38bdf8',
              trailColor: '#0ea5e9',
            }
          )
        );

        soundManager.play('mageShot');
        break;
    }
  }

  _useSkill(player, tileMap) {
    const skill = player.skill;
    if (!skill) return;

    const angle = player.angle;

    switch (skill.id) {
      case 'arcaneBurst': {
        this.effects.push(
          new CombatEffect(
            'castPulse',
            {
              x: player.x,
              y: player.y,
              radius: 72,
              duration: 0.34,
              color: '#8b5cf6',
              color2: '#67e8f9',
            }
          ),
          new CombatEffect(
            'radialBurst',
            {
              x: player.x,
              y: player.y,
              angle,
              radius: 86,
              duration: 0.28,
              color: '#a78bfa',
              color2: '#67e8f9',
            }
          )
        );

        const COUNT = 8;

        for (let i = 0; i < COUNT; i++) {
          const shotAngle =
            angle +
            (Math.PI * 2 * i) / COUNT;

          this.projectiles.push(
            new Projectile(
              player.x,
              player.y,
              shotAngle,
              {
                damage: 1.5,
                speed: 560,
                lifeTime: 1.2,
                radius: 7,
                spawnOffset: 20,
                style: 'arcane',
                coreColor: '#f5f3ff',
                glowColor: '#8b5cf6',
                trailColor: '#67e8f9',
              }
            )
          );
        }

        soundManager.play('skillArcaneBurst');
        break;
      }

      case 'dashPunch': {
        const startX = player.x;
        const startY = player.y;

        // Dash Punch memang MEMAKSA Fighter menabrak/melewati target.
        // Jadi skill ini mendapat true i-frame selama dash + recovery singkat.
        //
        // Dipasang SEBELUM dash supaya intent-nya jelas:
        // sejak skill aktif, damage kontak / projectile / hazard diabaikan.
        const dashIFrameDuration = 0.65;

        player.invulnerableTimer =
          Math.max(
            player.invulnerableTimer,
            dashIFrameDuration
          );

        player.dash(
          angle,
          110,
          tileMap
        );

        // Pastikan i-frame tidak hilang karena perubahan urutan update
        // kalau sistem combat nanti dirombak lagi.
        player.invulnerableTimer =
          Math.max(
            player.invulnerableTimer,
            dashIFrameDuration
          );

        this.effects.push(
          new CombatEffect(
            'dashTrail',
            {
              fromX: startX,
              fromY: startY,
              toX: player.x,
              toY: player.y,
              duration: 0.34,
              color: '#fb923c',
              color2: '#fef3c7',
            }
          ),
          new CombatEffect(
            'heavyImpact',
            {
              x: player.x,
              y: player.y,
              angle,
              radius: 78,
              duration: 0.40,
              color: '#f97316',
              color2: '#fbbf24',
              color3: '#fff7ed',
            }
          )
        );

        this.projectiles.push(
          new MeleeHit(
            player.x,
            player.y,
            angle,
            {
              type: 'dashPunch',
              range: 52,
              radius: 36,
              damage: 4,
              lifeTime: 0.34,
              piercing: true,
              segmentCollision: true,
            }
          )
        );

        soundManager.play('skillDashPunch');
        break;
      }

      case 'crescentSlash':
        this.effects.push(
          new CombatEffect(
            'bladeStorm',
            {
              x: player.x,
              y: player.y,
              angle,
              radius: 118,
              duration: 0.52,
              color: '#f59e0b',
              color2: '#fde68a',
              color3: '#ffffff',
            }
          ),
          new CombatEffect(
            'castPulse',
            {
              x: player.x,
              y: player.y,
              radius: 78,
              duration: 0.30,
              color: '#facc15',
              color2: '#fff7cc',
            }
          )
        );

        this.projectiles.push(
          new MeleeHit(
            player.x,
            player.y,
            angle,
            {
              type: 'crescent',
              range: 0,
              radius: 90,
              damage: 4.5,
              lifeTime: 0.48,
              piercing: true,
            }
          )
        );

        soundManager.play('skillCrescentSlash');
        break;

      case 'shockwave':
        this.effects.push(
          new CombatEffect(
            'shockNova',
            {
              x: player.x,
              y: player.y,
              angle,
              radius: 146,
              duration: 0.58,
              color: '#06b6d4',
              color2: '#67e8f9',
              color3: '#ffffff',
            }
          ),
          new CombatEffect(
            'castPulse',
            {
              x: player.x,
              y: player.y,
              radius: 70,
              duration: 0.30,
              color: '#22d3ee',
              color2: '#cffafe',
            }
          )
        );

        this.projectiles.push(
          new MeleeHit(
            player.x,
            player.y,
            angle,
            {
              type: 'shockwave',
              range: 0,
              radius: 112,
              damage: 2.5,
              stunDuration: 1.4,
              lifeTime: 0.54,
              piercing: true,
            }
          )
        );

        soundManager.play('skillShockwave');
        break;

      default:
        return;
    }

    this.skillCooldownTimer =
      skill.cooldown ?? 6;
  }

  getSkillName(player) {
    return player.skill?.name ?? 'SKILL';
  }

  getSkillCooldownRemaining() {
    return Math.max(0, this.skillCooldownTimer);
  }

  getSkillCooldownTotal(player) {
    return player.skill?.cooldown ?? 0;
  }

  isSkillReady() {
    return this.skillCooldownTimer <= 0;
  }

  clearTransient() {
    this.projectiles = [];
    this.effects = [];
    this.cooldownTimer = 0;
  }

  reset() {
    this.projectiles = [];
    this.effects = [];

    this.cooldownTimer = 0;
    this.skillCooldownTimer = 0;
    this.staffAttackCounter = 0;
    this.fighterAttackCounter = 0;
  }

  draw(ctx, camera) {
    for (const effect of this.effects) {
      effect.draw(ctx, camera);
    }

    for (const attack of this.projectiles) {
      attack.draw(ctx, camera);
    }
  }
}
