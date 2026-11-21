'use strict';

const QUESTIONS = require('./questions');

/* ---------------- تنظیمات ---------------- */
const VALUES = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
const WRONG_PENALTY_RATIO = 0.5;   // پاسخ غلط: نصف ارزش سوال کم می‌شود (0 = بدون جریمه، 1 = کل ارزش)
const BUZZER_COUNT = 9;            // تعداد تصاویر بازر (buzzers (1..9).png)
const MIN_SECONDS = 3;             // کمترین زمان قابل تنظیم برای پاسخ
const MAX_SECONDS = 120;           // بیشترین زمان قابل تنظیم برای پاسخ
const MAX_QUESTIONS = 50;          // سقف تعداد سوال‌های یک بازی
const DISCONNECT_GRACE_MS = 15000; // مهلت بازگشت بازیکنی که نوبت پاسخ داشته و آفلاین شده
const DEFAULT_SETTINGS = { timed: true, seconds: 15, total: 10, cats: [] }; // cats خالی = تصادفی از همه موضوعات
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

/* ---------------- بانک سوال‌ها ---------------- */
// questions.js: { [ارزش]: [ { q, o: [درست، غلط، غلط، غلط], f, c: دسته‌بندی, ... } ] }
const BANK = [];
for (const v of VALUES) {
  const arr = QUESTIONS[v];
  if (!Array.isArray(arr)) continue;
  arr.forEach((it, i) => {
    if (!it || !it.q || !Array.isArray(it.o) || it.o.length < 2) return;
    BANK.push({ uid: `${v}:${i}`, value: v, cat: String(it.c || 'عمومی'), q: it.q, o: it.o, f: it.f || '' });
  });
}
const CAT_NAMES = [...new Set(BANK.map((x) => x.cat))];
const CAT_SET = new Set(CAT_NAMES);
const CATALOG = {
  ok: true,
  cats: CAT_NAMES.map((name) => ({ name, count: BANK.filter((x) => x.cat === name).length })),
  total: BANK.length,
  limits: { minSeconds: MIN_SECONDS, maxSeconds: MAX_SECONDS, maxQuestions: MAX_QUESTIONS },
};

const poolOf = (cats) => {
  if (!cats.length) return BANK;
  const set = new Set(cats);
  return BANK.filter((x) => set.has(x.cat));
};

// تنظیمات را اعتبارسنجی و به محدودهٔ مجاز می‌برد
function cleanSettings(raw, base) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const timed = r.timed === undefined ? !!base.timed : !!r.timed;
  let seconds = Math.round(Number(r.seconds ?? base.seconds));
  if (!Number.isFinite(seconds)) seconds = base.seconds;
  seconds = Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, seconds));
  let cats = Array.isArray(r.cats) ? r.cats.map(String).filter((c) => CAT_SET.has(c)) : base.cats;
  cats = [...new Set(cats)];
  const size = poolOf(cats).length;
  let total = Math.round(Number(r.total ?? base.total));
  if (!Number.isFinite(total)) total = base.total;
  total = Math.max(1, Math.min(total, MAX_QUESTIONS, size || 1));
  return { timed, seconds, total, cats };
}

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

const answerMs = (room) => (room.settings.timed ? room.settings.seconds * 1000 : 0);

function freshGame(room) {
  clearTimeout(room.timer);
  room.timer = null;
  room.turnSeq = (room.turnSeq || 0) + 1;
  room.started = false;      // false = در لابی (اتاق بازی)، true = مسابقه شروع شده
  room.phase = 'idle';       // idle | open | answering
  room.active = null;        // ارزش سوال فعال
  room.asked = 0;            // تعداد سوال‌های تمام‌شده در این بازی
  room.total = 0;            // تعداد سوال این بازی (هنگام شروع ثابت می‌شود)
  room.gameUsed = new Set(); // سوال‌های استفاده‌شده در همین بازی
  room.catCount = new Map(); // تعداد سوال از هر دسته در همین بازی (برای پخش متعادل)
  room.queue = [];
  room.tried = [];
  room.q = null;             // { text, options, cat } برای نمایش
  room.wrongOpts = [];       // گزینه‌هایی که بازیکنان اشتباه انتخاب کرده‌اند
  room.answer = -1;          // اندیس پاسخ درست بعد از به‌هم‌ریختن گزینه‌ها (هرگز به کلاینت نمی‌رود)
  room.fact = '';
  room.reveal = null;        // { answer, fact, by }
  room.deadline = null;
  room.openedAt = 0;
  room.over = false;
  for (const p of room.players.values()) {
    p.score = 0; p.ok = 0; p.best = null; p.rt = null;
  }
}

const hasAvailable = (room) => room.pool.some((x) => !room.gameUsed.has(x.uid));

function availability(room) {
  const out = {};
  for (const v of VALUES) out[v] = 0;
  for (const x of room.pool) if (!room.gameUsed.has(x.uid)) out[x.value]++;
  return out;
}

// انتخاب سوال: از بین دسته‌های انتخابی، دسته‌ای که تا الان کمتر سوال داشته (تا موضوعات متنوع بیایند)
function pickQuestion(room, value) {
  const pool = room.pool.filter((x) => x.value === value && !room.gameUsed.has(x.uid));
  if (!pool.length) return null;

  const byCat = new Map();
  for (const x of pool) {
    if (!byCat.has(x.cat)) byCat.set(x.cat, []);
    byCat.get(x.cat).push(x);
  }
  let best = Infinity;
  let cands = [];
  for (const c of byCat.keys()) {
    const n = room.catCount.get(c) || 0;
    if (n < best) { best = n; cands = [c]; } else if (n === best) cands.push(c);
  }
  const cat = cands[Math.floor(Math.random() * cands.length)];
  const items = byCat.get(cat);
  const fresh = items.filter((x) => !room.history.has(x.uid)); // اولویت با سوال‌هایی که در بازی‌های قبلی اتاق نیامده‌اند
  const src = fresh.length ? fresh : items;
  const item = src[Math.floor(Math.random() * src.length)];

  room.gameUsed.add(item.uid);
  room.history.add(item.uid);
  room.catCount.set(item.cat, (room.catCount.get(item.cat) || 0) + 1);
  return item;
}

function makePlayer(room, token, name) {
  const usedBz = new Set([...room.players.values()].map((x) => x.bz));
  const free = [...Array(BUZZER_COUNT).keys()].filter((i) => !usedBz.has(i));
  const pool = free.length ? free : [...Array(BUZZER_COUNT).keys()];
  const bz = pool[Math.floor(Math.random() * pool.length)];
  const p = { id: newId(), token, name, bz, score: 0, ok: 0, best: null, rt: null, sockets: new Set() };
  room.players.set(p.id, p);
  return p;
}

/* ---------------- ساخت وضعیت برای کلاینت ---------------- */
// توجه: پاسخ درست تا پایان سوال هرگز در این وضعیت نیست (حتی برای ادمین)
function publicState(room) {
  const admin = room.players.get(room.adminId);
  return {
    code: room.code,
    adminId: room.adminId,
    adminOnline: admin ? admin.sockets.size > 0 : false,
    started: room.started,
    min: meta.minPlayers,
    phase: room.phase,
    active: room.active,
    asked: room.asked,
    total: room.started ? room.total : room.settings.total,
    avail: room.started ? availability(room) : null,
    settings: room.settings,
    queue: room.queue,
    tried: room.tried,
    q: room.q,
    reveal: room.reveal,
    over: room.over,
    wrong: room.wrongOpts,
    answerMs: answerMs(room),
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

function init({ nsp }) {
  const broadcast = (room) => {
    room.lastSeen = Date.now();
    nsp.to(room.code).emit('state', publicState(room));
  };

  /* ----- منطق بازی ----- */
  function finishQuestion(room, by) {
    clearTimeout(room.timer);
    room.timer = null;
    room.deadline = null;
    room.reveal = { answer: room.answer, fact: room.fact, by: by || null };
    room.asked += 1;
    room.phase = 'idle';
    room.queue = [];
    room.tried = [];
    if (room.asked >= room.total || !hasAvailable(room)) room.over = true;
  }

  function startAnswering(room) {
    room.phase = 'answering';
    room.turnSeq += 1;
    clearTimeout(room.timer);
    room.timer = null;
    const ms = answerMs(room);
    if (ms > 0) {
      room.deadline = Date.now() + ms;
      room.timer = setTimeout(() => judge(room, false), ms);
    } else {
      room.deadline = null; // بدون محدودیت زمانی؛ بازیکن هر وقت خواست گزینه را انتخاب می‌کند
    }
  }

  // نتیجهٔ پاسخ نفر اول صف. opts.noPenalty: رد شدن نوبت بدون کم‌شدن امتیاز
  function judge(room, correct, pick, opts = {}) {
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
      nsp.to(room.code).emit('judged', { id, correct: true, delta, pick: pick ?? null });
      finishQuestion(room, id);
      return broadcast(room);
    }

    const delta = opts.noPenalty ? 0 : -Math.round(room.active * WRONG_PENALTY_RATIO);
    p.score += delta;
    room.tried.push(id);
    room.queue.shift();
    if (Number.isInteger(pick) && !room.wrongOpts.includes(pick)) room.wrongOpts.push(pick);
    nsp.to(room.code).emit('judged', { id, correct: false, delta, pick: pick ?? null, passed: !!opts.noPenalty });

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
      if (s) { s.leave(room.code); s.data = {}; }
    }
    rooms.delete(room.code);
  }

  /* ----- اتصال‌ها ----- */
  nsp.on('connection', (socket) => {
    socket.data = {};

    const ctx = () => {
      const room = rooms.get(socket.data.code);
      return room ? { room, id: socket.data.id } : null;
    };
    // فقط ادمین اتاق (سازندهٔ اتاق)
    const adminCtx = () => {
      const c = ctx();
      return c && c.room.adminId === c.id ? c.room : null;
    };

    function attachPlayer(room, p) {
      p.sockets.add(socket.id);
      socket.data = { code: room.code, id: p.id };
      socket.join(room.code);
    }

    // فهرست دسته‌بندی‌ها برای صفحهٔ تنظیمات
    socket.on('meta:catalog', (data, ack) => {
      if (typeof ack === 'function') ack(CATALOG);
    });

    // سازندهٔ اتاق = ادمین؛ او هم یک بازیکن عادی است (پاسخ درست را قبل از بقیه نمی‌بیند)
    socket.on('room:create', (data, ack) => {
      if (typeof ack !== 'function') return;
      const token = String(data?.token || '');
      const name = cleanName(data?.name);
      if (!token) return ack({ ok: false, error: 'خطا در ارتباط' });
      if (!name) return ack({ ok: false, error: 'نام خود را وارد کنید' });
      if (!BANK.length) return ack({ ok: false, error: 'بانک سوال‌ها خالی است' });

      let room = [...rooms.values()].find((r) => r.adminToken === token);
      let p;
      if (room) {
        p = room.players.get(room.adminId);
        if (p) p.name = name;
      }
      if (!room || !p) {
        const settings = cleanSettings(data?.settings, DEFAULT_SETTINGS);
        room = {
          code: makeCode(),
          adminToken: token,
          adminId: null,
          players: new Map(),
          history: new Set(),   // سوال‌های دیده‌شده در بازی‌های قبلی این اتاق
          settings,
          pool: poolOf(settings.cats),
          timer: null,
          lastSeen: Date.now(),
        };
        freshGame(room);
        rooms.set(room.code, room);
        p = makePlayer(room, token, name);
        room.adminId = p.id;
      }
      attachPlayer(room, p);
      ack({ ok: true, code: room.code, id: p.id, bz: p.bz });
      broadcast(room);
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
        p = makePlayer(room, token, name);
      }
      attachPlayer(room, p);
      ack({ ok: true, code: room.code, id: p.id, bz: p.bz, admin: room.adminId === p.id });
      broadcast(room);
    });

    socket.on('resume', (data, ack) => {
      if (typeof ack !== 'function') return;
      const token = String(data?.token || '');
      const room = rooms.get(String(data?.code || '').toUpperCase());
      if (!room || !token) return ack({ ok: false });
      const p = [...room.players.values()].find((x) => x.token === token);
      if (!p) return ack({ ok: false });
      attachPlayer(room, p);
      ack({ ok: true, id: p.id, bz: p.bz, admin: room.adminId === p.id });
      broadcast(room);
    });

    socket.on('leave', () => {
      const c = ctx();
      if (!c) return;
      const { room, id } = c;
      if (room.adminId === id) return closeRoom(room); // خروج ادمین = بسته‌شدن اتاق
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

    /* ----- دستورهای ادمین ----- */
    // تنظیمات بازی (فقط قبل از شروع)
    socket.on('admin:settings', (data, ack) => {
      const room = adminCtx();
      const done = typeof ack === 'function' ? ack : () => {};
      if (!room) return done({ ok: false, error: 'اتاق پیدا نشد' });
      if (room.started) return done({ ok: false, error: 'بعد از شروع مسابقه تنظیمات قابل تغییر نیست' });
      room.settings = cleanSettings(data, room.settings);
      room.pool = poolOf(room.settings.cats);
      done({ ok: true });
      broadcast(room);
    });

    socket.on('admin:start', (data, ack) => {
      const room = adminCtx();
      const done = typeof ack === 'function' ? ack : () => {};
      if (!room) return done({ ok: false, error: 'اتاق پیدا نشد' });
      if (room.started) return done({ ok: true });
      const online = [...room.players.values()].filter((p) => p.sockets.size > 0).length;
      if (online < meta.minPlayers) {
        return done({ ok: false, error: `حداقل ${meta.minPlayers} بازیکن آنلاین لازم است` });
      }
      if (!room.pool.length) return done({ ok: false, error: 'برای دسته‌بندی انتخابی سوالی وجود ندارد' });
      room.total = Math.min(room.settings.total, room.pool.length);
      room.started = true;
      done({ ok: true });
      broadcast(room);
    });

    // انتخاب سطح (ارزش) سوال بعدی؛ سوال از دسته‌بندی‌هایی که ادمین انتخاب کرده می‌آید
    socket.on('admin:pick', (data, ack) => {
      const room = adminCtx();
      const done = typeof ack === 'function' ? ack : () => {};
      if (!room) return done({ ok: false, error: 'اتاق پیدا نشد' });
      if (!room.started) return done({ ok: false, error: 'ابتدا مسابقه را شروع کنید' });
      if (room.over) return done({ ok: false, error: 'مسابقه تمام شده است' });
      const value = Number(data?.value);
      if (!VALUES.includes(value)) return done({ ok: false, error: 'ارزش نامعتبر' });
      if (room.phase !== 'idle') return done({ ok: false, error: 'یک سوال در حال اجراست' });

      const item = pickQuestion(room, value);
      if (!item) return done({ ok: false, error: 'برای این سطح سوالی باقی نمانده؛ سطح دیگری را انتخاب کنید' });

      const opts = shuffle(item.o.map((t, i) => ({ t, correct: i === 0 })));
      room.q = { text: item.q, options: opts.map((x) => x.t), cat: item.cat };
      room.answer = opts.findIndex((x) => x.correct);
      room.fact = item.f || '';
      room.reveal = null;
      room.wrongOpts = [];
      room.active = value;
      room.queue = [];
      room.tried = [];
      room.phase = 'open';
      room.openedAt = Date.now();
      for (const p of room.players.values()) p.rt = null;

      done({ ok: true });
      broadcast(room);
    });

    // رد کردن کل سوال (مثلاً وقتی کسی بازر نمی‌زند)
    socket.on('admin:skip', () => {
      const room = adminCtx();
      if (!room || room.phase === 'idle') return;
      finishQuestion(room, null);
      broadcast(room);
    });

    // رد کردن نوبت بازیکنی که پاسخ نمی‌دهد (بدون کم‌شدن امتیاز)
    socket.on('admin:pass', () => {
      const room = adminCtx();
      if (!room) return;
      judge(room, false, null, { noPenalty: true });
    });

    socket.on('admin:rematch', () => {
      const room = adminCtx();
      if (!room || !room.over) return;
      freshGame(room);
      broadcast(room);
    });

    /* ----- بازیکن ----- */
    socket.on('player:buzz', () => {
      const c = ctx();
      if (!c) return;
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

    // بازیکنی که نوبتش است گزینه‌ی خودش را انتخاب می‌کند؛ سرور درست یا غلط بودن را تعیین می‌کند
    socket.on('player:answer', (data) => {
      const c = ctx();
      if (!c) return;
      const { room, id } = c;
      if (room.phase !== 'answering' || room.queue[0] !== id || !room.q) return;
      const i = Number(data?.index);
      if (!Number.isInteger(i) || i < 0 || i >= room.q.options.length) return;
      if (room.wrongOpts.includes(i)) return;
      judge(room, i === room.answer, i);
    });

    socket.on('disconnect', () => {
      const room = rooms.get(socket.data?.code);
      if (!room) return;
      const p = room.players.get(socket.data.id);
      if (p) {
        p.sockets.delete(socket.id);
        // اگر بازیکنِ دارای نوبت آفلاین بماند، نوبتش (بدون جریمه) رد می‌شود تا بازی گیر نکند
        if (p.sockets.size === 0 && room.phase === 'answering' && room.queue[0] === p.id) {
          const seq = room.turnSeq;
          setTimeout(() => {
            const cur = rooms.get(room.code);
            if (!cur || cur.turnSeq !== seq || cur.phase !== 'answering' || cur.queue[0] !== p.id) return;
            const again = cur.players.get(p.id);
            if (again && again.sockets.size > 0) return;
            judge(cur, false, null, { noPenalty: true });
          }, DISCONNECT_GRACE_MS).unref();
        }
      }
      broadcast(room);
    });
  });

  /* پاک‌سازی اتاق‌های رهاشده */
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const room of rooms.values()) {
      const anyone = [...room.players.values()].some((p) => p.sockets.size > 0);
      if (!anyone && now - room.lastSeen > ROOM_IDLE_MS) {
        clearTimeout(room.timer);
        rooms.delete(room.code);
      }
    }
  }, 5 * 60 * 1000);
  sweep.unref();
}

module.exports = { meta, init };
