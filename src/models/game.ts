// ─── Core Game Models ──────────────────────────────────────────────────────

import type { ResourceMap } from './resources';
import type { TerrainType, TerrainModifier } from './terrain';
import type { SettlementTier } from './buildings';

// ─── Map ──────────────────────────────────────────────────────────────────

export interface Tile {
  x: number;
  y: number;
  terrain: TerrainType;
  river: boolean;
  road: boolean;
  ownerId: string | null;       // faction/player who controls this tile
}

/** A 10x10 chunk of tiles for scalable map storage */
export interface MapChunk {
  chunkX: number;   // chunk coordinate (e.g. chunk 0,0 = tiles 0-9,0-9)
  chunkY: number;
  tiles: Tile[];    // flat array of up to 100 tiles
}

export interface GameMap {
  id: string;
  name: string;
  width: number;    // total tiles width
  height: number;   // total tiles height
  chunkSize: number; // default 10
  createdAt: number;
}

// ─── Faction ──────────────────────────────────────────────────────────────

export interface Faction {
  id: string;
  name: string;
  color: string;          // hex color for map display
  description: string;
  bonuses: FactionBonus[];
  spriteKey: string;
}

export interface FactionBonus {
  type: 'military' | 'economic' | 'diplomatic' | 'exploration';
  name: string;
  value: number;
  description: string;
}

// ─── The 9 Factions of Midgard ────────────────────────────────────────────

export const FACTIONS: Record<string, Faction> = {
  alrimor: {
    id: 'alrimor', name: 'Alrimor', color: '#FF0000',
    description: 'Une faction guerrière qui cherche à restaurer l\'honneur du Midgard par les armes.',
    bonuses: [{ type: 'military', name: 'Vétérans', value: 0.1, description: '+10% attaque pour toutes les unités' }],
    spriteKey: 'faction_alrimor',
  },
  astarte: {
    id: 'astarte', name: 'Astarté', color: '#FF00FF',
    description: 'Adorateurs de l\'ancienne déesse, ils combinent foi et magie.',
    bonuses: [{ type: 'diplomatic', name: 'Bénédiction', value: 0.15, description: '+15% efficacité des chapelains' }],
    spriteKey: 'faction_astarte',
  },
  bain_sanglant: {
    id: 'bain_sanglant', name: 'Bain Sanglant', color: '#8B0000',
    description: 'Les plus féroces des guerriers du Midgard, forgés dans le sang.',
    bonuses: [{ type: 'military', name: 'Berserker', value: 0.15, description: '+15% attaque, -5% défense' }],
    spriteKey: 'faction_bain_sanglant',
  },
  bansag: {
    id: 'bansag', name: 'Bansàg', color: '#FFFF00',
    description: 'Commerçants habiles et diplomates, ils préfèrent l\'or à l\'épée.',
    bonuses: [{ type: 'economic', name: 'Commerce', value: 0.2, description: '+20% revenus en Dricks' }],
    spriteKey: 'faction_bansag',
  },
  buzardie: {
    id: 'buzardie', name: 'Buzardie', color: '#0000FF',
    description: 'Les cavaliers des plaines, rapides comme le vent.',
    bonuses: [{ type: 'exploration', name: 'Cavaliers des plaines', value: 1, description: '+1 mouvement pour la cavalerie' }],
    spriteKey: 'faction_buzardie',
  },
  caragern: {
    id: 'caragern', name: 'Caragern', color: '#00FFFF',
    description: 'Maîtres bâtisseurs et ingénieurs, héritiers de l\'ancienne architecture.',
    bonuses: [{ type: 'economic', name: 'Bâtisseurs', value: 0.25, description: '-25% coût de construction' }],
    spriteKey: 'faction_caragern',
  },
  laurendrill: {
    id: 'laurendrill', name: 'Laurendrill', color: '#00FF00',
    description: 'Les gardiens des forêts, archers d\'élite et protecteurs de la nature.',
    bonuses: [{ type: 'military', name: 'Tireurs d\'élite', value: 0.2, description: '+20% attaque pour les archers' }],
    spriteKey: 'faction_laurendrill',
  },
  trinite: {
    id: 'trinite', name: 'Trinité', color: '#B7B7B7',
    description: 'L\'ordre religieux, gardiens de la foi et de la sagesse d\'Edrik Dayne.',
    bonuses: [{ type: 'diplomatic', name: 'Autorité divine', value: 0.15, description: '+15% défense en territoire allié' }],
    spriteKey: 'faction_trinite',
  },
  yanovie: {
    id: 'yanovie', name: 'Yanovie', color: '#109618',
    description: 'Les fermiers et artisans du Midgard, nourrissant la nation.',
    bonuses: [{ type: 'economic', name: 'Prospérité', value: 0.3, description: '+30% production de nourriture' }],
    spriteKey: 'faction_yanovie',
  },
};

// ─── Player ───────────────────────────────────────────────────────────────

export interface Player {
  id: string;
  name: string;
  factionId: string;
  allianceId: string | null;
  resources: ResourceMap;
  turnsAccumulated: number;   // max 10 in permanent mode
  turnPlayed: boolean;        // has played this turn (rapid mode)
  isReady: boolean;
  lastLoginAt: number;
}

// ─── Alliance ─────────────────────────────────────────────────────────────

export interface Alliance {
  id: string;
  name: string;
  memberIds: string[];
  isFixed: boolean;         // cannot be broken during game
  createdAt: number;
}

// ─── Diplomacy ────────────────────────────────────────────────────────────

export enum DiplomacyStatus {
  Neutral = 'neutral',
  Allied = 'allied',
  Enemy = 'enemy',
}

export interface DiplomacyRelation {
  playerA: string;
  playerB: string;
  status: DiplomacyStatus;
}

// ─── Army ─────────────────────────────────────────────────────────────────

export interface Army {
  id: string;
  ownerId: string;
  name: string;
  unitIds: string[];
  x: number;
  y: number;
}

// ─── Game ─────────────────────────────────────────────────────────────────

export enum GameMode {
  Rapid = 'rapid',
  Permanent = 'permanent',
  Story = 'story',
}

export enum GameStatus {
  Lobby = 'lobby',
  InProgress = 'in_progress',
  Paused = 'paused',
  Finished = 'finished',
}

export interface Game {
  id: string;
  name: string;
  mode: GameMode;
  status: GameStatus;
  mapId: string;
  currentTurn: number;
  turnOrder: string[];          // player IDs in turn order
  maxPlayers: number;
  turnsPerMonth: number;        // how many turns = 1 month (for resource gen)
  createdAt: number;
  createdBy: string;
}

// ─── Combat Log ───────────────────────────────────────────────────────────

export interface CombatLog {
  id: string;
  turn: number;
  attackerId: string;
  defenderId: string;
  attackerUnitId: string;
  defenderUnitId: string;
  attackerDamage: number;
  defenderDamage: number;
  attackerSurvived: boolean;
  defenderSurvived: boolean;
  terrainBonus: number;
  timestamp: number;
}

// ─── Chat ─────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  gameId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
}

// ─── Turn Actions ─────────────────────────────────────────────────────────

export enum ActionType {
  Move = 'move',
  Attack = 'attack',
  Build = 'build',
  Recruit = 'recruit',
  UpgradeSettlement = 'upgrade_settlement',
  CreateArmy = 'create_army',
  DisbandArmy = 'disband_army',
  CreateAlliance = 'create_alliance',
  LeaveAlliance = 'leave_alliance',
  DeclareWar = 'declare_war',
  ProposePeace = 'propose_peace',
  Trade = 'trade',
  EndTurn = 'end_turn',
}

export interface TurnAction {
  id: string;
  playerId: string;
  type: ActionType;
  data: Record<string, unknown>;
  turn: number;
  timestamp: number;
}

// ─── Production Report (monthly simulation) ──────────────────────────────

export interface ProductionReportEntry {
  source: string;       // building/unit name
  sourceId: string;
  resource: string;
  amount: number;
  isMalus: boolean;
  reason?: string;
}

export interface ProductionReport {
  playerId: string;
  turn: number;
  gains: ProductionReportEntry[];
  losses: ProductionReportEntry[];
  netResources: ResourceMap;
  warnings: string[];
}
