// ─── PixiJS Map Renderer ───────────────────────────────────────────────────
// Renders the game map using PixiJS with zoom, pan, tile selection
import { Application, Container, Graphics, Text, TextStyle, FederatedPointerEvent } from 'pixi.js';
import type { Tile } from '../models/game';
import { TERRAIN_DEFS, TerrainType } from '../models/terrain';
import type { UnitInstance } from '../models/units';
import { UNIT_TYPES } from '../models/units';
import type { BuildingInstance, SettlementInstance } from '../models/buildings';
import { BUILDING_TYPES } from '../models/buildings';
import { FACTIONS } from '../models/game';
import { TileGrid } from '../engine/map/MapEngine';

export const TILE_SIZE = 48; // pixels per tile
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3.0;
const ZOOM_SPEED = 0.1;

export interface MapRendererOptions {
  width: number;
  height: number;
  onTileClick?: (x: number, y: number, tile: Tile | undefined) => void;
  onTileHover?: (x: number, y: number, tile: Tile | undefined) => void;
}

export class MapRenderer {
  private app: Application;
  private mapContainer: Container;
  private terrainLayer: Container;
  private ownershipLayer: Container;
  private buildingLayer: Container;
  private unitLayer: Container;
  private fogLayer: Container;
  private gridLayer: Container;
  private selectionLayer: Container;

  private grid: TileGrid | null = null;
  private units: UnitInstance[] = [];
  private buildings: BuildingInstance[] = [];
  private settlements: SettlementInstance[] = [];
  private visibleTiles: Set<string> = new Set();
  private selectedTile: { x: number; y: number } | null = null;
  private highlightedTiles: Set<string> = new Set();

  private isDragging = false;
  private lastDragPos = { x: 0, y: 0 };
  private options: MapRendererOptions;
  private initialized = false;

  constructor(options: MapRendererOptions) {
    this.options = options;
    this.app = new Application();
    this.mapContainer = new Container();
    this.terrainLayer = new Container();
    this.ownershipLayer = new Container();
    this.buildingLayer = new Container();
    this.unitLayer = new Container();
    this.fogLayer = new Container();
    this.gridLayer = new Container();
    this.selectionLayer = new Container();
  }

  async init(canvas: HTMLCanvasElement): Promise<void> {
    await this.app.init({
      canvas,
      width: this.options.width,
      height: this.options.height,
      backgroundColor: 0x1a1a2e,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    // Layer order
    this.mapContainer.addChild(this.terrainLayer);
    this.mapContainer.addChild(this.ownershipLayer);
    this.mapContainer.addChild(this.gridLayer);
    this.mapContainer.addChild(this.buildingLayer);
    this.mapContainer.addChild(this.unitLayer);
    this.mapContainer.addChild(this.fogLayer);
    this.mapContainer.addChild(this.selectionLayer);

    this.app.stage.addChild(this.mapContainer);

    // Setup input handlers
    this.setupInputHandlers();

    this.initialized = true;
  }

  // ─── Setup Input ────────────────────────────────────────────────────

  private setupInputHandlers(): void {
    const stage = this.app.stage;
    stage.eventMode = 'static';
    stage.hitArea = this.app.screen;

    // Pan (drag)
    stage.on('pointerdown', (e: FederatedPointerEvent) => {
      if (e.button === 0 || e.button === 2) {
        this.isDragging = true;
        this.lastDragPos = { x: e.globalX, y: e.globalY };
      }
    });

    stage.on('pointermove', (e: FederatedPointerEvent) => {
      if (this.isDragging) {
        const dx = e.globalX - this.lastDragPos.x;
        const dy = e.globalY - this.lastDragPos.y;
        this.mapContainer.x += dx;
        this.mapContainer.y += dy;
        this.lastDragPos = { x: e.globalX, y: e.globalY };
      }

      // Hover detection
      const tilePos = this.screenToTile(e.globalX, e.globalY);
      if (tilePos && this.options.onTileHover && this.grid) {
        this.options.onTileHover(tilePos.x, tilePos.y, this.grid.getTile(tilePos.x, tilePos.y));
      }
    });

    stage.on('pointerup', (e: FederatedPointerEvent) => {
      if (this.isDragging) {
        const dx = Math.abs(e.globalX - this.lastDragPos.x);
        const dy = Math.abs(e.globalY - this.lastDragPos.y);

        // If barely moved, treat as click
        if (dx < 3 && dy < 3) {
          const tilePos = this.screenToTile(e.globalX, e.globalY);
          if (tilePos && this.options.onTileClick && this.grid) {
            this.selectedTile = tilePos;
            this.options.onTileClick(tilePos.x, tilePos.y, this.grid.getTile(tilePos.x, tilePos.y));
            this.drawSelection();
          }
        }
      }
      this.isDragging = false;
    });

    // Zoom (wheel)
    this.app.canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const direction = e.deltaY < 0 ? 1 : -1;
      const factor = 1 + direction * ZOOM_SPEED;

      const newScale = this.mapContainer.scale.x * factor;
      if (newScale < MIN_ZOOM || newScale > MAX_ZOOM) return;

      // Zoom toward mouse position
      const mouseX = e.offsetX;
      const mouseY = e.offsetY;

      const worldPos = {
        x: (mouseX - this.mapContainer.x) / this.mapContainer.scale.x,
        y: (mouseY - this.mapContainer.y) / this.mapContainer.scale.y,
      };

      this.mapContainer.scale.set(newScale);

      this.mapContainer.x = mouseX - worldPos.x * newScale;
      this.mapContainer.y = mouseY - worldPos.y * newScale;
    }, { passive: false });
  }

  // ─── Coordinate conversion ──────────────────────────────────────────

  private screenToTile(screenX: number, screenY: number): { x: number; y: number } | null {
    const worldX = (screenX - this.mapContainer.x) / this.mapContainer.scale.x;
    const worldY = (screenY - this.mapContainer.y) / this.mapContainer.scale.y;

    const tileX = Math.floor(worldX / TILE_SIZE);
    const tileY = Math.floor(worldY / TILE_SIZE);

    if (this.grid && this.grid.isInBounds(tileX, tileY)) {
      return { x: tileX, y: tileY };
    }
    return null;
  }

  // ─── Render Methods ─────────────────────────────────────────────────

  setGrid(grid: TileGrid): void {
    this.grid = grid;
    this.drawTerrain();
    this.drawGrid();
    this.centerMap();
  }

  setUnits(units: UnitInstance[]): void {
    this.units = units;
    this.drawUnits();
  }

  setBuildings(buildings: BuildingInstance[], settlements: SettlementInstance[]): void {
    this.buildings = buildings;
    this.settlements = settlements;
    this.drawBuildings();
  }

  setVisibility(visibleTileKeys: Set<string>): void {
    this.visibleTiles = visibleTileKeys;
    this.drawFog();
  }

  setSelection(x: number, y: number): void {
    this.selectedTile = { x, y };
    this.drawSelection();
  }

  setHighlightedTiles(tileKeys: Set<string>): void {
    this.highlightedTiles = tileKeys;
    this.drawSelection();
  }

  clearHighlight(): void {
    this.highlightedTiles.clear();
    this.drawSelection();
  }

  // ─── Drawing ────────────────────────────────────────────────────────

  private drawTerrain(): void {
    this.terrainLayer.removeChildren();
    this.ownershipLayer.removeChildren();

    if (!this.grid) return;

    for (const tile of this.grid.getAllTiles()) {
      const terrainDef = TERRAIN_DEFS[tile.terrain];
      if (!terrainDef) continue;

      // Draw terrain square
      const g = new Graphics();
      const color = this.hexToNumber(terrainDef.color);
      g.rect(tile.x * TILE_SIZE, tile.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      g.fill({ color });

      // Draw river overlay (blue line)
      if (tile.river) {
        g.rect(tile.x * TILE_SIZE, tile.y * TILE_SIZE + TILE_SIZE * 0.4, TILE_SIZE, TILE_SIZE * 0.2);
        g.fill({ color: 0x4169E1, alpha: 0.6 });
      }

      // Draw road overlay (brown line)
      if (tile.road) {
        g.rect(tile.x * TILE_SIZE + TILE_SIZE * 0.3, tile.y * TILE_SIZE, TILE_SIZE * 0.4, TILE_SIZE);
        g.fill({ color: 0x8B7355, alpha: 0.5 });
      }

      this.terrainLayer.addChild(g);

      // Draw ownership overlay
      if (tile.ownerId) {
        const faction = FACTIONS[tile.ownerId];
        if (faction) {
          const ownerG = new Graphics();
          ownerG.rect(tile.x * TILE_SIZE, tile.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          ownerG.fill({ color: this.hexToNumber(faction.color), alpha: 0.25 });
          ownerG.stroke({ width: 1, color: this.hexToNumber(faction.color), alpha: 0.5 });
          this.ownershipLayer.addChild(ownerG);
        }
      }
    }
  }

  private drawGrid(): void {
    this.gridLayer.removeChildren();
    if (!this.grid) return;

    const g = new Graphics();
    g.stroke({ width: 0.5, color: 0x000000, alpha: 0.15 });

    for (let x = 0; x <= this.grid.width; x++) {
      g.moveTo(x * TILE_SIZE, 0);
      g.lineTo(x * TILE_SIZE, this.grid.height * TILE_SIZE);
    }
    for (let y = 0; y <= this.grid.height; y++) {
      g.moveTo(0, y * TILE_SIZE);
      g.lineTo(this.grid.width * TILE_SIZE, y * TILE_SIZE);
    }

    this.gridLayer.addChild(g);
  }

  private drawUnits(): void {
    this.unitLayer.removeChildren();

    for (const unit of this.units) {
      if (!unit.isAlive) continue;

      // Visibility check
      const key = `${unit.x},${unit.y}`;
      if (this.visibleTiles.size > 0 && !this.visibleTiles.has(key)) continue;

      const uType = UNIT_TYPES[unit.typeId];
      if (!uType) continue;

      const x = unit.x * TILE_SIZE;
      const y = unit.y * TILE_SIZE;

      // Unit background circle
      const g = new Graphics();
      const faction = FACTIONS[unit.ownerId];
      const unitColor = faction ? this.hexToNumber(faction.color) : 0xFFFFFF;

      g.circle(x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE * 0.35);
      g.fill({ color: unitColor, alpha: 0.8 });
      g.stroke({ width: 2, color: 0x000000, alpha: 0.6 });

      this.unitLayer.addChild(g);

      // Unit symbol (first letter)
      const style = new TextStyle({
        fontFamily: 'Arial',
        fontSize: 14,
        fontWeight: 'bold',
        fill: 0x000000,
      });
      const symbol = new Text({
        text: uType.name.charAt(0).toUpperCase(),
        style,
      });
      symbol.x = x + TILE_SIZE / 2 - symbol.width / 2;
      symbol.y = y + TILE_SIZE / 2 - symbol.height / 2;
      this.unitLayer.addChild(symbol);

      // HP bar
      if (unit.currentHp < uType.stats.hp) {
        const hpRatio = unit.currentHp / uType.stats.hp;
        const barWidth = TILE_SIZE * 0.7;
        const barHeight = 3;
        const barX = x + (TILE_SIZE - barWidth) / 2;
        const barY = y + TILE_SIZE - 6;

        const hpBar = new Graphics();
        // Background
        hpBar.rect(barX, barY, barWidth, barHeight);
        hpBar.fill({ color: 0x333333 });
        // HP
        hpBar.rect(barX, barY, barWidth * hpRatio, barHeight);
        hpBar.fill({ color: hpRatio > 0.5 ? 0x00FF00 : hpRatio > 0.25 ? 0xFFFF00 : 0xFF0000 });
        this.unitLayer.addChild(hpBar);
      }
    }
  }

  private drawBuildings(): void {
    this.buildingLayer.removeChildren();

    for (const settlement of this.settlements) {
      const x = settlement.x * TILE_SIZE;
      const y = settlement.y * TILE_SIZE;

      // Settlement icon (small house shape)
      const g = new Graphics();
      const tierSize = { campfire: 4, village: 6, town: 8, city: 10, capital: 12 };
      const size = (tierSize as any)[settlement.tier] || 6;

      g.rect(x + 2, y + 2, size, size);
      g.fill({ color: 0xDAA520 });
      g.stroke({ width: 1, color: 0x000000 });

      this.buildingLayer.addChild(g);

      // Settlement name
      const style = new TextStyle({
        fontFamily: 'Arial',
        fontSize: 8,
        fill: 0xFFFFFF,
        stroke: { color: 0x000000, width: 2 },
      });
      const nameText = new Text({ text: settlement.name, style });
      nameText.x = x + TILE_SIZE / 2 - nameText.width / 2;
      nameText.y = y - 10;
      this.buildingLayer.addChild(nameText);
    }

    for (const building of this.buildings) {
      if (!building.isConstructed) continue;

      const bType = BUILDING_TYPES[building.typeId];
      if (!bType) continue;

      // Skip if settlement building (rendered with settlement)
      if (building.settlementId) continue;

      const x = building.x * TILE_SIZE;
      const y = building.y * TILE_SIZE;

      // Independent building icon
      const g = new Graphics();
      g.rect(x + TILE_SIZE - 10, y + 2, 8, 8);
      g.fill({ color: 0x8B4513 });
      g.stroke({ width: 1, color: 0x000000 });

      this.buildingLayer.addChild(g);
    }
  }

  private drawFog(): void {
    this.fogLayer.removeChildren();
    if (!this.grid || this.visibleTiles.size === 0) return;

    for (const tile of this.grid.getAllTiles()) {
      const key = `${tile.x},${tile.y}`;
      if (!this.visibleTiles.has(key)) {
        const g = new Graphics();
        g.rect(tile.x * TILE_SIZE, tile.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        g.fill({ color: 0x000000, alpha: 0.6 });
        this.fogLayer.addChild(g);
      }
    }
  }

  private drawSelection(): void {
    this.selectionLayer.removeChildren();

    // Selected tile
    if (this.selectedTile) {
      const g = new Graphics();
      g.rect(
        this.selectedTile.x * TILE_SIZE,
        this.selectedTile.y * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE,
      );
      g.stroke({ width: 3, color: 0xFFFF00 });
      this.selectionLayer.addChild(g);
    }

    // Highlighted tiles (movement range, etc.)
    for (const key of this.highlightedTiles) {
      const [xStr, yStr] = key.split(',');
      const x = parseInt(xStr ?? '0');
      const y = parseInt(yStr ?? '0');

      const g = new Graphics();
      g.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      g.fill({ color: 0x00FF00, alpha: 0.2 });
      g.stroke({ width: 2, color: 0x00FF00, alpha: 0.6 });
      this.selectionLayer.addChild(g);
    }
  }

  // ─── Camera ─────────────────────────────────────────────────────────

  centerMap(): void {
    if (!this.grid) return;

    const mapWidth = this.grid.width * TILE_SIZE;
    const mapHeight = this.grid.height * TILE_SIZE;

    // Fit map to screen
    const scaleX = this.options.width / mapWidth;
    const scaleY = this.options.height / mapHeight;
    const scale = Math.min(scaleX, scaleY, 1) * 0.9; // 90% to leave margin

    this.mapContainer.scale.set(scale);
    this.mapContainer.x = (this.options.width - mapWidth * scale) / 2;
    this.mapContainer.y = (this.options.height - mapHeight * scale) / 2;
  }

  centerOnTile(x: number, y: number): void {
    const scale = this.mapContainer.scale.x;
    this.mapContainer.x = this.options.width / 2 - (x * TILE_SIZE + TILE_SIZE / 2) * scale;
    this.mapContainer.y = this.options.height / 2 - (y * TILE_SIZE + TILE_SIZE / 2) * scale;
  }

  // ─── Refresh ────────────────────────────────────────────────────────

  refresh(): void {
    this.drawTerrain();
    this.drawGrid();
    this.drawBuildings();
    this.drawUnits();
    this.drawFog();
    this.drawSelection();
  }

  resize(width: number, height: number): void {
    this.options.width = width;
    this.options.height = height;
    this.app.renderer.resize(width, height);
  }

  destroy(): void {
    this.app.destroy(true);
  }

  // ─── Helpers ────────────────────────────────────────────────────────

  private hexToNumber(hex: string): number {
    return parseInt(hex.replace('#', ''), 16);
  }
}
