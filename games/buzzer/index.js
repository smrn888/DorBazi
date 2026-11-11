const BANK = require('./questions');

const meta = {
  id: 'buzzer',
  title: 'مسابقه با بازر',
  description: 'سریع‌ترین انگشت جواب می‌دهد',
  icon: '🔔',
  minPlayers: 2,
};

const VALUES = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
const WRONG_PENALTY = 0.5;          // برای حذف جریمه صفر بگذارید
const HOST_GRACE_MS = 60 * 1000;    // مهلت بازگشت مجری قبل از بسته شدن اتاق

const ANSWER_MS = 10000;           // مهلت جواب دادن بعد از زدن بازر
const rooms = new Map();
const CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function newCode() {
  let s;
  do { s = Array.from({ length: 4 }, () => CH[Math.floor(Math.random() * CH.length)]).join(''); }
  while (rooms.has(s));
  return s;
}
const clean = (s) => String(s || '').trim().slice(0, 20);
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

function pickQuestion(value) {
  const list = BANK[value] || [];
  if (!list.length) return null;
  const src = list[Math.floor(Math.random() * list.length)];
  const options = shuffle(src.o);
  return { text: src.q, options, answer: options.indexOf(src.o[0]), fact: src.f };
}

function init(arg) {
  const nsp = arg.nsp || arg;

  setInterval(() => {
    const now = Date.now();
    for (const [k, r] of rooms) if (now - r.touched > 2 * 3600e3) rooms.delete(k);
  }, 10 * 60e3).unref();

  const idOf = (r, t) => r.players.get(t)?.id;

  // نمای عمومی: هرگز شامل answer یا fact قبل از افشا نیست
  const view = (r) => ({
    code: r.code,
    phase: r.phase,            // idle | open | answering
    active: r.active,
    hostOnline: r.hostOnline, over: !!r.over, dl: r.deadline ? Math.max(0, r.deadline - Date.now()) : null,
    q: r.q ? { text: r.q.text, options: r.q.options } : null,
    reveal: r.reveal,
    queue: r.queue.map((t) => idOf(r, t)),
    tried: [...r.attempted].map((t) => idOf(r, t)),
    used: [...r.used],
    players: [...r.players.values()].map((p) => ({ id: p.id, name: p.name, score: p.score, online: p.online, bz: p.bz, rt: p.rt ?? null, ok: p.ok || 0, best: p.best ?? null })),
  });

  const push = (r) => {
    nsp.to(r.code).emit('state', view(r));
    nsp.to(r.code + ':host').emit('hostinfo',
      r.q && !r.reveal ? { answer: r.q.answer, fact: r.q.fact } : null);
  };

  const closeQuestion = (r, by = null) => {
    if (r.q) r.reveal = { answer: r.q.answer, fact: r.q.fact, by: by ? idOf(r, by) : null };
    r.phase = 'idle'; r.active = null; r.queue = []; r.attempted.clear();
    clearTimeout(r.ansTimer); r.deadline = null;
    if (r.used.size === VALUES.length) r.over = true;
  };

  const closeRoom = (r) => {
    clearTimeout(r.closeTimer);
    clearTimeout(r.ansTimer);
    nsp.to(r.code).emit('closed');
    rooms.delete(r.code);
  };

  const startTimer = (r) => {
    clearTimeout(r.ansTimer); r.deadline = null;
    if (r.phase === 'answering' && r.queue.length) {
      r.deadline = Date.now() + ANSWER_MS;
      r.ansTimer = setTimeout(() => { judge(r, false); push(r); }, ANSWER_MS);
    }
  };

  const judge = (r, correct) => {
    const t = r.queue[0];
    const pl = r.players.get(t);
    if (!pl) return;
    const delta = correct ? r.active : -r.active * WRONG_PENALTY;
    pl.score += delta;
    nsp.to(r.code).emit('judged', { id: pl.id, correct, delta });
    if (correct) {
      pl.ok = (pl.ok || 0) + 1;
      closeQuestion(r, t);
    } else {
      r.attempted.add(t);
      r.queue.shift();
      if (r.queue.length === 0) {
        const everyone = [...r.players.keys()].every((k) => r.attempted.has(k));
        if (everyone) closeQuestion(r); else r.phase = 'open';
      }
      startTimer(r);
    }
  };

  nsp.on('connection', (socket) => {
    const room = () => {
      const r = rooms.get(socket.data?.code);
      if (r) r.touched = Date.now();
      return r;
    };
    const isHost = (r) => r && socket.data.role === 'host' && socket.data.token === r.hostToken;

    socket.on('host:create', (p = {}, ack) => {
      if (!p.token) return ack?.({ ok: false });
      const r = {
        code: newCode(), hostToken: p.token, hostSid: socket.id, hostOnline: true, closeTimer: null,
        phase: 'idle', active: null, q: null, reveal: null, over: false, deadline: null, ansTimer: null, openedAt: 0,
        queue: [], attempted: new Set(), used: new Set(),
        players: new Map(), nextId: 1, touched: Date.now(),
      };
      rooms.set(r.code, r);
      socket.data = { code: r.code, token: p.token, role: 'host' };
      socket.join(r.code);
      socket.join(r.code + ':host');
      ack?.({ ok: true, code: r.code });
      push(r);
    });

    socket.on('player:join', (p = {}, ack) => {
      const r = rooms.get(String(p.code || '').toUpperCase());
      if (!r) return ack?.({ ok: false, error: 'اتاق پیدا نشد' });
      const name = clean(p.name);
      if (!name || !p.token) return ack?.({ ok: false, error: 'نام را وارد کنید' });
      // در تابع init درون هندلر socket.on('player:join', ...)
      let pl = r.players.get(p.token);
      if (!pl) {
        const usedBz = new Set([...r.players.values()].map((x) => x.bz));
        const available = [];
        for (let i = 0; i < 10; i++) {
          if (!usedBz.has(i)) available.push(i);
        }
        // انتخاب کاملاً رندوم از حیوانات آزاد، یا در صورت پر بودن یک حیوان تصادفی
        let bz;
        if (available.length > 0) {
          bz = available[Math.floor(Math.random() * available.length)];
        } else {
          bz = Math.floor(Math.random() * 10);
        }
        pl = { token: p.token, id: 'p' + r.nextId++, name, score: 0, bz };
        r.players.set(p.token, pl);
      }
      pl.name = name; pl.online = true; pl.sid = socket.id;
      socket.data = { code: r.code, token: p.token, role: 'player' };
      socket.join(r.code);
      ack?.({ ok: true, code: r.code, id: pl.id, bz: pl.bz });
      push(r);
    });

    socket.on('resume', (p = {}, ack) => {
      const r = rooms.get(String(p.code || '').toUpperCase());
      if (!r) return ack?.({ ok: false });
      if (p.token === r.hostToken) {
        clearTimeout(r.closeTimer);
        r.hostOnline = true; r.hostSid = socket.id;
        socket.data = { code: r.code, token: p.token, role: 'host' };
        socket.join(r.code + ':host');
      } else if (r.players.has(p.token)) {
        const pl = r.players.get(p.token);
        pl.online = true; pl.sid = socket.id;
        socket.data = { code: r.code, token: p.token, role: 'player' };
      } else return ack?.({ ok: false });
      socket.join(r.code);
      ack?.({ ok: true, id: idOf(r, p.token), bz: r.players.get(p.token)?.bz });
      push(r);
    });

    socket.on('leave', () => {
      const r = rooms.get(socket.data?.code);
      if (!r) return;
      const t = socket.data.token;

      if (socket.data.role === 'host' && t === r.hostToken) {
        closeRoom(r);
      } else if (socket.data.role === 'player') {
        r.players.delete(t);
        r.queue = r.queue.filter((x) => x !== t);
        r.attempted.delete(t);
        if (r.phase === 'answering' && r.queue.length === 0) r.phase = 'open';
        startTimer(r);
        push(r);
      }
      socket.leave(r.code);
      socket.leave(r.code + ':host');
      socket.data = {};
    });

    socket.on('player:buzz', () => {
      const r = room();
      if (!r || socket.data.role !== 'player') return;
      const t = socket.data.token;
      if (r.phase === 'idle' || r.attempted.has(t) || r.queue.includes(t)) return;
      const bp = r.players.get(t);
      bp.rt = Date.now() - r.openedAt;
      if (bp.best == null || bp.rt < bp.best) bp.best = bp.rt;
      r.queue.push(t);
      r.phase = 'answering';
      if (r.queue.length === 1) startTimer(r);
      push(r);
    });

    socket.on('host:activate', ({ value } = {}, ack) => {
      const r = room();
      if (!isHost(r)) return ack?.({ ok: false, error: 'شما مجری این اتاق نیستید' });
      if (r.phase !== 'idle') return ack?.({ ok: false, error: 'سوال قبلی هنوز بسته نشده؛ «رد کردن» را بزنید' });
      if (!VALUES.includes(value)) return ack?.({ ok: false, error: 'ارزش نامعتبر' });
      if (r.used.has(value)) return ack?.({ ok: false, error: 'این ارزش قبلاً استفاده شده' });

      const q = pickQuestion(value);
      if (!q) return ack?.({ ok: false, error: 'برای این ارزش سوالی تعریف نشده' });

      r.used.add(value);
      r.openedAt = Date.now();
      r.players.forEach((p) => { p.rt = null; });
      r.active = value; r.queue = []; r.attempted.clear();
      r.q = q;
      r.reveal = null;
      r.phase = 'open';
      ack?.({ ok: true });
      push(r);
    });

    socket.on('host:judge', ({ correct } = {}) => {
      const r = room();
      if (!isHost(r) || r.phase !== 'answering' || !r.queue.length) return;
      judge(r, !!correct);
      push(r);
    });

    socket.on('host:rematch', () => {
      const r = room();
      if (!isHost(r)) return;
      clearTimeout(r.ansTimer); r.deadline = null;
      r.used.clear(); r.q = null; r.reveal = null; r.over = false;
      r.phase = 'idle'; r.active = null; r.queue = []; r.attempted.clear();
      r.players.forEach((p) => { p.score = 0; p.ok = 0; p.best = null; p.rt = null; });
      push(r);
    });

    socket.on('host:skip', () => {
      const r = room();
      if (!isHost(r) || r.phase === 'idle') return;
      closeQuestion(r);
      push(r);
    });

    socket.on('disconnect', () => {
      const r = rooms.get(socket.data?.code);
      if (!r) return;
      if (socket.data.role === 'host' && r.hostSid === socket.id) {
        r.hostOnline = false;
        clearTimeout(r.closeTimer);
        r.closeTimer = setTimeout(() => closeRoom(r), HOST_GRACE_MS);
        push(r);
        return;
      }
      const pl = r.players.get(socket.data.token);
      if (pl && pl.sid === socket.id) { pl.online = false; push(r); }
    });
  });
}

module.exports = { meta, init };