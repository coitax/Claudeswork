const UI = (() => {
  let currentScreen = 'screen-title';

  function show(screenId, animation) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach((s) => s.classList.remove('active', 'anim-slide-in', 'anim-slide-back', 'anim-fade-in'));

    const target = document.getElementById(screenId);
    if (!target) return;

    if (animation) target.classList.add(animation);
    target.classList.add('active');
    currentScreen = screenId;

    target.scrollTop = 0;
  }

  function getCurrentScreen() {
    return currentScreen;
  }

  function el(id) {
    return document.getElementById(id);
  }

  function create(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function clear(element) {
    element.innerHTML = '';
  }

  function renderHearts(current, max) {
    let s = '';
    for (let i = 0; i < max; i++) {
      s += i < current ? '♥' : '♡';
    }
    return s;
  }

  function updateHUD(player) {
    const lvl = el('hud-level');
    const xpFill = el('hud-xp-fill');
    if (lvl) lvl.textContent = 'LV ' + player.level;
    if (xpFill) xpFill.style.width = (Game.getXPProgress(player) * 100) + '%';
  }

  function updateExerciseHearts(player) {
    const h = el('exercise-hearts');
    if (h) h.textContent = renderHearts(player.hearts, player.maxHearts);
  }

  function updateExerciseProgress(current, total) {
    const fill = el('exercise-progress-fill');
    if (fill) fill.style.width = (total > 0 ? (current / total) * 100 : 0) + '%';
  }

  function showStreak(streak) {
    const banner = el('streak-banner');
    const count = el('streak-count');
    if (!banner || !count) return;
    if (streak.count > 0) {
      banner.style.display = 'block';
      count.textContent = streak.count;
    } else {
      banner.style.display = 'none';
    }
  }

  function animateXP(targetEl, amount) {
    if (!targetEl) return;
    targetEl.textContent = '+' + amount + ' XP';
    targetEl.style.animation = 'none';
    targetEl.offsetHeight;
    targetEl.style.animation = 'pop-in 0.5s ease';
  }

  function showFeedback(container, isCorrect, message) {
    const existing = container.querySelector('.exercise-feedback');
    if (existing) existing.remove();

    const fb = create('div', 'exercise-feedback ' + (isCorrect ? 'correct' : 'wrong'));
    fb.textContent = isCorrect ? '✓ Correct!' : message || '✗ Wrong!';
    container.appendChild(fb);
    return fb;
  }

  function addNextButton(container, callback) {
    const existing = container.querySelector('.exercise-next-btn');
    if (existing) return;

    const btn = create('button', 'retro-btn primary exercise-next-btn', 'NEXT');
    btn.addEventListener('click', () => {
      Audio8Bit.select();
      callback();
    });
    container.appendChild(btn);
  }

  return {
    show, getCurrentScreen, el, create, clear,
    renderHearts, updateHUD, updateExerciseHearts, updateExerciseProgress,
    showStreak, animateXP, showFeedback, addNextButton
  };
})();
