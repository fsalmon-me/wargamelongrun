<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore';
import { useLobbyStore } from '../stores/lobbyStore';
import { FACTIONS, GameMode } from '../models/game';

const auth = useAuthStore();
const lobby = useLobbyStore();
const router = useRouter();

const showCreate = ref(false);
const newName = ref('');
const newMode = ref<GameMode>(GameMode.Rapid);
const maxPlayers = ref(4);
const selectedFaction = ref('alrimor');

const factionList = Object.values(FACTIONS);

onMounted(() => lobby.loadGames());

async function createGame() {
  if (!newName.value.trim() || !auth.user) return;
  const gameId = await lobby.createGame(
    newName.value,
    newMode.value,
    maxPlayers.value,
    auth.user.uid,
  );
  // Auto-join the created game
  if (gameId) {
    await lobby.joinGame(gameId, auth.user.uid, auth.displayName, selectedFaction.value);
    router.push(`/game/${gameId}`);
  }
}

async function joinGame(gameId: string) {
  if (!auth.user) return;
  await lobby.joinGame(gameId, auth.user.uid, auth.displayName, selectedFaction.value);
  router.push(`/game/${gameId}`);
}

function logout() {
  auth.logout();
  router.push('/login');
}
</script>

<template>
  <div class="lobby-page">
    <header class="lobby-header">
      <h1>MIDGARD</h1>
      <div class="user-info">
        <span>{{ auth.user?.email }}</span>
        <button @click="logout">Déconnexion</button>
      </div>
    </header>

    <main class="lobby-content">
      <!-- Faction selector (persistent) -->
      <section class="faction-selector">
        <h3>Votre Faction</h3>
        <div class="faction-grid">
          <div
            v-for="f in factionList"
            :key="f.id"
            class="faction-card"
            :class="{ selected: selectedFaction === f.id }"
            @click="selectedFaction = f.id"
          >
            <div class="faction-color" :style="{ background: f.color }"></div>
            <span class="faction-name">{{ f.name }}</span>
          </div>
        </div>
      </section>

      <!-- Create / list -->
      <section class="games-section">
        <div class="section-header">
          <h2>Parties disponibles</h2>
          <button class="btn-primary" @click="showCreate = !showCreate">
            {{ showCreate ? 'Annuler' : '+ Nouvelle partie' }}
          </button>
        </div>

        <!-- Create form -->
        <div v-if="showCreate" class="create-form">
          <div class="field">
            <label>Nom de la partie</label>
            <input v-model="newName" placeholder="Ma partie" />
          </div>
          <div class="field">
            <label>Mode</label>
            <select v-model="newMode">
              <option :value="GameMode.Rapid">Rapide (synchrone)</option>
              <option :value="GameMode.Permanent">Permanent (async)</option>
              <option :value="GameMode.Story">Story (campagne)</option>
            </select>
          </div>
          <div class="field">
            <label>Joueurs max</label>
            <select v-model.number="maxPlayers">
              <option :value="2">2</option>
              <option :value="4">4</option>
              <option :value="6">6</option>
              <option :value="9">9</option>
            </select>
          </div>
          <button class="btn-primary" @click="createGame" :disabled="!newName.trim()">
            Créer la partie
          </button>
        </div>

        <!-- Games list -->
        <div v-if="lobby.loading" class="loading">Chargement...</div>
        <div v-else-if="lobby.games.length === 0" class="empty">
          Aucune partie disponible. Créez-en une !
        </div>
        <div v-else class="games-list">
          <div v-for="g in lobby.games" :key="g.id" class="game-card">
            <div class="game-info">
              <h3>{{ g.name }}</h3>
              <div class="game-meta">
                <span class="badge">{{ g.mode }}</span>
                <span>Tour {{ g.currentTurn }}</span>
                <span>{{ g.turnOrder.length }}/{{ g.maxPlayers }} joueurs</span>
                <span :class="['status', g.status]">{{ g.status }}</span>
              </div>
            </div>
            <div class="game-actions">
              <button v-if="g.status === 'lobby'" @click="joinGame(g.id)">
                Rejoindre
              </button>
              <button v-else-if="g.status === 'in_progress'" @click="router.push(`/game/${g.id}`)">
                Continuer
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>

    <p class="error" v-if="lobby.error">{{ lobby.error }}</p>
  </div>
</template>

<style scoped>
.lobby-page {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.lobby-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1em 2em;
  border-bottom: 1px solid var(--border);
  background: var(--bg-secondary);
}

.lobby-header h1 {
  font-size: 1.4em;
  letter-spacing: 0.1em;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 1em;
}

.user-info span {
  color: var(--text-secondary);
  font-size: 0.9em;
}

.lobby-content {
  flex: 1;
  max-width: 900px;
  margin: 0 auto;
  padding: 2em;
  width: 100%;
}

/* Faction selector */
.faction-selector {
  margin-bottom: 2em;
}

.faction-selector h3 {
  margin-bottom: 0.8em;
}

.faction-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5em;
}

.faction-card {
  display: flex;
  align-items: center;
  gap: 0.5em;
  padding: 0.5em 1em;
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  background: var(--bg-secondary);
  transition: all 0.2s;
}

.faction-card:hover {
  border-color: var(--accent);
}

.faction-card.selected {
  border-color: var(--accent);
  background: rgba(212, 165, 90, 0.15);
}

.faction-color {
  width: 14px;
  height: 14px;
  border-radius: 50%;
}

.faction-name {
  font-size: 0.85em;
}

/* Games */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5em;
}

.create-form {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 1.5em;
  margin-bottom: 1.5em;
  display: flex;
  gap: 1em;
  align-items: flex-end;
}

.create-form .field {
  flex: 1;
}

.create-form label {
  display: block;
  font-size: 0.85em;
  margin-bottom: 0.3em;
  color: var(--text-secondary);
}

.create-form input,
.create-form select {
  width: 100%;
}

.games-list {
  display: flex;
  flex-direction: column;
  gap: 0.8em;
}

.game-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 1em 1.5em;
}

.game-info h3 {
  font-size: 1em;
  color: var(--text-primary);
  margin-bottom: 0.3em;
}

.game-meta {
  display: flex;
  gap: 1em;
  font-size: 0.8em;
  color: var(--text-secondary);
}

.badge {
  background: var(--accent);
  color: var(--bg-primary);
  padding: 0.1em 0.6em;
  border-radius: 3px;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.75em;
}

.status.lobby { color: var(--accent); }
.status.in_progress { color: var(--success); }
.status.finished { color: var(--text-secondary); }

.loading, .empty {
  text-align: center;
  color: var(--text-secondary);
  padding: 3em;
}

.error {
  color: var(--danger);
  text-align: center;
  padding: 1em;
}
</style>
