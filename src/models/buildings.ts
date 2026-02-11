// ─── Building & Settlement System ──────────────────────────────────────────
import type { ResourceMap } from './resources';
import { ResourceType } from './resources';

// ─── Settlement Tiers ─────────────────────────────────────────────────────

export enum SettlementTier {
  Campfire = 'campfire',    // Feu de camp — 2 building slots
  Village = 'village',      // Village — 5 building slots
  Town = 'town',            // Bourg — 10 building slots
  City = 'city',            // Ville — 20 building slots
  Capital = 'capital',      // Cité/Capitale — 30 building slots
}

export interface SettlementTierDef {
  tier: SettlementTier;
  name: string;
  maxBuildings: number;
  upgradeCost: ResourceMap;
  upgradeRequiresSacrifice: number; // number of civil units to sacrifice
  upgradeTurns: number;     // turns to upgrade
}

export const SETTLEMENT_TIERS: Record<SettlementTier, SettlementTierDef> = {
  [SettlementTier.Campfire]: {
    tier: SettlementTier.Campfire, name: 'Feu de Camp', maxBuildings: 2,
    upgradeCost: {}, upgradeRequiresSacrifice: 1, upgradeTurns: 0,
  },
  [SettlementTier.Village]: {
    tier: SettlementTier.Village, name: 'Village', maxBuildings: 5,
    upgradeCost: { [ResourceType.Wood]: 20, [ResourceType.Stone]: 10, [ResourceType.Dricks]: 50 },
    upgradeRequiresSacrifice: 2, upgradeTurns: 3,
  },
  [SettlementTier.Town]: {
    tier: SettlementTier.Town, name: 'Bourg', maxBuildings: 10,
    upgradeCost: { [ResourceType.Wood]: 50, [ResourceType.Stone]: 30, [ResourceType.Planks]: 10, [ResourceType.Dricks]: 150 },
    upgradeRequiresSacrifice: 3, upgradeTurns: 5,
  },
  [SettlementTier.City]: {
    tier: SettlementTier.City, name: 'Ville', maxBuildings: 20,
    upgradeCost: { [ResourceType.Wood]: 100, [ResourceType.Stone]: 80, [ResourceType.Planks]: 30, [ResourceType.Iron]: 20, [ResourceType.Dricks]: 400 },
    upgradeRequiresSacrifice: 5, upgradeTurns: 8,
  },
  [SettlementTier.Capital]: {
    tier: SettlementTier.Capital, name: 'Cité', maxBuildings: 30,
    upgradeCost: { [ResourceType.Wood]: 200, [ResourceType.Stone]: 150, [ResourceType.Planks]: 60, [ResourceType.Iron]: 50, [ResourceType.Gems]: 10, [ResourceType.Dricks]: 1000 },
    upgradeRequiresSacrifice: 8, upgradeTurns: 12,
  },
};

export const SETTLEMENT_UPGRADE_ORDER: SettlementTier[] = [
  SettlementTier.Campfire,
  SettlementTier.Village,
  SettlementTier.Town,
  SettlementTier.City,
  SettlementTier.Capital,
];

// ─── Building Types ───────────────────────────────────────────────────────

export interface BuildingType {
  id: string;
  name: string;
  nameEn: string;
  cost: ResourceMap;
  buildTurns: number;
  requiresSacrifice: string | null;  // unit type to sacrifice, null = none
  requiresSettlement: SettlementTier | null; // null = independent building
  production: ResourceMap;           // monthly resource production
  bonuses: BuildingBonus[];
  maxPerSettlement: number;          // 0 = unlimited
  spriteKey: string;
  description: string;
}

export interface BuildingBonus {
  type: 'defense' | 'attack' | 'sight' | 'recruitment' | 'trade' | 'storage' | 'population';
  value: number;
}

/** Runtime building instance */
export interface BuildingInstance {
  id: string;
  typeId: string;
  ownerId: string;
  x: number;
  y: number;
  settlementId?: string;  // null if independent
  isConstructed: boolean;
  turnsRemaining: number;
  createdTurn: number;
}

/** Runtime settlement instance */
export interface SettlementInstance {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  name: string;
  tier: SettlementTier;
  buildingIds: string[];
  isUpgrading: boolean;
  upgradeTurnsRemaining: number;
}

// ─── Building Definitions ─────────────────────────────────────────────────

export const BUILDING_TYPES: Record<string, BuildingType> = {
  // ── Settlement Buildings ──
  house: {
    id: 'house', name: 'Maison', nameEn: 'House',
    cost: { [ResourceType.Wood]: 10, [ResourceType.Stone]: 5, [ResourceType.Dricks]: 20 },
    buildTurns: 2, requiresSacrifice: null, requiresSettlement: SettlementTier.Campfire,
    production: { [ResourceType.Dricks]: 2 },
    bonuses: [{ type: 'population', value: 2 }],
    maxPerSettlement: 0, spriteKey: 'bldg_house',
    description: 'Habitation de base. Génère des Dricks et augmente la population.',
  },
  farm_building: {
    id: 'farm_building', name: 'Ferme', nameEn: 'Farm',
    cost: { [ResourceType.Wood]: 15, [ResourceType.Dricks]: 25 },
    buildTurns: 2, requiresSacrifice: 'peasant', requiresSettlement: SettlementTier.Campfire,
    production: { [ResourceType.Grain]: 5, [ResourceType.Fruit]: 2 },
    bonuses: [],
    maxPerSettlement: 3, spriteKey: 'bldg_farm',
    description: 'Produit grain et fruits. Nécessite le sacrifice d\'un paysan.',
  },
  sawmill: {
    id: 'sawmill', name: 'Scierie', nameEn: 'Sawmill',
    cost: { [ResourceType.Wood]: 20, [ResourceType.Stone]: 10, [ResourceType.Iron]: 5, [ResourceType.Dricks]: 40 },
    buildTurns: 3, requiresSacrifice: 'peasant', requiresSettlement: SettlementTier.Village,
    production: { [ResourceType.Planks]: 3 },
    bonuses: [],
    maxPerSettlement: 2, spriteKey: 'bldg_sawmill',
    description: 'Transforme le bois en planches.',
  },
  mine: {
    id: 'mine', name: 'Mine', nameEn: 'Mine',
    cost: { [ResourceType.Wood]: 15, [ResourceType.Stone]: 10, [ResourceType.Tools]: 2, [ResourceType.Dricks]: 50 },
    buildTurns: 4, requiresSacrifice: 'peasant', requiresSettlement: SettlementTier.Village,
    production: { [ResourceType.Iron]: 3, [ResourceType.Stone]: 2, [ResourceType.Coal]: 1 },
    bonuses: [],
    maxPerSettlement: 2, spriteKey: 'bldg_mine',
    description: 'Extrait fer, pierre et charbon.',
  },
  forge: {
    id: 'forge', name: 'Forge', nameEn: 'Forge',
    cost: { [ResourceType.Stone]: 20, [ResourceType.Iron]: 10, [ResourceType.Dricks]: 60 },
    buildTurns: 4, requiresSacrifice: 'peasant', requiresSettlement: SettlementTier.Village,
    production: { [ResourceType.Tools]: 1, [ResourceType.Weapons]: 1 },
    bonuses: [],
    maxPerSettlement: 2, spriteKey: 'bldg_forge',
    description: 'Fabrique outils et armes à partir de fer.',
  },
  barracks: {
    id: 'barracks', name: 'Caserne', nameEn: 'Barracks',
    cost: { [ResourceType.Wood]: 20, [ResourceType.Stone]: 20, [ResourceType.Dricks]: 80 },
    buildTurns: 4, requiresSacrifice: null, requiresSettlement: SettlementTier.Village,
    production: {},
    bonuses: [{ type: 'recruitment', value: 1 }],
    maxPerSettlement: 1, spriteKey: 'bldg_barracks',
    description: "Permet le recrutement d'unités militaires.",
  },
  stable: {
    id: 'stable', name: 'Écurie', nameEn: 'Stable',
    cost: { [ResourceType.Wood]: 25, [ResourceType.Leather]: 5, [ResourceType.Grain]: 20, [ResourceType.Dricks]: 70 },
    buildTurns: 4, requiresSacrifice: null, requiresSettlement: SettlementTier.Town,
    production: {},
    bonuses: [{ type: 'recruitment', value: 1 }],
    maxPerSettlement: 1, spriteKey: 'bldg_stable',
    description: 'Permet le recrutement de cavalerie et chevaliers.',
  },
  chapel: {
    id: 'chapel', name: 'Chapelle', nameEn: 'Chapel',
    cost: { [ResourceType.Stone]: 30, [ResourceType.Planks]: 10, [ResourceType.Gems]: 2, [ResourceType.Dricks]: 100 },
    buildTurns: 5, requiresSacrifice: null, requiresSettlement: SettlementTier.Town,
    production: { [ResourceType.Dricks]: 5 },
    bonuses: [{ type: 'defense', value: 0.1 }],
    maxPerSettlement: 1, spriteKey: 'bldg_chapel',
    description: 'Lieu de culte. Permet le recrutement de chapelains.',
  },
  market: {
    id: 'market', name: 'Marché', nameEn: 'Market',
    cost: { [ResourceType.Wood]: 20, [ResourceType.Stone]: 15, [ResourceType.Dricks]: 60 },
    buildTurns: 3, requiresSacrifice: null, requiresSettlement: SettlementTier.Village,
    production: { [ResourceType.Dricks]: 10 },
    bonuses: [{ type: 'trade', value: 1 }],
    maxPerSettlement: 1, spriteKey: 'bldg_market',
    description: 'Génère des Dricks et permet le commerce.',
  },
  wall: {
    id: 'wall', name: 'Mur', nameEn: 'Wall',
    cost: { [ResourceType.Stone]: 40, [ResourceType.Dricks]: 80 },
    buildTurns: 5, requiresSacrifice: null, requiresSettlement: SettlementTier.Village,
    production: {},
    bonuses: [{ type: 'defense', value: 0.5 }],
    maxPerSettlement: 1, spriteKey: 'bldg_wall',
    description: 'Fortification défensive. +50% défense.',
  },
  watchtower: {
    id: 'watchtower', name: 'Tour de Guet', nameEn: 'Watchtower',
    cost: { [ResourceType.Stone]: 15, [ResourceType.Wood]: 10, [ResourceType.Dricks]: 30 },
    buildTurns: 3, requiresSacrifice: null, requiresSettlement: SettlementTier.Campfire,
    production: {},
    bonuses: [{ type: 'sight', value: 3 }],
    maxPerSettlement: 1, spriteKey: 'bldg_watchtower',
    description: 'Augmente la vision dans la zone.',
  },
  port: {
    id: 'port', name: 'Port', nameEn: 'Port',
    cost: { [ResourceType.Wood]: 30, [ResourceType.Stone]: 20, [ResourceType.Iron]: 5, [ResourceType.Dricks]: 100 },
    buildTurns: 5, requiresSacrifice: 'peasant', requiresSettlement: SettlementTier.Town,
    production: { [ResourceType.Fish]: 3, [ResourceType.Dricks]: 5 },
    bonuses: [{ type: 'trade', value: 2 }],
    maxPerSettlement: 1, spriteKey: 'bldg_port',
    description: 'Permet le commerce maritime et la construction navale.',
  },
  artisan_workshop: {
    id: 'artisan_workshop', name: "Atelier d'Artisan", nameEn: 'Artisan Workshop',
    cost: { [ResourceType.Wood]: 15, [ResourceType.Stone]: 10, [ResourceType.Tools]: 2, [ResourceType.Dricks]: 50 },
    buildTurns: 3, requiresSacrifice: 'peasant', requiresSettlement: SettlementTier.Village,
    production: { [ResourceType.Jewelry]: 1, [ResourceType.Cloth]: 2 },
    bonuses: [],
    maxPerSettlement: 2, spriteKey: 'bldg_artisan',
    description: 'Transforme gemmes et laine en bijoux et tissus.',
  },

  // ── Independent Buildings (no settlement required) ──
  outpost: {
    id: 'outpost', name: 'Poste de Garde', nameEn: 'Outpost',
    cost: { [ResourceType.Wood]: 15, [ResourceType.Stone]: 10, [ResourceType.Dricks]: 30 },
    buildTurns: 2, requiresSacrifice: null, requiresSettlement: null,
    production: {},
    bonuses: [{ type: 'defense', value: 0.2 }, { type: 'sight', value: 2 }],
    maxPerSettlement: 0, spriteKey: 'bldg_outpost',
    description: 'Poste de garde indépendant. Vision et défense.',
  },
  lumber_camp: {
    id: 'lumber_camp', name: 'Camp de Bûcherons', nameEn: 'Lumber Camp',
    cost: { [ResourceType.Wood]: 10, [ResourceType.Dricks]: 15 },
    buildTurns: 2, requiresSacrifice: 'peasant', requiresSettlement: null,
    production: { [ResourceType.Wood]: 4 },
    bonuses: [],
    maxPerSettlement: 0, spriteKey: 'bldg_lumber_camp',
    description: 'Camp forestier indépendant. Produit du bois.',
  },
  remote_mine: {
    id: 'remote_mine', name: 'Mine Isolée', nameEn: 'Remote Mine',
    cost: { [ResourceType.Wood]: 10, [ResourceType.Stone]: 5, [ResourceType.Tools]: 1, [ResourceType.Dricks]: 30 },
    buildTurns: 3, requiresSacrifice: 'peasant', requiresSettlement: null,
    production: { [ResourceType.Stone]: 2, [ResourceType.Iron]: 1 },
    bonuses: [],
    maxPerSettlement: 0, spriteKey: 'bldg_remote_mine',
    description: 'Petite mine indépendante.',
  },
};
