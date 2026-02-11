// ─── Lobby Store ───────────────────────────────────────────────────────────
import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Game } from '../models/game';
import { GameMode, GameStatus, FACTIONS } from '../models/game';
import * as db from '../firebase/firestore';
import { where } from 'firebase/firestore';
import { v4 as uuid } from 'uuid';
import { emptyResources } from '../models/resources';
import { generateTestMap, assignStartingTerritories } from '../data/defaultMap';

export const useLobbyStore = defineStore('lobby', () => {
  const games = ref<Game[]>([]);
  const currentGame = ref<Game | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function loadGames(): Promise<void> {
    loading.value = true;
    try {
      games.value = await db.listGames(where('status', 'in', ['lobby', 'in_progress']));
    } catch (e: any) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  }

  async function createGame(
    name: string,
    mode: GameMode,
    maxPlayers: number,
    createdBy: string,
  ): Promise<string> {
    const gameId = uuid();
    const mapId = `map_${gameId}`;

    // Generate default map
    const width = 36;
    const height = 30;
    const tiles = generateTestMap(width, height);

    // Save map
    await db.importMapTiles(mapId, tiles, width, height);

    const game: Game = {
      id: gameId,
      name,
      mode,
      status: GameStatus.Lobby,
      mapId,
      currentTurn: 0,
      turnOrder: [],
      maxPlayers,
      turnsPerMonth: mode === GameMode.Rapid ? 10 : 30,
      createdAt: Date.now(),
      createdBy,
    };

    await db.createGame(game);
    currentGame.value = game;
    return gameId;
  }

  async function joinGame(
    gameId: string,
    playerId: string,
    playerName: string,
    factionId: string,
  ): Promise<void> {
    await db.savePlayer(gameId, {
      id: playerId,
      name: playerName,
      factionId,
      allianceId: null,
      resources: emptyResources(),
      turnsAccumulated: 1,
      turnPlayed: false,
      isReady: false,
      lastLoginAt: Date.now(),
    });

    // Add to turn order
    const game = await db.getGame(gameId);
    if (game) {
      const turnOrder = [...game.turnOrder, playerId];
      await db.updateGame(gameId, { turnOrder });
    }
  }

  async function startGame(gameId: string): Promise<void> {
    await db.updateGame(gameId, { status: GameStatus.InProgress });
  }

  async function loadGame(gameId: string): Promise<void> {
    currentGame.value = await db.getGame(gameId);
  }

  return {
    games,
    currentGame,
    loading,
    error,
    loadGames,
    createGame,
    joinGame,
    startGame,
    loadGame,
  };
});
