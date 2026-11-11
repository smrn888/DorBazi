const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { loadGames } = require('./core/registry');

const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  pingInterval: 10000,
  pingTimeout: 20000,
});

app.disable('x-powered-by');
app.get('/healthz', (_req, res) => res.send('ok')); // set as Render health check path

// ---- Discover and mount games ----
const games = loadGames(path.join(__dirname, 'games'));

app.get('/api/games', (_req, res) => {
  res.json(
    games.map(({ meta }) => ({
      id: meta.id,
      title: meta.title,
      description: meta.description,
      icon: meta.icon || '🎮',
      minPlayers: meta.minPlayers || 1,
      path: `/${meta.id}/`,
    }))
  );
});

for (const game of games) {
  const base = `/${game.meta.id}`;

  // 1) Static client
  app.use(base, express.static(game.publicDir));

  // 2) Namespace
  const nsp = io.of(base);

  // Shared: clock sync so clients can compute offset for countdowns
  nsp.on('connection', (socket) => {
    socket.on('time:sync', (ack) => typeof ack === 'function' && ack(Date.now()));
  });

  // 3) Game-specific handlers
  game.module.init({ io, nsp, meta: game.meta });

  console.log(`[game] mounted ${game.meta.id} at ${base}`);
}

// ---- Lobby ----
app.use(express.static(path.join(__dirname, 'public')));

server.listen(PORT, () => console.log(`DorBazi listening on :${PORT}`));