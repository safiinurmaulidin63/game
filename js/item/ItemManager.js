// ItemManager.js
// Sistem heal:
// - Heal Orb = heal langsung +1 HP
// - Potion = masuk inventory, max 3
// - R / tombol HEAL = pakai potion, heal +3
// - pity drop supaya RNG tidak kejam

import { HealPickup } from './HealPickup.js';
import { soundManager } from '../core/SoundManager.js';

export class ItemManager {
  constructor() {
    this.maxPotions = 3;
    this.potionHealAmount = 3;

    // Run baru dimulai dengan satu potion.
    this.potions = 1;

    this.pickups = [];

    this.potionUseCooldown = 0;
    this.potionUseCooldownDuration = 0.65;

    // Anti-bad-luck / pity system.
    this.killsSinceHeal = 0;
    this.killsSincePotion = 0;

    // Floating feedback.
    this.feedbacks = [];
  }

  resetRun() {
    this.potions = 1;

    this.pickups = [];

    this.potionUseCooldown = 0;

    this.killsSinceHeal = 0;
    this.killsSincePotion = 0;

    this.feedbacks = [];
  }

  clearFloor() {
    this.pickups = [];
    this.feedbacks = [];
    this.potionUseCooldown = 0;
  }

  setPotions(amount) {
    this.potions =
      Math.max(
        0,
        Math.min(
          this.maxPotions,
          Math.floor(amount)
        )
      );
  }

  getPotionCount() {
    return this.potions;
  }

  getMaxPotions() {
    return this.maxPotions;
  }

  getPotionHealAmount() {
    return this.potionHealAmount;
  }

  canUsePotion(player) {
    return (
      this.potions > 0 &&
      this.potionUseCooldown <= 0 &&
      player.hp > 0 &&
      player.hp < player.maxHp
    );
  }

  usePotion(player) {
    if (
      !this.canUsePotion(player)
    ) {
      return false;
    }

    const healed =
      player.heal(
        this.potionHealAmount
      );

    if (
      healed <= 0
    ) {
      return false;
    }

    this.potions -= 1;

    this.potionUseCooldown =
      this.potionUseCooldownDuration;

    soundManager.play(
      'potionUse'
    );

    this._addFeedback(
      player.x,
      player.y - 28,
      `+${healed} HP`,
      '#86efac'
    );

    return true;
  }

  handleEnemyDeaths(events) {
    for (
      const event of events
    ) {
      if (
        event.isBoss
      ) {
        continue;
      }

      this.killsSinceHeal += 1;
      this.killsSincePotion += 1;

      const type =
        event.type ??
        'melee';

      const potionChanceByType = {
        melee: 0.06,
        ranged: 0.07,
        brute: 0.11,
        swarm: 0.03,
      };

      const healChanceByType = {
        melee: 0.18,
        ranged: 0.20,
        brute: 0.30,
        swarm: 0.12,
      };

      const potionChance =
        potionChanceByType[type] ??
        0.06;

      const healChance =
        healChanceByType[type] ??
        0.18;

      // Potion pity:
      // maksimal 10 kill tanpa melihat potion drop.
      const forcePotion =
        this.killsSincePotion >= 10;

      if (
        forcePotion ||
        Math.random() <
        potionChance
      ) {
        this.spawn(
          event.x,
          event.y,
          'potion'
        );

        this.killsSincePotion = 0;

        continue;
      }

      // Heal pity:
      // maksimal 5 kill tanpa melihat Heal Orb.
      const forceHeal =
        this.killsSinceHeal >= 5;

      if (
        forceHeal ||
        Math.random() <
        healChance
      ) {
        this.spawn(
          event.x,
          event.y,
          'heal'
        );

        this.killsSinceHeal = 0;
      }
    }
  }

  spawn(
    x,
    y,
    type = 'heal'
  ) {
    // Sedikit offset supaya item tidak selalu tepat di tengah corpse.
    const angle =
      Math.random() *
      Math.PI *
      2;

    const distance =
      8 +
      Math.random() *
      12;

    this.pickups.push(
      new HealPickup(
        x +
        Math.cos(angle) *
        distance,
        y +
        Math.sin(angle) *
        distance,
        type
      )
    );
  }

  update(dt, player) {
    if (
      this.potionUseCooldown > 0
    ) {
      this.potionUseCooldown =
        Math.max(
          0,
          this.potionUseCooldown - dt
        );
    }

    for (
      const pickup of
      this.pickups
    ) {
      pickup.update(dt);

      if (
        pickup.dead
      ) {
        continue;
      }

      const distance =
        Math.hypot(
          player.x -
          pickup.x,
          player.y -
          pickup.y
        );

      const collectDistance =
        player.size / 2 +
        pickup.radius +
        10;

      if (
        distance >
        collectDistance
      ) {
        continue;
      }

      if (
        pickup.type ===
        'heal'
      ) {
        // Kalau HP penuh, orb TIDAK dibuang.
        if (
          player.hp >=
          player.maxHp
        ) {
          continue;
        }

        const healed =
          player.heal(1);

        if (
          healed > 0
        ) {
          pickup.dead = true;

          soundManager.play(
            'healPickup'
          );

          this._addFeedback(
            pickup.x,
            pickup.y - 20,
            `+${healed} HP`,
            '#4ade80'
          );
        }

        continue;
      }

      // POTION PICKUP
      if (
        this.potions >=
        this.maxPotions
      ) {
        // Inventory penuh: potion tetap di tanah.
        continue;
      }

      this.potions += 1;
      pickup.dead = true;

      soundManager.play(
        'potionPickup'
      );

      this._addFeedback(
        pickup.x,
        pickup.y - 20,
        `POTION ${this.potions}/${this.maxPotions}`,
        '#fda4af'
      );
    }

    this.pickups =
      this.pickups.filter(
        (pickup) =>
          !pickup.dead
      );

    for (
      const feedback of
      this.feedbacks
    ) {
      feedback.life -= dt;
      feedback.y -= 24 * dt;
    }

    this.feedbacks =
      this.feedbacks.filter(
        (feedback) =>
          feedback.life > 0
      );
  }

  _addFeedback(
    x,
    y,
    text,
    color
  ) {
    this.feedbacks.push({
      x,
      y,
      text,
      color,
      life: 0.95,
      maxLife: 0.95,
    });
  }

  draw(ctx, camera) {
    for (
      const pickup of
      this.pickups
    ) {
      pickup.draw(
        ctx,
        camera
      );
    }

    for (
      const feedback of
      this.feedbacks
    ) {
      const screen =
        camera.worldToScreen(
          feedback.x,
          feedback.y
        );

      const alpha =
        Math.max(
          0,
          feedback.life /
          feedback.maxLife
        );

      ctx.save();

      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';

      ctx.font =
        'bold 15px sans-serif';

      // Shadow.
      ctx.fillStyle =
        'rgba(0,0,0,0.75)';

      ctx.fillText(
        feedback.text,
        screen.x + 2,
        screen.y + 2
      );

      ctx.fillStyle =
        feedback.color;

      ctx.fillText(
        feedback.text,
        screen.x,
        screen.y
      );

      ctx.restore();
    }
  }
}
