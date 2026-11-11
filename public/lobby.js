(() => {
  const list = document.getElementById('games-list');
  const dotsWrap = document.getElementById('carouselDots');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  if (!list) return;

  const cardStyles = {
    'buzzer': {
      className: 'blue',
      icon: 'assets/icon-buzzer.svg',
      featured: true,
      subtitle: 'رقابت هیجان‌دار با اطلاعات عمومی',
      label: 'محبوب‌ترین',
    },
    'esm-famil': {
      className: 'green',
      icon: 'assets/icon-words.svg',
      featured: false,
      subtitle: 'کلمه بساز، امتیاز بگیر و سریع جواب بده',
      label: '',
    },
    'default': {
      className: 'purple',
      icon: 'assets/icon-words.svg',
      featured: false,
      subtitle: 'یه بازی جذاب برای دورهمی‌های آنلاین',
      label: '',
    }
  };

  const peopleIcon = 'assets/icon-people.svg';
  let gamesData = [];
  let currentIndex = 0;

  function normalizeGame(game) {
    const id = String(game.id || '').toLowerCase();
    const title = String(game.title || 'بازی گروهی');
    if (id.includes('buzzer') || title.includes('بازر')) {
      return { ...game, id: 'buzzer' };
    }
    if (id.includes('esm') || id.includes('famil') || title.includes('اسم')) {
      return { ...game, id: 'esm-famil' };
    }
    return game;
  }

  function createCard(game) {
    const look = cardStyles[game.id] || cardStyles.default;
    const card = document.createElement('a');
    card.className = `game-card ${look.className}`;
    card.href = game.path || '#';
    card.setAttribute('aria-label', `${game.title}، حداقل ${game.minPlayers || 2} نفر`);

    if (look.featured) {
      const frame = document.createElement('div');
      frame.className = 'featured-frame';
      const badge = document.createElement('div');
      badge.className = 'featured-badge';
      badge.innerHTML = `<img class="crown-icon" src="assets/crown-mini.svg" alt="" aria-hidden="true"> ${look.label}`;
      card.append(frame, badge);
    }

    const visual = document.createElement('div');
    visual.className = 'card-top';
    visual.innerHTML = `<img src="${look.icon}" alt="" aria-hidden="true">`;

    const title = document.createElement('h3');
    title.textContent = game.title || 'بازی گروهی';

    const desc = document.createElement('p');
    desc.textContent = game.description || look.subtitle;

    const badge = document.createElement('div');
    badge.className = 'players-badge';
    badge.innerHTML = `<img src="${peopleIcon}" alt="" aria-hidden="true"><span>حداقل ${game.minPlayers || 2} نفر</span>`;

    card.append(visual, title, desc, badge);
    return card;
  }

  function updateDots() {
    if (!dotsWrap) return;
    [...dotsWrap.children].forEach((dot, index) => {
      dot.classList.toggle('active', index === currentIndex);
      dot.setAttribute('aria-current', index === currentIndex ? 'true' : 'false');
    });
  }

  function updateButtons() {
    const isMobile = window.innerWidth <= 980;
    if (!prevBtn || !nextBtn) return;
    if (!isMobile || gamesData.length <= 1) {
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      return;
    }
    prevBtn.disabled = currentIndex <= 0;
    nextBtn.disabled = currentIndex >= gamesData.length - 1;
  }

  function updateCarousel() {
    const cards = [...list.querySelectorAll('.game-card')];
    const isMobile = window.innerWidth <= 980;
    cards.forEach((card, index) => {
      if (isMobile) {
        card.style.display = index === currentIndex ? 'flex' : 'none';
      } else {
        card.style.display = 'flex';
      }
    });
    updateDots();
    updateButtons();
  }

  function renderDots(count) {
    if (!dotsWrap) return;
    dotsWrap.innerHTML = '';
    if (count <= 1) return;
    for (let i = 0; i < count; i += 1) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('aria-label', `رفتن به کارت ${i + 1}`);
      btn.addEventListener('click', () => {
        currentIndex = i;
        updateCarousel();
      });
      dotsWrap.appendChild(btn);
    }
  }

  async function loadGames() {
    list.innerHTML = '<div class="loading-card"><span class="loader"></span><p>داریم کارت‌های بازی رو می‌چینیم...</p></div>';
    try {
      const response = await fetch('/api/games', { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rawGames = await response.json();
      const filtered = (Array.isArray(rawGames) ? rawGames : [])
        .map(normalizeGame)
        .filter(game => game.id === 'buzzer' || game.id === 'esm-famil');

      const order = ['esm-famil', 'buzzer'];
      gamesData = filtered.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

      list.replaceChildren();

      if (gamesData.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-card';
        empty.innerHTML = '<p>فعلاً هیچ بازی آماده نیست. بعداً دوباره سر بزن.</p>';
        list.appendChild(empty);
        renderDots(0);
        updateButtons();
        return;
      }

      gamesData.forEach(game => list.appendChild(createCard(game)));
      currentIndex = Math.min(currentIndex, Math.max(0, gamesData.length - 1));
      renderDots(gamesData.length);
      updateCarousel();
    } catch (error) {
      console.error('Could not load games:', error);
      const errorBox = document.createElement('div');
      errorBox.className = 'error-card';
      errorBox.innerHTML = '<p>دریافت فهرست بازی‌ها انجام نشد؛ اتصال سرور رو بررسی کن.</p>';
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.textContent = 'تلاش دوباره';
      retry.addEventListener('click', loadGames);
      errorBox.appendChild(retry);
      list.replaceChildren(errorBox);
      renderDots(0);
      updateButtons();
    }
  }

  prevBtn?.addEventListener('click', () => {
    if (currentIndex > 0) {
      currentIndex -= 1;
      updateCarousel();
    }
  });

  nextBtn?.addEventListener('click', () => {
    if (currentIndex < gamesData.length - 1) {
      currentIndex += 1;
      updateCarousel();
    }
  });

  window.addEventListener('resize', updateCarousel);
  loadGames();
})();
