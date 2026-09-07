import * as THREE from 'three';

export class ImpactEffects {
  constructor(scene) {
    this.count = 420; this.cursor = 0; this.audio = null; this.sound = false; this.lastSound = 0;
    this.positions = new Float32Array(this.count * 3);
    this.sizes = new Float32Array(this.count); this.alphas = new Float32Array(this.count);
    this.particles = Array.from({ length: this.count }, () => ({ life: 0, max: 1, velocity: new THREE.Vector3() }));
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(this.alphas, 1));
    this.cloud = new THREE.Points(geometry, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      vertexShader: `attribute float size; attribute float alpha; varying float opacity;
        void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv;
        gl_PointSize=clamp(size*500./max(1.,-mv.z),1.,90.); opacity=alpha; }`,
      fragmentShader: `varying float opacity; void main(){ float d=length(gl_PointCoord-.5)*2.;
        float a=exp(-d*d*4.)*smoothstep(1.,.6,d)*opacity; gl_FragColor=vec4(.62,.59,.50,a); }`,
    }));
    this.cloud.frustumCulled = false; scene.add(this.cloud);
    this.ring = new THREE.Mesh(new THREE.RingGeometry(.96, 1, 96), new THREE.MeshBasicMaterial({ color: '#e6d4a4', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    this.ring.rotation.x = -Math.PI / 2; this.ring.position.y = .08; this.ring.visible = false; scene.add(this.ring);
    this.ringTime = 0;
  }
  burst(point, impulse) {
    const amount = Math.min(35, Math.floor(impulse / 1200) + 5);
    for (let i = 0; i < amount; i++) {
      const idx = this.cursor++ % this.count, particle = this.particles[idx];
      particle.life = particle.max = .7 + Math.random() * 1.2;
      particle.velocity.set((Math.random() - .5) * 3, .8 + Math.random() * 2, (Math.random() - .5) * 3);
      this.positions[idx * 3] = point.x + (Math.random() - .5) * .5;
      this.positions[idx * 3 + 1] = Math.max(.06, point.y + (Math.random() - .5) * .5);
      this.positions[idx * 3 + 2] = point.z + (Math.random() - .5) * .5;
      this.sizes[idx] = .4 + Math.random() * .7;
    }
    this.playSound(impulse);
  }
  async enableSound(enabled) {
    this.sound = enabled;
    if (enabled) {
      this.audio ||= new (window.AudioContext || window.webkitAudioContext)();
      if (this.audio.state === 'suspended') await this.audio.resume();
    }
  }
  playSound(impulse) {
    if (!this.sound || !this.audio || this.audio.state !== 'running') return;
    const ctx = this.audio, t = ctx.currentTime;
    if (t - this.lastSound < .07) return;
    this.lastSound = t;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * .3, ctx.sampleRate), channel = buffer.getChannelData(0);
    for (let i = 0; i < channel.length; i++) channel[i] = (Math.random() * 2 - 1) * Math.exp(-i / channel.length * 7);
    const noise = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    noise.buffer = buffer; filter.type = 'lowpass'; filter.frequency.value = 420;
    gain.gain.setValueAtTime(Math.min(.45, impulse / 100000), t); gain.gain.exponentialRampToValueAtTime(.001, t + .28);
    noise.connect(filter).connect(gain).connect(ctx.destination); noise.start(t); noise.stop(t + .3);
    noise.onended = () => { noise.disconnect(); filter.disconnect(); gain.disconnect(); };
  }
  shockwave() { this.ringTime = .9; this.ring.visible = true; }
  update(dt) {
    for (let i = 0; i < this.count; i++) {
      const p = this.particles[i];
      if (p.life <= 0) { this.alphas[i] = 0; continue; }
      p.life -= dt; p.velocity.y -= dt * .8;
      this.positions[i * 3] += p.velocity.x * dt;
      this.positions[i * 3 + 1] = Math.max(.04, this.positions[i * 3 + 1] + p.velocity.y * dt);
      this.positions[i * 3 + 2] += p.velocity.z * dt;
      this.alphas[i] = Math.max(0, p.life / p.max) * .34;
      this.sizes[i] += dt * .5;
    }
    for (const a of Object.values(this.cloud.geometry.attributes)) a.needsUpdate = true;
    if (this.ringTime > 0) {
      this.ringTime -= dt; this.ring.scale.setScalar(1 + (1 - this.ringTime / .9) * 26);
      this.ring.material.opacity = Math.max(0, this.ringTime / .9) * .3;
      if (this.ringTime <= 0) this.ring.visible = false;
    }
  }
  clear() { this.particles.forEach(p => p.life = 0); this.ringTime = 0; this.ring.visible = false; this.update(0); }
}
