// Visor de modelos 3D (.glb) para la ficha del producto. Gira con el dedo.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export function visor(canvas, buffer, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // opts.tono === 0: sin tono de cine (los modelos con la gráfica de la muestra se ven con sus colores).
  renderer.toneMapping = opts.tono === 0 ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
  renderer.setClearColor(0xffffff, 0);
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = opts.entorno ?? 1;
  const key = new THREE.DirectionalLight(0xffffff, opts.luz ?? 1.6); key.position.set(-2, 4, 3); scene.add(key);
  const cam = new THREE.PerspectiveCamera(32, 1, 0.001, 1000);
  const ctl = new OrbitControls(cam, canvas);
  ctl.enableDamping = true; ctl.enablePan = false; ctl.autoRotate = true; ctl.autoRotateSpeed = 1.2;
  let raf = 0, vivo = true;
  const size = () => { const r = canvas.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); cam.aspect = r.width / Math.max(1, r.height); cam.updateProjectionMatrix(); };
  const loop = () => { if (!vivo) return; ctl.update(); renderer.render(scene, cam); raf = requestAnimationFrame(loop); };
  canvas.addEventListener('pointerdown', () => { ctl.autoRotate = false; }, { once: true });
  new GLTFLoader().parse(buffer, '', gltf => {
    const obj = gltf.scene;
    // Con la gráfica de la muestra: que se vea la foto tal cual (sin metal ni color encima).
    if (opts.tono === 0) obj.traverse(x => { if (x.isMesh) [].concat(x.material).forEach(q => { if (q && q.map) { q.metalness = 0; if (q.color) q.color.setRGB(1, 1, 1); } }); });
    // Rhino exporta con Z arriba en algunos casos: si el modelo es más profundo que alto, se para.
    const box = new THREE.Box3().setFromObject(obj);
    const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
    obj.position.sub(c);
    scene.add(obj);
    const r = Math.max(s.x, s.y, s.z) || 1;
    cam.position.set(r * 0.9, r * 0.55, r * 2.1); cam.near = r / 100; cam.far = r * 100; cam.updateProjectionMatrix();
    ctl.target.set(0, 0, 0); ctl.minDistance = r * 0.6; ctl.maxDistance = r * 6;
    size(); loop(); opts.onLoad && opts.onLoad();
  }, err => { opts.onError && opts.onError(err); });
  const ro = new ResizeObserver(size); ro.observe(canvas);
  return { dispose() { vivo = false; cancelAnimationFrame(raf); ro.disconnect(); ctl.dispose(); renderer.dispose(); pmrem.dispose(); } };
}
