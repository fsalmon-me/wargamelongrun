// ─── Economy Engine ────────────────────────────────────────────────────────
// Pure logic for resource production, upkeep, and monthly generation
import type { Player, ProductionReport, ProductionReportEntry, Tile } from '../../models/game';
import type { UnitInstance } from '../../models/units';
import { UNIT_TYPES } from '../../models/units';
import type { BuildingInstance, SettlementInstance } from '../../models/buildings';
import { BUILDING_TYPES } from '../../models/buildings';
import { TERRAIN_DEFS } from '../../models/terrain';
import { ResourceType, type ResourceMap, addResources, emptyResources, RESOURCE_DEFS } from '../../models/resources';
import { FACTIONS } from '../../models/game';
import { TileGrid } from '../map/MapEngine';

export class EconomyEngine {

  /**
   * Simulate monthly production for a player.
   * Can be called at any time for preview, or executed for real on the 1st of each month.
   */
  simulate(
    player: Player,
    units: UnitInstance[],
    buildings: BuildingInstance[],
    settlements: SettlementInstance[],
    playerTiles: Tile[],
    grid: TileGrid,
    turn: number,
  ): ProductionReport {
    const gains: ProductionReportEntry[] = [];
    const losses: ProductionReportEntry[] = [];
    const warnings: string[] = [];
    const net = emptyResources();

    // ─── 1. Building Production ───────────────────────────────────────
    for (const building of buildings) {
      if (!building.isConstructed) continue;

      const bType = BUILDING_TYPES[building.typeId];
      if (!bType) continue;

      for (const [res, amount] of Object.entries(bType.production)) {
        if (amount && amount > 0) {
          gains.push({
            source: bType.name,
            sourceId: building.id,
            resource: res,
            amount,
            isMalus: false,
          });
          net[res as ResourceType] = (net[res as ResourceType] || 0) + amount;
        }
      }
    }

    // ─── 2. Terrain Production (owned tiles) ──────────────────────────
    for (const tile of playerTiles) {
      const tDef = TERRAIN_DEFS[tile.terrain];
      if (!tDef || tDef.foodProduction <= 0) continue;

      gains.push({
        source: `${tDef.name} (${tile.x},${tile.y})`,
        sourceId: `tile_${tile.x}_${tile.y}`,
        resource: ResourceType.Grain,
        amount: tDef.foodProduction,
        isMalus: false,
      });
      net[ResourceType.Grain] += tDef.foodProduction;
    }

    // ─── 3. Unit Upkeep ───────────────────────────────────────────────
    const aliveUnits = units.filter(u => u.isAlive);
    for (const unit of aliveUnits) {
      const uType = UNIT_TYPES[unit.typeId];
      if (!uType) continue;

      for (const [res, amount] of Object.entries(uType.upkeep)) {
        if (amount && amount > 0) {
          losses.push({
            source: uType.name,
            sourceId: unit.id,
            resource: res,
            amount,
            isMalus: true,
            reason: 'Entretien mensuel',
          });
          net[res as ResourceType] = (net[res as ResourceType] || 0) - amount;
        }
      }
    }

    // ─── 4. Reproduction ──────────────────────────────────────────────
    for (const unit of aliveUnits) {
      const uType = UNIT_TYPES[unit.typeId];
      if (!uType || !uType.canReproduce) continue;

      // Just report probability — actual reproduction happens at execution
      if (uType.reproductionChance > 0) {
        gains.push({
          source: `${uType.name} (reproduction possible)`,
          sourceId: unit.id,
          resource: 'population',
          amount: uType.reproductionChance,
          isMalus: false,
          reason: `${Math.round(uType.reproductionChance * 100)}% chance`,
        });
      }
    }

    // ─── 5. Tax income (Dricks from population) ──────────────────────
    const settlementDricks = settlements.reduce((sum, s) => {
      // Base income based on settlement tier
      const tierIncome: Record<string, number> = {
        campfire: 2, village: 10, town: 25, city: 50, capital: 100,
      };
      return sum + (tierIncome[s.tier] || 0);
    }, 0);

    if (settlementDricks > 0) {
      gains.push({
        source: 'Impôts des colonies',
        sourceId: 'tax',
        resource: ResourceType.Dricks,
        amount: settlementDricks,
        isMalus: false,
      });
      net[ResourceType.Dricks] += settlementDricks;
    }

    // ─── 6. Faction bonuses ───────────────────────────────────────────
    const faction = FACTIONS[player.factionId];
    if (faction) {
      for (const bonus of faction.bonuses) {
        if (bonus.type === 'economic') {
          // Apply % bonus to relevant resources
          if (bonus.description.includes('Dricks')) {
            const dricksBonus = Math.round(net[ResourceType.Dricks] * bonus.value);
            if (dricksBonus > 0) {
              gains.push({
                source: `Bonus faction: ${bonus.name}`,
                sourceId: 'faction_bonus',
                resource: ResourceType.Dricks,
                amount: dricksBonus,
                isMalus: false,
              });
              net[ResourceType.Dricks] += dricksBonus;
            }
          }
          if (bonus.description.includes('nourriture')) {
            const foodBonus = Math.round(net[ResourceType.Grain] * bonus.value);
            if (foodBonus > 0) {
              gains.push({
                source: `Bonus faction: ${bonus.name}`,
                sourceId: 'faction_bonus',
                resource: ResourceType.Grain,
                amount: foodBonus,
                isMalus: false,
              });
              net[ResourceType.Grain] += foodBonus;
            }
          }
        }
      }
    }

    // ─── 7. Warnings ──────────────────────────────────────────────────
    if (net[ResourceType.Grain] < 0) {
      warnings.push(`⚠️ Pénurie de grain ! Déficit de ${Math.abs(net[ResourceType.Grain])} grain. Les unités risquent de déserter.`);
    }
    if (net[ResourceType.Dricks] < 0) {
      warnings.push(`⚠️ Trésorerie en déficit ! ${Math.abs(net[ResourceType.Dricks])} Dricks manquants.`);
    }

    return {
      playerId: player.id,
      turn,
      gains,
      losses,
      netResources: net,
      warnings,
    };
  }

  /**
   * Execute the monthly production (apply to player resources)
   */
  executeProduction(
    player: Player,
    report: ProductionReport,
  ): { newResources: ResourceMap; desertedUnits: string[] } {
    const newResources = { ...player.resources } as ResourceMap;
    addResources(newResources, report.netResources);

    // Ensure no negative resources (cap at 0)
    const desertedUnits: string[] = [];
    for (const key of Object.values(ResourceType)) {
      if ((newResources[key] || 0) < 0) {
        newResources[key] = 0;
      }
    }

    return { newResources, desertedUnits };
  }

  /**
   * Process civil unit reproduction
   */
  processReproduction(units: UnitInstance[], turn: number): UnitInstance[] {
    const newUnits: UnitInstance[] = [];

    for (const unit of units) {
      if (!unit.isAlive) continue;
      const uType = UNIT_TYPES[unit.typeId];
      if (!uType || !uType.canReproduce) continue;

      if (Math.random() < uType.reproductionChance) {
        newUnits.push({
          id: `${unit.typeId}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          typeId: unit.typeId,
          ownerId: unit.ownerId,
          x: unit.x,
          y: unit.y,
          currentHp: uType.stats.hp,
          isAlive: true,
          hasMoved: true,
          hasActed: true,
          createdTurn: turn,
        });
      }
    }

    return newUnits;
  }
}
