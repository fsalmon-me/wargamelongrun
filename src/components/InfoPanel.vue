<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '../stores/gameStore';
import { TERRAIN_DEFS } from '../models/terrain';
import { UNIT_TYPES } from '../models/units';
import { BUILDING_TYPES } from '../models/buildings';
import { FACTIONS } from '../models/game';

const game = useGameStore();

const tileInfo = computed(() => {
  if (!game.selectedTile) return null;
  const t = game.selectedTile;
  const def = TERRAIN_DEFS[t.terrain];
  return {
    terrain: def?.name || t.terrain,
    moveCost: def?.movementCost ?? '?',
    defBonus: def?.defenseBonus ?? 0,
    food: def?.foodProduction ?? 0,
    river: t.river,
    road: t.road,
    owner: t.ownerId ? getPlayerName(t.ownerId) : 'Neutral',
  };
});

const tileUnits = computed(() => {
  if (!game.selectedTile) return [];
  return game.units.filter(u =>
    u.isAlive && u.x === game.selectedTile!.x && u.y === game.selectedTile!.y
  );
});

const tileBuildings = computed(() => {
  if (!game.selectedTile) return [];
  return game.buildings.filter(b =>
    b.x === game.selectedTile!.x && b.y === game.selectedTile!.y
  );
});

const selectedUnitInfo = computed(() => {
  if (!game.selectedUnit) return null;
  const uType = UNIT_TYPES[game.selectedUnit.typeId];
  return {
    name: uType?.name || game.selectedUnit.typeId,
    category: uType?.category,
    hp: game.selectedUnit.currentHp,
    maxHp: uType?.stats.hp || 100,
    attack: uType?.stats.attack || 0,
    defense: uType?.stats.defense || 0,
    movement: uType?.stats.movement || 0,
    hasMoved: game.selectedUnit.hasMoved,
    owner: getPlayerName(game.selectedUnit.ownerId),
    isMine: game.selectedUnit.ownerId === game.currentPlayer?.id,
  };
});

function getPlayerName(playerId: string): string {
  const p = game.players.find(pl => pl.id === playerId);
  if (!p) return 'Inconnu';
  const faction = FACTIONS[p.factionId];
  return `${p.name} (${faction?.name || p.factionId})`;
}
</script>

<template>
  <div class="info-panel">
    <div v-if="!game.selectedTile" class="empty-state">
      <p>Cliquez sur une case pour voir les détails</p>
    </div>

    <template v-else>
      <!-- Terrain info -->
      <section class="tile-section">
        <h3>🗺️ Terrain</h3>
        <div class="info-grid">
          <div class="info-row">
            <span class="label">Type</span>
            <span class="value">{{ tileInfo?.terrain }}</span>
          </div>
          <div class="info-row">
            <span class="label">Mouvement</span>
            <span class="value">{{ tileInfo?.moveCost }}</span>
          </div>
          <div class="info-row">
            <span class="label">Défense</span>
            <span class="value">+{{ ((tileInfo?.defBonus ?? 0) * 100).toFixed(0) }}%</span>
          </div>
          <div class="info-row">
            <span class="label">Nourriture</span>
            <span class="value">{{ tileInfo?.food }}/mois</span>
          </div>
          <div class="info-row" v-if="tileInfo?.river">
            <span class="label">Rivière</span>
            <span class="value">Oui</span>
          </div>
          <div class="info-row" v-if="tileInfo?.road">
            <span class="label">Route</span>
            <span class="value">Oui</span>
          </div>
          <div class="info-row">
            <span class="label">Contrôle</span>
            <span class="value owner">{{ tileInfo?.owner }}</span>
          </div>
        </div>
      </section>

      <!-- Selected unit details -->
      <section v-if="selectedUnitInfo" class="unit-detail-section">
        <h3>⚔️ {{ selectedUnitInfo.name }}</h3>
        <div class="hp-bar-container">
          <div class="hp-bar" :style="{ width: (selectedUnitInfo.hp / selectedUnitInfo.maxHp * 100) + '%' }"></div>
          <span class="hp-text">{{ selectedUnitInfo.hp }}/{{ selectedUnitInfo.maxHp }}</span>
        </div>
        <div class="info-grid">
          <div class="info-row">
            <span class="label">Attaque</span>
            <span class="value">{{ selectedUnitInfo.attack }}</span>
          </div>
          <div class="info-row">
            <span class="label">Défense</span>
            <span class="value">{{ selectedUnitInfo.defense }}</span>
          </div>
          <div class="info-row">
            <span class="label">Mouvement</span>
            <span class="value">{{ selectedUnitInfo.movement }}</span>
          </div>
          <div class="info-row">
            <span class="label">A bougé</span>
            <span class="value" :class="{ warn: selectedUnitInfo.hasMoved }">
              {{ selectedUnitInfo.hasMoved ? 'Oui' : 'Non' }}
            </span>
          </div>
          <div class="info-row">
            <span class="label">Propriétaire</span>
            <span class="value">{{ selectedUnitInfo.owner }}</span>
          </div>
        </div>
      </section>

      <!-- Units on tile -->
      <section v-if="tileUnits.length > 0" class="units-section">
        <h3>Unités ({{ tileUnits.length }})</h3>
        <div
          v-for="u in tileUnits"
          :key="u.id"
          class="unit-row"
          :class="{ selected: game.selectedUnit?.id === u.id, mine: u.ownerId === game.currentPlayer?.id }"
          @click="u.ownerId === game.currentPlayer?.id && game.selectUnit(u)"
        >
          <span class="unit-name">{{ UNIT_TYPES[u.typeId]?.name || u.typeId }}</span>
          <span class="unit-hp">{{ u.currentHp }}hp</span>
        </div>
      </section>

      <!-- Buildings on tile -->
      <section v-if="tileBuildings.length > 0" class="buildings-section">
        <h3>Bâtiments ({{ tileBuildings.length }})</h3>
        <div v-for="b in tileBuildings" :key="b.id" class="building-row">
          <span>{{ BUILDING_TYPES[b.typeId]?.name || b.typeId }}</span>
          <span class="build-progress" v-if="!b.isConstructed">
            ⏳ {{ b.turnsRemaining }} tours restants
          </span>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.info-panel {
  padding: 1em;
}

.empty-state {
  color: var(--text-secondary);
  text-align: center;
  padding: 2em 1em;
  font-size: 0.9em;
}

section {
  margin-bottom: 1.2em;
}

section h3 {
  font-size: 0.9em;
  margin-bottom: 0.5em;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--border);
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 0.3em;
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.85em;
}

.label {
  color: var(--text-secondary);
}

.value {
  font-weight: 500;
}

.value.owner {
  font-size: 0.8em;
}

.value.warn {
  color: var(--danger);
}

/* HP bar */
.hp-bar-container {
  position: relative;
  height: 18px;
  background: var(--bg-primary);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 0.5em;
}

.hp-bar {
  height: 100%;
  background: var(--success);
  transition: width 0.3s;
}

.hp-text {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.7em;
  line-height: 18px;
  font-weight: 600;
}

/* Unit / Building lists */
.unit-row,
.building-row {
  display: flex;
  justify-content: space-between;
  padding: 0.3em 0.5em;
  font-size: 0.85em;
  border-radius: 3px;
}

.unit-row.mine {
  cursor: pointer;
}

.unit-row.mine:hover {
  background: rgba(212, 165, 90, 0.1);
}

.unit-row.selected {
  background: rgba(212, 165, 90, 0.2);
  border-left: 2px solid var(--accent);
}

.unit-hp {
  color: var(--text-secondary);
  font-size: 0.8em;
}

.build-progress {
  color: var(--accent);
  font-size: 0.8em;
}
</style>
