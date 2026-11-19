(() => {
  const fa = n => Number(n).toLocaleString('fa-IR');
  // ظاهر هر کارت بر اساس عنوان بازی
  const THEMES = [
    { match: /بازز|مسابقه/, c1: '#3f8cff', c2: '#1b49d8', img: 'img/buzzer_btn.webp', hero: true, badge: 'محبوب‌ترین' },
    { match: /اسم|فامیل/,   c1: '#37d17a', c2: '#0d9a4a', icon: '✏️' },
  ];
  const DEFAULT = { c1: '#a45cff', c2: '#6a2bd0', icon: '🎲' };
  // کارت‌های «به‌زودی» برای پر شدن ردیف
  const SOON = [
    { title: 'گردونه شانس', c1: '#ff7aa8', c2: '#ee3d78', icon: '🎡' },
    { title: 'پانتومیم',    c1: '#ffa23a', c2: '#f26a0e', icon: '🎭' },
    { title: 'بمب سؤالی',   c1: '#a45cff', c2: '#6a2bd0', icon: '💣' },
  ];
  const FALLBACK = [
    { title: 'مسابقه با بازز', description: 'اطلاعات عمومی‌تون رو به رخ هم بکشید', minPlayers: 2, path: '#' },
    { title: 'اسم فامیل', description: 'بازی کلاسیک اسم فامیل، نسخه‌ی جدید', minPlayers: 2, path: '#' },
  ];
  const track = document.getElementById('games-list');
  const dotsEl = document.getElementById('dots');
  let slots = [];

  async function load() {
    let games;
    try {
      const r = await fetch('/api/games');
      if (!r.ok) throw 0;
      games = await r.json();
      if (!Array.isArray(games) || !games.length) throw 0;
    } catch { games = FALLBACK; }
    render(games);
  }

  function render(games) {
    track.innerHTML = '';
    const all = [...games.map(g => ({ g })), ...SOON.map(s => ({ g: { title: s.title, minPlayers: 2 }, soon: true, t: s }))];
    slots = all.map(({ g, soon, t }, i) => {
      const th = t || THEMES.find(x => x.match.test(g.title)) || DEFAULT;
      const slot = document.createElement('div');
      slot.className = 'slot' + (th.hero ? ' hero-card' : '') + (soon ? ' soon' : '');
      slot.style.setProperty('--i', i);
      const a = document.createElement(soon ? 'div' : 'a');
      a.className = 'card';
      a.style.setProperty('--c1', th.c1); a.style.setProperty('--c2', th.c2);
      if (!soon) { a.href = g.path; a.setAttribute('aria-label', `${g.title}؛ ${g.description || ''}؛ حداقل ${fa(g.minPlayers)} نفر`); }
      const ic = document.createElement('div'); ic.className = 'ic';
      if (th.img) { const im = document.createElement('img'); im.src = th.img; im.alt = ''; im.draggable = false; ic.appendChild(im); }
      else ic.textContent = th.icon;
      const h = document.createElement('h3'); h.textContent = g.title;
      const meta = document.createElement('div'); meta.className = 'meta';
      const pill = document.createElement('span'); pill.className = 'pill';
      pill.textContent = soon ? '⏳ به‌زودی' : `👥 حداقل ${fa(g.minPlayers)} نفر`;
      const go = document.createElement('span'); go.className = 'go-c'; go.textContent = soon ? '🔒' : '‹';
      meta.append(pill, go);
      a.append(ic, h, meta);
      slot.appendChild(a);
      if (th.badge) { const b = document.createElement('span'); b.className = 'badge'; b.textContent = th.badge; slot.appendChild(b); }
      track.appendChild(slot);
      if (!soon) enhance(a);
      return slot;
    });
    dotsEl.innerHTML = '';
    slots.forEach((s, i) => {
      const d = document.createElement('button');
      d.type = 'button'; d.className = 'dot'; d.setAttribute('aria-label', `بازی ${fa(i + 1)}`);
      d.onclick = () => center(i);
      dotsEl.appendChild(d);
    });
    markDot();
    // کارت اول (اصلی) را وسط بیاور
    const h = slots.findIndex(s => s.classList.contains('hero-card'));
    if (h > -1) requestAnimationFrame(() => center(h, 'auto'));
  }

  function enhance(a) {
    if (matchMedia('(pointer:fine)').matches) {
      a.addEventListener('pointermove', e => {
        const r = a.getBoundingClientRect();
        a.style.setProperty('--ry', ((e.clientX - r.left) / r.width - .5) * 12 + 'deg');
        a.style.setProperty('--rx', (.5 - (e.clientY - r.top) / r.height) * 10 + 'deg');
      });
      a.addEventListener('pointerleave', () => { a.style.setProperty('--rx', '0deg'); a.style.setProperty('--ry', '0deg'); });
    }
    a.addEventListener('click', e => {
      burst(e.clientX || innerWidth / 2, e.clientY || innerHeight / 2);
      const href = a.getAttribute('href');
      if (!href || href === '#' || e.metaKey || e.ctrlKey || e.shiftKey) { e.preventDefault(); return; }
      e.preventDefault();
      a.style.setProperty('--s', '1.08');
      setTimeout(() => (location.href = href), 320);
    });
  }
  function burst(x, y) {
    for (let i = 0; i < 9; i++) {
      const s = document.createElement('span');
      s.className = 'burst'; s.textContent = i % 2 ? '✦' : '✧';
      const ang = (i / 9) * Math.PI * 2, d = 50 + Math.random() * 40;
      s.style.cssText = `left:${x}px;top:${y}px;--x:${Math.cos(ang) * d}px;--y:${Math.sin(ang) * d}px`;
      document.body.appendChild(s); setTimeout(() => s.remove(), 750);
    }
  }

  function center(i, behavior = 'smooth') {
    const t = track.getBoundingClientRect(), c = slots[i].getBoundingClientRect();
    track.scrollBy({ left: c.left + c.width / 2 - (t.left + t.width / 2), behavior });
  }
  function markDot() {
    const mid = track.getBoundingClientRect().left + track.clientWidth / 2;
    let best = 0, bd = 1e9;
    slots.forEach((s, i) => { const r = s.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - mid); if (d < bd) { bd = d; best = i; } });
    [...dotsEl.children].forEach((d, i) => d.classList.toggle('on', i === best));
    return best;
  }
  track.addEventListener('scroll', () => requestAnimationFrame(markDot), { passive: true });
  // در RTL: «بعدی» به سمت چپ می‌رود
  document.getElementById('next').onclick = () => center(Math.min(slots.length - 1, markDot() + 1));
  document.getElementById('prev').onclick = () => center(Math.max(0, markDot() - 1));

  // دکمه‌ی «بزن بریم!» بازی اصلی را باز می‌کند
  document.getElementById('go').onclick = () => {
    const a = track.querySelector('.hero-card a, .slot:not(.soon) a');
    if (a) a.click();
  };

  /* نشانگر دست */
  if (matchMedia('(pointer:fine)').matches) {
    const cur = document.createElement('img');
    cur.src = 'img/15_hand_cursor.webp'; cur.alt = ''; cur.setAttribute('aria-hidden', 'true'); cur.className = 'hand-cursor';
    document.body.appendChild(cur);
    document.documentElement.classList.add('custom-cursor');
    addEventListener('pointermove', e => { cur.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`; cur.style.opacity = 1; });
    document.addEventListener('pointerleave', () => cur.style.opacity = 0);
    addEventListener('pointerdown', () => cur.classList.add('down'));
    addEventListener('pointerup', () => cur.classList.remove('down'));
  }
  load();
})();
