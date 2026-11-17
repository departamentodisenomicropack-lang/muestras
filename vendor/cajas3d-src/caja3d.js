// Caja 3D — carrusel de cajas de cartón + apertura y entrada de cámara.
// Un solo renderer por página: se crea una vez y se reutiliza.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import GALLETA from './galleta.txt';

// Medidas en cm (caja de zapatillas)
const W = 34, D = 22, H = 12, T = 0.45;           // caja
const LG = 0.35, LT = 0.42, LS = 3.4;              // tapa: holgura, espesor, faldón
const SPACING = 52;                                 // separación del carrusel
const DIST = 118, TILT = THREE.MathUtils.degToRad(17); // punto de vista de las fotos
const BOX_PX = 0.70;                                // ancho de la caja respecto del escenario

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
const easeOut = u => 1 - Math.pow(1 - u, 3);
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

const CLONES = new Map();
function loadTex(loader, url, srgb) {
  const t = loader.load(url, () => { (CLONES.get(t) || []).forEach(c => { c.needsUpdate = true; }); });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function rep(tex, sx, sy, ox = 0, oy = 0) { const t = tex.clone(); t.repeat.set(sx, sy); t.offset.set(ox, oy); if (tex.image) t.needsUpdate = true; else { if (!CLONES.has(tex)) CLONES.set(tex, []); CLONES.get(tex).push(t); } return t; }

// AO horneada para las caras interiores: más oscuro en esquinas y bordes que se tocan
function aoTexture(w, h, edges, strength = 0.55, reach = 0.22) {
  const c = document.createElement('canvas'); c.width = 256; c.height = Math.max(16, Math.round(256 * h / w));
  const g = c.getContext('2d'); const img = g.createImageData(c.width, c.height);
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    const u = x / (c.width - 1), v = y / (c.height - 1);
    let o = 1;
    const dist = { l: u * w, r: (1 - u) * w, t: v * h, b: (1 - v) * h };
    for (const e of edges) { const d = dist[e] / (reach * 10); o *= 1 - strength * Math.exp(-d * 2.2); }
    const k = Math.round(clamp(o, 0, 1) * 255), i = (y * c.width + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = k; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; return t;
}

// Nombre impreso en la tapa: tinta absorbida por el cartón
function labelTexture(box, font) {
  const c = document.createElement('canvas'); c.width = 2048; c.height = Math.round(2048 * (D + 2 * LG) / (W + 2 * LG));
  const g = c.getContext('2d');
  const ink = 'rgba(38,28,20,0.86)';
  const pad = c.width * 0.075;
  // galleta de la marca, en el color de acento
  const s = c.height * 0.20;
  g.save(); g.translate(c.width - pad - s, pad * 0.9); g.scale(s / 100, s / 100);
  g.fillStyle = 'rgba(140,72,50,0.95)'; g.fill(new Path2D(GALLETA)); g.restore();
  // nombre (dos líneas como máximo)
  g.fillStyle = ink; g.textBaseline = 'alphabetic';
  const words = String(box.nombre || '').toUpperCase().split(/\s+/);
  let size = c.height * 0.20, lines;
  const maxW = c.width - pad * 2 - s - pad * 0.4;
  const one = String(box.nombre || '').toUpperCase();
  for (let z = c.height * 0.2; z > c.height * 0.12; z *= 0.95) { g.font = `900 ${z}px ${font}`; if (g.measureText(one).width <= maxW) { size = z; lines = [one]; break; } }
  if (!lines) for (; size > c.height * 0.08; size *= 0.94) {
    g.font = `900 ${size}px ${font}`;
    lines = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width <= maxW || !cur) cur = t; else { lines.push(cur); cur = w; } }
    if (cur) lines.push(cur);
    if (lines.length <= 2 && lines.every(l => g.measureText(l).width <= maxW)) break;
  }
  lines.slice(0, 2).forEach((l, i) => g.fillText(l, pad, pad + size * 0.86 + i * size * 0.98));
  // lugar y unidades
  g.font = `600 ${c.height * 0.065}px ${font}`;
  g.fillStyle = 'rgba(38,28,20,0.70)';
  g.fillText(box.lugar || 'Sin lugar', pad, c.height - pad);
  const u = Number(box.unidades || 0);
  g.font = `900 ${c.height * 0.13}px ${font}`; g.fillStyle = ink;
  const un = `${u}`; const uw = g.measureText(un).width;
  g.font = `700 ${c.height * 0.06}px ${font}`; const lw = g.measureText(u === 1 ? ' unidad' : ' unidades').width;
  g.fillStyle = 'rgba(38,28,20,0.70)'; g.fillText(u === 1 ? ' unidad' : ' unidades', c.width - pad - lw, c.height - pad);
  g.font = `900 ${c.height * 0.13}px ${font}`; g.fillStyle = ink; g.fillText(un, c.width - pad - lw - uw, c.height - pad);
  // la tinta no es perfecta: se come un poco con la fibra
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.35})`; g.fillRect(Math.random() * c.width, Math.random() * c.height, 1 + Math.random() * 3, 1 + Math.random() * 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export function create(opts) {
  const { canvas, tex, font = 'Archivo, Arial, sans-serif' } = opts;
  let stage = opts.stage || null;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0xffffff, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  // Luz de estudio: principal arriba a la izquierda (como la sombra diagonal de la foto) + relleno
  const key = new THREE.DirectionalLight(0xfff3e2, 2.6);
  key.position.set(-30, 82, 16); key.castShadow = true;
  key.shadow.mapSize.set(512, 512); key.shadow.bias = -0.0008; key.shadow.normalBias = 0.04;
  Object.assign(key.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 20, far: 200 });
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xeef1fa, 0.8); fill.position.set(48, 34, 40); scene.add(fill);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8cfc4, 0.35));

  // Piso que solo recibe sombra (el fondo es la app)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(800, 400), new THREE.ShadowMaterial({ opacity: 0.12 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  // ---- Materiales de cartón (textura real)
  const L = new THREE.TextureLoader();
  const A = loadTex(L, tex.albedo, true), N = loadTex(L, tex.normal, false), R = loadTex(L, tex.rough, false);
  const I = loadTex(L, tex.inner, true), E = loadTex(L, tex.edge, true);
  // la foto cubre unos 40 × 24 cm de cartón: cada cara usa una porción sin repetir (sin costuras)
  const TW = 40, TH = 24;
  function kraft(w, h, opt = {}) {
    const sx = Math.min(1, w / TW), sy = Math.min(1, h / TH), ox = Math.random() * (1 - sx), oy = Math.random() * (1 - sy);
    return new THREE.MeshStandardMaterial({
      map: rep(opt.inner ? I : A, sx, sy, ox, oy), normalMap: rep(N, sx, sy, ox, oy), roughnessMap: rep(R, sx, sy, ox, oy),
      normalScale: new THREE.Vector2(opt.inner ? 0.25 : 0.55, opt.inner ? 0.25 : 0.55), roughness: 1, metalness: 0,
      color: opt.tint || 0xffffff, aoMap: opt.ao || null, aoMapIntensity: 1, envMapIntensity: 0.9,
    });
  }
  const edgeMat = (len) => new THREE.MeshStandardMaterial({ map: rep(E, len / 25, 1), color: 0xcbbca4, roughness: 0.95, metalness: 0 });

  function panel(w, h, d, mat, r = 0.12) {
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, Math.min(w, h, d) / 2.05)), mat);
    m.castShadow = true; m.receiveShadow = true; return m;
  }
  function plane(w, h, mat) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.receiveShadow = true; return m; }

  // ---- Una caja
  function buildBox(data) {
    const g = new THREE.Group();
    // cuerpo: fondo + 4 paredes con espesor
    const bottom = panel(W, T, D, kraft(W, D)); bottom.position.y = T / 2; g.add(bottom);
    const front = panel(W, H, T, kraft(W, H)); front.position.set(0, H / 2, D / 2 - T / 2); g.add(front);
    const back = panel(W, H, T, kraft(W, H)); back.position.set(0, H / 2, -D / 2 + T / 2); g.add(back);
    const left = panel(T, H, D - 2 * T, kraft(D, H)); left.position.set(-W / 2 + T / 2, H / 2, 0); g.add(left);
    const right = panel(T, H, D - 2 * T, kraft(D, H)); right.position.set(W / 2 - T / 2, H / 2, 0); g.add(right);
    // interior: liner más claro, con oclusión ambiental horneada
    const iw = W - 2 * T, id = D - 2 * T, ih = H - T;
    const fl = plane(iw, id, kraft(iw, id, { inner: true, ao: aoTexture(iw, id, ['l', 'r', 't', 'b'], 0.6, 0.35) }));
    fl.rotation.x = -Math.PI / 2; fl.position.y = T + 0.01; g.add(fl);
    const wallIn = (w, rotY, x, z, edges) => {
      const p = plane(w, ih, kraft(w, ih, { inner: true, ao: aoTexture(w, ih, edges, 0.5, 0.3) }));
      p.rotation.y = rotY; p.position.set(x, T + ih / 2, z); g.add(p);
    };
    wallIn(iw, 0, 0, -D / 2 + T + 0.01, ['l', 'r', 'b']);
    wallIn(iw, Math.PI, 0, D / 2 - T - 0.01, ['l', 'r', 'b']);
    wallIn(id, Math.PI / 2, -W / 2 + T + 0.01, 0, ['l', 'r', 'b']);
    wallIn(id, -Math.PI / 2, W / 2 - T - 0.01, 0, ['l', 'r', 'b']);
    // canto superior de las paredes: la onda del corrugado (foto real)
    const rim = (len, x, z, rotY) => { const p = plane(len, T, edgeMat(len)); p.rotation.set(-Math.PI / 2, 0, rotY); p.position.set(x, H + 0.005, z); g.add(p); };
    rim(W, 0, D / 2 - T / 2, 0); rim(W, 0, -D / 2 + T / 2, 0);
    rim(D - 2 * T, -W / 2 + T / 2, 0, Math.PI / 2); rim(D - 2 * T, W / 2 - T / 2, 0, Math.PI / 2);

    // tapa articulada atrás (sin faldón trasero, como una caja de zapatillas de una pieza)
    const hinge = new THREE.Group(); hinge.position.set(0, H + LT, -D / 2 - LG); g.add(hinge);
    const lid = new THREE.Group(); hinge.add(lid);
    const lw = W + 2 * LG + 2 * LT, ld = D + 2 * LG + LT;
    const top = panel(lw, LT, ld, kraft(lw, ld)); top.position.set(0, -LT / 2, ld / 2); lid.add(top);
    const lidIn = plane(lw - 2 * LT, ld - LT, kraft(lw, ld, { inner: true, ao: aoTexture(lw, ld, ['l', 'r', 'b'], 0.35, 0.2) }));
    lidIn.rotation.x = Math.PI / 2; lidIn.position.set(0, -LT - 0.01, (ld - LT) / 2); lid.add(lidIn);
    const sf = panel(lw, LS, LT, kraft(lw, LS)); sf.position.set(0, -LT - LS / 2 + 0.05, ld - LT / 2); lid.add(sf);
    const sl = panel(LT, LS, ld - LT, kraft(ld, LS)); sl.position.set(-lw / 2 + LT / 2, -LT - LS / 2 + 0.05, (ld - LT) / 2); lid.add(sl);
    const sr = panel(LT, LS, ld - LT, kraft(ld, LS)); sr.position.set(lw / 2 - LT / 2, -LT - LS / 2 + 0.05, (ld - LT) / 2); lid.add(sr);
    // impresión del nombre
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(lw - 0.4, ld - 0.4), new THREE.MeshStandardMaterial({
      map: labelTexture(data, font), transparent: true, roughness: 0.9, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2,
    }));
    lab.rotation.x = -Math.PI / 2; lab.position.set(0, 0.012, ld / 2); lid.add(lab);
    g.userData = { hinge, data, lid: 0, lidV: 0 };
    return g;
  }

  // ---- Cámara
  const cam = new THREE.PerspectiveCamera(30, 1, 0.5, 600);
  cam.up.set(0, 0, -1);
  const HOME = new THREE.Vector3(0, DIST * Math.cos(TILT), DIST * Math.sin(TILT));
  const HOME_T = new THREE.Vector3(0, H * 0.35, -1.5);
  const path = new THREE.CatmullRomCurve3([
    HOME.clone(),
    new THREE.Vector3(0, 46, 10),
    new THREE.Vector3(0, 19, 2.5),
    new THREE.Vector3(0, 7.5, 0.4),
    new THREE.Vector3(0, 1.6, 0),
  ], false, 'centripetal');
  const tgtA = HOME_T.clone(), tgtB = new THREE.Vector3(0, 0, -0.6);

  // ---- Estado
  let boxes = [], meshes = [], idx = 0, pos = 0, vel = 0, dragging = false;
  let size = { w: 1, h: 1 }, stageRect = { x: 0, y: 0, w: 1, h: 1 };
  let mode = 'carrusel', t0 = 0, raf = 0, last = 0, seekT = null;
  const clock = () => seekT != null ? t0 + seekT * 1000 : performance.now();
  const cb = opts;

  function layout() {
    const r = canvas.getBoundingClientRect();
    const nw = Math.max(1, r.width), nh = Math.max(1, r.height);
    if (nw !== size.w || nh !== size.h) { size = { w: nw, h: nh }; renderer.setSize(nw, nh, false); }
    if (stage && stage.isConnected) { const s = stage.getBoundingClientRect(); if (s.width > 0) stageRect = { x: s.left - r.left, y: s.top - r.top, w: s.width, h: s.height }; }
  }
  // Cámara de casa: centro óptico en el centro del escenario, la caja ocupa BOX_PX del ancho
  function cameraFor(k) { // k: 0 casa → 1 pantalla completa
    const cy = lerp(stageRect.y + stageRect.h / 2, size.h / 2, k);
    const fullH = 2 * Math.max(cy, size.h - cy);
    const f = (stageRect.w * BOX_PX) * DIST / W;       // focal en px para la caja en casa
    const fov0 = THREE.MathUtils.radToDeg(2 * Math.atan((fullH / 2) / f));
    return { cy, fullH, fov0 };
  }
  function applyView(k, fovOverride) {
    const { cy, fullH, fov0 } = cameraFor(k);
    cam.aspect = size.w / size.h;
    cam.fov = fovOverride != null ? lerp(fov0, fovOverride, k) : fov0;
    cam.setViewOffset(size.w, fullH, 0, fullH / 2 - cy, size.w, size.h);
    cam.updateProjectionMatrix();
  }

  function setBoxes(list, start = 0) {
    meshes.forEach(m => scene.remove(m));
    boxes = list.slice(); meshes = boxes.map(b => { const m = buildBox(b); m.visible = false; scene.add(m); return m; });
    idx = clamp(start, 0, Math.max(0, boxes.length - 1)); pos = idx; vel = 0; kick();
  }

  // ---- Bucle (solo corre mientras hay movimiento)
  function kick() { if (!raf) { last = clock(); raf = requestAnimationFrame(frame); } }
  function frame() { const now = clock();
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    layout();
    // si la app sacó el escenario (búsqueda, otra pantalla), el canvas se esconde
    if (mode === 'carrusel' && (!stage || !stage.isConnected)) { if (stage) detach(); else hide(); raf = 0; return; }
    let busy = step(dt, now);
    renderer.render(scene, cam);
    raf = busy ? requestAnimationFrame(frame) : 0;
  }

  function lidSpring(u, target, dt, w = 9.5, z = 0.5) {
    const d = u.userData; const a = -w * w * (d.lid - target) - 2 * z * w * d.lidV;
    d.lidV += a * dt; d.lid += d.lidV * dt;
    if (d.lid < 0) { d.lid = 0; d.lidV = Math.abs(d.lidV) * 0.2; }
    d.hinge.rotation.x = -d.lid;
    return Math.abs(d.lid - target) > 0.0005 || Math.abs(d.lidV) > 0.0005;
  }

  const OPEN = THREE.MathUtils.degToRad(112);
  function springAt(t, w, z) { if (t <= 0) return 0; const wd = w * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + z / Math.sqrt(1 - z * z) * Math.sin(wd * t)); }
  function setLid(m, a) { m.userData.lid = a; m.userData.lidV = 0; m.userData.hinge.rotation.x = -a; }
  function step(dt, now) {
    let busy = false;
    if (mode === 'carrusel') {
      if (!dragging) { // resorte hacia la caja elegida
        const k = 140, c = 2 * Math.sqrt(k) * 0.82;
        vel += (-k * (pos - idx) - c * vel) * dt; pos += vel * dt;
        if (Math.abs(pos - idx) < 0.0004 && Math.abs(vel) < 0.0004) { pos = idx; vel = 0; } else busy = true;
      } else busy = true;
      applyView(0);
      cam.position.copy(HOME); cam.lookAt(HOME_T);
      meshes.forEach((m, i) => {
        const d = i - pos; m.visible = Math.abs(d) < 1.6;
        // al deslizar, la caja se levanta apenas y se inclina en la dirección del movimiento (como en la referencia)
        const sp = clamp(vel * 0.06, -0.25, 0.25);
        m.position.set(d * SPACING, Math.min(1, Math.abs(d)) * 1.2, Math.abs(d) * 3);
        m.rotation.set(0, -d * 0.05, sp * (1 - Math.min(1, Math.abs(d))) + d * 0.04);
        if (lidSpring(m, 0, dt)) busy = true;
      });
      renderer.toneMappingExposure = 1;
    } else if (mode === 'abrir' || mode === 'volver') {
      const t = (now - t0) / 1000, m = meshes[idx];
      meshes.forEach((o, i) => { o.visible = i === idx; });
      m.position.set(0, 0, 0); m.rotation.set(0, 0, 0);
      const fwd = mode === 'abrir';
      // tapa: se abre primero; al volver se cierra al final
      let a = fwd ? OPEN * springAt(t, 8.5, 0.42) : OPEN * (1 - springAt(t - 0.8, 9.5, 0.62));
      // al cerrar, la tapa no puede atravesar la caja: si el resorte se pasa, rebota apenas hacia arriba
      if (a < 0) a = -a * 0.25;
      setLid(m, a);
      // cámara
      const T0 = fwd ? 0.42 : 0.0, DUR = fwd ? 1.55 : 1.05;
      let u = clamp((t - T0) / DUR, 0, 1); if (!fwd) u = 1 - clamp(t / DUR, 0, 1);
      const e = fwd ? ease(u) : ease(u);
      const p = path.getPointAt(e);
      cam.position.copy(p);
      const tg = tgtA.clone().lerp(tgtB, sstep(0.0, 0.55, e));
      cam.lookAt(tg);
      applyView(sstep(0, 0.45, e), 64);
      // al final la luz "atraviesa": exposición sube a blanco
      renderer.toneMappingExposure = 1 + 5.5 * Math.pow(sstep(0.78, 1, e), 2);
      cb.onProgress && cb.onProgress(e, mode);
      if (fwd && u >= 1) { mode = 'adentro'; cb.onArrive && cb.onArrive(idx); }
      else if (!fwd && t >= 1.75) { mode = 'carrusel'; cb.onBack && cb.onBack(idx); }
      busy = true;
      if (mode === 'adentro') busy = false;
    }
    return busy;
  }

  // ---- Gestos sobre el escenario
  let pd = null;
  const onDown = e => {
    if (mode !== 'carrusel') return;
    pd = { x: e.clientX, y: e.clientY, p: pos, t: performance.now(), lx: e.clientX, lt: performance.now(), moved: false };
    try { stage.setPointerCapture(e.pointerId); } catch (_) {}
  };
  const onMove = e => {
    if (!pd) return;
    const dx = e.clientX - pd.x, dy = e.clientY - pd.y;
    if (!pd.moved && Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { pd.scroll = true; }
    if (!pd.scroll && Math.abs(dx) > 6) pd.moved = true;
    if (!pd.moved) return;
    dragging = true;
    const pxPerBox = stageRect.w * BOX_PX * SPACING / W;
    let p = pd.p - dx / pxPerBox;
    if (p < 0) p *= 0.35; if (p > boxes.length - 1) p = boxes.length - 1 + (p - boxes.length + 1) * 0.35;
    const nowT = performance.now(); vel = (p - pos) / Math.max(0.008, (nowT - pd.lt) / 1000); pd.lt = nowT;
    pos = p; kick();
  };
  const up = e => {
    if (!pd) return;
    const wasTap = !pd.moved && !pd.scroll && e.type === 'pointerup' && performance.now() - pd.t < 600; pd = null;
    if (dragging) {
      dragging = false;
      const dpos = pos - idx;
      let ni = idx;
      if (Math.abs(vel) > 1.2) ni = idx + Math.sign(vel); else if (Math.abs(dpos) > 0.18) ni = idx + Math.sign(dpos);
      ni = clamp(ni, 0, boxes.length - 1);
      if (ni !== idx) { idx = ni; cb.onIndex && cb.onIndex(idx); }
      kick();
    } else if (wasTap) open();
  };
  function bind(el, on) { const f = on ? 'addEventListener' : 'removeEventListener';
    el[f]('pointerdown', onDown); el[f]('pointermove', onMove); el[f]('pointerup', up); el[f]('pointercancel', up); }

  function go(i) { const ni = clamp(i, 0, boxes.length - 1); if (ni === idx || mode !== 'carrusel') return; idx = ni; cb.onIndex && cb.onIndex(idx); kick(); }
  function open() { if (mode !== 'carrusel' || !boxes.length || Math.abs(pos - idx) > 0.08) return; mode = 'abrir'; t0 = clock(); cb.onStart && cb.onStart(idx); kick(); }
  function back() { if (mode !== 'adentro') return; mode = 'volver'; t0 = clock(); kick(); }

  function resize() { layout(); kick(); }
  const ro = new ResizeObserver(resize); ro.observe(canvas);
  // la app vuelve a dibujar su HTML seguido: el escenario cambia, el canvas y la escena quedan
  function attach(el) {
    if (stage && stage !== el) { bind(stage, false); ro.unobserve(stage); }
    if (stage !== el) { stage = el; bind(stage, true); ro.observe(stage); }
    canvas.style.visibility = 'visible'; layout(); kick();
  }
  function detach() {
    if (stage) { bind(stage, false); ro.unobserve(stage); stage = null; }
    pd = null; dragging = false;
    if (mode === 'carrusel') hide();
  }
  function hide() { canvas.style.visibility = 'hidden'; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  function reset() { mode = 'carrusel'; renderer.toneMappingExposure = 1; meshes.forEach(m => setLid(m, 0)); pos = idx; vel = 0; kick(); }
  if (stage) { bind(stage, true); ro.observe(stage); }
  layout();
  addEventListener('scroll', () => { if (stage && mode === 'carrusel') kick(); }, { passive: true });
  // primera pintura cuando las texturas llegaron
  THREE.DefaultLoadingManager.onLoad = () => kick();
  // para pruebas: congela el reloj en t segundos de la animación actual
  function seek(t) { seekT = t; const now = clock(); step(0.016, now); renderer.render(scene, cam); }
  return { attach, detach, hide, reset, seek, setBoxes, go, open, back, resize, get index() { return idx; }, get mode() { return mode; }, renderer, kick };
}
