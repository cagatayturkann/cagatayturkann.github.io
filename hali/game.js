import * as THREE from 'three';

const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

// ---------------------------------------------------------------------------
// Metinler
// ---------------------------------------------------------------------------
const CALM = [
  'Şimdi gündemin bir sonraki maddesine geçiyoruz...',
  'Bu konuyu geçen hafta da konuşmuştuk ama...',
  'Kısa tutacağım, iki saat sürmez...',
  'Emsi\'nin vizyonu çok net arkadaşlar...',
  'Kameralar açık olsun lütfen...',
  'Herkes not alsın, sonra sorarım...',
  'Bir de şu Excel\'e bakalım...',
  'Meeting Challenge büyüyor arkadaşlar...',
  'Bu toplantı tarihe geçecek...',
  'Bunu bir de en baştan anlatayım...',
  'Söz hakkı vereceğim, birazdan...',
  'Toplantıdan sonra kısa bir toplantı yapalım...'
];
const RESUME = ['Neyse... devam ediyoruz.', 'Nerede kalmıştık...', 'Tamam, sakinim. Devam.', 'Derin nefes... evet.'];
const WARN = ['Arkadaşlar...', 'Bir dakika...', 'Hmm.', 'Şimdi bakın...', 'Ben bir şey söyleyeyim mi...'];
const ANGRY = ['MAL OLDUK MAL!', 'EMSİ 2.0!', 'BİŞİ YOK BİŞİ YOK BİŞİ YOK!'];
const FAKE = ['Şaka şaka 😄', 'Yok yok, devam', 'Neyse... 🙂', 'Gülümseyin biraz'];
const CAUGHT = ['SEN NE YAPIYORSUN ORADA?!', 'TELEFONU BIRAK!', 'BEN KONUŞURKEN Mİ?!'];
const SLACK = [
  ['📱', 'Instagram\'da geziyorsun', '#e1306c'],
  ['🌻', 'Çekirdek çitliyorsun', '#e0a800'],
  ['💬', 'Başka grupta toplantıyı çekiştiriyorsun', '#25d366'],
  ['😴', 'Kamera kapalı, uyukluyorsun', '#5b5fc7'],
  ['🍕', 'Yemek siparişi veriyorsun', '#ff6b35'],
  ['🎮', 'Gizlice oyun oynuyorsun', '#7b2ff7'],
  ['🛒', 'Sepete ürün atıyorsun', '#f27a1a'],
  ['📺', 'Dizinin son bölümünü izliyorsun', '#e50914']
];
const AGENDA = [
  'Açılış konuşması (45 dk)', 'Geçen toplantının özeti', 'Emsi 2.0 vizyonu', 'Toplantı halısı bütçesi',
  'Neden kimse kamera açmıyor?', 'Logo: mor mu, daha mor mu?', 'Yeni üye oryantasyonu', 'WhatsApp grup kuralları',
  'Sticker kullanım politikası', 'Toplantılar neden uzuyor?', '"Mal olduk mal" vaka analizi', 'Etkinlik planlaması',
  'Sponsorluk (yok)', 'Instagram stratejisi', 'Reels çekelim mi?', 'Bişi yok bişi yok bişi yok',
  'Halı temizliği', 'Toplantı hakkında toplantı', 'Bütçe (hâlâ yok)', 'Kapanış konuşması (1 saat)',
  'Kapanıştan sonraki ek konuşma', 'Son bir şey daha', 'Dağılabiliriz (belki)'
];
const AGENDA_TOTAL = AGENDA.length;
const PATTERN_NAMES = ['Klasik Kilim', 'Isparta Halısı', 'Hereke İpeği', '✨ EFSANEVİ TOPLANTI HALISI ✨'];
const RANKS = [
  [0, 'Halı Stajyeri'], [300, 'Halı Gözlemcisi'], [800, 'Desen Uzmanı'],
  [1600, 'Kıdemli Halı Analisti'], [3000, 'Emsi Halı Direktörü'], [5000, 'Halının Ta Kendisi 🧶']
];

// ---------------------------------------------------------------------------
// Ses (WebAudio ile sentez, dosya yok)
// ---------------------------------------------------------------------------
const Sfx = {
  ctx: null, master: null, muted: false,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.8;
      this.master.connect(this.ctx.destination);
    } catch (e) { this.ctx = null; }
  },
  tone(freq, dur, { type = 'square', vol = 0.05, slide = 0, delay = 0 } = {}) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, { vol = 0.2, freq = 800, delay = 0 } = {}) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t);
  },
  blip() { this.tone(rand(230, 380), 0.055, { type: 'square', vol: 0.022 }); },
  growl() { this.tone(rand(90, 140), 0.09, { type: 'sawtooth', vol: 0.05 }); },
  warn() { this.tone(110, 0.5, { type: 'triangle', vol: 0.09, slide: 90 }); },
  boom() { this.tone(80, 0.6, { type: 'sine', vol: 0.6, slide: -50 }); this.noise(0.4, { vol: 0.4, freq: 600 }); },
  ding() { this.tone(660, 0.12, { type: 'triangle', vol: 0.08 }); this.tone(990, 0.22, { type: 'triangle', vol: 0.08, delay: 0.1 }); },
  caught() { this.tone(1200, 0.7, { type: 'square', vol: 0.05, slide: -1000 }); },
  chant(i) { this.tone([196, 247, 294][i], 0.32, { type: 'sawtooth', vol: 0.09 }); this.noise(0.3, { vol: 0.3, freq: 1800 }); },
  laugh() { [0, 0.1, 0.2, 0.3].forEach((d, i) => this.tone(420 + (i % 2) * 120, 0.08, { type: 'square', vol: 0.035, delay: d })); },
  whoosh() { this.noise(0.25, { vol: 0.08, freq: 2500 }); }
};

// ---------------------------------------------------------------------------
// Renderer & sahne
// ---------------------------------------------------------------------------
const canvas = $('c');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  $('loading').textContent = 'Tarayıcın 3D (WebGL) desteklemiyor 😢 Başka bir tarayıcıda dene.';
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const BG_CALM = new THREE.Color('#1b1730');
const BG_ANGRY = new THREE.Color('#3d0c0c');
scene.background = BG_CALM.clone();
scene.fog = new THREE.Fog(BG_CALM.clone(), 9, 20);

const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 60);
scene.add(camera);

const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...o });
function mk(geo, mat, x = 0, y = 0, z = 0, parent = scene, shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = shadow; m.receiveShadow = shadow;
  parent.add(m);
  return m;
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { tex, c, g };
}

// Işıklar
const hemi = new THREE.HemisphereLight('#c9d4ff', '#4a3226', 1.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffe2b8', 1.5);
sun.position.set(3, 6, 4);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 20 });
sun.shadow.bias = -0.0005;
scene.add(sun);
const alarm = new THREE.PointLight('#ff2020', 0, 12, 1.2);
alarm.position.set(0, 2.8, -1.2);
scene.add(alarm);

// ---------------------------------------------------------------------------
// Oda
// ---------------------------------------------------------------------------
const floorTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#5b3d27'; g.fillRect(0, 0, w, h);
  const ph = 64;
  for (let y = 0; y < h; y += ph) {
    let x = -((y / ph) % 2) * 120;
    while (x < w) {
      const len = rand(160, 260);
      g.fillStyle = `hsl(${rand(22, 30)}, ${rand(35, 45)}%, ${rand(26, 34)}%)`;
      g.fillRect(x + 2, y + 2, len - 4, ph - 4);
      x += len;
    }
  }
}).tex;
floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
floorTex.repeat.set(3, 3);
const floor = mk(new THREE.PlaneGeometry(14, 14), M('#ffffff', { map: floorTex, roughness: 0.55 }), 0, 0, 0);
floor.rotation.x = -Math.PI / 2;
floor.castShadow = false;

const wallMat = M('#3d3560');
const backWall = mk(new THREE.PlaneGeometry(14, 6), wallMat, 0, 3, -4.2, scene, false);
backWall.receiveShadow = true;
const sideMat = M('#463d6e');
const lw = mk(new THREE.PlaneGeometry(10, 6), sideMat, -3.6, 3, 0, scene, false);
lw.rotation.y = Math.PI / 2; lw.receiveShadow = true;
const rw = mk(new THREE.PlaneGeometry(10, 6), sideMat, 3.6, 3, 0, scene, false);
rw.rotation.y = -Math.PI / 2; rw.receiveShadow = true;
mk(new THREE.BoxGeometry(7.2, 0.9, 0.05), M('#2c2648'), 0, 0.45, -4.17, scene, false);
const ceiling = mk(new THREE.PlaneGeometry(14, 14), M('#241f3d'), 0, 4.2, 0, scene, false);
ceiling.rotation.x = Math.PI / 2;

// Pankart
const banner = canvasTex(1024, 128, (g, w, h) => {
  const grd = g.createLinearGradient(0, 0, w, 0);
  grd.addColorStop(0, '#5b21b6'); grd.addColorStop(1, '#be185d');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffd34d';
  g.font = '900 72px Impact, "Arial Black", sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('MEETING CHALLENGE · EMSİ', w / 2, h / 2 + 4);
});
mk(new THREE.PlaneGeometry(3.4, 0.42), new THREE.MeshBasicMaterial({ map: banner.tex }), 0, 3.25, -4.15, scene, false);

// Beyaz tahta (gündem)
const board = canvasTex(512, 300, () => {});
function drawBoard(n) {
  const { g, c } = board, w = c.width, h = c.height;
  g.fillStyle = '#f7f7f2'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#1d4ed8'; g.font = '900 44px "Comic Sans MS", "Chalkboard SE", sans-serif';
  g.fillText('GÜNDEM', 24, 56);
  g.fillStyle = '#64748b'; g.font = '700 26px sans-serif';
  g.fillText(`Madde ${Math.min(n, AGENDA_TOTAL)}/${AGENDA_TOTAL}`, 300, 52);
  for (let i = 0; i < 4; i++) {
    const idx = n - 1 + i;
    if (idx >= AGENDA_TOTAL) break;
    g.fillStyle = i === 0 ? '#dc2626' : '#334155';
    g.font = (i === 0 ? '900 28px' : '700 24px') + ' "Comic Sans MS", sans-serif';
    g.fillText((i === 0 ? '➜ ' : '• ') + AGENDA[idx], 24, 110 + i * 46);
  }
  g.strokeStyle = '#16a34a'; g.lineWidth = 4; g.beginPath();
  g.moveTo(400, 230); g.lineTo(430, 250); g.lineTo(455, 240); g.lineTo(490, 285); g.stroke();
  g.fillStyle = '#16a34a'; g.font = '700 16px sans-serif'; g.fillText('motivasyon', 410, 222);
  board.tex.needsUpdate = true;
}
drawBoard(1);
const boardG = new THREE.Group(); boardG.position.set(-2.2, 1.85, -4.12); scene.add(boardG);
mk(new THREE.BoxGeometry(2.05, 1.25, 0.05), M('#9ca3af', { metalness: 0.4, roughness: 0.4 }), 0, 0, 0, boardG);
mk(new THREE.PlaneGeometry(1.95, 1.14), new THREE.MeshBasicMaterial({ map: board.tex }), 0, 0, 0.03, boardG, false);

// Saat (toplantı uzadıkça hızlanır)
const clockG = new THREE.Group(); clockG.position.set(2.2, 2.55, -4.12); scene.add(clockG);
const clockFace = mk(new THREE.CylinderGeometry(0.32, 0.32, 0.04, 32), M('#fafafa'), 0, 0, 0, clockG, false);
clockFace.rotation.x = Math.PI / 2;
const rim = mk(new THREE.TorusGeometry(0.32, 0.03, 8, 32), M('#222'), 0, 0, 0.01, clockG, false);
const hourHand = new THREE.Group(); hourHand.position.z = 0.04; clockG.add(hourHand);
mk(new THREE.BoxGeometry(0.03, 0.17, 0.01), M('#111'), 0, 0.075, 0, hourHand, false);
const minHand = new THREE.Group(); minHand.position.z = 0.05; clockG.add(minHand);
mk(new THREE.BoxGeometry(0.02, 0.26, 0.01), M('#c00'), 0, 0.12, 0, minHand, false);

// Çerçeveli "Emsi 1.0" fotoğrafı
const photoFrame = canvasTex(256, 200, (g, w, h) => {
  g.fillStyle = '#ffe9b0'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#7c2d12'; g.font = '900 40px Impact, sans-serif'; g.textAlign = 'center';
  g.fillText('EMSİ 1.0', w / 2, 80);
  g.font = '64px sans-serif'; g.fillText('🏆', w / 2, 165);
});
const frameG = new THREE.Group(); frameG.position.set(2.2, 1.55, -4.12); scene.add(frameG);
mk(new THREE.BoxGeometry(0.72, 0.6, 0.04), M('#8b5a2b'), 0, 0, 0, frameG);
mk(new THREE.PlaneGeometry(0.6, 0.48), new THREE.MeshBasicMaterial({ map: photoFrame.tex }), 0, 0, 0.025, frameG, false);

// Saksı
const plant = new THREE.Group(); plant.position.set(3, 0, -3.5); scene.add(plant);
mk(new THREE.CylinderGeometry(0.25, 0.18, 0.5, 16), M('#c2410c'), 0, 0.25, 0, plant);
const leafMat = M('#2f9e44');
for (let i = 0; i < 9; i++) {
  mk(new THREE.SphereGeometry(rand(0.16, 0.24), 12, 10), leafMat, rand(-0.2, 0.2), rand(0.6, 1.1), rand(-0.2, 0.2), plant);
}

// Sallanan lamba
const lampPivot = new THREE.Group(); lampPivot.position.set(0, 4.2, -0.3); scene.add(lampPivot);
mk(new THREE.CylinderGeometry(0.012, 0.012, 1.2, 6), M('#111'), 0, -0.6, 0, lampPivot, false);
const shade = mk(new THREE.ConeGeometry(0.42, 0.32, 24, 1, true), M('#f59e0b', { side: THREE.DoubleSide, roughness: 0.5 }), 0, -1.32, 0, lampPivot, false);
const bulbMat = new THREE.MeshBasicMaterial({ color: '#fff3c4' });
mk(new THREE.SphereGeometry(0.1, 16, 12), bulbMat, 0, -1.45, 0, lampPivot, false);
const lampLight = new THREE.PointLight('#ffcf8a', 14, 9, 1.4);
lampLight.position.set(0, -1.5, 0);
lampPivot.add(lampLight);

// ---------------------------------------------------------------------------
// Halı
// ---------------------------------------------------------------------------
const PALETTES = [
  { bg: '#a1302c', field: '#8a2424', band: '#24476b', accent: '#e9b44c', dark: '#2b1414', light: '#f3e3c3' },
  { bg: '#7a1f3d', field: '#651833', band: '#1f5a5a', accent: '#f2d48a', dark: '#220c18', light: '#f6ead0' },
  { bg: '#1d3557', field: '#16294a', band: '#a8323e', accent: '#f1e3c6', dark: '#0b1422', light: '#e9d8a6' },
  { bg: '#3d1466', field: '#2e0e52', band: '#d4a017', accent: '#ff6ec7', dark: '#14062a', light: '#ffe28a' }
];
const carpetCanvas = canvasTex(1024, 1600, () => {});
carpetCanvas.tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
function diamond(g, cx, cy, rx, ry, color) {
  g.fillStyle = color;
  g.beginPath(); g.moveTo(cx, cy - ry); g.lineTo(cx + rx, cy); g.lineTo(cx, cy + ry); g.lineTo(cx - rx, cy); g.closePath(); g.fill();
}
function drawCarpet(level) {
  const p = PALETTES[level];
  const { g, c } = carpetCanvas, w = c.width / 2, h = c.height / 2;
  const fr = 22;
  g.setTransform(2, 0, 0, 2, 0, 0);
  g.clearRect(0, 0, w, h);
  g.fillStyle = p.light;
  for (let x = 4; x < w; x += 9) { g.fillRect(x, 0, 4, fr); g.fillRect(x, h - fr, 4, fr); }
  const x0 = 0, y0 = fr, W = w, H = h - 2 * fr;
  g.fillStyle = p.dark; g.fillRect(x0, y0, W, H);
  g.fillStyle = p.band; g.fillRect(x0 + 12, y0 + 12, W - 24, H - 24);
  // kenar motifleri
  for (let x = 40; x < W - 20; x += 40) { diamond(g, x, y0 + 40, 14, 18, p.accent); diamond(g, x, y0 + H - 40, 14, 18, p.accent); diamond(g, x, y0 + 40, 5, 7, p.dark); diamond(g, x, y0 + H - 40, 5, 7, p.dark); }
  for (let y = y0 + 80; y < y0 + H - 60; y += 40) { diamond(g, 40, y, 18, 14, p.accent); diamond(g, W - 40, y, 18, 14, p.accent); diamond(g, 40, y, 7, 5, p.dark); diamond(g, W - 40, y, 7, 5, p.dark); }
  g.fillStyle = p.dark; g.fillRect(x0 + 66, y0 + 66, W - 132, H - 132);
  g.fillStyle = p.field; g.fillRect(x0 + 74, y0 + 74, W - 148, H - 148);
  // zemin deseni
  g.globalAlpha = 0.35;
  for (let y = y0 + 100; y < y0 + H - 90; y += 34) {
    for (let x = 100 + ((y / 34) % 2) * 17; x < W - 90; x += 34) diamond(g, x, y, 5, 5, p.light);
  }
  g.globalAlpha = 1;
  // orta madalyonlar
  const cx = W / 2;
  const meds = [y0 + H * 0.27, y0 + H * 0.5, y0 + H * 0.73];
  meds.forEach((cy, i) => {
    const big = i === 1 ? 1.25 : 1;
    diamond(g, cx, cy, 120 * big, 100 * big, p.dark);
    diamond(g, cx, cy, 108 * big, 88 * big, p.accent);
    diamond(g, cx, cy, 86 * big, 70 * big, p.band);
    diamond(g, cx, cy, 60 * big, 48 * big, p.light);
    diamond(g, cx, cy, 36 * big, 28 * big, p.bg);
    diamond(g, cx, cy, 12 * big, 10 * big, p.dark);
    // çengeller
    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => {
      diamond(g, cx + dx * 132 * big, cy + dy * 112 * big, 12, 12, p.accent);
    });
  });
  if (level === 3) {
    for (let i = 0; i < 80; i++) {
      g.fillStyle = Math.random() < 0.5 ? '#fff6a0' : '#ffb3ea';
      const x = rand(80, W - 80), y = rand(y0 + 80, y0 + H - 80), r = rand(1.5, 4);
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
  }
  carpetCanvas.tex.needsUpdate = true;
}
drawCarpet(0);
const carpetMat = M('#ffffff', { map: carpetCanvas.tex, roughness: 0.95, emissive: '#ffffff', emissiveMap: carpetCanvas.tex, emissiveIntensity: 0 });
const carpet = mk(new THREE.PlaneGeometry(3.6, 5.6), carpetMat, 0, 0.006, 0.05);
carpet.rotation.x = -Math.PI / 2;
carpet.castShadow = false;

// ---------------------------------------------------------------------------
// Masa ve üstündekiler
// ---------------------------------------------------------------------------
const TABLE_TOP = 0.775;
const tableG = new THREE.Group(); tableG.position.set(0, 0, -0.2); scene.add(tableG);
const woodMat = M('#6b4226', { roughness: 0.45 });
mk(new THREE.BoxGeometry(1.5, 0.07, 3.6), woodMat, 0, 0.74, 0, tableG);
[[-0.65, -1.65], [0.65, -1.65], [-0.65, 1.65], [0.65, 1.65]].forEach(([x, z]) => {
  mk(new THREE.CylinderGeometry(0.04, 0.04, 0.72, 8), M('#2b2b2b'), x, 0.36, z, tableG);
});

const papers = [];
const paperMat = new THREE.MeshStandardMaterial({ color: '#fbfbf6', roughness: 0.9, side: THREE.DoubleSide });
for (let i = 0; i < 8; i++) {
  const m = mk(new THREE.PlaneGeometry(0.21, 0.29), paperMat, rand(-0.55, 0.55), TABLE_TOP + 0.002 + i * 0.0005, rand(-1.9, 1.2), scene, false);
  m.receiveShadow = true;
  const rz = rand(-0.6, 0.6);
  m.rotation.set(-Math.PI / 2, 0, rz);
  papers.push({ m, vel: new THREE.Vector3(), spin: new THREE.Vector3(), flying: false, rz, baseY: m.position.y });
}
const mugs = [];
['#e63946', '#2a9d8f', '#f4a261', '#ffffff'].forEach((col, i) => {
  const g = new THREE.Group();
  g.position.set(i % 2 ? 0.5 : -0.5, TABLE_TOP, -1.4 + i * 0.85);
  scene.add(g);
  mk(new THREE.CylinderGeometry(0.055, 0.05, 0.13, 16), M(col, { roughness: 0.3 }), 0, 0.065, 0, g);
  const handle = mk(new THREE.TorusGeometry(0.035, 0.012, 8, 16), M(col, { roughness: 0.3 }), 0.06, 0.07, 0, g);
  handle.rotation.y = Math.PI / 2;
  mk(new THREE.CircleGeometry(0.048, 16), M('#3b2314'), 0, 0.12, 0, g, false).rotation.x = -Math.PI / 2;
  mugs.push({ g, vy: 0 });
});

// ---------------------------------------------------------------------------
// Mami
// ---------------------------------------------------------------------------
function makeMami() {
  const root = new THREE.Group(); root.position.set(0, 0, -2.45); scene.add(root);
  const navy = M('#1f2b4d', { roughness: 0.6 });
  const skin = M('#eab792', { roughness: 0.55 });
  const hairM = M('#24180f', { roughness: 0.95 });
  const beardM = M('#35261c', { roughness: 0.95 });
  const grey = M('#9a948d', { roughness: 0.95 });
  const white = M('#f4f1ea', { roughness: 0.6 });
  const black = M('#141414', { roughness: 0.35 });

  [-0.13, 0.13].forEach(x => {
    mk(new THREE.CylinderGeometry(0.09, 0.08, 0.8, 10), navy, x, 0.4, 0, root);
    mk(new THREE.BoxGeometry(0.16, 0.08, 0.28), black, x, 0.04, 0.05, root);
  });
  const body = new THREE.Group(); body.position.y = 0.8; root.add(body);
  const torso = mk(new THREE.CapsuleGeometry(0.34, 0.42, 6, 18), navy, 0, 0.38, 0, body);
  torso.scale.z = 0.72;
  const vShape = new THREE.Shape();
  vShape.moveTo(-0.13, 0.58); vShape.lineTo(0.13, 0.58); vShape.lineTo(0, 0.14); vShape.closePath();
  mk(new THREE.ShapeGeometry(vShape), white, 0, 0, 0.25, body, false);
  [-1, 1].forEach(s => {
    const c = mk(new THREE.ConeGeometry(0.055, 0.12, 4), black, s * 0.055, 0.56, 0.27, body);
    c.rotation.z = s * Math.PI / 2;
  });
  mk(new THREE.SphereGeometry(0.03, 10, 8), black, 0, 0.56, 0.28, body);
  mk(new THREE.SphereGeometry(0.02, 8, 6), black, 0, 0.06, 0.25, body);
  mk(new THREE.SphereGeometry(0.02, 8, 6), black, 0, -0.06, 0.25, body);
  const rose = mk(new THREE.SphereGeometry(0.05, 12, 10), white, 0.2, 0.42, 0.22, body);
  rose.scale.set(1, 1, 0.7);
  mk(new THREE.CylinderGeometry(0.1, 0.11, 0.16, 12), skin, 0, 0.76, 0, body);

  const head = new THREE.Group(); head.position.y = 1.0; body.add(head);
  const skull = mk(new THREE.SphereGeometry(0.33, 32, 24), skin, 0, 0, 0, head);
  skull.scale.set(1, 1.08, 0.95);
  [-1, 1].forEach(s => {
    const e = mk(new THREE.SphereGeometry(0.075, 12, 10), skin, s * 0.32, 0, 0, head);
    e.scale.z = 0.6;
  });
  // kıvırcık saç
  for (let i = 0; i < 60; i++) {
    const phi = rand(0, Math.PI * 2), th = rand(0, 1.15);
    const dir = new THREE.Vector3(Math.sin(th) * Math.cos(phi), Math.cos(th), Math.sin(th) * Math.sin(phi));
    if (dir.z > 0.45 && th > 0.75) continue; // alın açık kalsın
    const p = dir.multiplyScalar(0.31);
    mk(new THREE.SphereGeometry(rand(0.075, 0.105), 10, 8), hairM, p.x, p.y * 1.08 + 0.05, p.z * 0.95, head);
  }
  [-1, 1].forEach(s => mk(new THREE.BoxGeometry(0.05, 0.16, 0.12), hairM, s * 0.3, 0.02, 0.05, head));
  const beard = mk(new THREE.SphereGeometry(0.33, 24, 18), beardM, 0, -0.12, 0.02, head);
  beard.scale.set(1.02, 0.8, 1.0);
  const stache = mk(new THREE.CapsuleGeometry(0.035, 0.14, 4, 8), beardM, 0, -0.055, 0.335, head);
  stache.rotation.z = Math.PI / 2;
  const chin = mk(new THREE.SphereGeometry(0.11, 14, 10), grey, 0, -0.31, 0.24, head);
  chin.scale.set(1, 0.8, 0.7);
  mk(new THREE.SphereGeometry(0.065, 14, 10), M('#dca07d', { roughness: 0.5 }), 0, 0.0, 0.335, head);

  const eyes = [-1, 1].map(s => mk(new THREE.SphereGeometry(0.042, 12, 10), black, s * 0.11, 0.075, 0.3, head, false));
  const brows = [-1, 1].map(s => {
    const b = mk(new THREE.BoxGeometry(0.15, 0.035, 0.04), hairM, s * 0.11, 0.16, 0.31, head, false);
    return b;
  });
  const mouthMat = M('#5a0d0d', { roughness: 0.4 });
  const mouth = mk(new THREE.SphereGeometry(0.1, 18, 12), mouthMat, 0, -0.135, 0.33, head, false);
  const teeth = mk(new THREE.BoxGeometry(0.15, 0.035, 0.02), M('#ffffff', { roughness: 0.3 }), 0, -0.105, 0.37, head, false);
  const cheekMat = new THREE.MeshBasicMaterial({ color: '#ff5a6a', transparent: true, opacity: 0 });
  [-1, 1].forEach(s => {
    const c = mk(new THREE.SphereGeometry(0.06, 12, 8), cheekMat, s * 0.19, 0.0, 0.285, head, false);
    c.scale.set(1, 0.6, 0.3);
  });
  const veinMat = new THREE.MeshBasicMaterial({ color: '#e11d48', transparent: true, opacity: 0 });
  const vein = new THREE.Group(); vein.position.set(0.13, 0.25, 0.27); vein.rotation.x = -0.6; head.add(vein);
  [0.6, -0.6, 2.2, -2.2].forEach((r, i) => {
    const b = mk(new THREE.BoxGeometry(0.07, 0.018, 0.01), veinMat, Math.cos(r) * 0.04, Math.sin(r) * 0.04, 0, vein, false);
    b.rotation.z = r + (i < 2 ? 0 : Math.PI);
  });

  const arms = [-1, 1].map(s => {
    const pivot = new THREE.Group(); pivot.position.set(s * 0.4, 0.62, 0); body.add(pivot);
    mk(new THREE.CapsuleGeometry(0.075, 0.36, 4, 10), navy, 0, -0.24, 0, pivot);
    mk(new THREE.SphereGeometry(0.085, 12, 10), skin, 0, -0.5, 0, pivot);
    return pivot;
  });

  return {
    root, body, head, eyes, brows, mouth, teeth, cheekMat, veinMat, arms, skin,
    skinBase: new THREE.Color('#eab792'), skinRed: new THREE.Color('#f0604f')
  };
}
const mami = makeMami();

// ---------------------------------------------------------------------------
// Toplantıdaki diğer üyeler
// ---------------------------------------------------------------------------
const SKINS = ['#f1c27d', '#e0ac69', '#c68642', '#ffdbac'];
function makeNPC(x, z, shirt, hair, skinCol) {
  const facing = x < 0 ? Math.PI / 2 : -Math.PI / 2;
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = facing; scene.add(g);
  const chairM = M('#2b2b3a', { roughness: 0.5 });
  mk(new THREE.BoxGeometry(0.46, 0.06, 0.46), chairM, 0, 0.45, -0.05, g);
  mk(new THREE.BoxGeometry(0.46, 0.55, 0.06), chairM, 0, 0.75, -0.28, g);
  mk(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 6), chairM, 0, 0.22, -0.05, g);
  const pants = M('#2e3550');
  mk(new THREE.BoxGeometry(0.32, 0.12, 0.38), pants, 0, 0.53, 0.12, g);
  mk(new THREE.BoxGeometry(0.3, 0.46, 0.11), pants, 0, 0.27, 0.32, g);
  mk(new THREE.BoxGeometry(0.3, 0.07, 0.18), M('#1a1a1a'), 0, 0.035, 0.37, g);

  const body = new THREE.Group(); body.position.set(0, 0.5, -0.07); g.add(body);
  mk(new THREE.CapsuleGeometry(0.17, 0.26, 4, 12), M(shirt), 0, 0.3, 0, body);
  const head = new THREE.Group(); head.position.set(0, 0.68, 0); body.add(head);
  mk(new THREE.SphereGeometry(0.16, 20, 16), M(skinCol, { roughness: 0.55 }), 0, 0, 0, head);
  mk(new THREE.SphereGeometry(0.168, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), M(hair, { roughness: 0.9 }), 0, 0.02, -0.01, head);
  [-1, 1].forEach(s => mk(new THREE.SphereGeometry(0.022, 8, 6), M('#111'), s * 0.055, 0.02, 0.148, head, false));
  const arms = [-1, 1].map(s => {
    const p = new THREE.Group(); p.position.set(s * 0.2, 0.46, 0); body.add(p);
    mk(new THREE.CapsuleGeometry(0.045, 0.22, 4, 8), M(shirt), 0, -0.15, 0, p);
    mk(new THREE.SphereGeometry(0.05, 10, 8), M(skinCol), 0, -0.3, 0, p);
    return p;
  });
  const phoneMat = new THREE.MeshBasicMaterial({ color: '#7dd3fc' });
  const phone = mk(new THREE.BoxGeometry(0.07, 0.12, 0.012), phoneMat, 0, 0.2, 0.26, body, false);
  phone.rotation.x = -0.9;
  return {
    g, body, head, arms, phone, facing,
    mode: 'attentive', timer: rand(1, 4), delay: 0, pending: null, beat: rand(0, 6)
  };
}
const npcs = [
  makeNPC(-1.0, -1.1, '#e76f51', '#3d2b1f', SKINS[0]),
  makeNPC(1.0, -1.1, '#2a9d8f', '#111111', SKINS[1]),
  makeNPC(-1.0, 0.2, '#8338ec', '#a0522d', SKINS[3]),
  makeNPC(1.0, 0.2, '#f4a261', '#222222', SKINS[2])
];

// ---------------------------------------------------------------------------
// Oyuncu: telefon (kameraya bağlı) ve ayaklar
// ---------------------------------------------------------------------------
const phoneG = new THREE.Group(); camera.add(phoneG);
mk(new THREE.BoxGeometry(0.085, 0.17, 0.012), M('#111', { roughness: 0.3, metalness: 0.3 }), 0, 0, 0, phoneG, false);
const phoneScreen = canvasTex(160, 320, () => {});
mk(new THREE.PlaneGeometry(0.077, 0.158), new THREE.MeshBasicMaterial({ map: phoneScreen.tex, toneMapped: false }), 0, 0, 0.0065, phoneG, false);
const handMat = M('#f1c27d', { roughness: 0.6 });
[-1, 1].forEach(s => {
  const h = mk(new THREE.SphereGeometry(0.026, 12, 10), handMat, s * 0.047, -0.045, -0.004, phoneG, false);
  h.scale.set(0.65, 1.4, 0.8);
});
function drawPhone(idx) {
  const [emoji, text, color] = SLACK[idx];
  const { g, c } = phoneScreen, w = c.width, h = c.height;
  const grd = g.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, color); grd.addColorStop(1, '#111');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '700 14px sans-serif'; g.textAlign = 'center';
  g.fillText('21:47  •  📶 🔋', w / 2, 22);
  g.font = '86px sans-serif'; g.fillText(emoji, w / 2, 150);
  g.fillStyle = '#fff'; g.font = '800 17px sans-serif';
  const words = text.split(' '); let line = '', y = 210;
  words.forEach(wd => {
    if (g.measureText(line + wd).width > w - 20) { g.fillText(line, w / 2, y); line = ''; y += 22; }
    line += wd + ' ';
  });
  g.fillText(line, w / 2, y);
  phoneScreen.tex.needsUpdate = true;
}
drawPhone(0);

const feet = [-1, 1].map(s => mk(new THREE.BoxGeometry(0.12, 0.08, 0.27), M('#f5f5f5', { roughness: 0.6 }), s * 0.13, 0.04, 1.85));
feet.forEach(f => { const stripe = mk(new THREE.BoxGeometry(0.125, 0.02, 0.2), M('#e63946'), 0, 0.0, 0.02, f, false); stripe.position.y = 0.0; });

// ---------------------------------------------------------------------------
// Parçacıklar: buhar & konfeti
// ---------------------------------------------------------------------------
const steam = [];
const steamGeo = new THREE.SphereGeometry(0.06, 8, 6);
for (let i = 0; i < 40; i++) {
  const m = new THREE.Mesh(steamGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
  m.visible = false; scene.add(m);
  steam.push({ m, life: 0, vel: new THREE.Vector3() });
}
let steamIdx = 0;
function emitSteam(pos) {
  const p = steam[steamIdx++ % steam.length];
  p.m.position.copy(pos);
  p.vel.set(rand(-0.4, 0.4), rand(1.2, 2.0), rand(-0.2, 0.3));
  p.life = 1; p.m.visible = true;
}
const confetti = [];
const confGeo = new THREE.PlaneGeometry(0.05, 0.08);
const CONF_COLS = ['#ffbe0b', '#fb5607', '#ff006e', '#8338ec', '#3a86ff', '#3ddc84'];
for (let i = 0; i < 120; i++) {
  const m = new THREE.Mesh(confGeo, new THREE.MeshBasicMaterial({ color: pick(CONF_COLS), side: THREE.DoubleSide }));
  m.visible = false; scene.add(m);
  confetti.push({ m, life: 0, vel: new THREE.Vector3(), spin: new THREE.Vector3() });
}
let confIdx = 0;
function burstConfetti(n, center) {
  for (let i = 0; i < n; i++) {
    const p = confetti[confIdx++ % confetti.length];
    p.m.position.set(center.x + rand(-0.6, 0.6), center.y + rand(-0.1, 0.3), center.z + rand(-0.6, 0.6));
    p.vel.set(rand(-1.5, 1.5), rand(1.5, 3.5), rand(-1.5, 1.5));
    p.spin.set(rand(-8, 8), rand(-8, 8), rand(-8, 8));
    p.life = rand(2, 3); p.m.visible = true;
  }
}

// ---------------------------------------------------------------------------
// UI yardımcıları
// ---------------------------------------------------------------------------
const ui = {
  bubble: $('bubble'), shout: $('shout'), mood: $('moodPill'), score: $('score'),
  agenda: $('agenda'), lives: $('lives'), activity: $('activity'), vignette: $('vignette'), dim: $('dim')
};
function flash(text, color = '#fff') {
  const f = $('flash');
  f.textContent = text; f.style.color = color;
  f.classList.remove('show'); void f.offsetWidth; f.classList.add('show');
}
function bumpScore() {
  ui.score.classList.add('bump');
  setTimeout(() => ui.score.classList.remove('bump'), 150);
}
function setMood(phase) {
  const map = {
    calm: '😊 Mami anlatıyor', warn: '😤 Mami geriliyor...', angry: '🤬 MAMİ PATLADI',
    fake: '😄 Şakaymış', caught: '🚨 YAKALANDIN', intro: '😊 Mami toplantıyı bekliyor'
  };
  ui.mood.textContent = map[phase] || '';
  ui.mood.className = 'chip ' + phase;
}

// ---------------------------------------------------------------------------
// Oyun durumu
// ---------------------------------------------------------------------------
let s = null;
let mode = 'intro'; // intro | play | over
let holding = false;
let rage = 0, rageTarget = 0;
let look = 0;        // 0 = Mami'ye bak, 1 = halıya bak
let shake = 0, swing = 0, tableBump = 0;
let mamiScale = 1;
let talkText = '', talkIdx = 0, talkT = 0;
let elapsed = 0;
let baseFov = 40;
const lookTarget = new THREE.Vector3(0, 1.5, -2.45);
const tmpV = new THREE.Vector3();

function say(text) {
  talkText = text; talkIdx = 0; talkT = 0;
  ui.bubble.textContent = '';
  ui.bubble.classList.remove('hide');
}
function shout(text) {
  ui.shout.textContent = text;
  ui.shout.classList.add('on');
  ui.bubble.classList.add('hide');
  talkText = text; talkIdx = text.length;
}
function clearShout() { ui.shout.classList.remove('on'); }

function difficulty() { return Math.min(1, (s.agenda - 1) / 15); }

function enterPhase(p, opts = {}) {
  s.phase = p; s.phaseT = 0;
  setMood(p);
  const d = difficulty();
  if (p === 'calm') {
    s.phaseLen = 2.4 + Math.random() * (4.2 - 2.2 * d);
    rageTarget = 0; clearShout();
    say(opts.resume ? pick(RESUME) : pick(CALM));
  } else if (p === 'warn') {
    s.phaseLen = 1.0 - 0.5 * d + Math.random() * 0.2;
    s.fake = Math.random() < 0.18 + 0.12 * d;
    rageTarget = 0.55;
    say(pick(WARN));
    Sfx.warn();
  } else if (p === 'angry') {
    s.phaseLen = 1.6 + Math.random() * 1.0;
    s.caughtThisRound = false;
    s.angerCount++;
    s.slammed = false;
    rageTarget = 1;
    shout(pick(ANGRY));
    if (navigator.vibrate) navigator.vibrate(120);
  } else if (p === 'fake') {
    s.phaseLen = 1.2;
    rageTarget = 0;
    s.fakes++;
    say(pick(FAKE));
    Sfx.laugh();
  } else if (p === 'caught') {
    s.phaseLen = 2.6;
    rageTarget = 1;
    shout(pick(CAUGHT));
  }
}

function reset() {
  s = {
    score: 0, lives: 3, agenda: 1, agendaT: 0,
    phase: 'calm', phaseT: 0, phaseLen: 3, fake: false, caughtThisRound: false, slammed: false,
    slackIdx: 0, slackT: 0, angerCount: 0, dodged: 0, carpetTime: 0, slackTime: 0, fakes: 0,
    patterns: 0, carpetLevel: 0, ending: false
  };
  drawCarpet(0); drawBoard(1);
  carpetMat.emissiveIntensity = 0;
  enterPhase('calm');
  updateHud();
}

function updateHud() {
  ui.score.textContent = Math.floor(s.score);
  ui.agenda.textContent = `Gündem ${Math.min(s.agenda, AGENDA_TOTAL)}/${AGENDA_TOTAL}`;
  ui.lives.textContent = '❤️'.repeat(Math.max(0, s.lives)) + '🖤'.repeat(3 - Math.max(0, s.lives));
}

function updateActivity() {
  if (mode !== 'play') return;
  if (holding) {
    const [e, t] = SLACK[s.slackIdx];
    ui.activity.textContent = `${e} ${t}`;
    ui.activity.className = 'chip slack';
  } else if (s.phase === 'angry' || s.phase === 'caught') {
    ui.activity.textContent = `🙇 Ayaklar toplandı. Desen sayıyorsun: ${s.patterns}`;
    ui.activity.className = 'chip';
  } else {
    ui.activity.textContent = '🙇 Halıya bakıyorsun. Masum.';
    ui.activity.className = 'chip';
  }
}

function caught() {
  s.caughtThisRound = true;
  s.lives--;
  updateHud();
  enterPhase('caught');
  Sfx.caught();
  shake = 0.5;
  if (navigator.vibrate) navigator.vibrate([200, 80, 200]);
  const r = $('rezalet');
  setTimeout(() => {
    r.classList.remove('go'); void r.offsetWidth; r.classList.add('go');
    [0, 400, 800].forEach((t, i) => setTimeout(() => Sfx.chant(i), t));
    setTimeout(() => r.classList.remove('go'), 1900);
  }, 650);
}

function nextAgenda() {
  s.agenda++;
  s.agendaT = 0;
  drawBoard(s.agenda);
  const lvl = Math.min(PATTERN_NAMES.length - 1, Math.floor((s.agenda - 1) / 6));
  if (lvl !== s.carpetLevel) {
    s.carpetLevel = lvl;
    drawCarpet(lvl);
    flash('Yeni halı: ' + PATTERN_NAMES[lvl], '#ffcc33');
    burstConfetti(40, new THREE.Vector3(0, 1.2, 1.2));
    Sfx.ding();
  }
  if (s.agenda > AGENDA_TOTAL) {
    s.score += 500;
    s.ending = true;
    flash('TOPLANTI BİTTİ! +500', '#3ddc84');
    burstConfetti(120, new THREE.Vector3(0, 1.5, -1));
    setTimeout(gameOver, 1800);
  }
  updateHud();
}

function rankFor(score) {
  let r = RANKS[0][1];
  for (const [min, name] of RANKS) if (score >= min) r = name;
  return r;
}

function gameOver() {
  if (mode !== 'play') return;
  mode = 'over';
  holding = false;
  clearShout();
  const score = Math.floor(s.score);
  let best = 0;
  try { best = +localStorage.getItem('hali-best') || 0; if (score > best) localStorage.setItem('hali-best', score); } catch (e) {}
  $('overTitle').innerHTML = s.lives > 0 ? 'TOPLANTIDAN<br>SAĞ ÇIKTIN' : 'RE-ZA-LET';
  $('finalScore').textContent = score;
  $('rank').textContent = rankFor(score);
  $('stats').innerHTML =
    `Gündem maddesi: <b>${Math.min(s.agenda, AGENDA_TOTAL)}/${AGENDA_TOTAL}</b><br>` +
    `Mami <b>${s.angerCount}</b> kez patladı, <b>${s.dodged}</b> tanesini halıya bakarak atlattın<br>` +
    `Halıda toplam <b>${s.patterns}</b> desen saydın<br>` +
    `<b>${Math.round(s.slackTime)}</b> saniye iş çevirdin`;
  $('best').textContent = score > best ? '🏆 Yeni rekor!' : `Rekorun: ${best}`;
  $('over').classList.remove('hidden');
  ui.bubble.classList.add('hide');
  ui.activity.textContent = '🧶 Toplantı bitti';
  ui.activity.className = 'chip';
}

function share() {
  const score = Math.floor(s.score);
  const url = location.href.split('#')[0];
  const text = `Toplantı Halısı'nda ${score} puan yaptım, unvanım: ${rankFor(score)} 🧶 Mal olduk mal! Sen de dene: ${url}`;
  if (navigator.share) navigator.share({ title: 'Toplantı Halısı', text }).catch(() => {});
  else window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
}

function start() {
  Sfx.init();
  $('intro').classList.add('hidden');
  $('over').classList.add('hidden');
  mode = 'play';
  holding = false;
  reset();
  updateActivity();
  Sfx.whoosh();
}

// ---------------------------------------------------------------------------
// Kontroller
// ---------------------------------------------------------------------------
function press() {
  if (mode !== 'play' || holding) return;
  holding = true;
  Sfx.whoosh();
  updateActivity();
}
function release() {
  if (!holding) return;
  holding = false;
  updateActivity();
}
canvas.addEventListener('pointerdown', e => { e.preventDefault(); canvas.setPointerCapture?.(e.pointerId); press(); });
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);
canvas.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('keydown', e => {
  if (e.code !== 'Space') return;
  e.preventDefault();
  if (mode !== 'play') { if (!e.repeat) start(); return; }
  if (!e.repeat) press();
});
window.addEventListener('keyup', e => { if (e.code === 'Space') release(); });
window.addEventListener('blur', release);
document.addEventListener('visibilitychange', () => { if (document.hidden) release(); });
$('startBtn').onclick = start;
$('againBtn').onclick = start;
$('shareBtn').onclick = share;
$('mute').onclick = () => {
  Sfx.init();
  Sfx.muted = !Sfx.muted;
  $('mute').textContent = Sfx.muted ? '🔇' : '🔊';
};

// ---------------------------------------------------------------------------
// Boyutlandırma
// ---------------------------------------------------------------------------
const CAM_POS = new THREE.Vector3(0, 1.3, 2.35);
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  baseFov = camera.aspect < 0.8 ? 46 : 40;
  camera.fov = baseFov;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

function placePhone(dt, show) {
  const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const dist = 0.17 / (0.62 * halfH);
  const targetY = show ? -halfH * dist * 0.5 : -halfH * dist * 1.8;
  phoneG.position.x = halfH * dist * camera.aspect * 0.15;
  phoneG.position.z = -dist;
  phoneG.position.y = damp(phoneG.position.y, targetY, 14, dt);
  phoneG.rotation.x = damp(phoneG.rotation.x, show ? 0.15 : -0.8, 10, dt);
  phoneG.rotation.z = show ? Math.sin(elapsed * 2) * 0.04 : 0;
}

// ---------------------------------------------------------------------------
// Animasyon
// ---------------------------------------------------------------------------
function animateMami(dt, t) {
  const phase = mode === 'play' ? s.phase : (mode === 'intro' ? 'intro' : 'over');
  const talking = talkIdx < talkText.length || phase === 'angry' || phase === 'caught';
  const [armL, armR] = mami.arms;
  let ax = [0, 0], az = [-0.15, 0.15], bodyRotY = 0, bodyLean = 0, headX = 0, headZ = 0, hop = 0;

  if (phase === 'calm' || phase === 'intro' || phase === 'over') {
    ax = [-0.35 + Math.sin(t * 2.1) * 0.25, -0.7 + Math.sin(t * 3.3) * 0.5];
    az = [-0.25, 0.35 + Math.sin(t * 2.7) * 0.25];
    bodyRotY = Math.sin(t * 0.8) * 0.18;
    headX = talking ? Math.sin(t * 9) * 0.05 : 0;
    headZ = Math.sin(t * 1.3) * 0.06;
  } else if (phase === 'warn') {
    ax = [-1.25, -1.25]; az = [0.75, -0.75]; // kollar kavuşuk
    bodyLean = 0.12; headX = 0.12; headZ = Math.sin(t * 30) * 0.02;
  } else if (phase === 'angry') {
    const pt = s.phaseT;
    if (pt < 0.18) { ax = [-2.9, -2.9]; az = [-0.2, 0.2]; }          // kollar yukarı
    else if (pt < 0.32) { ax = [-1.25, -1.25]; az = [-0.05, 0.05]; } // masaya vur
    else { ax = [-2.6 + Math.sin(t * 28) * 0.25, -2.6 + Math.cos(t * 28) * 0.25]; az = [-0.5, 0.5]; }
    if (pt >= 0.24 && !s.slammed) { s.slammed = true; slam(); }
    bodyLean = pt < 0.32 ? 0.2 : 0.05;
    hop = Math.abs(Math.sin(t * 14)) * 0.08;
    headZ = Math.sin(t * 40) * 0.04;
  } else if (phase === 'fake') {
    ax = [-0.4, -0.4]; az = [-0.6, 0.6];
    hop = Math.abs(Math.sin(t * 12)) * 0.05;
    headX = -0.25 + Math.sin(t * 20) * 0.05;
  } else if (phase === 'caught') {
    ax = [-0.3, -1.55]; az = [-0.2, -0.05]; // kameraya işaret
    bodyLean = 0.18; headX = 0.1;
    hop = s.phaseT > 0.65 ? Math.abs(Math.sin(t * 10)) * 0.06 : 0;
  }
  const k = phase === 'angry' ? 30 : 9;
  armL.rotation.x = damp(armL.rotation.x, ax[0], k, dt);
  armR.rotation.x = damp(armR.rotation.x, ax[1], k, dt);
  armL.rotation.z = damp(armL.rotation.z, az[0], k, dt);
  armR.rotation.z = damp(armR.rotation.z, az[1], k, dt);
  mami.body.rotation.y = damp(mami.body.rotation.y, bodyRotY, 4, dt);
  mami.body.rotation.x = damp(mami.body.rotation.x, bodyLean, 8, dt);
  mami.head.rotation.x = damp(mami.head.rotation.x, headX, 10, dt);
  mami.head.rotation.z = damp(mami.head.rotation.z, headZ, 10, dt);
  mami.root.position.y = damp(mami.root.position.y, hop, 20, dt);

  const targetScale = phase === 'angry' ? 1.32 : phase === 'caught' ? 1.4 : phase === 'warn' ? 1.06 : 1;
  mamiScale = damp(mamiScale, targetScale, phase === 'angry' ? 14 : 6, dt);
  mami.root.scale.setScalar(mamiScale);

  // Yüz ifadesi
  const r = rage;
  mami.skin.color.copy(mami.skinBase).lerp(mami.skinRed, r);
  mami.cheekMat.opacity = Math.min(1, r * 1.4);
  mami.veinMat.opacity = r > 0.8 ? 0.6 + Math.sin(t * 20) * 0.4 : 0;
  const [bl, br] = mami.brows;
  bl.rotation.z = damp(bl.rotation.z, 0.12 - r * 0.65, 12, dt);
  br.rotation.z = damp(br.rotation.z, -0.12 + r * 0.65, 12, dt);
  bl.position.y = br.position.y = 0.17 - r * 0.04;
  const eyeY = phase === 'fake' ? 0.25 : r > 0.8 ? 0.9 : r > 0.3 ? 0.5 : 0.35;
  mami.eyes.forEach(e => { e.scale.y = damp(e.scale.y, eyeY, 12, dt); e.scale.x = 1 + r * 0.25; });
  const flap = talking ? 0.6 + Math.abs(Math.sin(t * 16)) * 0.6 : 1;
  let mx = 1.6, my = 0.45;
  if (phase === 'warn') { mx = 0.9; my = 0.18; }
  else if (phase === 'angry' || phase === 'caught') { mx = 1.25; my = 1.25; }
  else if (phase === 'fake') { mx = 1.5; my = 1.0; }
  mami.mouth.scale.x = damp(mami.mouth.scale.x, mx, 14, dt);
  mami.mouth.scale.y = damp(mami.mouth.scale.y, my * flap, 20, dt);
  mami.mouth.scale.z = 0.5;
  mami.teeth.visible = phase !== 'warn';
  mami.teeth.position.y = (phase === 'angry' || phase === 'caught') ? -0.06 : -0.105;

  // Buhar
  if (r > 0.85 && Math.random() < dt * 40) {
    mami.head.getWorldPosition(tmpV);
    tmpV.x += (Math.random() < 0.5 ? -1 : 1) * 0.3 * mamiScale;
    tmpV.y += 0.25 * mamiScale;
    emitSteam(tmpV);
  }
}

function slam() {
  Sfx.boom();
  shake = 0.35; swing = 1; tableBump = 1;
  papers.forEach(p => {
    p.flying = true;
    p.vel.set(rand(-0.6, 0.6), rand(1.8, 3.2), rand(-0.5, 0.8));
    p.spin.set(rand(-6, 6), rand(-6, 6), rand(-6, 6));
  });
  mugs.forEach(m => { m.vy = rand(1.0, 1.6); });
}

function animateProps(dt, t) {
  papers.forEach(p => {
    if (!p.flying) return;
    p.vel.y -= 7 * dt;
    p.m.position.addScaledVector(p.vel, dt);
    p.m.rotation.x += p.spin.x * dt;
    p.m.rotation.y += p.spin.y * dt;
    p.m.rotation.z += p.spin.z * dt;
    p.vel.x *= 0.985; p.vel.z *= 0.985;
    const onTable = Math.abs(p.m.position.x) < 0.72 && p.m.position.z > -2.0 && p.m.position.z < 1.6;
    const groundY = onTable ? p.baseY : 0.01;
    if (p.m.position.y <= groundY && p.vel.y < 0) {
      p.m.position.y = groundY;
      p.flying = false;
      p.rz = rand(-0.8, 0.8);
      p.m.rotation.set(-Math.PI / 2, 0, p.rz);
    }
  });
  mugs.forEach(m => {
    if (m.vy === 0 && m.g.position.y <= TABLE_TOP) return;
    m.vy -= 9 * dt;
    m.g.position.y += m.vy * dt;
    m.g.rotation.z = (m.g.position.y - TABLE_TOP) * 2;
    if (m.g.position.y <= TABLE_TOP) { m.g.position.y = TABLE_TOP; m.vy = 0; m.g.rotation.z = 0; }
  });
  tableBump = damp(tableBump, 0, 6, dt);
  tableG.position.y = Math.sin(t * 60) * 0.012 * tableBump;

  swing = damp(swing, 0, 0.8, dt);
  lampPivot.rotation.z = Math.sin(t * 1.6) * (0.04 + swing * 0.35);
  lampPivot.rotation.x = Math.cos(t * 1.3) * (0.02 + swing * 0.15);

  const speed = mode === 'play' ? 1 + s.agenda * 0.6 : 1;
  minHand.rotation.z -= dt * speed * 1.2;
  hourHand.rotation.z -= dt * speed * 0.1;

  steam.forEach(p => {
    if (p.life <= 0) return;
    p.life -= dt * 1.3;
    p.m.position.addScaledVector(p.vel, dt);
    p.m.scale.setScalar(1 + (1 - p.life) * 2.5);
    p.m.material.opacity = Math.max(0, p.life) * 0.7;
    if (p.life <= 0) p.m.visible = false;
  });
  confetti.forEach(p => {
    if (p.life <= 0) return;
    p.life -= dt;
    p.vel.y -= 3.5 * dt;
    p.vel.multiplyScalar(0.985);
    p.m.position.addScaledVector(p.vel, dt);
    p.m.rotation.x += p.spin.x * dt; p.m.rotation.y += p.spin.y * dt;
    if (p.m.position.y < 0.02) { p.m.position.y = 0.02; p.vel.set(0, 0, 0); p.spin.set(0, 0, 0); }
    if (p.life <= 0) p.m.visible = false;
  });

  if (mode === 'play' && s.carpetLevel === 3) carpetMat.emissiveIntensity = 0.12 + Math.sin(t * 3) * 0.08;
}

function animateNPCs(dt, t) {
  const phase = mode === 'play' ? s.phase : 'calm';
  npcs.forEach(n => {
    // mod seçimi
    let want = n.mode;
    if (phase === 'calm' || mode !== 'play') {
      n.timer -= dt;
      if (n.timer <= 0 || n.mode === 'carpet' || n.mode === 'chant' || n.mode === 'laugh') {
        if (n.timer <= 0) { n.timer = rand(1.5, 5); want = Math.random() < 0.45 ? 'slack' : 'attentive'; }
        else if (n.mode !== 'slack') want = 'attentive';
      }
    } else if (phase === 'warn' || phase === 'angry') {
      if (n.mode !== 'carpet') {
        if (n.pending !== 'carpet') { n.pending = 'carpet'; n.delay = rand(0.05, 0.45); }
        n.delay -= dt;
        if (n.delay <= 0) want = 'carpet';
      }
    } else if (phase === 'caught') {
      want = s.phaseT > 0.6 ? 'chant' : 'carpet';
    } else if (phase === 'fake') {
      want = 'laugh';
    }
    if (want !== 'carpet') n.pending = null;
    n.mode = want;

    const side = Math.sign(n.facing);
    let bodyX = 0, headX = 0, headY = side * 0.5, armX = [-0.3, -0.3], armZ = [0, 0], bounce = 0;
    n.phone.visible = false;
    if (n.mode === 'slack') {
      headX = 0.6; headY = 0; armX = [-1.1, -1.1]; armZ = [0.25, -0.25]; n.phone.visible = true;
    } else if (n.mode === 'carpet') {
      bodyX = 0.38; headX = 0.95; headY = 0; armX = [-0.5, -0.5]; armZ = [0.3, -0.3];
    } else if (n.mode === 'chant') {
      const beat = Math.abs(Math.sin(t * 7.8 + n.beat * 0.2));
      armX = [-2.9 + beat * 0.5, -2.9 + beat * 0.5]; armZ = [-0.3, 0.3];
      headX = -0.25; headY = side * 0.4; bounce = beat * 0.06;
    } else if (n.mode === 'laugh') {
      headX = -0.3 + Math.sin(t * 18 + n.beat) * 0.08; armX = [-0.6, -0.6]; bounce = Math.abs(Math.sin(t * 14 + n.beat)) * 0.03;
    } else {
      headX = Math.sin(t * 1.5 + n.beat) * 0.05;
    }
    n.body.rotation.x = damp(n.body.rotation.x, bodyX, 10, dt);
    n.head.rotation.x = damp(n.head.rotation.x, headX, 10, dt);
    n.head.rotation.y = damp(n.head.rotation.y, headY, 6, dt);
    n.arms.forEach((a, i) => {
      a.rotation.x = damp(a.rotation.x, armX[i], 12, dt);
      a.rotation.z = damp(a.rotation.z, armZ[i], 12, dt);
    });
    n.body.position.y = damp(n.body.position.y, 0.5 + bounce, 20, dt);
  });
}

function animatePlayer(dt) {
  const tucked = mode === 'play' && !holding;
  feet.forEach((f, i) => {
    const sgn = i ? 1 : -1;
    f.position.x = damp(f.position.x, tucked ? sgn * 0.07 : sgn * 0.14, 10, dt);
    f.position.y = damp(f.position.y, tucked ? 0.16 : 0.04, 10, dt);
    f.position.z = damp(f.position.z, tucked ? 1.9 : 1.6, 10, dt);
    f.rotation.x = damp(f.rotation.x, tucked ? -0.5 : 0, 10, dt);
  });
  placePhone(dt, mode === 'play' && holding);
}

function updateCamera(dt, t) {
  if (mode === 'intro') {
    const a = t * 0.15;
    camera.position.set(Math.sin(a) * 3.2, 2.0 + Math.sin(t * 0.3) * 0.2, -0.8 + Math.cos(a) * 3.6);
    mami.head.getWorldPosition(tmpV);
    lookTarget.lerp(tmpV.add(new THREE.Vector3(0, -0.5, 0)), 0.1);
    camera.lookAt(lookTarget);
    camera.fov = damp(camera.fov, baseFov + 8, 3, dt);
    camera.updateProjectionMatrix();
    return;
  }
  const forceMami = mode === 'over' || (mode === 'play' && s.phase === 'caught');
  const wantLook = forceMami ? 0 : (holding ? 0 : 1);
  look = damp(look, wantLook, holding ? 12 : 9, dt);

  camera.position.lerp(CAM_POS, 1 - Math.exp(-6 * dt));
  mami.head.getWorldPosition(tmpV);
  const mamiT = tmpV.clone().add(new THREE.Vector3(0, -0.35 * mamiScale, 0));
  const carpetT = new THREE.Vector3(0, 0, 1.05);
  const target = mamiT.lerp(carpetT, look);
  lookTarget.lerp(target, 1 - Math.exp(-14 * dt));
  camera.lookAt(lookTarget);

  // sarsıntı
  shake = damp(shake, 0, 4, dt);
  const sh = shake + (mode === 'play' && s.phase === 'angry' ? 0.02 : 0);
  camera.rotation.z += (Math.random() - 0.5) * sh * 0.15;
  camera.position.x += (Math.random() - 0.5) * sh * 0.08;
  camera.position.y += (Math.random() - 0.5) * sh * 0.08;

  let fov = baseFov;
  if (mode === 'play') {
    if (s.phase === 'angry') fov -= 3 * (1 - look);
    if (s.phase === 'caught') fov -= 9;
    if (s.phase === 'warn') fov -= 2;
  }
  if (mode === 'over') fov -= 6;
  camera.fov = damp(camera.fov, fov, 6, dt);
  camera.updateProjectionMatrix();
}

function updateBubble() {
  if (ui.bubble.classList.contains('hide')) return;
  mami.head.getWorldPosition(tmpV);
  tmpV.y += 0.48 * mamiScale;
  tmpV.project(camera);
  const w = window.innerWidth, h = window.innerHeight;
  let x = (tmpV.x * 0.5 + 0.5) * w;
  let y = (-tmpV.y * 0.5 + 0.5) * h;
  const behind = tmpV.z > 1;
  const minY = 150, maxY = h * 0.6;
  if (behind || y < minY) y = minY;
  if (y > maxY) y = maxY;
  const half = Math.min(w * 0.36, 170);
  x = Math.max(half + 8, Math.min(w - half - 8, x));
  ui.bubble.style.left = x + 'px';
  ui.bubble.style.top = y + 'px';
}

function updateTalk(dt) {
  if (talkIdx >= talkText.length) return;
  talkT += dt;
  while (talkT > 0.03 && talkIdx < talkText.length) {
    talkT -= 0.03;
    talkIdx++;
    if (talkIdx % 2 === 0 && mode === 'play') Sfx.blip();
  }
  ui.bubble.textContent = talkText.slice(0, talkIdx);
}

function step(dt) {
  s.phaseT += dt;
  if (s.phase === 'calm' && !s.ending) s.agendaT += dt;

  if (holding) {
    const mult = 1 + (s.agenda - 1) * 0.15;
    const bonus = s.phase === 'warn' ? 2 : 1;
    const before = Math.floor(s.score);
    s.score += 40 * mult * bonus * dt;
    s.slackTime += dt;
    s.slackT += dt;
    if (s.slackT > 2.2) {
      s.slackT = 0;
      s.slackIdx = (s.slackIdx + 1) % SLACK.length;
      drawPhone(s.slackIdx);
      updateActivity();
    }
    if (Math.floor(s.score / 100) > Math.floor(before / 100)) bumpScore();
  } else if (s.phase === 'angry' || s.phase === 'caught') {
    s.carpetTime += dt;
    const n = Math.floor(s.carpetTime * 6);
    if (n !== s.patterns) { s.patterns = n; updateActivity(); }
  }

  if (s.phase === 'calm') {
    if (talkIdx >= talkText.length && s.phaseT > 0.8 && Math.random() < dt * 0.6) say(pick(CALM));
    if (s.phaseT >= s.phaseLen && !s.ending) enterPhase('warn');
  } else if (s.phase === 'warn') {
    if (s.phaseT >= s.phaseLen) enterPhase(s.fake ? 'fake' : 'angry');
  } else if (s.phase === 'angry') {
    if (s.phaseT > 0.05 && Math.random() < dt * 14) Sfx.growl();
    if (holding && s.phaseT > 0.12 && !s.caughtThisRound) { caught(); }
    else if (s.phaseT >= s.phaseLen) {
      if (!s.caughtThisRound) {
        s.dodged++; s.score += 50; bumpScore();
        flash('+50 MASUMİYET', '#3ddc84'); Sfx.ding();
        burstConfetti(25, new THREE.Vector3(0, 1.2, 1.0));
      }
      enterPhase('calm', { resume: true });
    }
  } else if (s.phase === 'fake') {
    if (s.phaseT >= s.phaseLen) enterPhase('calm');
  } else if (s.phase === 'caught') {
    if (s.phaseT >= s.phaseLen) {
      if (s.lives <= 0) gameOver();
      else enterPhase('calm', { resume: true });
    }
  }

  if (s.agendaT > 14 && s.phase === 'calm' && !s.ending) nextAgenda();
  updateHud();
}

// ---------------------------------------------------------------------------
// Ana döngü
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(0.05, clock.getDelta());
  elapsed += dt;
  const t = elapsed;

  if (mode === 'play') step(dt);
  else rageTarget = 0;
  rage = damp(rage, rageTarget, rageTarget > rage ? 10 : 3, dt);

  updateTalk(dt);
  animateMami(dt, t);
  animateNPCs(dt, t);
  animatePlayer(dt);
  animateProps(dt, t);
  updateCamera(dt, t);
  updateBubble();

  // ışık & atmosfer
  const angryNow = mode === 'play' && (s.phase === 'angry' || s.phase === 'caught');
  alarm.intensity = angryNow ? 6 + Math.sin(t * 18) * 5 : rage * 3;
  lampLight.intensity = 14 * (1 - rage * 0.5);
  hemi.intensity = 1.1 - rage * 0.45;
  scene.background.copy(BG_CALM).lerp(BG_ANGRY, rage);
  scene.fog.color.copy(scene.background);
  ui.vignette.style.opacity = (rage * 0.85).toFixed(3);
  ui.dim.style.opacity = (mode === 'play' ? look * 0.55 : 0).toFixed(3);

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

setMood('intro');
say('Hoş geldiniz arkadaşlar... başlıyoruz.');
$('loading').classList.add('hidden');
requestAnimationFrame(frame);
