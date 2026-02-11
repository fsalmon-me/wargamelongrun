// ─── Map Engine ────────────────────────────────────────────────────────────
// Pure logic for map operations — no Firebase dependency
import type { Tile, MapChunk, GameMap } from '../../models/game';
import { TerrainType, TERRAIN_DEFS, ROAD_MODIFIERS, RIVER_MODIFIERS } from '../../models/terrain';

const DEFAULT_CHUNK_SIZE = 10;

// ─── Tile Grid (in-memory representation) ─────────────────────────────────

export class TileGrid {
  readonly width: number;
  readonly height: number;
  private tiles: Map<string, Tile>;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.tiles = new Map();
  }

  private key(x: number, y: number): string {
    return `${x},${y}`;
  }

  getTile(x: number, y: number): Tile | undefined {
    return this.tiles.get(this.key(x, y));
  }

  setTile(tile: Tile): void {
    this.tiles.set(this.key(tile.x, tile.y), tile);
  }

  getAllTiles(): Tile[] {
    return Array.from(this.tiles.values());
  }

  isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  /** Get orthogonal neighbors (4-directional for square grid) */
  getNeighbors(x: number, y: number): Tile[] {
    const dirs = [
      [0, -1], [0, 1], [-1, 0], [1, 0], // N, S, W, E
      [-1, -1], [1, -1], [-1, 1], [1, 1], // diagonals
    ];
    const result: Tile[] = [];
    for (const [dx, dy] of dirs) {
      const nx = x + (dx ?? 0);
      const ny = y + (dy ?? 0);
      if (this.isInBounds(nx, ny)) {
        const t = this.getTile(nx, ny);
        if (t) result.push(t);
      }
    }
    return result;
  }

  /** Get only 4-directional neighbors (no diagonals) */
  getCardinalNeighbors(x: number, y: number): Tile[] {
    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    const result: Tile[] = [];
    for (const [dx, dy] of dirs) {
      const nx = x + (dx ?? 0);
      const ny = y + (dy ?? 0);
      if (this.isInBounds(nx, ny)) {
        const t = this.getTile(nx, ny);
        if (t) result.push(t);
      }
    }
    return result;
  }

  /** Get effective movement cost for a tile */
  getMovementCost(tile: Tile): number {
    const def = TERRAIN_DEFS[tile.terrain];
    if (!def) return 99;
    if (tile.road) return ROAD_MODIFIERS.movementCostOverride;
    return def.movementCost;
  }

  /** Get effective defense bonus for a tile */
  getDefenseBonus(tile: Tile): number {
    const def = TERRAIN_DEFS[tile.terrain];
    if (!def) return 1.0;
    let bonus = def.defenseBonus;
    if (tile.river) bonus += RIVER_MODIFIERS.defenseBonus;
    return bonus;
  }

  /** Load from chunks */
  static fromChunks(chunks: MapChunk[], width: number, height: number): TileGrid {
    const grid = new TileGrid(width, height);
    for (const chunk of chunks) {
      for (const tile of chunk.tiles) {
        grid.setTile(tile);
      }
    }
    return grid;
  }

  /** Export to chunks */
  toChunks(chunkSize: number = DEFAULT_CHUNK_SIZE): MapChunk[] {
    const chunkMap = new Map<string, Tile[]>();

    for (const tile of this.tiles.values()) {
      const cx = Math.floor(tile.x / chunkSize);
      const cy = Math.floor(tile.y / chunkSize);
      const key = `${cx}_${cy}`;
      if (!chunkMap.has(key)) chunkMap.set(key, []);
      chunkMap.get(key)!.push(tile);
    }

    const chunks: MapChunk[] = [];
    for (const [key, tiles] of chunkMap) {
      const [cxStr, cyStr] = key.split('_');
      chunks.push({
        chunkX: parseInt(cxStr ?? '0'),
        chunkY: parseInt(cyStr ?? '0'),
        tiles,
      });
    }
    return chunks;
  }

  /** Expand map by adding empty tiles */
  expand(direction: 'north' | 'south' | 'east' | 'west', amount: number, fillTerrain: TerrainType = TerrainType.Sea): TileGrid {
    let newWidth = this.width;
    let newHeight = this.height;
    let offsetX = 0;
    let offsetY = 0;

    switch (direction) {
      case 'north': newHeight += amount; offsetY = amount; break;
      case 'south': newHeight += amount; break;
      case 'east': newWidth += amount; break;
      case 'west': newWidth += amount; offsetX = amount; break;
    }

    const newGrid = new TileGrid(newWidth, newHeight);

    // Copy existing tiles with offset
    for (const tile of this.tiles.values()) {
      newGrid.setTile({
        ...tile,
        x: tile.x + offsetX,
        y: tile.y + offsetY,
      });
    }

    // Fill new tiles
    for (let x = 0; x < newWidth; x++) {
      for (let y = 0; y < newHeight; y++) {
        if (!newGrid.getTile(x, y)) {
          newGrid.setTile({
            x, y,
            terrain: fillTerrain,
            river: false,
            road: false,
            ownerId: null,
          });
        }
      }
    }

    return newGrid;
  }

  /** Shrink map by removing tiles from edges */
  shrink(direction: 'north' | 'south' | 'east' | 'west', amount: number): TileGrid {
    let newWidth = this.width;
    let newHeight = this.height;
    let offsetX = 0;
    let offsetY = 0;

    switch (direction) {
      case 'north': newHeight -= amount; offsetY = -amount; break;
      case 'south': newHeight -= amount; break;
      case 'east': newWidth -= amount; break;
      case 'west': newWidth -= amount; offsetX = -amount; break;
    }

    if (newWidth <= 0 || newHeight <= 0) {
      throw new Error('Cannot shrink map below 1x1');
    }

    const newGrid = new TileGrid(newWidth, newHeight);

    for (const tile of this.tiles.values()) {
      const nx = tile.x + offsetX;
      const ny = tile.y + offsetY;
      if (nx >= 0 && nx < newWidth && ny >= 0 && ny < newHeight) {
        newGrid.setTile({ ...tile, x: nx, y: ny });
      }
    }

    return newGrid;
  }

  /** Count tiles by terrain type */
  getTerrainCounts(): Map<TerrainType, number> {
    const counts = new Map<TerrainType, number>();
    for (const tile of this.tiles.values()) {
      counts.set(tile.terrain, (counts.get(tile.terrain) || 0) + 1);
    }
    return counts;
  }

  /** Get all tiles owned by a player */
  getPlayerTiles(playerId: string): Tile[] {
    return Array.from(this.tiles.values()).filter(t => t.ownerId === playerId);
  }

  /** Get tiles within sight range of a position */
  getTilesInRange(x: number, y: number, range: number): Tile[] {
    const result: Tile[] = [];
    for (let dx = -range; dx <= range; dx++) {
      for (let dy = -range; dy <= range; dy++) {
        // Use Chebyshev distance for square grid
        if (Math.max(Math.abs(dx), Math.abs(dy)) <= range) {
          const tile = this.getTile(x + dx, y + dy);
          if (tile) result.push(tile);
        }
      }
    }
    return result;
  }
}

// ─── Pathfinding (A*) ─────────────────────────────────────────────────────

interface PathNode {
  x: number;
  y: number;
  g: number; // cost from start
  h: number; // heuristic to goal
  f: number; // g + h
  parent: PathNode | null;
}

export interface PathResult {
  path: Array<{ x: number; y: number }>;
  totalCost: number;
  reachable: boolean;
}

export function findPath(
  grid: TileGrid,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  isNaval: boolean = false,
  maxMovement: number = Infinity,
): PathResult {
  const openSet = new Map<string, PathNode>();
  const closedSet = new Set<string>();
  const key = (x: number, y: number) => `${x},${y}`;

  const heuristic = (x: number, y: number) =>
    Math.max(Math.abs(x - endX), Math.abs(y - endY)); // Chebyshev

  const startNode: PathNode = {
    x: startX, y: startY,
    g: 0, h: heuristic(startX, startY), f: heuristic(startX, startY),
    parent: null,
  };
  openSet.set(key(startX, startY), startNode);

  while (openSet.size > 0) {
    // Get node with lowest f
    let current: PathNode | null = null;
    for (const node of openSet.values()) {
      if (!current || node.f < current.f) current = node;
    }
    if (!current) break;

    if (current.x === endX && current.y === endY) {
      // Reconstruct path
      const path: Array<{ x: number; y: number }> = [];
      let node: PathNode | null = current;
      while (node) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      return { path, totalCost: current.g, reachable: true };
    }

    openSet.delete(key(current.x, current.y));
    closedSet.add(key(current.x, current.y));

    // Check neighbors (8-directional)
    const neighbors = grid.getNeighbors(current.x, current.y);
    for (const neighbor of neighbors) {
      const nKey = key(neighbor.x, neighbor.y);
      if (closedSet.has(nKey)) continue;

      const terrainDef = TERRAIN_DEFS[neighbor.terrain];
      if (!terrainDef) continue;

      // Check passability
      if (isNaval && !terrainDef.isNavalPassable) continue;
      if (!isNaval && !terrainDef.isPassable) continue;

      const moveCost = grid.getMovementCost(neighbor);
      const tentativeG = current.g + moveCost;

      // Skip if exceeds max movement
      if (tentativeG > maxMovement) continue;

      const existing = openSet.get(nKey);
      if (existing && tentativeG >= existing.g) continue;

      const h = heuristic(neighbor.x, neighbor.y);
      const node: PathNode = {
        x: neighbor.x, y: neighbor.y,
        g: tentativeG, h, f: tentativeG + h,
        parent: current,
      };
      openSet.set(nKey, node);
    }
  }

  return { path: [], totalCost: 0, reachable: false };
}

/** Get all reachable tiles from a position within movement budget */
export function getReachableTiles(
  grid: TileGrid,
  startX: number,
  startY: number,
  maxMovement: number,
  isNaval: boolean = false,
): Map<string, number> {
  const reachable = new Map<string, number>(); // key -> cost
  const key = (x: number, y: number) => `${x},${y}`;
  const queue: Array<{ x: number; y: number; cost: number }> = [
    { x: startX, y: startY, cost: 0 },
  ];
  reachable.set(key(startX, startY), 0);

  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift()!;

    const neighbors = grid.getNeighbors(current.x, current.y);
    for (const neighbor of neighbors) {
      const terrainDef = TERRAIN_DEFS[neighbor.terrain];
      if (!terrainDef) continue;
      if (isNaval && !terrainDef.isNavalPassable) continue;
      if (!isNaval && !terrainDef.isPassable) continue;

      const moveCost = grid.getMovementCost(neighbor);
      const totalCost = current.cost + moveCost;

      if (totalCost > maxMovement) continue;

      const nKey = key(neighbor.x, neighbor.y);
      const existing = reachable.get(nKey);
      if (existing === undefined || totalCost < existing) {
        reachable.set(nKey, totalCost);
        queue.push({ x: neighbor.x, y: neighbor.y, cost: totalCost });
      }
    }
  }

  return reachable;
}
