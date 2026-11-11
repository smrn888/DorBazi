(() => {
  /* ---------- نقشه‌ی بازی‌ها به تصویر و رنگ ---------- */
  const THEMES = [
    { key: 'bomb',    match: /بمب/,       img: '07_card_bomb_quiz',          top: '#6c32ce', bot: '#4a1ea5' },
    { key: 'word',    match: /حدس|کلمه/,  img: '08_card_word_quiz',          top: '#13a533', bot: '#067a25' },
    { key: 'buzzer',  match: /بازز|مسابقه/, img: '09_card_button_competition', top: '#1f66cc', bot: '#0a45a8', featured: true },
    { key: 'charade', match: /بانتر|میم/, img: '10_card_charades',           top: '#f5911a', bot: '#dc6204' },
    { key: 'wheel',   match: /گردونه|شانس/, img: '11_card_wheel_of_fortune',  top: '#f0609b', bot: '#cf2f6c' },
  ];
  // اگر API در دسترس نبود، همین نمونه‌ها نمایش داده می‌شن
  const FALLBACK = [
    { title: 'بمب سؤالی', description: 'پاسخ بده، قبل از انفجار!', minPlayers: 2, path: '#' },
    { title: 'حدس کلمه', description: 'کلمه رو از روی سرنخ‌ها حدس بزن!', minPlayers: 2, path: '#' },
    { title: 'مسابقه با بازز', description: 'رقابت هیجانی رو شروع کن!', minPlayers: 2, path: '#' },
    { title: 'بانتر میم', description: 'با تقلید، کلمه رو به بقیه بفهمون!', minPlayers: 2, path: '#' },
    { title: 'گردونه شانس', description: 'بچرخون و ببین شانست چیه!', minPlayers: 2, path: '#' },
  ];
  const fa = n => Number(n).toLocaleString('fa-IR');
  const PERSON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z"/></svg>';

  const track = document.getElementById('games-list');
  const dotsEl = document.getElementById('dots');
  const hand = document.getElementById('hand');
  let cards = [], active = -1, lock = 0;

  /* ---------- ساخت کارت‌ها ---------- */
  async function load() {
    let games;
    try {
      const res = await fetch('/api/games');
      if (!res.ok) throw 0;
      games = await res.json();
    } catch { games = FALLBACK; }
    render(games);
  }

  function render(games) {
    track.innerHTML = '';
    cards = games.map((g, i) => {
      const t = THEMES.find(t => t.match.test(g.title)) || THEMES[i % THEMES.length];
      const a = document.createElement('a');
      a.className = 'card';
      a.href = g.path;
      a.style.cssText = `--i:${i};--top:${t.top};--bot:${t.bot}`;
      a.innerHTML = `
        
        <img class="art" src="img/${t.img}.png" alt="">
        <div class="body"><h3></h3><p></p><span class="pill">${PERSON}<span class="min"></span></span></div>
        <span class="play">بزن بریم! ←</span>`;
      a.querySelector('h3').textContent = g.title;
      a.querySelector('p').textContent = g.description;
      a.querySelector('.min').textContent = `حداقل ${fa(g.minPlayers)} نفر`;
      a._featured = !!t.featured;
      // کلیک روی کارت غیرفعال → میاد وسط؛ روی کارت وسط → وارد بازی می‌شی
      a.addEventListener('click', e => {
        if (cards.indexOf(a) !== active) { e.preventDefault(); goTo(cards.indexOf(a)); }
      });
      track.appendChild(a);
      return a;
    });
    dotsEl.innerHTML = '';
    cards.forEach((_, i) => {
      const d = document.createElement('button');
      d.className = 'dot'; d.type = 'button'; d.setAttribute('aria-label', `بازی ${fa(i + 1)}`);
      d.onclick = () => goTo(i);
      dotsEl.appendChild(d);
    });
    const start = Math.max(0, cards.findIndex(c => c._featured));
    setActive(start);
    const recenter = () => goTo(active < 0 ? start : active, true);
    requestAnimationFrame(recenter); setTimeout(recenter, 500); addEventListener('load', recenter); addEventListener('resize', recenter);
  }

  /* ---------- حرکت ---------- */
  function setActive(i) {
    if (i === active) return;
    active = i;
    cards.forEach((c, k) => c.classList.toggle('is-active', k === i));
    [...dotsEl.children].forEach((d, k) => d.classList.toggle('on', k === i));
  }
  function goTo(i, instant) {
    i = Math.min(cards.length - 1, Math.max(0, i));
    setActive(i); lock = Date.now() + (instant ? 150 : 750);
    const c = cards[i], tr = track.getBoundingClientRect(), cr = c.getBoundingClientRect();
    track.scrollBy({ left: cr.left + cr.width / 2 - (tr.left + tr.width / 2), behavior: instant ? 'auto' : 'smooth' });
  }
  // وقتی با انگشت/ماوس اسکرول می‌کنی، نزدیک‌ترین کارت به مرکز فعال می‌شه
  let tick;
  track.addEventListener('scroll', () => {
    if (Date.now() < lock) return;
    cancelAnimationFrame(tick);
    tick = requestAnimationFrame(() => {
      const mid = track.getBoundingClientRect().left + track.clientWidth / 2;
      let best = 0, bd = 1e9;
      cards.forEach((c, k) => {
        const r = c.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - mid);
        if (d < bd) { bd = d; best = k; }
      });
      setActive(best);
    });
  }, { passive: true });

  // در RTL کارت بعدی سمت چپ است
  document.getElementById('goLeft').onclick = () => goTo(active + 1);
  document.getElementById('goRight').onclick = () => goTo(active - 1);
  track.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(active + 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(active - 1); }
  });
  // دست اشاره‌گر فقط تا وقتی کسی کاری نکرده نشون داده می‌شه
  ['pointerdown', 'wheel', 'keydown'].forEach(ev => addEventListener(ev, () => hand.classList.add('hide'), { once: true }));

  /* ---------- ربات ---------- */
  const robot = document.getElementById('robot'), bubble = document.getElementById('bubble');
  const LINES = ['سلام! بزن بریم بازی 🎮', 'دوستات رو خبر کن!', 'امروز شانست باهاته 🍀', 'من آماده‌ام، تو چی؟', 'یه دست بازز بزنیم؟ 🔴', 'بازنده‌ی این دور شیرینی می‌خره!'];
  let li = 0, bt;
  function say(text) {
    bubble.textContent = text; bubble.classList.add('show');
    clearTimeout(bt); bt = setTimeout(() => bubble.classList.remove('show'), 2600);
  }
  robot.onclick = () => {
    robot.classList.remove('jump'); void robot.offsetWidth; robot.classList.add('jump');
    say(LINES[li++ % LINES.length]);
  };
  setTimeout(() => say(LINES[0]), 1400);

  /* ---------- تاس ---------- */
  const dice = document.getElementById('dice'), rollEl = document.getElementById('roll');
  let rt;
  dice.onclick = () => {
    dice.classList.remove('rolling'); void dice.offsetWidth; dice.classList.add('rolling');
    rollEl.classList.remove('show');
    clearTimeout(rt);
    rt = setTimeout(() => {
      const n = 1 + Math.floor(Math.random() * 6);
      rollEl.textContent = n === 6 ? 'شش! 🎉' : `${fa(n)} اومد!`;
      rollEl.classList.add('show');
      rt = setTimeout(() => rollEl.classList.remove('show'), 2000);
    }, 550);
  };

  /* ---------- جعبه سؤال ---------- */
  const block = document.getElementById('block'), coin = document.getElementById('coin');
  const TIPS = ['برای هر بازی حداقل ۲ نفر لازمه.', 'اتاق بساز و لینکش رو برای دوستات بفرست!', 'کارت وسط رو بزن تا وارد بازی بشی.', 'بازنده‌ها هم برنده‌ی خنده‌ان 😄'];
  let ti = 0;
  block.onclick = () => {
    block.classList.remove('bump'); coin.classList.remove('fly'); void block.offsetWidth;
    block.classList.add('bump'); coin.classList.add('fly');
    say(TIPS[ti++ % TIPS.length]);
  };

  /* ---------- پارالاکس ملایم با ماوس ---------- */
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
