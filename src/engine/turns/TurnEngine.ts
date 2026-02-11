// ─── Turn Engine ───────────────────────────────────────────────────────────
// Manages turn resolution for all game modes
import type {
  Game, Player, Tile, TurnAction, ActionType, Army,
  DiplomacyRelation, DiplomacyStatus, CombatLog,
} from '../../models/game';
import { GameMode, GameStatus } from '../../models/game';
import type { UnitInstance } from '../../models/units';
import type { BuildingInstance, SettlementInstance } from '../../models/buildings';
import { CombatManager } from '../combat';
import { EconomyEngine } from '../economy';
import { UnitManager } from '../units';
import { TileGrid } from '../map';
import type { ResourceMap } from '../../models/resources';

export interface TurnResolutionResult {
  combatLogs: CombatLog[];
  newUnits: UnitInstance[];     // from reproduction
  updatedUnits: UnitInstance[];
  updatedPlayers: Player[];
  updatedBuildings: BuildingInstance[];
  updatedSettlements: SettlementInstance[];
  messages: string[];          // notifications for players
}

export class TurnEngine {
  private combatManager: CombatManager;
  private economyEngine: EconomyEngine;
  private unitManager: UnitManager;

  constructor() {
    this.combatManager = new CombatManager();
    this.economyEngine = new EconomyEngine();
    this.unitManager = new UnitManager();
  }

  /**
   * Check if all players have played in rapid mode
   */
  allPlayersReady(players: Player[]): boolean {
    return players.every(p => p.turnPlayed);
  }

  /**
   * Resolve a turn — called when all players have submitted their actions
   */
  resolveTurn(
    game: Game,
    players: Player[],
    units: UnitInstance[],
    buildings: BuildingInstance[],
    settlements: SettlementInstance[],
    armies: Army[],
    actions: TurnAction[],
    grid: TileGrid,
    relations: DiplomacyRelation[],
  ): TurnResolutionResult {
    const result: TurnResolutionResult = {
      combatLogs: [],
      newUnits: [],
      updatedUnits: [...units],
      updatedPlayers: [...players],
      updatedBuildings: [...buildings],
      updatedSettlements: [...settlements],
      messages: [],
    };

    // ─── Phase 1: Process Movement Actions ────────────────────────────
    const moveActions = actions.filter(a => a.type === 'move' as ActionType);
    for (const action of moveActions) {
      const { unitId, targetX, targetY } = action.data as { unitId: string; targetX: number; targetY: number };
      const unit = result.updatedUnits.find(u => u.id === unitId && u.isAlive);
      if (unit && unit.ownerId === action.playerId) {
        this.unitManager.moveUnit(unit, targetX, targetY);
      }
    }

    // ─── Phase 2: Auto-Combat (enemies on same/adjacent tiles) ────────
    const combatPairs = this.findCombatPairs(result.updatedUnits, relations, grid);
    for (const [attacker, defender] of combatPairs) {
      const aTile = grid.getTile(attacker.x, attacker.y);
      const dTile = grid.getTile(defender.x, defender.y);
      if (!aTile || !dTile) continue;

      const combatResult = this.combatManager.executeCombat(
        attacker, defender, aTile, dTile, game.currentTurn,
      );
      this.combatManager.applyCombatResult(attacker, defender, combatResult);
      result.combatLogs.push(combatResult.log);
    }

    // ─── Phase 3: Process Build Actions ───────────────────────────────
    const buildActions = actions.filter(a => a.type === 'build' as ActionType);
    for (const action of buildActions) {
      const { buildingTypeId, x, y, sacrificeUnitId } = action.data as {
        buildingTypeId: string; x: number; y: number; sacrificeUnitId?: string;
      };

      // Handle building construction (simplified for MVP)
      const building: BuildingInstance = {
        id: `bldg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        typeId: buildingTypeId,
        ownerId: action.playerId,
        x,
        y,
        isConstructed: false,
        turnsRemaining: 2, // simplified
        createdTurn: game.currentTurn,
      };
      result.updatedBuildings.push(building);

      // Sacrifice unit if required
      if (sacrificeUnitId) {
        const unit = result.updatedUnits.find(u => u.id === sacrificeUnitId);
        if (unit) {
          unit.isAlive = false;
          unit.currentHp = 0;
        }
      }
    }

    // ─── Phase 4: Advance Construction ────────────────────────────────
    for (const building of result.updatedBuildings) {
      if (!building.isConstructed && building.turnsRemaining > 0) {
        building.turnsRemaining--;
        if (building.turnsRemaining <= 0) {
          building.isConstructed = true;
          result.messages.push(`Bâtiment construit !`);
        }
      }
    }

    // ─── Phase 5: Advance Settlement Upgrades ─────────────────────────
    for (const settlement of result.updatedSettlements) {
      if (settlement.isUpgrading && settlement.upgradeTurnsRemaining > 0) {
        settlement.upgradeTurnsRemaining--;
        if (settlement.upgradeTurnsRemaining <= 0) {
          settlement.isUpgrading = false;
          result.messages.push(`${settlement.name} a été amélioré !`);
        }
      }
    }

    // ─── Phase 6: Monthly Production (every N turns) ──────────────────
    const isMonthlyTurn = game.currentTurn > 0 && game.currentTurn % game.turnsPerMonth === 0;
    if (isMonthlyTurn) {
      for (const player of result.updatedPlayers) {
        const playerUnits = result.updatedUnits.filter(u => u.ownerId === player.id && u.isAlive);
        const playerBuildings = result.updatedBuildings.filter(b => b.ownerId === player.id);
        const playerSettlements = result.updatedSettlements.filter(s => s.ownerId === player.id);
        const playerTiles = grid.getPlayerTiles(player.id);

        const report = this.economyEngine.simulate(
          player, playerUnits, playerBuildings, playerSettlements, playerTiles, grid, game.currentTurn,
        );

        const { newResources } = this.economyEngine.executeProduction(player, report);
        player.resources = newResources;

        // Reproduction
        const newUnits = this.economyEngine.processReproduction(playerUnits, game.currentTurn);
        result.newUnits.push(...newUnits);

        if (report.warnings.length > 0) {
          result.messages.push(...report.warnings.map(w => `[${player.name}] ${w}`));
        }
      }
    }

    // ─── Phase 7: Reset for next turn ─────────────────────────────────
    this.unitManager.resetUnitsForTurn(result.updatedUnits);
    for (const player of result.updatedPlayers) {
      player.turnPlayed = false;
    }

    return result;
  }

  /**
   * Find all combat pairs (enemy units on same or adjacent tiles)
   */
  private findCombatPairs(
    units: UnitInstance[],
    relations: DiplomacyRelation[],
    grid: TileGrid,
  ): Array<[UnitInstance, UnitInstance]> {
    const pairs: Array<[UnitInstance, UnitInstance]> = [];
    const processed = new Set<string>();

    const aliveUnits = units.filter(u => u.isAlive);

    for (const unit of aliveUnits) {
      for (const other of aliveUnits) {
        if (unit.id === other.id) continue;
        if (unit.ownerId === other.ownerId) continue;

        const pairKey = [unit.id, other.id].sort().join('_');
        if (processed.has(pairKey)) continue;

        // Check if on same tile or adjacent
        const dist = Math.max(Math.abs(unit.x - other.x), Math.abs(unit.y - other.y));
        if (dist > 1) continue;

        // Check if enemies
        const rel = this.getRelation(unit.ownerId, other.ownerId, relations);
        if (rel === 'enemy') {
          pairs.push([unit, other]);
          processed.add(pairKey);
        }
      }
    }

    return pairs;
  }

  private getRelation(
    playerA: string,
    playerB: string,
    relations: DiplomacyRelation[],
  ): DiplomacyStatus {
    const rel = relations.find(r =>
      (r.playerA === playerA && r.playerB === playerB) ||
      (r.playerA === playerB && r.playerB === playerA)
    );
    return rel?.status ?? ('neutral' as DiplomacyStatus);
  }

  // ─── Permanent Mode Helpers ─────────────────────────────────────────

  /**
   * Calculate accumulated turns for permanent mode
   * Max 10 turns accumulated, gain 1 per day
   */
  calculateAccumulatedTurns(player: Player, now: number): number {
    const ONE_DAY = 24 * 60 * 60 * 1000;
    const daysSinceLogin = Math.floor((now - player.lastLoginAt) / ONE_DAY);
    const newTurns = Math.min(player.turnsAccumulated + daysSinceLogin, 10);
    return newTurns;
  }

  /**
   * Consume a turn in permanent mode
   */
  consumeTurn(player: Player): boolean {
    if (player.turnsAccumulated <= 0) return false;
    player.turnsAccumulated--;
    return true;
  }
}
