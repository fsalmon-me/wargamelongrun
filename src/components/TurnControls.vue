<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '../stores/gameStore';

const game = useGameStore();

const turnLabel = computed(() =>
  `Tour ${game.game?.currentTurn ?? 0}`
);

const playersStatus = computed(() =>
  game.players.map(p => ({
    name: p.name,
    ready: p.turnPlayed,
    isMe: p.id === game.currentPlayer?.id,
  }))
);

const canEndTurn = computed(() =>
  game.currentPlayer && !game.currentPlayer.turnPlayed
);
</script>

<template>
  <div class="turn-controls">
    <span class="turn-label">{{ turnLabel }}</span>

    <div class="player-dots">
      <span
        v-for="ps in playersStatus"
        :key="ps.name"
        class="dot"
        :class="{ ready: ps.ready, me: ps.isMe }"
        :title="`${ps.name}: ${ps.ready ? 'Prêt' : 'En attente'}`"
      ></span>
    </div>

    <button
      class="btn-primary end-turn-btn"
      :disabled="!canEndTurn"
      @click="game.endTurn()"
    >
      {{ game.currentPlayer?.turnPlayed ? '✓ En attente...' : 'Fin de tour' }}
    </button>
  </div>
</template>

<style scoped>
.turn-controls {
  display: flex;
  align-items: center;
  gap: 0.8em;
  margin-left: auto;
}

.turn-label {
  font-weight: 600;
  color: var(--accent);
  font-size: 0.9em;
}

.player-dots {
  display: flex;
  gap: 4px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--border);
  transition: background 0.3s;
}

.dot.ready {
  background: var(--success);
}

.dot.me {
  border: 2px solid var(--accent);
}

.end-turn-btn {
  font-size: 0.85em;
  padding: 0.3em 1em;
}
</style>
