// TileMap.js
// Tugas: menyimpan denah lantai berupa grid 2D dan menyediakan semua
// query yang dibutuhkan objek lain (tabrakan, tangga, jalur, garis
// pandang), lalu menggambar hanya tile yang sedang terlihat di layar.
//
// Nilai grid:
//   0 = lantai kosong        1 = dinding (blokir)
//   2 = tangga (exit)        3 = rintangan/obstacle (blokir, seperti dinding)
//   4 = hazard/jebakan (TIDAK blokir, tapi menyakiti kalau diinjak)
//
// Dua mode denah:
//   - Lantai biasa (hasStairs = true)  -> LABIRIN acak (recursive backtracker)
//   - Lantai boss  (hasStairs = false) -> ruangan terbuka (biar ada ruang kiting)
//
// hasStairs dipakai juga sebagai penanda "apakah ini lantai labirin",
// karena kebetulan cuma lantai boss yang sekaligus tidak berlabirin DAN
// tidak punya tangga.

import { assetLoader } from '../core/AssetLoader.js';

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

    if (this.hasStairs) {
      // --- Lantai labirin --- (cols & rows HARUS ganjil, dipakai algoritma maze)
      this.cols = 27;
      this.rows = 21;
      this.grid = this._generateMaze();

      const startCol = 1;
      const startRow = 1;

      this._placeStairs(startCol, startRow);

      // Makin tinggi lantai, makin banyak rintangan & jebakan
      const obstacleCount = 6 + this.floorNumber;
      const hazardCount = 2 + Math.floor(this.floorNumber / 2);
      this._placeObstacles(obstacleCount, startCol, startRow);
      this._placeHazards(hazardCount, startCol, startRow);

      this.originX = (this.cols * this.tileSize) / 2;
      this.originY = (this.rows * this.tileSize) / 2;
      this.startWorldPos = this._tileCenterWorld(startCol, startRow);
    } else {
      // --- Lantai boss: ruangan terbuka, bukan labirin ---
      this.cols = 25;
      this.rows = 18;
      this.grid = this._generateOpenRoom();

      this.originX = (this.cols * this.tileSize) / 2;
      this.originY = (this.rows * this.tileSize) / 2;
      this.startWorldPos = { x: 0, y: 0 };
    }

    // Dipakai EnemyManager untuk cari titik spawn musuh yang valid (bukan di dalam dinding)
    this.reachableOpenCells = this._computeReachableOpenCells();
  }

  // ================= GENERATOR DENAH =================

  // Recursive backtracker: sel "nyata" cuma di koordinat ganjil (1,3,5,...),
  // sel genap adalah calon dinding di antara dua sel yang mungkin dibongkar.
  _generateMaze() {
    const grid = [];
    for (let r = 0; r < this.rows; r++) {
      grid.push(new Array(this.cols).fill(1)); // semua mulai sebagai dinding
    }

    const mazeCols = (this.cols - 1) / 2;
    const mazeRows = (this.rows - 1) / 2;
    const toGrid = (mc, mr) => ({ col: mc * 2 + 1, row: mr * 2 + 1 });
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
          nmc >= 0 && nmc < mazeCols &&
          nmr >= 0 && nmr < mazeRows &&
          !visited.has(key(nmc, nmr))
        ) {
          options.push([nmc, nmr, dmc, dmr]);
        }
      }

      if (options.length === 0) {
        stack.pop();
        continue;
      }

      const [nmc, nmr, dmc, dmr] = options[Math.floor(Math.random() * options.length)];

      // Bongkar dinding di antara sel sekarang & sel tujuan, lalu sel tujuannya sendiri
      grid[g.row + dmr][g.col + dmc] = 0;
      const ng = toGrid(nmc, nmr);
      grid[ng.row][ng.col] = 0;

      visited.add(key(nmc, nmr));
      stack.push([nmc, nmr]);
    }

    return grid;
  }

  // Denah lama (ruangan + beberapa pilar) — dipakai khusus lantai boss
  _generateOpenRoom() {
    const grid = [];
    for (let row = 0; row < this.rows; row++) {
      const rowArr = [];
      for (let col = 0; col < this.cols; col++) {
        const isBorder =
          row === 0 || row === this.rows - 1 || col === 0 || col === this.cols - 1;
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

  // Taruh tangga di sel TERJAUH (BFS) dari start, diprioritaskan yang jalan buntu
  // (cuma 1 tetangga terbuka) supaya berasa seperti "ujung labirin".
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

  // Coba taruh obstacle satu-satu; tiap percobaan divalidasi lewat BFS —
  // kalau ternyata membuat tangga jadi TIDAK terjangkau, batalkan.
  // Dengan cara ini labirin DIJAMIN selalu bisa diselesaikan.
  _placeObstacles(count, startCol, startRow) {
    let placed = 0;
    let attempts = 0;
    const maxAttempts = count * 25;

    while (placed < count && attempts < maxAttempts) {
      attempts++;
      const row = 1 + Math.floor(Math.random() * (this.rows - 2));
      const col = 1 + Math.floor(Math.random() * (this.cols - 2));

      if (this.grid[row][col] !== 0) continue;
      if (col === startCol && row === startRow) continue;
      if (this.hasStairs && col === this.stairsCol && row === this.stairsRow) continue;

      this.grid[row][col] = 3;

      const reachable = this._bfsReachableSet(startCol, startRow);
      const stairsOk = !this.hasStairs || reachable.has(`${this.stairsCol},${this.stairsRow}`);

      if (stairsOk) {
        placed++;
      } else {
        this.grid[row][col] = 0; // batal, ini bikin buntu total
      }
    }
  }

  // Jebakan TIDAK menghalangi jalan, jadi tidak perlu validasi BFS
  _placeHazards(count, startCol, startRow) {
    let placed = 0;
    let attempts = 0;
    const maxAttempts = count * 25;

    while (placed < count && attempts < maxAttempts) {
      attempts++;
      const row = 1 + Math.floor(Math.random() * (this.rows - 2));
      const col = 1 + Math.floor(Math.random() * (this.cols - 2));

      if (this.grid[row][col] !== 0) continue;
      if (col === startCol && row === startRow) continue;
      if (this.hasStairs && col === this.stairsCol && row === this.stairsRow) continue;

      this.grid[row][col] = 4;
      placed++;
    }
  }

  _computeReachableOpenCells() {
    const startTile = this._worldToTile(this.startWorldPos.x, this.startWorldPos.y);
    const visited = this._bfsReachableSet(startTile.col, startTile.row);

    const cells = [];
    for (const k of visited) {
      const [c, r] = k.split(',').map(Number);
      if (this.grid[r][c] === 0) cells.push({ col: c, row: r });
    }
    return cells;
  }

  // ================= QUERY DASAR =================

  _inBounds(col, row) {
    return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
  }

  _isBlocked(col, row) {
    const v = this.grid[row][col];
    return v === 1 || v === 3;
  }

  _countOpenNeighbors(col, row) {
    let count = 0;
    for (const [dc, dr] of DIRS) {
      const nc = col + dc;
      const nr = row + dr;
      if (this._inBounds(nc, nr) && !this._isBlocked(nc, nr)) count++;
    }
    return count;
  }

  _worldToTile(worldX, worldY) {
    const col = Math.floor((worldX + this.originX) / this.tileSize);
    const row = Math.floor((worldY + this.originY) / this.tileSize);
    return { col, row };
  }

  _tileCenterWorld(col, row) {
    return {
      x: col * this.tileSize - this.originX + this.tileSize / 2,
      y: row * this.tileSize - this.originY + this.tileSize / 2,
    };
  }

  isWallAtWorld(worldX, worldY) {
    const { col, row } = this._worldToTile(worldX, worldY);
    if (!this._inBounds(col, row)) return true;
    return this._isBlocked(col, row);
  }

  isStairsAtWorld(worldX, worldY) {
    if (!this.hasStairs) return false;
    const { col, row } = this._worldToTile(worldX, worldY);
    if (!this._inBounds(col, row)) return false;
    return this.grid[row][col] === 2;
  }

  isHazardAtWorld(worldX, worldY) {
    const { col, row } = this._worldToTile(worldX, worldY);
    if (!this._inBounds(col, row)) return false;
    return this.grid[row][col] === 4;
  }

  // Dipakai Game.js untuk compass: posisi tangga dalam koordinat world,
  // atau null kalau lantai ini tidak punya tangga (lantai boss).
  getStairsWorldPos() {
    if (!this.hasStairs || this.stairsCol === undefined) return null;
    return this._tileCenterWorld(this.stairsCol, this.stairsRow);
  }

  // ================= BFS: JARAK, JANGKAUAN, JALUR =================

  _bfsDistances(startCol, startRow) {
    const key = (c, r) => `${c},${r}`;
    const dist = new Map([[key(startCol, startRow), 0]]);
    const queue = [[startCol, startRow]];

    while (queue.length > 0) {
      const [c, r] = queue.shift();
      const d = dist.get(key(c, r));
      for (const [dc, dr] of DIRS) {
        const nc = c + dc;
        const nr = r + dr;
        if (this._inBounds(nc, nr) && !this._isBlocked(nc, nr) && !dist.has(key(nc, nr))) {
          dist.set(key(nc, nr), d + 1);
          queue.push([nc, nr]);
        }
      }
    }
    return dist;
  }

  _bfsReachableSet(startCol, startRow) {
    const key = (c, r) => `${c},${r}`;
    const visited = new Set([key(startCol, startRow)]);
    const queue = [[startCol, startRow]];

    while (queue.length > 0) {
      const [c, r] = queue.shift();
      for (const [dc, dr] of DIRS) {
        const nc = c + dc;
        const nr = r + dr;
        if (this._inBounds(nc, nr) && !this._isBlocked(nc, nr) && !visited.has(key(nc, nr))) {
          visited.add(key(nc, nr));
          queue.push([nc, nr]);
        }
      }
    }
    return visited;
  }

  // Cari jalur terpendek (BFS) dari satu titik world ke titik world lain.
  // Dipakai Enemy.js supaya musuh bisa muter lewat lorong, bukan jalan lurus
  // tembus dinding. Return array titik world (tanpa titik awal), atau null
  // kalau tidak ada jalur.
  findWorldPath(fromWorldX, fromWorldY, toWorldX, toWorldY) {
    const start = this._worldToTile(fromWorldX, fromWorldY);
    const goal = this._worldToTile(toWorldX, toWorldY);

    if (!this._inBounds(start.col, start.row) || !this._inBounds(goal.col, goal.row)) {
      return null;
    }

    const key = (c, r) => `${c},${r}`;
    const cameFrom = new Map([[key(start.col, start.row), null]]);
    const queue = [[start.col, start.row]];
    let found = start.col === goal.col && start.row === goal.row;

    while (queue.length > 0 && !found) {
      const [c, r] = queue.shift();
      for (const [dc, dr] of DIRS) {
        const nc = c + dc;
        const nr = r + dr;
        if (this._inBounds(nc, nr) && !this._isBlocked(nc, nr) && !cameFrom.has(key(nc, nr))) {
          cameFrom.set(key(nc, nr), key(c, r));
          if (nc === goal.col && nr === goal.row) {
            found = true;
            break;
          }
          queue.push([nc, nr]);
        }
      }
    }

    if (!found) return null;

    const path = [];
    let curKey = key(goal.col, goal.row);
    while (curKey !== null) {
      const [c, r] = curKey.split(',').map(Number);
      path.push(this._tileCenterWorld(c, r));
      curKey = cameFrom.get(curKey);
    }
    path.reverse();
    path.shift(); // buang sel awal (posisi musuh sekarang), sisakan langkah berikutnya dst.
    return path;
  }

  // Garis pandang lurus: dipakai musuh ranged supaya cuma menembak kalau
  // benar-benar tidak terhalang dinding/rintangan di antara dia & player.
  hasLineOfSight(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(1, Math.ceil(dist / 8));

    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (this.isWallAtWorld(x1 + dx * t, y1 + dy * t)) return false;
    }
    return true;
  }

  // Ambil sejumlah posisi lantai kosong acak yang valid untuk spawn musuh,
  // diusahakan berjarak minimal dari titik tertentu (biasanya posisi player).
  getRandomOpenWorldPositions(count, avoidX, avoidY, minDist = 200) {
    const all = this.reachableOpenCells.map((cell) => this._tileCenterWorld(cell.col, cell.row));

    let pool = all.filter((pos) => Math.hypot(pos.x - avoidX, pos.y - avoidY) >= minDist);
    if (pool.length < count) pool = all.slice(); // kalau kurang, longgarkan syarat jarak

    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    return pool.slice(0, count);
  }

  // ================= GAMBAR =================

  draw(ctx, camera) {
    const canvas = camera.canvas;

    const startCol = Math.max(0, Math.floor((camera.x + this.originX) / this.tileSize) - 1);
    const endCol = Math.min(
      this.cols - 1,
      Math.ceil((camera.x + this.originX + canvas.width) / this.tileSize) + 1
    );
    const startRow = Math.max(0, Math.floor((camera.y + this.originY) / this.tileSize) - 1);
    const endRow = Math.min(
      this.rows - 1,
      Math.ceil((camera.y + this.originY + canvas.height) / this.tileSize) + 1
    );

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const worldX = col * this.tileSize - this.originX;
        const worldY = row * this.tileSize - this.originY;
        const screen = camera.worldToScreen(worldX, worldY);
        const tile = this.grid[row][col];

        let spriteKey = 'tileFloor';
        if (tile === 1) spriteKey = 'tileWall';
        if (tile === 2) spriteKey = 'tileStairs';
        if (tile === 3) spriteKey = 'tileObstacle';
        if (tile === 4) spriteKey = 'tileHazard';

        const sprite = assetLoader.get(spriteKey);

        if (sprite) {
          ctx.drawImage(sprite, screen.x, screen.y, this.tileSize, this.tileSize);
        } else {
          if (tile === 1) ctx.fillStyle = '#4b3621';
          else if (tile === 2) ctx.fillStyle = '#facc15';
          else if (tile === 3) ctx.fillStyle = '#78350f';
          else if (tile === 4) ctx.fillStyle = '#7f1d1d';
          else ctx.fillStyle = '#2a2a35';
          ctx.fillRect(screen.x, screen.y, this.tileSize, this.tileSize);
        }

        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.strokeRect(screen.x, screen.y, this.tileSize, this.tileSize);

        // Fallback glyph kalau sprite belum dipasang, biar tetap jelas fungsinya
        if (!sprite && (tile === 2 || tile === 4)) {
          ctx.fillStyle = tile === 2 ? '#111' : '#fde68a';
          ctx.font = 'bold 20px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(tile === 2 ? '▲' : '✦', screen.x + this.tileSize / 2, screen.y + this.tileSize / 2);
          ctx.textAlign = 'left';
          ctx.textBaseline = 'alphabetic';
        }
      }
    }
  }
}
