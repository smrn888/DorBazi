(() => {
  const fa = n => Number(n).toLocaleString('fa-IR');
  // تصویر آماده‌ی هر کارت
  const ART = [
    { match: /بازز|مسابقه/, img: 'img/07_Buzzer_competition.webp', hero: true },
    { match: /اسم|فامیل/,   img: 'img/08_EsmFamil_Competition.webp' },
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
    // فقط بازی‌هایی که تصویر کارت دارن
    const items = games.map(g => ({ g, art: ART.find(a => a.match.test(g.title)) })).filter(x => x.art);
    slots = items.map(({ g, art }, i) => {
      const slot = document.createElement('div');
      slot.className = 'slot' + (art.hero ? ' hero-card' : '');
      slot.style.setProperty('--i', i);
      const a = document.createElement('a');
      a.className = 'card'; a.href = g.path;
      a.setAttribute('aria-label', `${g.title}؛ ${g.description || ''}؛ حداقل ${fa(g.minPlayers)} نفر`);
      const img = document.createElement('img');
      img.src = art.img; img.alt = ''; img.draggable = false;
      a.appendChild(img); slot.appendChild(a); track.appendChild(slot);
      enhance(a);
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

  // دکمه‌ی «بزن بریم!» بازی اصلی را باز می‌کند
  document.getElementById('go').onclick = () => {
    const a = track.querySelector('.hero-card a, .slot:not(.soon) a');
    if (a) a.click();
  };

  /* نشانگر دست + افکت کلیک */
  if (matchMedia('(pointer:fine)').matches) {
    const cur = document.createElement('img');
    cur.src = 'img/15_hand_cursor.webp'; cur.alt = ''; cur.setAttribute('aria-hidden', 'true'); cur.className = 'hand-cursor';
    document.body.appendChild(cur);
    document.documentElement.classList.add('custom-cursor');
    let back;
    addEventListener('pointermove', e => { cur.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`; cur.style.opacity = 1; });
    document.addEventListener('pointerleave', () => cur.style.opacity = 0);
    addEventListener('pointerdown', e => {
      // دست کلیک‌کننده دقیقاً همان‌جا ظاهر می‌شود و دایره زیر انگشت نشان می‌دهد
      const p = document.createElement('div'); p.className = 'press';
      p.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      const im = document.createElement('img'); im.src = 'img/click_press.webp'; im.alt = ''; p.appendChild(im);
      document.body.appendChild(p); setTimeout(() => p.remove(), 560);
      cur.classList.add('hidden'); clearTimeout(back); back = setTimeout(() => cur.classList.remove('hidden'), 450);
    });
  }
  load();
})();
