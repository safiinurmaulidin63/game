// PuzzleManager.js
// Puzzle dungeon berbasis simbol LevelData.js.
// Level 1: 3 pressure switch.
// Level 2: 2 switch pada cabang kiri/kanan.
// Level 3: rune sequence Matahari -> Bulan -> Bintang.
// Level 4: torch sequence 2 -> 4 -> 1 -> 3.
// Level 5: collect 3 Seal Fragment lalu kembali ke altar.
// Level 6: rune -> 2 stabilizer -> restored fragment altar.
// Level 7: boss Aster -> reveal The Core -> restore Seventh Seal.
// Semua puzzle selesai -> sealed door / ending terbuka.

import { assetLoader } from '../core/AssetLoader.js';

export class PuzzleManager {
  constructor(
    tileMap,
    floorNumber,
    storyManager,
    enemyManager = null
  ) {
    this.tileMap = tileMap;
    this.floorNumber = floorNumber;
    this.storyManager = storyManager;
    this.enemyManager = enemyManager;

    const objects = tileMap.getPuzzleObjects();

    this.switches = objects.switches.map((item, index) => {
      let kind = 'pressure';

      // Level 2:
      // kiri/barat = Matahari, kanan/timur = Bulan.
      if (this.floorNumber === 2) {
        kind = index === 0 ? 'sun' : 'moon';
      }

      // Level 3:
      // ketiga rune dipindai dari kiri ke kanan.
      if (this.floorNumber === 3) {
        kind = ['sun', 'moon', 'star'][index] ?? 'pressure';
      }

      // Level 4:
      // empat obor dipindai dari kiri ke kanan = 1,2,3,4.
      if (this.floorNumber === 4) {
        kind = ['torch1', 'torch2', 'torch3', 'torch4'][index] ?? 'pressure';
      }

      // Level 5:
      // X menjadi collectible Seal Fragment.
      if (this.floorNumber === 5) {
        kind = `fragment${index + 1}`;
      }

      // Level 6:
      // 3 object pertama = rune Sun/Moon/Star.
      // 2 berikutnya = stabilizer kiri/kanan.
      if (this.floorNumber === 6) {
        kind = [
          'sun',
          'moon',
          'star',
          'stabilizer1',
          'stabilizer2'
        ][index] ?? 'pressure';
      }

      // Level 7:
      // 3 X di arena = Seal Node Sun / Moon / Star.
      if (this.floorNumber === 7) {
        kind = [
          'sun',
          'moon',
          'star'
        ][index] ?? 'pressure';
      }

      return {
        ...item,
        id: `switch-${index + 1}`,
        kind,
        active: false,
        wasInside: false,

        // Dipakai khusus Level 7 Seal Node.
        charge: 0,
      };
    });

    this.sequenceIndex = 0;

    if (this.floorNumber === 3) {
      this.sequenceOrder = ['sun', 'moon', 'star'];
    } else if (this.floorNumber === 4) {
      this.sequenceOrder = ['torch2', 'torch4', 'torch1', 'torch3'];
    } else if (this.floorNumber === 6) {
      this.sequenceOrder = ['sun', 'moon', 'star'];
    } else {
      this.sequenceOrder = [];
    }

    this.doors = objects.doors;
    this.tablets = objects.tablets.map((item, index) => ({
      ...item,
      id: `tablet-${index + 1}`,
      triggered: false,
    }));

    this.completed =
      this.floorNumber === 7
        ? false
        : this.switches.length === 0;

    // State khusus Level 5.
    this.altarHintShown = false;
    this.altarActivated = false;

    // State khusus Level 6.
    // 0 = rune, 1 = stabilizer, 2 = altar.
    this.level6Stage = 0;
    this.level6ClueShown = false;
    this.level6AltarHintShown = false;

    // State khusus Level 7.
    this.level7BossDefeated = false;
    this.level7CoreRestored = false;

    // Boss Seal Node mechanic.
    //
    // Ada 3 cycle barrier:
    // Cycle 1 = Sun -> Moon -> Star
    // Cycle 2 = Moon -> Star -> Sun
    // Cycle 3 = Star -> Sun -> Moon
    //
    // Player harus berada dekat node target selama beberapa saat.
    this.level7SealCycle = 0;
    this.level7SequenceIndex = 0;

    this.level7NodeCharge = 0;
    this.level7NodeChargeRequired = 1.05;
    this.level7NodeRadius = 58;

    this.level7SealOrders = [
      ['sun', 'moon', 'star'],
      ['moon', 'star', 'sun'],
      ['star', 'sun', 'moon'],
    ];

    this.level7LastShieldActive = false;
    this.level7MechanismInitialized = false;

    // Boss sudah di-spawn sebelum PuzzleManager dibuat.
    // Aktifkan external mechanism agar temporary Step-1 auto-unlock MATI.
    if (
      this.floorNumber === 7 &&
      this.enemyManager
    ) {
      this.enemyManager.enableBossMechanism(3);

      const boss =
        this.enemyManager.getBoss?.();

      this.level7LastShieldActive =
        Boolean(
          boss?.isShielded?.()
        );

      this.level7MechanismInitialized =
        Boolean(boss);
    }

    // Pastikan door kembali tertutup saat level baru dibuat.
    if (this.doors.length > 0) {
      this.tileMap.setSealedDoorOpen(false);
    }
  }

  update(player, dt = 1 / 60) {
    this._frameDt = dt;

    if (this.floorNumber === 5) {
      this._updateLevel5(player);
      return;
    }

    if (this.floorNumber === 6) {
      this._updateLevel6(player);
      return;
    }

    if (this.floorNumber === 7) {
      this._updateLevel7(player);
      return;
    }

    // Kalau lantai tidak punya puzzle object, fungsi-fungsi ini otomatis
    // tidak melakukan apa-apa. Jadi manager bisa dipakai semua level.
    this._updateSwitches(player);
    this._updateTablets(player);
  }

  _updateLevel5(player) {
    // 1. Ambil ketiga Seal Fragment.
    for (const fragment of this.switches) {
      if (fragment.active) continue;

      const distance = Math.hypot(
        player.x - fragment.x,
        player.y - fragment.y
      );

      if (distance <= 34) {
        fragment.active = true;

        const collected =
          this.switches.filter((item) => item.active).length;

        this.storyManager.show(
          `level5-fragment-${collected}`,
          [
            {
              speaker: 'Seal Fragment',
              text: `Fragmen segel ditemukan. ${collected} dari ${this.switches.length} fragmen telah terkumpul.`
            }
          ]
        );
      }
    }

    // 2. Setelah lengkap, kembali ke altar.
    const altar = this.tablets[0];
    if (!altar) return;

    const altarDistance = Math.hypot(
      player.x - altar.x,
      player.y - altar.y
    );

    if (altarDistance > 52) {
      return;
    }

    const collected =
      this.switches.filter((item) => item.active).length;

    if (
      collected < this.switches.length &&
      !this.altarHintShown
    ) {
      this.altarHintShown = true;

      this.storyManager.show(
        'level5-altar-empty',
        [
          {
            speaker: 'Shattered Altar',
            text: 'Tiga cekungan kosong mengelilingi pusat altar. Sesuatu pernah ditempatkan di sini.'
          },
          {
            speaker: player.characterName,
            text: 'Aku harus mencari tiga bagian yang hilang.'
          }
        ]
      );

      return;
    }

    if (
      collected === this.switches.length &&
      !this.completed
    ) {
      this.completed = true;
      this.altarActivated = true;
      this.tileMap.setSealedDoorOpen(true);

      this.storyManager.show(
        'level5-altar-memory',
        [
          {
            speaker: 'Shattered Altar',
            text: 'Ketiga fragmen terangkat dan menyatu dengan altar. Sebuah memori lama muncul.'
          },
          {
            speaker: 'Unknown Explorer',
            text: 'Dengan kekuatan di bawah sana, kita bisa mengubah dunia.'
          },
          {
            speaker: 'Aster',
            text: 'Kalian tidak memahami apa yang kalian buka.'
          },
          {
            speaker: 'Unknown Explorer',
            text: 'Kau hanya seorang penjaga.'
          },
          {
            speaker: 'Aster',
            text: 'Dan itu sebabnya aku masih berdiri di sini.'
          },
          {
            speaker: player.characterName,
            text: 'Jadi Aster bukan orang yang merusak dungeon... Dia mencoba menghentikan mereka.'
          },
          {
            speaker: 'Shattered Altar',
            text: 'Satu keping segel yang telah dipulihkan terlepas dari altar dan ikut bersamamu.'
          }
        ]
      );
    }
  }

  _updateLevel6(player) {
    const runes = this.switches.slice(0, 3);
    const stabilizers = this.switches.slice(3, 5);

    const clue = this.tablets[0];
    const altar = this.tablets[1];

    // =====================================================
    // STORY CLUE
    // =====================================================
    if (
      clue &&
      !this.level6ClueShown
    ) {
      const distance = Math.hypot(
        player.x - clue.x,
        player.y - clue.y
      );

      if (distance <= 52) {
        this.level6ClueShown = true;

        this.storyManager.show(
          'level6-monument-clue',
          [
            {
              speaker: 'Ancient Monument',
              text: 'Tiga lambang membuka jaringan. Dua penjaga menahan arus. Segel yang dipulihkan menjadi kunci terakhir.'
            },
            {
              speaker: player.characterName,
              text: 'Matahari, Bulan, Bintang... lalu dua stabilizer. Setelah itu altar.'
            }
          ]
        );
      }
    }

    // =====================================================
    // STAGE 0 — SUN -> MOON -> STAR
    // =====================================================
    if (this.level6Stage === 0) {
      for (const rune of runes) {
        const distance = Math.hypot(
          player.x - rune.x,
          player.y - rune.y
        );

        const inside = distance <= 34;

        if (
          inside &&
          !rune.wasInside &&
          !rune.active
        ) {
          const expected =
            this.sequenceOrder[this.sequenceIndex];

          if (rune.kind === expected) {
            rune.active = true;
            this.sequenceIndex += 1;

            if (
              this.sequenceIndex >=
              this.sequenceOrder.length
            ) {
              this.level6Stage = 1;

              this.storyManager.show(
                'level6-runes-complete',
                [
                  {
                    speaker: 'Ancient Mechanism',
                    text: 'Tiga rune menyala. Energi mengalir menuju dua mekanisme di aula berikutnya.'
                  }
                ]
              );
            }
          } else {
            this.sequenceIndex = 0;

            for (const item of runes) {
              item.active = false;
            }

            this.storyManager.show(
              'level6-rune-reset',
              [
                {
                  speaker: 'Ancient Mechanism',
                  text: 'Urutan rune salah. Jaringan segel kembali padam.'
                }
              ]
            );
          }
        }

        rune.wasInside = inside;
      }

      return;
    }

    // =====================================================
    // STAGE 1 — DUA STABILIZER
    // Bebas urutan.
    // =====================================================
    if (this.level6Stage === 1) {
      for (const stabilizer of stabilizers) {
        if (stabilizer.active) continue;

        const distance = Math.hypot(
          player.x - stabilizer.x,
          player.y - stabilizer.y
        );

        if (distance <= 34) {
          stabilizer.active = true;
        }
      }

      if (
        stabilizers.length === 2 &&
        stabilizers.every((item) => item.active)
      ) {
        this.level6Stage = 2;

        this.storyManager.show(
          'level6-stabilizers-complete',
          [
            {
              speaker: 'Ancient Mechanism',
              text: 'Kedua stabilizer terkunci. Altar Segel Keenam kembali menerima aliran energi.'
            },
            {
              speaker: player.characterName,
              text: 'Sekarang tinggal fragmen segel yang kubawa dari lantai sebelumnya.'
            }
          ]
        );
      }

      return;
    }

    // =====================================================
    // STAGE 2 — ALTAR
    // =====================================================
    if (
      this.level6Stage === 2 &&
      altar &&
      !this.completed
    ) {
      const distance = Math.hypot(
        player.x - altar.x,
        player.y - altar.y
      );

      if (distance <= 54) {
        this.completed = true;
        this.altarActivated = true;
        this.tileMap.setSealedDoorOpen(true);

        this.storyManager.show(
          'level6-sixth-seal-restored',
          [
            {
              speaker: 'Sixth Seal Altar',
              text: 'Fragmen segel yang dipulihkan menyatu dengan altar. Seluruh ruangan bergetar.'
            },
            {
              speaker: 'Aster',
              text: 'Kau masih bisa mendengarku...'
            },
            {
              speaker: player.characterName,
              text: 'Aster?'
            },
            {
              speaker: 'Aster',
              text: 'Jangan buka pintu terakhir.'
            },
            {
              speaker: player.characterName,
              text: 'Kenapa?'
            },
            {
              speaker: 'Aster',
              text: 'Karena aku tidak tahu berapa lama lagi aku bisa menahannya.'
            },
            {
              speaker: 'Aster',
              text: 'Jika aku kehilangan kendali... jangan ragu.'
            },
            {
              speaker: 'Ancient Mechanism',
              text: 'Gerbang menuju Seventh Seal telah terbuka.'
            }
          ]
        );
      }

      return;
    }

    // Kalau player menemukan altar terlalu cepat, beri hint sekali.
    if (
      altar &&
      !this.completed &&
      !this.level6AltarHintShown
    ) {
      const distance = Math.hypot(
        player.x - altar.x,
        player.y - altar.y
      );

      if (distance <= 54) {
        this.level6AltarHintShown = true;

        this.storyManager.show(
          'level6-altar-locked',
          [
            {
              speaker: 'Sixth Seal Altar',
              text: 'Altar tidak bereaksi. Jaringan rune dan kedua stabilizer belum sepenuhnya aktif.'
            }
          ]
        );
      }
    }
  }


  onBossDefeated(player) {
    if (
      this.floorNumber !== 7 ||
      this.level7BossDefeated
    ) {
      return;
    }

    this.level7BossDefeated = true;

    this.storyManager.show(
      'level7-boss-defeated',
      [
        {
          speaker: 'Aster',
          text: 'Tunggu... Aku masih bisa menahannya.'
        },
        {
          speaker: player.characterName,
          text: 'Aster...'
        },
        {
          speaker: 'Aster',
          text: 'Lihat ke ujung arena. Itulah yang mereka cari.'
        },
        {
          speaker: player.characterName,
          text: 'The Core?'
        },
        {
          speaker: 'Aster',
          text: 'Bukan sumber kekuatan.'
        },
        {
          speaker: 'Aster',
          text: 'Sebuah pintu.'
        },
        {
          speaker: 'Aster',
          text: 'Segelnya masih bisa dipulihkan. Dekati Core dan selesaikan apa yang gagal kulakukan.'
        }
      ]
    );
  }

  _updateLevel7(player) {
    // =====================================================
    // BOSS SEAL NODE MECHANIC
    // =====================================================
    if (!this.level7BossDefeated) {
      const boss =
        this.enemyManager?.getBoss?.();

      if (!boss) {
        return;
      }

      const shieldActive =
        boss.isShielded?.() ?? false;

      // Safety: kalau PuzzleManager sempat dibuat sebelum boss tersedia,
      // sambungkan mechanism segera setelah boss ditemukan.
      if (!this.level7MechanismInitialized) {
        this.enemyManager.enableBossMechanism(3);

        this.level7MechanismInitialized = true;
        this.level7LastShieldActive = shieldActive;

        this._resetLevel7SealNodes();
      }

      // Boss Step 1 mengaktifkan barrier kembali pada threshold HP.
      // Saat transisi OFF -> ON terdeteksi, mulai cycle rune berikutnya.
      if (
        shieldActive &&
        !this.level7LastShieldActive
      ) {
        this.level7SealCycle =
          Math.min(
            this.level7SealCycle + 1,
            this.level7SealOrders.length - 1
          );

        this._resetLevel7SealNodes();

        // Boss sendiri sudah reset mechanismProgress saat barrier aktif.
        // Kirim 0 sekali lagi agar PuzzleManager + Boss benar-benar sinkron.
        this.enemyManager.setBossMechanismProgress(
          0,
          3
        );
      }

      this.level7LastShieldActive =
        shieldActive;

      // Node hanya bisa di-charge saat barrier aktif.
      if (shieldActive) {
        this._updateLevel7SealNodes(
          player,
          boss
        );
      } else {
        // Bersihkan partial charge supaya tidak bisa disimpan
        // sampai barrier cycle berikutnya.
        this.level7NodeCharge = 0;

        for (const node of this.switches) {
          node.charge = 0;
        }
      }

      return;
    }

    // =====================================================
    // AFTER BOSS: THE CORE / ENDING
    // =====================================================
    if (this.completed) {
      return;
    }

    const core = this.tablets[0];

    if (!core) {
      return;
    }

    const distance = Math.hypot(
      player.x - core.x,
      player.y - core.y
    );

    if (distance > 58) {
      return;
    }

    this.completed = true;
    this.level7CoreRestored = true;

    this.storyManager.show(
      'level7-seal-restored',
      [
        {
          speaker: 'The Core',
          text: 'Tujuh pola cahaya muncul mengelilingi Core. Fragmen segel terakhir bereaksi.'
        },
        {
          speaker: 'Ancient Mechanism',
          text: 'I • II • III • IV • V • VI • VII'
        },
        {
          speaker: 'Ancient Mechanism',
          text: 'SEVENTH SEAL RESTORED.'
        },
        {
          speaker: 'Aster',
          text: 'Sudah terlalu lama sejak tempat ini sunyi.'
        },
        {
          speaker: player.characterName,
          text: 'Apa yang akan terjadi padamu?'
        },
        {
          speaker: 'Aster',
          text: 'Aku adalah Seventh Seal.'
        },
        {
          speaker: 'Aster',
          text: 'Selama pintu itu ada... aku tetap di sini.'
        },
        {
          speaker: 'Unknown',
          text: '...one seal has awakened...'
        }
      ]
    );
  }

  _resetLevel7SealNodes() {
    this.level7SequenceIndex = 0;
    this.level7NodeCharge = 0;

    for (const node of this.switches) {
      node.active = false;
      node.wasInside = false;
      node.charge = 0;
    }
  }

  _updateLevel7SealNodes(player, boss) {
    if (
      this.switches.length < 3 ||
      !boss
    ) {
      return;
    }

    const order =
      this.level7SealOrders[
        this.level7SealCycle
      ] ??
      this.level7SealOrders[0];

    const expectedKind =
      order[
        this.level7SequenceIndex
      ];

    if (!expectedKind) {
      return;
    }

    const expectedNode =
      this.switches.find(
        (node) =>
          node.kind === expectedKind
      );

    if (!expectedNode) {
      return;
    }

    const distance =
      Math.hypot(
        player.x - expectedNode.x,
        player.y - expectedNode.y
      );

    const inside =
      distance <=
      this.level7NodeRadius;

    if (inside) {
      this.level7NodeCharge +=
        this._frameDt;

      expectedNode.charge =
        Math.min(
          1,
          this.level7NodeCharge /
          this.level7NodeChargeRequired
        );
    } else {
      // Charge turun cepat saat player keluar dari node.
      this.level7NodeCharge =
        Math.max(
          0,
          this.level7NodeCharge -
          this._frameDt * 2.4
        );

      expectedNode.charge =
        Math.min(
          1,
          this.level7NodeCharge /
          this.level7NodeChargeRequired
        );
    }

    if (
      this.level7NodeCharge <
      this.level7NodeChargeRequired
    ) {
      return;
    }

    expectedNode.active = true;
    expectedNode.charge = 1;

    this.level7SequenceIndex += 1;
    this.level7NodeCharge = 0;

    const progress =
      this.level7SequenceIndex;

    this.enemyManager.setBossMechanismProgress(
      progress,
      3
    );

    // Reset partial charge display untuk target berikutnya.
    for (const node of this.switches) {
      if (!node.active) {
        node.charge = 0;
      }
    }
  }

  isFinalSequenceComplete() {
    return (
      this.floorNumber === 7 &&
      this.completed
    );
  }


  _updateSwitches(player) {
    // =====================================================
    // LEVEL 3-4: PUZZLE URUTAN
    // =====================================================
    if (
      this.floorNumber === 3 ||
      this.floorNumber === 4
    ) {
      for (const sw of this.switches) {
        const distance = Math.hypot(
          player.x - sw.x,
          player.y - sw.y
        );

        const inside = distance <= 34;

        // Trigger hanya saat baru masuk ke object yang BELUM aktif.
        // Jadi lewat lagi di atas rune/obor yang sudah benar tidak mereset puzzle.
        if (
          inside &&
          !sw.wasInside &&
          !sw.active &&
          !this.completed
        ) {
          const expected =
            this.sequenceOrder[this.sequenceIndex];

          if (sw.kind === expected) {
            sw.active = true;
            this.sequenceIndex += 1;

            if (
              this.sequenceIndex >=
              this.sequenceOrder.length
            ) {
              this.completed = true;
              this.tileMap.setSealedDoorOpen(true);

              if (this.floorNumber === 3) {
                this.storyManager.show(
                  'level3-puzzle-complete',
                  [
                    {
                      speaker: 'Ancient Mechanism',
                      text: 'Matahari, Bulan, dan Bintang menyala dalam satu garis. Segel bawah terbuka.'
                    },
                    {
                      speaker: player.characterName,
                      text: 'Urutannya benar... Ada sesuatu di balik gerbang itu.'
                    }
                  ]
                );
              }

              if (this.floorNumber === 4) {
                this.storyManager.show(
                  'level4-puzzle-complete',
                  [
                    {
                      speaker: 'Ancient Mechanism',
                      text: 'Empat api menyala dalam urutan yang benar. Gerbang batu di sebelah timur terbuka.'
                    },
                    {
                      speaker: player.characterName,
                      text: 'Catatan ekspedisi itu benar... Mereka sudah sampai sejauh ini.'
                    }
                  ]
                );
              }
            }
          } else {
            // Salah urutan -> semua object sequence kembali OFF.
            this.sequenceIndex = 0;

            for (const item of this.switches) {
              item.active = false;
            }

            if (this.floorNumber === 3) {
              this.storyManager.show(
                'level3-rune-reset',
                [
                  {
                    speaker: 'Ancient Mechanism',
                    text: 'Urutan rune salah. Ketiga lambang kembali padam.'
                  }
                ]
              );
            }

            if (this.floorNumber === 4) {
              this.storyManager.show(
                'level4-torch-reset',
                [
                  {
                    speaker: 'Ancient Mechanism',
                    text: 'Urutan api salah. Semua obor kembali padam.'
                  }
                ]
              );
            }
          }
        }

        sw.wasInside = inside;
      }

      return;
    }

    // =====================================================
    // LEVEL 1-2: SWITCH BIASA
    // =====================================================
    for (const sw of this.switches) {
      if (sw.active) continue;

      const distance = Math.hypot(
        player.x - sw.x,
        player.y - sw.y
      );

      if (distance <= 34) {
        sw.active = true;
      }
    }

    if (
      !this.completed &&
      this.switches.length > 0 &&
      this.switches.every((sw) => sw.active)
    ) {
      this.completed = true;
      this.tileMap.setSealedDoorOpen(true);

      if (this.floorNumber === 1) {
        this.storyManager.show(
          'level1-puzzle-complete',
          [
            {
              speaker: 'Ancient Mechanism',
              text: 'Ketiga penjaga telah aktif. Suara batu bergeser terdengar dari bagian bawah dungeon.'
            }
          ]
        );
      }

      if (this.floorNumber === 2) {
        this.storyManager.show(
          'level2-puzzle-complete',
          [
            {
              speaker: 'Ancient Mechanism',
              text: 'Segel Matahari dan Bulan telah menyala. Gerbang menuju aula bawah terbuka.'
            },
            {
              speaker: 'Unknown Voice',
              text: '...leave...'
            },
            {
              speaker: player.characterName,
              text: 'Suara itu lagi... Ada seseorang di lantai bawah?'
            }
          ]
        );
      }
    }
  }

  _updateTablets(player) {
    for (let i = 0; i < this.tablets.length; i++) {
      const tablet = this.tablets[i];
      if (tablet.triggered) continue;

      const distance = Math.hypot(player.x - tablet.x, player.y - tablet.y);
      if (distance > 48) continue;

      tablet.triggered = true;

      if (this.floorNumber === 1) {
        if (i === 0) {
          this.storyManager.show('level1-tablet-1', [
            {
              speaker: 'Ancient Tablet',
              text: 'Tiga penjaga membuka jalan bagi mereka yang mengetahui urutannya.'
            },
            {
              speaker: 'Ancient Tablet',
              text: 'Bangunkan ketiga penjaga yang tertidur di aula ini.'
            }
          ]);
        } else {
          this.storyManager.show('level1-tablet-2', [
            {
              speaker: 'Ancient Tablet',
              text: 'Enam pintu melindungi pintu ketujuh.'
            },
            {
              speaker: player.characterName,
              text: 'Pintu ketujuh...? Apa sebenarnya yang disembunyikan di bawah tempat ini?'
            }
          ]);
        }
      }

      if (this.floorNumber === 2) {
        if (i === 0) {
          this.storyManager.show('level2-tablet-1', [
            {
              speaker: 'Ancient Tablet',
              text: 'Dua lambang menjaga aula bawah. Matahari menunggu di barat, Bulan menunggu di timur.'
            },
            {
              speaker: 'Ancient Tablet',
              text: 'Bangunkan keduanya. Hanya saat dua cahaya menyala bersama, gerbang akan terbuka.'
            }
          ]);
        } else {
          this.storyManager.show('level2-journal-1', [
            {
              speaker: 'Expedition Journal #1',
              text: 'Kami mendengar suara dari lantai bawah. Bukan suara monster... seperti seseorang mencoba berbicara kepada kami.'
            },
            {
              speaker: player.characterName,
              text: 'Berarti ekspedisi sebelumnya juga mendengar suara yang sama.'
            }
          ]);
        }
      }

      if (this.floorNumber === 3) {
        if (i === 0) {
          this.storyManager.show('level3-tablet-1', [
            {
              speaker: 'Ancient Monument',
              text: 'Cahaya membuka langit. Bulan mengikuti ketika cahaya padam. Bintang menjaga akhir perjalanan.'
            },
            {
              speaker: player.characterName,
              text: 'Matahari... lalu Bulan... lalu Bintang. Itu pasti urutannya.'
            }
          ]);
        } else {
          this.storyManager.show('level3-mural-aster', [
            {
              speaker: 'Ancient Monument',
              text: 'Aster, Warden of the Seventh Seal.'
            },
            {
              speaker: player.characterName,
              text: 'Aster... jadi memang ada seseorang yang menjaga tempat ini.'
            },
            {
              speaker: 'Unknown Voice',
              text: '...do not... descend...'
            }
          ]);
        }
      }

      if (this.floorNumber === 4) {
        if (i === 0) {
          this.storyManager.show('level4-journal-2', [
            {
              speaker: 'Expedition Journal #2',
              text: 'Kami menyalakan obor seperti yang tertulis di dinding: yang kedua terlebih dahulu, lalu yang keempat, kemudian yang pertama. Yang ketiga menjadi penutup.'
            },
            {
              speaker: player.characterName,
              text: 'Berarti urutannya 2, 4, 1, lalu 3.'
            }
          ]);
        } else {
          this.storyManager.show('level4-journal-3', [
            {
              speaker: 'Expedition Journal #3',
              text: 'Kami mencapai Segel Keenam. Pemimpin ekspedisi memerintahkan kami menghancurkannya.'
            },
            {
              speaker: player.characterName,
              text: 'Mereka menghancurkan segelnya dengan sengaja...?'
            },
            {
              speaker: 'Unknown Voice',
              text: '...stop them...'
            }
          ]);
        }
      }
    }
  }

  getStatusText() {
    if (this.switches.length === 0) {
      return '';
    }

    const activeCount = this.switches.filter((sw) => sw.active).length;

    if (this.floorNumber === 1) {
      if (this.completed) {
        return 'Segel pintu: TERBUKA';
      }
      return `Pressure switch: ${activeCount} / ${this.switches.length}`;
    }

    if (this.floorNumber === 2) {
      if (this.completed) {
        return 'Segel kembar: TERBUKA';
      }
      return `Segel kembar: ${activeCount} / ${this.switches.length}`;
    }

    if (this.floorNumber === 3) {
      if (this.completed) {
        return 'Rune seal: TERBUKA';
      }

      return `Urutan rune: ${this.sequenceIndex} / ${this.sequenceOrder.length}`;
    }

    if (this.floorNumber === 4) {
      if (this.completed) {
        return 'Gerbang ritual: TERBUKA';
      }

      return `Urutan obor: ${this.sequenceIndex} / ${this.sequenceOrder.length}`;
    }

    if (this.floorNumber === 5) {
      if (this.completed) {
        return 'Segel pecah: DIPULIHKAN';
      }

      if (activeCount === this.switches.length) {
        return 'Fragmen: 3 / 3 • Kembali ke altar';
      }

      return `Fragmen segel: ${activeCount} / ${this.switches.length}`;
    }

    if (this.floorNumber === 6) {
      if (this.completed) {
        return 'Segel Keenam: STABIL';
      }

      if (this.level6Stage === 0) {
        return `Rune utama: ${this.sequenceIndex} / 3`;
      }

      if (this.level6Stage === 1) {
        const stabilizerCount =
          this.switches
            .slice(3, 5)
            .filter((item) => item.active)
            .length;

        return `Stabilizer: ${stabilizerCount} / 2`;
      }

      return 'Kembali ke altar Segel Keenam';
    }

    if (this.floorNumber === 7) {
      if (!this.level7BossDefeated) {
        const boss =
          this.enemyManager?.getBoss?.();

        if (!boss) {
          return 'ASTER — THE CORRUPTED WARDEN';
        }

        if (boss.isShielded?.()) {
          const order =
            this.level7SealOrders[
              this.level7SealCycle
            ] ??
            this.level7SealOrders[0];

          const target =
            order[
              this.level7SequenceIndex
            ] ??
            '';

          const names = {
            sun: 'MATAHARI',
            moon: 'BULAN',
            star: 'BINTANG',
          };

          const chargePercent =
            Math.round(
              Math.min(
                1,
                this.level7NodeCharge /
                this.level7NodeChargeRequired
              ) *
              100
            );

          return (
            `Seal ${this.level7SealCycle + 1}/3 • ` +
            `Target: ${names[target] ?? target} • ` +
            `Charge ${chargePercent}%`
          );
        }

        if (boss.isVulnerable?.()) {
          return 'SHIELD BREAK • SERANG ASTER SEKARANG!';
        }

        if (boss.getState?.() === 'enraged') {
          return 'ASTER ENRAGED • BERSIAP!';
        }

        return 'ASTER • HUNT';
      }

      if (!this.completed) {
        return 'The Core terbuka • Pulihkan Seventh Seal';
      }

      return 'Seventh Seal: RESTORED';
    }

    return '';
  }

  draw(ctx, camera) {
    if (
      this.switches.length === 0 &&
      this.doors.length === 0 &&
      this.tablets.length === 0
    ) {
      return;
    }

    this._drawSwitches(ctx, camera);
    this._drawDoors(ctx, camera);
    this._drawTablets(ctx, camera);
  }

  _drawSwitches(ctx, camera) {
    const level7Boss =
      this.floorNumber === 7
        ? this.enemyManager?.getBoss?.()
        : null;

    const level7ShieldActive =
      Boolean(
        level7Boss?.isShielded?.()
      );

    const level7Order =
      this.level7SealOrders[
        this.level7SealCycle
      ] ??
      [];

    const level7ExpectedKind =
      level7Order[
        this.level7SequenceIndex
      ];

    for (const sw of this.switches) {
      // Setelah barrier pecah / boss mati, Seal Node menghilang
      // supaya arena kembali bersih untuk combat.
      if (
        this.floorNumber === 7 &&
        (
          this.level7BossDefeated ||
          !level7ShieldActive
        )
      ) {
        continue;
      }
      if (
        sw.kind.startsWith('fragment') &&
        sw.active
      ) {
        continue;
      }

      const screen = camera.worldToScreen(sw.x, sw.y);

      let spriteKey;

      if (sw.kind === 'sun') {
        spriteKey = sw.active ? 'puzzleSunOn' : 'puzzleSunOff';
      } else if (sw.kind === 'moon') {
        spriteKey = sw.active ? 'puzzleMoonOn' : 'puzzleMoonOff';
      } else if (sw.kind === 'star') {
        spriteKey = sw.active ? 'puzzleStarOn' : 'puzzleStarOff';
      } else if (sw.kind.startsWith('torch')) {
        spriteKey = sw.active ? 'propTorchOn' : 'propTorchOff';
      } else if (sw.kind.startsWith('fragment')) {
        spriteKey = 'sealFragment';
      } else if (sw.kind.startsWith('stabilizer')) {
        spriteKey =
          sw.active
            ? 'puzzleSwitchOn'
            : 'puzzleSwitchOff';
      } else {
        spriteKey = sw.active ? 'puzzleSwitchOn' : 'puzzleSwitchOff';
      }

      const sprite = assetLoader.get(spriteKey);

      if (sprite) {
        const drawSize =
          this.floorNumber === 7
            ? 78
            : sw.kind.startsWith('torch')
              ? 54
              : sw.kind.startsWith('fragment')
                ? 46
                : 60;

        ctx.drawImage(
          sprite,
          screen.x - drawSize / 2,
          screen.y - drawSize / 2,
          drawSize,
          drawSize
        );

        // Nomor kecil agar clue "2 -> 4 -> 1 -> 3" mudah dipahami.
        if (sw.kind.startsWith('torch')) {
          const number =
            sw.kind.replace('torch', '');

          ctx.save();
          ctx.font = 'bold 11px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          ctx.fillStyle = 'rgba(0,0,0,0.8)';
          ctx.fillText(
            number,
            screen.x + 1,
            screen.y + 29
          );

          ctx.fillStyle = '#e5e7eb';
          ctx.fillText(
            number,
            screen.x,
            screen.y + 28
          );

          ctx.restore();
        }
      } else {
        // Fallback kalau sprite gagal dimuat.
        if (sw.kind === 'sun') {
          ctx.fillStyle = sw.active ? '#fbbf24' : '#78716c';
        } else if (sw.kind === 'moon') {
          ctx.fillStyle = sw.active ? '#38bdf8' : '#64748b';
        } else if (sw.kind === 'star') {
          ctx.fillStyle = sw.active ? '#a78bfa' : '#5b5875';
        } else if (sw.kind.startsWith('torch')) {
          ctx.fillStyle = sw.active ? '#f59e0b' : '#4b5563';
        } else if (sw.kind.startsWith('fragment')) {
          ctx.fillStyle = '#67e8f9';
        } else {
          ctx.fillStyle = sw.active ? '#60a5fa' : '#64748b';
        }

        ctx.fillRect(
          screen.x - 18,
          screen.y - 18,
          36,
          36
        );
      }

      // ===================================================
      // LEVEL 7 SEAL NODE VFX
      // ===================================================
      if (this.floorNumber === 7) {
        const isExpected =
          sw.kind ===
          level7ExpectedKind;

        const pulse =
          1 +
          Math.sin(
            performance.now() * 0.009
          ) *
          0.06;

        ctx.save();

        // Active node stays lit.
        if (sw.active) {
          ctx.globalAlpha = 0.9;
          ctx.strokeStyle = '#c4b5fd';
          ctx.lineWidth = 6;
          ctx.shadowBlur = 18;
          ctx.shadowColor = '#8b5cf6';

          ctx.beginPath();
          ctx.arc(
            screen.x,
            screen.y,
            46,
            0,
            Math.PI * 2
          );
          ctx.stroke();
        }

        // Expected node gets a large pulsing targeting ring.
        if (
          isExpected &&
          !sw.active
        ) {
          const ringRadius =
            51 * pulse;

          ctx.globalAlpha = 0.88;
          ctx.strokeStyle = '#f8fafc';
          ctx.lineWidth = 4;
          ctx.shadowBlur = 22;
          ctx.shadowColor =
            sw.kind === 'sun'
              ? '#fbbf24'
              : sw.kind === 'moon'
                ? '#38bdf8'
                : '#a78bfa';

          ctx.beginPath();

          ctx.arc(
            screen.x,
            screen.y,
            ringRadius,
            0,
            Math.PI * 2
          );

          ctx.stroke();

          // Charge arc.
          ctx.globalAlpha = 1;
          ctx.strokeStyle =
            sw.kind === 'sun'
              ? '#fbbf24'
              : sw.kind === 'moon'
                ? '#38bdf8'
                : '#a78bfa';

          ctx.lineWidth = 9;
          ctx.lineCap = 'round';

          ctx.beginPath();

          ctx.arc(
            screen.x,
            screen.y,
            43,
            -Math.PI / 2,
            -Math.PI / 2 +
            Math.PI *
            2 *
            Math.min(
              1,
              sw.charge ?? 0
            )
          );

          ctx.stroke();

          ctx.font =
            'bold 11px monospace';

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          ctx.fillStyle =
            'rgba(0,0,0,0.76)';

          ctx.fillText(
            'TARGET',
            screen.x + 1,
            screen.y - 57 + 1
          );

          ctx.fillStyle = '#ffffff';

          ctx.fillText(
            'TARGET',
            screen.x,
            screen.y - 57
          );
        }

        ctx.restore();
      }
    }
  }

  _drawDoors(ctx, camera) {
    const key = this.completed ? 'sealedDoorOpen' : 'sealedDoorClosed';
    const sprite = assetLoader.get(key);

    for (const door of this.doors) {
      const screen = camera.worldToScreen(door.x, door.y);

      if (sprite) {
        ctx.drawImage(sprite, screen.x - 32, screen.y - 32, 64, 64);
      } else {
        ctx.fillStyle = this.completed ? '#475569' : '#7c3aed';
        ctx.fillRect(screen.x - 32, screen.y - 32, 64, 64);
      }
    }
  }

  _drawTablets(ctx, camera) {
    for (let i = 0; i < this.tablets.length; i++) {
      const tablet = this.tablets[i];
      const screen = camera.worldToScreen(tablet.x, tablet.y);

      // Level 7 memakai story object pertama sebagai The Core.
      const isCore =
        this.floorNumber === 7 &&
        i === 0;

      if (isCore) {
        const sprite = assetLoader.get(
          this.level7CoreRestored
            ? 'theCoreRestored'
            : 'theCore'
        );

        if (sprite) {
          ctx.drawImage(
            sprite,
            screen.x - 38,
            screen.y - 38,
            76,
            76
          );
        } else {
          ctx.fillStyle =
            this.level7CoreRestored
              ? '#93c5fd'
              : '#7c3aed';

          ctx.beginPath();
          ctx.arc(
            screen.x,
            screen.y,
            28,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }

        continue;
      }

      // Altar puzzle:
      // Level 5 = tablet pertama.
      // Level 6 = tablet kedua.
      const isAltar =
        (
          this.floorNumber === 5 &&
          i === 0
        ) ||
        (
          this.floorNumber === 6 &&
          i === 1
        );

      if (isAltar) {
        const sprite = assetLoader.get(
          this.completed
            ? 'propAltarActive'
            : 'propAltarInactive'
        );

        if (sprite) {
          ctx.drawImage(
            sprite,
            screen.x - 34,
            screen.y - 34,
            68,
            68
          );
        } else {
          ctx.fillStyle =
            this.completed
              ? '#8b5cf6'
              : '#475569';

          ctx.fillRect(
            screen.x - 28,
            screen.y - 28,
            56,
            56
          );
        }

        continue;
      }

      // Level 2 tablet kedua adalah Expedition Journal.
      // Level 4 memakai journal untuk kedua story object.
      const isJournal =
        (
          this.floorNumber === 2 &&
          i === 1
        ) ||
        this.floorNumber === 4;

      const spriteKey =
        isJournal
          ? 'expeditionJournal'
          : 'dungeonMonument';

      const sprite = assetLoader.get(spriteKey);

      if (sprite) {
        if (isJournal) {
          // Journal kecil di lantai/meja.
          ctx.drawImage(
            sprite,
            screen.x - 22,
            screen.y - 22,
            44,
            44
          );
        } else {
          // Monument dibuat tinggi seperti stele dan anchor-nya di bagian bawah.
          ctx.drawImage(
            sprite,
            screen.x - 32,
            screen.y - 64,
            64,
            96
          );
        }
      } else {
        // Fallback kalau file asset gagal dimuat.
        ctx.fillStyle = isJournal ? '#8b6f47' : '#64748b';
        ctx.fillRect(
          screen.x - 18,
          screen.y - 24,
          36,
          isJournal ? 28 : 52
        );
      }
    }
  }
}
