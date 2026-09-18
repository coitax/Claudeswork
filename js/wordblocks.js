const WordBlocks = (() => {
  const COLS = 4;
  const TARGET_CLEARS = 20;
  const FREEZE_MS = 1200;
  const MIN_FALL = 4000;
  const MAX_FALL = 12000;
  const DEFAULT_ANSWER_MS = 3500;
  const WINDOW_SIZE = 10;
  const BLOCK_H = 52;
  const POP_MS = 320;

  let root = null;
  let playfieldEl = null;
  let trayEl = null;
  let dangerEl = null;
  let overlayEl = null;
  let optionBtns = [];
  let hud = { score: null, combo: null, level: null, fill: null };

  let opts = null;
  let pool = [];
  let poolIdx = 0;
  let respawnQueue = [];
  let seenWords = null;
  let knownWords = null;
  let blocks = [];
  let stacks = [];

  let running = false;
  let paused = false;
  let rafId = null;
  let lastTs = 0;
  let spawnTimer = 0;
  let timeouts = [];

  let fieldW = 0;
  let fieldH = 0;
  let colW = 0;
  let rowCap = 0;
  let dangerRow = 0;

  let score = 0;
  let streak = 0;
  let maxCombo = 1;
  let level = 1;
  let cleared = 0;
  let correctCount = 0;
  let totalCount = 0;
  let answerTimes = [];
  let answerResults = [];
  let easeUp = 1;
  let feedKnown = 0;

  let activeBlock = null;
  let activeSince = 0;
  let blockSeq = 0;

  let onVisibility = null;
  let onResize = null;

  function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function median(arr) {
    if (!arr.length) return DEFAULT_ANSWER_MS;
    const s = arr.slice().sort((x, y) => x - y);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }

  function later(fn, ms) {
    const id = setTimeout(fn, ms);
    timeouts.push(id);
    return id;
  }

  /* ---------- DOM ---------- */

  function buildDOM(container) {
    UI.clear(container);
    root = UI.create('div', 'wb-root');

    const hudRow = UI.create('div', 'wb-hud');
    const left = UI.create('div', 'wb-hud-group');
    hud.score = UI.create('span', 'wb-score', '0');
    left.appendChild(UI.create('span', 'wb-hud-label', 'SCORE'));
    left.appendChild(hud.score);
    const mid = UI.create('div', 'wb-hud-group');
    hud.combo = UI.create('span', 'wb-combo', '');
    mid.appendChild(hud.combo);
    const right = UI.create('div', 'wb-hud-group');
    hud.level = UI.create('span', 'wb-level', 'LV 1');
    right.appendChild(hud.level);
    hudRow.appendChild(left);
    hudRow.appendChild(mid);
    hudRow.appendChild(right);
    root.appendChild(hudRow);

    const progress = UI.create('div', 'wb-progress');
    hud.fill = UI.create('div', 'wb-progress-fill');
    progress.appendChild(hud.fill);
    root.appendChild(progress);

    playfieldEl = UI.create('div', 'wb-playfield');
    for (let c = 1; c < COLS; c++) {
      const guide = UI.create('div', 'wb-col-guide');
      guide.style.left = (c * 25) + '%';
      playfieldEl.appendChild(guide);
    }
    dangerEl = UI.create('div', 'wb-danger-line');
    playfieldEl.appendChild(dangerEl);
    root.appendChild(playfieldEl);

    trayEl = UI.create('div', 'wb-tray');
    optionBtns = [];
    for (let i = 0; i < 4; i++) {
      const btn = UI.create('button', 'wb-option', '');
      btn.type = 'button';
      btn.addEventListener('click', onOptionClick);
      trayEl.appendChild(btn);
      optionBtns.push(btn);
    }
    root.appendChild(trayEl);

    container.appendChild(root);
  }

  function measure() {
    const rect = playfieldEl.getBoundingClientRect();
    fieldW = rect.width;
    fieldH = rect.height;
    colW = fieldW / COLS;
    rowCap = Math.max(4, Math.floor(fieldH / BLOCK_H));
    dangerRow = Math.max(2, Math.ceil(rowCap * 0.8));
    dangerEl.style.top = (fieldH - dangerRow * BLOCK_H) + 'px';
  }

  function updateHUD() {
    hud.score.textContent = String(score);
    const combo = comboMultiplier();
    hud.combo.textContent = streak > 0
      ? (combo > 1 ? 'x' + combo + ' ' : '') + streak + ' STREAK'
      : '';
    hud.combo.classList.toggle('hot', combo > 1);
    hud.level.textContent = 'LV ' + level;
    hud.fill.style.width = clamp((cleared / TARGET_CLEARS) * 100, 0, 100) + '%';
  }

  function comboMultiplier() {
    if (streak >= 10) return 3;
    if (streak >= 5) return 2;
    return 1;
  }

  /* ---------- Word queue + spawning ---------- */

  function maxConcurrent() {
    if (level >= 4) return 5;
    if (level >= 2) return 4;
    return 3;
  }

  function currentFallDuration() {
    let fd = clamp(2.2 * median(answerTimes), MIN_FALL, MAX_FALL);
    fd *= Math.pow(0.92, level - 1);
    fd *= easeUp;
    return clamp(fd, 2500, MAX_FALL * 1.5);
  }

  function spawnInterval() {
    return currentFallDuration() / maxConcurrent();
  }

  function nextEntry() {
    for (let i = 0; i < respawnQueue.length; i++) {
      respawnQueue[i].delay--;
    }
    for (let i = 0; i < respawnQueue.length; i++) {
      if (respawnQueue[i].delay <= 0) {
        return respawnQueue.splice(i, 1)[0].entry;
      }
    }
    if (feedKnown > 0 && knownWords.size > 0) {
      feedKnown--;
      const known = pool.filter((p) => knownWords.has(p.word));
      if (known.length) {
        return known[Math.floor(Math.random() * known.length)];
      }
    }
    const entry = pool[poolIdx % pool.length];
    poolIdx++;
    return entry;
  }

  function pickColumn() {
    let minStack = Infinity;
    for (let c = 0; c < COLS; c++) {
      if (stacks[c].length < minStack) minStack = stacks[c].length;
    }
    const busy = {};
    blocks.forEach((b) => {
      if (b.y < BLOCK_H * 1.5) busy[b.col] = true;
    });
    let candidates = [];
    for (let c = 0; c < COLS; c++) {
      if (stacks[c].length === minStack && !busy[c]) candidates.push(c);
    }
    if (!candidates.length) {
      for (let c = 0; c < COLS; c++) {
        if (!busy[c]) candidates.push(c);
      }
    }
    if (!candidates.length) return -1;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function spawnBlock() {
    if (blocks.length >= maxConcurrent()) return;
    const col = pickColumn();
    if (col < 0) return;

    const entry = nextEntry();
    const preTaught = !seenWords.has(entry.word);
    seenWords.add(entry.word);

    const el = UI.create('div', 'wb-block' + (preTaught ? ' wb-new' : ''));
    el.style.width = (colW - 6) + 'px';
    const inner = UI.create('div', 'wb-block-inner');
    inner.appendChild(UI.create('span', 'wb-block-es', entry.word));
    if (preTaught) {
      inner.appendChild(UI.create('span', 'wb-block-en', entry.en));
    }
    el.appendChild(inner);
    playfieldEl.appendChild(el);

    let fd = currentFallDuration();
    if (preTaught) fd *= 1.6;

    const block = {
      id: blockSeq++,
      el: el,
      col: col,
      y: -BLOCK_H,
      speed: (fieldH - BLOCK_H) / fd,
      entry: entry,
      preTaught: preTaught,
      frozen: false,
      freezeT: 0,
      revealEl: null
    };
    positionBlock(block);
    blocks.push(block);
    updateActive();
  }

  function positionBlock(block) {
    const x = block.col * colW + 3;
    block.el.style.transform = 'translate3d(' + x + 'px, ' + block.y + 'px, 0)';
  }

  function queueRespawn(entry) {
    respawnQueue.push({ entry: entry, delay: 2 + Math.floor(Math.random() * 3) });
  }

  /* ---------- Game loop ---------- */

  function tick(ts) {
    if (!running) return;
    rafId = requestAnimationFrame(tick);

    if (!lastTs) lastTs = ts;
    let dt = ts - lastTs;
    lastTs = ts;
    if (paused) return;
    dt = Math.min(dt, 100);

    if (!fieldH) {
      measure();
      if (!fieldH) return;
    }

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnBlock();
      spawnTimer = spawnInterval();
    }

    const landed = [];
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (b.frozen) {
        b.freezeT -= dt;
        if (b.freezeT <= 0) unfreeze(b);
        continue;
      }
      b.y += b.speed * dt;
      const landY = fieldH - (stacks[b.col].length + 1) * BLOCK_H;
      if (b.y >= landY) {
        b.y = landY;
        landed.push(b);
      }
      positionBlock(b);
    }

    for (let i = 0; i < landed.length; i++) {
      settleBlock(landed[i]);
    }
  }

  function settleBlock(block) {
    const idx = blocks.indexOf(block);
    if (idx >= 0) blocks.splice(idx, 1);

    block.el.classList.add('wb-settled');
    block.el.classList.remove('wb-active');
    if (block.revealEl) {
      block.revealEl.remove();
      block.revealEl = null;
      block.el.classList.remove('wb-frozen', 'wb-shake');
    }
    stacks[block.col].push(block.el);
    queueRespawn(block.entry);

    if (block === activeBlock) {
      answerResults.push(false);
      if (answerResults.length > WINDOW_SIZE) answerResults.shift();
      evaluateRubberBand();
    }
    updateActive();
    updateDanger();

    if (stacks[block.col].length >= rowCap) {
      endRound(false);
    }
  }

  function updateDanger() {
    let inDanger = false;
    for (let c = 0; c < COLS; c++) {
      if (stacks[c].length >= dangerRow) inDanger = true;
    }
    dangerEl.classList.toggle('wb-danger-flash', inDanger);
  }

  function updateActive() {
    let lowest = null;
    for (let i = 0; i < blocks.length; i++) {
      if (!lowest || blocks[i].y > lowest.y) lowest = blocks[i];
    }
    if (lowest === activeBlock) return;
    if (activeBlock && activeBlock.el) {
      activeBlock.el.classList.remove('wb-active');
    }
    activeBlock = lowest;
    if (activeBlock) {
      activeBlock.el.classList.add('wb-active');
      activeSince = performance.now();
    }
    renderTray();
  }

  /* ---------- Tray + answers ---------- */

  function renderTray() {
    if (!activeBlock) {
      optionBtns.forEach((btn) => {
        btn.textContent = '···';
        btn.disabled = true;
        btn.classList.remove('wb-wrong-flash');
        delete btn.dataset.correct;
      });
      return;
    }
    const correctEn = activeBlock.entry.en;
    const distractors = [];
    const used = { };
    used[correctEn.toLowerCase()] = true;
    const shuffled = shuffle(pool);
    for (let i = 0; i < shuffled.length && distractors.length < 3; i++) {
      const en = shuffled[i].en;
      if (!used[en.toLowerCase()]) {
        used[en.toLowerCase()] = true;
        distractors.push(en);
      }
    }
    while (distractors.length < 3) {
      distractors.push('---');
    }
    const options = shuffle([correctEn].concat(distractors));
    optionBtns.forEach((btn, i) => {
      btn.textContent = options[i];
      btn.disabled = false;
      btn.classList.remove('wb-wrong-flash');
      btn.dataset.correct = options[i] === correctEn ? '1' : '0';
    });
  }

  function onOptionClick(e) {
    if (!running || paused || !activeBlock) return;
    const btn = e.currentTarget;
    if (btn.disabled || btn.textContent === '---') return;

    totalCount++;
    if (btn.dataset.correct === '1') {
      handleCorrect();
    } else {
      handleWrong(btn);
    }
    updateHUD();
  }

  function handleCorrect() {
    const ms = performance.now() - activeSince;
    pushWindow(ms, true);

    correctCount++;
    cleared++;
    streak++;
    const combo = comboMultiplier();
    if (combo > maxCombo) maxCombo = combo;
    score += 10 * combo;
    knownWords.add(activeBlock.entry.word);
    Audio8Bit.correct();

    const block = activeBlock;
    const idx = blocks.indexOf(block);
    if (idx >= 0) blocks.splice(idx, 1);
    activeBlock = null;
    block.el.classList.remove('wb-active', 'wb-frozen', 'wb-shake');
    block.el.classList.add('wb-pop');
    later(() => {
      block.el.remove();
    }, POP_MS);

    updateActive();
    if (cleared >= TARGET_CLEARS) {
      endRound(true);
    }
  }

  function handleWrong(btn) {
    pushWindow(null, false);
    streak = 0;
    Audio8Bit.wrong();
    btn.classList.add('wb-wrong-flash');

    const block = activeBlock;
    if (!block.frozen) {
      block.frozen = true;
      block.freezeT = FREEZE_MS;
      block.el.classList.add('wb-frozen', 'wb-shake');
      if (!block.revealEl) {
        block.revealEl = UI.create('span', 'wb-reveal', block.entry.en);
        block.el.appendChild(block.revealEl);
      }
    } else {
      block.freezeT = FREEZE_MS;
    }
  }

  function unfreeze(block) {
    block.frozen = false;
    block.el.classList.remove('wb-frozen', 'wb-shake');
    if (block.revealEl) {
      block.revealEl.remove();
      block.revealEl = null;
    }
  }

  function pushWindow(ms, ok) {
    answerResults.push(ok);
    if (answerResults.length > WINDOW_SIZE) answerResults.shift();
    if (ms !== null) {
      answerTimes.push(ms);
      if (answerTimes.length > WINDOW_SIZE) answerTimes.shift();
    }
    evaluateRubberBand();
  }

  function evaluateRubberBand() {
    if (answerResults.length < WINDOW_SIZE) return;
    const hits = answerResults.filter((r) => r).length;
    const acc = hits / answerResults.length;
    if (acc > 0.9 && median(answerTimes) < 4000) {
      level++;
      easeUp = Math.max(1, easeUp * 0.9);
      answerResults = [];
      Audio8Bit.levelUp();
      hud.level.classList.add('wb-level-up');
      later(() => {
        hud.level.classList.remove('wb-level-up');
      }, 900);
    } else if (acc < 0.6) {
      easeUp *= 1.12;
      feedKnown = 3;
      answerResults = [];
    }
  }

  /* ---------- Session flow ---------- */

  function resetState() {
    pool = [];
    poolIdx = 0;
    respawnQueue = [];
    seenWords = new Set();
    knownWords = new Set();
    blocks = [];
    stacks = [];
    for (let c = 0; c < COLS; c++) stacks.push([]);
    running = false;
    paused = false;
    rafId = null;
    lastTs = 0;
    spawnTimer = 0;
    fieldW = 0;
    fieldH = 0;
    colW = 0;
    score = 0;
    streak = 0;
    maxCombo = 1;
    level = 1;
    cleared = 0;
    correctCount = 0;
    totalCount = 0;
    answerTimes = [];
    answerResults = [];
    easeUp = 1;
    feedKnown = 0;
    activeBlock = null;
    blockSeq = 0;
  }

  function start(container, options) {
    stop();
    resetState();
    opts = options || {};
    pool = (opts.words || []).filter((w) => w && w.word && w.en);
    if (pool.length < 4) {
      if (opts.onComplete) {
        opts.onComplete({ correct: 0, total: 0, maxCombo: 1, cleared: 0 });
      }
      return;
    }
    pool = shuffle(pool);

    buildDOM(container);

    onVisibility = () => {
      paused = document.hidden;
      root.classList.toggle('wb-paused', paused);
    };
    document.addEventListener('visibilitychange', onVisibility);
    onResize = () => {
      if (running) measure();
    };
    window.addEventListener('resize', onResize);

    running = true;
    spawnTimer = 600;
    updateHUD();
    renderTray();
    requestAnimationFrame(() => {
      measure();
      rafId = requestAnimationFrame(tick);
    });
  }

  function endRound(survived) {
    if (!running) return;
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;

    overlayEl = UI.create('div', 'wb-over');
    overlayEl.appendChild(UI.create('div', 'wb-over-title',
      survived ? 'ROUND CLEAR!' : 'STACK OVERFLOW!'));
    overlayEl.appendChild(UI.create('div', 'wb-over-sub',
      cleared + ' CLEARED · ' + score + ' PTS'));
    playfieldEl.appendChild(overlayEl);

    const results = {
      correct: correctCount,
      total: totalCount,
      maxCombo: maxCombo,
      cleared: cleared
    };
    const cb = opts && opts.onComplete;
    later(() => {
      if (cb) cb(results);
    }, 1600);
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    timeouts.forEach((id) => clearTimeout(id));
    timeouts = [];
    if (onVisibility) {
      document.removeEventListener('visibilitychange', onVisibility);
      onVisibility = null;
    }
    if (onResize) {
      window.removeEventListener('resize', onResize);
      onResize = null;
    }
    if (root && root.parentNode) {
      root.parentNode.removeChild(root);
    }
    root = null;
    playfieldEl = null;
    trayEl = null;
    dangerEl = null;
    overlayEl = null;
    optionBtns = [];
    activeBlock = null;
    blocks = [];
  }

  return { start, stop };
})();
