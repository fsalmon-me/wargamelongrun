// ─── Game Store ────────────────────────────────────────────────────────────
// Main store for in-game state management
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  Game, Player, Tile, Army, Alliance,
  DiplomacyRelation, CombatLog, ChatMessage,
  ProductionReport,
} from '../models/game';
import { GameStatus, DiplomacyStatus, ActionType } from '../models/game';
import type { UnitInstance } from '../models/units';
import { UNIT_TYPES } from '../models/units';
import type { BuildingInstance, SettlementInstance } from '../models/buildings';
import { TileGrid } from '../engine/map/MapEngine';
import { getReachableTiles } from '../engine/map';
import { UnitManager } from '../engine/units';
import { EconomyEngine } from '../engine/economy';
import { CombatManager } from '../engine/combat';
import { TurnEngine } from '../engine/turns';
import * as db from '../firebase/firestore';
import { v4 as uuid } from 'uuid';

export const useGameStore = defineStore('game', () => {
  // ─── State ──────────────────────────────────────────────────────────
  const game = ref<Game | null>(null);
  const players = ref<Player[]>([]);
  const currentPlayer = ref<Player | null>(null);
  const grid = ref<TileGrid | null>(null);
  const units = ref<UnitInstance[]>([]);
  const buildings = ref<BuildingInstance[]>([]);
  const settlements = ref<SettlementInstance[]>([]);
  const armies = ref<Army[]>([]);
  const alliances = ref<Alliance[]>([]);
  const relations = ref<DiplomacyRelation[]>([]);
  const combatLogs = ref<CombatLog[]>([]);
  const chatMessages = ref<ChatMessage[]>([]);

  const selectedUnit = ref<UnitInstance | null>(null);
  const selectedTile = ref<Tile | null>(null);
  const validMoves = ref<Set<string>>(new Set());
  const productionPreview = ref<ProductionReport | null>(null);

  const loading = ref(false);
  const error = ref<string | null>(null);

  // Engine instances
  const unitManager = new UnitManager();
  const economyEngine = new EconomyEngine();
  const combatManager = new CombatManager();
  const turnEngine = new TurnEngine();

  // ─── Computed ───────────────────────────────────────────────────────
  const myUnits = computed(() =>
    units.value.filter(u => u.ownerId === currentPlayer.value?.id && u.isAlive)
  );
  const myBuildings = computed(() =>
    buildings.value.filter(b => b.ownerId === currentPlayer.value?.id)
  );
  const mySettlements = computed(() =>
    settlements.value.filter(s => s.ownerId === currentPlayer.value?.id)
  );
  const myArmies = computed(() =>
    armies.value.filter(a => a.ownerId === currentPlayer.value?.id)
  );

  const visibleTiles = computed(() => {
    if (!grid.value || !currentPlayer.value) return new Set<string>();
    const visible = new Set<string>();

    for (const unit of myUnits.value) {
      const uType = UNIT_TYPES[unit.typeId];
      if (!uType) continue;
      const tilesInRange = grid.value.getTilesInRange(unit.x, unit.y, uType.stats.sight);
      for (const t of tilesInRange) {
        visible.add(`${t.x},${t.y}`);
      }
    }
    // Also add owned tiles
    if (grid.value) {
      for (const tile of grid.value.getPlayerTiles(currentPlayer.value.id)) {
        visible.add(`${tile.x},${tile.y}`);
      }
    }
    return visible;
  });

  const allPlayersReady = computed(() =>
    players.value.every(p => p.turnPlayed)
  );

  // ─── Actions ────────────────────────────────────────────────────────

  async function loadGameState(gameId: string, playerId: string): Promise<void> {
    loading.value = true;
    try {
      game.value = await db.getGame(gameId);
      if (!game.value) throw new Error('Game not found');

      players.value = await db.getPlayers(gameId);
      currentPlayer.value = players.value.find(p => p.id === playerId) || null;

      // Load map
      const mapData = await db.getMap(game.value.mapId);
      if (mapData) {
        const chunks = await db.getAllMapChunks(game.value.mapId);
        grid.value = TileGrid.fromChunks(chunks, mapData.width, mapData.height);
      }

      // Load game objects
      units.value = await db.getUnits(gameId);
      buildings.value = await db.getBuildings(gameId);
      settlements.value = await db.getSettlements(gameId);

      if (currentPlayer.value) {
        armies.value = await db.getArmies(gameId, currentPlayer.value.id);
      }

      alliances.value = await db.getAlliances(gameId);
      combatLogs.value = await db.getCombatLogs(gameId, game.value.currentTurn);
      chatMessages.value = await db.getChatMessages(gameId);

      // Build diplomacy relations
      buildRelations();
    } catch (e: any) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  }

  function buildRelations(): void {
    relations.value = [];
    // Default: all neutral
    for (let i = 0; i < players.value.length; i++) {
      for (let j = i + 1; j < players.value.length; j++) {
        const a = players.value[i];
        const b = players.value[j];

        // Check if in same alliance
        const sameAlliance = alliances.value.some(al =>
          al.memberIds.includes(a.id) && al.memberIds.includes(b.id)
        );

        relations.value.push({
          playerA: a.id,
          playerB: b.id,
          status: sameAlliance ? DiplomacyStatus.Allied : DiplomacyStatus.Neutral,
        });
      }
    }
  }

  // ─── Unit Selection & Movement ──────────────────────────────────────

  function selectUnit(unit: UnitInstance): void {
    selectedUnit.value = unit;
    selectedTile.value = grid.value?.getTile(unit.x, unit.y) || null;

    if (grid.value && unit.ownerId === currentPlayer.value?.id && !unit.hasMoved) {
      const moves = unitManager.getValidMoves(unit, grid.value, units.value, relations.value);
      validMoves.value = new Set(moves.keys());
    } else {
      validMoves.value = new Set();
    }
  }

  function selectTile(x: number, y: number): void {
    selectedTile.value = grid.value?.getTile(x, y) || null;

    // If we have a selected unit and click on a valid move tile, move
    if (selectedUnit.value && validMoves.value.has(`${x},${y}`)) {
      moveSelectedUnit(x, y);
      return;
    }

    // Otherwise check if there's a unit on this tile to select
    const unitOnTile = units.value.find(u =>
      u.isAlive && u.x === x && u.y === y && u.ownerId === currentPlayer.value?.id
    );
    if (unitOnTile) {
      selectUnit(unitOnTile);
    } else {
      selectedUnit.value = null;
      validMoves.value = new Set();
    }
  }

  async function moveSelectedUnit(targetX: number, targetY: number): Promise<void> {
    if (!selectedUnit.value || !game.value) return;

    unitManager.moveUnit(selectedUnit.value, targetX, targetY);
    await db.updateUnit(game.value.id, selectedUnit.value.id, {
      x: targetX,
      y: targetY,
      hasMoved: true,
    });

    // Save action
    await db.saveTurnAction(game.value.id, {
      id: uuid(),
      playerId: currentPlayer.value!.id,
      type: ActionType.Move,
      data: {
        unitId: selectedUnit.value.id,
        targetX,
        targetY,
      },
      turn: game.value.currentTurn,
      timestamp: Date.now(),
    });

    // Clear selection
    selectedUnit.value = null;
    validMoves.value = new Set();
  }

  // ─── Recruitment ────────────────────────────────────────────────────

  async function recruitUnit(unitTypeId: string, x: number, y: number): Promise<boolean> {
    if (!game.value || !currentPlayer.value) return false;

    const check = unitManager.canRecruit(
      unitTypeId, currentPlayer.value.id, x, y,
      currentPlayer.value.resources, buildings.value,
    );

    if (!check.canRecruit) {
      error.value = check.reason || 'Impossible de recruter';
      return false;
    }

    const uType = UNIT_TYPES[unitTypeId];
    if (!uType) return false;

    // Deduct resources
    // (In full implementation, subtractResources would be used)

    const unit = unitManager.createUnit(unitTypeId, currentPlayer.value.id, x, y, game.value.currentTurn);
    units.value.push(unit);
    await db.saveUnit(game.value.id, unit);

    return true;
  }

  // ─── End Turn ───────────────────────────────────────────────────────

  async function endTurn(): Promise<void> {
    if (!game.value || !currentPlayer.value) return;

    currentPlayer.value.turnPlayed = true;
    await db.updatePlayer(game.value.id, currentPlayer.value.id, { turnPlayed: true });

    // Check if all players are ready (rapid mode)
    const updatedPlayers = await db.getPlayers(game.value.id);
    const allReady = updatedPlayers.every(p => p.turnPlayed);

    if (allReady) {
      await resolveTurn();
    }
  }

  async function resolveTurn(): Promise<void> {
    if (!game.value || !grid.value) return;

    const actions = await db.getTurnActions(game.value.id, game.value.currentTurn);

    const result = turnEngine.resolveTurn(
      game.value,
      players.value,
      units.value,
      buildings.value,
      settlements.value,
      armies.value,
      actions,
      grid.value,
      relations.value,
    );

    // Save results
    for (const log of result.combatLogs) {
      await db.saveCombatLog(game.value.id, log);
    }

    for (const unit of result.newUnits) {
      await db.saveUnit(game.value.id, unit);
    }

    // Update game turn
    game.value.currentTurn++;
    await db.updateGame(game.value.id, { currentTurn: game.value.currentTurn });

    // Reload state
    await loadGameState(game.value.id, currentPlayer.value!.id);
  }

  // ─── Economy Preview ───────────────────────────────────────────────

  function simulateProduction(): ProductionReport | null {
    if (!game.value || !currentPlayer.value || !grid.value) return null;

    const report = economyEngine.simulate(
      currentPlayer.value,
      myUnits.value,
      myBuildings.value,
      mySettlements.value,
      grid.value.getPlayerTiles(currentPlayer.value.id),
      grid.value,
      game.value.currentTurn,
    );

    productionPreview.value = report;
    return report;
  }

  // ─── Chat ───────────────────────────────────────────────────────────

  async function sendMessage(content: string): Promise<void> {
    if (!game.value || !currentPlayer.value) return;

    const msg: ChatMessage = {
      id: uuid(),
      gameId: game.value.id,
      senderId: currentPlayer.value.id,
      senderName: currentPlayer.value.name,
      content,
      timestamp: Date.now(),
    };

    await db.sendChatMessage(game.value.id, msg);
    chatMessages.value.push(msg);
  }

  async function refreshChat(): Promise<void> {
    if (!game.value) return;
    chatMessages.value = await db.getChatMessages(game.value.id);
  }

  // ─── Polling (refresh game state periodically) ──────────────────────

  let pollInterval: ReturnType<typeof setInterval> | null = null;

  function startPolling(intervalMs = 5000): void {
    stopPolling();
    pollInterval = setInterval(async () => {
      if (game.value && currentPlayer.value) {
        // Refresh players to check turn status
        players.value = await db.getPlayers(game.value.id);
        // Refresh chat
        await refreshChat();
        // Refresh game state
        const updatedGame = await db.getGame(game.value.id);
        if (updatedGame && updatedGame.currentTurn !== game.value.currentTurn) {
          await loadGameState(game.value.id, currentPlayer.value.id);
        }
      }
    }, intervalMs);
  }

  function stopPolling(): void {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  return {
    // State
    game,
    players,
    currentPlayer,
    grid,
    units,
    buildings,
    settlements,
    armies,
    alliances,
    relations,
    combatLogs,
    chatMessages,
    selectedUnit,
    selectedTile,
    validMoves,
    productionPreview,
    loading,
    error,

    // Computed
    myUnits,
    myBuildings,
    mySettlements,
    myArmies,
    visibleTiles,
    allPlayersReady,

    // Actions
    loadGameState,
    selectUnit,
    selectTile,
    moveSelectedUnit,
    recruitUnit,
    endTurn,
    simulateProduction,
    sendMessage,
    refreshChat,
    startPolling,
    stopPolling,
  };
});
