// ─── Default Map Data ──────────────────────────────────────────────────────
// Hardcoded fallback map for development/testing.
// This will be replaced by parsed data from Militaire.html
import type { Tile } from '../models/game';
import { TerrainType } from '../models/terrain';

/**
 * Generate a simple test map for development
 */
export function generateTestMap(width = 36, height = 30): Tile[] {
  const tiles: Tile[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let terrain: TerrainType;

      // Create a simple varied landscape
      const dist = Math.sqrt(Math.pow(x - width / 2, 2) + Math.pow(y - height / 2, 2));
      const noise = Math.sin(x * 0.3) * Math.cos(y * 0.4) + Math.sin((x + y) * 0.2);

      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        terrain = TerrainType.Sea;
      } else if (x <= 1 || y <= 1 || x >= width - 2 || y >= height - 2) {
        terrain = TerrainType.Sea;
      } else if (dist > Math.min(width, height) * 0.45) {
        terrain = TerrainType.Sea;
      } else if (noise > 1.2) {
        terrain = TerrainType.Mountains;
      } else if (noise > 0.8) {
        terrain = TerrainType.Hills;
      } else if (noise > 0.4) {
        terrain = TerrainType.ForestedHills;
      } else if (noise > 0.1) {
        terrain = TerrainType.HeavyForest;
      } else if (noise > -0.2) {
        terrain = TerrainType.LightForest;
      } else if (noise > -0.5) {
        terrain = TerrainType.Grassland;
      } else if (noise > -0.8) {
        terrain = TerrainType.Farmland;
      } else if (noise > -1.0) {
        terrain = TerrainType.GrazingLand;
      } else {
        terrain = TerrainType.Marsh;
      }

      const hasRiver = (x === Math.floor(width / 3) && y > 3 && y < height - 3) ||
                       (y === Math.floor(height / 2) && x > 5 && x < width - 5);
      const hasRoad = (y === Math.floor(height / 3) && x > 3 && x < width - 3);

      tiles.push({
        x,
        y,
        terrain,
        river: hasRiver && terrain !== TerrainType.Sea,
        road: hasRoad && terrain !== TerrainType.Sea,
        ownerId: null,
      });
    }
  }

  return tiles;
}

/**
 * Assign starting territories to factions
 */
export function assignStartingTerritories(
  tiles: Tile[],
  factionIds: string[],
  width: number,
  height: number,
): void {
  // Distribute starting positions around the map
  const positions = [
    { x: Math.floor(width * 0.2), y: Math.floor(height * 0.2) },
    { x: Math.floor(width * 0.8), y: Math.floor(height * 0.2) },
    { x: Math.floor(width * 0.2), y: Math.floor(height * 0.8) },
    { x: Math.floor(width * 0.8), y: Math.floor(height * 0.8) },
    { x: Math.floor(width * 0.5), y: Math.floor(height * 0.2) },
    { x: Math.floor(width * 0.5), y: Math.floor(height * 0.8) },
    { x: Math.floor(width * 0.2), y: Math.floor(height * 0.5) },
    { x: Math.floor(width * 0.8), y: Math.floor(height * 0.5) },
    { x: Math.floor(width * 0.5), y: Math.floor(height * 0.5) },
  ];

  for (let i = 0; i < factionIds.length && i < positions.length; i++) {
    const pos = positions[i];
    const radius = 3;

    // Claim tiles in radius around starting position
    for (const tile of tiles) {
      const dist = Math.max(Math.abs(tile.x - pos!.x), Math.abs(tile.y - pos!.y));
      if (dist <= radius && tile.terrain !== TerrainType.Sea) {
        tile.ownerId = factionIds[i] ?? null;
      }
    }
  }
}
