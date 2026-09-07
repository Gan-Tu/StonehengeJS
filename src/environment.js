import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { random, terrainHeight } from './layout.js';

export async function createEnvironment(scene, renderer, onProgress) {
  const manager = new THREE.LoadingManager();
  manager.onProgress = (_, loaded, total) => onProgress(`Loading surface scans · ${loaded}/${total}`);
  const loader = new THREE.TextureLoader(manager);
  const base = `${import.meta.env.BASE_URL}textures/`;
  const load = async (file, color = false, repeat = 1) => {
    const t = await loader.loadAsync(base + file);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, repeat);
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    if (color) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const [rock, normal, rough, grass, grassNormal, sky] = await Promise.all([
    load('rock-color.jpg', true), load('rock-normal.jpg'), load('rock-roughness.jpg'),
    load('grass-color.jpg', true, 190), load('grass-normal.jpg', false, 190),
    new HDRLoader(manager).loadAsync(base + 'sky.hdr'),
  ]);
  sky.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = sky;
  scene.environment = sky;
  scene.backgroundRotation.y = 1.7;
  scene.environmentRotation.y = 1.7;
  scene.fog = new THREE.FogExp2('#b5c3c5', .0018);
  const stone = new THREE.MeshStandardMaterial({ map: rock, normalMap: normal, roughnessMap: rough, normalScale: new THREE.Vector2(.8, .8), roughness: .96, color: '#f0eee2', vertexColors: true });
  // Normalize the dark scan toward the pale, weathered sarsen appearance.
  stone.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      float stoneLuma = dot(diffuseColor.rgb, vec3(.2126, .7152, .0722));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(stoneLuma), .75) * 1.45 + vec3(.14, .145, .13);`);
  };
  const blue = stone.clone(); blue.color.set('#8c9897'); blue.onBeforeCompile = stone.onBeforeCompile;
  const ground = new THREE.MeshStandardMaterial({ map: grass, normalMap: grassNormal, normalScale: new THREE.Vector2(.45, .45), roughness: 1, color: '#829764', vertexColors: true });
  const terrain = new THREE.PlaneGeometry(850, 850, 210, 210);
  terrain.rotateX(-Math.PI / 2);
  const p = terrain.attributes.position, colors = [], tint = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z);
    p.setY(i, terrainHeight(x, z) - .025);
    const variation = .88 + .1 * Math.sin(x * .063) * Math.sin(z * .085) + .04 * Math.sin(x * .3 + z * .4);
    tint.setRGB(variation, variation, variation * .97);
    const worn = Math.exp(-(((r - 13) / 5) ** 2)) * .25;
    tint.lerp(new THREE.Color('#b5a77d'), worn);
    colors.push(tint.r, tint.g, tint.b);
  }
  terrain.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  terrain.computeVertexNormals();
  const field = new THREE.Mesh(terrain, ground); field.receiveShadow = true; scene.add(field);
  const sun = new THREE.DirectionalLight('#fff0d5', 3.2);
  sun.position.set(-32, 28, 12); sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -42, right: 42, top: 42, bottom: -42, near: 1, far: 150 });
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -.00015; sun.shadow.normalBias = .035;
  sun.shadow.radius = 3;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#d4e4f1', '#616047', .7); scene.add(hemi);

  // Instanced tufts give the scanned ground a real silhouette at eye level.
  const rng = random(61), count = window.innerWidth < 700 ? 22000 : 80000;
  const blade = new THREE.BufferGeometry();
  blade.setAttribute('position', new THREE.Float32BufferAttribute([-.008, 0, 0, .008, 0, 0, .012, .16, .018, 0, 0, -.008, 0, 0, .008, .012, .14, .012], 3));
  blade.computeVertexNormals();
  const bladeMat = new THREE.MeshStandardMaterial({ color: '#e3e5ba', roughness: 1, side: THREE.DoubleSide });
  const tufts = new THREE.InstancedMesh(blade, bladeMat, count), dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * 90;
    const x = Math.sin(a) * r, z = Math.cos(a) * r;
    dummy.position.set(x, terrainHeight(x, z) - .02, z);
    dummy.rotation.y = rng() * Math.PI;
    const s = .5 + rng(); dummy.scale.setScalar(s * (r < 20 ? .55 : 1));
    dummy.updateMatrix(); tufts.setMatrixAt(i, dummy.matrix);
    tint.setHSL(.19 + rng() * .05, .22 + rng() * .15, .33 + rng() * .12);
    tufts.setColorAt(i, tint);
  }
  tufts.receiveShadow = true; scene.add(tufts);

  function atmosphere(name) {
    if (name === 'golden') {
      sun.position.set(-45, 14, 28); sun.color.set('#ffd6a1'); sun.intensity = 3.7;
      scene.environmentIntensity = .6; scene.backgroundIntensity = .65;
      hemi.intensity = .5; scene.fog.color.set('#c6baa5'); renderer.toneMappingExposure = .95;
    } else if (name === 'overcast') {
      sun.position.set(-32, 55, 25); sun.color.set('#e7efff'); sun.intensity = .65;
      scene.environmentIntensity = 1; scene.backgroundIntensity = .8;
      hemi.intensity = 1.1; scene.fog.color.set('#b5c3c5'); renderer.toneMappingExposure = .95;
    } else {
      sun.position.set(-32, 28, 12); sun.color.set('#fff0d5'); sun.intensity = 3.2;
      scene.environmentIntensity = .8; scene.backgroundIntensity = .85;
      hemi.intensity = .7; scene.fog.color.set('#b5c3c5'); renderer.toneMappingExposure = .92;
    }
  }
  atmosphere('afternoon');
  return { materials: { sarsen: stone, bluestone: blue }, atmosphere };
}
