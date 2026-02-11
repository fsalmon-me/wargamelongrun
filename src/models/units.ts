// ─── Unit System ───────────────────────────────────────────────────────────
import type { ResourceMap } from './resources';
import { ResourceType } from './resources';

export enum UnitCategory {
  Civil = 'civil',
  Military = 'military',
  Naval = 'naval',
  Siege = 'siege',
  Special = 'special',
}

export interface UnitStats {
  hp: number;
  attack: number;
  defense: number;
  movement: number;
  range: number;     // 1 = melee, 2+ = ranged
  sight: number;     // fog of war visibility radius
}

export interface UnitType {
  id: string;
  name: string;
  nameEn: string;
  category: UnitCategory;
  stats: UnitStats;
  cost: ResourceMap;
  upkeep: ResourceMap;           // monthly maintenance cost
  canReproduce: boolean;
  reproductionChance: number;    // 0.0-1.0, per month
  sacrificeForBuilding: boolean; // can be consumed for construction
  abilities: string[];
  requiredBuilding?: string;     // building needed to recruit
  spriteKey: string;
  description: string;
}

/** Runtime unit instance in a game */
export interface UnitInstance {
  id: string;
  typeId: string;
  ownerId: string;
  x: number;
  y: number;
  currentHp: number;
  armyId?: string;
  isAlive: boolean;
  hasMoved: boolean;      // reset each turn
  hasActed: boolean;      // reset each turn
  createdTurn: number;
}

// ─── Unit Type Definitions ────────────────────────────────────────────────

export const UNIT_TYPES: Record<string, UnitType> = {
  // ── Civil Units ──
  peasant: {
    id: 'peasant', name: 'Paysan', nameEn: 'Peasant',
    category: UnitCategory.Civil,
    stats: { hp: 10, attack: 1, defense: 1, movement: 2, range: 1, sight: 2 },
    cost: { [ResourceType.Dricks]: 10, [ResourceType.Grain]: 5 },
    upkeep: { [ResourceType.Grain]: 1 },
    canReproduce: true, reproductionChance: 0.15, sacrificeForBuilding: true,
    abilities: [], spriteKey: 'unit_peasant',
    description: 'Unité de base. Peut construire, récolter et se reproduire.',
  },
  lumberjack: {
    id: 'lumberjack', name: 'Bûcheron', nameEn: 'Lumberjack',
    category: UnitCategory.Civil,
    stats: { hp: 12, attack: 2, defense: 1, movement: 2, range: 1, sight: 2 },
    cost: { [ResourceType.Dricks]: 20, [ResourceType.Grain]: 5, [ResourceType.Tools]: 1 },
    upkeep: { [ResourceType.Grain]: 1 },
    canReproduce: true, reproductionChance: 0.10, sacrificeForBuilding: true,
    abilities: ['harvest_wood'], spriteKey: 'unit_lumberjack',
    description: 'Récolte du bois efficacement.',
  },
  miner: {
    id: 'miner', name: 'Mineur', nameEn: 'Miner',
    category: UnitCategory.Civil,
    stats: { hp: 14, attack: 2, defense: 2, movement: 2, range: 1, sight: 1 },
    cost: { [ResourceType.Dricks]: 25, [ResourceType.Grain]: 5, [ResourceType.Tools]: 1 },
    upkeep: { [ResourceType.Grain]: 1 },
    canReproduce: true, reproductionChance: 0.08, sacrificeForBuilding: true,
    abilities: ['harvest_stone', 'harvest_iron', 'harvest_coal'], spriteKey: 'unit_miner',
    description: 'Extrait pierre, fer et charbon des montagnes et collines.',
  },
  farmer: {
    id: 'farmer', name: 'Fermier', nameEn: 'Farmer',
    category: UnitCategory.Civil,
    stats: { hp: 10, attack: 1, defense: 1, movement: 2, range: 1, sight: 2 },
    cost: { [ResourceType.Dricks]: 15, [ResourceType.Grain]: 5 },
    upkeep: { [ResourceType.Grain]: 1 },
    canReproduce: true, reproductionChance: 0.12, sacrificeForBuilding: true,
    abilities: ['harvest_grain', 'harvest_fruit'], spriteKey: 'unit_farmer',
    description: 'Cultive les terres et produit de la nourriture.',
  },
  fisherman: {
    id: 'fisherman', name: 'Pêcheur', nameEn: 'Fisherman',
    category: UnitCategory.Civil,
    stats: { hp: 10, attack: 1, defense: 1, movement: 2, range: 1, sight: 2 },
    cost: { [ResourceType.Dricks]: 15, [ResourceType.Wood]: 5 },
    upkeep: { [ResourceType.Grain]: 1 },
    canReproduce: true, reproductionChance: 0.10, sacrificeForBuilding: true,
    abilities: ['harvest_fish'], spriteKey: 'unit_fisherman',
    description: 'Pêche dans les zones côtières et fluviales.',
  },
  artisan: {
    id: 'artisan', name: 'Artisan', nameEn: 'Artisan',
    category: UnitCategory.Civil,
    stats: { hp: 10, attack: 1, defense: 1, movement: 2, range: 1, sight: 2 },
    cost: { [ResourceType.Dricks]: 30, [ResourceType.Grain]: 5, [ResourceType.Tools]: 1 },
    upkeep: { [ResourceType.Grain]: 1, [ResourceType.Dricks]: 2 },
    canReproduce: true, reproductionChance: 0.05, sacrificeForBuilding: true,
    abilities: ['transform_resources'], spriteKey: 'unit_artisan',
    description: 'Transforme les matières premières en produits finis.',
  },

  // ── Military Units ──
  militia: {
    id: 'militia', name: 'Milicien', nameEn: 'Militia',
    category: UnitCategory.Military,
    stats: { hp: 15, attack: 3, defense: 3, movement: 3, range: 1, sight: 2 },
    cost: { [ResourceType.Dricks]: 20, [ResourceType.Grain]: 5 },
    upkeep: { [ResourceType.Grain]: 1, [ResourceType.Dricks]: 1 },
    canReproduce: false, reproductionChance: 0, sacrificeForBuilding: false,
    abilities: [], requiredBuilding: 'barracks', spriteKey: 'unit_militia',
    description: 'Combattant basique, bon marché mais faible.',
  },
  man_at_arms: {
    id: 'man_at_arms', name: "Homme d'armes", nameEn: 'Man at Arms',
    category: UnitCategory.Military,
    stats: { hp: 25, attack: 6, defense: 5, movement: 3, range: 1, sight: 2 },
    cost: { [ResourceType.Dricks]: 40, [ResourceType.Weapons]: 1, [ResourceType.Grain]: 10 },
    upkeep: { [ResourceType.Grain]: 2, [ResourceType.Dricks]: 2 },
    canReproduce: false, reproductionChance: 0, sacrificeForBuilding: false,
    abilities: [], requiredBuilding: 'barracks', spriteKey: 'unit_man_at_arms',
    description: 'Fantassin bien équipé, colonne vertébrale de toute armée.',
  },
  archer: {
    id: 'archer', name: 'Archer', nameEn: 'Archer',
    category: UnitCategory.Military,
    stats: { hp: 15, attack: 5, defense: 2, movement: 3, range: 2, sight: 3 },
    cost: { [ResourceType.Dricks]: 35, [ResourceType.Wood]: 5, [ResourceType.Grain]: 5 },
    upkeep: { [ResourceType.Grain]: 1, [ResourceType.Dricks]: 2 },
    canReproduce: false, reproductionChance: 0, sacrificeForBuilding: false,
    abilities: ['ranged_attack'], requiredBuilding: 'barracks', spriteKey: 'unit_archer',
    description: "Tire à distance, vulnérable au corps à corps.",
  },
  cavalry: {
    id: 'cavalry', name: 'Cavalier', nameEn: 'Cavalry',
    category: UnitCategory.Military,
    stats: { hp: 20, attack: 7, defense: 4, movement: 5, range: 1, sight: 3 },
    cost: { [ResourceType.Dricks]: 60, [ResourceType.Grain]: 15, [ResourceType.Leather]: 3 },
    upkeep: { [ResourceType.Grain]: 3, [ResourceType.Dricks]: 3 },
    canReproduce: false, reproductionChance: 0, sacrificeForBuilding: false,
    abilities: ['charge'], requiredBuilding: 'stable', spriteKey: 'unit_cavalry',
    description: 'Rapide et puissant, idéal pour les raids.',
  },
  knight: {
    id: 'knight', name: 'Chevalier', nameEn: 'Knight',
    category: UnitCategory.Military,
    stats: { hp: 35, attack: 10, defense: 8, movement: 4, range: 1, sight: 2 },
    cost: { [ResourceType.Dricks]: 100, [ResourceType.Weapons]: 2, [ResourceType.Leather]: 3, [ResourceType.Iron]: 3 },
    upkeep: { [ResourceType.Grain]: 3, [ResourceType.Dricks]: 5 },
    canReproduce: false, reproductionChance: 0, sacrificeForBuilding: false,
    abilities: ['charge', 'inspire'], requiredBuilding: 'stable', spriteKey: 'unit_knight',
    description: "Élite de la chevalerie du Midgard. L'héritage d'Edrik Dayne.",
  },
  spearman: {
    id: 'spearman', name: 'Lancier', nameEn: 'Spearman',
    category: UnitCategory.Military,
    stats: { hp: 20, attack: 5, defense: 6, movement: 3, range: 1, sight: 2 },
    cost: { [ResourceType.Dricks]: 30, [ResourceType.Wood]: 3, [ResourceType.Iron]: 1 },
    upkeep: { [ResourceType.Grain]: 1, [ResourceType.Dricks]: 1 },
    canReproduce: false, reproductionChance: 0, sacrificeForBuilding: false,
    abilities: ['anti_cavalry'], requiredBuilding: 'barracks', spriteKey: 'unit_spearman',
    description: 'Efficace contre la cavalerie grâce à sa lance.',
  },
  scout: {
    id: 'scout', name: 'Éclaireur', nameEn: 'Scout',
    category: UnitCategory.Military,
    stats: { hp: 12, attack: 3, defense: 2, movement: 6, range: 1, sight: 5 },
    cost: { [ResourceType.Dricks]: 25, [ResourceType.Leather]: 1 },
    upkeep: { [ResourceType.Grain]: 1, [ResourceType.Dricks]: 1 },
    canReproduce: false, reproductionChance: 0, sacrificeForBuilding: false,
    abilities: ['stealth', 'scouting'], requiredBuilding: 'barracks', spriteKey: 'unit_scout',
    description: 'Rapide avec une grande vision. Idéal pour explorer.',
  },

  // ── Siege Units ──
  battering_ram: {
    id: 'battering_ram', name: 'Bélier', nameEn: 'Battering Ram',
    category: UnitCategory.Siege,
    stats: { hp: 30, attack: 15, defense: 2, movement: 2, range: 1, sight: 1 },
    cost: { [ResourceType.Dricks]: 50, [ResourceType.Wood]: 15, [ResourceType.Iron]: 5 },
    upkeep: { [ResourceType.Dricks]: 3 },
    canReproduce: false, reproductionChance: 0, sacrificeForBuilding: false,
    abilities: ['siege_bonus'], requiredBuilding: 'barracks', spriteKey: 'unit_ram',
    description: 'Dévastateur contre les fortifications.',
  },
  catapult: {
    id: 'catapult', name: 'Catapulte', nameEn: 'Catapult',
    category: UnitCategory.Siege,
    stats: { hp: 20, attack: 12, defense: 1, movement: 1, range: 3, sight: 2 },
    cost: { [ResourceType.Dricks]: 80, [ResourceType.Wood]: 20, [ResourceType.Iron]: 5 },
    upkeep: { [ResourceType.Dricks]: 4 },
    canReproduce: false, reproductionChance: 0, sacrificeForBuilding: false,
    abilities: ['siege_bonus', 'ranged_attack'], requiredBuilding: 'barracks', spriteKey: 'unit_catapult',
    description: 'Projette des rochers à grande distance.',
  },

  // ── Naval Units ──
  boat: {
    id: 'boat', name: 'Barque', nameEn: 'Boat',
    category: UnitCategory.Naval,
    stats: { hp: 15, attack: 2, defense: 2, movement: 4, range: 1, sight: 3 },
    cost: { [ResourceType.Dricks]: 30, [ResourceType.Wood]: 10 },
    upkeep: { [ResourceType.Dricks]: 1 },
    canReproduce: false, reproductionChance: 0, sacrificeForBuilding: false,
    abilities: ['transport'], requiredBuilding: 'port', spriteKey: 'unit_boat',
    description: 'Petit navire de transport côtier.',
  },
  warship: {
    id: 'warship', name: 'Navire de Guerre', nameEn: 'Warship',
    category: UnitCategory.Naval,
    stats: { hp: 40, attack: 10, defense: 6, movement: 3, range: 2, sight: 3 },
    cost: { [ResourceType.Dricks]: 120, [ResourceType.Wood]: 30, [ResourceType.Iron]: 10 },
    upkeep: { [ResourceType.Grain]: 3, [ResourceType.Dricks]: 5 },
    canReproduce: false, reproductionChance: 0, sacrificeForBuilding: false,
    abilities: ['ranged_attack', 'naval_combat'], requiredBuilding: 'port', spriteKey: 'unit_warship',
    description: 'Puissant vaisseau de guerre armé de balistes.',
  },

  // ── Special Units ──
  chaplain: {
    id: 'chaplain', name: 'Chapelain', nameEn: 'Chaplain',
    category: UnitCategory.Special,
    stats: { hp: 12, attack: 1, defense: 2, movement: 3, range: 1, sight: 2 },
    cost: { [ResourceType.Dricks]: 50, [ResourceType.Grain]: 10 },
    upkeep: { [ResourceType.Grain]: 1, [ResourceType.Dricks]: 3 },
    canReproduce: false, reproductionChance: 0, sacrificeForBuilding: false,
    abilities: ['heal', 'bless'], requiredBuilding: 'chapel', spriteKey: 'unit_chaplain',
    description: 'Soigne les unités alliées et renforce le moral.',
  },
  merchant: {
    id: 'merchant', name: 'Marchand', nameEn: 'Merchant',
    category: UnitCategory.Special,
    stats: { hp: 10, attack: 0, defense: 1, movement: 3, range: 1, sight: 2 },
    cost: { [ResourceType.Dricks]: 40 },
    upkeep: { [ResourceType.Dricks]: 2 },
    canReproduce: false, reproductionChance: 0, sacrificeForBuilding: false,
    abilities: ['trade', 'generate_dricks'], requiredBuilding: 'market', spriteKey: 'unit_merchant',
    description: 'Génère des Dricks et permet le commerce.',
  },
  herald: {
    id: 'herald', name: 'Héraut', nameEn: 'Herald',
    category: UnitCategory.Special,
    stats: { hp: 8, attack: 0, defense: 1, movement: 5, range: 1, sight: 4 },
    cost: { [ResourceType.Dricks]: 30 },
    upkeep: { [ResourceType.Dricks]: 1 },
    canReproduce: false, reproductionChance: 0, sacrificeForBuilding: false,
    abilities: ['diplomacy', 'announce'], spriteKey: 'unit_herald',
    description: 'Messager rapide, permet la diplomatie entre factions.',
  },
};
