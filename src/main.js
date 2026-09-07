import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createEnvironment } from './environment.js';
import { Simulation } from './physics.js';
import { monumentLayout, terrainHeight } from './layout.js';
import { ImpactEffects } from './effects.js';

const $ = id => document.getElementById(id);
const state = { mode: 'explore', paused: false, slow: false, power: 55, layout: 'ruins', ready: false };
let toastTimeout;
function toast(message) {
  $('toast').textContent = message; $('toast').classList.add('visible');
  clearTimeout(toastTimeout); toastTimeout = setTimeout(() => $('toast').classList.remove('visible'), 3000);
}

async function start() {
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.domElement.tabIndex = 0; renderer.domElement.setAttribute('aria-label', 'Stonehenge. Drag to orbit. Choose Launch then tap a stone to fire.');
  $('scene').appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(innerWidth < 700 ? 60 : 44, innerWidth / innerHeight, .1, 650);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .07;
  controls.minDistance = 6; controls.maxDistance = 85;
  controls.minPolarAngle = .1; controls.maxPolarAngle = Math.PI / 2 - .015;
  controls.maxTargetRadius = 24; controls.minTargetRadius = 0;
  controls.target.set(0, 2, 0); controls.cursor.set(0, 2, 0);
  function home() {
    controls.enableDamping = false; controls.update();
    camera.position.set(-27, 6.5, 42);
    if (innerWidth < 700) camera.position.set(-39, 16, 58);
    controls.target.set(0, 2, 0); controls.update(); controls.enableDamping = true;
  }
  home();
  const effects = new ImpactEffects(scene);
  const [environment] = await Promise.all([
    createEnvironment(scene, renderer, message => $('loading-detail').textContent = message),
    Simulation.initialize(),
  ]);
  const simulation = new Simulation(scene, environment.materials, (point, impulse) => effects.burst(point, impulse));
  simulation.reset(monumentLayout());
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const ao = new GTAOPass(scene, camera, innerWidth, innerHeight);
  ao.updateGtaoMaterial({ radius: .9, samples: 8, distanceExponent: 1.5, thickness: 1.2, scale: 1 });
  ao.blendIntensity = .7; ao.enabled = innerWidth > 700;
  composer.addPass(ao); composer.addPass(new OutputPass());
  const pointer = new THREE.Vector2(), raycaster = new THREE.Raycaster();
  let pointerDown = null, activePointers = new Set(), hadMultiplePointers = false;
  const interact = () => document.body.classList.add('has-interacted');
  controls.addEventListener('start', interact);
  function mode(next) {
    state.mode = next; document.body.classList.toggle('launch', next === 'impact');
    for (const id of ['explore', 'impact']) { $(id).classList.toggle('active', next === id); $(id).setAttribute('aria-pressed', String(next === id)); }
    const exploreHint = innerWidth < 700 ? 'Drag to orbit <span>·</span> Pinch to zoom <span>·</span> Two fingers to pan' : 'Drag to orbit <span>·</span> Scroll to explore <span>·</span> Right-drag to pan';
    $('hint').innerHTML = next === 'impact' ? 'Click a stone to launch <span>·</span> Drag to orbit <span>·</span> Space to pause' : exploreHint;
  }
  function fire(clientX, clientY) {
    if (state.paused) { toast('Resume the simulation to launch a sphere.'); return; }
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    // Aim at the visible surface and compensate for gravity, while the actual
    // sphere still travels through and collides with the physics world.
    const hits = raycaster.intersectObjects([...simulation.entities].filter(e => e.kind !== 'ball').map(e => e.mesh), false);
    const direction = raycaster.ray.direction.clone();
    if (hits.length) {
      const speed = 28 + state.power * .64;
      const flightTime = Math.max(0, hits[0].distance - 1.1) / speed;
      const aim = hits[0].point.clone(); aim.y += .5 * 9.81 * flightTime * flightTime;
      direction.copy(aim.sub(camera.position).normalize());
    }
    simulation.launch(camera.position, direction, state.power); interact();
  }
  renderer.domElement.addEventListener('pointerdown', e => {
    activePointers.add(e.pointerId);
    if (activePointers.size > 1) hadMultiplePointers = true;
    if (e.button === 0 && activePointers.size === 1) pointerDown = { x: e.clientX, y: e.clientY, id: e.pointerId, time: performance.now(), moved: false };
  });
  renderer.domElement.addEventListener('pointermove', e => {
    if (pointerDown && Math.hypot(e.clientX - pointerDown.x, e.clientY - pointerDown.y) > 6) pointerDown.moved = true;
  });
  renderer.domElement.addEventListener('pointerup', e => {
    activePointers.delete(e.pointerId);
    if (state.mode === 'impact' && pointerDown && pointerDown.id === e.pointerId && !pointerDown.moved && !hadMultiplePointers && performance.now() - pointerDown.time < 600) fire(e.clientX, e.clientY);
    pointerDown = null;
    if (activePointers.size === 0) hadMultiplePointers = false;
  });
  renderer.domElement.addEventListener('pointercancel', () => { activePointers.clear(); pointerDown = null; hadMultiplePointers = false; });
  const pause = () => {
    state.paused = !state.paused;
    $('pause').textContent = state.paused ? '▶' : 'Ⅱ';
    $('pause').setAttribute('aria-label', state.paused ? 'Resume simulation' : 'Pause simulation');
    $('pause').setAttribute('aria-pressed', String(state.paused));
    toast(state.paused ? 'Time is paused. You can still explore.' : 'Time is moving again.');
  };
  function reset() {
    simulation.reset(monumentLayout(state.layout === 'restored')); effects.clear(); lastWave = -10;
    toast('The stones are restored.'); updateStats();
  }
  function updateStats() {
    const stats = simulation.stats();
    $('body-count').textContent = stats.bodies;
    $('stone-count').textContent = `${stats.fractures ? stats.fractures + ' FRACTURED' : stats.bodies - stats.balls + ' STONES'}`;
    $('scene-state').textContent = state.paused ? 'TIME STANDS STILL' : stats.fractures ? 'HISTORY IN MOTION' : state.layout === 'restored' ? 'THE RECONSTRUCTED CIRCLE' : 'THE ANCIENT CIRCLE';
  }
  $('explore').onclick = () => mode('explore');
  $('impact').onclick = () => { mode('impact'); interact(); toast('Click or tap a stone to launch. Drag to move the camera.'); };
  $('pause').onclick = pause;
  $('slow').onclick = () => { state.slow = !state.slow; $('slow').setAttribute('aria-pressed', String(state.slow)); toast(state.slow ? 'Slow motion · one quarter speed' : 'Normal speed'); };
  $('power').oninput = e => { state.power = Number(e.target.value); $('power-value').textContent = `${state.power}%`; };
  $('fracture').onchange = e => simulation.fractures = e.target.checked;
  $('sound').onchange = async e => {
    try { await effects.enableSound(e.target.checked); }
    catch { e.target.checked = false; effects.sound = false; toast('Audio is unavailable in this browser.'); }
  };
  $('layout').onchange = e => { state.layout = e.target.value; reset(); };
  $('light').onchange = e => environment.atmosphere(e.target.value);
  $('reset').onclick = reset;
  $('camera-home').onclick = () => { home(); document.body.classList.remove('has-interacted'); };
  let lastWave = -10;
  $('shockwave').onclick = () => {
    if (state.paused) { toast('Resume time before releasing a shockwave.'); return; }
    if (simulation.elapsed - lastWave < 1) return;
    lastWave = simulation.elapsed; simulation.shockwave(state.power); effects.shockwave(); interact(); toast('A ripple through history.');
  };
  $('settings-toggle').onclick = () => {
    const collapsed = document.querySelector('.settings').classList.toggle('collapsed');
    $('settings-toggle').textContent = collapsed ? '+' : '−';
    $('settings-toggle').setAttribute('aria-expanded', String(!collapsed));
    $('settings-toggle').setAttribute('aria-label', collapsed ? 'Expand controls' : 'Collapse controls');
  };
  if (innerWidth < 700 || innerHeight < 550) $('settings-toggle').click();
  mode('explore');
  const about = $('about');
  $('about-open').onclick = () => about.showModal(); $('about-close').onclick = () => about.close();
  about.addEventListener('click', e => { if (e.target === about && (e.offsetX < 0 || e.offsetX > about.clientWidth || e.offsetY < 0 || e.offsetY > about.clientHeight)) about.close(); });
  addEventListener('keydown', e => {
    if (e.repeat || about.open || e.target.matches('input,select,button,textarea')) return;
    if (e.code === 'Space') { e.preventDefault(); pause(); }
    if (e.code === 'KeyR') reset();
    if (e.code === 'Escape') mode('explore');
  });
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.fov = innerWidth < 700 ? 60 : 44; camera.updateProjectionMatrix(); mode(state.mode);
    renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight); ao.enabled = innerWidth > 700;
  });
  let last = performance.now(), sampleStart = last, frames = 0;
  // Reset the frame clock when the tab becomes visible: never simulate a long
  // background-tab delay as a giant physical impulse.
  document.addEventListener('visibilitychange', () => { last = performance.now(); });
  renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); state.paused = true; toast('Graphics paused. Reload the page to restore the scene.'); });
  updateStats(); state.ready = true; $('loading').classList.add('loaded'); $('loading').setAttribute('aria-hidden', 'true');
  renderer.setAnimationLoop(now => {
    const dt = Math.min((now - last) / 1000, .1); last = now;
    controls.target.y = Math.max(.6, Math.min(12, controls.target.y));
    controls.update(); camera.position.y = Math.max(terrainHeight(camera.position.x, camera.position.z) + .65, camera.position.y);
    if (!state.paused && !document.hidden && !about.open) {
      const elapsed = dt * (state.slow ? .25 : 1); simulation.step(elapsed); effects.update(elapsed);
    }
    composer.render(); frames++;
    if (now - sampleStart > 700) { $('fps').textContent = Math.round(frames * 1000 / (now - sampleStart)); frames = 0; sampleStart = now; updateStats(); }
  });
  // Read-only diagnostics are exposed only by the local development server.
  if (import.meta.env.DEV) window.stonehenge = {
    stats: () => ({ ...simulation.stats(), ...state, renderer: renderer.info.render }),
    positions: () => [...simulation.entities].map(e => ({ name: e.mesh.name, kind: e.kind, p: { ...e.body.translation() }, q: { ...e.body.rotation() } })),
  };
}
start().catch(error => {
  console.error('Unable to start Stonehenge:', error);
  $('loading').querySelector('p').textContent = 'The landscape could not load.';
  $('loading-detail').textContent = 'Check your connection and WebGL support, then try again.';
  const retry = document.createElement('button'); retry.textContent = 'Try again';
  retry.style.cssText = 'margin-top:24px;padding:12px 24px;border:1px solid #ffffff55;border-radius:6px';
  retry.onclick = () => location.reload(); $('loading').appendChild(retry);
});
