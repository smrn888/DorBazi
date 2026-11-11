// games/esm-famil/index.js
// Client protocol: socket.emit('msg', {type, ...}) and socket.on('msg', ...) with the same payloads as before.
// Heartbeat is handled by Socket.io, so the custom ws ping loop is removed.

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
    roundHistory: [],
  };
  return code;
}

function broadcast(room, msg, exceptId=null) {
  for (const [id, p] of Object.entries(room.players)) {
    if (id === exceptId) continue;
    if (p.socket && p.socket.connected) p.socket.emit('msg', msg);
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
    roundHistory: room.roundHistory,
    players: Object.values(room.players).map(p => ({
      id: p.id, name: p.name, ready: p.ready,
      totalScore: p.totalScore, roundScore: p.roundScore,
      scoringSubmitted: p.scoringSubmitted,
      answers: (room.phase==='scoring'||room.phase==='leaderboard'||room.phase==='waiting_confirm') ? p.answers : undefined,
      scoring: (room.phase==='leaderboard'||room.phase==='waiting_confirm') ? p.scoring : undefined,
    })),
  };
}

const ALL_CATS = [
  // ── کلاسیک ──
  'اسم دختر','اسم پسر','کشور','شهر ایران','شهر جهان','حیوان','حیوان دریایی',
  'میوه','سبزی','رنگ','غذای ایرانی','غذای خارجی','غذای فست فود',
  'وسیله نقلیه','لباس','ورزش','اسم گل','نوشیدنی','شیرینی','آلت موسیقی',
  'اسم درخت','برند معروف','شغل','رشته دانشگاهی','اسم فیلم ایرانی',
  'اسم سریال خارجی','اسم بازیکن فوتبال','اسم خواننده','رود یا دریا',
  'کوه معروف','غذای دریایی','ادویه یا چاشنی','دسر یا بستنی',
  // ── آشپزخانه و خانه ──
  'چیزی که توی آشپزخانه‌ست',
  'چیزی که توی حمام پیدا میشه',
  'چیزی که توی اتاق خواب هست',
  'چیزی که توی کیف مدرسه پیدا میشه',
  'چیزی که توی یخچال هست',
  'چیزی که روی میز اداری پیدا میشه',
  // ── طبیعت و فضا ──
  'چیزی که توی دریا هست',
  'چیزی که توی جنگل پیدا میشه',
  'چیزی که توی آسمون میبینی',
  'چیزی که توی پارک میبینی',
  'چیزی که توی بیابون پیدا میشه',
  // ── حس و احساس ──
  'چیزی که بوی خوبی داره',
  'چیزی که بوی بدی داره',
  'چیزی که صدای بلندی داره',
  'چیزی که لمسش خوشایندیه',
  'چیزی که آدم موقع استرس انجام میده',
  'چیزی که آدم موقع خوشحالی انجام میده',
  'چیزی که شکستنش ناراحت‌کننده‌ست',
  // ── فیزیکی ──
  'یه چیز قرمز','یه چیز آبی','یه چیز زرد',
  'یه چیز گرد','یه چیز تیز','یه چیز نرم',
  'یه چیز خیلی کوچیک','یه چیز خیلی بزرگ',
  'یه چیز چوبی','یه چیز شیشه‌ای','یه چیز فلزی',
  // ── ارزش ──
  'چیزی که خیلی گرونه','چیزی که خیلی ارزونه',
  'چیزی که همه آرزوشو دارن','چیزی که هیچکس نمیخواد',
  // ── موقعیت ──
  'چیزی که توی فرودگاه میبینی',
  'چیزی که توی بیمارستان هست',
  'چیزی که توی مدرسه پیدا میشه',
  'چیزی که توی سینما میبینی',
  'چیزی که توی بازار سنتی پیدا میشه',
  'چیزی که توی استادیوم میبینی',
  // ── فصل ──
  'چیزی که توی تابستون لازمه',
  'چیزی که توی زمستون لازمه',
  'چیزی که توی پاییز میبینی',
  'چیزی که توی بهار حس میکنی',
  // ── روزمره ──
  'چیزی که آدم توی جیبش میذاره',
  'چیزی که موقع قطع برق لازمه',
  'چیزی که آدم گم میکنه',
  'چیزی که آدم همیشه فراموش میکنه',
  'چیزی که آدم موقع بیماری لازم داره',
  'چیزی که آدم قبل خواب انجام میده',
  'چیزی که آدم اول صبح انجام میده',
  'چیزی که آدم موقع بارون دوست داره',
  // ── خلاقانه ──
  'یه شغل بامزه','یه شغل خطرناک','یه شغل قدیمی',
  'چیزی که سریع خراب میشه',
  'چیزی که با آب خراب میشه',
  'چیزی که آدم بهش معتاد میشه',
  'چیزی که آدم بعد از ۱۰ سال پشیمون میشه',
  'چیزی که توی موزه میبینی',
  'چیزی که توی اردوی مدرسه لازمه',
  'چیزی که آدم روز تولدش دوست داره',
  'چیزی که توی سفر ضروریه',
  'چیزی که آدم از همسایه قرض میگیره',
  'چیزی که بچه‌ها دوست دارن ولی بزرگا نه',
  'چیزی که بزرگا دوست دارن ولی بچه‌ها نه',
  'چیزی که آدم آرزو داره اختراع بشه',
  'چیزی که از صد سال پیش مونده',
];
const LETTERS = ['الف','ب','پ','ت','ج','چ','د','ر','ز','س','ش','ف','ک','گ','ل','م','ن','و','ه','ی'];
function shuffle(a) { return [...a].sort(() => Math.random()-0.5); }
function pickLetter() { return LETTERS[Math.floor(Math.random()*LETTERS.length)]; }
function pickCats()   { return shuffle(ALL_CATS).slice(0, 8); }

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

module.exports = {
  meta: {
    id: 'esm-famil',
    title: 'اسم‌فامیل',
    description: 'مسابقه سریع کلمات و اطلاعات عمومی',
    icon: '📝',
    minPlayers: 2
  },
  // accepts either `nsp` or `{ nsp }` (compatible with the registry)
  init: (arg) => {
    const nsp = arg && arg.nsp ? arg.nsp : arg;

    nsp.on('connection', (socket) => {
      const clientId = socket.id;
      let currentRoom = null;
      const err = (m) => socket.emit('msg', { type: 'error', msg: m });

      socket.on('msg', (msg) => {
        if (!msg || typeof msg !== 'object') return;

        if (msg.type === 'create_room') {
          const code = createRoom(clientId, msg.name, msg.password);
          currentRoom = rooms[code];
          currentRoom.players[clientId] = {
            id: clientId, name: msg.name, socket,
            ready: false, answers: {}, scoring: {}, roundScore: 0, totalScore: 0, scoringSubmitted: false,
          };
          socket.emit('msg', { type: 'joined', id: clientId, code, isHost: true });
          broadcastAll(currentRoom, roomSnapshot(currentRoom));
          return;
        }

        if (msg.type === 'join_room') {
          const room = rooms[msg.code];
          if (!room) { err('اتاق پیدا نشد'); return; }
          if (room.phase !== 'lobby') { err('بازی شروع شده'); return; }
          if (room.password && room.password !== msg.password) { err('رمز اشتباهه! 🔒'); return; }
          currentRoom = room;
          room.players[clientId] = {
            id: clientId, name: msg.name, socket,
            ready: false, answers: {}, scoring: {}, roundScore: 0, totalScore: 0, scoringSubmitted: false,
          };
          socket.emit('msg', { type: 'joined', id: clientId, code: msg.code, isHost: false });
          broadcastAll(room, { type: 'notify', text: `${msg.name} وارد شد 👋` });
          broadcastAll(room, roomSnapshot(room));
          return;
        }

        if (msg.type === 'ping') { socket.emit('msg', { type: 'pong' }); return; }

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
            err('همه آماده نشدن'); return;
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
          const cats = room.cats;
          const myAnswers = room.players[clientId].answers;
          const filledAll = cats.every((_, i) => (myAnswers[i] || '').trim().length > 0);
          if (!filledAll) {
            err('همه فیلدها رو پر کن قبل از تموم کردن!');
            return;
          }
          endPlaying(room, clientId, false); return;
        }

        if (msg.type === 'submit_scoring') {
          if (room.phase !== 'scoring') return;
          room.players[clientId].scoring = msg.scoring || {};
          room.players[clientId].scoringSubmitted = true;

          let sc = 0;
          for (const [i, key] of Object.entries(msg.scoring || {})) {
            const ans = (room.players[clientId].answers || {})[i];
            if (!ans) continue;
            if (key==='correct') sc+=10;
            else if (key==='dup') sc+=5;
          }
          room.players[clientId].roundScore = sc;
          room.players[clientId].totalScore += sc;

          broadcastAll(room, roomSnapshot(room));

          const allSubmitted = Object.values(room.players).every(p => p.scoringSubmitted);
          if (allSubmitted) {
            room.phase = 'waiting_confirm';
            broadcastAll(room, roomSnapshot(room));
          }
          return;
        }

        if (msg.type === 'confirm_leaderboard' && clientId === room.hostId) {
          if (room.phase !== 'waiting_confirm') return;
          room.roundHistory.push({
            round: room.round,
            letter: room.letter,
            cats: room.cats,
            scores: Object.values(room.players).map(p => ({
              id: p.id, name: p.name, roundScore: p.roundScore, totalScore: p.totalScore
            }))
          });
          room.phase = 'leaderboard';
          broadcastAll(room, roomSnapshot(room));
          return;
        }

        if (msg.type === 'next_round' && clientId === room.hostId) {
          Object.values(room.players).forEach(p => { p.ready = false; });
          room.phase = 'lobby';
          broadcastAll(room, roomSnapshot(room)); return;
        }
      });

      socket.on('disconnect', () => {
        if (!currentRoom) return;
        const room = currentRoom;
        const playerName = room.players[clientId]?.name;
        delete room.players[clientId];
        if (Object.keys(room.players).length === 0) {
          if (room._timerInterval) clearInterval(room._timerInterval);
          delete rooms[room.code]; return;
        }
        if (room.hostId === clientId) {
          room.hostId = Object.keys(room.players)[0];
          broadcastAll(room, { type: 'notify', text: `${room.players[room.hostId].name} هاست جدیده 👑` });
        }
        if (playerName) broadcastAll(room, { type: 'notify', text: `${playerName} از بازی خارج شد` });

        if (room.phase === 'scoring') {
          const allSubmitted = Object.values(room.players).every(p => p.scoringSubmitted);
          if (allSubmitted && Object.keys(room.players).length > 0) {
            room.phase = 'waiting_confirm';
          }
        }
        broadcastAll(room, roomSnapshot(room));
      });
    });
  }
};