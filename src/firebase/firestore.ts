// ─── Firestore Data Access Layer ───────────────────────────────────────────
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc,
  deleteDoc, query, where, writeBatch, Timestamp,
  type DocumentData, type QueryConstraint,
} from 'firebase/firestore';
import { db } from './config';
import type {
  Game, GameMap, MapChunk, Player, Alliance, Army,
  CombatLog, ChatMessage, TurnAction, Tile,
} from '../models';
import type { UnitInstance } from '../models/units';
import type { BuildingInstance, SettlementInstance } from '../models/buildings';

const CHUNK_SIZE = 10;

// ─── Maps ─────────────────────────────────────────────────────────────────

export async function saveMap(map: GameMap): Promise<void> {
  await setDoc(doc(db, 'maps', map.id), map);
}

export async function getMap(mapId: string): Promise<GameMap | null> {
  const snap = await getDoc(doc(db, 'maps', mapId));
  return snap.exists() ? (snap.data() as GameMap) : null;
}

export async function saveMapChunk(mapId: string, chunk: MapChunk): Promise<void> {
  const chunkId = `${chunk.chunkX}_${chunk.chunkY}`;
  await setDoc(doc(db, 'maps', mapId, 'chunks', chunkId), chunk as unknown as DocumentData);
}

export async function getMapChunk(mapId: string, chunkX: number, chunkY: number): Promise<MapChunk | null> {
  const chunkId = `${chunkX}_${chunkY}`;
  const snap = await getDoc(doc(db, 'maps', mapId, 'chunks', chunkId));
  return snap.exists() ? (snap.data() as unknown as MapChunk) : null;
}

export async function getAllMapChunks(mapId: string): Promise<MapChunk[]> {
  const snap = await getDocs(collection(db, 'maps', mapId, 'chunks'));
  return snap.docs.map(d => d.data() as unknown as MapChunk);
}

/** Import a full tile grid into Firestore as chunks */
export async function importMapTiles(mapId: string, tiles: Tile[], width: number, height: number): Promise<void> {
  const map: GameMap = {
    id: mapId,
    name: 'Midgard',
    width,
    height,
    chunkSize: CHUNK_SIZE,
    createdAt: Date.now(),
  };
  await saveMap(map);

  // Group tiles into chunks
  const chunks = new Map<string, Tile[]>();
  for (const tile of tiles) {
    const cx = Math.floor(tile.x / CHUNK_SIZE);
    const cy = Math.floor(tile.y / CHUNK_SIZE);
    const key = `${cx}_${cy}`;
    if (!chunks.has(key)) chunks.set(key, []);
    chunks.get(key)!.push(tile);
  }

  // Batch write chunks (Firestore batch limit = 500)
  const batch = writeBatch(db);
  let count = 0;
  for (const [key, chunkTiles] of chunks) {
    const [cxStr, cyStr] = key.split('_');
    const chunk: MapChunk = {
      chunkX: parseInt(cxStr ?? '0'),
      chunkY: parseInt(cyStr ?? '0'),
      tiles: chunkTiles,
    };
    batch.set(doc(db, 'maps', mapId, 'chunks', key), chunk as unknown as DocumentData);
    count++;
    if (count >= 490) {
      await batch.commit();
      count = 0;
    }
  }
  if (count > 0) await batch.commit();
}

// ─── Games ────────────────────────────────────────────────────────────────

export async function createGame(game: Game): Promise<void> {
  await setDoc(doc(db, 'games', game.id), game);
}

export async function getGame(gameId: string): Promise<Game | null> {
  const snap = await getDoc(doc(db, 'games', gameId));
  return snap.exists() ? (snap.data() as Game) : null;
}

export async function updateGame(gameId: string, data: Partial<Game>): Promise<void> {
  await updateDoc(doc(db, 'games', gameId), data as DocumentData);
}

export async function listGames(...constraints: QueryConstraint[]): Promise<Game[]> {
  const q = query(collection(db, 'games'), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as Game);
}

// ─── Players ──────────────────────────────────────────────────────────────

export async function savePlayer(gameId: string, player: Player): Promise<void> {
  await setDoc(doc(db, 'games', gameId, 'players', player.id), player as unknown as DocumentData);
}

export async function getPlayer(gameId: string, playerId: string): Promise<Player | null> {
  const snap = await getDoc(doc(db, 'games', gameId, 'players', playerId));
  return snap.exists() ? (snap.data() as unknown as Player) : null;
}

export async function getPlayers(gameId: string): Promise<Player[]> {
  const snap = await getDocs(collection(db, 'games', gameId, 'players'));
  return snap.docs.map(d => d.data() as unknown as Player);
}

export async function updatePlayer(gameId: string, playerId: string, data: Partial<Player>): Promise<void> {
  await updateDoc(doc(db, 'games', gameId, 'players', playerId), data as DocumentData);
}

// ─── Units ────────────────────────────────────────────────────────────────

export async function saveUnit(gameId: string, unit: UnitInstance): Promise<void> {
  await setDoc(doc(db, 'games', gameId, 'units', unit.id), unit as unknown as DocumentData);
}

export async function getUnit(gameId: string, unitId: string): Promise<UnitInstance | null> {
  const snap = await getDoc(doc(db, 'games', gameId, 'units', unitId));
  return snap.exists() ? (snap.data() as unknown as UnitInstance) : null;
}

export async function getUnits(gameId: string, ...constraints: QueryConstraint[]): Promise<UnitInstance[]> {
  const q = query(collection(db, 'games', gameId, 'units'), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as unknown as UnitInstance);
}

export async function getPlayerUnits(gameId: string, playerId: string): Promise<UnitInstance[]> {
  return getUnits(gameId, where('ownerId', '==', playerId), where('isAlive', '==', true));
}

export async function updateUnit(gameId: string, unitId: string, data: Partial<UnitInstance>): Promise<void> {
  await updateDoc(doc(db, 'games', gameId, 'units', unitId), data as DocumentData);
}

export async function deleteUnit(gameId: string, unitId: string): Promise<void> {
  await deleteDoc(doc(db, 'games', gameId, 'units', unitId));
}

// ─── Buildings ────────────────────────────────────────────────────────────

export async function saveBuilding(gameId: string, building: BuildingInstance): Promise<void> {
  await setDoc(doc(db, 'games', gameId, 'buildings', building.id), building as unknown as DocumentData);
}

export async function getBuildings(gameId: string, ...constraints: QueryConstraint[]): Promise<BuildingInstance[]> {
  const q = query(collection(db, 'games', gameId, 'buildings'), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as unknown as BuildingInstance);
}

export async function getPlayerBuildings(gameId: string, playerId: string): Promise<BuildingInstance[]> {
  return getBuildings(gameId, where('ownerId', '==', playerId));
}

// ─── Settlements ──────────────────────────────────────────────────────────

export async function saveSettlement(gameId: string, settlement: SettlementInstance): Promise<void> {
  await setDoc(doc(db, 'games', gameId, 'settlements', settlement.id), settlement as unknown as DocumentData);
}

export async function getSettlements(gameId: string, ...constraints: QueryConstraint[]): Promise<SettlementInstance[]> {
  const q = query(collection(db, 'games', gameId, 'settlements'), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as unknown as SettlementInstance);
}

export async function getPlayerSettlements(gameId: string, playerId: string): Promise<SettlementInstance[]> {
  return getSettlements(gameId, where('ownerId', '==', playerId));
}

// ─── Armies ───────────────────────────────────────────────────────────────

export async function saveArmy(gameId: string, army: Army): Promise<void> {
  await setDoc(doc(db, 'games', gameId, 'armies', army.id), army as unknown as DocumentData);
}

export async function getArmies(gameId: string, playerId: string): Promise<Army[]> {
  const q = query(collection(db, 'games', gameId, 'armies'), where('ownerId', '==', playerId));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as unknown as Army);
}

export async function deleteArmy(gameId: string, armyId: string): Promise<void> {
  await deleteDoc(doc(db, 'games', gameId, 'armies', armyId));
}

// ─── Alliances ────────────────────────────────────────────────────────────

export async function saveAlliance(gameId: string, alliance: Alliance): Promise<void> {
  await setDoc(doc(db, 'games', gameId, 'alliances', alliance.id), alliance as unknown as DocumentData);
}

export async function getAlliances(gameId: string): Promise<Alliance[]> {
  const snap = await getDocs(collection(db, 'games', gameId, 'alliances'));
  return snap.docs.map(d => d.data() as unknown as Alliance);
}

// ─── Combat Logs ──────────────────────────────────────────────────────────

export async function saveCombatLog(gameId: string, log: CombatLog): Promise<void> {
  await setDoc(doc(db, 'games', gameId, 'combatLogs', log.id), log as unknown as DocumentData);
}

export async function getCombatLogs(gameId: string, turn?: number): Promise<CombatLog[]> {
  const constraints: QueryConstraint[] = [];
  if (turn !== undefined) constraints.push(where('turn', '==', turn));
  const q = query(collection(db, 'games', gameId, 'combatLogs'), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as unknown as CombatLog);
}

// ─── Chat ─────────────────────────────────────────────────────────────────

export async function sendChatMessage(gameId: string, msg: ChatMessage): Promise<void> {
  await setDoc(doc(db, 'games', gameId, 'chat', msg.id), msg as unknown as DocumentData);
}

export async function getChatMessages(gameId: string, limit = 50): Promise<ChatMessage[]> {
  const snap = await getDocs(collection(db, 'games', gameId, 'chat'));
  const msgs = snap.docs.map(d => d.data() as unknown as ChatMessage);
  msgs.sort((a, b) => a.timestamp - b.timestamp);
  return msgs.slice(-limit);
}

// ─── Turn Actions ─────────────────────────────────────────────────────────

export async function saveTurnAction(gameId: string, action: TurnAction): Promise<void> {
  await setDoc(doc(db, 'games', gameId, 'actions', action.id), action as unknown as DocumentData);
}

export async function getTurnActions(gameId: string, turn: number): Promise<TurnAction[]> {
  const q = query(collection(db, 'games', gameId, 'actions'), where('turn', '==', turn));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as unknown as TurnAction);
}
