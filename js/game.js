(() => {
  'use strict';

  // ===================== Constants =====================
  const CANVAS_W = 480;
  const CANVAS_H = 800;
  const PADDLE_Y = CANVAS_H - 46;
  const PADDLE_H = 14;
  const BASE_PADDLE_W = 92;
  const BALL_R = 8;
  const BRICK_TOP = 78;
  const BRICK_H = 24;
  const BRICK_GAP = 6;
  const SIDE_MARGIN = 16;
  const LEVEL_COUNT = 20;
  const STORAGE_KEY = 'brickBreakerSave.v2';
  const MUTE_KEY = 'brickBreakerSave.muted';

  const BRICK_COLORS = ['#5b7cfa', '#57c98a', '#f5c451', '#ff8a5c', '#5fd3e8', '#ec5c73', '#a78bfa', '#4cd4a0', '#f28fb0'];

  // ===================== Level generation =====================
  const LEVEL_NAME_POOL = [
    'Beginner', 'Apprentice', 'Novice', 'Trainee', 'Rookie',
    'Adept', 'Skilled', 'Specialist', 'Veteran', 'Ace',
    'Expert', 'Elite', 'Champion', 'Virtuoso', 'Vanguard',
    'Master', 'Grandmaster', 'Paragon', 'Legend', 'Mythic'
  ];
  const DIFFICULTY_BANDS = [
    { upTo: 4, label: 'Easy' },
    { upTo: 8, label: 'Medium' },
    { upTo: 12, label: 'Hard' },
    { upTo: 16, label: 'Very Hard' },
    { upTo: 20, label: 'Extreme' }
  ];
  function difficultyFor(n) {
    const band = DIFFICULTY_BANDS.find(b => n <= b.upTo);
    return band ? band.label : 'Extreme';
  }
  const LEVELS = [];
  for (let i = 1; i <= LEVEL_COUNT; i++) {
    LEVELS.push({
      number: i,
      name: LEVEL_NAME_POOL[i - 1] || `Level ${i}`,
      difficulty: difficultyFor(i),
      rows: Math.min(3 + Math.floor((i - 1) / 3), 8),
      cols: Math.min(6 + Math.floor((i - 1) / 5), 9),
      ballSpeed: Math.min(420 + (i - 1) * 16, 760),
      toughChance: i >= 6 ? 0.22 + Math.min(i / 60, 0.18) : 0
    });
  }

  // ===================== State =====================
  const state = {
    coins: 0,
    diamonds: 0,
    unlockedBalls: ['classic'],
    unlockedPaddles: ['classic'],
    activeBall: 'classic',
    activePaddle: 'classic',
    maxLevelUnlocked: 1,
    completedLevels: [],
    highScore: 0,
    lastLoginDate: null,
    loginStreak: 0
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) Object.assign(state, JSON.parse(raw));
    } catch (e) { /* ignore corrupt save */ }
  }
  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* storage full/unavailable */ }
  }

  // ===================== Shop data =====================
  const BALL_ITEMS = [
    { id: 'classic', name: 'Classic', color: '#eef0f8', price: null, desc: 'The original.' },
    { id: 'fire', name: 'Ember', color: '#ff8a5c', price: { coins: 500 }, desc: 'Warm orange trail.' },
    { id: 'ice', name: 'Frost', color: '#5fd3e8', price: { coins: 500 }, desc: 'Cool cyan trail.' },
    { id: 'volt', name: 'Volt', color: '#f5c451', price: { diamonds: 15 }, desc: 'Electric gold ball.' }
  ];
  const PADDLE_ITEMS = [
    { id: 'classic', name: 'Classic', color: '#eef0f8', widthMult: 1, price: null, desc: 'The original.' },
    { id: 'wide', name: 'Broad', color: '#57c98a', widthMult: 1.2, price: { coins: 700 }, desc: 'A little wider.' },
    { id: 'crystal', name: 'Crystal', color: '#5fd3e8', widthMult: 1, price: { diamonds: 12 }, desc: 'Sleek and sharp.' },
    { id: 'magnet', name: 'Magnet', color: '#a78bfa', widthMult: 1, magnetic: true, price: { diamonds: 20 }, desc: 'Gentle ball pull.' }
  ];
  const CURRENCY_ITEMS = [
    { id: 'coin-pack', name: 'Coin Pack', price: { diamonds: 2 }, grants: { coins: 150 }, desc: 'Get 150 coins' },
    { id: 'diamond-pack', name: 'Diamond Pack', price: { coins: 1200 }, grants: { diamonds: 5 }, desc: 'Get 5 diamonds' },
    { id: 'mega-pack', name: 'Mega Pack', price: { diamonds: 20 }, grants: { coins: 1000, diamonds: 10 }, desc: 'Get 1000 coins + 10 diamonds' }
  ];
  const SHOP = { balls: BALL_ITEMS, paddles: PADDLE_ITEMS, currency: CURRENCY_ITEMS };

  // ===================== Icon SVGs (no emoji anywhere) =====================
  function svgCoin() {
    return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#f5c451"/><circle cx="12" cy="12" r="6.5" fill="none" stroke="#c99a2a" stroke-width="1.5"/></svg>';
  }
  function svgDiamond() {
    return '<svg viewBox="0 0 24 24"><polygon points="12,2 19,9 12,22 5,9" fill="#5fd3e8"/><polygon points="5,9 19,9 12,2" fill="#8fe4f2"/></svg>';
  }
  function svgBall(color) {
    return `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="15" fill="${color}"/><circle cx="15" cy="15" r="4.5" fill="rgba(255,255,255,0.55)"/></svg>`;
  }
  function svgPaddle(color) {
    return `<svg viewBox="0 0 40 40"><rect x="4" y="17" width="32" height="9" rx="4.5" fill="${color}"/></svg>`;
  }
  function svgCoinPack() {
    return '<svg viewBox="0 0 40 40"><circle cx="14" cy="24" r="9" fill="#c99a2a"/><circle cx="20" cy="18" r="9" fill="#f5c451"/><circle cx="26" cy="24" r="9" fill="#f5c451"/></svg>';
  }
  function svgDiamondPack() {
    return '<svg viewBox="0 0 40 40"><polygon points="14,8 20,14 14,26 8,14" fill="#5fd3e8"/><polygon points="26,12 30,16 26,24 22,16" fill="#8fe4f2"/></svg>';
  }
  function svgMegaPack() {
    return '<svg viewBox="0 0 40 40"><circle cx="15" cy="26" r="8" fill="#f5c451"/><polygon points="27,8 32,13 27,24 22,13" fill="#5fd3e8"/></svg>';
  }
  function svgLock() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  }
  function svgCheck() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M4 12l5 5L20 6"/></svg>';
  }
  function svgTrophy() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="#f5c451" stroke-width="1.6"><path d="M8 4h8v4a4 4 0 0 1-8 0V4Z" fill="#f5c451" stroke="none"/><path d="M6 4H3v2a4 4 0 0 0 4 4"/><path d="M18 4h3v2a4 4 0 0 1-4 4"/><path d="M10 15v3h4v-3"/><path d="M8 21h8"/></svg>';
  }
  function svgSkull() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="#ec5c73" stroke-width="1.6"><circle cx="12" cy="10" r="7" fill="#ec5c73" stroke="none"/><circle cx="9" cy="10" r="1.4" fill="#12131c"/><circle cx="15" cy="10" r="1.4" fill="#12131c"/><path d="M9 20l1-3M15 20l-1-3M12 20v-3"/></svg>';
  }
  function svgGift() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="#5b7cfa" stroke-width="1.6"><rect x="4" y="9" width="16" height="11" rx="1.5" fill="#5b7cfa" stroke="none"/><rect x="2" y="6" width="20" height="4" rx="1" fill="#7c98ff" stroke="none"/><path d="M12 6v14"/><path d="M12 6c-1.5-3-6-3-6 0s4.5 0 6 0Z" fill="#7c98ff" stroke="none"/><path d="M12 6c1.5-3 6-3 6 0s-4.5 0-6 0Z" fill="#7c98ff" stroke="none"/></svg>';
  }
  function svgHeart(filled) {
    return filled
      ? '<svg viewBox="0 0 24 24"><path d="M12 20.5 3.5 12C1 9.5 1.5 5.5 5 4.2c2-.8 4 0 5.3 1.7L12 7.6l1.7-1.7c1.3-1.7 3.3-2.5 5.3-1.7C22.5 5.5 23 9.5 20.5 12L12 20.5Z" fill="#ec5c73"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="#3a3d52" stroke-width="1.8"><path d="M12 20.5 3.5 12C1 9.5 1.5 5.5 5 4.2c2-.8 4 0 5.3 1.7L12 7.6l1.7-1.7c1.3-1.7 3.3-2.5 5.3-1.7C22.5 5.5 23 9.5 20.5 12L12 20.5Z"/></svg>';
  }

  // Power-up icons: purpose-built shapes, one per effect, used both on the
  // HUD (as SVG) and in-canvas (as a matching hand-drawn vector so the
  // falling capsule and the HUD badge always look like the same thing.
  function svgPower(type) {
    switch (type) {
      case 'multiball':
        return '<svg viewBox="0 0 24 24"><circle cx="8" cy="15" r="3.2" fill="#f5c451"/><circle cx="16" cy="15" r="3.2" fill="#f5c451"/><circle cx="12" cy="7.5" r="3.2" fill="#f5c451"/></svg>';
      case 'widepaddle':
        return '<svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="3.5" rx="1.75" fill="#57c98a"/><polygon points="5,12.25 9,8.25 9,16.25" fill="#57c98a"/><polygon points="19,12.25 15,8.25 15,16.25" fill="#57c98a"/></svg>';
      case 'slowball':
        return '<svg viewBox="0 0 24 24"><polygon points="6,4 18,4 12,12" fill="#5fd3e8"/><polygon points="6,20 18,20 12,12" fill="#5fd3e8"/></svg>';
      case 'fireball':
        return '<svg viewBox="0 0 24 24"><path d="M12 2c3.5 5 5 8 2.6 11.4.5-2-1-2.8-2-4.2-.8 1.4-2.4 2.2-1.9 4.2C8.2 10.5 9.5 7.4 12 2Z" fill="#ff8a5c"/><circle cx="12" cy="16" r="3.3" fill="#ff8a5c"/></svg>';
      default:
        return '';
    }
  }
  function drawPowerIcon(ctx, type, x, y, r) {
    ctx.save();
    ctx.translate(x, y);
    switch (type) {
      case 'multiball': {
        ctx.fillStyle = '#f5c451';
        const pts = [[-r * 0.42, r * 0.22], [r * 0.42, r * 0.22], [0, -r * 0.46]];
        pts.forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(dx, dy, r * 0.3, 0, Math.PI * 2); ctx.fill(); });
        break;
      }
      case 'widepaddle': {
        ctx.fillStyle = '#57c98a';
        ctx.fillRect(-r * 0.55, -r * 0.1, r * 1.1, r * 0.2);
        ctx.beginPath();
        ctx.moveTo(-r * 0.55, 0); ctx.lineTo(-r * 0.55 + r * 0.32, -r * 0.24); ctx.lineTo(-r * 0.55 + r * 0.32, r * 0.24);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(r * 0.55, 0); ctx.lineTo(r * 0.55 - r * 0.32, -r * 0.24); ctx.lineTo(r * 0.55 - r * 0.32, r * 0.24);
        ctx.closePath(); ctx.fill();
        break;
      }
      case 'slowball': {
        ctx.fillStyle = '#5fd3e8';
        ctx.beginPath(); ctx.moveTo(-r * 0.42, -r * 0.46); ctx.lineTo(r * 0.42, -r * 0.46); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-r * 0.42, r * 0.46); ctx.lineTo(r * 0.42, r * 0.46); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
        break;
      }
      case 'fireball': {
        ctx.fillStyle = '#ff8a5c';
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.55);
        ctx.bezierCurveTo(r * 0.5, -r * 0.05, r * 0.32, r * 0.35, 0, r * 0.55);
        ctx.bezierCurveTo(-r * 0.32, r * 0.35, -r * 0.5, -r * 0.05, 0, -r * 0.55);
        ctx.fill();
        break;
      }
    }
    ctx.restore();
  }
  // Lighten/darken a hex color by a percentage — used to build the
  // gradient + bevel edges that give bricks a 3D block look.
  function shadeColor(hex, percent) {
    const num = parseInt(hex.slice(1), 16);
    let r = (num >> 16) + percent;
    let g = ((num >> 8) & 0x00ff) + percent;
    let b = (num & 0x0000ff) + percent;
    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));
    return `#${(1 << 24 | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
  }

  function drawBrick(brick) {
    const { x, y, w, h } = brick;
    const base = BRICK_COLORS[brick.row % BRICK_COLORS.length];
    const bevel = Math.max(2, Math.min(4, h * 0.16));

    // main face — vertical gradient, lighter at top like a glossy block
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, shadeColor(base, 35));
    grad.addColorStop(0.5, base);
    grad.addColorStop(1, shadeColor(base, -25));
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    // top + left highlight edge (light hitting the raised bevel)
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillRect(x, y, w, bevel);
    ctx.fillRect(x, y, bevel, h);

    // bottom + right shadow edge (the recessed bevel)
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.fillRect(x, y + h - bevel, w, bevel);
    ctx.fillRect(x + w - bevel, y, bevel, h);

    // soft glossy sheen across the upper third
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(x + bevel, y + bevel, w - bevel * 2, h * 0.32);

    // damage cracks for multi-hit bricks — a darkened wash that grows as
    // hp drops, plus a couple of hairline cracks once it's badly damaged
    if (brick.maxHp > 1 && brick.hp < brick.maxHp) {
      const dmg = 1 - brick.hp / brick.maxHp;
      ctx.fillStyle = `rgba(15,12,10,${0.15 + dmg * 0.35})`;
      ctx.fillRect(x, y, w, h);
      if (dmg > 0.4) {
        ctx.strokeStyle = 'rgba(10,8,6,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + w * 0.3, y + 2);
        ctx.lineTo(x + w * 0.5, y + h * 0.55);
        ctx.lineTo(x + w * 0.4, y + h - 2);
        ctx.stroke();
      }
    }

    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  const POWER_TYPES = [
    { type: 'multiball', color: '#f5c451', duration: 0 },
    { type: 'widepaddle', color: '#57c98a', duration: 10000 },
    { type: 'slowball', color: '#5fd3e8', duration: 8000 },
    { type: 'fireball', color: '#ff8a5c', duration: 8000 }
  ];

  // ===================== Sound (procedural — no audio files) =====================
  let audioCtx = null, masterGain = null;
  let muted = localStorage.getItem(MUTE_KEY) === '1';

  function ensureAudio() {
    if (audioCtx) {
      // Some browsers create the context in a "suspended" state until a
      // gesture explicitly resumes it — cover that case too.
      if (audioCtx.state === 'suspended') audioCtx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx = new Ctx();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = muted ? 0 : 1;
    masterGain.connect(audioCtx.destination);
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }
  function tone({ freq, duration = 0.1, type = 'sine', gain = 0.2, delay = 0, slideTo = null }) {
    // Every sound call self-initializes audio instead of relying on a
    // separate "first tap" listener elsewhere — that listener didn't
    // reliably fire first in every browser/webview, which is why sounds
    // were silently doing nothing.
    ensureAudio();
    if (!audioCtx) return;
    const t0 = audioCtx.currentTime + delay;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(g).connect(masterGain);
    osc.start(t0); osc.stop(t0 + duration + 0.02);
  }
  const sfx = {
    click: () => tone({ freq: 700, duration: 0.05, type: 'square', gain: 0.12 }),
    paddleHit: () => tone({ freq: 260, duration: 0.07, type: 'square', gain: 0.16, slideTo: 340 }),
    wallHit: () => tone({ freq: 500, duration: 0.05, type: 'triangle', gain: 0.1 }),
    brickBreak: (row) => tone({ freq: 480 - row * 22, duration: 0.09, type: 'square', gain: 0.15, slideTo: 720 - row * 22 }),
    brickThud: () => tone({ freq: 180, duration: 0.06, type: 'triangle', gain: 0.14 }),
    powerCollect: () => { tone({ freq: 620, duration: 0.08, type: 'sine', gain: 0.18 }); tone({ freq: 880, duration: 0.12, type: 'sine', gain: 0.18, delay: 0.07 }); },
    lifeLost: () => tone({ freq: 320, duration: 0.3, type: 'sawtooth', gain: 0.2, slideTo: 90 }),
    levelWin: () => { tone({ freq: 523, duration: 0.1, type: 'triangle', gain: 0.2 }); tone({ freq: 659, duration: 0.1, type: 'triangle', gain: 0.2, delay: 0.1 }); tone({ freq: 784, duration: 0.18, type: 'triangle', gain: 0.22, delay: 0.2 }); },
    gameOver: () => tone({ freq: 300, duration: 0.5, type: 'sine', gain: 0.22, slideTo: 80 }),
    purchase: () => { tone({ freq: 700, duration: 0.06, type: 'square', gain: 0.16 }); tone({ freq: 1000, duration: 0.08, type: 'square', gain: 0.16, delay: 0.05 }); },
    reward: () => { tone({ freq: 660, duration: 0.09, type: 'sine', gain: 0.2 }); tone({ freq: 880, duration: 0.09, type: 'sine', gain: 0.2, delay: 0.08 }); tone({ freq: 1180, duration: 0.14, type: 'sine', gain: 0.2, delay: 0.16 }); }
  };

  function updateSoundIcon() {
    soundIcon.innerHTML = muted
      ? '<line x1="1" y1="1" x2="23" y2="23"></line><polygon points="3 9 3 15 8 15 13 20 13 4 8 9 3 9"></polygon>'
      : '<polygon points="3 9 3 15 8 15 13 20 13 4 8 9 3 9"></polygon><path d="M16 8a5 5 0 0 1 0 8"></path><path d="M18.5 5.5a9 9 0 0 1 0 13"></path>';
    soundToggle.classList.toggle('is-muted', muted);
  }
  function toggleMute() {
    ensureAudio();
    muted = !muted;
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    if (masterGain) masterGain.gain.value = muted ? 0 : 1;
    updateSoundIcon();
  }

  // ===================== DOM refs =====================
  const screens = {
    lobby: document.getElementById('screen-lobby'),
    levels: document.getElementById('screen-levels'),
    shop: document.getElementById('screen-shop'),
    game: document.getElementById('screen-game')
  };
  const soundToggle = document.getElementById('sound-toggle');
  const soundIcon = document.getElementById('sound-icon');
  const coinCountEl = document.getElementById('coin-count');
  const diamondCountEl = document.getElementById('diamond-count');
  const statLevelEl = document.getElementById('stat-level');
  const statHighScoreEl = document.getElementById('stat-highscore');
  const playBtn = document.getElementById('play-btn');
  const shopBtn = document.getElementById('shop-btn');
  const adsBtn = document.getElementById('ads-btn');
  const levelsBackBtn = document.getElementById('levels-back-btn');
  const levelsGrid = document.getElementById('levels-grid');
  const shopBackBtn = document.getElementById('shop-back-btn');
  const shopGrid = document.getElementById('shop-grid');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const hudScore = document.getElementById('hud-score');
  const hudLevel = document.getElementById('hud-level');
  const hudLives = document.getElementById('hud-lives');
  const hudEffects = document.getElementById('hud-effects');
  const pauseBtn = document.getElementById('pause-btn');
  const popupPause = document.getElementById('popup-pause');
  const resumeBtn = document.getElementById('resume-btn');
  const quitBtn = document.getElementById('quit-btn');
  const popupResult = document.getElementById('popup-result');
  const popupResultIcon = document.getElementById('popup-result-icon');
  const popupResultTitle = document.getElementById('popup-result-title');
  const popupResultMsg = document.getElementById('popup-result-msg');
  const popupResultRewards = document.getElementById('popup-result-rewards');
  const popupResultBtn = document.getElementById('popup-result-btn');
  const popupAd = document.getElementById('popup-ad');
  const adRing = document.getElementById('ad-ring');
  const adSeconds = document.getElementById('ad-seconds');
  const adTitle = document.getElementById('ad-title');
  const adMsg = document.getElementById('ad-msg');
  const adCloseBtn = document.getElementById('ad-close-btn');

  // ===================== Screen navigation =====================
  let currentShopCategory = 'balls';
  let resultBtnAction = null;

  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
    if (name === 'lobby') { updateLobbyStats(); updateDailyCard(); }
  }

  function updateLobbyStats() {
    const nextLevel = Math.min(state.maxLevelUnlocked, LEVEL_COUNT);
    statLevelEl.textContent = nextLevel;
    statHighScoreEl.textContent = state.highScore;
  }

  function updateCurrencyDisplay() {
    coinCountEl.textContent = state.coins;
    diamondCountEl.textContent = state.diamonds;
  }

  // ===================== Shop rendering =====================
  function iconForShopItem(category, item) {
    if (category === 'balls') return svgBall(item.color);
    if (category === 'paddles') return svgPaddle(item.color);
    if (item.id === 'coin-pack') return svgCoinPack();
    if (item.id === 'diamond-pack') return svgDiamondPack();
    return svgMegaPack();
  }

  function renderShop(category) {
    currentShopCategory = category;
    tabBtns.forEach(b => b.classList.toggle('active', b.dataset.cat === category));
    shopGrid.innerHTML = '';
    SHOP[category].forEach(item => {
      const card = document.createElement('div');
      card.className = 'shop-card';

      const owned = category === 'balls' ? state.unlockedBalls.includes(item.id)
        : category === 'paddles' ? state.unlockedPaddles.includes(item.id)
        : false;
      const active = category === 'balls' ? state.activeBall === item.id
        : category === 'paddles' ? state.activePaddle === item.id
        : false;

      let priceHtml = '';
      let btnLabel = 'BUY';
      let btnDisabled = false;
      let btnClass = '';

      if (category === 'currency') {
        priceHtml = priceLine(item.price);
        const affordable = canAfford(item.price);
        btnDisabled = !affordable;
      } else if (owned) {
        priceHtml = '<span style="color:var(--success)">Owned</span>';
        if (active) { btnLabel = 'ACTIVE'; btnClass = 'active-item'; btnDisabled = true; }
        else { btnLabel = 'USE'; btnClass = 'owned'; }
      } else {
        priceHtml = priceLine(item.price);
        btnDisabled = !canAfford(item.price);
      }

      card.innerHTML = `
        <div class="shop-icon">${iconForShopItem(category, item)}</div>
        <div class="shop-name">${item.name}</div>
        <div class="shop-desc">${item.desc}</div>
        <div class="shop-price">${priceHtml}</div>
        <button class="buy-btn ${btnClass}" ${btnDisabled ? 'disabled' : ''}>${btnLabel}</button>
      `;
      card.querySelector('.buy-btn').addEventListener('click', () => {
        sfx.click();
        handleShopAction(category, item, owned, active);
      });
      shopGrid.appendChild(card);
    });
  }

  function priceLine(price) {
    if (!price) return '';
    const parts = [];
    if (price.coins) parts.push(`<span style="display:flex;align-items:center;gap:4px;color:var(--gold)">${svgCoin()}${price.coins}</span>`);
    if (price.diamonds) parts.push(`<span style="display:flex;align-items:center;gap:4px;color:var(--diamond)">${svgDiamond()}${price.diamonds}</span>`);
    return parts.join(' ');
  }
  function canAfford(price) {
    if (!price) return true;
    if (price.coins && price.coins > state.coins) return false;
    if (price.diamonds && price.diamonds > state.diamonds) return false;
    return true;
  }

  function handleShopAction(category, item, owned, active) {
    if (category !== 'currency' && owned) {
      // Switching to an already-owned cosmetic is free — not a purchase.
      if (category === 'balls') state.activeBall = item.id;
      else state.activePaddle = item.id;
      saveState();
      renderShop(category);
      return;
    }
    if (!canAfford(item.price)) return;

    // Every real purchase is gated behind a rewarded ad.
    showAd({
      title: 'WATCH AD TO CONTINUE',
      message: `Completes your purchase: ${item.name}`,
      onDone: () => {
        if (item.price.coins) state.coins -= item.price.coins;
        if (item.price.diamonds) state.diamonds -= item.price.diamonds;

        if (category === 'balls') { state.unlockedBalls.push(item.id); state.activeBall = item.id; }
        else if (category === 'paddles') { state.unlockedPaddles.push(item.id); state.activePaddle = item.id; }
        else if (category === 'currency') {
          if (item.grants.coins) state.coins += item.grants.coins;
          if (item.grants.diamonds) state.diamonds += item.grants.diamonds;
        }
        sfx.purchase();
        saveState();
        updateCurrencyDisplay();
        renderShop(category);
      }
    });
  }

  // ===================== Levels rendering =====================
  function renderLevels() {
    levelsGrid.innerHTML = '';
    LEVELS.forEach(lvl => {
      const unlocked = lvl.number <= state.maxLevelUnlocked;
      const completed = state.completedLevels.includes(lvl.number);
      const card = document.createElement('div');
      card.className = 'level-card' + (unlocked ? '' : ' locked') + (completed ? ' completed' : '');
      card.innerHTML = unlocked
        ? `<div class="level-num">${lvl.number}</div><div class="level-name">${lvl.name}</div><div class="level-diff">${lvl.difficulty}</div>`
        : `<div class="level-lock">${svgLock()}</div><div class="level-diff">${lvl.difficulty}</div>`;
      if (unlocked) {
        card.addEventListener('click', () => { sfx.click(); startLevel(lvl.number); });
      }
      levelsGrid.appendChild(card);
    });
  }

  // ===================== Ad popup (generic, callback-driven) =====================
  // ⚠ PUBLISHING WITH REAL ADS: everything below is a 5-second countdown
  // standing in for a real rewarded ad. Every place in this file that wants
  // to show a rewarded ad calls showAd({ onDone, title, message }) — onDone
  // only ever runs once the "ad" is finished, never on an early skip. When
  // you're ready to go live, replace the body of this function with a real
  // ad network's rewarded-ad call, and call onDone() only from *their*
  // "ad completed / reward earned" callback (not from a close/skip event —
  // that's what stops people from getting the reward without watching).
  // Everything that already calls showAd() (shop purchases, the lobby
  // "watch ad" button) needs no other changes.
  let adPendingCallback = null;
  let adIntervalId = null;
  const AD_RING_CIRCUMFERENCE = 176;

  function showAd({ title, message, onDone, seconds = 5 }) {
    ensureAudio();
    adPendingCallback = typeof onDone === 'function' ? onDone : null;
    adTitle.textContent = title || 'WATCHING AD';
    adMsg.textContent = message || 'Your reward unlocks when the ad finishes.';
    adCloseBtn.disabled = true;
    adCloseBtn.textContent = 'SKIP';
    let remaining = seconds;
    adSeconds.textContent = remaining;
    adRing.style.strokeDashoffset = '0';
    popupAd.classList.add('active');

    if (adIntervalId) clearInterval(adIntervalId);
    adIntervalId = setInterval(() => {
      remaining--;
      adSeconds.textContent = Math.max(remaining, 0);
      const offset = AD_RING_CIRCUMFERENCE * (1 - remaining / seconds);
      adRing.style.strokeDashoffset = String(offset);
      if (remaining <= 0) {
        clearInterval(adIntervalId);
        adIntervalId = null;
        adCloseBtn.disabled = false;
        adCloseBtn.textContent = 'CLAIM';
      }
    }, 1000);
  }
  adCloseBtn.addEventListener('click', () => {
    if (adCloseBtn.disabled) return;
    sfx.click();
    popupAd.classList.remove('active');
    const cb = adPendingCallback;
    adPendingCallback = null;
    if (cb) cb();
  });

  // ===================== Result popup (win / lose / daily reward) =====================
  const popupResultHomeBtn = document.getElementById('popup-result-home-btn');

  function showResult({ icon, title, message, rewards, btnLabel, onContinue, hidePrimary }) {
    popupResultIcon.innerHTML = icon || '';
    popupResultTitle.textContent = title;
    popupResultMsg.textContent = message || '';
    popupResultRewards.innerHTML = (rewards || []).map(r =>
      `<span class="popup-reward-item">${r.icon}+${r.value}</span>`
    ).join('');
    popupResultBtn.textContent = btnLabel || 'CONTINUE';
    popupResultBtn.style.display = hidePrimary ? 'none' : '';
    resultBtnAction = onContinue || (() => showScreen('lobby'));
    popupResult.classList.add('active');
  }
  popupResultBtn.addEventListener('click', () => {
    sfx.click();
    popupResult.classList.remove('active');
    if (resultBtnAction) resultBtnAction();
  });
  popupResultHomeBtn.addEventListener('click', () => {
    sfx.click();
    popupResult.classList.remove('active');
    showScreen('lobby');
  });

  // ===================== Daily login reward — 7-day track =====================
  const DAILY_REWARDS = [
    { day: 1, coins: 50 },
    { day: 2, coins: 80 },
    { day: 3, coins: 120 },
    { day: 4, coins: 160 },
    { day: 5, coins: 200 },
    { day: 6, diamonds: 10 },
    { day: 7, diamonds: 20 }
  ];
  const popupDaily = document.getElementById('popup-daily');
  const dailyIcon = document.getElementById('daily-icon');
  const dailyMsg = document.getElementById('daily-msg');
  const dailyGrid = document.getElementById('daily-grid');
  const dailyContinueBtn = document.getElementById('daily-continue-btn');
  const dailyCardBtn = document.getElementById('daily-card-btn');
  const dailyCardIcon = document.getElementById('daily-card-icon');
  const dailyCardStatus = document.getElementById('daily-card-status');

  function isClaimedToday() {
    return state.lastLoginDate === new Date().toDateString();
  }

  // Updates the lobby card so it always reflects today's status, whether
  // the popup already auto-fired this session or not.
  function updateDailyCard() {
    dailyCardIcon.innerHTML = svgGift();
    const claimedToday = isClaimedToday();
    dailyCardBtn.classList.toggle('claimable', !claimedToday);
    if (claimedToday) {
      dailyCardStatus.textContent = `Day ${state.loginStreak || 1} claimed — back tomorrow`;
    } else {
      const nextDay = state.loginStreak >= 7 ? 1 : (state.loginStreak || 0) + 1;
      dailyCardStatus.textContent = `Day ${nextDay} ready to claim!`;
    }
  }

  function checkDailyReward() {
    if (isClaimedToday()) { updateDailyCard(); return; }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const consecutive = state.lastLoginDate === yesterday.toDateString();

    state.loginStreak = consecutive ? (state.loginStreak || 0) + 1 : 1;
    if (state.loginStreak > 7) state.loginStreak = 1;

    const reward = DAILY_REWARDS[state.loginStreak - 1];
    if (reward.coins) state.coins += reward.coins;
    if (reward.diamonds) state.diamonds += reward.diamonds;
    state.lastLoginDate = new Date().toDateString();
    saveState();
    updateCurrencyDisplay();
    updateDailyCard();

    sfx.reward();
    showDailyPopup(reward, false);
  }

  // Opening the card from the lobby: if today's reward hasn't been claimed
  // yet, claim it now (same as the auto-popup would). If it was already
  // claimed, just show the track so they can see their progress — no
  // second reward is granted.
  function openDailyFromLobby() {
    sfx.click();
    if (!isClaimedToday()) {
      checkDailyReward();
    } else {
      const reward = DAILY_REWARDS[(state.loginStreak || 1) - 1];
      showDailyPopup(reward, true);
    }
  }
  dailyCardBtn.addEventListener('click', openDailyFromLobby);

  function showDailyPopup(reward, alreadyClaimed) {
    dailyIcon.innerHTML = svgGift();
    if (alreadyClaimed) {
      dailyMsg.textContent = `Already claimed today. Come back tomorrow for Day ${state.loginStreak >= 7 ? 1 : state.loginStreak + 1}.`;
    } else {
      dailyMsg.textContent = reward.diamonds
        ? `Day ${reward.day} bonus — you earned ${reward.diamonds} diamonds!`
        : `Day ${reward.day} — you earned ${reward.coins} coins!`;
    }
    dailyContinueBtn.textContent = alreadyClaimed ? 'OK' : 'NICE';

    dailyGrid.innerHTML = DAILY_REWARDS.map(r => {
      const claimed = r.day < state.loginStreak || (r.day === state.loginStreak && alreadyClaimed);
      const isToday = r.day === state.loginStreak && !alreadyClaimed;
      const icon = r.coins ? svgCoin() : svgDiamond();
      const value = r.coins || r.diamonds;
      return `
        <div class="daily-cell${claimed ? ' claimed' : ''}${isToday ? ' today' : ''}">
          <div class="day-label">DAY ${r.day}</div>
          <div class="day-icon">${icon}</div>
          <div class="day-value">${value}</div>
          ${claimed ? `<div class="day-claimed">${svgCheck()}</div>` : ''}
        </div>
      `;
    }).join('');

    popupDaily.classList.add('active');
  }
  dailyContinueBtn.addEventListener('click', () => {
    sfx.click();
    popupDaily.classList.remove('active');
    showScreen('lobby');
  });

  // ===================== Game engine =====================
  let running = false, paused = false;
  let paddleX = CANVAS_W / 2;
  let paddleW = BASE_PADDLE_W;
  let balls = [];
  let bricks = [];
  let drops = [];
  let particles = [];
  let effects = {}; // type -> expiry timestamp
  let score = 0, lives = 3, level = 1, levelConf = null;
  let lastTime = 0;
  let magneticPaddle = false;

  function ballColor() {
    return (BALL_ITEMS.find(b => b.id === state.activeBall) || BALL_ITEMS[0]).color;
  }
  function paddleColor() {
    return (PADDLE_ITEMS.find(p => p.id === state.activePaddle) || PADDLE_ITEMS[0]).color;
  }

  let columns = []; // columns[c] = alive bricks in that column, top-to-bottom
  let colBrickH = BRICK_H, colBrickGap = BRICK_GAP, colTop = BRICK_TOP;

  function buildBricks(conf) {
    bricks = [];
    columns = [];
    const rows = conf.rows, cols = conf.cols;
    const brickW = (CANVAS_W - SIDE_MARGIN * 2 - (cols - 1) * BRICK_GAP) / cols;

    // The brick field is only allowed to use the top half of the play
    // area, however many rows a level calls for. First try just starting
    // higher (less empty margin above); only if that's still not enough
    // room do we shrink the bricks themselves.
    const HUD_CLEARANCE = 46;
    const maxAreaBottom = CANVAS_H * 0.5;
    let brickH = BRICK_H, brickGap = BRICK_GAP, top = BRICK_TOP;
    let neededHeight = rows * (brickH + brickGap);

    if (top + neededHeight > maxAreaBottom) {
      top = Math.max(HUD_CLEARANCE, maxAreaBottom - neededHeight);
    }
    if (top + neededHeight > maxAreaBottom) {
      const available = maxAreaBottom - HUD_CLEARANCE;
      const scale = Math.max(0.45, available / neededHeight);
      brickH = Math.max(12, brickH * scale);
      brickGap = Math.max(2, brickGap * scale);
      top = HUD_CLEARANCE;
    }
    colBrickH = brickH; colBrickGap = brickGap; colTop = top;

    for (let c = 0; c < cols; c++) {
      columns.push([]);
      for (let r = 0; r < rows; r++) {
        let hp = 1;
        if (conf.toughChance > 0) {
          const roll = Math.random();
          if (roll < conf.toughChance * 0.4) hp = 3;
          else if (roll < conf.toughChance) hp = 2;
        }
        const y = top + r * (brickH + brickGap);
        const brick = {
          x: SIDE_MARGIN + c * (brickW + brickGap),
          y, targetY: y,
          w: brickW, h: brickH,
          hp, maxHp: hp,
          row: r, col: c, alive: true
        };
        bricks.push(brick);
        columns[c].push(brick);
      }
    }
  }

  // Called right after a brick is destroyed — the remaining bricks in that
  // same column get new target positions packed from the top, so the ones
  // that were above the gap slide down to fill it (recomputed fresh each
  // time rather than nudged incrementally, so repeated breaks in the same
  // column never end up slightly misaligned).
  function collapseColumn(c) {
    columns[c] = columns[c].filter(b => b.alive);
    columns[c].forEach((b, idx) => {
      b.targetY = colTop + idx * (colBrickH + colBrickGap);
    });
  }

  function newBall(x, y, angleDeg, speed) {
    const rad = angleDeg * Math.PI / 180;
    return { x, y, vx: Math.cos(rad) * speed, vy: -Math.abs(Math.sin(rad) * speed) };
  }

  function startLevel(num) {
    levelConf = LEVELS.find(l => l.number === num);
    level = num;
    score = 0;
    lives = 3;
    paddleW = BASE_PADDLE_W * (PADDLE_ITEMS.find(p => p.id === state.activePaddle) || PADDLE_ITEMS[0]).widthMult;
    magneticPaddle = !!(PADDLE_ITEMS.find(p => p.id === state.activePaddle) || {}).magnetic;
    paddleX = CANVAS_W / 2;
    drops = [];
    particles = [];
    effects = {};
    buildBricks(levelConf);
    balls = [newBall(CANVAS_W / 2, PADDLE_Y - BALL_R - 2, 60 + Math.random() * 60 - 30, levelConf.ballSpeed)];
    running = true;
    paused = false;
    updateHud();
    showScreen('game');
    lastTime = 0;
    requestAnimationFrame(loop);
  }

  function updateHud() {
    hudScore.textContent = score;
    hudLevel.textContent = level;
    hudLives.innerHTML = [0, 1, 2].map(i => `<span class="heart-icon">${svgHeart(i < lives)}</span>`).join('');
    hudEffects.innerHTML = '';
    Object.keys(effects).forEach(type => {
      const badge = document.createElement('div');
      badge.className = 'effect-badge';
      badge.innerHTML = svgPower(type);
      hudEffects.appendChild(badge);
    });
  }

  function activateEffect(type) {
    const def = POWER_TYPES.find(p => p.type === type);
    if (type === 'multiball') {
      const source = balls[0] || newBall(paddleX, PADDLE_Y - BALL_R - 2, 90, levelConf.ballSpeed);
      const speed = Math.hypot(source.vx, source.vy) || levelConf.ballSpeed;
      [-28, 28].forEach(offset => {
        const baseAngle = Math.atan2(-source.vy, source.vx) * 180 / Math.PI;
        balls.push(newBall(source.x, source.y, baseAngle + offset, speed));
      });
      if (balls.length > 6) balls = balls.slice(0, 6);
      return;
    }
    effects[type] = performance.now() + def.duration;
    if (type === 'widepaddle') paddleW = BASE_PADDLE_W * 1.55;
  }

  function tickEffects(now) {
    Object.keys(effects).forEach(type => {
      if (now >= effects[type]) {
        delete effects[type];
        if (type === 'widepaddle') {
          paddleW = BASE_PADDLE_W * (PADDLE_ITEMS.find(p => p.id === state.activePaddle) || PADDLE_ITEMS[0]).widthMult;
        }
      }
    });
  }

  function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      particles.push({ x, y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0.3 + Math.random() * 0.2, age: 0, color });
    }
  }

  function loseLife() {
    lives--;
    updateHud();
    if (lives <= 0) {
      running = false;
      sfx.gameOver();
      showResult({
        icon: svgSkull(),
        title: 'GAME OVER',
        message: `You scored ${score} points on Level ${level}.`,
        rewards: [],
        btnLabel: 'TRY AGAIN',
        onContinue: () => startLevel(level)
      });
    } else {
      sfx.lifeLost();
      balls = [newBall(paddleX, PADDLE_Y - BALL_R - 2, 90, levelConf.ballSpeed)];
    }
  }

  function completeLevel() {
    running = false;
    const coinReward = 40 + level * 6;
    const firstClear = !state.completedLevels.includes(level);
    if (firstClear) state.completedLevels.push(level);
    if (level >= state.maxLevelUnlocked && level < LEVEL_COUNT) state.maxLevelUnlocked = level + 1;
    if (score > state.highScore) state.highScore = score;
    state.coins += coinReward;
    saveState();
    updateCurrencyDisplay();
    sfx.levelWin();
    const rewards = [{ icon: svgCoin(), value: coinReward }];
    const hasNext = level < LEVEL_COUNT;
    showResult({
      icon: svgTrophy(),
      title: 'LEVEL COMPLETE',
      message: `Level ${level} cleared with a score of ${score}.`,
      rewards,
      btnLabel: 'NEXT LEVEL',
      hidePrimary: !hasNext,
      onContinue: () => { if (hasNext) startLevel(level + 1); }
    });
  }

  function update(dt, now) {
    if (!running || paused) return;
    tickEffects(now);

    const slowFactor = effects.slowball ? 0.55 : 1;
    const fireActive = !!effects.fireball;

    // paddle clamp
    paddleX = Math.max(paddleW / 2, Math.min(CANVAS_W - paddleW / 2, paddleX));

    // balls
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i];
      b.x += b.vx * slowFactor * dt;
      b.y += b.vy * slowFactor * dt;

      if (b.x - BALL_R < 0) { b.x = BALL_R; b.vx *= -1; sfx.wallHit(); }
      if (b.x + BALL_R > CANVAS_W) { b.x = CANVAS_W - BALL_R; b.vx *= -1; sfx.wallHit(); }
      if (b.y - BALL_R < 0) { b.y = BALL_R; b.vy *= -1; sfx.wallHit(); }

      // paddle collision
      if (b.vy > 0 && b.y + BALL_R >= PADDLE_Y && b.y + BALL_R <= PADDLE_Y + PADDLE_H + 10 &&
          b.x >= paddleX - paddleW / 2 - BALL_R && b.x <= paddleX + paddleW / 2 + BALL_R) {
        const hitPos = (b.x - paddleX) / (paddleW / 2); // -1..1
        const speed = Math.hypot(b.vx, b.vy);
        const angle = hitPos * 65; // degrees off vertical
        const rad = (90 - angle) * Math.PI / 180;
        b.vx = Math.cos(rad) * speed * (magneticPaddle ? 0.85 : 1);
        b.vy = -Math.abs(Math.sin(rad) * speed);
        b.y = PADDLE_Y - BALL_R - 1;
        sfx.paddleHit();
      }

      // brick collisions
      for (let j = 0; j < bricks.length; j++) {
        const brick = bricks[j];
        if (!brick.alive) continue;
        if (b.x + BALL_R > brick.x && b.x - BALL_R < brick.x + brick.w &&
            b.y + BALL_R > brick.y && b.y - BALL_R < brick.y + brick.h) {
          brick.hp--;
          if (brick.hp <= 0) {
            brick.alive = false;
            score += 10 * brick.maxHp;
            sfx.brickBreak(brick.row);
            spawnParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, BRICK_COLORS[brick.row % BRICK_COLORS.length], 8);
            if (Math.random() < 0.18) {
              const def = POWER_TYPES[Math.floor(Math.random() * POWER_TYPES.length)];
              drops.push({ x: brick.x + brick.w / 2, y: brick.y + brick.h / 2, type: def.type, color: def.color, vy: 130 });
            }
            collapseColumn(brick.col);
          } else {
            sfx.brickThud();
          }
          if (!fireActive) {
            const overlapX = Math.min(b.x + BALL_R - brick.x, brick.x + brick.w - (b.x - BALL_R));
            const overlapY = Math.min(b.y + BALL_R - brick.y, brick.y + brick.h - (b.y - BALL_R));
            if (overlapX < overlapY) b.vx *= -1; else b.vy *= -1;
          }
          break;
        }
      }

      if (b.y - BALL_R > CANVAS_H) balls.splice(i, 1);
    }
    if (balls.length === 0) { loseLife(); return; }

    // drops falling
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.y += d.vy * dt;
      if (d.y - 16 > CANVAS_H) { drops.splice(i, 1); continue; }
      if (d.y + 16 >= PADDLE_Y && d.x >= paddleX - paddleW / 2 - 16 && d.x <= paddleX + paddleW / 2 + 16) {
        activateEffect(d.type);
        sfx.powerCollect();
        drops.splice(i, 1);
      }
    }

    // particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.age >= p.life) particles.splice(i, 1);
    }

    // bricks sliding down to fill gaps left by broken ones
    for (let i = 0; i < bricks.length; i++) {
      const b = bricks[i];
      if (!b.alive) continue;
      const diff = b.targetY - b.y;
      if (Math.abs(diff) > 0.4) b.y += diff * Math.min(1, dt * 10);
      else b.y = b.targetY;
    }

    // win check
    if (bricks.every(br => !br.alive)) completeLevel();

    updateHud();
  }

  function render() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // bricks — beveled 3D block look: gradient face, bright top/left
    // highlight, dark bottom/right shadow, soft glossy sheen on top.
    bricks.forEach(brick => {
      if (!brick.alive) return;
      drawBrick(brick);
    });

    // drops
    drops.forEach(d => {
      ctx.fillStyle = 'rgba(27,29,42,0.9)';
      ctx.beginPath(); ctx.arc(d.x, d.y, 16, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = d.color; ctx.lineWidth = 2;
      ctx.stroke();
      drawPowerIcon(ctx, d.type, d.x, d.y, 16);
    });

    // particles
    particles.forEach(p => {
      const t = 1 - p.age / p.life;
      ctx.globalAlpha = Math.max(0, t);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, 2.5 * t + 0.5, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // paddle
    ctx.fillStyle = paddleColor();
    const px = paddleX - paddleW / 2;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(px, PADDLE_Y, paddleW, PADDLE_H, 6) : ctx.rect(px, PADDLE_Y, paddleW, PADDLE_H);
    ctx.fill();

    // balls
    ctx.fillStyle = ballColor();
    balls.forEach(b => {
      ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2); ctx.fill();
      if (effects.fireball) {
        ctx.strokeStyle = 'rgba(255,138,92,0.7)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R + 3, 0, Math.PI * 2); ctx.stroke();
      }
    });
  }

  function loop(t) {
    if (!running) return;
    if (!lastTime) lastTime = t;
    const dt = Math.min((t - lastTime) / 1000, 0.033);
    lastTime = t;
    update(dt, performance.now());
    render();
    if (running) requestAnimationFrame(loop);
  }

  // ===================== Input =====================
  function canvasXFromClientX(clientX) {
    const rect = canvas.getBoundingClientRect();
    const ratio = CANVAS_W / rect.width;
    return (clientX - rect.left) * ratio;
  }
  canvas.addEventListener('pointerdown', (e) => { ensureAudio(); paddleX = canvasXFromClientX(e.clientX); });
  canvas.addEventListener('pointermove', (e) => {
    if (e.buttons === 0 && e.pointerType === 'mouse') { /* only drag-follow for mouse without press optional */ }
    paddleX = canvasXFromClientX(e.clientX);
  }, { passive: true });

  // ===================== Buttons =====================
  soundToggle.addEventListener('click', toggleMute);
  playBtn.addEventListener('click', () => { sfx.click(); renderLevels(); showScreen('levels'); });
  shopBtn.addEventListener('click', () => { sfx.click(); renderShop(currentShopCategory); showScreen('shop'); });
  levelsBackBtn.addEventListener('click', () => { sfx.click(); showScreen('lobby'); });
  shopBackBtn.addEventListener('click', () => { sfx.click(); showScreen('lobby'); });
  tabBtns.forEach(btn => btn.addEventListener('click', () => { sfx.click(); renderShop(btn.dataset.cat); }));

  adsBtn.addEventListener('click', () => {
    sfx.click();
    showAd({
      title: 'WATCH AD FOR REWARD',
      message: 'Earn a quick 50-coin bonus.',
      onDone: () => {
        state.coins += 50;
        saveState();
        updateCurrencyDisplay();
        sfx.reward();
      }
    });
  });

  pauseBtn.addEventListener('click', () => {
    if (!running) return;
    paused = true;
    popupPause.classList.add('active');
  });
  resumeBtn.addEventListener('click', () => {
    sfx.click();
    paused = false;
    popupPause.classList.remove('active');
    lastTime = 0;
    requestAnimationFrame(loop);
  });
  quitBtn.addEventListener('click', () => {
    sfx.click();
    running = false;
    paused = false;
    popupPause.classList.remove('active');
    showScreen('lobby');
  });

  // ===================== Boot =====================
  // Browsers only allow audio to start after a real user gesture — this
  // catches the very first tap/click anywhere on the page (not just on the
  // canvas) so button clicks make sound from the first press, not just
  // after the canvas has been touched once.
  ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach(evt => {
    window.addEventListener(evt, ensureAudio, { once: true, passive: true });
  });

  function boot() {
    loadState();
    updateCurrencyDisplay();
    updateLobbyStats();
    updateDailyCard();
    updateSoundIcon();
    // Let the lobby render first, then bring in the daily reward — feels
    // like the game actually opened, instead of a popup blocking the view
    // before anything is even visible.
    setTimeout(checkDailyReward, 1400);
  }
  boot();
})();
