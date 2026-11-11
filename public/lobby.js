(() => {
  const root = document.getElementById('games-list');
  if (!root) return;

  const palette = [
    { bg: '#fce8ef', accent: '#ed7298', dark: '#bd4c75' },
    { bg: '#e7f8ef', accent: '#39b985', dark: '#21865f' },
    { bg: '#e7f3ff', accent: '#328ed5', dark: '#176db8' },
    { bg: '#fff3d9', accent: '#efa934', dark: '#a66b14' },
    { bg: '#f0eaff', accent: '#9670df', dark: '#6945b5' },
  ];

  const icons = {
    buzzer: `<svg viewBox="0 0 120 110" aria-hidden="true"><ellipse cx="60" cy="96" rx="42" ry="7" fill="#234a75" opacity=".12"/><path d="M25 72h70l-7 19H32z" fill="#315d91"/><path d="M30 69c0-6 6-11 13-11h34c7 0 13 5 13 11v8H30z" fill="#f5a53b"/><path d="M35 62c0-18 11-31 25-31s25 13 25 31v8H35z" fill="#f25f69" stroke="#c94555" stroke-width="4"/><ellipse cx="60" cy="34" rx="25" ry="8" fill="#ff9a9c"/><path d="M60 13v-7M45 18l-5-6M75 18l5-6" stroke="#f5b83d" stroke-width="5" stroke-linecap="round"/><path d="M50 48q10 8 20 0" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>`,
    words: `<svg viewBox="0 0 120 110" aria-hidden="true"><path d="M12 25q0-12 13-12h39q13 0 13 12v24q0 12-13 12H42L27 73v-12q-15 0-15-12z" fill="#49c5a0"/><path d="M53 43q0-12 13-12h31q13 0 13 12v22q0 12-13 12H84L70 88V77q-17 0-17-12z" fill="#ff8d9b"/><path d="M29 34l8 8 15-17M70 52l7 7 13-15" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="37" cy="86" r="5" fill="#f6c34c"/><circle cx="101" cy="19" r="5" fill="#f6c34c"/></svg>`,
    dice: `<svg viewBox="0 0 120 110" aria-hidden="true"><g transform="rotate(-12 43 55)"><rect x="13" y="28" width="53" height="53" rx="12" fill="#fff" stroke="#d8e8f6" stroke-width="4"/><g fill="#4788c7"><circle cx="27" cy="42" r="4"/><circle cx="52" cy="42" r="4"/><circle cx="39" cy="54" r="4"/><circle cx="27" cy="67" r="4"/><circle cx="52" cy="67" r="4"/></g></g><g transform="rotate(12 78 58)"><rect x="57" y="34" width="50" height="50" rx="12" fill="#fff" stroke="#d8e8f6" stroke-width="4"/><g fill="#ef777e"><circle cx="70" cy="47" r="4"/><circle cx="94" cy="47" r="4"/><circle cx="70" cy="71" r="4"/><circle cx="94" cy="71" r="4"/></g></g></svg>`,
    charades: `<svg viewBox="0 0 120 110" aria-hidden="true"><path d="M17 24q0-11 12-11h34q12 0 12 11v32q0 12-12 12H43L29 80V68q-12 0-12-12z" fill="#ffcc58"/><path d="M52 37q0-11 12-11h32q12 0 12 11v31q0 12-12 12H82L68 91V80q-16 0-16-12z" fill="#5b9ee5"/><path d="M31 39q9 9 18 0M68 53q8 8 16 0" fill="none" stroke="#7c5920" stroke-width="4" stroke-linecap="round"/><circle cx="38" cy="31" r="3" fill="#7c5920"/><circle cx="53" cy="31" r="3" fill="#7c5920"/><circle cx="75" cy="45" r="3" fill="#fff"/><circle cx="91" cy="45" r="3" fill="#fff"/></svg>`,
    quiz: `<svg viewBox="0 0 120 110" aria-hidden="true"><path d="M60 12c-20 0-33 14-33 31 0 13 7 21 17 28 5 4 7 9 7 14h19c0-5 2-10 7-14 10-7 17-15 17-28 0-17-14-31-34-31z" fill="#ffd45b" stroke="#e8a92e" stroke-width="4"/><path d="M48 88h24M51 96h18" stroke="#6d8eb5" stroke-width="5" stroke-linecap="round"/><path d="M49 46q11-15 22 0-11 8-22 0z" fill="#fff"/><path d="M60 46v16" stroke="#e69c2e" stroke-width="4" stroke-linecap="round"/><path d="M60 4v-3M21 18l-5-5M99 18l5-5" stroke="#f2b841" stroke-width="4" stroke-linecap="round"/></svg>`,
    default: `<svg viewBox="0 0 120 110" aria-hidden="true"><rect x="20" y="22" width="80" height="61" rx="16" fill="#fff" stroke="#d7e9f8" stroke-width="4"/><path d="M43 42h34M43 55h24M43 68h15" stroke="#4d9ed1" stroke-width="5" stroke-linecap="round"/><circle cx="89" cy="28" r="13" fill="#ffce57"/><path d="M89 21v9M89 35h.1" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>`
  };

  const peopleIcon = `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7.5 9.2a3.1 3.1 0 1 0 0-6.2 3.1 3.1 0 0 0 0 6.2ZM14.2 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.5 16.8c0-3.1 2.5-5.3 6-5.3s6 2.2 6 5.3v.7h-12v-.7ZM13 12c3.1-.4 5.5 1.6 5.5 4.5v1h-3.7v-.7c0-1.9-.6-3.5-1.8-4.8Z"/></svg>`;

  function iconFor(game) {
    const id = String(game.id || '').toLowerCase();
    const title = String(game.title || '').toLowerCase();
    if (id.includes('buzzer') || title.includes('بازر')) return icons.buzzer;
    if (id.includes('word') || title.includes('کلمه')) return icons.words;
    if (id.includes('charade') || title.includes('پانتومیم')) return icons.charades;
    if (id.includes('quiz') || title.includes('کوییز') || title.includes('سوال')) return icons.quiz;
    if (id.includes('dice') || title.includes('منچ') || title.includes('تاس')) return icons.dice;
    return icons.default;
  }

  function makeCard(game, index) {
    const card = document.createElement('a');
    card.className = 'game-card';
    card.href = game.path || '#';
    card.style.setProperty('--accent', palette[index % palette.length].accent);
    card.style.setProperty('--accent-dark', palette[index % palette.length].dark);
    card.style.setProperty('--accent-light', palette[index % palette.length].bg);
    card.setAttribute('aria-label', `${game.title}؛ حداقل ${game.minPlayers} نفر`);
    if (String(game.id || '').toLowerCase() === 'buzzer' || String(game.title || '').includes('بازر')) card.classList.add('featured');

    const visual = document.createElement('div');
    visual.className = 'game-visual';
    visual.innerHTML = iconFor(game);

    const title = document.createElement('h3');
    title.textContent = game.title || 'بازی گروهی';

    const description = document.createElement('p');
    description.textContent = game.description || 'یه بازی جذاب برای دورهمی‌های دوستانه.';

    const meta = document.createElement('div');
    meta.className = 'game-meta';
    const players = document.createElement('span');
    players.className = 'players-pill';
    players.innerHTML = peopleIcon;
    const count = document.createElement('span');
    count.textContent = `حداقل ${game.minPlayers || 2} نفر`;
    players.appendChild(count);
    const arrow = document.createElement('span');
    arrow.className = 'card-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '←';
    meta.append(players, arrow);
    card.append(visual, title, description, meta);
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
        empty.innerHTML = '<p>هنوز بازی‌ای اینجا نیست؛ به‌زودی کلی بازی اضافه می‌کنیم!</p>';
        root.appendChild(empty);
        return;
      }
      games.forEach((game, index) => root.appendChild(makeCard(game, index)));
    } catch (error) {
      console.error('Could not load games:', error);
      const errorBox = document.createElement('div');
      errorBox.className = 'error-card';
      const message = document.createElement('p');
      message.textContent = 'دریافت فهرست بازی‌ها انجام نشد؛ اتصال سرور رو بررسی کن.';
      const retry = document.createElement('button');
      retry.className = 'retry-button';
      retry.type = 'button';
      retry.textContent = 'تلاش دوباره';
      retry.addEventListener('click', loadGames);
      errorBox.append(message, retry);
      root.replaceChildren(errorBox);
    }
  }

  loadGames();
})();
