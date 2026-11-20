'use strict';

const QUESTIONS = require('./questions');

/* ---------------- تنظیمات ---------------- */
const VALUES = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
const ANSWER_MS = 10000;          // باید با ANSWER_MS کلاینت یکی باشد
const WRONG_PENALTY_RATIO = 0.5;  // پاسخ غلط: نصف ارزش سوال کم می‌شود (0 = بدون جریمه، 1 = کل ارزش)
const BUZZER_COUNT = 9;          // تعداد تصاویر بازر (buzzers (1..9).png)
const MIN_ANSWER_MS = 3000;       // کمترین زمان قابل تنظیم
const MAX_ANSWER_MS = 120000;     // بیشترین زمان قابل تنظیم (۰ = بدون محدودیت زمانی)
const MAX_PLAYERS = 30;
const MAX_NAME = 20;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_IDLE_MS = 30 * 60 * 1000;

const meta = {
  id: 'buzzer',
  title: 'مسابقه بازر',
  description: 'اطلاعات عمومی‌تان را به رخ هم بکشید',
  icon: '🔴',
  minPlayers: 2,
};

/* ---------------- ابزارها ---------------- */
const rooms = new Map(); // code -> room

function makeCode() {
  for (let n = 0; n < 200; n++) {
    let c = '';
    for (let i = 0; i < 4; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    if (!rooms.has(c)) return c;
  }
  throw new Error('no free room code');
}

const newId = () => Math.random().toString(36).slice(2, 10);

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cleanName(s) {
  return String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
}

function freshGame(room) {
  clearTimeout(room.timer);
  room.timer = null;
  room.started = false;      // false = در لابی (اتاق بازی)، true = مسابقه شروع شده
  room.phase = 'idle';       // idle | open | answering
  room.active = null;        // ارزش سوال فعال
  room.used = [];
  room.queue = [];
  room.tried = [];
  room.q = null;             // { text, options } برای نمایش
  room.answer = -1;          // اندیس پاسخ درست بعد از به‌هم‌ریختن گزینه‌ها
  room.fact = '';
  room.reveal = null;        // { answer, fact, by }
  room.deadline = null;
  room.openedAt = 0;
  room.over = false;
  for (const p of room.players.values()) {
    p.score = 0; p.ok = 0; p.best = null; p.rt = null;
  }
}

function pickQuestion(room, value) {
  const bank = QUESTIONS[value];
  if (!Array.isArray(bank) || !bank.length) return null;
  let used = room.seen.get(value);
  if (!used) room.seen.set(value, (used = new Set()));
  if (used.size >= bank.length) used.clear(); // همه استفاده شده‌اند؛ از نو
  let i;
  do { i = Math.floor(Math.random() * bank.length); } while (used.has(i));
  used.add(i);
  return bank[i];
}

/* ---------------- ساخت وضعیت برای کلاینت ---------------- */
function publicState(room) {
  return {
    code: room.code,
    hostOnline: room.hostSockets.size > 0,
    started: room.started,
    min: meta.minPlayers,
    phase: room.phase,
    active: room.active,
    used: room.used,
    queue: room.queue,
    tried: room.tried,
    q: room.q,
    reveal: room.reveal,
    over: room.over,
    answerMs: room.answerMs,
    dl: room.phase === 'answering' && room.deadline ? Math.max(0, room.deadline - Date.now()) : null,
    players: [...room.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      online: p.sockets.size > 0,
      bz: p.bz,
      rt: p.rt,
      best: p.best,
      ok: p.ok,
    })),
  };
}

function hostInfo(room) {
  return room.q ? { answer: room.answer, fact: room.fact } : null;
}

function init({ nsp }) {
  const broadcast = (room) => {
    room.lastSeen = Date.now();
    nsp.to(room.code).emit('state', publicState(room));
  };
  const sendHostInfo = (room) => nsp.to(`${room.code}#host`).emit('hostinfo', hostInfo(room));

  /* ----- منطق بازی ----- */
  function finishQuestion(room, by) {
    clearTimeout(room.timer);
    room.timer = null;
    room.deadline = null;
    room.reveal = { answer: room.answer, fact: room.fact, by: by || null };
    room.used.push(room.active);
    room.phase = 'idle';
    room.queue = [];
    room.tried = [];
    if (room.used.length >= VALUES.length) room.over = true;
  }

  function startAnswering(room) {
    room.phase = 'answering';
    clearTimeout(room.timer);
    room.timer = null;
    if (room.answerMs > 0) {
      room.deadline = Date.now() + room.answerMs;
      room.timer = setTimeout(() => judge(room, false), room.answerMs);
    } else {
      room.deadline = null; // بدون محدودیت زمانی؛ فقط مجری داوری می‌کند
    }
  }

  function judge(room, correct) {
    if (room.phase !== 'answering' || !room.queue.length) return;
    const id = room.queue[0];
    const p = room.players.get(id);
    clearTimeout(room.timer);
    room.timer = null;

    if (!p) { // بازیکن رفته؛ نفر بعدی
      room.queue.shift();
      if (room.queue.length) startAnswering(room); else room.phase = 'open';
      return broadcast(room);
    }

    if (correct) {
      const delta = room.active;
      p.score += delta;
      p.ok += 1;
      nsp.to(room.code).emit('judged', { id, correct: true, delta });
      finishQuestion(room, id);
      return broadcast(room);
    }

    const delta = -Math.round(room.active * WRONG_PENALTY_RATIO);
    p.score += delta;
    room.tried.push(id);
    room.queue.shift();
    nsp.to(room.code).emit('judged', { id, correct: false, delta });

    if (room.queue.length) {
      startAnswering(room);
    } else {
      room.phase = 'open';
      room.deadline = null;
      const eligible = [...room.players.values()].filter((x) => x.sockets.size > 0);
      if (eligible.length && eligible.every((x) => room.tried.includes(x.id))) {
        finishQuestion(room, null);
      }
    }
    broadcast(room);
  }

  function closeRoom(room) {
    clearTimeout(room.timer);
    nsp.to(room.code).emit('closed');
    for (const id of nsp.adapter.rooms.get(room.code) || []) {
      const s = nsp.sockets.get(id);
      if (s) { s.leave(room.code); s.leave(`${room.code}#host`); s.data = {}; }
    }
    rooms.delete(room.code);
  }

  /* ----- اتصال‌ها ----- */
  nsp.on('connection', (socket) => {
    socket.data = {};

    const ctx = () => {
      const room = rooms.get(socket.data.code);
      return room ? { room, role: socket.data.role, id: socket.data.id } : null;
    };
    const hostCtx = () => {
      const c = ctx();
      return c && c.role === 'host' ? c.room : null;
    };

    function attachHost(room) {
      room.hostSockets.add(socket.id);
      socket.data = { code: room.code, role: 'host' };
      socket.join(room.code);
      socket.join(`${room.code}#host`);
    }
    function attachPlayer(room, p) {
      p.sockets.add(socket.id);
      socket.data = { code: room.code, role: 'player', id: p.id };
      socket.join(room.code);
    }

    socket.on('host:create', (data, ack) => {
      if (typeof ack !== 'function') return;
      const token = String(data?.token || '');
      if (!token) return ack({ ok: false });
      // اگر همین مجری قبلاً اتاقی دارد همان را برگردان
      let room = [...rooms.values()].find((r) => r.hostToken === token);
      if (!room) {
        room = {
          code: makeCode(),
          hostToken: token,
          hostSockets: new Set(),
          players: new Map(),
          seen: new Map(),
          answerMs: ANSWER_MS,
          timer: null,
          lastSeen: Date.now(),
        };
        freshGame(room);
        rooms.set(room.code, room);
      }
      attachHost(room);
      ack({ ok: true, code: room.code });
      broadcast(room);
      socket.emit('hostinfo', hostInfo(room));
    });

    socket.on('player:join', (data, ack) => {
      if (typeof ack !== 'function') return;
      const token = String(data?.token || '');
      const code = String(data?.code || '').trim().toUpperCase();
      const name = cleanName(data?.name);
      const room = rooms.get(code);
      if (!token) return ack({ ok: false, error: 'خطا در ارتباط' });
      if (!name) return ack({ ok: false, error: 'نام خود را وارد کنید' });
      if (!room) return ack({ ok: false, error: 'اتاقی با این کد پیدا نشد' });

      let p = [...room.players.values()].find((x) => x.token === token);
      if (p) {
        p.name = name;
      } else {
        if (room.players.size >= MAX_PLAYERS) return ack({ ok: false, error: 'ظرفیت اتاق پر است' });
        const taken = [...room.players.values()].some((x) => x.name.toLowerCase() === name.toLowerCase());
        if (taken) return ack({ ok: false, error: 'این نام قبلاً در اتاق استفاده شده' });
        const usedBz = new Set([...room.players.values()].map((x) => x.bz));
        const free = [...Array(BUZZER_COUNT).keys()].filter((i) => !usedBz.has(i));
        const pool = free.length ? free : [...Array(BUZZER_COUNT).keys()];
        const bz = pool[Math.floor(Math.random() * pool.length)];
        p = { id: newId(), token, name, bz, score: 0, ok: 0, best: null, rt: null, sockets: new Set() };
        room.players.set(p.id, p);
      }
      attachPlayer(room, p);
      ack({ ok: true, code: room.code, id: p.id, bz: p.bz });
      broadcast(room);
    });

    socket.on('resume', (data, ack) => {
      if (typeof ack !== 'function') return;
      const token = String(data?.token || '');
      const room = rooms.get(String(data?.code || '').toUpperCase());
      if (!room || !token) return ack({ ok: false });

      if (room.hostToken === token) {
        attachHost(room);
        ack({ ok: true, id: 'host' });
        broadcast(room);
        socket.emit('hostinfo', hostInfo(room));
        return;
      }
      const p = [...room.players.values()].find((x) => x.token === token);
      if (!p) return ack({ ok: false });
      attachPlayer(room, p);
      ack({ ok: true, id: p.id });
      broadcast(room);
    });

    socket.on('leave', () => {
      const c = ctx();
      if (!c) return;
      const { room, role, id } = c;
      if (role === 'host') return closeRoom(room);
      const p = room.players.get(id);
      socket.leave(room.code);
      socket.data = {};
      if (!p) return;
      const wasCurrent = room.phase === 'answering' && room.queue[0] === id;
      room.players.delete(id);
      room.queue = room.queue.filter((x) => x !== id);
      room.tried = room.tried.filter((x) => x !== id);
      if (wasCurrent) {
        if (room.queue.length) startAnswering(room);
        else { clearTimeout(room.timer); room.timer = null; room.phase = 'open'; room.deadline = null; }
      }
      broadcast(room);
    });

    /* ----- دستورهای مجری ----- */
    socket.on('host:start', (data, ack) => {
      const room = hostCtx();
      const done = typeof ack === 'function' ? ack : () => {};
      if (!room) return done({ ok: false, error: 'اتاق پیدا نشد' });
      if (room.started) return done({ ok: true });
      const online = [...room.players.values()].filter((p) => p.sockets.size > 0).length;
      if (online < meta.minPlayers) {
        return done({ ok: false, error: `حداقل ${meta.minPlayers} بازیکن آنلاین لازم است` });
      }
      room.started = true;
      done({ ok: true });
      broadcast(room);
    });

    socket.on('host:activate', (data, ack) => {
      const room = hostCtx();
      const done = typeof ack === 'function' ? ack : () => {};
      if (!room) return done({ ok: false, error: 'اتاق پیدا نشد' });
      if (!room.started) return done({ ok: false, error: 'ابتدا مسابقه را شروع کنید' });
      const value = Number(data?.value);
      if (!VALUES.includes(value)) return done({ ok: false, error: 'ارزش نامعتبر' });
      if (room.phase !== 'idle') return done({ ok: false, error: 'یک سوال در حال اجراست' });
      if (room.used.includes(value)) return done({ ok: false, error: 'این ارزش قبلاً استفاده شده' });

      const item = pickQuestion(room, value);
      if (!item) return done({ ok: false, error: 'برای این ارزش سوالی وجود ندارد' });

      const opts = shuffle(item.o.map((t, i) => ({ t, correct: i === 0 })));
      room.q = { text: item.q, options: opts.map((x) => x.t) };
      room.answer = opts.findIndex((x) => x.correct);
      room.fact = item.f || '';
      room.reveal = null;
      room.active = value;
      room.queue = [];
      room.tried = [];
      room.phase = 'open';
      room.openedAt = Date.now();
      for (const p of room.players.values()) p.rt = null;

      done({ ok: true });
      broadcast(room);
      sendHostInfo(room);
    });

    socket.on('host:settings', (data, ack) => {
      const room = hostCtx();
      const done = typeof ack === 'function' ? ack : () => {};
      if (!room) return done({ ok: false, error: 'اتاق پیدا نشد' });
      const ms = Number(data?.answerMs);
      const valid = Number.isInteger(ms) && (ms === 0 || (ms >= MIN_ANSWER_MS && ms <= MAX_ANSWER_MS));
      if (!valid) return done({ ok: false, error: 'زمان نامعتبر است' });
      room.answerMs = ms; // از نوبت پاسخ بعدی اعمال می‌شود
      done({ ok: true });
      broadcast(room);
    });

    socket.on('host:judge', (data) => {
      const room = hostCtx();
      if (!room) return;
      judge(room, !!data?.correct);
    });

    socket.on('host:skip', () => {
      const room = hostCtx();
      if (!room || room.phase === 'idle') return;
      finishQuestion(room, null);
      broadcast(room);
    });

    socket.on('host:rematch', () => {
      const room = hostCtx();
      if (!room) return;
      freshGame(room);
      broadcast(room);
      sendHostInfo(room);
    });

    /* ----- بازیکن ----- */
    socket.on('player:buzz', () => {
      const c = ctx();
      if (!c || c.role !== 'player') return;
      const { room, id } = c;
      const p = room.players.get(id);
      if (!p) return;
      if (!room.started || room.phase === 'idle') return;
      if (room.queue.includes(id) || room.tried.includes(id)) return;

      const rt = Date.now() - room.openedAt;
      p.rt = rt;
      if (p.best == null || rt < p.best) p.best = rt;
      room.queue.push(id);
      if (room.phase === 'open') startAnswering(room);
      broadcast(room);
    });

    socket.on('disconnect', () => {
      const room = rooms.get(socket.data?.code);
      if (!room) return;
      if (socket.data.role === 'host') {
        room.hostSockets.delete(socket.id);
      } else {
        const p = room.players.get(socket.data.id);
        if (p) p.sockets.delete(socket.id);
      }
      broadcast(room);
    });
  });

  /* پاک‌سازی اتاق‌های رهاشده */
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const room of rooms.values()) {
      const anyone = room.hostSockets.size > 0 || [...room.players.values()].some((p) => p.sockets.size > 0);
      if (!anyone && now - room.lastSeen > ROOM_IDLE_MS) {
        clearTimeout(room.timer);
        rooms.delete(room.code);
      }
    }
  }, 5 * 60 * 1000);
  sweep.unref();
}

module.exports = { meta, init };