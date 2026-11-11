(() => {
  const root = document.getElementById('games-list');
  if (!root) return;

  const palettes = [
    { bg: '#f5eaff', accent: '#9b65dc', dark: '#6336a8', name: 'violet' },
    { bg: '#e5f8e9', accent: '#43c66f', dark: '#1e8c49', name: 'green' },
    { bg: '#e3f3ff', accent: '#2799e6', dark: '#1267b2', name: 'blue' },
    { bg: '#fff0d8', accent: '#ff9c37', dark: '#b95a17', name: 'orange' },
    { bg: '#ffe7f0', accent: '#ed649b', dark: '#a83269', name: 'pink' }
  ];

  const art = {
    buzzer: `<svg viewBox="0 0 160 140" aria-hidden="true"><ellipse cx="80" cy="126" rx="53" ry="8" fill="#173b68" opacity=".18"/><path d="M34 94h92l-9 24H43z" fill="#304f8d"/><path d="M39 89c0-9 8-16 17-16h48c9 0 17 7 17 16v12H39z" fill="#f6a62f"/><path d="M46 79c0-30 15-48 34-48s34 18 34 48v13H46z" fill="#f34f5f" stroke="#cb344b" stroke-width="5"/><ellipse cx="80" cy="35" rx="34" ry="10" fill="#ff8e98"/><path d="M80 14V5M58 22l-7-9M102 22l7-9" stroke="#ffd24f" stroke-width="7" stroke-linecap="round"/><path d="M66 65q14 13 28 0" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M61 79h38" stroke="#ffb0b7" stroke-width="4" stroke-linecap="round"/></svg>`,
    words: `<svg viewBox="0 0 160 140" aria-hidden="true"><path d="M15 31q0-17 17-17h48q17 0 17 17v29q0 17-17 17H51L31 96V77q-16 0-16-17z" fill="#39c69a"/><path d="M69 48q0-17 17-17h43q17 0 17 17v30q0 17-17 17h-20l-20 17V95q-20 0-20-17z" fill="#ff637b"/><path d="M36 44l12 12 22-25M89 62l10 10 19-22" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="34" cy="111" r="6" fill="#ffd14e"/><circle cx="137" cy="20" r="6" fill="#ffd14e"/></svg>`,
    dice: `<svg viewBox="0 0 160 140" aria-hidden="true"><g transform="rotate(-13 57 72)"><rect x="18" y="36" width="70" height="70" rx="16" fill="#fff" stroke="#d7e8f7" stroke-width="5"/><g fill="#478bd0"><circle cx="36" cy="54" r="5"/><circle cx="70" cy="54" r="5"/><circle cx="53" cy="71" r="5"/><circle cx="36" cy="88" r="5"/><circle cx="70" cy="88" r="5"/></g></g><g transform="rotate(12 105 77)"><rect x="83" y="43" width="62" height="62" rx="15" fill="#fff" stroke="#d7e8f7" stroke-width="5"/><g fill="#ef687b"><circle cx="100" cy="60" r="5"/><circle cx="128" cy="60" r="5"/><circle cx="100" cy="88" r="5"/><circle cx="128" cy="88" r="5"/></g></g></svg>`,
    charades: `<svg viewBox="0 0 160 140" aria-hidden="true"><path d="M17 29q0-15 15-15h43q15 0 15 15v42q0 15-15 15H52L32 103V86q-15 0-15-15z" fill="#ffca50"/><path d="M77 45q0-15 15-15h38q15 0 15 15v39q0 15-15 15h-21l-18 17v-17q-14 0-14-15z" fill="#4e9de7"/><path d="M35 48q13 13 26 0M97 62q11 11 22 0" fill="none" stroke="#855a20" stroke-width="5" stroke-linecap="round"/><circle cx="43" cy="35" r="4" fill="#855a20"/><circle cx="65" cy="35" r="4" fill="#855a20"/><circle cx="106" cy="48" r="4" fill="#fff"/><circle cx="126" cy="48" r="4" fill="#fff"/></svg>`,
    quiz: `<svg viewBox="0 0 160 140" aria-hidden="true"><path d="M80 14c-28 0-46 19-46 43 0 17 10 29 23 39 7 5 10 12 10 20h26c0-8 3-15 10-20 13-10 23-22 23-39 0-24-18-43-46-43z" fill="#ffd45b" stroke="#e9ac36" stroke-width="5"/><path d="M63 116h34M67 127h26" stroke="#547ea8" stroke-width="7" stroke-linecap="round"/><path d="M65 57q15-20 30 0-15 12-30 0z" fill="#fff"/><path d="M80 57v21" stroke="#e69c2e" stroke-width="5" stroke-linecap="round"/><path d="M80 5v-2M27 25l-8-8M133 25l8-8" stroke="#f4b83c" stroke-width="5" stroke-linecap="round"/></svg>`,
    bomb: `<svg viewBox="0 0 160 140" aria-hidden="true"><circle cx="78" cy="78" r="43" fill="#283c73" stroke="#182b59" stroke-width="6"/><path d="M88 34l14-17 15 7-12 22" fill="none" stroke="#a16a37" stroke-width="9" stroke-linecap="round"/><path d="M116 15l5-9m3 17 10-4m-20-8 1-10" stroke="#ffcb45" stroke-width="5" stroke-linecap="round"/><circle cx="62" cy="65" r="6" fill="#fff"/><circle cx="93" cy="65" r="6" fill="#fff"/><path d="M62 91q16 13 32 0" fill="none" stroke="#cbd8ff" stroke-width="5" stroke-linecap="round"/><path d="M28 38l8-13m-19 2 12-2m-1 20 1-12" stroke="#ffd34f" stroke-width="5" stroke-linecap="round"/></svg>`,
    wheel: `<svg viewBox="0 0 160 140" aria-hidden="true"><circle cx="80" cy="70" r="53" fill="#fff" stroke="#446da6" stroke-width="9"/><path d="M80 20A50 50 0 0 1 127 53L80 70z" fill="#ffca45"/><path d="M127 53A50 50 0 0 1 109 111L80 70z" fill="#ef6588"/><path d="M109 111A50 50 0 0 1 51 111L80 70z" fill="#45c78c"/><path d="M51 111A50 50 0 0 1 33 53L80 70z" fill="#4da7e8"/><path d="M33 53A50 50 0 0 1 80 20L80 70z" fill="#9c73df"/><circle cx="80" cy="70" r="12" fill="#fff" stroke="#d8a637" stroke-width="5"/><path d="M80 7l-12 16h24z" fill="#ff765f" stroke="#fff" stroke-width="3"/></svg>`,
    default: `<svg viewBox="0 0 160 140" aria-hidden="true"><rect x="25" y="28" width="110" height="82" rx="20" fill="#fff" stroke="#d7e9f8" stroke-width="5"/><path d="M50 53h60M50 72h45M50 91h30" stroke="#4d9ed1" stroke-width="7" stroke-linecap="round"/><circle cx="126" cy="29" r="17" fill="#ffce57"/><path d="M126 19v13M126 40h.1" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>`
  };
  const people = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-1a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM1.5 20c0-4 3-6.5 7.5-6.5s7.5 2.5 7.5 6.5v1h-15zm15-6c4-.4 6 2 6 5v2h-4v-1c0-2.5-.7-4.5-2-6Z"/></svg>`;

  function artFor(game) {
    const id = String(game.id || '').toLowerCase();
    const title = String(game.title || '').toLowerCase();
    if (id.includes('buzzer') || title.includes('بازر')) return art.buzzer;
    if (id.includes('word') || title.includes('کلمه') || title.includes('اسرافامیل')) return art.words;
    if (id.includes('charade') || title.includes('پانتومیم')) return art.charades;
    if (id.includes('quiz') || title.includes('کوییز') || title.includes('سوال')) return art.quiz;
    if (id.includes('dice') || title.includes('منچ') || title.includes('تاس')) return art.dice;
    return art.default;
  }

  function createCard(game, index) {
    const palette = palettes[index % palettes.length];
    const card = document.createElement('a');
    card.className = 'game-card';
    card.href = game.path || '#';
    card.style.setProperty('--card-bg', palette.bg);
    card.style.setProperty('--card-accent', palette.accent);
    card.style.setProperty('--card-dark', palette.dark);
    if (String(game.id || '').toLowerCase() === 'buzzer' || String(game.title || '').includes('بازر')) card.classList.add('featured');

    const visual = document.createElement('div');
    visual.className = 'game-visual';
    visual.innerHTML = artFor(game);
    const title = document.createElement('h3');
    title.textContent = game.title || 'بازی گروهی';
    const description = document.createElement('p');
    description.textContent = game.description || 'یه بازی جذاب برای دورهمی‌های دوستانه.';
    const meta = document.createElement('div');
    meta.className = 'game-meta';
    const players = document.createElement('span');
    players.className = 'players-pill';
    players.innerHTML = people;
    const count = document.createElement('span');
    count.textContent = `حداقل ${game.minPlayers || 2} نفر`;
    players.appendChild(count);
    const arrow = document.createElement('span');
    arrow.className = 'card-arrow';
    arrow.textContent = '←';
    arrow.setAttribute('aria-hidden', 'true');
    meta.append(players, arrow);
    card.append(visual, title, description, meta);
    return card;
  }

  function createComingSoon(title, description, illustration, index) {
    const palette = palettes[index % palettes.length];
    const card = document.createElement('div');
    card.className = 'game-card coming-soon';
    card.style.setProperty('--card-bg', palette.bg);
    card.style.setProperty('--card-accent', palette.accent);
    card.style.setProperty('--card-dark', palette.dark);
    const visual = document.createElement('div');
    visual.className = 'game-visual';
    visual.innerHTML = illustration;
    const badge = document.createElement('span');
    badge.className = 'soon-label';
    badge.textContent = 'به‌زودی';
    const heading = document.createElement('h3');
    heading.textContent = title;
    const text = document.createElement('p');
    text.textContent = description;
    const footer = document.createElement('div');
    footer.className = 'game-meta';
    footer.innerHTML = '<span class="soon-meta">این بازی هنوز فعال نشده</span><span class="lock-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5z"/></svg></span>';
    card.append(visual, badge, heading, text, footer);
    return card;
  }

  async function loadGames() {
    root.innerHTML = '<div class="loading-card"><span class="loader"></span><p>داریم بازی‌ها رو می‌چینیم...</p></div>';
    try {
      const response = await fetch('/api/games', { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const games = await response.json();
      root.replaceChildren();
      if (!Array.isArray(games) || games.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-card';
        empty.textContent = 'هنوز بازی‌ای اینجا نیست؛ به‌زودی کلی بازی اضافه می‌کنیم!';
        root.appendChild(empty);
        return;
      }
      const buzzer = games.find(g => String(g.id || '').toLowerCase().includes('buzzer') || String(g.title || '').includes('بازر'));
      const others = games.filter(g => g !== buzzer);
      let cardIndex = 0;
      root.appendChild(createComingSoon('بمب سوالی', 'برای جواب دادن قبل از انفجار آماده‌ای؟', art.bomb, cardIndex++));
      others.forEach(game => root.appendChild(createCard(game, cardIndex++)));
      if (buzzer) root.appendChild(createCard(buzzer, cardIndex++));
      root.appendChild(createComingSoon('پانتومیم', 'بدون حرف زدن، کلمه رو به دوستات برسون!', art.charades, cardIndex++));
      root.appendChild(createComingSoon('گردونه شانس', 'بچرخون و ببین شانست با کدوم تیمه!', art.wheel, cardIndex++));
    } catch (error) {
      console.error('Could not load games:', error);
      const box = document.createElement('div');
      box.className = 'error-card';
      const message = document.createElement('p');
      message.textContent = 'دریافت فهرست بازی‌ها انجام نشد؛ اتصال سرور رو بررسی کن.';
      const retry = document.createElement('button');
      retry.className = 'retry-button';
      retry.type = 'button';
      retry.textContent = 'تلاش دوباره';
      retry.addEventListener('click', loadGames);
      box.append(message, retry);
      root.replaceChildren(box);
    }
  }
  loadGames();
})();
