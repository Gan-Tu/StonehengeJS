import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Simulation, MAX_PROJECTILES, STEP } from '../src/physics.js';
import { monumentLayout, terrainHeight } from '../src/layout.js';

before(async () => Simulation.initialize());
const material = new THREE.MeshStandardMaterial();
function make(layout = monumentLayout()) {
  const sim = new Simulation(new THREE.Scene(), { sarsen: material, bluestone: material });
  sim.reset(layout); return sim;
}
function tick(sim, seconds, dt = 1 / 60) { for (let i = 0; i < Math.round(seconds / dt); i++) sim.step(dt); }
const isolated = [{ id: 'Target', size: [2.2, 4, 1.3], position: [0, 2, 0], angle: 0, kind: 'sarsen', seed: 42 }];

test('both layouts stay still at rest without spontaneous collapse or fractures', () => {
  for (const restored of [false, true]) {
    const sim = make(monumentLayout(restored));
    const initial = [...sim.entities].map(e => ({ e, p: { ...e.body.translation() } }));
    tick(sim, 4);
    for (const { e, p } of initial) assert.ok(e.mesh.position.distanceTo(p) < .035, e.mesh.name);
    assert.equal(sim.stats().fractures, 0); assert.equal(sim.stats().balls, 0); assert.equal(sim.stats().impacts, 0);
    assert.equal(sim.world.bodies.len(), sim.entities.size);
    sim.dispose();
  }
});

test('a fast sphere collides with a stone instead of tunnelling through it', () => {
  const sim = make(isolated); sim.fractures = false;
  const target = [...sim.entities][0];
  sim.launch(new THREE.Vector3(0, 2, 8), new THREE.Vector3(0, 0, -1), 100);
  tick(sim, .5);
  assert.ok(sim.stats().impacts > 0);
  assert.ok(Math.abs(target.body.translation().z) > .05);
  assert.equal(sim.stats().fractures, 0);
  sim.dispose();
});

test('a strong impact creates physical textured fragments', () => {
  const sim = make(isolated); tick(sim, .4);
  sim.launch(new THREE.Vector3(0, 2.5, 8), new THREE.Vector3(0, 0, -1), 100);
  tick(sim, .6);
  assert.equal(sim.stats().fractures, 1);
  assert.ok(sim.stats().fragments >= 2);
  for (const e of sim.entities) if (e.kind === 'fragment') {
    assert.ok(e.mesh.geometry.attributes.uv); assert.ok(e.mesh.geometry.attributes.color);
    assert.ok(Number.isFinite(e.body.translation().y));
  }
  sim.dispose();
});

test('fracturing conserves total mass and removes the old body', () => {
  const sim = make(isolated), parent = [...sim.entities][0], mass = parent.body.mass();
  const result = sim.fracture(parent, new THREE.Vector3(.3, 2.4, .65), new THREE.Vector3(0, 0, 1));
  assert.ok(result); assert.ok(!sim.entities.has(parent));
  const pieces = [...sim.entities];
  assert.ok(Math.abs(pieces.reduce((sum, e) => sum + e.body.mass(), 0) - mass) / mass < .0001);
  assert.equal(sim.world.bodies.len(), pieces.length); assert.equal(sim.byCollider.size, pieces.length);
  sim.dispose();
});

test('fixed stepping agrees at 30 and 120 fps and bounds long frame delays', () => {
  const a = make(isolated), b = make(isolated);
  a.fractures = b.fractures = false;
  a.shockwave(40); b.shockwave(40);
  tick(a, 2, 1 / 30); tick(b, 2, STEP);
  const pa = [...a.entities][0].body.translation(), pb = [...b.entities][0].body.translation();
  assert.ok(new THREE.Vector3().copy(pa).distanceTo(pb) < .005);
  const before = a.elapsed; a.step(1000); assert.ok(a.elapsed - before <= .101);
  a.dispose(); b.dispose();
});

test('projectiles are bounded and reset removes all previous simulation state', () => {
  const sim = make(isolated);
  for (let i = 0; i < 60; i++) sim.launch(new THREE.Vector3(0, 5, 10), new THREE.Vector3(0, 1, 0), 80);
  assert.equal(sim.stats().balls, MAX_PROJECTILES);
  sim.reset(isolated);
  assert.deepEqual(sim.stats(), { bodies: 1, sleeping: 1, balls: 0, fragments: 0, fractures: 0, shots: 0, impacts: 0 });
  assert.equal(sim.world.bodies.len(), 1); assert.equal(sim.byCollider.size, 1);
  sim.dispose();
});

test('a full-circle shockwave leaves finite, bounded debris and can be reset', () => {
  const layout = monumentLayout(true), sim = make(layout);
  tick(sim, .4); sim.shockwave(85); tick(sim, 2.5);
  assert.ok(sim.stats().fractures > 0);
  assert.ok(sim.stats().fragments <= 180);
  for (const e of sim.entities) {
    const p = e.body.translation();
    assert.ok([p.x, p.y, p.z].every(Number.isFinite));
    assert.ok(p.y > terrainHeight(p.x, p.z) - .5, 'debris must not tunnel beneath the local terrain');
  }
  assert.equal(sim.byCollider.size, sim.entities.size);
  assert.equal(sim.world.bodies.len(), sim.entities.size);
  sim.reset(layout); tick(sim, .5);
  assert.equal(sim.entities.size, layout.length); assert.equal(sim.stats().fractures, 0);
  sim.dispose();
});

test('rotated stones fracture in place, with no displaced or missing pieces', () => {
  const sim = make([{ ...isolated[0], position: [12, 2, -8], angle: Math.PI / 3 }]);
  const stone = [...sim.entities][0], rotation = new THREE.Quaternion().copy(stone.body.rotation());
  const position = new THREE.Vector3().copy(stone.body.translation());
  const hull = new THREE.Box3().setFromPoints(stone.points.map(p => p.clone().applyQuaternion(rotation).add(position)));
  const mass = stone.body.mass();
  const point = new THREE.Vector3(.3, .4, .65).applyQuaternion(rotation).add(position);
  const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(rotation);
  assert.ok(sim.fracture(stone, point, normal));
  const union = new THREE.Box3();
  for (const fragment of sim.entities) {
    fragment.mesh.updateMatrixWorld(true);
    union.union(new THREE.Box3().setFromObject(fragment.mesh));
  }
  assert.ok(union.min.distanceTo(hull.min) < .04);
  assert.ok(union.max.distanceTo(hull.max) < .04);
  assert.ok(Math.abs([...sim.entities].reduce((n, e) => n + e.body.mass(), 0) - mass) / mass < .0001);
  sim.dispose();
});

test('a perfectly central hit still defines a valid fracture plane', () => {
  const sim = make(isolated), parent = [...sim.entities][0];
  assert.ok(sim.fracture(parent, new THREE.Vector3(0, 2, .65), new THREE.Vector3(0, 0, 1)));
  assert.ok(sim.stats().fragments >= 2); sim.dispose();
});
