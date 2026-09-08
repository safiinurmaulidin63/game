// TileMap.js
// Tugas: menyimpan denah lantai berupa grid 2D dan menyediakan semua
// query yang dibutuhkan objek lain (tabrakan, tangga, jalur, garis
// pandang), lalu menggambar hanya tile yang sedang terlihat di layar.
//
// Nilai grid:
//   0 = lantai kosong        1 = dinding (blokir)
//   2 = tangga (exit)        3 = rintangan/obstacle (blokir, seperti dinding)
//   4 = hazard/jebakan       5 = void/area di luar dungeon (blokir, tidak digambar)
//
// Untuk tahap ini:
//   - Lantai 1-7 memakai LevelData.js
//   - Lantai 7 adalah boss arena tanpa tangga

import { assetLoader } from '../core/AssetLoader.js';
import { getLevelLayout, hasLevelLayout } from './LevelData.js';

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export class TileMap {
  constructor(hasStairs = true, floorNumber = 1) {
    this.tileSize = 64;
    this.hasStairs = hasStairs;
    this.floorNumber = floorNumber;

    this.switchTiles = [];
    this.doorTiles = [];
    this.tabletTiles = [];
    this.manualDecorTiles = [];
    this.sealedDoorOpen = false;

    // Visual-only decorations. Tidak memengaruhi collision/gameplay.
    this.floorDecorations = [];
    this.wallDecorations = [];

    if (hasLevelLayout(this.floorNumber)) {
      // =========================
      // LEVEL MANUAL: MAP DARI LevelData.js
      // =========================
      const level = this._loadLevelData(
        getLevelLayout(this.floorNumber),
        this.hasStairs
      );

      this.cols = level.cols;
      this.rows = level.rows;
      this.grid = level.grid;

      this.stairsCol = level.stairsCol;
      this.stairsRow = level.stairsRow;

      this.switchTiles = level.switchTiles;
      this.doorTiles = level.doorTiles;
      this.tabletTiles = level.tabletTiles;
      this.manualDecorTiles = level.decorTiles;

      this.originX = (this.cols * this.tileSize) / 2;
      this.originY = (this.rows * this.tileSize) / 2;

      this.startWorldPos = this._tileCenterWorld(
        level.startCol,
        level.startRow
      );
    } else if (this.hasStairs) {
      // =========================
      // LEVEL 2-6: SISTEM LAMA
      // =========================
      this.cols = 27;
      this.rows = 21;
      this.grid = this._generateMaze();

      const startCol = 1;
      const startRow = 1;

      this._placeStairs(startCol, startRow);

      const obstacleCount = 6 + this.floorNumber;
      const hazardCount = 2 + Math.floor(this.floorNumber / 2);

      this._placeObstacles(obstacleCount, startCol, startRow);
      this._placeHazards(hazardCount, startCol, startRow);

      this.originX = (this.cols * this.tileSize) / 2;
      this.originY = (this.rows * this.tileSize) / 2;

      this.startWorldPos = this._tileCenterWorld(
        startCol,
        startRow
      );
    } else {
      // =========================
      // LEVEL BOSS: SISTEM LAMA
      // =========================
      this.cols = 25;
      this.rows = 18;
      this.grid = this._generateOpenRoom();

      this.originX = (this.cols * this.tileSize) / 2;
      this.originY = (this.rows * this.tileSize) / 2;

      this.startWorldPos = { x: 0, y: 0 };
    }

    // Dipakai EnemyManager untuk mencari posisi spawn valid.
    this.reachableOpenCells = this._computeReachableOpenCells();

    // Dibuat sekali saat lantai dibuat supaya dekorasi tidak berubah-ubah
    // setiap frame.
    this.floorDecorations = this._buildFloorDecorations();
    this.wallDecorations = this._buildWallDecorations();
  }

  // =====================================================
  // LEVEL DATA
  // =====================================================

  _loadLevelData(layout, requireStairs = true) {
    // Buang baris kosong di awal/akhir supaya ukuran map tidak membengkak.
    const rows = layout.slice();

    while (rows.length > 0 && rows[0].trim() === '') {
      rows.shift();
    }

    while (rows.length > 0 && rows[rows.length - 1].trim() === '') {
      rows.pop();
    }

    const cols = Math.max(...rows.map((row) => row.length));

    // 5 = VOID.
    // Void dianggap solid supaya player/enemy tidak bisa keluar dungeon,
    // tapi nanti tidak digambar.
    const grid = Array.from(
      { length: rows.length },
      () => new Array(cols).fill(5)
    );

    let startCol = null;
    let startRow = null;
    let stairsCol = null;
    let stairsRow = null;

    const switchTiles = [];
    const doorTiles = [];
    const tabletTiles = [];
    const decorTiles = [];

    for (let row = 0; row < rows.length; row++) {
      const line = rows[row];

      for (let col = 0; col < cols; col++) {
        const symbol = line[col] ?? ' ';

        switch (symbol) {
          case '#':
            grid[row][col] = 1;
            break;

          case '.':
            grid[row][col] = 0;
            break;

          case 'P':
            grid[row][col] = 0;
            startCol = col;
            startRow = row;
            break;

          case 'E':
            // Untuk tahap sekarang E dianggap lantai biasa.
            // Enemy spawn dari E akan disambungkan pada tahap berikutnya.
            grid[row][col] = 0;
            break;

          case 'O':
            grid[row][col] = 3;
            break;

          case 'K':
            grid[row][col] = 0;
            decorTiles.push({ col, row, type: 'crystal' });
            break;

          case 'B':
            grid[row][col] = 0;
            decorTiles.push({ col, row, type: 'bones' });
            break;

          case 'X':
            // Pressure switch berada di atas lantai.
            grid[row][col] = 0;
            switchTiles.push({ col, row });
            break;

          case 'D':
            // 6 = sealed door tertutup. Dibuka PuzzleManager menjadi floor.
            grid[row][col] = 6;
            doorTiles.push({ col, row });
            break;

          case 'T':
            // Tablet adalah objek overlay di atas lantai.
            grid[row][col] = 0;
            tabletTiles.push({ col, row });
            break;

          case 'S':
            grid[row][col] = 2;
            stairsCol = col;
            stairsRow = row;
            break;

          case ' ':
          default:
            grid[row][col] = 5;
            break;
        }
      }
    }

    if (startCol === null || startRow === null) {
      throw new Error('LevelData: simbol P (player spawn) tidak ditemukan.');
    }

    if (requireStairs && (stairsCol === null || stairsRow === null)) {
      throw new Error('LevelData: simbol S (stairs) tidak ditemukan.');
    }

    return {
      cols,
      rows: rows.length,
      grid,
      startCol,
      startRow,
      stairsCol,
      stairsRow,
      switchTiles,
      doorTiles,
      tabletTiles,
      decorTiles,
    };
  }

  // ================= GENERATOR DENAH =================

  _generateMaze() {
    const grid = [];

    for (let r = 0; r < this.rows; r++) {
      grid.push(new Array(this.cols).fill(1));
    }

    const mazeCols = (this.cols - 1) / 2;
    const mazeRows = (this.rows - 1) / 2;

    const toGrid = (mc, mr) => ({
      col: mc * 2 + 1,
      row: mr * 2 + 1,
    });

    const key = (mc, mr) => `${mc},${mr}`;

    const visited = new Set([key(0, 0)]);
    const stack = [[0, 0]];

    while (stack.length > 0) {
      const [mc, mr] = stack[stack.length - 1];
      const g = toGrid(mc, mr);

      grid[g.row][g.col] = 0;

      const options = [];

      for (const [dmc, dmr] of DIRS) {
        const nmc = mc + dmc;
        const nmr = mr + dmr;

        if (
          nmc >= 0 &&
          nmc < mazeCols &&
          nmr >= 0 &&
          nmr < mazeRows &&
          !visited.has(key(nmc, nmr))
        ) {
          options.push([nmc, nmr, dmc, dmr]);
        }
      }

      if (options.length === 0) {
        stack.pop();
        continue;
      }

      const [nmc, nmr, dmc, dmr] =
        options[Math.floor(Math.random() * options.length)];

      grid[g.row + dmr][g.col + dmc] = 0;

      const ng = toGrid(nmc, nmr);

      grid[ng.row][ng.col] = 0;

      visited.add(key(nmc, nmr));
      stack.push([nmc, nmr]);
    }

    return grid;
  }

  _generateOpenRoom() {
    const grid = [];

    for (let row = 0; row < this.rows; row++) {
      const rowArr = [];

      for (let col = 0; col < this.cols; col++) {
        const isBorder =
          row === 0 ||
          row === this.rows - 1 ||
          col === 0 ||
          col === this.cols - 1;

        rowArr.push(isBorder ? 1 : 0);
      }

      grid.push(rowArr);
    }

    this._addBlock(grid, 5, 4, 2, 2);
    this._addBlock(grid, this.cols - 8, this.rows - 7, 2, 2);

    return grid;
  }

  _addBlock(grid, startCol, startRow, width, height) {
    for (let r = startRow; r < startRow + height; r++) {
      for (let c = startCol; c < startCol + width; c++) {
        if (grid[r] && grid[r][c] !== undefined) {
          grid[r][c] = 1;
        }
      }
    }
  }

  _placeStairs(startCol, startRow) {
    const distances = this._bfsDistances(startCol, startRow);

    let best = null;
    let bestScore = -1;

    for (const [k, d] of distances) {
      const [c, r] = k.split(',').map(Number);

      if (c === startCol && r === startRow) continue;

      const openNeighbors = this._countOpenNeighbors(c, r);
      const score = d + (openNeighbors === 1 ? 1000 : 0);

      if (score > bestScore) {
        bestScore = score;
        best = { col: c, row: r };
      }
    }

    if (best) {
      this.grid[best.row][best.col] = 2;
      this.stairsCol = best.col;
      this.stairsRow = best.row;
    }
  }

  _placeObstacles(count, startCol, startRow) {
    let placed = 0;
    let attempts = 0;

    const maxAttempts = count * 25;

    while (placed < count && attempts < maxAttempts) {
      attempts++;

      const row =
        1 + Math.floor(Math.random() * (this.rows - 2));

      const col =
        1 + Math.floor(Math.random() * (this.cols - 2));

      if (this.grid[row][col] !== 0) continue;

      if (col === startCol && row === startRow) continue;

      if (
        this.hasStairs &&
        col === this.stairsCol &&
        row === this.stairsRow
      ) {
        continue;
      }

      this.grid[row][col] = 3;

      const reachable =
        this._bfsReachableSet(startCol, startRow);

      const stairsOk =
        !this.hasStairs ||
        reachable.has(
          `${this.stairsCol},${this.stairsRow}`
        );

      if (stairsOk) {
        placed++;
      } else {
        this.grid[row][col] = 0;
      }
    }
  }

  _placeHazards(count, startCol, startRow) {
    let placed = 0;
    let attempts = 0;

    const maxAttempts = count * 25;

    while (placed < count && attempts < maxAttempts) {
      attempts++;

      const row =
        1 + Math.floor(Math.random() * (this.rows - 2));

      const col =
        1 + Math.floor(Math.random() * (this.cols - 2));

      if (this.grid[row][col] !== 0) continue;

      if (col === startCol && row === startRow) continue;

      if (
        this.hasStairs &&
        col === this.stairsCol &&
        row === this.stairsRow
      ) {
        continue;
      }

      this.grid[row][col] = 4;
      placed++;
    }
  }

  _computeReachableOpenCells() {
    const startTile =
      this._worldToTile(
        this.startWorldPos.x,
        this.startWorldPos.y
      );

    const visited =
      this._bfsReachableSet(
        startTile.col,
        startTile.row
      );

    const cells = [];

    for (const k of visited) {
      const [c, r] = k.split(',').map(Number);

      if (this.grid[r][c] === 0) {
        cells.push({
          col: c,
          row: r,
        });
      }
    }

    return cells;
  }

  // ================= QUERY DASAR =================

  _inBounds(col, row) {
    return (
      row >= 0 &&
      row < this.rows &&
      col >= 0 &&
      col < this.cols
    );
  }

  _isBlocked(col, row) {
    const v = this.grid[row][col];

    return (
      v === 1 ||
      v === 3 ||
      v === 5 ||
      v === 6
    );
  }

  _countOpenNeighbors(col, row) {
    let count = 0;

    for (const [dc, dr] of DIRS) {
      const nc = col + dc;
      const nr = row + dr;

      if (
        this._inBounds(nc, nr) &&
        !this._isBlocked(nc, nr)
      ) {
        count++;
      }
    }

    return count;
  }

  _worldToTile(worldX, worldY) {
    const col =
      Math.floor(
        (worldX + this.originX) / this.tileSize
      );

    const row =
      Math.floor(
        (worldY + this.originY) / this.tileSize
      );

    return { col, row };
  }

  _tileCenterWorld(col, row) {
    return {
      x:
        col * this.tileSize -
        this.originX +
        this.tileSize / 2,

      y:
        row * this.tileSize -
        this.originY +
        this.tileSize / 2,
    };
  }

  isWallAtWorld(worldX, worldY) {
    const { col, row } =
      this._worldToTile(worldX, worldY);

    if (!this._inBounds(col, row)) {
      return true;
    }

    return this._isBlocked(col, row);
  }

  isStairsAtWorld(worldX, worldY) {
    if (!this.hasStairs) return false;

    const { col, row } =
      this._worldToTile(worldX, worldY);

    if (!this._inBounds(col, row)) {
      return false;
    }

    return this.grid[row][col] === 2;
  }

  isHazardAtWorld(worldX, worldY) {
    const { col, row } =
      this._worldToTile(worldX, worldY);

    if (!this._inBounds(col, row)) {
      return false;
    }

    return this.grid[row][col] === 4;
  }

  getStairsWorldPos() {
    if (
      !this.hasStairs ||
      this.stairsCol === undefined
    ) {
      return null;
    }

    return this._tileCenterWorld(
      this.stairsCol,
      this.stairsRow
    );
  }

  // ================= PUZZLE =================

  getPuzzleObjects() {
    const toWorld = (tile) => ({
      ...tile,
      ...this._tileCenterWorld(tile.col, tile.row),
    });

    return {
      switches: this.switchTiles.map(toWorld),
      doors: this.doorTiles.map(toWorld),
      tablets: this.tabletTiles.map(toWorld),
    };
  }

  setSealedDoorOpen(isOpen) {
    this.sealedDoorOpen = Boolean(isOpen);

    for (const door of this.doorTiles) {
      if (!this._inBounds(door.col, door.row)) continue;
      this.grid[door.row][door.col] = this.sealedDoorOpen ? 0 : 6;
    }
  }

  // ================= BFS =================

  _bfsDistances(startCol, startRow) {
    const key = (c, r) => `${c},${r}`;

    const dist =
      new Map([
        [key(startCol, startRow), 0],
      ]);

    const queue = [
      [startCol, startRow],
    ];

    while (queue.length > 0) {
      const [c, r] = queue.shift();

      const d =
        dist.get(
          key(c, r)
        );

      for (const [dc, dr] of DIRS) {
        const nc = c + dc;
        const nr = r + dr;

        if (
          this._inBounds(nc, nr) &&
          !this._isBlocked(nc, nr) &&
          !dist.has(key(nc, nr))
        ) {
          dist.set(
            key(nc, nr),
            d + 1
          );

          queue.push([
            nc,
            nr,
          ]);
        }
      }
    }

    return dist;
  }

  _bfsReachableSet(startCol, startRow) {
    const key = (c, r) => `${c},${r}`;

    const visited =
      new Set([
        key(startCol, startRow),
      ]);

    const queue = [
      [startCol, startRow],
    ];

    while (queue.length > 0) {
      const [c, r] = queue.shift();

      for (const [dc, dr] of DIRS) {
        const nc = c + dc;
        const nr = r + dr;

        if (
          this._inBounds(nc, nr) &&
          !this._isBlocked(nc, nr) &&
          !visited.has(key(nc, nr))
        ) {
          visited.add(
            key(nc, nr)
          );

          queue.push([
            nc,
            nr,
          ]);
        }
      }
    }

    return visited;
  }

  findWorldPath(
    fromWorldX,
    fromWorldY,
    toWorldX,
    toWorldY
  ) {
    const start =
      this._worldToTile(
        fromWorldX,
        fromWorldY
      );

    const goal =
      this._worldToTile(
        toWorldX,
        toWorldY
      );

    if (
      !this._inBounds(start.col, start.row) ||
      !this._inBounds(goal.col, goal.row)
    ) {
      return null;
    }

    const key = (c, r) => `${c},${r}`;

    const cameFrom =
      new Map([
        [
          key(start.col, start.row),
          null,
        ],
      ]);

    const queue = [
      [
        start.col,
        start.row,
      ],
    ];

    let found =
      start.col === goal.col &&
      start.row === goal.row;

    while (
      queue.length > 0 &&
      !found
    ) {
      const [c, r] =
        queue.shift();

      for (const [dc, dr] of DIRS) {
        const nc = c + dc;
        const nr = r + dr;

        if (
          this._inBounds(nc, nr) &&
          !this._isBlocked(nc, nr) &&
          !cameFrom.has(key(nc, nr))
        ) {
          cameFrom.set(
            key(nc, nr),
            key(c, r)
          );

          if (
            nc === goal.col &&
            nr === goal.row
          ) {
            found = true;
            break;
          }

          queue.push([
            nc,
            nr,
          ]);
        }
      }
    }

    if (!found) {
      return null;
    }

    const path = [];

    let curKey =
      key(
        goal.col,
        goal.row
      );

    while (curKey !== null) {
      const [c, r] =
        curKey
          .split(',')
          .map(Number);

      path.push(
        this._tileCenterWorld(
          c,
          r
        )
      );

      curKey =
        cameFrom.get(curKey);
    }

    path.reverse();
    path.shift();

    return path;
  }

  hasLineOfSight(
    x1,
    y1,
    x2,
    y2
  ) {
    const dx = x2 - x1;
    const dy = y2 - y1;

    const dist =
      Math.sqrt(
        dx * dx +
        dy * dy
      );

    const steps =
      Math.max(
        1,
        Math.ceil(dist / 8)
      );

    for (
      let i = 1;
      i < steps;
      i++
    ) {
      const t = i / steps;

      if (
        this.isWallAtWorld(
          x1 + dx * t,
          y1 + dy * t
        )
      ) {
        return false;
      }
    }

    return true;
  }

  getRandomOpenWorldPositions(
    count,
    avoidX,
    avoidY,
    minDist = 200
  ) {
    const all =
      this.reachableOpenCells.map(
        (cell) =>
          this._tileCenterWorld(
            cell.col,
            cell.row
          )
      );

    let pool =
      all.filter(
        (pos) =>
          Math.hypot(
            pos.x - avoidX,
            pos.y - avoidY
          ) >= minDist
      );

    if (pool.length < count) {
      pool = all.slice();
    }

    for (
      let i = pool.length - 1;
      i > 0;
      i--
    ) {
      const j =
        Math.floor(
          Math.random() *
          (i + 1)
        );

      [
        pool[i],
        pool[j],
      ] = [
        pool[j],
        pool[i],
      ];
    }

    return pool.slice(0, count);
  }


  // =====================================================
  // VISUAL THEME SYSTEM
  // =====================================================

  _visualTheme() {
    const themes = {
      1: {
        name: 'Forgotten Entrance',
        floors: ['tileFloor01', 'tileFloor01', 'tileFloor02', 'tileFloor03', 'tileFloor05'],
        rareFloors: ['tileFloor10'],
        rareChance: 3,
        wallDetails: ['wallDetail01', 'wallDetail02', 'wallDetail03'],
        wallDetailChance: 9,
        obstacleKeys: ['propCrackedBlock', 'propCrackedBlock', 'propRubbleBlock'],
        props: ['propSmallRocks', 'propUrn', 'propBones'],
        propChance: 13,
        torchChance: 5,
      },
      2: {
        name: 'Twin Seal Hall',
        floors: ['tileFloor01', 'tileFloor02', 'tileFloor03', 'tileFloor06'],
        rareFloors: ['tileFloor11'],
        rareChance: 5,
        wallDetails: ['wallDetail01', 'wallDetail03', 'wallDetail07'],
        wallDetailChance: 11,
        obstacleKeys: ['propCrackedBlock', 'propRubbleBlock'],
        props: ['propSmallRocks', 'propCrystal'],
        propChance: 11,
        torchChance: 7,
      },
      3: {
        name: 'Old Prison Corridors',
        floors: ['tileFloor02', 'tileFloor03', 'tileFloor05', 'tileFloor06'],
        rareFloors: ['tileFloor12', 'tileFloor10'],
        rareChance: 7,
        wallDetails: ['wallDetail02', 'wallDetail04', 'wallDetail05', 'wallDetail08'],
        wallDetailChance: 14,
        obstacleKeys: ['propRubbleBlock', 'propCrackedBlock'],
        props: ['propBones', 'propUrn', 'propSmallRocks'],
        propChance: 18,
        torchChance: 4,
      },
      4: {
        name: 'Forbidden Ritual',
        floors: ['tileFloor02', 'tileFloor03', 'tileFloor04', 'tileFloor06'],
        rareFloors: ['tileFloor11'],
        rareChance: 8,
        wallDetails: ['wallDetail01', 'wallDetail03', 'wallDetail07'],
        wallDetailChance: 12,
        obstacleKeys: ['propCrackedBlock', 'propRubbleBlock'],
        props: ['propCrystal', 'propBones', 'propUrn'],
        propChance: 16,
        torchChance: 14,
      },
      5: {
        name: 'Cracked Catacombs',
        floors: ['tileFloor04', 'tileFloor07', 'tileFloor09', 'tileFloor10'],
        rareFloors: ['tileFloor08', 'tileFloor12'],
        rareChance: 9,
        wallDetails: ['wallDetail02', 'wallDetail04', 'wallDetail06', 'wallDetail08'],
        wallDetailChance: 17,
        obstacleKeys: ['propMossBlock', 'propRubbleBlock', 'propCrackedBlock'],
        props: ['propBones', 'propSmallRocks', 'propUrn'],
        propChance: 22,
        torchChance: 5,
      },
      6: {
        name: 'Cursed Crystal Depths',
        floors: ['tileFloor03', 'tileFloor04', 'tileFloor07', 'tileFloor09'],
        rareFloors: ['tileFloor11'],
        rareChance: 9,
        wallDetails: ['wallDetail01', 'wallDetail03', 'wallDetail07'],
        wallDetailChance: 13,
        obstacleKeys: ['propRubbleBlock', 'propMossBlock'],
        props: ['propCrystal', 'propCrystal', 'propSmallRocks'],
        propChance: 20,
        torchChance: 10,
      },
      7: {
        name: 'Seventh Seal Throne',
        floors: ['tileFloor01', 'tileFloor02', 'tileFloor03', 'tileFloor06'],
        rareFloors: ['tileFloor11'],
        rareChance: 5,
        wallDetails: ['wallDetail01', 'wallDetail02', 'wallDetail03', 'wallDetail07'],
        wallDetailChance: 15,
        obstacleKeys: ['propCrackedBlock', 'propRubbleBlock'],
        props: ['propCrystal', 'propSmallRocks'],
        propChance: 8,
        torchChance: 13,
      },
    };

    return themes[this.floorNumber] ?? themes[1];
  }

  _hashTile(col, row, salt = 0) {
    let n =
      Math.imul(col + 17, 73856093) ^
      Math.imul(row + 29, 19349663) ^
      Math.imul(this.floorNumber + 7, 83492791) ^
      Math.imul(salt + 11, 2654435761);

    n >>>= 0;
    n ^= n >>> 16;
    n = Math.imul(n, 2246822507);
    n ^= n >>> 13;
    n = Math.imul(n, 3266489909);
    n ^= n >>> 16;

    return n >>> 0;
  }

  _pickFrom(list, col, row, salt = 0) {
    if (!list || list.length === 0) return null;
    const i = this._hashTile(col, row, salt) % list.length;
    return list[i];
  }

  _floorSpriteKey(col, row) {
    const theme = this._visualTheme();

    // Rune/grate/rare floor cukup jarang supaya tidak terlihat ramai.
    const rareRoll = this._hashTile(col, row, 41) % 100;

    if (
      theme.rareFloors.length > 0 &&
      rareRoll < theme.rareChance
    ) {
      return this._pickFrom(theme.rareFloors, col, row, 42);
    }

    return this._pickFrom(theme.floors, col, row, 43) ?? 'tileFloor';
  }

  _obstacleSpriteKey(col, row) {
    const theme = this._visualTheme();
    return this._pickFrom(theme.obstacleKeys, col, row, 51) ?? 'tileObstacle';
  }

  _wallDetailSpriteKey(col, row) {
    const theme = this._visualTheme();
    const roll = this._hashTile(col, row, 61) % 100;

    if (roll >= theme.wallDetailChance) {
      return null;
    }

    return this._pickFrom(theme.wallDetails, col, row, 62);
  }

  _isFloorLikeTile(col, row) {
    if (!this._inBounds(col, row)) return false;

    const tile = this.grid[row][col];

    return (
      tile === 0 ||
      tile === 2 ||
      tile === 3 ||
      tile === 4 ||
      tile === 6
    );
  }

  _isReservedDecorationTile(col, row) {
    const sameTile = (tile) =>
      tile.col === col &&
      tile.row === row;

    if (
      this.switchTiles.some(sameTile) ||
      this.doorTiles.some(sameTile) ||
      this.tabletTiles.some(sameTile)
    ) {
      return true;
    }

    if (
      this.hasStairs &&
      col === this.stairsCol &&
      row === this.stairsRow
    ) {
      return true;
    }

    const startTile =
      this._worldToTile(
        this.startWorldPos.x,
        this.startWorldPos.y
      );

    // Spawn player diberi area kosong 2 tile.
    if (
      Math.abs(col - startTile.col) <= 2 &&
      Math.abs(row - startTile.row) <= 2
    ) {
      return true;
    }

    return false;
  }

  _buildFloorDecorations() {
    const result = [];
    const occupied = new Set();

    const add = (col, row, spriteKey, size = 46, yOffset = 0) => {
      const key = `${col},${row}`;
      if (occupied.has(key)) return;
      occupied.add(key);

      result.push({
        col,
        row,
        spriteKey,
        size,
        yOffset,
      });
    };

    // Simbol K/B dari LevelData selalu dipakai dulu.
    for (const item of this.manualDecorTiles) {
      if (item.type === 'crystal') {
        add(item.col, item.row, 'propCrystal', 52, -3);
      }

      if (item.type === 'bones') {
        add(item.col, item.row, 'propBones', 48, 5);
      }
    }

    const theme = this._visualTheme();

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (this.grid[row][col] !== 0) continue;
        if (this._isReservedDecorationTile(col, row)) continue;

        // Hindari memenuhi lorong sempit.
        if (this._countOpenNeighbors(col, row) < 3) continue;

        const roll = this._hashTile(col, row, 71) % 1000;

        // propChance ditulis dalam kira-kira per-seribu.
        if (roll >= theme.propChance) continue;

        const spriteKey =
          this._pickFrom(theme.props, col, row, 72);

        if (!spriteKey) continue;

        let size = 42;
        let yOffset = 6;

        if (spriteKey === 'propCrystal') {
          size = 50;
          yOffset = -2;
        } else if (spriteKey === 'propBones') {
          size = 46;
          yOffset = 7;
        } else if (spriteKey === 'propUrn') {
          size = 40;
          yOffset = 5;
        } else if (spriteKey === 'propSmallRocks') {
          size = 42;
          yOffset = 10;
        }

        add(col, row, spriteKey, size, yOffset);
      }
    }

    // Final floor dibuat lebih megah: empat rune visual simetris.
    if (this.floorNumber === 7) {
      const centerCol = Math.floor(this.cols / 2);
      const centerRow = 15;

      const runes = [
        [centerCol - 7, centerRow - 5],
        [centerCol + 7, centerRow - 5],
        [centerCol - 7, centerRow + 6],
        [centerCol + 7, centerRow + 6],
      ];

      for (const [col, row] of runes) {
        if (
          this._inBounds(col, row) &&
          this.grid[row][col] === 0
        ) {
          add(col, row, 'propFloorRune', 64, 0);
        }
      }
    }

    return result;
  }

  _buildWallDecorations() {
    const result = [];
    const theme = this._visualTheme();

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (this.grid[row][col] !== 1) continue;

        // Torch hanya ditempel di dinding yang punya lantai persis di bawahnya.
        if (!this._isFloorLikeTile(col, row + 1)) continue;

        const roll = this._hashTile(col, row, 81) % 1000;
        if (roll >= theme.torchChance) continue;

        result.push({
          col,
          row,
          spriteKey: 'propTorchOn',
          size: 46,
          xOffset: 0,
          yOffset: 16,
        });
      }
    }

    return result;
  }

  _drawFloorBase(ctx, screen, col, row) {
    const key = this._floorSpriteKey(col, row);
    const sprite =
      assetLoader.get(key) ??
      assetLoader.get('tileFloor');

    if (sprite) {
      ctx.drawImage(
        sprite,
        screen.x,
        screen.y,
        this.tileSize,
        this.tileSize
      );
    } else {
      ctx.fillStyle = '#5f473c';
      ctx.fillRect(
        screen.x,
        screen.y,
        this.tileSize,
        this.tileSize
      );
    }
  }

  _drawVisualDecorations(ctx, camera) {
    for (const item of this.floorDecorations) {
      const worldX =
        item.col * this.tileSize -
        this.originX;

      const worldY =
        item.row * this.tileSize -
        this.originY;

      const screen =
        camera.worldToScreen(worldX, worldY);

      const sprite =
        assetLoader.get(item.spriteKey);

      if (!sprite) continue;

      ctx.drawImage(
        sprite,
        screen.x + (this.tileSize - item.size) / 2,
        screen.y + (this.tileSize - item.size) / 2 + item.yOffset,
        item.size,
        item.size
      );
    }

    for (const item of this.wallDecorations) {
      const worldX =
        item.col * this.tileSize -
        this.originX;

      const worldY =
        item.row * this.tileSize -
        this.originY;

      const screen =
        camera.worldToScreen(worldX, worldY);

      const sprite =
        assetLoader.get(item.spriteKey);

      if (!sprite) continue;

      ctx.drawImage(
        sprite,
        screen.x + (this.tileSize - item.size) / 2 + item.xOffset,
        screen.y + (this.tileSize - item.size) / 2 + item.yOffset,
        item.size,
        item.size
      );
    }
  }

  // ================= GAMBAR =================

  draw(ctx, camera) {
    const canvas = camera.canvas;

    const startCol =
      Math.max(
        0,
        Math.floor(
          (camera.x + this.originX) /
          this.tileSize
        ) - 1
      );

    const endCol =
      Math.min(
        this.cols - 1,
        Math.ceil(
          (
            camera.x +
            this.originX +
            canvas.width
          ) /
          this.tileSize
        ) + 1
      );

    const startRow =
      Math.max(
        0,
        Math.floor(
          (camera.y + this.originY) /
          this.tileSize
        ) - 1
      );

    const endRow =
      Math.min(
        this.rows - 1,
        Math.ceil(
          (
            camera.y +
            this.originY +
            canvas.height
          ) /
          this.tileSize
        ) + 1
      );

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const worldX =
          col * this.tileSize -
          this.originX;

        const worldY =
          row * this.tileSize -
          this.originY;

        const screen =
          camera.worldToScreen(
            worldX,
            worldY
          );

        const tile =
          this.grid[row][col];

        // Void tidak digambar.
        if (tile === 5) {
          continue;
        }

        // -------------------------------------------------
        // WALL
        // -------------------------------------------------
        if (tile === 1) {
          const wall =
            assetLoader.get('tileWall');

          if (wall) {
            ctx.drawImage(
              wall,
              screen.x,
              screen.y,
              this.tileSize,
              this.tileSize
            );
          } else {
            ctx.fillStyle = '#4b556b';
            ctx.fillRect(
              screen.x,
              screen.y,
              this.tileSize,
              this.tileSize
            );
          }

          // Detail dinding digambar di atas wall utama supaya area transparan
          // tidak membuat lubang hitam.
          const detailKey =
            this._wallDetailSpriteKey(col, row);

          if (detailKey) {
            const detail =
              assetLoader.get(detailKey);

            if (detail) {
              ctx.save();
              ctx.globalAlpha = 0.82;
              ctx.drawImage(
                detail,
                screen.x,
                screen.y,
                this.tileSize,
                this.tileSize
              );
              ctx.restore();
            }
          }

          continue;
        }

        // -------------------------------------------------
        // FLOOR BASE
        // Semua tile selain wall/void punya lantai di bawahnya.
        // Ini juga menghilangkan kotak gelap di belakang obstacle.
        // -------------------------------------------------
        this._drawFloorBase(
          ctx,
          screen,
          col,
          row
        );

        // Tangga
        if (tile === 2) {
          const sprite =
            assetLoader.get('tileStairs');

          if (sprite) {
            ctx.drawImage(
              sprite,
              screen.x,
              screen.y,
              this.tileSize,
              this.tileSize
            );
          }
        }

        // Obstacle collision tile
        if (tile === 3) {
          const obstacleKey =
            this._obstacleSpriteKey(col, row);

          const sprite =
            assetLoader.get(obstacleKey) ??
            assetLoader.get('tileObstacle');

          if (sprite) {
            ctx.drawImage(
              sprite,
              screen.x,
              screen.y,
              this.tileSize,
              this.tileSize
            );
          }
        }

        // Hazard legacy jika suatu saat dipakai lagi.
        if (tile === 4) {
          const sprite =
            assetLoader.get('tileHazard');

          if (sprite) {
            ctx.drawImage(
              sprite,
              screen.x,
              screen.y,
              this.tileSize,
              this.tileSize
            );
          }
        }

        // tile 6 (sealed door) cukup floor base.
        // Pintu sendiri digambar PuzzleManager.
      }
    }

    // Visual-only props digambar setelah tile map, tetapi masih di bawah
    // player/enemy karena TileMap.draw dipanggil sebagai background.
    this._drawVisualDecorations(ctx, camera);
  }}
