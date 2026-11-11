document.addEventListener('DOMContentLoaded', () => {
  const track = document.getElementById('cardsTrack');
  const cards = Array.from(document.querySelectorAll('.game-card'));
  const dots = Array.from(document.querySelectorAll('.dot'));
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  let currentIndex = 2; // کارت پیش‌فرض مسابقه با بازر (مرکز)

  function updateCarousel(index) {
    if (index < 0) index = 0;
    if (index >= cards.length) index = cards.length - 1;
    currentIndex = index;

    cards.forEach((card, i) => {
      card.classList.toggle('featured-card', i === currentIndex);
      card.classList.toggle('active', i === currentIndex);
    });

    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentIndex);
    });

    // انیمیشن نرم برای حرکت به سمت کارت فعال در ابعاد کوچک‌تر
    const targetCard = cards[currentIndex];
    if (targetCard && window.innerWidth <= 992) {
      targetCard.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }

  // رویدادهای ناوبری
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      updateCarousel(currentIndex > 0 ? currentIndex - 1 : cards.length - 1);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      updateCarousel(currentIndex < cards.length - 1 ? currentIndex + 1 : 0);
    });
  }

  // کلیک روی نقاط صفحه‌بندی
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const idx = parseInt(dot.getAttribute('data-index'), 10);
      updateCarousel(idx);
    });
  });

  // هاور و کلیک روی کارت‌ها
  cards.forEach((card, i) => {
    card.addEventListener('mouseenter', () => updateCarousel(i));
  });

  // پشتیبانی از کلیدهای کیبورد (راست و چپ)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') updateCarousel(currentIndex < cards.length - 1 ? currentIndex + 1 : 0);
    if (e.key === 'ArrowRight') updateCarousel(currentIndex > 0 ? currentIndex - 1 : cards.length - 1);
  });
});