<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStore } from '../stores/gameStore';
import { UNIT_TYPES } from '../models/units';
import { BUILDING_TYPES } from '../models/buildings';

const game = useGameStore();
const showRecruit = ref(false);

const canAct = computed(() =>
  game.selectedTile && game.currentPlayer &&
  game.selectedTile.ownerId === game.currentPlayer.id
);

const recruitableUnits = computed(() => {
  if (!canAct.value || !game.selectedTile) return [];
  return Object.entries(UNIT_TYPES)
    .filter(([id, _]) => {
      // Simple check — more complete logic in UnitManager.canRecruit
      return true;
    })
    .map(([id, ut]) => ({
      id,
      name: ut.name,
      category: ut.category,
      cost: ut.cost,
    }));
});

const buildableBuildings = computed(() => {
  if (!canAct.value || !game.selectedTile) return [];
  return Object.entries(BUILDING_TYPES)
    .map(([id, bt]) => ({
      id,
      name: bt.name,
      cost: bt.cost,
      turns: bt.buildTime,
    }));
});

async function recruit(unitTypeId: string) {
  if (!game.selectedTile) return;
  const ok = await game.recruitUnit(unitTypeId, game.selectedTile.x, game.selectedTile.y);
  if (ok) showRecruit.value = false;
}

function previewProduction() {
  game.simulateProduction();
}
</script>

<template>
  <div class="action-bar" v-if="canAct">
    <h3>Actions</h3>

    <div class="action-buttons">
      <button @click="showRecruit = !showRecruit">
        🗡️ Recruter
      </button>
      <button @click="previewProduction">
        📊 Production
      </button>
    </div>

    <!-- Recruit panel -->
    <div v-if="showRecruit" class="recruit-panel">
      <h4>Recruter une unité</h4>
      <div class="recruit-list">
        <div
          v-for="u in recruitableUnits"
          :key="u.id"
          class="recruit-item"
          @click="recruit(u.id)"
        >
          <span class="recruit-name">{{ u.name }}</span>
          <span class="recruit-category">{{ u.category }}</span>
        </div>
      </div>
    </div>

    <!-- Production preview modal -->
    <div v-if="game.productionPreview" class="production-preview">
      <h4>Aperçu Production Mensuelle</h4>
      <div class="prod-entries">
        <div v-for="entry in game.productionPreview.entries" :key="entry.source" class="prod-row">
          <span>{{ entry.source }}</span>
          <span :class="{ positive: entry.amount > 0, negative: entry.amount < 0 }">
            {{ entry.amount > 0 ? '+' : '' }}{{ entry.amount }} {{ entry.resourceType }}
          </span>
        </div>
      </div>
      <div class="prod-warnings" v-if="game.productionPreview.warnings.length">
        <p v-for="(w, i) in game.productionPreview.warnings" :key="i" class="warning">
          ⚠️ {{ w }}
        </p>
      </div>
      <button @click="game.productionPreview = null">Fermer</button>
    </div>
  </div>
</template>

<style scoped>
.action-bar {
  padding: 1em;
  border-top: 1px solid var(--border);
}

.action-bar h3 {
  font-size: 0.9em;
  margin-bottom: 0.5em;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.3em;
}

.action-buttons {
  display: flex;
  gap: 0.5em;
  margin-bottom: 0.5em;
}

.action-buttons button {
  flex: 1;
  font-size: 0.8em;
  padding: 0.4em;
}

.recruit-panel, .production-preview {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0.8em;
  margin-top: 0.5em;
}

.recruit-panel h4, .production-preview h4 {
  font-size: 0.85em;
  color: var(--accent);
  margin-bottom: 0.5em;
}

.recruit-list {
  max-height: 200px;
  overflow-y: auto;
}

.recruit-item {
  display: flex;
  justify-content: space-between;
  padding: 0.3em 0.5em;
  cursor: pointer;
  font-size: 0.8em;
  border-radius: 3px;
}

.recruit-item:hover {
  background: rgba(212, 165, 90, 0.15);
}

.recruit-name {
  font-weight: 500;
}

.recruit-category {
  color: var(--text-secondary);
  font-size: 0.85em;
}

.prod-entries {
  max-height: 150px;
  overflow-y: auto;
}

.prod-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.8em;
  padding: 0.2em 0;
}

.positive { color: var(--success); }
.negative { color: var(--danger); }

.prod-warnings {
  margin-top: 0.5em;
}

.warning {
  color: var(--danger);
  font-size: 0.8em;
}
</style>
