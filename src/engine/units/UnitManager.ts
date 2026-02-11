// ─── Unit Manager ──────────────────────────────────────────────────────────
// Handles unit operations: creation, movement, armies
import type { UnitInstance } from '../../models/units';
import { UNIT_TYPES, type UnitType } from '../../models/units';
import type { Army, Tile, DiplomacyRelation, DiplomacyStatus } from '../../models/game';
import type { ResourceMap } from '../../models/resources';
import { hasResources, subtractResources } from '../../models/resources';
import { TileGrid, findPath, getReachableTiles } from '../map/MapEngine';
import { TERRAIN_DEFS } from '../../models/terrain';
import { v4 as uuid } from 'uuid';
import type { BuildingInstance } from '../../models/buildings';
import { BUILDING_TYPES } from '../../models/buildings';

export class UnitManager {
  /**
   * Check if a unit type can be recruited at a location
   */
  canRecruit(
    unitTypeId: string,
    playerId: string,
    x: number,
    y: number,
    playerResources: ResourceMap,
    buildings: BuildingInstance[],
  ): { canRecruit: boolean; reason?: string } {
    const uType = UNIT_TYPES[unitTypeId];
    if (!uType) return { canRecruit: false, reason: 'Type d\'unité inconnu' };

    // Check resources
    if (!hasResources(playerResources, uType.cost)) {
      return { canRecruit: false, reason: 'Ressources insuffisantes' };
    }

    // Check required building
    if (uType.requiredBuilding) {
      const hasBuilding = buildings.some(b =>
        b.typeId === uType.requiredBuilding &&
        b.isConstructed &&
        b.ownerId === playerId &&
        b.x === x && b.y === y
      );
      // Also check nearby tiles for the building
      if (!hasBuilding) {
        const nearbyBuilding = buildings.some(b =>
          b.typeId === uType.requiredBuilding &&
          b.isConstructed &&
          b.ownerId === playerId &&
          Math.abs(b.x - x) <= 1 && Math.abs(b.y - y) <= 1
        );
        if (!nearbyBuilding) {
          const bType = BUILDING_TYPES[uType.requiredBuilding];
          return { canRecruit: false, reason: `Nécessite: ${bType?.name || uType.requiredBuilding}` };
        }
      }
    }

    return { canRecruit: true };
  }

  /**
   * Create a new unit instance
   */
  createUnit(
    unitTypeId: string,
    playerId: string,
    x: number,
    y: number,
    turn: number,
  ): UnitInstance {
    const uType = UNIT_TYPES[unitTypeId];
    if (!uType) throw new Error(`Unknown unit type: ${unitTypeId}`);

    return {
      id: uuid(),
      typeId: unitTypeId,
      ownerId: playerId,
      x,
      y,
      currentHp: uType.stats.hp,
      isAlive: true,
      hasMoved: false,
      hasActed: false,
      createdTurn: turn,
    };
  }

  /**
   * Get valid movement destinations for a unit
   */
  getValidMoves(
    unit: UnitInstance,
    grid: TileGrid,
    allUnits: UnitInstance[],
    relations: DiplomacyRelation[],
  ): Map<string, number> {
    if (unit.hasMoved) return new Map();

    const uType = UNIT_TYPES[unit.typeId];
    if (!uType) return new Map();

    const isNaval = uType.category === 'naval';
    const reachable = getReachableTiles(grid, unit.x, unit.y, uType.stats.movement, isNaval);

    // Filter out tiles with enemy units (can't move onto them, must attack)
    // But allow tiles with allied units (max 2)
    const filtered = new Map<string, number>();
    for (const [key, cost] of reachable) {
      const [xStr, yStr] = key.split(',');
      const tx = parseInt(xStr ?? '0');
      const ty = parseInt(yStr ?? '0');

      const unitsOnTile = allUnits.filter(u => u.isAlive && u.x === tx && u.y === ty && u.id !== unit.id);

      if (unitsOnTile.length === 0) {
        filtered.set(key, cost);
      } else {
        // Check if all units on tile are allied
        const allAllied = unitsOnTile.every(u => {
          if (u.ownerId === unit.ownerId) return true;
          const rel = this.getRelation(unit.ownerId, u.ownerId, relations);
          return rel === 'allied';
        });

        if (allAllied && unitsOnTile.length < 2) {
          filtered.set(key, cost);
        }
      }
    }

    // Remove start position
    filtered.delete(`${unit.x},${unit.y}`);

    return filtered;
  }

  /**
   * Move a unit to a destination
   */
  moveUnit(unit: UnitInstance, targetX: number, targetY: number): void {
    unit.x = targetX;
    unit.y = targetY;
    unit.hasMoved = true;
  }

  /**
   * Reset all units for a new turn
   */
  resetUnitsForTurn(units: UnitInstance[]): void {
    for (const unit of units) {
      if (unit.isAlive) {
        unit.hasMoved = false;
        unit.hasActed = false;
      }
    }
  }

  // ─── Army Management ────────────────────────────────────────────────

  /**
   * Create an army from units at the same location
   */
  createArmy(
    name: string,
    ownerId: string,
    unitIds: string[],
    units: UnitInstance[],
  ): Army | null {
    const selectedUnits = units.filter(u => unitIds.includes(u.id) && u.isAlive && u.ownerId === ownerId);
    if (selectedUnits.length === 0) return null;

    // All units must be at the same location
    const { x, y } = selectedUnits[0]!;
    if (!selectedUnits.every(u => u.x === x && u.y === y)) return null;

    const army: Army = {
      id: uuid(),
      ownerId,
      name,
      unitIds: selectedUnits.map(u => u.id),
      x,
      y,
    };

    // Link units to army
    for (const unit of selectedUnits) {
      unit.armyId = army.id;
    }

    return army;
  }

  /**
   * Move an army — moves all units in the army as a block
   * Speed = slowest unit in the army
   */
  getArmyMovement(army: Army, units: UnitInstance[]): number {
    const armyUnits = units.filter(u => army.unitIds.includes(u.id) && u.isAlive);
    if (armyUnits.length === 0) return 0;

    return Math.min(...armyUnits.map(u => {
      const uType = UNIT_TYPES[u.typeId];
      return uType?.stats.movement ?? 0;
    }));
  }

  moveArmy(army: Army, units: UnitInstance[], targetX: number, targetY: number): void {
    army.x = targetX;
    army.y = targetY;
    for (const unitId of army.unitIds) {
      const unit = units.find(u => u.id === unitId);
      if (unit && unit.isAlive) {
        unit.x = targetX;
        unit.y = targetY;
        unit.hasMoved = true;
      }
    }
  }

  /**
   * Disband an army — units stay in place but are no longer grouped
   */
  disbandArmy(army: Army, units: UnitInstance[]): void {
    for (const unitId of army.unitIds) {
      const unit = units.find(u => u.id === unitId);
      if (unit) {
        unit.armyId = undefined;
      }
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────

  private getRelation(
    playerA: string,
    playerB: string,
    relations: DiplomacyRelation[],
  ): DiplomacyStatus {
    if (playerA === playerB) return 'allied' as DiplomacyStatus;
    const rel = relations.find(r =>
      (r.playerA === playerA && r.playerB === playerB) ||
      (r.playerA === playerB && r.playerB === playerA)
    );
    return rel?.status ?? ('neutral' as DiplomacyStatus);
  }
}
