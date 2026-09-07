// Metres. Proportions follow English Heritage's small-scale Stonehenge guide.
// This is an interpretive layout, not a survey of each surviving stone.
export function random(seed = 1) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function monumentLayout(restored = false) {
  const stones = [];
  const rng = random(184);
  const add = (id, size, position, angle = 0, kind = 'sarsen', fallen = false) =>
    stones.push({ id, size, position, angle, kind, fallen, seed: stones.length + 42 });
  const standing = new Set([0, 1, 2, 3, 4, 5, 6, 7, 10, 14, 15, 16, 20, 25, 26, 27, 28]);
  const lintels = new Set([0, 1, 2, 4, 5, 26]);
  const fallen = new Set([8, 11, 17, 21, 23]);
  for (let i = 0; i < 30; i++) {
    const a = i * Math.PI * 2 / 30;
    const x = Math.sin(a) * 14.8, z = Math.cos(a) * 14.8;
    if (restored || standing.has(i)) {
      add(`Sarsen ${i + 1}`, [2.12 + rng() * .16, 4.05, 1.22 + rng() * .13], [x, 2.025, z], a);
    } else if (fallen.has(i)) {
      add(`Fallen sarsen ${i + 1}`, [2.15, 1.2, 4.1], [x + .5, .6, z], a + .4, 'sarsen', true);
    }
    if (restored || lintels.has(i)) {
      const b = a + Math.PI / 30;
      const r = 14.8 * Math.cos(Math.PI / 30);
      add(`Circle lintel ${i + 1}`, [3.13, .82, 1.32], [Math.sin(b) * r, 4.46, Math.cos(b) * r], b);
    }
  }
  // Five trilithons, their height increasing toward the back of the horseshoe.
  const trilithons = [
    [-6.1, 2.9, -.32, 5.2], [6.1, 2.9, .32, 5.2],
    [-4.6, -3.5, -.75, 6], [4.6, -3.5, .75, 6], [0, -7, 0, 6.5],
  ];
  trilithons.forEach(([x, z, a, h], i) => {
    for (let side = -1; side <= 1; side += 2) {
      const dx = Math.cos(a) * side * 1.24, dz = -Math.sin(a) * side * 1.24;
      if (!restored && ((i === 4 && side === -1) || i === 2)) {
        add(`Fallen trilithon ${i}-${side}`, [2, 1.3, h], [x + dx, .65, z + dz - 1.2], a + side * .28, 'sarsen', true);
      } else {
        add(`Trilithon ${i}-${side}`, [2.05, h, 1.45], [x + dx, h / 2, z + dz], a);
      }
    }
    if (restored || (i !== 2 && i !== 4)) {
      add(`Trilithon lintel ${i}`, [4.55, .85, 1.65], [x, h + .425, z], a);
    } else {
      add(`Fallen lintel ${i}`, [4.55, .85, 1.65], [x + 1, .425, z - 3.8], a + .3, 'sarsen', true);
    }
  });
  for (let i = 0; i < 38; i++) {
    if (!restored && [1, 4, 8, 11, 14, 18, 21, 24, 28, 29, 33, 35].includes(i)) continue;
    const a = i * Math.PI * 2 / 38;
    const h = 1.25 + rng() * .6;
    add(`Bluestone ${i}`, [.65 + rng() * .25, h, .65], [Math.sin(a) * 10.6, h / 2, Math.cos(a) * 10.6], a, 'bluestone');
  }
  for (let i = 0; i < 11; i++) {
    const a = .65 + i / 10 * (Math.PI * 2 - 1.3);
    if (!restored && [2, 7].includes(i)) continue;
    const h = 1.7 + rng() * .45;
    add(`Inner bluestone ${i}`, [.65, h, .55], [Math.sin(a) * 3.7, h / 2, Math.cos(a) * 4.5], a, 'bluestone');
  }
  add('Altar stone', [4.9, .35, 1.05], [0, .175, -2], .15, 'sarsen', true);
  add('Heel stone', [2.3, 4.8, 1.8], [25, 2.4, 39], -.2);
  return stones;
}

export function terrainHeight(x, z) {
  const r = Math.hypot(x, z);
  const blend = Math.min(1, Math.max(0, (r - 35) / 65));
  const hills = (Math.sin(x * .013 + 1) * Math.cos(z * .016) * 7.2 + Math.sin(z * .028 + x * .008) * 3.7) * blend;
  const bank = Math.exp(-(((r - 54) / 2.4) ** 2)) * .65;
  const ditch = Math.exp(-(((r - 49) / 1.7) ** 2)) * .38;
  // The avenue breaks the circular earthwork in the northeast.
  const avenue = x > 15 && z > 25 && Math.abs(x - z * .64) < 5 ? 0 : 1;
  const heelClearing = Math.min(1, Math.max(0, (Math.hypot(x - 25, z - 39) - 3) / 5));
  return (hills + (bank - ditch) * avenue) * heelClearing;
}
