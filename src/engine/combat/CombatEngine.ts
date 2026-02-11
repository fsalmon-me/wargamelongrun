// ─── Combat Engine ─────────────────────────────────────────────────────────
// Modular combat system — easy to swap out or extend
import type { UnitInstance } from '../../models/units';
import { UNIT_TYPES } from '../../models/units';
import type { Tile } from '../../models/game';
import type { CombatLog } from '../../models/game';
import { TERRAIN_DEFS, RIVER_MODIFIERS } from '../../models/terrain';
import { v4 as uuid } from 'uuid';

// ─── Combat Resolver Interface ────────────────────────────────────────────

export interface CombatResult {
  attackerDamage: number;      // damage dealt TO attacker
  defenderDamage: number;      // damage dealt TO defender
  attackerSurvived: boolean;
  defenderSurvived: boolean;
  log: CombatLog;
}

export interface ICombatResolver {
  resolve(
    attacker: UnitInstance,
    defender: UnitInstance,
    attackerTile: Tile,
    defenderTile: Tile,
    turn: number,
  ): CombatResult;
}

// ─── Simple Combat Resolver (MVP) ─────────────────────────────────────────

export class SimpleCombatResolver implements ICombatResolver {

  resolve(
    attacker: UnitInstance,
    defender: UnitInstance,
    attackerTile: Tile,
    defenderTile: Tile,
    turn: number,
  ): CombatResult {
    const attackerType = UNIT_TYPES[attacker.typeId];
    const defenderType = UNIT_TYPES[defender.typeId];

    if (!attackerType || !defenderType) {
      throw new Error(`Unknown unit type: ${attacker.typeId} or ${defender.typeId}`);
    }

    // ─── Calculate terrain modifiers ──────────────────────────────────
    const defenderTerrainDef = TERRAIN_DEFS[defenderTile.terrain];
    const terrainDefenseBonus = defenderTerrainDef?.defenseBonus ?? 1.0;

    // River crossing penalty for attacker
    const riverPenalty = defenderTile.river ? 0.9 : 1.0;

    // ─── Calculate damage ─────────────────────────────────────────────
    const random = () => 0.8 + Math.random() * 0.4; // 0.8 to 1.2

    // Attacker damages defender
    const attackPower = attackerType.stats.attack * random() * riverPenalty;
    const defenseValue = defenderType.stats.defense * terrainDefenseBonus;
    const damageToDefender = Math.max(1, Math.round(attackPower - defenseValue * 0.5));

    // Defender counter-attacks (if melee range and still alive)
    const isInRange = this.getDistance(attackerTile, defenderTile) <= defenderType.stats.range;
    let damageToAttacker = 0;

    if (isInRange) {
      const counterPower = defenderType.stats.attack * random() * 0.7; // counter-attack at 70%
      const attackerTerrainDef = TERRAIN_DEFS[attackerTile.terrain];
      const attackerTerrainBonus = attackerTerrainDef?.defenseBonus ?? 1.0;
      damageToAttacker = Math.max(0, Math.round(counterPower - attackerType.stats.defense * attackerTerrainBonus * 0.5));
    }

    // ─── Apply damage ─────────────────────────────────────────────────
    const newDefenderHp = defender.currentHp - damageToDefender;
    const newAttackerHp = attacker.currentHp - damageToAttacker;

    const log: CombatLog = {
      id: uuid(),
      turn,
      attackerId: attacker.ownerId,
      defenderId: defender.ownerId,
      attackerUnitId: attacker.id,
      defenderUnitId: defender.id,
      attackerDamage: damageToAttacker,
      defenderDamage: damageToDefender,
      attackerSurvived: newAttackerHp > 0,
      defenderSurvived: newDefenderHp > 0,
      terrainBonus: terrainDefenseBonus,
      timestamp: Date.now(),
    };

    return {
      attackerDamage: damageToAttacker,
      defenderDamage: damageToDefender,
      attackerSurvived: newAttackerHp > 0,
      defenderSurvived: newDefenderHp > 0,
      log,
    };
  }

  private getDistance(a: Tile, b: Tile): number {
    return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  }
}

// ─── Combat Manager ───────────────────────────────────────────────────────

export class CombatManager {
  private resolver: ICombatResolver;

  constructor(resolver?: ICombatResolver) {
    this.resolver = resolver || new SimpleCombatResolver();
  }

  /** Set a different combat resolver (for future upgrades) */
  setResolver(resolver: ICombatResolver): void {
    this.resolver = resolver;
  }

  /** Execute combat between two units */
  executeCombat(
    attacker: UnitInstance,
    defender: UnitInstance,
    attackerTile: Tile,
    defenderTile: Tile,
    turn: number,
  ): CombatResult {
    return this.resolver.resolve(attacker, defender, attackerTile, defenderTile, turn);
  }

  /** Apply combat result to units (mutates them) */
  applyCombatResult(
    attacker: UnitInstance,
    defender: UnitInstance,
    result: CombatResult,
  ): void {
    attacker.currentHp -= result.attackerDamage;
    defender.currentHp -= result.defenderDamage;

    if (!result.attackerSurvived) {
      attacker.isAlive = false;
      attacker.currentHp = 0;
    }

    if (!result.defenderSurvived) {
      defender.isAlive = false;
      defender.currentHp = 0;
    }
  }

  /** 
   * Resolve army vs army combat
   * Each unit in the attacking army fights a unit in the defending army
   */
  resolveArmyCombat(
    attackerUnits: UnitInstance[],
    defenderUnits: UnitInstance[],
    attackerTile: Tile,
    defenderTile: Tile,
    turn: number,
  ): CombatResult[] {
    const results: CombatResult[] = [];
    const aliveAttackers = attackerUnits.filter(u => u.isAlive);
    const aliveDefenders = defenderUnits.filter(u => u.isAlive);

    // Each attacker fights a defender (round-robin)
    for (let i = 0; i < aliveAttackers.length; i++) {
      const attacker = aliveAttackers[i];
      const defenderIndex = i % aliveDefenders.length;
      const defender = aliveDefenders[defenderIndex];

      if (!defender || !defender.isAlive) continue;

      const result = this.executeCombat(attacker, defender, attackerTile, defenderTile, turn);
      this.applyCombatResult(attacker, defender, result);
      results.push(result);

      // Update alive list after each combat
      const stillAlive = aliveDefenders.filter(u => u.isAlive);
      if (stillAlive.length === 0) break;
    }

    return results;
  }
}
