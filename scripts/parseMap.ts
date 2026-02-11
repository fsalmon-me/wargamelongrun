// ─── Map Parser: Extract terrain data from Militaire.html & Legende.html ───
// This is a one-shot script to convert the existing Google Sheets HTML
// into JSON map data that can be imported into Firestore.
//
// Usage: npx tsx scripts/parseMap.ts

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

interface ParsedTile {
  x: number;
  y: number;
  terrainCode: string;
  river: boolean;
  road: boolean;
  factionColor: string | null;
}

// ─── Step 1: Parse Legende.html to build URL → terrain code mapping ───────

function buildTerrainMapping(legendeHtml: string): Map<string, string> {
  const mapping = new Map<string, string>();

  // Terrain codes in order as they appear in the legend
  const terrainCodes = [
    // Row by row from the legend spreadsheet
    // Base terrains (39) × 4 variants (base, ri, ro, riro) + specials
    'farm', 'farmri', 'farmro', 'farmriro',
    'cufarm', 'cufarmri', 'cufarmro', 'cufarmriro',
    'grasspo', 'grasspori', 'grassporo', 'grassporiro',
    'grasspob', 'grasspobri', 'grasspobro', 'grasspobriro',
    'grass', 'grassri', 'grassro', 'grassriro',
    'graz', 'grazri', 'grazro', 'grazriro',
    'lifo', 'lifori', 'liforo', 'liforiro',
    'hefo', 'hefori', 'heforo', 'heforiro',
    'fohi', 'fohiri', 'fohiro', 'fohiriro',
    'fomo', 'fomori', 'fomoro', 'fomoriro',
    'evmo', 'evmori', 'evmoro', 'evmoriro',
    'heev', 'heevri', 'heevro', 'heevriro',
    'grhi', 'grhiri', 'grhiro', 'grhiriro',
    'hills', 'hillsri', 'hillsro', 'hillsriro',
    'moun', 'mounri', 'mounro', 'mounriro',
    'snomo', 'snomori', 'snomoro', 'snomoriro',
    'dvol', 'dvolri', 'dvolro', 'dvolriro',
    'vol', 'volri', 'volro', 'volriro',
    'swa', 'swari', 'swaro', 'swariro',
    'mar', 'marri', 'marro', 'marriro',
    'moss', 'mossri', 'mossro', 'mossriro',
    'snow', 'snowri', 'snowro', 'snowriro',
    'snowf', 'snowfri', 'snowfro', 'snowfriro',
    'evmoicy', 'evmoicyri', 'evmoicyro', 'evmoicyriro',
    'mounicy', 'mounicyri', 'mounicyro', 'mounicyriro',
    'defomoicy', 'defomoicyri', 'defomoicyro', 'defomoicyriro',
    'glacier', 'glacierri', 'glacierro', 'glacierriro',
    'marshicy', 'marshicyri', 'marshicyro', 'marshicyriro',
    'defo', 'defori', 'deforo', 'deforiro',
    'defoh', 'defohri', 'defohro', 'defohriro',
    'defi', 'defiri', 'defiro', 'defiriro',
    'brola', 'brolari', 'brolaro', 'brolariro',
    'rode', 'roderi', 'rodero', 'roderiro',
    'sade', 'saderi', 'sadero', 'saderiro',
    'oasis', 'oasisri', 'oasisro', 'oasisriro',
    'sadu', 'saduri', 'saduro', 'saduriro',
    'heca', 'hecari', 'hecaro', 'hecariro',
    'jungle', 'jungleri', 'junglero', 'jungleriro',
    'junhi', 'junhiri', 'junhiro', 'junhiriro',
    // Specials
    'mer', 'dsea', 'reef', 'reefb', 'lava', 'duc',
  ];

  // Extract all image URLs from the legend
  const imgRegex = /src="(https:\/\/lh3\.googleusercontent\.com\/docsubipk\/[^"]+)"/g;
  const urls: string[] = [];
  let match;
  while ((match = imgRegex.exec(legendeHtml)) !== null) {
    urls.push(match[1]);
  }

  console.log(`Found ${urls.length} image URLs in Legende.html`);
  console.log(`Expected ${terrainCodes.length} terrain codes`);

  // Map each URL (stripped of size suffix) to its terrain code
  for (let i = 0; i < Math.min(urls.length, terrainCodes.length); i++) {
    const baseUrl = stripSizeSuffix(urls[i]);
    mapping.set(baseUrl, terrainCodes[i]);
  }

  return mapping;
}

function stripSizeSuffix(url: string): string {
  // Remove =sNN-wNN-hNN suffix
  return url.replace(/=s\d+-w\d+-h\d+$/, '');
}

// ─── Step 2: Parse Militaire.html to extract the terrain grid ─────────────

function parseMap(html: string, terrainMapping: Map<string, string>): ParsedTile[] {
  const tiles: ParsedTile[] = [];

  // CSS class → faction color mapping
  const classToFaction: Record<string, string | null> = {
    's0': null, 's1': null, 's2': null, 's5': null, 's7': null, 's11': null,
    's3': '#00ff00', 's9': '#00ff00', 's12': '#00ff00', 's14': '#00ff00',
    's6': '#ff0000', 's10': '#ff0000',
    's4': '#0000ff', 's13': '#0000ff',
    's8': '#ff00ff',
    's15': '#ffff00',
  };

  // Find all cells with images
  // Pattern: <td class="sN" ...><div ...><img src="URL" ...></div></td>
  const cellRegex = /<td[^>]*class="(s\d+)"[^>]*(?:rowspan="2")?[^>]*>\s*<div[^>]*>\s*<img[^>]*src="([^"]+)"[^>]*>/g;

  let cellMatch;
  let currentRow = -1;
  let currentCol = 0;
  let rowTracker = 0;

  // Different approach: scan through all <tr> and track position
  // Split by rows 
  const trRegex = /<tr[^>]*>(.*?)<\/tr>/gs;
  let trMatch;
  let htmlRowIndex = 0;
  let gameRow = 0;
  const rowsData: Array<{ gameRow: number; cells: ParsedTile[] }> = [];

  // We need a simpler approach: use regex to find all image cells
  // and track their position based on td index within each tr
  
  // Actually, let's use a more robust approach:
  // 1. Find all <td> with rowspan="2" that contain images
  // 2. Track their sequential position to determine grid coordinates

  // First, find game row markers (column A contains row numbers)
  // Pattern: >N< where N is 1-30
  const rowMarkerRegex = /class="(s\d+)"[^>]*>(\d+)</g;
  const gameRows: number[] = [];
  let rmMatch;
  while ((rmMatch = rowMarkerRegex.exec(html)) !== null) {
    const num = parseInt(rmMatch[2]);
    if (num >= 1 && num <= 45) {
      gameRows.push(num);
    }
  }
  console.log(`Found game rows: ${gameRows.length} (${gameRows[0]} to ${gameRows[gameRows.length - 1]})`);

  // Now extract all image cells in sequence
  const imgCellRegex = /<td\s+class="(s\d+)"[^>]*rowspan="2"[^>]*>\s*<div[^>]*>\s*<img[^>]*src="([^"]+)"[^>]*>/g;

  const allImageCells: Array<{ cssClass: string; url: string }> = [];
  let icMatch;
  while ((icMatch = imgCellRegex.exec(html)) !== null) {
    allImageCells.push({
      cssClass: icMatch[1],
      url: icMatch[2],
    });
  }

  console.log(`Found ${allImageCells.length} image cells total`);

  // Now we need to figure out the grid layout
  // Based on the research, the grid has variable cells per row.
  // Let's process the HTML more carefully by splitting on table rows.

  // Simple approach: process the HTML sequentially
  // Each rowspan="2" image cell appears in the first <tr> of a pair
  // Count cells between row breaks to determine column positions

  // Extract the table content
  const tableMatch = html.match(/<table[^>]*class="waffle[^"]*"[^>]*>([\s\S]*?)<\/table>/);
  if (!tableMatch) {
    console.error('Could not find waffle table');
    return tiles;
  }

  // Split by <tr to get individual rows
  const tableContent = tableMatch[1];
  const trParts = tableContent.split(/<tr[^>]*>/);

  let imgIndex = 0;
  gameRow = -1;
  let isOddTr = true; // alternating TR pairs for rowspan=2

  for (const trContent of trParts) {
    if (!trContent.trim()) continue;

    // Check if this TR has a game row number
    const rowNumMatch = trContent.match(/<td[^>]*>(\d+)<\/td>/);
    if (rowNumMatch) {
      const num = parseInt(rowNumMatch[1]);
      if (num >= 1 && num <= 50) {
        gameRow = num;
        currentCol = 0;
      }
    }

    // Count image cells in this TR
    const imgInTr = (trContent.match(/<img[^>]*src="https:\/\/lh3\.googleusercontent\.com\/docsubipk/g) || []).length;

    if (imgInTr > 0 && gameRow >= 1) {
      // Extract each image cell's data
      const cellsInRow: Array<{ cssClass: string; url: string }> = [];
      const localCellRegex = /class="(s\d+)"[^>]*(?:rowspan="2")?[^>]*>\s*<div[^>]*>\s*<img[^>]*src="(https:\/\/lh3\.googleusercontent\.com\/docsubipk\/[^"]+)"/g;
      let localMatch;
      while ((localMatch = localCellRegex.exec(trContent)) !== null) {
        cellsInRow.push({
          cssClass: localMatch[1],
          url: localMatch[2],
        });
      }

      for (let col = 0; col < cellsInRow.length; col++) {
        const cell = cellsInRow[col];
        const baseUrl = stripSizeSuffix(cell.url);
        const terrainCode = terrainMapping.get(baseUrl) || 'unknown';

        if (terrainCode === 'unknown') {
          console.warn(`Unknown terrain URL at row ${gameRow}, col ${col}: ${baseUrl.slice(-20)}`);
        }

        // Parse terrain code for river/road modifiers
        let baseTerrain = terrainCode;
        let river = false;
        let road = false;

        if (terrainCode.endsWith('riro')) {
          baseTerrain = terrainCode.slice(0, -4);
          river = true;
          road = true;
        } else if (terrainCode.endsWith('ri')) {
          baseTerrain = terrainCode.slice(0, -2);
          river = true;
        } else if (terrainCode.endsWith('ro')) {
          baseTerrain = terrainCode.slice(0, -2);
          road = true;
        }

        const factionColor = classToFaction[cell.cssClass] ?? null;

        tiles.push({
          x: col,
          y: gameRow - 1, // 0-indexed
          terrainCode: baseTerrain,
          river,
          road,
          factionColor,
        });
      }
    }
  }

  return tiles;
}

// ─── Step 3: Normalize and output ─────────────────────────────────────────

function normalizeGrid(tiles: ParsedTile[]): {
  tiles: ParsedTile[];
  width: number;
  height: number;
} {
  if (tiles.length === 0) return { tiles, width: 0, height: 0 };

  const maxX = Math.max(...tiles.map(t => t.x));
  const maxY = Math.max(...tiles.map(t => t.y));

  return {
    tiles,
    width: maxX + 1,
    height: maxY + 1,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────

function main() {
  const basePath = resolve(__dirname, '../../');

  console.log('Reading Legende.html...');
  const legendeHtml = readFileSync(resolve(basePath, 'Legende.html'), 'utf-8');
  const terrainMapping = buildTerrainMapping(legendeHtml);
  console.log(`Built terrain mapping with ${terrainMapping.size} entries`);

  console.log('\nReading Militaire.html...');
  const militaireHtml = readFileSync(resolve(basePath, 'Militaire.html'), 'utf-8');
  const tiles = parseMap(militaireHtml, terrainMapping);
  console.log(`Parsed ${tiles.length} tiles`);

  const { width, height } = normalizeGrid(tiles);
  console.log(`Map dimensions: ${width} × ${height}`);

  // Output as JSON
  const output = {
    mapId: 'midgard_default',
    name: 'Midgard',
    width,
    height,
    chunkSize: 10,
    tiles: tiles.map(t => ({
      x: t.x,
      y: t.y,
      terrain: t.terrainCode,
      river: t.river,
      road: t.road,
      ownerId: null, // Will be set when game starts
    })),
    // Also save faction-colored tiles for reference
    factionTiles: tiles
      .filter(t => t.factionColor)
      .map(t => ({ x: t.x, y: t.y, color: t.factionColor })),
  };

  const outPath = resolve(__dirname, '../data/midgard_map.json');
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nMap data written to ${outPath}`);

  // Print stats
  const terrainCounts = new Map<string, number>();
  for (const tile of tiles) {
    terrainCounts.set(tile.terrainCode, (terrainCounts.get(tile.terrainCode) || 0) + 1);
  }
  console.log('\nTerrain distribution:');
  for (const [terrain, count] of [...terrainCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${terrain}: ${count}`);
  }
}

main();
