import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
import { ConvexObjectBreaker } from 'three/addons/misc/ConvexObjectBreaker.js';
import { stoneGeometry, deformStonePoint } from './stone.js';
import { terrainHeight } from './layout.js';

export const STEP = 1 / 120;
export const MAX_PROJECTILES = 24;
export const MAX_FRAGMENTS = 180;

function hullPoints([w, h, d], seed) {
  const points = [], bevel = Math.min(w, h, d) * .09;
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
    points.push(new THREE.Vector3(x * (w / 2 - bevel), y * h / 2, z * (d / 2 - bevel)));
    points.push(new THREE.Vector3(x * w / 2, y * (h / 2 - bevel), z * (d / 2 - bevel)));
    points.push(new THREE.Vector3(x * (w / 2 - bevel), y * (h / 2 - bevel), z * d / 2));
  }
  for (const y of [-h * .25, 0, h * .25]) {
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      points.push(new THREE.Vector3(x * w / 2, y, z * (d / 2 - bevel)));
      points.push(new THREE.Vector3(x * (w / 2 - bevel), y, z * d / 2));
    }
  }
  return points.map(p => new THREE.Vector3(...deformStonePoint(p.x, p.y, p.z, [w, h, d], seed)));
}
function volume(geometry) {
  const p = geometry.attributes.position, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  let v = 0;
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    v += a.dot(b.cross(c)) / 6;
  }
  return Math.abs(v);
}
function textureFragment(geometry) {
  const p = geometry.attributes.position, n = geometry.attributes.normal, uv = [], colors = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (Math.abs(n.getY(i)) > .6) uv.push(x / 2.4, z / 2.4);
    else if (Math.abs(n.getX(i)) > .6) uv.push(z / 2.4, y / 2.4);
    else uv.push(x / 2.4, y / 2.4);
    colors.push(.91, .9, .86);
  }
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
}

export class Simulation {
  static async initialize() { await RAPIER.init(); }
  constructor(scene, materials, onImpact = () => {}) {
    this.scene = scene; this.materials = materials; this.onImpact = onImpact;
    this.entities = new Set(); this.byCollider = new Map(); this.elapsed = 0; this.accumulator = 0;
    this.fractures = true; this.brokenCount = 0; this.shots = 0; this.impactCount = 0;
    this.breaker = new ConvexObjectBreaker(.35, .0001);
    this.ballMaterial = new THREE.MeshStandardMaterial({ color: '#3b4140', metalness: .7, roughness: .28 });
    this.createWorld();
  }
  createWorld() {
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.world.timestep = STEP; this.world.numSolverIterations = 8;
    this.world.integrationParameters.maxCcdSubsteps = 4;
    this.events = new RAPIER.EventQueue(true);
    // The same height function as the visual terrain, sampled at one metre near
    // the monument. A finite plane is never used as a floating platform.
    const segments = 180, span = 220, vertices = [], indices = [];
    for (let z = 0; z <= segments; z++) for (let x = 0; x <= segments; x++) {
      const px = (x / segments - .5) * span, pz = (z / segments - .5) * span;
      vertices.push(px, terrainHeight(px, pz) - .025, pz);
    }
    for (let z = 0; z < segments; z++) for (let x = 0; x < segments; x++) {
      const i = z * (segments + 1) + x;
      indices.push(i, i + segments + 1, i + 1, i + 1, i + segments + 1, i + segments + 2);
    }
    this.world.createCollider(RAPIER.ColliderDesc.trimesh(new Float32Array(vertices), new Uint32Array(indices)).setFriction(.85).setRestitution(.05));
  }
  add(mesh, desc, colliderDesc, metadata = {}) {
    const body = this.world.createRigidBody(desc);
    const collider = this.world.createCollider(colliderDesc.setFriction(.78).setRestitution(.06)
      .setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS).setContactForceEventThreshold(60000), body);
    mesh.position.copy(body.translation()); mesh.quaternion.copy(body.rotation());
    mesh.castShadow = mesh.receiveShadow = true;
    this.scene.add(mesh);
    const entity = { mesh, body, collider, born: this.elapsed, lastImpact: -10, ...metadata };
    this.entities.add(entity); this.byCollider.set(collider.handle, entity);
    return entity;
  }
  addStone(def) {
    const mesh = new THREE.Mesh(stoneGeometry(def.size, def.seed), this.materials[def.kind]);
    mesh.name = def.id;
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), def.angle);
    const points = hullPoints(def.size, def.seed);
    const hull = RAPIER.ColliderDesc.convexHull(new Float32Array(points.flatMap(p => p.toArray())));
    const mass = def.size.reduce((a, b) => a * b, 1) * (def.kind === 'bluestone' ? 2700 : 2400);
    const desc = RAPIER.RigidBodyDesc.dynamic().setTranslation(...def.position).setRotation(q)
      .setLinearDamping(.08).setAngularDamping(.15).setCanSleep(true).setSleeping(true).setCcdEnabled(true);
    return this.add(mesh, desc, hull.setMass(mass), { kind: 'stone', size: def.size, points, mass, breakable: true });
  }
  remove(entity) {
    if (!this.entities.delete(entity)) return;
    this.byCollider.delete(entity.collider.handle);
    this.world.removeRigidBody(entity.body);
    this.scene.remove(entity.mesh); entity.mesh.geometry.dispose();
  }
  reset(layout) {
    for (const e of [...this.entities]) this.remove(e);
    this.events.free(); this.world.free(); this.createWorld();
    this.elapsed = this.accumulator = this.brokenCount = this.shots = this.impactCount = 0;
    layout.forEach(def => this.addStone(def));
  }
  launch(origin, direction, power = 55) {
    const balls = [...this.entities].filter(e => e.kind === 'ball');
    if (balls.length >= MAX_PROJECTILES) this.remove(balls[0]);
    const radius = .38, speed = 28 + power * .64, p = origin.clone().addScaledVector(direction, 1.1);
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 16), this.ballMaterial);
    const desc = RAPIER.RigidBodyDesc.dynamic().setTranslation(p.x, p.y, p.z)
      .setLinvel(direction.x * speed, direction.y * speed, direction.z * speed)
      .setCcdEnabled(true).setLinearDamping(.015).setAngularDamping(.1);
    const ball = this.add(mesh, desc, RAPIER.ColliderDesc.ball(radius).setMass(550 + power * 10), { kind: 'ball' });
    this.shots++; return ball;
  }
  shockwave(power = 55) {
    for (const e of this.entities) {
      if (e.kind === 'ball') continue;
      const p = e.body.translation(), r = Math.hypot(p.x, p.z);
      if (r > 25) continue;
      const strength = (2.6 + power * .065) * Math.max(.15, 1 - r / 34);
      const mass = e.body.mass();
      e.body.applyImpulse({ x: p.x / Math.max(r, 1) * mass * strength, y: mass * strength * .62, z: p.z / Math.max(r, 1) * mass * strength }, true);
      e.body.applyTorqueImpulse({ x: p.z / Math.max(r, 1) * mass * strength * .3, y: 0, z: -p.x / Math.max(r, 1) * mass * strength * .3 }, true);
    }
    this.onImpact(new THREE.Vector3(0, 1, 0), 55000);
  }
  fracture(entity, point, normal) {
    if (!this.entities.has(entity) || !entity.breakable) return false;
    // Fracture a small convex proxy, not the densely tessellated render mesh.
    // The breaker's internal plane/centroid transforms assume unrotated
    // geometry. Bake the body's rotation into the proxy before cutting, or
    // rotated sarsens can fail to split or spawn displaced, overlapping debris.
    const proxyGeometry = new ConvexGeometry(entity.points);
    proxyGeometry.applyQuaternion(new THREE.Quaternion().copy(entity.body.rotation()));
    const proxy = new THREE.Mesh(proxyGeometry, entity.mesh.material);
    proxy.position.copy(entity.body.translation()); proxy.updateMatrixWorld(true);
    const velocity = new THREE.Vector3().copy(entity.body.linvel()), angular = new THREE.Vector3().copy(entity.body.angvel());
    this.breaker.prepareBreakableObject(proxy, entity.mass, velocity, angular, true);
    const fracturePoint = point.clone();
    // A perfectly central hit makes the radial cutting plane degenerate.
    // Offset its seed slightly along the surface to define a valid plane.
    if (fracturePoint.clone().sub(proxy.position).cross(normal).lengthSq() < 1e-8) {
      const tangent = new THREE.Vector3(Math.abs(normal.y) < .9 ? 0 : 1, Math.abs(normal.y) < .9 ? 1 : 0, 0).cross(normal).normalize();
      fracturePoint.addScaledVector(tangent, .03);
    }
    const pieces = this.breaker.subdivideByImpact(proxy, fracturePoint, normal, 1, 1);
    if (pieces.length < 2 || pieces.includes(proxy)) { proxy.geometry.dispose(); return false; }
    const volumes = pieces.map(p => volume(p.geometry));
    const totalVolume = volumes.reduce((a, b) => a + b, 0);
    if (totalVolume < .001 || volumes.some(v => !Number.isFinite(v) || v < .00001)) {
      pieces.forEach(p => p.geometry.dispose()); proxy.geometry.dispose(); return false;
    }
    const parentPosition = proxy.position.clone();
    this.remove(entity);
    pieces.forEach((piece, i) => {
      // Tiny separation avoids contact impulses from numerically touching cuts.
      piece.geometry.scale(.995, .995, .995); textureFragment(piece.geometry);
      const mass = entity.mass * volumes[i] / totalVolume;
      const localVelocity = angular.clone().cross(piece.position.clone().sub(parentPosition)).add(velocity);
      const desc = RAPIER.RigidBodyDesc.dynamic().setTranslation(...piece.position.toArray()).setRotation(piece.quaternion)
        .setLinvel(...localVelocity.toArray()).setAngvel(angular).setCcdEnabled(true).setLinearDamping(.1).setAngularDamping(.22);
      const hull = RAPIER.ColliderDesc.convexHull(piece.geometry.attributes.position.array);
      this.add(piece, desc, hull.setMass(mass), { kind: 'fragment', mass, breakable: false });
    });
    proxy.geometry.dispose(); this.brokenCount++;
    const fragments = [...this.entities].filter(e => e.kind === 'fragment');
    while (fragments.length > MAX_FRAGMENTS) this.remove(fragments.shift());
    return true;
  }
  step(dt) {
    this.accumulator += Math.min(Math.max(dt, 0), .1);
    let steps = 0;
    while (this.accumulator >= STEP && steps++ < 12) {
      for (const e of this.entities) {
        const v = e.body.linvel(); e.speedBeforeStep = Math.hypot(v.x, v.y, v.z);
      }
      this.world.step(this.events); this.elapsed += STEP; this.accumulator -= STEP;
      const breaks = new Map();
      this.events.drainContactForceEvents(event => {
        const impulse = event.totalForceMagnitude() * STEP;
        const e1 = this.byCollider.get(event.collider1()), e2 = this.byCollider.get(event.collider2());
        const entity = e1 || e2;
        if (!entity || impulse < 900 || Math.max(e1?.speedBeforeStep || 0, e2?.speedBeforeStep || 0) < 1.5) return;
        const c1 = this.world.getCollider(event.collider1()), c2 = this.world.getCollider(event.collider2());
        const point = new THREE.Vector3().copy(entity.body.translation()), normal = new THREE.Vector3(0, 1, 0);
        this.world.contactPair(c1, c2, manifold => {
          if (manifold.numSolverContacts()) {
            point.copy(manifold.solverContactPoint(0)); normal.copy(manifold.normal());
          }
        });
        if (this.elapsed - entity.lastImpact > .16) {
          this.onImpact(point, impulse); entity.lastImpact = this.elapsed; this.impactCount++;
        }
        for (const e of [e1, e2]) {
          if (e && this.fractures && e.breakable && this.elapsed - e.born > .25 && impulse > Math.max(10000, e.mass * 2.4)) {
            if (!breaks.has(e)) breaks.set(e, { point: point.clone(), normal: normal.clone() });
          }
        }
      });
      // Never mutate the world while Rapier owns a contact-event callback.
      for (const [e, hit] of breaks) this.fracture(e, hit.point, hit.normal);
      for (const e of this.entities) {
        const p = e.body.translation();
        if (p.y < -20 || Math.hypot(p.x, p.z) > 105 || (e.kind === 'ball' && this.elapsed - e.born > 25)) this.remove(e);
      }
    }
    for (const e of this.entities) { e.mesh.position.copy(e.body.translation()); e.mesh.quaternion.copy(e.body.rotation()); }
  }
  stats() {
    let sleeping = 0, balls = 0, fragments = 0;
    for (const e of this.entities) { sleeping += Number(e.body.isSleeping()); balls += Number(e.kind === 'ball'); fragments += Number(e.kind === 'fragment'); }
    return { bodies: this.entities.size, sleeping, balls, fragments, fractures: this.brokenCount, shots: this.shots, impacts: this.impactCount };
  }
  dispose() {
    for (const e of [...this.entities]) this.remove(e);
    this.ballMaterial.dispose(); this.events.free(); this.world.free();
  }
}
