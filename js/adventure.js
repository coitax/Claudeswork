const Adventure = (() => {
  // --- Constants ---
  const VW = 320;
  const VH = 180;
  const STEP = 1 / 60;
  const MAX_DELTA = 0.25;
  const GROUND_Y = 150;
  const PLAYER_SPEED = 62;
  const TALK_RANGE = 24;
  const COOLDOWN_RANGE = 34;
  const SPRITE_W = 14;
  const SPRITE_H = 22;
  const LETTERBOX_COLOR = '#10101c';

  // --- State ---
  let opts = null;
  let running = false;
  let paused = false;
  let inConversation = false;
  let rafId = 0;
  let lastTime = 0;
  let accumulator = 0;
  let worldTime = 0;
  let displayCanvas = null;
  let displayCtx = null;
  let backCanvas = null;
  let bctx = null;
  let scale = 1;
  let offX = 0;
  let offY = 0;
  let cameraX = 0;
  let worldLength = 0;
  let player = null;
  let npcs = [];
  let completedCount = 0;
  let completeFired = false;
  let promptNpc = null;
  let prevAction = false;
  let controlsEl = null;
  let listeners = [];
  let activePointers = new Map();
  let playerFrames = null;
  const input = { left: false, right: false, action: false };

  // --- Deterministic PRNG (mulberry32) ---
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function clamp(v, min, max) {
    return v < min ? min : (v > max ? max : v);
  }

  // --- Sprite data (paletted string grids, 14 wide) ---
  const BODY_ROWS = [
    '....hhhhhh....',
    '...hhhhhhhh...',
    '...hsssssss...',
    '...hsessses...',
    '...hssssss....',
    '....ssssss....',
    '.....ssss.....',
    '...tttttttt...',
    '..tttttttttt..',
    '..ssttttttss..',
    '..ssttttttss..',
    '..ssttttttss..',
    '..s.tttttt.s..',
    '....tttttt....',
    '....pppppp....'
  ];

  const HAT_ROWS = [
    '...aaaaaaaa...',
    '..aaaaaaaaaa..'
  ];

  const LEG_FRAMES = [
    [
      '....pp..pp....',
      '....pp..pp....',
      '....pp..pp....',
      '....pp..pp....',
      '....pp..pp....',
      '...bbb..bbb...',
      '...bbb..bbb...'
    ],
    [
      '...ppp..ppp...',
      '...pp....pp...',
      '..ppp....ppp..',
      '..pp......pp..',
      '..pp......pp..',
      '.bbb......bbb.',
      '.bbb......bbb.'
    ],
    [
      '....pppppp....',
      '....pppppp....',
      '.....pppp.....',
      '.....pppp.....',
      '.....pp.pp....',
      '....bbb.bb....',
      '....bbb.bbb...'
    ]
  ];

  const WALK_SEQ = [0, 1, 0, 2];

  const PLAYER_PALETTE = {
    h: '#5a3a22',
    s: '#f0c8a0',
    e: '#1a1a2e',
    t: '#e94560',
    p: '#2b4a8b',
    b: '#3a2a1a'
  };

  const NPC_HAIR = ['#222233', '#f5c842', '#8b3a2a', '#d0d0d8', '#4a2a5a'];
  const NPC_SHIRT = ['#4ade80', '#60a5fa', '#a78bfa', '#f5c842', '#e8e8e8'];
  const NPC_PANTS = ['#3a3a4a', '#6b4a2a', '#2b4a8b', '#5a2a3a'];
  const NPC_SKIN = ['#f0c8a0', '#d8a878', '#b07850'];
  const NPC_HAT = ['#e94560', '#f5c842', '#e8e8e8', '#4a5a2a'];

  const HEART_GRID = [
    '.xx.xx.',
    'xxxxxxx',
    'xxxxxxx',
    '.xxxxx.',
    '..xxx..',
    '...x...'
  ];

  // --- Tiny 3x5 pixel font ---
  const FONT = {
    '0': ['111', '101', '101', '101', '111'],
    '1': ['010', '110', '010', '010', '111'],
    '2': ['111', '001', '111', '100', '111'],
    '3': ['111', '001', '111', '001', '111'],
    '4': ['101', '101', '111', '001', '001'],
    '5': ['111', '100', '111', '001', '111'],
    '6': ['111', '100', '111', '101', '111'],
    '7': ['111', '001', '010', '010', '010'],
    '8': ['111', '101', '111', '101', '111'],
    '9': ['111', '101', '111', '001', '111'],
    '/': ['001', '001', '010', '100', '100'],
    '!': ['010', '010', '010', '000', '010'],
    'A': ['010', '101', '111', '101', '101'],
    'B': ['110', '101', '110', '101', '110'],
    'H': ['101', '101', '111', '101', '101'],
    'L': ['100', '100', '100', '100', '111']
  };

  // --- Sprite pre-rendering ---
  function buildSprite(rows, palette, mirror) {
    const c = document.createElement('canvas');
    c.width = SPRITE_W;
    c.height = rows.length;
    const g = c.getContext('2d');
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y];
      for (let x = 0; x < SPRITE_W; x++) {
        const ch = mirror ? row[SPRITE_W - 1 - x] : row[x];
        const color = palette[ch];
        if (!color) continue;
        g.fillStyle = color;
        g.fillRect(x, y, 1, 1);
      }
    }
    return c;
  }

  function characterRows(legFrame, hat) {
    const head = hat ? HAT_ROWS.concat(BODY_ROWS.slice(2)) : BODY_ROWS;
    return head.concat(LEG_FRAMES[legFrame]);
  }

  function buildPlayerFrames() {
    playerFrames = { r: [], l: [] };
    for (let f = 0; f < LEG_FRAMES.length; f++) {
      const rows = characterRows(f, false);
      playerFrames.r.push(buildSprite(rows, PLAYER_PALETTE, false));
      playerFrames.l.push(buildSprite(rows, PLAYER_PALETTE, true));
    }
  }

  function buildNpcSprites(npc, seed) {
    const rnd = mulberry32(seed);
    const palette = {
      h: NPC_HAIR[Math.floor(rnd() * NPC_HAIR.length)],
      s: NPC_SKIN[Math.floor(rnd() * NPC_SKIN.length)],
      e: '#1a1a2e',
      t: NPC_SHIRT[Math.floor(rnd() * NPC_SHIRT.length)],
      p: NPC_PANTS[Math.floor(rnd() * NPC_PANTS.length)],
      b: '#3a2a1a',
      a: NPC_HAT[Math.floor(rnd() * NPC_HAT.length)]
    };
    const hat = rnd() < 0.4;
    const rows = characterRows(0, hat);
    npc.spriteR = buildSprite(rows, palette, false);
    npc.spriteL = buildSprite(rows, palette, true);
    npc.bobPhase = rnd() * Math.PI * 2;
  }

  // --- Backbuffer text / glyph helpers ---
  function drawText(str, x, y, color, px) {
    const size = px || 1;
    bctx.fillStyle = color;
    let cx = x;
    for (let i = 0; i < str.length; i++) {
      const glyph = FONT[str[i]];
      if (!glyph) {
        cx += 4 * size;
        continue;
      }
      for (let gy = 0; gy < 5; gy++) {
        for (let gx = 0; gx < 3; gx++) {
          if (glyph[gy][gx] === '1') {
            bctx.fillRect(cx + gx * size, y + gy * size, size, size);
          }
        }
      }
      cx += 4 * size;
    }
  }

  function textWidth(str, px) {
    const size = px || 1;
    return str.length * 4 * size - size;
  }

  function drawGridShape(grid, x, y, color) {
    bctx.fillStyle = color;
    for (let gy = 0; gy < grid.length; gy++) {
      for (let gx = 0; gx < grid[gy].length; gx++) {
        if (grid[gy][gx] === 'x') {
          bctx.fillRect(x + gx, y + gy, 1, 1);
        }
      }
    }
  }

  // --- Input: keyboard + touch overlay ---
  function addL(target, type, fn, options) {
    target.addEventListener(type, fn, options);
    listeners.push([target, type, fn, options]);
  }

  function resetInput() {
    input.left = false;
    input.right = false;
    input.action = false;
  }

  function onKeyDown(e) {
    if (inConversation) return;
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') {
      input.left = true;
      e.preventDefault();
    } else if (k === 'ArrowRight' || k === 'd' || k === 'D') {
      input.right = true;
      e.preventDefault();
    } else if (k === ' ' || k === 'e' || k === 'E' || k === 'Enter') {
      input.action = true;
      e.preventDefault();
    }
  }

  function onKeyUp(e) {
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') {
      input.left = false;
    } else if (k === 'ArrowRight' || k === 'd' || k === 'D') {
      input.right = false;
    } else if (k === ' ' || k === 'e' || k === 'E' || k === 'Enter') {
      input.action = false;
    }
  }

  function bindButton(btn, key) {
    addL(btn, 'pointerdown', function (e) {
      e.preventDefault();
      try {
        btn.setPointerCapture(e.pointerId);
      } catch (err) { /* capture unsupported */ }
      activePointers.set(e.pointerId, { el: btn, key: key });
      input[key] = true;
      btn.classList.add('pressed');
    });
    function release(e) {
      const entry = activePointers.get(e.pointerId);
      if (!entry || entry.key !== key) return;
      activePointers.delete(e.pointerId);
      input[key] = false;
      btn.classList.remove('pressed');
      try {
        btn.releasePointerCapture(e.pointerId);
      } catch (err) { /* already released */ }
    }
    addL(btn, 'pointerup', release);
    addL(btn, 'pointercancel', release);
  }

  function createControls(parent) {
    if (!parent) return;
    controlsEl = document.createElement('div');
    controlsEl.id = 'street-controls';
    const defs = [
      ['street-btn-left', '◀', 'left'],
      ['street-btn-right', '▶', 'right'],
      ['street-btn-action', 'HABLA', 'action']
    ];
    for (let i = 0; i < defs.length; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = defs[i][0];
      btn.className = 'street-btn';
      btn.textContent = defs[i][1];
      bindButton(btn, defs[i][2]);
      controlsEl.appendChild(btn);
    }
    addL(controlsEl, 'contextmenu', function (e) {
      e.preventDefault();
    });
    parent.appendChild(controlsEl);
  }

  // --- Display scaling ---
  function resize() {
    if (!displayCanvas) return;
    const parent = displayCanvas.parentElement;
    const availW = (parent && parent.clientWidth) || displayCanvas.clientWidth || VW;
    const availH = (parent && parent.clientHeight) || displayCanvas.clientHeight || VH;
    scale = Math.max(1, Math.floor(Math.min(availW / VW, availH / VH)));
    displayCanvas.width = Math.max(availW, VW);
    displayCanvas.height = Math.max(availH, VH);
    offX = Math.floor((displayCanvas.width - VW * scale) / 2);
    offY = Math.floor((displayCanvas.height - VH * scale) / 2);
    displayCtx.imageSmoothingEnabled = false;
  }

  function onOrientation() {
    resize();
    setTimeout(resize, 300);
  }

  // --- World setup ---
  function setupWorld(list) {
    npcs = [];
    completedCount = 0;
    completeFired = false;
    promptNpc = null;
    let x = 190;
    for (let i = 0; i < list.length; i++) {
      const data = list[i];
      const seed = typeof data.spriteSeed === 'number'
        ? data.spriteSeed >>> 0
        : hashString(String(data.spriteSeed || data.id || i));
      const rnd = mulberry32(seed ^ 0x9e3779b9);
      x += Math.floor(rnd() * 50);
      const npc = { data: data, x: x, completed: false, cooldown: false };
      buildNpcSprites(npc, seed);
      npcs.push(npc);
      x += 210;
    }
    const lastX = npcs.length ? npcs[npcs.length - 1].x : 200;
    worldLength = lastX + 80;
    player = { x: 20, facing: 1, moving: false, animTime: 0 };
    cameraX = 0;
  }

  // --- Simulation (fixed timestep) ---
  function update(dt) {
    const move = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (move !== 0) {
      player.facing = move;
      player.moving = true;
      player.animTime += dt;
      player.x = clamp(player.x + move * PLAYER_SPEED * dt, 0, worldLength - SPRITE_W);
    } else {
      player.moving = false;
      player.animTime = 0;
    }

    cameraX = clamp(player.x + SPRITE_W / 2 - VW / 2, 0, Math.max(0, worldLength - VW));

    const pc = player.x + SPRITE_W / 2;
    promptNpc = null;
    for (let i = 0; i < npcs.length; i++) {
      const npc = npcs[i];
      const d = Math.abs(pc - (npc.x + SPRITE_W / 2));
      if (npc.cooldown && d > COOLDOWN_RANGE) npc.cooldown = false;
      if (!npc.completed && !npc.cooldown && d < TALK_RANGE) {
        if (!promptNpc || d < Math.abs(pc - (promptNpc.x + SPRITE_W / 2))) {
          promptNpc = npc;
        }
      }
    }

    const pressed = input.action && !prevAction;
    prevAction = input.action;
    if (pressed && promptNpc && !inConversation) {
      startEncounter(promptNpc);
      return;
    }

    if (!completeFired && npcs.length > 0 && completedCount === npcs.length &&
        player.x + SPRITE_W >= worldLength - 2) {
      completeFired = true;
      if (opts && typeof opts.onComplete === 'function') {
        opts.onComplete({ talked: completedCount, total: npcs.length });
      }
    }
  }

  // --- Encounters ---
  function startEncounter(npc) {
    inConversation = true;
    npc.cooldown = true;
    resetInput();
    prevAction = true;
    if (typeof Audio8Bit !== 'undefined' && Audio8Bit.select) Audio8Bit.select();
    let finished = false;
    function done(success) {
      if (finished) return;
      finished = true;
      if (success && !npc.completed) {
        npc.completed = true;
        completedCount++;
      }
      if (!running) return;
      inConversation = false;
      resetInput();
      prevAction = true;
      lastTime = performance.now();
      accumulator = 0;
    }
    if (opts && typeof opts.onEncounter === 'function') {
      opts.onEncounter(npc.data, done);
    } else {
      done(false);
    }
  }

  // --- Rendering: sky + parallax layers ---
  const SKY_BANDS = [
    ['#20335f', 30],
    ['#2c4a7c', 24],
    ['#3f6ea5', 22],
    ['#6fa3c8', 16],
    ['#e8c08a', 10]
  ];
  const CLOUDS = [
    [40, 16, 26],
    [150, 30, 34],
    [240, 12, 22],
    [90, 40, 30]
  ];
  const FAR_COLORS = ['#1c2750', '#22305e', '#182144'];
  const WALL_COLORS = ['#9a5f45', '#b07a50', '#7d5a68', '#5d6d92', '#a8874f', '#8f4f4f'];
  const TRIM_COLORS = ['#7c4b36', '#8f613f', '#644754', '#485776', '#886c3d', '#733f3f'];

  function drawCloud(x, y, w) {
    bctx.fillStyle = 'rgba(240, 244, 255, 0.85)';
    bctx.fillRect(x, y + 3, w, 5);
    bctx.fillRect(x + 4, y, w - 10, 4);
    bctx.fillRect(x + 3, y + 8, w - 6, 3);
  }

  function renderSky() {
    let y = 0;
    for (let i = 0; i < SKY_BANDS.length; i++) {
      bctx.fillStyle = SKY_BANDS[i][0];
      bctx.fillRect(0, y, VW, SKY_BANDS[i][1]);
      y += SKY_BANDS[i][1];
    }
    bctx.fillStyle = '#f5c842';
    bctx.fillRect(252, 18, 12, 12);
    bctx.fillStyle = '#ffe9a0';
    bctx.fillRect(255, 21, 6, 6);
    const wrap = VW + 80;
    for (let i = 0; i < CLOUDS.length; i++) {
      const c = CLOUDS[i];
      let cx = (c[0] - cameraX * 0.05 + worldTime * (3 + i)) % wrap;
      if (cx < 0) cx += wrap;
      drawCloud(Math.floor(cx) - 40, c[1], c[2]);
    }
  }

  function renderFarBuildings() {
    bctx.fillStyle = '#2a3766';
    bctx.fillRect(0, 108, VW, 26);
    const spacing = 56;
    const layerX = cameraX * 0.2;
    const first = Math.floor(layerX / spacing) - 1;
    const last = Math.floor((layerX + VW) / spacing) + 1;
    for (let i = first; i <= last; i++) {
      const rnd = mulberry32(i * 7919 + 101);
      const h = 26 + Math.floor(rnd() * 44);
      const w = 34 + Math.floor(rnd() * 18);
      const x = Math.floor(i * spacing - layerX);
      bctx.fillStyle = FAR_COLORS[((i % 3) + 3) % 3];
      bctx.fillRect(x, 120 - h, w, h);
      if (rnd() < 0.4) {
        bctx.fillRect(x + Math.floor(w / 2) - 1, 120 - h - 6, 2, 6);
      }
    }
  }

  function renderNearBuildings() {
    const spacing = 88;
    const layerX = cameraX * 0.5;
    const bottom = 134;
    const first = Math.floor(layerX / spacing) - 1;
    const last = Math.floor((layerX + VW) / spacing) + 1;
    for (let i = first; i <= last; i++) {
      const rnd = mulberry32(i * 5077 + 4242);
      const ci = Math.floor(rnd() * WALL_COLORS.length);
      const w = 66 + Math.floor(rnd() * 18);
      const h = 54 + Math.floor(rnd() * 46);
      const x = Math.floor(i * spacing - layerX);
      const top = bottom - h;
      bctx.fillStyle = WALL_COLORS[ci];
      bctx.fillRect(x, top, w, h);
      bctx.fillStyle = TRIM_COLORS[ci];
      bctx.fillRect(x, top, w, 4);
      bctx.fillRect(x, bottom - 3, w, 3);
      const cols = Math.floor((w - 12) / 15);
      const rows = Math.floor((h - 22) / 16);
      for (let ry = 0; ry < rows; ry++) {
        for (let cx = 0; cx < cols; cx++) {
          const lit = rnd() < 0.3;
          const wx = x + 8 + cx * 15;
          const wy = top + 8 + ry * 16;
          bctx.fillStyle = lit ? '#f5c842' : '#26334f';
          bctx.fillRect(wx, wy, 8, 10);
          bctx.fillStyle = TRIM_COLORS[ci];
          bctx.fillRect(wx, wy + 4, 8, 1);
        }
      }
      if (rnd() < 0.7) {
        bctx.fillStyle = '#3a2a1e';
        bctx.fillRect(x + Math.floor(w / 2) - 5, bottom - 16, 10, 13);
      }
    }
  }

  // --- Rendering: street + props (1.0 layer) ---
  function renderStreet() {
    bctx.fillStyle = '#5a5a6e';
    bctx.fillRect(0, 134, VW, 18);
    bctx.fillStyle = '#70708a';
    bctx.fillRect(0, 134, VW, 2);
    bctx.fillStyle = '#4c4c60';
    for (let sx = -(Math.floor(cameraX) % 16); sx < VW; sx += 16) {
      bctx.fillRect(sx, 136, 1, 16);
    }
    bctx.fillStyle = '#3c3c50';
    bctx.fillRect(0, 152, VW, 3);
    bctx.fillStyle = '#303044';
    bctx.fillRect(0, 155, VW, VH - 155);
    bctx.fillStyle = '#c9c9a0';
    for (let dx = -(Math.floor(cameraX) % 28); dx < VW; dx += 28) {
      bctx.fillRect(dx, 170, 12, 2);
    }
  }

  function drawLamppost(x) {
    bctx.fillStyle = '#22222e';
    bctx.fillRect(x, 106, 2, 45);
    bctx.fillRect(x - 2, 149, 6, 2);
    bctx.fillStyle = '#f5c842';
    bctx.fillRect(x - 2, 100, 6, 6);
    bctx.fillStyle = '#fff2c0';
    bctx.fillRect(x - 1, 101, 4, 4);
  }

  function drawPlant(x) {
    bctx.fillStyle = '#2f8f4e';
    bctx.fillRect(x - 5, 134, 12, 9);
    bctx.fillRect(x - 2, 130, 6, 5);
    bctx.fillStyle = '#4ade80';
    bctx.fillRect(x - 3, 133, 4, 3);
    bctx.fillStyle = '#a0402a';
    bctx.fillRect(x - 4, 143, 10, 8);
    bctx.fillStyle = '#7a2e1e';
    bctx.fillRect(x - 4, 143, 10, 2);
  }

  function drawAwning(x, rnd) {
    const stripes = 7;
    const w = stripes * 5;
    const c1 = rnd() < 0.5 ? '#e94560' : '#4ade80';
    bctx.fillStyle = '#22222e';
    bctx.fillRect(x, 126, 2, 25);
    bctx.fillRect(x + w - 2, 126, 2, 25);
    for (let s = 0; s < stripes; s++) {
      bctx.fillStyle = s % 2 === 0 ? c1 : '#e8e8e8';
      bctx.fillRect(x + s * 5, 118, 5, 8);
      bctx.fillRect(x + s * 5 + 1, 126, 3, 2);
    }
  }

  function drawCafeTable(x) {
    bctx.fillStyle = '#d8d8e0';
    bctx.fillRect(x - 7, 139, 14, 2);
    bctx.fillStyle = '#8888a0';
    bctx.fillRect(x - 1, 141, 2, 10);
    bctx.fillStyle = '#6b4a2a';
    bctx.fillRect(x - 13, 144, 5, 2);
    bctx.fillRect(x - 12, 146, 3, 5);
    bctx.fillRect(x + 8, 144, 5, 2);
    bctx.fillRect(x + 9, 146, 3, 5);
  }

  function renderProps() {
    const spacing = 120;
    const first = Math.floor(cameraX / spacing) - 1;
    const last = Math.floor((cameraX + VW) / spacing) + 1;
    for (let i = first; i <= last; i++) {
      if (i < 0) continue;
      const rnd = mulberry32(i * 4241 + 977);
      const worldX = i * spacing + 30 + Math.floor(rnd() * 40);
      let nearNpc = false;
      for (let n = 0; n < npcs.length; n++) {
        if (Math.abs(npcs[n].x - worldX) < 26) {
          nearNpc = true;
          break;
        }
      }
      if (nearNpc) continue;
      const x = Math.floor(worldX - cameraX);
      const type = Math.floor(rnd() * 4);
      if (type === 0) {
        drawLamppost(x);
      } else if (type === 1) {
        drawPlant(x);
      } else if (type === 2) {
        drawAwning(x, rnd);
      } else {
        drawCafeTable(x);
      }
    }
  }

  // --- Rendering: characters, prompt, HUD ---
  function renderCharacters() {
    const pc = player.x + SPRITE_W / 2;
    for (let i = 0; i < npcs.length; i++) {
      const npc = npcs[i];
      const sx = Math.round(npc.x - cameraX);
      if (sx < -SPRITE_W - 20 || sx > VW + 20) continue;
      const bob = Math.sin(worldTime * 2.2 + npc.bobPhase) > 0.3 ? -1 : 0;
      const sprite = pc < npc.x + SPRITE_W / 2 ? npc.spriteL : npc.spriteR;
      bctx.drawImage(sprite, sx, GROUND_Y - SPRITE_H + bob);
      if (npc.completed) {
        drawGridShape(HEART_GRID, sx + 4, GROUND_Y - SPRITE_H - 9, '#e94560');
      }
    }
    let frame = 0;
    if (player.moving) {
      frame = WALK_SEQ[Math.floor(player.animTime * 10) % WALK_SEQ.length];
    }
    const set = player.facing < 0 ? playerFrames.l : playerFrames.r;
    bctx.drawImage(set[frame], Math.round(player.x - cameraX), GROUND_Y - SPRITE_H);
  }

  function renderPrompt() {
    if (!promptNpc || inConversation) return;
    const sx = Math.round(promptNpc.x - cameraX) + Math.floor(SPRITE_W / 2);
    const bobY = Math.round(Math.sin(worldTime * 6) * 2);
    const top = GROUND_Y - SPRITE_H;
    bctx.fillStyle = 'rgba(10, 10, 30, 0.6)';
    bctx.fillRect(sx - 13, top - 25 + bobY, 26, 22);
    drawText('!', sx - 3, top - 23 + bobY, '#f5c842', 2);
    drawText('HABLA', sx - Math.floor(textWidth('HABLA', 1) / 2), top - 10 + bobY, '#e8e8e8', 1);
  }

  function renderHUD() {
    const counter = completedCount + '/' + npcs.length;
    const w = textWidth(counter, 1);
    bctx.fillStyle = 'rgba(10, 10, 30, 0.55)';
    bctx.fillRect(VW - w - 9, 3, w + 6, 9);
    drawText(counter, VW - w - 6, 5, '#f5c842', 1);
    if (!opts || typeof opts.getHearts !== 'function') return;
    const h = opts.getHearts();
    let current = 0;
    let max = 0;
    if (typeof h === 'number') {
      current = h;
      max = h;
    } else if (h && typeof h === 'object') {
      current = h.current || 0;
      max = h.max || current;
    }
    if (max <= 0 || max > 10) return;
    bctx.fillStyle = 'rgba(10, 10, 30, 0.55)';
    bctx.fillRect(3, 3, max * 9 + 4, 11);
    for (let i = 0; i < max; i++) {
      drawGridShape(HEART_GRID, 5 + i * 9, 5, i < current ? '#e94560' : '#3a3a52');
    }
  }

  function render() {
    renderSky();
    renderFarBuildings();
    renderNearBuildings();
    renderStreet();
    renderProps();
    renderCharacters();
    renderPrompt();
    renderHUD();
  }

  function blit() {
    displayCtx.fillStyle = LETTERBOX_COLOR;
    displayCtx.fillRect(0, 0, displayCanvas.width, displayCanvas.height);
    displayCtx.drawImage(backCanvas, 0, 0, VW, VH, offX, offY, VW * scale, VH * scale);
  }

  // --- Main loop ---
  function frame(now) {
    if (!running) return;
    rafId = requestAnimationFrame(frame);
    let delta = (now - lastTime) / 1000;
    lastTime = now;
    if (delta < 0) delta = 0;
    if (delta > MAX_DELTA) delta = MAX_DELTA;
    worldTime += delta;
    if (!paused && !inConversation) {
      accumulator += delta;
      while (accumulator >= STEP) {
        update(STEP);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    render();
    blit();
  }

  function onVisibility() {
    if (document.hidden) {
      paused = true;
      if (typeof Voice !== 'undefined' && Voice && typeof Voice.stop === 'function') {
        Voice.stop();
      }
    } else {
      paused = false;
      lastTime = performance.now();
      accumulator = 0;
    }
  }

  // === PUBLIC API ===
  function start(canvas, options) {
    if (running) stop();
    displayCanvas = canvas;
    displayCtx = canvas.getContext('2d');
    opts = options || {};
    backCanvas = document.createElement('canvas');
    backCanvas.width = VW;
    backCanvas.height = VH;
    bctx = backCanvas.getContext('2d');
    buildPlayerFrames();
    setupWorld(opts.npcs || []);
    createControls(canvas.parentElement);
    addL(window, 'keydown', onKeyDown);
    addL(window, 'keyup', onKeyUp);
    addL(window, 'resize', resize);
    addL(window, 'orientationchange', onOrientation);
    addL(document, 'visibilitychange', onVisibility);
    resetInput();
    prevAction = false;
    inConversation = false;
    paused = !!document.hidden;
    worldTime = 0;
    accumulator = 0;
    resize();
    running = true;
    lastTime = performance.now();
    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    if (!running && !displayCanvas) return;
    running = false;
    cancelAnimationFrame(rafId);
    for (let i = 0; i < listeners.length; i++) {
      const l = listeners[i];
      l[0].removeEventListener(l[1], l[2], l[3]);
    }
    listeners = [];
    activePointers.forEach(function (entry, id) {
      try {
        entry.el.releasePointerCapture(id);
      } catch (err) { /* already released */ }
    });
    activePointers.clear();
    if (controlsEl && controlsEl.parentElement) {
      controlsEl.parentElement.removeChild(controlsEl);
    }
    controlsEl = null;
    resetInput();
    inConversation = false;
    promptNpc = null;
    displayCanvas = null;
    displayCtx = null;
    backCanvas = null;
    bctx = null;
    opts = null;
  }

  return { start: start, stop: stop };
})();
