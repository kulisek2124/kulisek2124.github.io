/* Ulice — one Ostrava street at night, drawn pixel by pixel on a 640x360
   buffer and scaled up crisp. Each house on the street is a section of the
   site: walk up to a door (arrow keys, or click the house) and step inside.

   Whatever never moves (walls, roofs, the road, the skyline) is drawn once
   into a static layer; whatever lives (windows, neon, lamps, the tram, cars,
   the cat, smoke, rain, the sky) is drawn every frame at 15 fps.

   Same seed, same street, every visit. Easter eggs: the cat, the moon,
   the tram, the arrow keys, and the Konami code. */
(function () {
  'use strict';
  const W = 640, H = 360, FPS = 15;

  /* ---------------- toolkit ---------------- */
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const rng = mulberry32(20260910);
  const R = (a, b) => a + rng() * (b - a);
  const RI = (a, b) => Math.floor(a + rng() * (b - a + 1));
  const live = Math.random;
  const mk = (w = W, h = H) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const P = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  function hex(c) { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function mix(a, b, t) { const A = hex(a), B = hex(b); return `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))})`; }

  /* ---------------- palette (the dashboard's, plus a street) ---------------- */
  const C = {
    outline: '#0A0A14', wallDark: '#1B1824', trim: '#4A3A44', roofEdge: '#6B4A44',
    wall: ['#2A2432', '#33283A', '#3B2E3F', '#2E2A3E', '#26222F', '#3A2C34', '#2C3140', '#2F2A2A'],
    roof: ['#4A2E33', '#5A3A3A', '#3A2A2A', '#4E3540', '#3A3F52'],
    warm: ['#F6C15A', '#FFD98A', '#E8A340', '#FFC46B'], cool: '#8FD3FF', off: '#1A1626', glassDay: '#6C7FA6',
    teal: '#4EE6CC', tealDim: '#1E6E64', neonRed: '#FF4A5C', neonPink: '#FF7AB8', amber: '#FFB347', neonBlue: '#5AB4FF', neonGreen: '#7CFF6B', violet: '#B48CFF',
    asphalt: '#171A26', asphalt2: '#1C2030', curb: '#3A3F52', walk: '#262B3A', walk2: '#2C3244', walkLine: '#1E2231', rail: '#7A7A86', railDark: '#111420',
    lampPost: '#4A5068', lampHead: '#6A7290', lamp: '#FFE2A8', glow: 'rgba(255,200,120,',
    far: '#141A33', far2: '#0F1428', farLit: '#3B4A7A',
    tram: '#F2F2F4', tramBlue: '#1E5BB8', tramDark: '#0E2A55', tramGlass: '#9CC9FF',
    hoodie: '#2FB9A8', hoodie2: '#1E7F74', jeans: '#2C3E6B', jeans2: '#20304F', skin: '#F2C9A0', hair: '#2A1E16', shoe: '#F7F7F2',
    cat: { fur: '#E8A85C', fur2: '#C98A44', eye: '#1B1B1B' },
    smoke: 'rgba(200,200,215,', rain: 'rgba(160,190,230,.55)',
  };
  const SKY = {
    night: { top: '#080C1D', mid: '#131A38', hor: '#2A2652', stars: 1, lit: 1, sun: 0 },
    dawn: { top: '#1A1A3C', mid: '#4A3660', hor: '#C7734E', stars: .35, lit: .8, sun: 0 },
    day: { top: '#2C5AA6', mid: '#5F8CC8', hor: '#9DBBDF', stars: 0, lit: .35, sun: 1 },
    dusk: { top: '#231C48', mid: '#6A3A62', hor: '#E07A48', stars: .25, lit: .9, sun: 0 },
  };
  function timeKey(d) { const h = d.getHours() + d.getMinutes() / 60; if (h < 5 || h >= 21) return 'night'; if (h < 8) return 'dawn'; if (h < 17.5) return 'day'; return 'dusk'; }

  /* ---------------- a 3x5 pixel font for the signs ---------------- */
  const FONT = {
    A: 'XXX|X.X|XXX|X.X|X.X', B: 'XX.|X.X|XX.|X.X|XX.', C: 'XXX|X..|X..|X..|XXX', D: 'XX.|X.X|X.X|X.X|XX.', E: 'XXX|X..|XX.|X..|XXX', F: 'XXX|X..|XX.|X..|X..',
    G: 'XXX|X..|X.X|X.X|XXX', H: 'X.X|X.X|XXX|X.X|X.X', I: 'XXX|.X.|.X.|.X.|XXX', J: '..X|..X|..X|X.X|XXX', K: 'X.X|X.X|XX.|X.X|X.X', L: 'X..|X..|X..|X..|XXX',
    M: 'X.X|XXX|XXX|X.X|X.X', N: 'XX.|X.X|X.X|X.X|X.X', O: 'XXX|X.X|X.X|X.X|XXX', P: 'XXX|X.X|XXX|X..|X..', Q: 'XXX|X.X|X.X|XXX|..X', R: 'XX.|X.X|XX.|X.X|X.X',
    S: 'XXX|X..|XXX|..X|XXX', T: 'XXX|.X.|.X.|.X.|.X.', U: 'X.X|X.X|X.X|X.X|XXX', V: 'X.X|X.X|X.X|X.X|.X.', W: 'X.X|X.X|XXX|XXX|X.X', X: 'X.X|X.X|.X.|X.X|X.X',
    Y: 'X.X|X.X|.X.|.X.|.X.', Z: 'XXX|..X|.X.|X..|XXX', '0': 'XXX|X.X|X.X|X.X|XXX', '1': '.X.|XX.|.X.|.X.|XXX', '2': 'XXX|..X|XXX|X..|XXX', '3': 'XXX|..X|XXX|..X|XXX',
    '4': 'X.X|X.X|XXX|..X|..X', '5': 'XXX|X..|XXX|..X|XXX', '6': 'XXX|X..|XXX|X.X|XXX', '7': 'XXX|..X|..X|..X|..X', '8': 'XXX|X.X|XXX|X.X|XXX', '9': 'XXX|X.X|XXX|..X|XXX',
    ' ': '...|...|...|...|...', '-': '...|...|XXX|...|...', '.': '...|...|...|...|.X.', ':': '...|.X.|...|.X.|...', '!': '.X.|.X.|.X.|...|.X.', '/': '..X|..X|.X.|X..|X..', '>': 'X..|.X.|..X|.X.|X..',
  };
  function textW(s, sc) { return s.length * 4 * sc - sc; }
  function text(ctx, s, x, y, sc, color, glow) {
    s = s.toUpperCase();
    if (glow) { ctx.save(); ctx.globalAlpha = .18; for (let dy = -sc; dy <= sc; dy += sc) for (let dx = -sc; dx <= sc; dx += sc) if (dx || dy) drawGlyphs(ctx, s, x + dx, y + dy, sc, color); ctx.restore(); }
    drawGlyphs(ctx, s, x, y, sc, color);
  }
  function drawGlyphs(ctx, s, x, y, sc, color) {
    let cx = x;
    for (const ch of s) { const g = FONT[ch] || FONT[' ']; const rows = g.split('|'); for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (rows[r][c] === 'X') P(ctx, cx + c * sc, y + r * sc, sc, sc, color); cx += 4 * sc; }
  }

  /* ---------------- sprites ---------------- */
  function sprite(rows, pal) { return { w: rows[0].length, h: rows.length, rows, pal }; }
  function blit(ctx, sp, x, y, flip) { for (let r = 0; r < sp.h; r++) for (let c = 0; c < sp.w; c++) { const k = sp.rows[r][c]; if (k === '.') continue; const col = sp.pal[k]; if (!col) continue; P(ctx, x + (flip ? sp.w - 1 - c : c), y + r, 1, 1, col); } }
  const AV_PAL = { h: C.hair, s: C.skin, t: C.hoodie, T: C.hoodie2, j: C.jeans, J: C.jeans2, w: C.shoe, o: C.outline, e: '#1B1B1B' };
  const AVATAR = [
    sprite(['...hhhh...', '..hhhhhh..', '..hsssshh.', '..seseshh.', '..ssssss..', '...ssss...', '..tttttt..', '.ttTttTtt.', '.tttttttt.', 'stttttttts', '.tttttttt.', '..TTTTTT..', '..jjjjjj..', '..jjjjjj..', '..jj..jj..', '..jj..jj..', '..JJ..JJ..', '..JJ..JJ..', '.www..www.', '.www..www.'], AV_PAL),
    sprite(['...hhhh...', '..hhhhhh..', '..hsssshh.', '..seseshh.', '..ssssss..', '...ssss...', '..tttttt..', '.ttTttTtt.', 'sttttttts.', '.tttttttt.', '.tttttttt.', '..TTTTTT..', '..jjjjjj..', '.jjjj.jjj.', '.jjj...jj.', 'JJ.....JJ.', 'JJ.....JJ.', 'ww.....ww.', 'ww.....ww.', '..........'], AV_PAL),
    sprite(['...hhhh...', '..hhhhhh..', '..hsssshh.', '..seseshh.', '..ssssss..', '...ssss...', '..tttttt..', '.ttTttTtt.', '.stttttts.', '.tttttttt.', '.tttttttt.', '..TTTTTT..', '..jjjjjj..', '..jjjjjj..', '..jjjjjj..', '..jj.jjj..', '..JJ.JJ...', '..JJ.JJ...', '.www.www..', '..........'], AV_PAL),
  ];
  const CAT = sprite(['.f.....f.', '.fff.fff.', 'feffffef.', 'ffffffff.', '.ffffff.F', '.ffffff.F', '.ffffffFF', '.f.ff.f..'], { f: C.cat.fur, F: C.cat.fur2, e: C.cat.eye });
  const MOON = sprite(['...mmmm...', '.mmmmmmmm.', '.mmmmmmmmm', 'mmmmmmdmmm', 'mmmmmmmmmm', 'mmdmmmmmmm', 'mmmmmmmmmm', '.mmmmmmmm.', '.mmmmmmmm.', '...mmmm...'], { m: '#F2EBC8', d: '#D8CFA6' });

  /* ---------------- the street: what is where ---------------- */
  const GROUND = 268;            // where the houses stand
  const WALK_Y = 284;            // where feet touch the sidewalk
  const S = { windows: [], neon: [], lamps: [], chimneys: [], marquee: [] };
  const L = { back: mk(), front: mk() };
  const BUILDINGS = [
    { id: 'o-mne', name: 'Domek', label: 'O mně', x: 6, w: 68, floors: 2, roofStyle: 'gable', wall: '#33283A', roof: '#4A2E33', sign: null, kind: 'home', door: 36 },
    { id: 'roblox', name: 'Herna', label: 'Roblox projekty', x: 80, w: 92, floors: 3, roofStyle: 'parapet', wall: '#2E2A3E', roof: '#3A3F52', sign: 'HERNA', signColor: C.neonPink, kind: 'arcade', door: 46 },
    { id: 'shorts', name: 'Studio', label: 'YouTube Shorts bot', x: 178, w: 88, floors: 4, roofStyle: 'parapet', wall: '#26222F', roof: '#4E3540', sign: 'STUDIO', signColor: C.neonRed, kind: 'studio', door: 44 },
    { id: 'weby', name: 'Web studio', label: 'Tvorba webů', x: 272, w: 82, floors: 3, roofStyle: 'tiled', wall: '#3B2E3F', roof: '#5A3A3A', sign: 'WEBY', signColor: C.teal, kind: 'web', door: 41 },
    { id: 'lab', name: 'Laboratoř', label: 'AI Továrna & nápady', x: 360, w: 90, floors: 4, roofStyle: 'parapet', wall: '#2C3140', roof: '#3A3F52', sign: 'LAB', signColor: C.violet, kind: 'lab', door: 45, chimney: true },
    { id: 'skola', name: 'Škola', label: 'Studium & zkušenosti', x: 456, w: 100, floors: 3, roofStyle: 'tiled', wall: '#2F2A2A', roof: '#4A2E33', sign: 'UP OLOMOUC', signColor: C.amber, kind: 'school', door: 50 },
    { id: 'kontakt', name: 'Kiosek', label: 'Kontakt', x: 562, w: 72, floors: 1, roofStyle: 'parapet', wall: '#2A2432', roof: '#3A2A2A', sign: 'INFO', signColor: C.neonBlue, kind: 'kiosk', door: 36 },
  ];
  BUILDINGS.forEach(b => { b.h = b.kind === 'kiosk' ? 40 : 24 + b.floors * 30 + (b.kind === 'lab' ? 10 : 0); b.top = GROUND - b.h; b.doorX = b.x + b.door; });

  function window_(x, y, w, h, o) { S.windows.push(Object.assign({ x, y, w, h, lit: rng() < .6, warm: rng() < .84, flick: rng() < .05, ph: R(0, 100), next: R(4, 40), person: rng() < .08 }, o || {})); }
  function frame(ctx, x, y, w, h) { P(ctx, x - 1, y - 1, w + 2, h + 2, C.outline); P(ctx, x - 1, y + h, w + 2, 1, C.trim); }

  function drawRoof(ctx, b) {
    const { x, w, top, roof } = b;
    if (b.roofStyle === 'gable') {
      for (let i = 0; i < 12; i++) P(ctx, x - 3 + i * (w + 6) / 24, top - 12 + i, (w + 6) - i * (w + 6) / 12, 1, i % 3 === 2 ? C.roofEdge : roof);
      P(ctx, x - 4, top, w + 8, 1, C.outline); P(ctx, x - 4, top - 1, w + 8, 1, C.roofEdge);
    } else if (b.roofStyle === 'tiled') {
      P(ctx, x - 6, top - 9, w + 12, 9, roof); P(ctx, x - 7, top, w + 14, 1, C.outline); P(ctx, x - 6, top - 10, w + 12, 1, C.roofEdge);
      for (let r = top - 8; r < top; r += 2) for (let i = x - 6 + ((r / 2) % 2 ? 2 : 0); i < x + w + 6; i += 4) P(ctx, i, r, 1, 1, 'rgba(0,0,0,.35)');
      P(ctx, x - 6, top - 1, w + 12, 1, 'rgba(0,0,0,.3)');
    } else {
      P(ctx, x - 1, top - 5, w + 2, 5, roof); P(ctx, x - 2, top - 6, w + 4, 1, C.outline); P(ctx, x - 1, top - 7, w + 2, 1, C.roofEdge);
      for (let i = x + 3; i < x + w - 3; i += 8) P(ctx, i, top - 9, 4, 2, C.roofEdge);
      P(ctx, x + w - 14, top - 15, 6, 10, C.wallDark); P(ctx, x + w - 15, top - 16, 8, 1, C.outline); // water tank
      P(ctx, x + 6, top - 12, 1, 7, '#8A8A96'); P(ctx, x + 4, top - 12, 5, 1, '#8A8A96');           // a TV aerial
    }
  }
  function building(ctx, b) {
    const { x, w, top, wall } = b, bottom = GROUND;
    P(ctx, x - 1, top, w + 2, bottom - top, C.outline); P(ctx, x, top, w, bottom - top, wall);
    P(ctx, x, top, 1, bottom - top, 'rgba(255,255,255,.10)'); P(ctx, x + w - 3, top, 3, bottom - top, 'rgba(0,0,0,.18)');
    P(ctx, x, bottom - 26, w, 26, C.wallDark);                                       // ground floor band
    for (let i = 0; i < w * (bottom - top) / 30; i++) P(ctx, x + RI(0, w - 3), top + RI(2, bottom - top - 28), 3, 1, 'rgba(255,255,255,.045)');
    drawRoof(ctx, b);
    // floors of windows: 5x7 panes with a sill, a floor line under each row
    const cols = Math.max(1, Math.floor((w - 8) / 12));
    const startX = x + Math.floor((w - cols * 12 + 4) / 2);
    for (let f = 0; f < b.floors - (b.kind === 'kiosk' ? 1 : 1); f++) {
      const wy = top + 12 + f * 30;
      if (wy + 9 > bottom - 28) break;
      P(ctx, x, wy + 10, w, 1, 'rgba(0,0,0,.25)');
      for (let c = 0; c < cols; c++) {
        const wx = startX + c * 12;
        if (b.kind === 'studio' && f <= 1 && c >= 1 && c <= cols - 2) continue;    // the sign (row 0) and the big screen (row 1) go here
        frame(ctx, wx, wy, 5, 7); P(ctx, wx - 1, wy + 8, 7, 1, C.trim); window_(wx, wy, 5, 7);
      }
    }
    // the door, lit from inside
    const dx = b.doorX - 6; P(ctx, dx - 1, bottom - 21, 14, 21, C.outline); P(ctx, dx, bottom - 20, 12, 20, '#4A3A44'); P(ctx, dx + 1, bottom - 19, 10, 18, '#1E2A3A');
    P(ctx, dx + 2, bottom - 18, 8, 9, '#3A5A78'); P(ctx, dx + 8, bottom - 10, 1, 1, C.amber); P(ctx, dx - 3, bottom - 2, 18, 2, C.walk2);
    b.doorWin = { x: dx + 2, y: bottom - 18, w: 8, h: 9 };
    // per-house props
    if (b.kind === 'home') {
      P(ctx, x + 8, bottom - 40, 14, 10, C.outline); P(ctx, x + 9, bottom - 39, 12, 8, C.warm[0]); window_(x + 9, bottom - 39, 12, 8, { lit: true, warm: true, flick: false, person: false, sill: true });
      P(ctx, x + 7, bottom - 30, 16, 2, C.trim);                                           // the sill the cat sits on
      P(ctx, x + w - 22, bottom - 44, 16, 12, C.outline); P(ctx, x + w - 21, bottom - 43, 14, 10, '#1E2A3A'); window_(x + w - 21, bottom - 43, 14, 10, { lit: true, warm: false, person: false });
      for (let i = 0; i < 5; i++) { P(ctx, x + 2 + i * 13, bottom - 4, 6, 4, '#2F6B4A'); P(ctx, x + 3 + i * 13, bottom - 6, 4, 2, '#3F8A5A'); }   // hedge
    }
    if (b.kind === 'arcade') {
      P(ctx, x - 2, top + 44, w + 4, 14, C.outline); P(ctx, x - 1, top + 45, w + 2, 12, '#1B1B1B');
      for (let i = 0; i < Math.floor((w + 2) / 6); i++) S.marquee.push({ x: x + 1 + i * 6, y: top + 46, i });
      for (let i = 0; i < Math.floor((w + 2) / 6); i++) S.marquee.push({ x: x + 1 + i * 6, y: top + 55, i: i + 1 });
      P(ctx, x + 6, bottom - 24, w - 12, 2, C.neonPink);                                  // a step of light under the awning
      for (let i = 0; i < 3; i++) { const ax = x + 8 + i * 26; P(ctx, ax, bottom - 20, 18, 14, C.outline); P(ctx, ax + 1, bottom - 19, 16, 12, '#0E1522'); window_(ax + 2, bottom - 18, 14, 8, { lit: true, warm: false, flick: true, person: false, arcade: true }); }
    }
    if (b.kind === 'studio') {
      const sx = startX + 12, sw = (cols - 2) * 12 - 4; P(ctx, sx - 2, top + 40, sw + 4, 22, C.outline); P(ctx, sx - 1, top + 41, sw + 2, 20, '#0E1522'); b.screen = { x: sx, y: top + 42, w: sw, h: 18 };
      P(ctx, x + w - 10, top - 34, 2, 28, '#8A8A96'); P(ctx, x + w - 14, top - 28, 10, 1, '#8A8A96'); P(ctx, x + w - 12, top - 20, 6, 1, '#8A8A96'); b.beacon = { x: x + w - 10, y: top - 36 };
      P(ctx, x + 10, top - 14, 12, 9, C.outline); P(ctx, x + 11, top - 13, 10, 7, '#C9CFD8'); P(ctx, x + 15, top - 7, 2, 4, '#8A8A96'); P(ctx, x + 12, top - 12, 3, 2, '#F2F2F4'); // the dish
      P(ctx, x + 6, bottom - 24, 30, 1, C.neonRed); text(ctx, 'ON AIR', x + 8, bottom - 44, 1, C.neonRed, true);
    }
    if (b.kind === 'web') {
      P(ctx, x + 4, bottom - 46, w - 8, 20, C.outline); P(ctx, x + 5, bottom - 45, w - 10, 18, '#0E1522'); window_(x + 6, bottom - 44, w - 12, 16, { lit: true, warm: false, person: false, shop: true });
      b.open = { x: x + w - 34, y: bottom - 42 };
      P(ctx, x + 2, bottom - 50, w - 4, 3, '#4A3A44'); for (let i = 0; i < (w - 4) / 8; i++) P(ctx, x + 2 + i * 8, bottom - 50, 4, 3, C.teal);   // awning stripes
    }
    if (b.kind === 'lab') {
      P(ctx, x + 12, top - 26, 8, 28, C.wallDark); P(ctx, x + 11, top - 27, 10, 2, C.outline); S.chimneys.push({ x: x + 16, y: top - 27 });
      for (let i = 0; i < 4; i++) P(ctx, x + w - 30 + i * 6, top - 10, 3, 10 - i * 2, '#8A8A96');      // pipes
      P(ctx, x + 8, bottom - 44, 22, 16, C.outline); P(ctx, x + 9, bottom - 43, 20, 14, '#0E1522'); window_(x + 10, bottom - 42, 18, 12, { lit: true, warm: false, person: false, lab: true });
      P(ctx, x + w - 30, bottom - 44, 22, 16, C.outline); P(ctx, x + w - 29, bottom - 43, 20, 14, '#0E1522'); window_(x + w - 28, bottom - 42, 18, 12, { lit: true, warm: false, person: false, lab: true, ph: 2 });
    }
    if (b.kind === 'school') {
      for (let i = 0; i < 4; i++) P(ctx, x + 10 + i * 26, bottom - 26, 5, 26, '#4A4652');        // columns
      P(ctx, x + 6, bottom - 28, w - 12, 3, '#5A5664');
      const cx = x + Math.floor(w / 2); P(ctx, cx - 7, top + 14, 14, 14, C.outline); P(ctx, cx - 6, top + 15, 12, 12, '#F2EBC8'); b.clock = { x: cx, y: top + 21 };
      P(ctx, cx - 1, top - 20, 2, 12, '#8A8A96'); b.flag = { x: cx + 1, y: top - 20 };
    }
    if (b.kind === 'kiosk') {
      P(ctx, x + 2, bottom - 32, w - 4, 4, '#4A3A44'); for (let i = 0; i < (w - 4) / 8; i++) P(ctx, x + 2 + i * 8, bottom - 32, 4, 4, C.neonBlue);
      P(ctx, x + 8, bottom - 26, 18, 12, C.outline); P(ctx, x + 9, bottom - 25, 16, 10, '#F2EBC8');   // a notice board
      text(ctx, 'AHOJ', x + 10, bottom - 23, 1, '#2A2432');
      P(ctx, x + w - 26, bottom - 26, 16, 12, C.outline); P(ctx, x + w - 25, bottom - 25, 14, 10, '#1E2A3A'); window_(x + w - 24, bottom - 24, 12, 8, { lit: true, warm: true, person: false });
    }
    // the sign
    if (b.sign) { const sc = b.kind === 'kiosk' ? 1 : 2, tw = textW(b.sign, sc); const sx = x + Math.floor((w - tw) / 2), sy = b.kind === 'arcade' ? top + 20 : top + (b.kind === 'kiosk' ? 4 : 14) - (b.kind === 'web' ? 2 : 0); P(ctx, sx - 4, sy - 3, tw + 8, 5 * sc + 6, C.outline); P(ctx, sx - 3, sy - 2, tw + 6, 5 * sc + 4, '#0E0E18'); S.neon.push({ text: b.sign, x: sx, y: sy, sc, color: b.signColor, ph: R(0, 6), flick: b.kind === 'web' }); }
  }

  function farSkyline(ctx) {
    // Ostrava behind the street: the Bolt Tower on the blast furnace, the New City Hall tower, a pit head, chimneys, blocks of flats
    const base = GROUND - 120;
    P(ctx, 0, base - 8, W, 130, C.far2);
    const blocks = [[0, 30, 22], [26, 46, 14], [50, 40, 26], [104, 24, 30], [132, 36, 18], [172, 30, 20], [210, 60, 12], [300, 28, 26], [336, 24, 34], [396, 40, 16], [470, 44, 22], [520, 30, 28], [556, 40, 16], [600, 40, 24]];
    blocks.forEach(([bx, bw, bh]) => { P(ctx, bx, base - bh, bw, bh + 10, C.far); for (let yy = base - bh + 3; yy < base; yy += 4) for (let xx = bx + 2; xx < bx + bw - 2; xx += 4) if (rng() < .3) P(ctx, xx, yy, 1, 1, C.farLit); });
    // New City Hall tower (the tallest in the country)
    P(ctx, 250, base - 62, 10, 70, C.far); P(ctx, 252, base - 70, 6, 8, C.far); P(ctx, 254, base - 76, 2, 6, C.farLit); P(ctx, 253, base - 40, 4, 4, C.farLit);
    // blast furnace + Bolt Tower
    P(ctx, 386, base - 50, 12, 58, C.far); P(ctx, 383, base - 36, 18, 6, C.far); P(ctx, 380, base - 24, 24, 6, C.far); P(ctx, 384, base - 58, 16, 9, '#1A2240'); P(ctx, 386, base - 56, 12, 5, C.farLit); P(ctx, 398, base - 46, 3, 30, C.far);
    P(ctx, 404, base - 44, 3, 52, C.far); P(ctx, 412, base - 30, 3, 38, C.far); P(ctx, 404, base - 30, 11, 2, C.far);  // pipes
    // a pit head frame (těžní věž)
    for (let i = 0; i < 26; i++) P(ctx, 150 + i * .3, base - 34 + i, 1, 1, C.far), P(ctx, 166 - i * .3, base - 34 + i, 1, 1, C.far);
    P(ctx, 150, base - 36, 17, 3, C.far); P(ctx, 154, base - 41, 9, 6, C.far); P(ctx, 156, base - 44, 5, 4, C.farLit);
    // chimneys with a red light
    [[70, 46], [230, 40], [540, 52]].forEach(([cx, ch]) => { P(ctx, cx, base - ch, 4, ch + 8, C.far); });
    P(ctx, 0, base + 8, W, 2, C.far2);
  }

  function drawStatic() {
    const bg = L.back.getContext('2d');
    farSkyline(bg);
    // the far sidewalk, the road, rails, the near sidewalk
    P(bg, 0, GROUND, W, 18, C.walk); for (let i = 0; i < W; i += 16) P(bg, i, GROUND, 1, 18, C.walkLine); P(bg, 0, GROUND + 16, W, 2, C.curb);
    P(bg, 0, GROUND + 18, W, 44, C.asphalt); for (let i = 0; i < W; i += 24) P(bg, i, GROUND + 42, 12, 1, '#3A3F52');
    P(bg, 0, GROUND + 27, W, 1, C.railDark); P(bg, 0, GROUND + 26, W, 1, C.rail); P(bg, 0, GROUND + 33, W, 1, C.railDark); P(bg, 0, GROUND + 32, W, 1, C.rail);
    for (let i = 0; i < 400; i++) P(bg, RI(0, W), GROUND + RI(19, 61), 2, 1, 'rgba(255,255,255,.03)');
    P(bg, 0, GROUND + 62, W, 2, C.curb); P(bg, 0, GROUND + 64, W, H - GROUND - 64, C.walk2); for (let i = 8; i < W; i += 16) P(bg, i, GROUND + 64, 1, H - GROUND - 64, C.walkLine);
    BUILDINGS.forEach(b => building(bg, b));
    // alleys between houses: a dark gap with a drainpipe
    for (let i = 0; i < BUILDINGS.length - 1; i++) { const a = BUILDINGS[i], b = BUILDINGS[i + 1]; const gx = a.x + a.w + 1, gw = b.x - gx - 1; P(bg, gx, Math.max(a.top, b.top) - 2, gw, GROUND - Math.max(a.top, b.top) + 2, '#0E1018'); P(bg, gx + Math.floor(gw / 2), Math.max(a.top, b.top), 1, GROUND - Math.max(a.top, b.top), '#2A2A34'); }
    // lamps on the far sidewalk
    [40, 176, 358, 470, 636].forEach((lx, i) => { lampPost(bg, lx, GROUND + 16, 46); S.lamps.push({ x: lx, y: GROUND + 16 - 46, ph: i * 1.3 }); });
    // foreground: a bench, a bike stand, a bin, a tram stop sign
    const fg = L.front.getContext('2d');
    P(fg, 120, GROUND + 70, 30, 3, '#5B3A2A'); P(fg, 122, GROUND + 66, 26, 3, '#7A4E32'); P(fg, 122, GROUND + 73, 2, 7, C.lampPost); P(fg, 146, GROUND + 73, 2, 7, C.lampPost);
    P(fg, 300, GROUND + 68, 2, 12, '#8A8A96'); P(fg, 296, GROUND + 66, 10, 3, C.tramBlue); P(fg, 297, GROUND + 67, 8, 1, '#F2F2F4');
    for (let i = 0; i < 3; i++) { P(fg, 400 + i * 10, GROUND + 70, 6, 8, C.lampPost); P(fg, 401 + i * 10, GROUND + 69, 4, 1, '#8A8A96'); }
    P(fg, 520, GROUND + 68, 8, 12, '#2C3E6B'); P(fg, 519, GROUND + 67, 10, 2, '#3A4E72');
  }
  function lampPost(ctx, x, y, h) { P(ctx, x - 1, y - h, 3, h, C.lampPost); P(ctx, x - 3, y - 1, 7, 2, C.lampPost); P(ctx, x - 1, y - h - 2, 8, 2, C.lampPost); P(ctx, x + 5, y - h - 6, 4, 5, C.lampHead); P(ctx, x + 6, y - h - 2, 2, 1, C.lamp); }

  /* ---------------- the living part ---------------- */
  const state = {
    t: 0, rain: false, snow: false, timeOverride: null, key: 'night',
    avatar: { x: 110, dir: 1, target: null, walking: 0, frame: 0, arriveId: null, idle: 0 },
    cat: { x: 0, y: 0, blink: 0, say: 0, wag: 0 },
    tram: { x: W + 80, dir: -1, next: 6 }, cars: [], nextCar: 3, bike: null, nextBike: 14, smoke: [], drops: [], hover: null, beacon: 0, moonClicks: 0, stars: [],
  };
  for (let i = 0; i < 90; i++) state.stars.push({ x: RI(0, W), y: RI(0, GROUND - 140), ph: R(0, 6.3), s: rng() < .15 ? 2 : 1 });
  const home = BUILDINGS[0]; state.cat.x = home.x + 9; state.cat.y = GROUND - 38;

  function skyFor(key) { return SKY[key]; }
  function drawSky(ctx, sky, sub) {
    const g = ctx.createLinearGradient(0, 0, 0, GROUND - 100); g.addColorStop(0, sky.top); g.addColorStop(.55, sky.mid); g.addColorStop(1, sky.hor);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, GROUND - 100);
    if (sky.stars > 0) state.stars.forEach(s => { const a = (.4 + .6 * Math.abs(Math.sin(state.t * .9 + s.ph))) * sky.stars; ctx.globalAlpha = a; P(ctx, s.x, s.y, s.s, s.s, '#F7F7F2'); }); ctx.globalAlpha = 1;
    if (sky.sun) { P(ctx, 330, 40, 14, 14, '#FFE8A0'); P(ctx, 332, 38, 10, 18, '#FFE8A0'); P(ctx, 328, 42, 18, 10, '#FFE8A0'); }
    else { blit(ctx, MOON, 352 + (state.moonClicks % 3) * 12, 30); }
    // slow clouds
    for (let i = 0; i < 4; i++) { const cx = ((state.t * 3 + i * 170) % (W + 120)) - 60, cy = 30 + i * 22; ctx.globalAlpha = sky.sun ? .55 : .12; P(ctx, cx, cy, 44, 6, '#F7F7F2'); P(ctx, cx + 8, cy - 4, 24, 4, '#F7F7F2'); P(ctx, cx + 14, cy + 6, 20, 3, '#F7F7F2'); } ctx.globalAlpha = 1;
  }

  function drawWindows(ctx, sky, dt) {
    S.windows.forEach(w => {
      if (w.flick) { w.next -= dt; if (w.next <= 0) { w.lit = !w.lit; w.next = w.lit ? R(3, 30) : R(.2, 3); } }
      const on = w.lit && (sky.lit >= 1 || live() < sky.lit || w.lit === true && sky.lit > .5);
      if (w.arcade) { const c = ['#FF4A5C', '#4EE6CC', '#FFB347', '#5AB4FF'][(Math.floor(state.t * 4) + Math.floor(w.x / 7)) % 4]; P(ctx, w.x, w.y, w.w, w.h, '#0E1522'); P(ctx, w.x + 1, w.y + 1, w.w - 2, w.h - 2, c); P(ctx, w.x + 3, w.y + 2, 3, 2, '#F7F7F2'); return; }
      if (w.shop) { P(ctx, w.x, w.y, w.w, w.h, '#132A2A'); for (let i = 0; i < 3; i++) P(ctx, w.x + 4 + i * 20, w.y + 4, 14, 8, i === 1 ? C.teal : '#1E6E64'); P(ctx, w.x + 6, w.y + 6, 10, 1, '#F7F7F2'); P(ctx, w.x + 26, w.y + 6, 10, 1, '#0B1020'); P(ctx, w.x + 46, w.y + 6, 10, 1, '#F7F7F2'); return; }
      if (w.lab) { const ph = (state.t * 1.5 + (w.ph || 0)); P(ctx, w.x, w.y, w.w, w.h, '#101828'); for (let i = 0; i < 4; i++) { const hh = 2 + Math.abs(Math.sin(ph + i)) * 8; P(ctx, w.x + 2 + i * 4, w.y + w.h - hh, 3, hh, i % 2 ? C.violet : C.teal); } return; }
      if (!on) { P(ctx, w.x, w.y, w.w, w.h, sky.sun ? C.glassDay : C.off); return; }
      const col = w.warm ? C.warm[(w.x * 7 + w.y) % 4] : C.cool; P(ctx, w.x, w.y, w.w, w.h, col);
      if (w.person && Math.sin(state.t * .3 + w.ph) > .2) P(ctx, w.x + 1, w.y + 2, 2, w.h - 2, 'rgba(0,0,0,.55)');
      if (!sky.sun) { ctx.globalAlpha = .10; P(ctx, w.x - 2, w.y - 2, w.w + 4, w.h + 4, col); ctx.globalAlpha = 1; }
    });
    // the studio screen: a short in progress
    const st = BUILDINGS[2].screen; if (st) { const f = Math.floor(state.t * 2) % 6; P(ctx, st.x, st.y, st.w, st.h, '#1B1B1B'); P(ctx, st.x + 1, st.y + 1, st.w - 2, st.h - 2, ['#FF4A5C', '#FFB347', '#4EE6CC', '#5AB4FF', '#FF7AB8', '#7CFF6B'][f]); P(ctx, st.x + 3, st.y + 3, st.w - 6, st.h - 6, 'rgba(0,0,0,.45)'); P(ctx, st.x + st.w / 2 - 3, st.y + st.h / 2 - 3, 6, 6, '#F7F7F2'); P(ctx, st.x + 4, st.y + st.h - 4, ((state.t * 20) % (st.w - 8)), 1, C.neonRed); }
    // doors glow
    BUILDINGS.forEach(b => { const d = b.doorWin; ctx.globalAlpha = .55 + .1 * Math.sin(state.t * 2 + b.x); P(ctx, d.x, d.y, d.w, d.h, C.warm[1]); ctx.globalAlpha = 1; });
  }
  function drawNeon(ctx, sky) {
    S.neon.forEach(n => { let on = true; if (n.flick) { const v = Math.sin(state.t * 13 + n.ph) * Math.sin(state.t * 3.7); on = v > -.85; } const col = on ? n.color : '#3A2A3A'; if (on && !sky.sun) { ctx.globalAlpha = .12 + .05 * Math.sin(state.t * 4 + n.ph); P(ctx, n.x - 6, n.y - 5, textW(n.text, n.sc) + 12, 5 * n.sc + 10, n.color); ctx.globalAlpha = 1; } text(ctx, n.text, n.x, n.y, n.sc, col, on && !sky.sun); });
    // marquee bulbs chase around the arcade
    S.marquee.forEach(m => { const on = (m.i + Math.floor(state.t * 6)) % 3 === 0; P(ctx, m.x, m.y, 3, 3, on ? C.warm[1] : '#4A3A2A'); });
    const wb = BUILDINGS[3]; if (wb.open) { const on = Math.floor(state.t * 1.2) % 2 === 0 || sky.sun; text(ctx, 'OTEVRENO', wb.open.x, wb.open.y, 1, on ? C.neonGreen : '#2A4A2A', on && !sky.sun); }
    const sb = BUILDINGS[2]; if (sb.beacon) P(ctx, sb.beacon.x, sb.beacon.y, 2, 2, Math.floor(state.t * 2) % 2 ? C.neonRed : '#5A1A20');
    const sc = BUILDINGS[5]; if (sc.clock) { const d = new Date(); const h = (d.getHours() % 12) / 12 * 6.283 - 1.571, m = d.getMinutes() / 60 * 6.283 - 1.571; for (let i = 1; i <= 3; i++) P(ctx, sc.clock.x + Math.round(Math.cos(h) * i), sc.clock.y + Math.round(Math.sin(h) * i), 1, 1, '#1B1B1B'); for (let i = 1; i <= 5; i++) P(ctx, sc.clock.x + Math.round(Math.cos(m) * i), sc.clock.y + Math.round(Math.sin(m) * i), 1, 1, '#1B1B1B'); }
    if (sc.flag) { const f = sc.flag; for (let i = 0; i < 8; i++) P(ctx, f.x + i, f.y + Math.round(Math.sin(state.t * 6 + i * .8)), 1, 5, i < 4 ? '#F7F7F2' : C.neonRed); }
  }
  function drawLamps(ctx, sky) { if (sky.sun) return; S.lamps.forEach(l => { const a = .10 + .02 * Math.sin(state.t * 5 + l.ph); ctx.globalAlpha = a; for (let i = 0; i < 5; i++) P(ctx, l.x + 6 - 4 - i * 5, l.y + 2 + i * 9, 10 + i * 10, 9, C.lamp); ctx.globalAlpha = .28; P(ctx, l.x + 4, l.y - 2, 6, 4, C.lamp); ctx.globalAlpha = 1; }); }

  function drawTram(ctx, dt, sky) {
    const tr = state.tram; if (tr.next > 0) { tr.next -= dt; if (tr.next <= 0) { tr.dir = live() < .5 ? -1 : 1; tr.x = tr.dir < 0 ? W + 10 : -90; } else return; }
    tr.x += tr.dir * 42 * dt; if (tr.x < -100 || tr.x > W + 100) { tr.next = R(18, 40); return; }
    const x = Math.round(tr.x), y = GROUND + 8;
    P(ctx, x + 10, y - 12, 2, 10, '#8A8A96'); P(ctx, x + 6, y - 12, 10, 1, '#8A8A96');              // pantograph
    P(ctx, x - 1, y, 82, 24, C.outline); P(ctx, x, y + 1, 80, 22, C.tram); P(ctx, x, y + 15, 80, 8, C.tramBlue); P(ctx, x, y + 22, 80, 1, C.tramDark);
    for (let i = 0; i < 6; i++) { P(ctx, x + 4 + i * 13, y + 4, 9, 8, C.outline); P(ctx, x + 5 + i * 13, y + 5, 7, 6, sky.sun ? C.tramGlass : C.warm[1]); }
    P(ctx, x + 2, y + 3, 1, 12, C.tramDark); P(ctx, x + 77, y + 3, 1, 12, C.tramDark);
    if (!sky.sun) { const hx = tr.dir < 0 ? x - 6 : x + 80; ctx.globalAlpha = .18; P(ctx, hx - (tr.dir < 0 ? 24 : 0), y + 14, 30, 6, C.lamp); ctx.globalAlpha = 1; P(ctx, tr.dir < 0 ? x : x + 78, y + 16, 2, 2, C.lamp); }
    P(ctx, x + 6, y + 23, 6, 2, '#1B1B1B'); P(ctx, x + 66, y + 23, 6, 2, '#1B1B1B'); P(ctx, x + 30, y + 23, 6, 2, '#1B1B1B');
    text(ctx, 'DPO', x + 34, y + 16, 1, '#F7F7F2');
  }
  function drawCars(ctx, dt, sky) {
    state.nextCar -= dt; if (state.nextCar <= 0) { state.nextCar = R(4, 11); const dir = live() < .5 ? 1 : -1; state.cars.push({ x: dir > 0 ? -40 : W + 40, dir, v: R(55, 85), c: ['#C0392B', '#2C7BE5', '#E8A340', '#F7F7F2', '#4A4A52', '#2F6B4A'][RI(0, 5)] }); }
    state.cars = state.cars.filter(c => c.x > -60 && c.x < W + 60);
    state.cars.forEach(c => { c.x += c.dir * c.v * dt; const x = Math.round(c.x), y = GROUND + 46; P(ctx, x - 1, y - 6, 28, 11, C.outline); P(ctx, x, y - 5, 26, 9, c.c); P(ctx, x + 6, y - 9, 14, 5, c.c); P(ctx, x + 7, y - 8, 5, 3, '#9CC9FF'); P(ctx, x + 14, y - 8, 5, 3, '#9CC9FF'); P(ctx, x + 4, y + 3, 4, 3, '#1B1B1B'); P(ctx, x + 18, y + 3, 4, 3, '#1B1B1B'); const fx = c.dir > 0 ? x + 25 : x, bx = c.dir > 0 ? x : x + 25; P(ctx, fx, y - 3, 1, 2, C.lamp); P(ctx, bx, y - 3, 1, 2, C.neonRed); if (!sky.sun) { ctx.globalAlpha = .12; P(ctx, c.dir > 0 ? x + 26 : x - 18, y - 4, 18, 5, C.lamp); ctx.globalAlpha = 1; } });
  }
  function drawBike(ctx, dt) {
    let b = state.bike; if (!b) { state.nextBike -= dt; if (state.nextBike <= 0) { state.bike = b = { x: -20, v: 30 }; } else return; }
    b.x += b.v * dt; if (b.x > W + 20) { state.bike = null; state.nextBike = R(20, 45); return; }
    const x = Math.round(b.x), y = GROUND + 58, ph = Math.floor(state.t * 8) % 2;
    P(ctx, x, y, 5, 5, '#2C7BE5'); P(ctx, x + 9, y, 5, 5, '#2C7BE5'); P(ctx, x + 1, y + 1, 3, 3, C.asphalt); P(ctx, x + 10, y + 1, 3, 3, C.asphalt);   // nextbike blue wheels
    P(ctx, x + 2, y - 1, 10, 1, '#F7F7F2'); P(ctx, x + 6, y - 5, 1, 5, '#F7F7F2'); P(ctx, x + 10, y - 3, 3, 1, '#F7F7F2');
    P(ctx, x + 4, y - 9, 4, 5, C.hoodie); P(ctx, x + 5, y - 12, 3, 3, C.skin); P(ctx, x + 5, y - 13, 3, 1, C.hair); P(ctx, x + 6 + ph, y - 4, 2, 2, C.jeans);
  }
  function drawSmoke(ctx, dt, sky) {
    S.chimneys.forEach(ch => { if (live() < .35) state.smoke.push({ x: ch.x + R(-1, 1), y: ch.y, a: .5, r: 1, vx: R(-3, 3) }); });
    state.smoke = state.smoke.filter(s => s.a > .02);
    state.smoke.forEach(s => { s.y -= 10 * dt; s.x += s.vx * dt + 4 * dt; s.a -= .18 * dt; s.r += 2.2 * dt; ctx.globalAlpha = s.a * (sky.sun ? .8 : .45); P(ctx, s.x - s.r / 2, s.y - s.r / 2, s.r, s.r, '#C8C8D7'); });
    ctx.globalAlpha = 1;
  }
  function drawWeather(ctx, dt) {
    if (!state.rain && !state.snow) { state.drops.length = 0; return; }
    const snow = state.snow;
    while (state.drops.length < (snow ? 140 : 240)) state.drops.push({ x: live() * (W + 60) - 30, y: live() * H, v: snow ? R(12, 24) : R(160, 230), l: snow ? 1 : RI(4, 8), ph: live() * 6 });
    state.drops.forEach(d => { d.y += d.v * dt; if (snow) d.x += Math.sin(state.t + d.ph) * 8 * dt; else d.x += 20 * dt; if (d.y > H) { d.y = -10; d.x = live() * (W + 60) - 30; } if (snow) { P(ctx, d.x, d.y, 1 + (d.ph > 4 ? 1 : 0), 1 + (d.ph > 4 ? 1 : 0), '#F7F7F2'); } else P(ctx, d.x, d.y, 1, d.l, C.rain); });
    if (!snow) { ctx.globalAlpha = .06; P(ctx, 0, GROUND + 18, W, 44, '#4EE6CC'); ctx.globalAlpha = .08; S.neon.forEach(n => P(ctx, n.x - 4, GROUND + 34, textW(n.text, n.sc) + 8, 14, n.color)); ctx.globalAlpha = 1; }
  }
  function drawCat(ctx, dt) {
    const c = state.cat; c.blink -= dt; if (c.blink < -.15) c.blink = R(2, 6);
    blit(ctx, CAT, c.x, c.y, false);
    if (c.blink < 0) { P(ctx, c.x + 1, c.y + 2, 1, 1, C.cat.fur); P(ctx, c.x + 6, c.y + 2, 1, 1, C.cat.fur); }
    if (c.wag > 0) { c.wag -= dt; P(ctx, c.x + 8, c.y + 3 + Math.round(Math.sin(state.t * 14)), 1, 2, C.cat.fur2); }
    if (c.say > 0) c.say -= dt;
  }
  function drawAvatar(ctx, dt) {
    const a = state.avatar; let moving = false;
    if (a.target != null) { const d = a.target - a.x; if (Math.abs(d) < 2) { a.x = a.target; a.target = null; if (a.arriveId) { const id = a.arriveId; a.arriveId = null; hooks.enter && hooks.enter(id); } } else { a.dir = d > 0 ? 1 : -1; a.x += a.dir * Math.min(Math.abs(d), (a.run ? 78 : 46) * dt); moving = true; } }
    else if (a.vx) { a.dir = a.vx > 0 ? 1 : -1; a.x = clamp(a.x + a.vx * 46 * dt, 8, W - 12); moving = true; }
    a.walking = moving ? a.walking + dt : 0; a.idle = moving ? 0 : a.idle + dt;
    const fr = moving ? 1 + Math.floor(a.walking * 8) % 2 : 0; const sp = AVATAR[fr];
    const bob = moving ? (Math.floor(a.walking * 8) % 2) : (Math.floor(a.idle * 1.5) % 2 ? 0 : 0);
    ctx.globalAlpha = .25; P(ctx, a.x - 3, WALK_Y - 1, sp.w + 2, 2, '#000'); ctx.globalAlpha = 1;
    blit(ctx, sp, Math.round(a.x - sp.w / 2), WALK_Y - sp.h + bob, a.dir < 0);
    const near = nearestDoor(); if (near && !moving) { const yy = WALK_Y - sp.h - 12 + Math.round(Math.sin(state.t * 4)) ; P(ctx, a.x - 2, yy, 4, 1, C.teal); P(ctx, a.x - 1, yy + 1, 2, 1, C.teal); P(ctx, a.x - 3, yy - 1, 6, 1, C.teal); }
  }
  function nearestDoor() { const a = state.avatar; for (const b of BUILDINGS) if (Math.abs(a.x - b.doorX) < 12) return b; return null; }
  function drawHover(ctx) {
    const b = state.hover; if (!b) return; const ph = .5 + .5 * Math.sin(state.t * 5); ctx.globalAlpha = .35 + .35 * ph;
    P(ctx, b.x - 2, b.top - 14, b.w + 4, 1, C.teal); P(ctx, b.x - 2, GROUND + 1, b.w + 4, 1, C.teal); P(ctx, b.x - 2, b.top - 14, 1, GROUND - b.top + 16, C.teal); P(ctx, b.x + b.w + 1, b.top - 14, 1, GROUND - b.top + 16, C.teal); ctx.globalAlpha = 1;
  }

  /* ---------------- frame ---------------- */
  const canvas = document.getElementById('street'); canvas.width = W; canvas.height = H; const ctx = canvas.getContext('2d');
  const hooks = {};
  let last = 0, acc = 0;
  function frameStep(dt) {
    state.t += dt; const key = state.timeOverride || timeKey(new Date()); state.key = key; const sky = skyFor(key);
    drawSky(ctx, sky, 0);
    ctx.drawImage(L.back, 0, 0);
    if (sky.sun) { ctx.globalAlpha = .22; P(ctx, 0, 0, W, GROUND + 64, '#5F8CC8'); ctx.globalAlpha = 1; }
    drawWindows(ctx, sky, dt); drawNeon(ctx, sky); drawSmoke(ctx, dt, sky); drawCat(ctx, dt); drawLamps(ctx, sky);
    drawHover(ctx); drawAvatar(ctx, dt); drawTram(ctx, dt, sky); drawCars(ctx, dt, sky); drawBike(ctx, dt);
    ctx.drawImage(L.front, 0, 0);
    drawWeather(ctx, dt);
    if (key === 'night') { ctx.globalAlpha = .06; P(ctx, 0, 0, W, H, '#080C1D'); ctx.globalAlpha = 1; }
  }
  function loop(ts) { if (!last) last = ts; let dt = (ts - last) / 1000; last = ts; if (dt > .5) dt = .5; acc += dt; const step = 1 / FPS; if (acc >= step) { const n = Math.min(3, Math.floor(acc / step)); for (let i = 0; i < n; i++) frameStep(step); acc -= n * step; } requestAnimationFrame(loop); }

  /* ---------------- input ---------------- */
  function toLogical(e) { const r = canvas.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return { x: (t.clientX - r.left) / r.width * W, y: (t.clientY - r.top) / r.height * H }; }
  function hit(p) { if (p.y > GROUND + 2 || p.y < 20) return null; for (const b of BUILDINGS) if (p.x >= b.x - 2 && p.x <= b.x + b.w + 2 && p.y >= b.top - 16) return b; return null; }
  canvas.addEventListener('mousemove', e => { const p = toLogical(e); const b = hit(p); if (b !== state.hover) { state.hover = b; hooks.hover && hooks.hover(b); } canvas.style.cursor = b || nearMoon(p) || nearCat(p) ? 'pointer' : 'default'; });
  canvas.addEventListener('mouseleave', () => { state.hover = null; hooks.hover && hooks.hover(null); });
  function nearMoon(p) { return state.key !== 'day' && p.x > 345 && p.x < 392 && p.y > 24 && p.y < 46; }
  function nearCat(p) { return p.x > state.cat.x - 3 && p.x < state.cat.x + 12 && p.y > state.cat.y - 3 && p.y < state.cat.y + 10; }
  function tap(p) {
    if (nearCat(p)) { state.cat.wag = 1.2; state.cat.say = 2; hooks.say && hooks.say('mňau'); return; }
    if (nearMoon(p)) { state.moonClicks++; hooks.say && hooks.say(['měsíc', 'pořád měsíc', 'jo, ten se hýbe'][state.moonClicks % 3]); return; }
    const b = hit(p); if (b) { walkTo(b.id, true); return; }
    if (p.y > GROUND - 20 && p.y < GROUND + 40) { state.avatar.target = clamp(p.x, 8, W - 12); state.avatar.arriveId = null; state.avatar.run = false; }
  }
  canvas.addEventListener('click', e => tap(toLogical(e)));
  canvas.addEventListener('touchstart', e => { tap(toLogical(e)); }, { passive: true });
  const keys = { ArrowLeft: 0, ArrowRight: 0 };
  document.addEventListener('keydown', e => {
    if (hooks.blocked && hooks.blocked()) return;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { keys.ArrowLeft = 1; state.avatar.vx = -1; state.avatar.target = null; e.preventDefault(); }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { keys.ArrowRight = 1; state.avatar.vx = 1; state.avatar.target = null; e.preventDefault(); }
    if (e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') { const b = nearestDoor(); if (b) { hooks.enter && hooks.enter(b.id); e.preventDefault(); } }
  });
  document.addEventListener('keyup', e => { if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.ArrowLeft = 0; if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.ArrowRight = 0; state.avatar.vx = keys.ArrowRight - keys.ArrowLeft; });
  // Konami: it snows on the street
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']; let kpos = 0;
  document.addEventListener('keydown', e => { if (e.key === KONAMI[kpos]) { kpos++; if (kpos === KONAMI.length) { kpos = 0; state.snow = !state.snow; state.rain = false; hooks.say && hooks.say(state.snow ? 'sníh v Ostravě. konečně.' : 'a je po zimě'); } } else kpos = e.key === 'ArrowUp' ? 1 : 0; });

  function walkTo(id, enter) { const b = BUILDINGS.find(x => x.id === id); if (!b) return; state.avatar.target = b.doorX; state.avatar.arriveId = enter ? id : null; state.avatar.run = true; }

  /* ---------------- public ---------------- */
  drawStatic();
  window.Street = {
    on(name, fn) { hooks[name] = fn; }, walkTo, buildings: BUILDINGS,
    setRain(v) { state.rain = !!v; if (v) state.snow = false; }, get rain() { return state.rain; },
    setTime(k) { state.timeOverride = k; }, get timeKey() { return state.key; },
    stand(id) { const b = BUILDINGS.find(x => x.id === id); if (b) state.avatar.x = b.doorX; },
    W, H,
  };
  requestAnimationFrame(loop);
})();
