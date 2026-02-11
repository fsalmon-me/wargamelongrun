// ─── Resource System ───────────────────────────────────────────────────────

export enum ResourceType {
  // Currency
  Dricks = 'dricks',

  // Raw Resources
  Wood = 'wood',
  Stone = 'stone',
  Iron = 'iron',
  Coal = 'coal',
  Gems = 'gems',
  Grain = 'grain',
  Fish = 'fish',
  Leather = 'leather',
  Wool = 'wool',
  Fruit = 'fruit',

  // Transformed Resources
  Planks = 'planks',       // Wood → Scierie
  Tools = 'tools',         // Iron → Forge
  Weapons = 'weapons',     // Iron + Coal → Forge
  Jewelry = 'jewelry',     // Gems → Artisan
  Cloth = 'cloth',         // Wool → Artisan
}

export type ResourceMap = Partial<Record<ResourceType, number>>;

export interface ResourceDefinition {
  type: ResourceType;
  name: string;
  nameEn: string;
  isRaw: boolean;
  isCurrency: boolean;
  /** For transformed resources: what's needed to produce 1 unit */
  recipe?: {
    inputs: ResourceMap;
    building: string;  // building type required
    outputAmount: number;
  };
  icon: string;  // emoji or sprite key
}

export const RESOURCE_DEFS: Record<ResourceType, ResourceDefinition> = {
  [ResourceType.Dricks]: {
    type: ResourceType.Dricks, name: 'Dricks', nameEn: 'Dricks',
    isRaw: false, isCurrency: true, icon: '💰',
  },
  [ResourceType.Wood]: {
    type: ResourceType.Wood, name: 'Bois', nameEn: 'Wood',
    isRaw: true, isCurrency: false, icon: '🪵',
  },
  [ResourceType.Stone]: {
    type: ResourceType.Stone, name: 'Pierre', nameEn: 'Stone',
    isRaw: true, isCurrency: false, icon: '🪨',
  },
  [ResourceType.Iron]: {
    type: ResourceType.Iron, name: 'Fer', nameEn: 'Iron',
    isRaw: true, isCurrency: false, icon: '⛏️',
  },
  [ResourceType.Coal]: {
    type: ResourceType.Coal, name: 'Charbon', nameEn: 'Coal',
    isRaw: true, isCurrency: false, icon: '�ite',
  },
  [ResourceType.Gems]: {
    type: ResourceType.Gems, name: 'Gemmes', nameEn: 'Gems',
    isRaw: true, isCurrency: false, icon: '💎',
  },
  [ResourceType.Grain]: {
    type: ResourceType.Grain, name: 'Grain', nameEn: 'Grain',
    isRaw: true, isCurrency: false, icon: '🌾',
  },
  [ResourceType.Fish]: {
    type: ResourceType.Fish, name: 'Poisson', nameEn: 'Fish',
    isRaw: true, isCurrency: false, icon: '🐟',
  },
  [ResourceType.Leather]: {
    type: ResourceType.Leather, name: 'Cuir', nameEn: 'Leather',
    isRaw: true, isCurrency: false, icon: '🟫',
  },
  [ResourceType.Wool]: {
    type: ResourceType.Wool, name: 'Laine', nameEn: 'Wool',
    isRaw: true, isCurrency: false, icon: '🐑',
  },
  [ResourceType.Fruit]: {
    type: ResourceType.Fruit, name: 'Fruits', nameEn: 'Fruit',
    isRaw: true, isCurrency: false, icon: '🍎',
  },
  [ResourceType.Planks]: {
    type: ResourceType.Planks, name: 'Planches', nameEn: 'Planks',
    isRaw: false, isCurrency: false, icon: '🪓',
    recipe: {
      inputs: { [ResourceType.Wood]: 2 },
      building: 'sawmill',
      outputAmount: 1,
    },
  },
  [ResourceType.Tools]: {
    type: ResourceType.Tools, name: 'Outils', nameEn: 'Tools',
    isRaw: false, isCurrency: false, icon: '🔧',
    recipe: {
      inputs: { [ResourceType.Iron]: 2 },
      building: 'forge',
      outputAmount: 1,
    },
  },
  [ResourceType.Weapons]: {
    type: ResourceType.Weapons, name: 'Armes', nameEn: 'Weapons',
    isRaw: false, isCurrency: false, icon: '⚔️',
    recipe: {
      inputs: { [ResourceType.Iron]: 2, [ResourceType.Coal]: 1 },
      building: 'forge',
      outputAmount: 1,
    },
  },
  [ResourceType.Jewelry]: {
    type: ResourceType.Jewelry, name: 'Bijoux', nameEn: 'Jewelry',
    isRaw: false, isCurrency: false, icon: '💍',
    recipe: {
      inputs: { [ResourceType.Gems]: 1 },
      building: 'artisan',
      outputAmount: 1,
    },
  },
  [ResourceType.Cloth]: {
    type: ResourceType.Cloth, name: 'Tissus', nameEn: 'Cloth',
    isRaw: false, isCurrency: false, icon: '🧵',
    recipe: {
      inputs: { [ResourceType.Wool]: 2 },
      building: 'artisan',
      outputAmount: 1,
    },
  },
};

/** Create an empty resource map with all values at 0 */
export function emptyResources(): Record<ResourceType, number> {
  const res = {} as Record<ResourceType, number>;
  for (const key of Object.values(ResourceType)) {
    res[key] = 0;
  }
  return res;
}

/** Add resources from 'b' into 'a' (mutates a) */
export function addResources(a: ResourceMap, b: ResourceMap): void {
  for (const [key, val] of Object.entries(b)) {
    const k = key as ResourceType;
    a[k] = (a[k] || 0) + (val || 0);
  }
}

/** Subtract resources 'cost' from 'pool'. Returns false if insufficient. */
export function subtractResources(pool: ResourceMap, cost: ResourceMap): boolean {
  // First check if we have enough
  for (const [key, val] of Object.entries(cost)) {
    const k = key as ResourceType;
    if ((pool[k] || 0) < (val || 0)) return false;
  }
  // Then subtract
  for (const [key, val] of Object.entries(cost)) {
    const k = key as ResourceType;
    pool[k] = (pool[k] || 0) - (val || 0);
  }
  return true;
}

/** Check if pool has enough resources for cost */
export function hasResources(pool: ResourceMap, cost: ResourceMap): boolean {
  for (const [key, val] of Object.entries(cost)) {
    const k = key as ResourceType;
    if ((pool[k] || 0) < (val || 0)) return false;
  }
  return true;
}
