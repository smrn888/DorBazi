(async () => {
  const el = document.getElementById('games');
  try {
    const games = await (await fetch('/api/games')).json();
    el.innerHTML = '';
    for (const g of games) {
      const a = document.createElement('a');
      a.className = 'card';
      a.href = g.path;

      const icon = document.createElement('div');
      icon.className = 'icon';
      icon.textContent = g.icon;

      const h = document.createElement('h2');
      h.textContent = g.title;

      const p = document.createElement('p');
      p.textContent = g.description;

      const s = document.createElement('span');
      s.textContent = `حداقل ${g.minPlayers} نفر`;

      a.append(icon, h, p, s);
      el.appendChild(a);
    }
  } catch {
    el.innerHTML = '<p class="msg">خطا در دریافت بازی‌ها. صفحه را رفرش کنید.</p>';
  }
})();