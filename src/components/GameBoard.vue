<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useGameStore } from '../stores/gameStore';
import { MapRenderer, TILE_SIZE } from '../pixi/MapRenderer';

const game = useGameStore();
const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
let renderer: MapRenderer | null = null;

onMounted(async () => {
  if (!canvasRef.value || !containerRef.value) return;

  const rect = containerRef.value.getBoundingClientRect();
  renderer = new MapRenderer({
    width: rect.width,
    height: rect.height,
    onTileClick: (x, y) => {
      game.selectTile(x, y);
    },
    onTileHover: () => {},
  });

  await renderer.init(canvasRef.value);
  updateRenderer();

  // Handle resize
  const ro = new ResizeObserver(entries => {
    if (renderer && entries[0]) {
      const { width, height } = entries[0].contentRect;
      renderer.resize(width, height);
    }
  });
  ro.observe(containerRef.value);
});

function updateRenderer() {
  if (!renderer || !game.grid) return;
  renderer.setGrid(game.grid);
  renderer.setUnits(game.units);
  renderer.setBuildings(game.buildings, game.settlements);
  renderer.setVisibility(game.visibleTiles);
  renderer.refresh();
}

// Reactively update renderer when game state changes
watch(
  () => [game.grid, game.units.length, game.buildings.length, game.visibleTiles.size],
  () => updateRenderer(),
  { deep: false }
);

watch(
  () => game.selectedTile,
  (tile) => {
    if (renderer && tile) {
      renderer.setSelection(tile.x, tile.y);
    }
  }
);

watch(
  () => game.validMoves,
  (moves) => {
    if (renderer) {
      renderer.setHighlightedTiles(moves);
    }
  }
);

onUnmounted(() => {
  renderer?.destroy();
});
</script>

<template>
  <div ref="containerRef" class="game-board">
    <canvas ref="canvasRef"></canvas>
    <div class="coords-display" v-if="game.selectedTile">
      ({{ game.selectedTile.x }}, {{ game.selectedTile.y }}) — {{ game.selectedTile.terrain }}
    </div>
  </div>
</template>

<style scoped>
.game-board {
  width: 100%;
  height: 100%;
  position: relative;
}

.game-board canvas {
  display: block;
}

.coords-display {
  position: absolute;
  bottom: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: var(--text-secondary);
  padding: 0.2em 0.6em;
  border-radius: 3px;
  font-size: 0.8em;
  font-family: monospace;
}
</style>
