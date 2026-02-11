<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore';
import { useGameStore } from '../stores/gameStore';
import GameBoard from '../components/GameBoard.vue';
import ResourceBar from '../components/ResourceBar.vue';
import InfoPanel from '../components/InfoPanel.vue';
import ActionBar from '../components/ActionBar.vue';
import TurnControls from '../components/TurnControls.vue';
import ChatPanel from '../components/ChatPanel.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const game = useGameStore();

const gameId = route.params.id as string;
const showChat = ref(false);

onMounted(async () => {
  if (!auth.user) {
    router.push('/login');
    return;
  }
  await game.loadGameState(gameId, auth.user.uid);
  game.startPolling(5000);
});

onUnmounted(() => {
  game.stopPolling();
});

function goBack() {
  game.stopPolling();
  router.push('/lobby');
}
</script>

<template>
  <div class="game-page" v-if="game.game">
    <!-- Top bar: resources + turn -->
    <div class="top-bar">
      <button class="back-btn" @click="goBack">&#9664; Lobby</button>
      <ResourceBar />
      <TurnControls />
    </div>

    <!-- Main content -->
    <div class="game-layout">
      <!-- Map -->
      <div class="map-area">
        <GameBoard />
      </div>

      <!-- Right side panel -->
      <div class="side-panel">
        <InfoPanel />
        <ActionBar />
      </div>
    </div>

    <!-- Chat toggle -->
    <button class="chat-toggle" @click="showChat = !showChat">
      {{ showChat ? '✕' : '💬' }} Chat
    </button>
    <ChatPanel v-if="showChat" @close="showChat = false" />
  </div>

  <!-- Loading -->
  <div v-else-if="game.loading" class="loading-screen">
    <h2>Chargement de la partie...</h2>
  </div>

  <!-- Error -->
  <div v-else class="error-screen">
    <h2>Erreur</h2>
    <p>{{ game.error || 'Partie introuvable' }}</p>
    <button @click="goBack">Retour au lobby</button>
  </div>
</template>

<style scoped>
.game-page {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.top-bar {
  display: flex;
  align-items: center;
  gap: 1em;
  padding: 0.4em 1em;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  height: 48px;
  flex-shrink: 0;
}

.back-btn {
  font-size: 0.8em;
  padding: 0.3em 0.6em;
}

.game-layout {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.map-area {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.side-panel {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--border);
  background: var(--bg-panel);
  overflow-y: auto;
}

.chat-toggle {
  position: fixed;
  bottom: 1em;
  right: 1em;
  z-index: 100;
  border-radius: 20px;
  padding: 0.5em 1em;
  background: var(--accent);
  color: var(--bg-primary);
  font-weight: 600;
}

.loading-screen,
.error-screen {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 1em;
}
</style>
