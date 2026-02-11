// ─── Terrain Types & Definitions ───────────────────────────────────────────

export enum TerrainType {
  // Agricultural & Plains
  Farmland = 'farm',
  CultivatedFarmland = 'cufarm',
  GrasslandPoor = 'grasspo',
  GrasslandPoorBis = 'grasspob',
  Grassland = 'grass',
  GrazingLand = 'graz',

  // Forests
  LightForest = 'lifo',
  HeavyForest = 'hefo',
  ForestedHills = 'fohi',
  ForestedMountains = 'fomo',
  EveregreenMountains = 'evmo',
  HeavyEvergreen = 'heev',

  // Hills & Mountains
  GrassyHills = 'grhi',
  Hills = 'hills',
  Mountains = 'moun',
  SnowcappedMountains = 'snomo',
  DormantVolcano = 'dvol',
  Volcano = 'vol',

  // Wetlands
  Swamp = 'swa',
  Marsh = 'mar',

  // Moss & Snow
  Moss = 'moss',
  Snow = 'snow',
  SnowField = 'snowf',
  EveregreenMountainsIcy = 'evmoicy',
  MountainsIcy = 'mounicy',
  DeadForestMountainsIcy = 'defomoicy',
  Glaceland = 'glacier',
  IcyMarsh = 'marshicy',

  // Dead / Corrupt
  DeadForest = 'defo',
  DeadForestHills = 'defoh',
  DeadFields = 'defi',
  BrokenLands = 'brola',

  // Desert
  RockyDesert = 'rode',
  SandyDesert = 'sade',
  Oasis = 'oasis',
  SandDunes = 'sadu',
  HeavyCactus = 'heca',

  // Tropical
  Jungle = 'jungle',
  JungleHills = 'junhi',

  // Water & Special
  Sea = 'mer',
  DeepSea = 'dsea',
  Reefs = 'reef',
  ReefsBis = 'reefb',
  Lava = 'lava',
}

export interface TerrainModifier {
  river: boolean;
  road: boolean;
}

/** Full terrain code including modifiers (e.g. "farmri", "grassro", "heforiro") */
export type TerrainCode = string;

export interface TerrainDefinition {
  type: TerrainType;
  name: string;
  nameEn: string;
  movementCost: number;       // 1 = easy, 99 = impassable
  defenseBonus: number;       // multiplier, 1.0 = neutral
  foodProduction: number;     // base food per turn
  resourceSlots: string[];    // which resources can appear
  isWater: boolean;
  isPassable: boolean;        // for land units
  isNavalPassable: boolean;   // for naval units
  spriteKey: string;          // key in the spritesheet
  color: string;              // fallback hex color for minimap
}

/**
 * Master terrain definitions — all 39+ terrain types with base stats
 */
export const TERRAIN_DEFS: Record<TerrainType, TerrainDefinition> = {
  // ── Agricultural & Plains ──
  [TerrainType.Farmland]: {
    type: TerrainType.Farmland, name: 'Terre Agricole', nameEn: 'Farmland',
    movementCost: 1, defenseBonus: 1.0, foodProduction: 3,
    resourceSlots: ['grain', 'fruit'], isWater: false, isPassable: true, isNavalPassable: false,
    spriteKey: 'farm', color: '#c8a832',
  },
  [TerrainType.CultivatedFarmland]: {
    type: TerrainType.CultivatedFarmland, name: 'Terre Cultivée', nameEn: 'Cultivated Farmland',
    movementCost: 1, defenseBonus: 1.0, foodProduction: 5,
    resourceSlots: ['grain', 'fruit'], isWater: false, isPassable: true, isNavalPassable: false,
    spriteKey: 'cufarm', color: '#a09028',
  },
  [TerrainType.GrasslandPoor]: {
    type: TerrainType.GrasslandPoor, name: 'Prairie Pauvre', nameEn: 'Grassland Poor',
    movementCost: 1, defenseBonus: 1.0, foodProduction: 1,
    resourceSlots: [], isWater: false, isPassable: true, isNavalPassable: false,
    spriteKey: 'grasspo', color: '#90b048',
  },
  [TerrainType.GrasslandPoorBis]: {
    type: TerrainType.GrasslandPoorBis, name: 'Prairie Pauvre (bis)', nameEn: 'Grassland Poor Bis',
    movementCost: 1, defenseBonus: 1.0, foodProduction: 1,
    resourceSlots: [], isWater: false, isPassable: true, isNavalPassable: false,
    spriteKey: 'grasspob', color: '#88a840',
  },
  [TerrainType.Grassland]: {
    type: TerrainType.Grassland, name: 'Prairie', nameEn: 'Grassland',
    movementCost: 1, defenseBonus: 1.0, foodProduction: 2,
    resourceSlots: ['grain'], isWater: false, isPassable: true, isNavalPassable: false,
    spriteKey: 'grass', color: '#68b830',
  },
  [TerrainType.GrazingLand]: {
    type: TerrainType.GrazingLand, name: 'Pâturage', nameEn: 'Grazing Land',
    movementCost: 1, defenseBonus: 1.0, foodProduction: 2,
    resourceSlots: ['leather', 'wool'], isWater: false, isPassable: true, isNavalPassable: false,
    spriteKey: 'graz', color: '#78c040',
  },

  // ── Forests ──
  [TerrainType.LightForest]: {
    type: TerrainType.LightForest, name: 'Forêt Légère', nameEn: 'Light Forest',
    movementCost: 2, defenseBonus: 1.2, foodProduction: 1,
    resourceSlots: ['wood', 'fruit'], isWater: false, isPassable: true, isNavalPassable: false,
    spriteKey: 'lifo', color: '#228B22',
  },
  [TerrainType.HeavyForest]: {
    type: TerrainType.HeavyForest, name: 'Forêt Dense', nameEn: 'Heavy Forest',
    movementCost: 3, defenseBonus: 1.3, foodProduction: 1,
    resourceSlots: ['wood'], isWater: false, isPassable: true, isNavalPassable: false,
    spriteKey: 'hefo', color: '#006400',
  },
  [TerrainType.ForestedHills]: {
    type: TerrainType.ForestedHills, name: 'Collines Boisées', nameEn: 'Forested Hills',
    movementCost: 3, defenseBonus: 1.4, foodProduction: 0,
    resourceSlots: ['wood', 'stone'], isWater: false, isPassable: true, isNavalPassable: false,
    spriteKey: 'fohi', color: '#2E5E1E',
  },
  [TerrainType.ForestedMountains]: {
    type: TerrainType.ForestedMountains, name: 'Montagnes Boisées', nameEn: 'Forested Mountains',
    movementCost: 4, defenseBonus: 1.5, foodProduction: 0,
    resourceSlots: ['wood', 'stone', 'iron'], isWater: false, isPassable: true, isNavalPassable: false,
    spriteKey: 'fomo', color: '#1E4E0E',
  },
  [TerrainType.EveregreenMountains]: {
    type: TerrainType.EveregreenMountains, name: 'Montagnes Persistantes', nameEn: 'Evergreen Mountains',
    movementCost: 4, defenseBonus: 1.5, foodProduction: 0,
    resourceSlots: ['wood', 'stone'], isWater: false, isPassable: true, isNavalPassable: false,
    spriteKey: 'evmo', color: '#1B5E20',
  },
  [TerrainType.HeavyEvergreen]: {
    type: TerrainType.HeavyEvergreen, name: 'Persistant Dense', nameEn: 'Heavy Evergreen',
    movementCost: 3, defenseBonus: 1.3, foodProduction: 0,
    resourceSlots: ['wood'], isWater: false, isPassable: true, isNavalPassable: false,
    spriteKey: 'heev', color: '#0D470D',
  },

  // ── Hills & Mountains ──
  [TerrainType.GrassyHills]: {
    type: TerrainType.GrassyHills, name: 'Collines Herbeuses', nameEn: 'Grassy Hills',
    movementCost: 2, defenseBonus: 1.3, foodProduction: 1,
    resourceSlots: ['stone'], isWater: false, isPassable: true, isNavalPassable: false,
    spriteKey: 'grhi', color: '#7CBA3C',
  },
  [TerrainType.Hills]: {
    type: TerrainType.Hills, name: 'Collines', nameEn: 'Hills',
    movementCost: 2, defenseBonus: 1.3, foodProduction: 0,
    resourceSlots: ['stone', 'iron'], isWater: false, isPassable: true, isNavalPassable: false,
    spriteKey: 'hills', color: '#8B7355',
  },
  [TerrainType.Mountains]: {
    type: TerrainType.Mountains, name: 'Montagnes', nameEn: 'Mountains',
    movementCost: 4, defenseBonus: 1.5, foodProduction: 0,
    resourceSlots: ['stone', 'iron', 'gems', 'coal'], isWater: false, isPassable: true, isNavalPassable: false,
    spriteKey: 'moun', color: '#696969',
  },
  [TerrainType.SnowcappedMountains]: {
    type: TerrainType.SnowcappedMountains, name: 'Montagnes Enneigées', nameEn: 'Snowcapped Mountains',
    movementCost: 5, defenseBonus: 1.5, foodProduction: 0,
    resourceSlots: ['stone', 'iron', 'gems'], isWater: false, isPassable: true, isNavalPassable: false,
    spriteKey: 'snomo', color: '#A0A0A0',
  },
  [TerrainType.DormantVolcano]: {
    type: TerrainType.DormantVolcano, name: 'Volcan Endormi', nameEn: 'Dormant Volcano',
    movementCost: 5, defenseBonus: 1.4, foodProduction: 0,
    resourceSlots: ['stone', 'gems', 'coal'], isWater: false, isPassable: true, isNavalPassable: false,
    spriteKey: 'dvol', color: '#555555',
  },
  [TerrainType.Volcano]: {
    type: TerrainType.Volcano, name: 'Volcan', nameEn: 'Volcano',
    movementCost: 99, defenseBonus: 1.0, foodProduction: 0,
    resourceSlots: [], isWater: false, isPassable: false, isNavalPassable: false,
    spriteKey: 'vol', color: '#8B0000',
  },

  // ── Wetlands ──
  [TerrainType.Swamp]: {
    type: TerrainType.Swamp, name: 'Marécage', nameEn: 'Swamp',
    movementCost: 3, defenseBonus: 0.9, foodProduction: 0,
    resourceSlots: [], isWater: false, isPassable: true, isNavalPassable: false,
    spriteKey: 'swa', color: '#4A6741',
  },
  [TerrainType.Marsh]: {
    type: TerrainType.Marsh, name: 'Marais', nameEn: 'Marsh',
    movementCost: 3, defenseBonus: 0.9, foodProduction: 0,
    resourceSlots: ['fish'], isWater: false, isPassable: true, isNavalPassable: false,
    spriteKey: 'mar', color: '#5A7751',
  },

  // ── Moss & Snow ──
  [TerrainType.Moss]: {
    type: TerrainType.Moss, name: 'Mousse', nameEn: 'Moss',
    movementCost: 2, defenseBonus: 1.0, foodProduction: 0,
    resourceSlots: [], isWater: false, isPassable: true, isNavalPassable: false,
    spriteKey: 'moss', color: '#6B8E23',
  },
  [TerrainType.Snow]: {
    type: TerrainType.Snow, name: 'Neige', nameEn: 'Snow',
    movementCost: 2, defenseBonus: 1.0, foodProduction: 0,
    resourceSlots: [], isWater: false, isPassable: true, isNavalPassable: false,
    spriteKey: 'snow', color: '#FFFAFA',
  },
  [TerrainType.SnowField]: {
    type: TerrainType.SnowField, name: 'Champ de Neige', nameEn: 'Snow Field',
    movementCost: 2, defenseBonus: 1.0, foodProduction: 0,
    resourceSlots: [], isWater: false, isPassable: true, isNavalPassable: false,
    spriteKey: 'snowf', color: '#F0F0F0',
  },
  [TerrainType.EveregreenMountainsIcy]: {
    type: TerrainType.EveregreenMountainsIcy, name: 'Montagnes Persistantes Glacées', nameEn: 'Evergreen Mountains Icy',
    movementCost: 5, defenseBonus: 1.5, foodProduction: 0,
    resourceSlots: ['stone'], isWater: false, isPassable: true, isNavalPassable: false,
    spriteKey: 'evmoicy', color: '#4682B4',
  },
  [TerrainType.MountainsIcy]: {
    type: TerrainType.MountainsIcy, name: 'Montagnes Glacées', nameEn: 'Mountains Icy',
    movementCost: 5, defenseBonus: 1.5, foodProduction: 0,
    resourceSlots: ['stone', 'iron'], isWater: false, isPassable: true, isNavalPassable: false,
    spriteKey: 'mounicy', color: '#5F9EA0',
  },
  [TerrainType.DeadForestMountainsIcy]: {
    type: TerrainType.DeadForestMountainsIcy, name: 'Forêt Morte Montagnes Glacées', nameEn: 'Dead Forest Mountains Icy',
    movementCost: 5, defenseBonus: 1.4, foodProduction: 0,
    resourceSlots: ['stone'], isWater: false, isPassable: true, isNavalPassable: false,
    spriteKey: 'defomoicy', color: '#4A6E6E',
  },
  [TerrainType.Glaceland]: {
    type: TerrainType.Glaceland, name: 'Terre Glacée', nameEn: 'Glaceland',
    movementCost: 3, defenseBonus: 1.1, foodProduction: 0,
    resourceSlots: [], isWater: false, isPassable: true, isNavalPassable: false,
    spriteKey: 'glacier', color: '#B0E0E6',
  },
  [TerrainType.IcyMarsh]: {
    type: TerrainType.IcyMarsh, name: 'Marais Glacé', nameEn: 'Icy Marsh',
    movementCost: 3, defenseBonus: 0.9, foodProduction: 0,
    resourceSlots: [], isWater: false, isPassable: true, isNavalPassable: false,
    spriteKey: 'marshicy', color: '#7EA8A8',
  },

  // ── Dead / Corrupt ──
  [TerrainType.DeadForest]: {
    type: TerrainType.DeadForest, name: 'Forêt Morte', nameEn: 'Dead Forest',
    movementCost: 2, defenseBonus: 1.1, foodProduction: 0,
    resourceSlots: ['wood'], isWater: false, isPassable: true, isNavalPassable: false,
    spriteKey: 'defo', color: '#4E4E2E',
  },
  [TerrainType.DeadForestHills]: {
    type: TerrainType.DeadForestHills, name: 'Collines Forêt Morte', nameEn: 'Dead Forest Hills',
    movementCost: 3, defenseBonus: 1.3, foodProduction: 0,
    resourceSlots: ['wood', 'stone'], isWater: false, isPassable: true, isNavalPassable: false,
    spriteKey: 'defoh', color: '#3E3E1E',
  },
  [TerrainType.DeadFields]: {
    type: TerrainType.DeadFields, name: 'Champs Morts', nameEn: 'Dead Fields',
    movementCost: 1, defenseBonus: 1.0, foodProduction: 0,
    resourceSlots: [], isWater: false, isPassable: true, isNavalPassable: false,
    spriteKey: 'defi', color: '#6E6E4E',
  },
  [TerrainType.BrokenLands]: {
    type: TerrainType.BrokenLands, name: 'Terres Brisées', nameEn: 'Broken Lands',
    movementCost: 3, defenseBonus: 1.1, foodProduction: 0,
    resourceSlots: [], isWater: false, isPassable: true, isNavalPassable: false,
    spriteKey: 'brola', color: '#5E4E3E',
  },

  // ── Desert ──
  [TerrainType.RockyDesert]: {
    type: TerrainType.RockyDesert, name: 'Désert Rocheux', nameEn: 'Rocky Desert',
    movementCost: 2, defenseBonus: 1.1, foodProduction: 0,
    resourceSlots: ['stone'], isWater: false, isPassable: true, isNavalPassable: false,
    spriteKey: 'rode', color: '#C4A862',
  },
  [TerrainType.SandyDesert]: {
    type: TerrainType.SandyDesert, name: 'Désert de Sable', nameEn: 'Sandy Desert',
    movementCost: 2, defenseBonus: 0.9, foodProduction: 0,
    resourceSlots: [], isWater: false, isPassable: true, isNavalPassable: false,
    spriteKey: 'sade', color: '#EDC9AF',
  },
  [TerrainType.Oasis]: {
    type: TerrainType.Oasis, name: 'Oasis', nameEn: 'Oasis',
    movementCost: 1, defenseBonus: 1.0, foodProduction: 2,
    resourceSlots: ['fruit', 'fish'], isWater: false, isPassable: true, isNavalPassable: false,
    spriteKey: 'oasis', color: '#2E8B57',
  },
  [TerrainType.SandDunes]: {
    type: TerrainType.SandDunes, name: 'Dunes', nameEn: 'Sand Dunes',
    movementCost: 3, defenseBonus: 0.8, foodProduction: 0,
    resourceSlots: [], isWater: false, isPassable: true, isNavalPassable: false,
    spriteKey: 'sadu', color: '#D2B48C',
  },
  [TerrainType.HeavyCactus]: {
    type: TerrainType.HeavyCactus, name: 'Cactus Dense', nameEn: 'Heavy Cactus',
    movementCost: 2, defenseBonus: 1.1, foodProduction: 0,
    resourceSlots: ['fruit'], isWater: false, isPassable: true, isNavalPassable: false,
    spriteKey: 'heca', color: '#9ACD32',
  },

  // ── Tropical ──
  [TerrainType.Jungle]: {
    type: TerrainType.Jungle, name: 'Jungle', nameEn: 'Jungle',
    movementCost: 3, defenseBonus: 1.3, foodProduction: 1,
    resourceSlots: ['wood', 'fruit'], isWater: false, isPassable: true, isNavalPassable: false,
    spriteKey: 'jungle', color: '#006600',
  },
  [TerrainType.JungleHills]: {
    type: TerrainType.JungleHills, name: 'Collines Jungle', nameEn: 'Jungle Hills',
    movementCost: 4, defenseBonus: 1.4, foodProduction: 0,
    resourceSlots: ['wood', 'stone', 'gems'], isWater: false, isPassable: true, isNavalPassable: false,
    spriteKey: 'junhi', color: '#004D00',
  },

  // ── Water & Special ──
  [TerrainType.Sea]: {
    type: TerrainType.Sea, name: 'Mer', nameEn: 'Sea',
    movementCost: 1, defenseBonus: 1.0, foodProduction: 1,
    resourceSlots: ['fish'], isWater: true, isPassable: false, isNavalPassable: true,
    spriteKey: 'mer', color: '#4169E1',
  },
  [TerrainType.DeepSea]: {
    type: TerrainType.DeepSea, name: 'Haute Mer', nameEn: 'Deep Sea',
    movementCost: 1, defenseBonus: 1.0, foodProduction: 0,
    resourceSlots: ['fish'], isWater: true, isPassable: false, isNavalPassable: true,
    spriteKey: 'dsea', color: '#00008B',
  },
  [TerrainType.Reefs]: {
    type: TerrainType.Reefs, name: 'Récifs', nameEn: 'Reefs',
    movementCost: 2, defenseBonus: 1.2, foodProduction: 1,
    resourceSlots: ['fish'], isWater: true, isPassable: false, isNavalPassable: true,
    spriteKey: 'reef', color: '#20B2AA',
  },
  [TerrainType.ReefsBis]: {
    type: TerrainType.ReefsBis, name: 'Récifs (bis)', nameEn: 'Reefs Bis',
    movementCost: 2, defenseBonus: 1.2, foodProduction: 1,
    resourceSlots: ['fish'], isWater: true, isPassable: false, isNavalPassable: true,
    spriteKey: 'reefb', color: '#1BA8A0',
  },
  [TerrainType.Lava]: {
    type: TerrainType.Lava, name: 'Lave', nameEn: 'Lava',
    movementCost: 99, defenseBonus: 0.5, foodProduction: 0,
    resourceSlots: [], isWater: false, isPassable: false, isNavalPassable: false,
    spriteKey: 'lava', color: '#FF4500',
  },
};

/** River bonus: +1 defense, -1 attacker movement when crossing */
export const RIVER_MODIFIERS = {
  defenseBonus: 0.1,
  attackerMovementPenalty: 1,
};

/** Road bonus: reduces movement cost */
export const ROAD_MODIFIERS = {
  movementCostOverride: 1, // all terrain becomes cost 1 with a road
};

/** Parse terrain code string into type + modifiers */
export function parseTerrainCode(code: string): { type: TerrainType; modifier: TerrainModifier } {
  let baseTerrain = code;
  const modifier: TerrainModifier = { river: false, road: false };

  if (code.endsWith('riro')) {
    baseTerrain = code.slice(0, -4);
    modifier.river = true;
    modifier.road = true;
  } else if (code.endsWith('ri')) {
    baseTerrain = code.slice(0, -2);
    modifier.river = true;
  } else if (code.endsWith('ro')) {
    baseTerrain = code.slice(0, -2);
    modifier.road = true;
  }

  return {
    type: baseTerrain as TerrainType,
    modifier,
  };
}
