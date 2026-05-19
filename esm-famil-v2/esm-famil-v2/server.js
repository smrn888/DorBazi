#!/usr/bin/env node
const http = require('http');
const fs   = require('fs');
const path = require('path');
const PORT = process.env.PORT || 3000;

let WebSocket, WebSocketServer;
try {
  ({ WebSocket, WebSocketServer } = require('ws'));
} catch(e) {
  console.error('❌  npm install ws'); process.exit(1);
}

let rooms = {};

function makeRoomCode() { return Math.random().toString(36).slice(2,6).toUpperCase(); }

function createRoom(hostId, hostName, password) {
  const code = makeRoomCode();
  rooms[code] = {
    code, hostId,
    password: password || '',
    phase: 'lobby',
    players: {},
    letter: '', cats: [], round: 0, finishedBy: null,
    settings: { timerOn: true, timerSec: 90 },
    _timerInterval: null, _timerLeft: 0,
  };
  return code;
}

function broadcast(room, msg, exceptId=null) {
  const str = JSON.stringify(msg);
  for (const [id, p] of Object.entries(room.players)) {
    if (id === exceptId) continue;
    if (p.ws && p.ws.readyState === WebSocket.OPEN) p.ws.send(str);
  }
}
function broadcastAll(room, msg) { broadcast(room, msg); }

function roomSnapshot(room) {
  return {
    type: 'room_state',
    code: room.code, phase: room.phase, hostId: room.hostId,
    hasPassword: !!room.password,
    letter: room.letter, cats: room.cats, round: room.round,
    finishedBy: room.finishedBy, settings: room.settings,
    players: Object.values(room.players).map(p => ({
      id: p.id, name: p.name, ready: p.ready,
      totalScore: p.totalScore, roundScore: p.roundScore,
      scoringSubmitted: p.scoringSubmitted,
      answers: (room.phase==='scoring'||room.phase==='leaderboard') ? p.answers : undefined,
      scoring: room.phase==='leaderboard' ? p.scoring : undefined,
    })),
  };
}

const ALL_CATS = [
  'اسم دختر','اسم پسر','کشور','شهر ایران','حیوان','میوه','سبزی','رنگ',
  'غذای ایرانی','وسیله نقلیه','لباس','ورزش','اسم گل','نوشیدنی','شیرینی',
  'آلت موسیقی','چیزی که توی آشپزخانه‌ست','چیزی که توی حمام پیدا میشه',
  'چیزی که آدم موقع استرس انجام میده','چیزی که توی پارک میبینی',
  'چیزی که شکستنش ناراحت‌کننده‌ست','چیزی که آدم توی جیبش میذاره',
  'چیزی که موقع قطع برق لازمه','چیزی که صدای بلندی داره',
  'چیزی که توی تابستون لازمه','یه چیز قرمز','یه چیز گرد',
  'چیزی که توی دریا هست','چیزی که بوی خوبی داره','چیزی که گرونه',
  'چیزی که ارزونه','یه شغل بامزه','چیزی که آدم گم میکنه',
  'چیزی که توی زمستون لازمه','یه چیز شیرین','یه چیز ترش',
  'چیزی که توی فرودگاه میبینی','اسم درخت','غذای فست فود',
];
const LETTERS = ['الف','ب','پ','ت','ج','چ','د','ر','ز','س','ش','ف','ک','گ','ل','م','ن','و','ه','ی'];
function shuffle(a) { return [...a].sort(() => Math.random()-0.5); }
function pickLetter() { return LETTERS[Math.floor(Math.random()*LETTERS.length)]; }
function pickCats()   { return shuffle(ALL_CATS).slice(0, 8); }

const server = http.createServer((req, res) => {
  const filePath = path.join(__dirname, 'client.html');
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  const clientId = Math.random().toString(36).slice(2,10);
  let currentRoom = null;

  ws.on('message', (raw) => {
    let msg; try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'create_room') {
      const code = createRoom(clientId, msg.name, msg.password);
      currentRoom = rooms[code];
      currentRoom.players[clientId] = {
        id: clientId, name: msg.name, ws,
        ready: false, answers: {}, scoring: {}, roundScore: 0, totalScore: 0, scoringSubmitted: false,
      };
      ws.send(JSON.stringify({ type: 'joined', id: clientId, code, isHost: true }));
      broadcastAll(currentRoom, roomSnapshot(currentRoom));
      return;
    }

    if (msg.type === 'join_room') {
      const room = rooms[msg.code];
      if (!room) { ws.send(JSON.stringify({ type: 'error', msg: 'اتاق پیدا نشد' })); return; }
      if (room.phase !== 'lobby') { ws.send(JSON.stringify({ type: 'error', msg: 'بازی شروع شده' })); return; }
      if (room.password && room.password !== msg.password) {
        ws.send(JSON.stringify({ type: 'error', msg: 'رمز اشتباهه! 🔒' })); return;
      }
      currentRoom = room;
      room.players[clientId] = {
        id: clientId, name: msg.name, ws,
        ready: false, answers: {}, scoring: {}, roundScore: 0, totalScore: 0, scoringSubmitted: false,
      };
      ws.send(JSON.stringify({ type: 'joined', id: clientId, code: msg.code, isHost: false }));
      broadcastAll(room, { type: 'notify', text: `${msg.name} وارد شد 👋` });
      broadcastAll(room, roomSnapshot(room));
      return;
    }

    if (!currentRoom) return;
    const room = currentRoom;

    if (msg.type === 'update_settings' && clientId === room.hostId) {
      room.settings = { ...room.settings, ...msg.settings };
      broadcastAll(room, roomSnapshot(room)); return;
    }

    if (msg.type === 'set_ready') {
      if (room.phase !== 'lobby') return;
      room.players[clientId].ready = msg.ready;
      broadcastAll(room, roomSnapshot(room)); return;
    }

    if (msg.type === 'start_game' && clientId === room.hostId) {
      if (room.phase !== 'lobby') return;
      const allReady = Object.values(room.players).every(p => p.ready);
      if (!allReady && Object.keys(room.players).length > 1) {
        ws.send(JSON.stringify({ type: 'error', msg: 'همه آماده نشدن' })); return;
      }
      room.round++;
      room.letter = pickLetter();
      room.cats   = pickCats();
      room.finishedBy = null;
      Object.values(room.players).forEach(p => {
        p.answers={}; p.scoring={}; p.roundScore=0; p.ready=false; p.scoringSubmitted=false;
      });
      room.phase = 'playing';
      if (room.settings.timerOn) {
        room._timerLeft = room.settings.timerSec;
        room._timerInterval = setInterval(() => {
          room._timerLeft--;
          broadcastAll(room, { type: 'timer_tick', timeLeft: room._timerLeft });
          if (room._timerLeft <= 0) {
            clearInterval(room._timerInterval);
            endPlaying(room, room.hostId, true);
          }
        }, 1000);
      }
      broadcastAll(room, roomSnapshot(room)); return;
    }

    if (msg.type === 'submit_answers') {
      if (room.phase !== 'playing') return;
      room.players[clientId].answers = msg.answers || {}; return;
    }

    if (msg.type === 'finish_round') {
      if (room.phase !== 'playing') return;
      room.players[clientId].answers = msg.answers || {};
      endPlaying(room, clientId, false); return;
    }

    if (msg.type === 'submit_scoring') {
      if (room.phase !== 'scoring') return;
      room.players[clientId].scoring = msg.scoring || {};
      room.players[clientId].scoringSubmitted = true;
      let sc = 0;
      for (const key of Object.values(msg.scoring)) {
        if (key==='correct') sc+=10; else if (key==='dup') sc+=5;
      }
      room.players[clientId].roundScore = sc;
      room.players[clientId].totalScore += sc;
      broadcastAll(room, roomSnapshot(room)); return;
    }

    if (msg.type === 'show_leaderboard' && clientId === room.hostId) {
      room.phase = 'leaderboard';
      broadcastAll(room, roomSnapshot(room)); return;
    }

    if (msg.type === 'next_round' && clientId === room.hostId) {
      Object.values(room.players).forEach(p => { p.ready = false; });
      room.phase = 'lobby';
      broadcastAll(room, roomSnapshot(room)); return;
    }
  });

  ws.on('close', () => {
    if (!currentRoom) return;
    const room = currentRoom;
    const playerName = room.players[clientId]?.name;
    delete room.players[clientId];
    if (Object.keys(room.players).length === 0) {
      if (room._timerInterval) clearInterval(room._timerInterval);
      delete rooms[room.code]; return;
    }
    if (room.hostId === clientId) room.hostId = Object.keys(room.players)[0];
    if (playerName) broadcastAll(room, { type: 'notify', text: `${playerName} از بازی خارج شد` });
    broadcastAll(room, roomSnapshot(room));
  });
});

function endPlaying(room, byId, isTimer) {
  if (room._timerInterval) { clearInterval(room._timerInterval); room._timerInterval = null; }
  room.finishedBy = byId;
  room.phase = 'scoring';
  broadcastAll(room, {
    ...roomSnapshot(room),
    finishedByName: room.players[byId]?.name || '؟',
    isTimer,
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🎯  اسم فامیل روی پورت ${PORT} شروع به کار کرد`);
});
