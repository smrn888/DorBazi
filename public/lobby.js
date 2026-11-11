(() => {
  const fa = n => Number(n).toLocaleString('fa-IR');
  // هر بازی بر اساس عنوانش به یکی از تصویرها وصل می‌شه
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
  const hand = document.getElementById('hand');
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
    slots = games.map((g, i) => {
      const art = ART.find(a => a.match.test(g.title));
      const slot = document.createElement('div');
      slot.className = 'slot' + (art && art.hero ? ' hero' : '');
      slot.style.setProperty('--i', i);
      const a = document.createElement('a');
      a.className = 'card'; a.href = g.path;
      a.setAttribute('aria-label', `${g.title}؛ ${g.description}؛ حداقل ${fa(g.minPlayers)} نفر`);
      if (art) {
        const img = document.createElement('img');
        img.src = art.img; img.alt = ''; img.draggable = false;
        a.appendChild(img);
      } else {
        a.classList.add('generic');
        const h = document.createElement('h3'); h.textContent = g.title;
        const p = document.createElement('p'); p.textContent = g.description;
        a.append(h, p);
      }
      slot.appendChild(a); track.appendChild(slot);
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

  /* ---------- تعامل کارت: تیلت سه‌بعدی + انفجار ستاره + ورود ---------- */
  function enhance(a) {
    if (matchMedia('(pointer:fine)').matches) {
      a.addEventListener('pointermove', e => {
        const r = a.getBoundingClientRect();
        a.style.setProperty('--ry', ((e.clientX - r.left) / r.width - .5) * 14 + 'deg');
        a.style.setProperty('--rx', (.5 - (e.clientY - r.top) / r.height) * 12 + 'deg');
      });
      a.addEventListener('pointerleave', () => { a.style.setProperty('--rx', '0deg'); a.style.setProperty('--ry', '0deg'); });
    }
    a.addEventListener('click', e => {
      burst(e.clientX || innerWidth / 2, e.clientY || innerHeight / 2);
      hand.classList.add('hide');
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

  /* ---------- نقطه‌ها (موبایل) ---------- */
  function center(i) {
    const t = track.getBoundingClientRect(), c = slots[i].getBoundingClientRect();
    track.scrollBy({ left: c.left + c.width / 2 - (t.left + t.width / 2), behavior: 'smooth' });
  }
  function markDot() {
    const mid = track.getBoundingClientRect().left + track.clientWidth / 2;
    let best = 0, bd = 1e9;
    slots.forEach((s, i) => { const r = s.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - mid); if (d < bd) { bd = d; best = i; } });
    [...dotsEl.children].forEach((d, i) => d.classList.toggle('on', i === best));
  }
  track.addEventListener('scroll', () => requestAnimationFrame(markDot), { passive: true });
  ['pointerdown', 'wheel', 'keydown'].forEach(ev => addEventListener(ev, () => hand.classList.add('hide'), { once: true }));

  /* ---------- ربات ---------- */
  const robot = document.getElementById('robot'), bubble = document.getElementById('bubble');
  const LINES = ['سلام! بزن بریم بازی 🎮', 'دوستات رو خبر کن!', 'امروز شانست باهاته 🍀', 'یه دست بازز بزنیم؟ 🔴', 'اسم و فامیل؟ من آماده‌ام! ✏️', 'بازنده‌ی این دور شیرینی می‌خره!'];
  let li = 0, bt;
  const say = t => { bubble.textContent = t; bubble.classList.add('show'); clearTimeout(bt); bt = setTimeout(() => bubble.classList.remove('show'), 2600); };
  robot.onclick = () => { robot.classList.remove('jump'); void robot.offsetWidth; robot.classList.add('jump'); say(LINES[li++ % LINES.length]); };
  setTimeout(() => say(LINES[0]), 1800);

  /* ---------- لوگو ---------- */
  const logo = document.querySelector('.logo');
  logo.addEventListener('click', () => { logo.classList.remove('wiggle'); void logo.offsetWidth; logo.classList.add('wiggle'); });

  /* ---------- تاس ---------- */
  const dice = document.getElementById('dice'), rollEl = document.getElementById('roll');
  let rt;
  dice.onclick = () => {
    dice.classList.remove('rolling'); void dice.offsetWidth; dice.classList.add('rolling');
    rollEl.classList.remove('show'); clearTimeout(rt);
    rt = setTimeout(() => {
      const n = 1 + Math.floor(Math.random() * 6);
      rollEl.textContent = n === 6 ? 'شش! 🎉' : `${fa(n)} اومد!`;
      rollEl.classList.add('show'); rt = setTimeout(() => rollEl.classList.remove('show'), 2000);
    }, 550);
  };

  /* ---------- جعبه‌ی سؤال ---------- */
  const block = document.getElementById('block'), coin = document.getElementById('coin');
  const TIPS = ['برای هر بازی حداقل ۲ نفر لازمه.', 'اتاق بساز و لینکش رو برای دوستات بفرست!', 'کارت رو بزن تا وارد بازی بشی.', 'بازنده‌ها هم برنده‌ی خنده‌ان 😄'];
  let ti = 0;
  block.onclick = () => { block.classList.remove('bump'); coin.classList.remove('fly'); void block.offsetWidth; block.classList.add('bump'); coin.classList.add('fly'); say(TIPS[ti++ % TIPS.length]); };

  /* ---------- پارالاکس ---------- */
  const scene = document.getElementById('scene');
  document.querySelectorAll('[data-depth]').forEach(el => el.style.setProperty('--d', el.dataset.depth));
  if (matchMedia('(pointer:fine)').matches) {
    scene.addEventListener('pointermove', e => {
      scene.style.setProperty('--mx', (e.clientX / innerWidth - .5).toFixed(3));
      scene.style.setProperty('--my', (e.clientY / innerHeight - .5).toFixed(3));
    });
  }
  load();
})();
