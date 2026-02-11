<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '../stores/gameStore';
import { ResourceType, RESOURCE_DEFS } from '../models/resources';

const game = useGameStore();

const resources = computed(() => {
  if (!game.currentPlayer) return [];
  const r = game.currentPlayer.resources;
  return Object.entries(r)
    .filter(([_, val]) => val > 0 || isImportantResource((_ as ResourceType)))
    .map(([type, amount]) => ({
      type: type as ResourceType,
      label: RESOURCE_DEFS[type as ResourceType]?.name || type,
      amount: Math.floor(amount as number),
      icon: getResourceIcon(type as ResourceType),
    }))
    .sort((a, b) => {
      // Dricks first, then by importance
      if (a.type === ResourceType.Dricks) return -1;
      if (b.type === ResourceType.Dricks) return 1;
      return (b.amount) - (a.amount);
    });
});

function isImportantResource(t: ResourceType): boolean {
  return [ResourceType.Dricks, ResourceType.Grain, ResourceType.Wood, ResourceType.Stone].includes(t);
}

function getResourceIcon(t: ResourceType): string {
  const icons: Partial<Record<ResourceType, string>> = {
    [ResourceType.Dricks]: '💰',
    [ResourceType.Grain]: '🌾',
    [ResourceType.Wood]: '🪵',
    [ResourceType.Stone]: '🪨',
    [ResourceType.Iron]: '⛏️',
    [ResourceType.Coal]: '�ite',
    [ResourceType.Fish]: '🐟',
    [ResourceType.Gems]: '💎',
    [ResourceType.Leather]: '🧥',
    [ResourceType.Wool]: '🐑',
  };
  return icons[t] || '📦';
}
</script>

<template>
  <div class="resource-bar" v-if="game.currentPlayer">
    <div class="resource-item" v-for="r in resources" :key="r.type" :title="r.label">
      <span class="icon">{{ r.icon }}</span>
      <span class="amount">{{ r.amount }}</span>
    </div>
  </div>
</template>

<style scoped>
.resource-bar {
  display: flex;
  gap: 0.8em;
  flex: 1;
  overflow-x: auto;
}

.resource-item {
  display: flex;
  align-items: center;
  gap: 0.2em;
  font-size: 0.85em;
  white-space: nowrap;
}

.icon {
  font-size: 1em;
}

.amount {
  font-weight: 600;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}
</style>
