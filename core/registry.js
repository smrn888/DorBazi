const fs = require('fs');
const path = require('path');

function loadGames(gamesDir) {
  const games = [];

  for (const d of fs.readdirSync(gamesDir, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;

    const dir = path.join(gamesDir, d.name);
    if (!fs.existsSync(path.join(dir, 'index.js'))) {
      console.warn(`[registry] skip "${d.name}" (no index.js)`);
      continue;
    }

    const mod = require(dir);
    if (!mod.meta?.id || typeof mod.init !== 'function') {
      throw new Error(`Game "${d.name}" must export { meta, init }`);
    }

    games.push({ meta: mod.meta, module: mod, publicDir: path.join(dir, 'public') });
  }

  return games;
}

module.exports = { loadGames };