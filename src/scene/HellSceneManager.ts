// @ts-nocheck
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  createEmberParticleTexture,
  createLavaTexture,
  createObsidianRockTexture,
  createPortalVortexTexture,
  createRuneSigilRingTexture,
  createCoronaFlareTexture,
} from './hellTextures';

export interface HellSceneCallbacks {
  onDiveProgress?: (progress: number) => void;
  onDiveComplete?: () => void;
}

export class HellSceneManager {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isDestroyed: boolean = false;
  private animFrameId: number | null = null;
  private clock: THREE.Clock;

  // Scene objects to animate
  private portalVortexDisk: THREE.Mesh | null = null;
  private portalSigilRing: THREE.Mesh | null = null;
  private portalCoronaFlare: THREE.Mesh | null = null;
  private floatingShards: THREE.Mesh[] = [];
  private emberParticles: THREE.Points | null = null;
  private emberPositions: Float32Array | null = null;
  private emberCount: number = 260;
  private emberVelocities: Float32Array | null = null;

  // Swirling vortex suction particles (drawn into the portal)
  private suctionParticles: THREE.Points | null = null;
  private suctionPositions: Float32Array | null = null;
  private suctionAngles: Float32Array | null = null;
  private suctionRadii: Float32Array | null = null;
  private suctionCount: number = 160;

  // Lights
  private portalLight: THREE.PointLight | null = null;
  private brazierLightLeft: THREE.PointLight | null = null;
  private brazierLightRight: THREE.PointLight | null = null;
  private lavaTexture: THREE.CanvasTexture | null = null;
  private chainsGroup: THREE.Group | null = null;

  // Camera & Dive kinematics
  private defaultCameraPos = new THREE.Vector3(0, 2.3, 8.2);
  private defaultTarget = new THREE.Vector3(0, 2.3, 0);
  private currentCameraPos = new THREE.Vector3(0, 2.3, 8.2);
  private currentTarget = new THREE.Vector3(0, 2.3, 0);

  // Parallax offsets from touch/pointer
  public pointerX = 0;
  public pointerY = 0;
  private targetPointerX = 0;
  private targetPointerY = 0;

  // Dive animation state
  private isDiving: boolean = false;
  private diveProgress: number = 0; // 0 to 1
  private diveDuration: number = 0.7; // Snappy dive straight through portal
  private callbacks: HellSceneCallbacks = {};

  constructor(container: HTMLElement, callbacks?: HellSceneCallbacks) {
    this.container = container;
    this.callbacks = callbacks || {};
    this.clock = new THREE.Clock();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const isHeadless =
      typeof navigator !== 'undefined' &&
      (navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent));

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.38;
    this.renderer.shadowMap.enabled = !isHeadless;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x110202);
    this.scene.fog = new THREE.FogExp2(0x130302, 0.042);

    this.camera = new THREE.PerspectiveCamera(62, width / height, 0.1, 100);
    this.camera.position.copy(this.defaultCameraPos);
    this.camera.lookAt(this.defaultTarget);

    // Studio PBR Environment
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.setupLighting();
    this.buildTerrain();
    this.buildHellGate();
    this.buildBraziers();
    this.buildEmbers();
    this.buildSuctionParticles();

    this.renderer.compile(this.scene, this.camera);

    window.addEventListener('resize', this.onWindowResize);
    this.setupInteraction();
    this.startLoop();
  }

  private setupLighting() {
    // Warm key directional light (fiery hell skylight)
    const keyLight = new THREE.DirectionalLight(0xff5518, 2.6);
    keyLight.position.set(4, 9, 7);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 25;
    keyLight.shadow.camera.left = -6;
    keyLight.shadow.camera.right = 6;
    keyLight.shadow.camera.top = 8;
    keyLight.shadow.camera.bottom = -2;
    this.scene.add(keyLight);

    // Deep crimson under-glow fill
    const hemiLight = new THREE.HemisphereLight(0x5a1205, 0x180200, 1.2);
    this.scene.add(hemiLight);

    // Central pulsing portal core light
    this.portalLight = new THREE.PointLight(0xff6a00, 4.2, 18, 1.8);
    this.portalLight.position.set(0, 2.7, 0.4);
    this.scene.add(this.portalLight);
  }

  private buildTerrain() {
    this.lavaTexture = createLavaTexture();

    // Churning magma river under-layer
    const lavaGeo = new THREE.PlaneGeometry(36, 36);
    const lavaMat = new THREE.MeshBasicMaterial({
      map: this.lavaTexture,
    });
    const lavaPlane = new THREE.Mesh(lavaGeo, lavaMat);
    lavaPlane.rotation.x = -Math.PI / 2;
    lavaPlane.position.y = -0.45;
    this.scene.add(lavaPlane);

    // Jagged obsidian basalt floor pavers leading to the portal
    const { map: rockMap, bump: rockBump } = createObsidianRockTexture();
    rockMap.repeat.set(4, 4);
    rockBump.repeat.set(4, 4);

    const plateMat = new THREE.MeshStandardMaterial({
      color: 0x1b1317,
      map: rockMap,
      bumpMap: rockBump,
      bumpScale: 0.18,
      roughness: 0.8,
      metalness: 0.25,
    });

    const terrainGroup = new THREE.Group();

    // Walkway slabs with magma gaps
    const plateCoords = [
      { x: -1.4, z: 2.0, w: 2.2, h: 2.6, yR: 0.04 },
      { x: 1.3, z: 2.2, w: 2.1, h: 2.5, yR: -0.05 },
      { x: -0.1, z: 4.2, w: 2.8, h: 2.2, yR: 0.02 },
      { x: -1.5, z: 5.8, w: 2.1, h: 2.4, yR: -0.04 },
      { x: 1.4, z: 5.6, w: 2.2, h: 2.5, yR: 0.03 },
      { x: 0.0, z: 7.2, w: 2.8, h: 2.2, yR: 0.0 },
      // Flanking rugged basalt outcrops
      { x: -4.0, z: 3.5, w: 3.8, h: 6.2, yR: 0.12 },
      { x: 4.0, z: 3.5, w: 3.8, h: 6.2, yR: -0.1 },
      { x: -4.2, z: -0.8, w: 4.2, h: 5.2, yR: 0.05 },
      { x: 4.2, z: -0.8, w: 4.2, h: 5.2, yR: -0.08 },
      // Portal ceremonial threshold steps
      { x: 0, z: 0.8, w: 3.8, h: 1.6, yR: 0.0 },
      { x: 0, z: -0.4, w: 4.2, h: 1.4, yR: 0.0 },
    ];

    plateCoords.forEach((p, idx) => {
      const geo = new THREE.BoxGeometry(p.w, 0.45 + (idx % 3) * 0.05, p.h);
      const mesh = new THREE.Mesh(geo, plateMat);
      mesh.position.set(p.x, 0, p.z);
      mesh.rotation.y = p.yR;
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      terrainGroup.add(mesh);
    });

    this.scene.add(terrainGroup);

    // Distant jagged volcanic mountain silhouettes
    const mountainMat = new THREE.MeshStandardMaterial({
      color: 0x080202,
      roughness: 0.95,
      metalness: 0.1,
    });
    for (let i = 0; i < 11; i++) {
      const angle = (i / 11) * Math.PI + Math.PI * 0.95;
      const dist = 24 + (i % 3) * 3;
      const coneHeight = 15 + (i % 4) * 4;
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(3.6 + (i % 2) * 1.5, coneHeight, 5),
        mountainMat
      );
      cone.position.set(Math.cos(angle) * dist, coneHeight * 0.4 - 2, Math.sin(angle) * dist);
      cone.rotation.y = i * 0.75;
      this.scene.add(cone);
    }
  }

  /**
   * Breathtaking Hell Gateway:
   * Carved tiered obsidian pillars, menacing upward-curving horns, gothic pointed arches,
   * floating shattered crystal shards, multi-layered swirling dimensional accretion vortex,
   * rotating occult sigil ring, and fiery corona flare!
   */
  private buildHellGate() {
    const gateGroup = new THREE.Group();
    gateGroup.position.set(0, 0, 0);

    const { map: basaltMap, bump: basaltBump } = createObsidianRockTexture();
    const basaltMat = new THREE.MeshStandardMaterial({
      color: 0x1e1518,
      map: basaltMap,
      bumpMap: basaltBump,
      bumpScale: 0.22,
      roughness: 0.75,
      metalness: 0.35,
    });

    const ironMat = new THREE.MeshStandardMaterial({
      color: 0x140c0e,
      roughness: 0.4,
      metalness: 0.9,
    });

    const runeMat = new THREE.MeshStandardMaterial({
      color: 0xff3300,
      emissive: 0xff2200,
      emissiveIntensity: 2.2,
      roughness: 0.25,
    });

    // Circular stone base ring on the floor holding the portal
    const baseRingGeo = new THREE.CylinderGeometry(2.4, 2.6, 0.5, 32);
    const baseRing = new THREE.Mesh(baseRingGeo, basaltMat);
    baseRing.position.set(0, 0.25, 0);
    baseRing.castShadow = true;
    baseRing.receiveShadow = true;
    gateGroup.add(baseRing);

    // Glowing rune ring around the base
    const baseRuneMat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
    const baseRuneRing = new THREE.Mesh(
      new THREE.CylinderGeometry(2.42, 2.42, 0.1, 32),
      baseRuneMat
    );
    baseRuneRing.position.set(0, 0.35, 0);
    gateGroup.add(baseRuneRing);

    // 4. FLOATING SHATTERED OBSIDIAN MONOLITH SHARDS (Levitating around portal)
    this.floatingShards = [];
    const shardPositions = [
      { x: -2.4, y: 2.2, z: 0.4, s: 0.45 },
      { x: -1.9, y: 4.2, z: 0.3, s: 0.35 },
      { x: 2.4, y: 2.2, z: 0.4, s: 0.45 },
      { x: 1.9, y: 4.2, z: 0.3, s: 0.35 },
    ];

    shardPositions.forEach((sp) => {
      const shardGeo = new THREE.OctahedronGeometry(sp.s, 0);
      shardGeo.scale(0.7, 1.4, 0.6);
      const shard = new THREE.Mesh(shardGeo, basaltMat);
      shard.position.set(sp.x, sp.y, sp.z);
      gateGroup.add(shard);
      this.floatingShards.push(shard);
    });

    // 5. MULTI-LAYERED DIMENSIONAL PORTAL VORTEX

    // Layer A: Outer Corona Flare (Breathing fiery halo)
    const flareTex = createCoronaFlareTexture();
    const flareMat = new THREE.MeshBasicMaterial({
      map: flareTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.75,
      side: THREE.DoubleSide,
    });
    this.portalCoronaFlare = new THREE.Mesh(
      new THREE.PlaneGeometry(6.8, 6.8),
      flareMat
    );
    this.portalCoronaFlare.position.set(0, 2.7, -0.04);
    gateGroup.add(this.portalCoronaFlare);

    // Layer B: Middle Occult Sigil Ring (Clockwise rotating alchemy ring)
    const sigilTex = createRuneSigilRingTexture();
    const sigilMat = new THREE.MeshBasicMaterial({
      map: sigilTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    this.portalSigilRing = new THREE.Mesh(
      new THREE.PlaneGeometry(5.2, 5.2),
      sigilMat
    );
    this.portalSigilRing.position.set(0, 2.7, 0.05);
    gateGroup.add(this.portalSigilRing);

    // Layer C: Primary Swirling Plasma Vortex (Rapid counter-clockwise plasma arms)
    const vortexTex = createPortalVortexTexture();
    const vortexMat = new THREE.MeshBasicMaterial({
      map: vortexTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.portalVortexDisk = new THREE.Mesh(
      new THREE.CircleGeometry(2.35, 48),
      vortexMat
    );
    this.portalVortexDisk.position.set(0, 2.7, 0.02);
    gateGroup.add(this.portalVortexDisk);

    // Layer D: Center Cosmic Abyss Singularity Void (Black hole threshold)
    const voidMat = new THREE.MeshBasicMaterial({
      color: 0x020002,
      side: THREE.DoubleSide,
    });
    const voidDisk = new THREE.Mesh(new THREE.CircleGeometry(1.9, 36), voidMat);
    voidDisk.position.set(0, 2.7, -0.08);
    gateGroup.add(voidDisk);

    this.scene.add(gateGroup);
  }

  private buildBraziers() {
    const { map: basaltMap } = createObsidianRockTexture();
    const basaltMat = new THREE.MeshStandardMaterial({
      color: 0x1f1618,
      map: basaltMap,
      roughness: 0.8,
    });
    const ironMat = new THREE.MeshStandardMaterial({
      color: 0x181012,
      metalness: 0.85,
      roughness: 0.35,
    });
    const coalMat = new THREE.MeshBasicMaterial({
      color: 0xff3300,
    });

    const emberTex = createEmberParticleTexture();

    [-3.0, 3.0].forEach((bx, idx) => {
      const brazier = new THREE.Group();
      brazier.position.set(bx, 0, 4.0);

      // Hexagonal pedestal
      const ped = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.52, 1.3, 6),
        basaltMat
      );
      ped.position.y = 0.65;
      ped.castShadow = true;
      ped.receiveShadow = true;
      brazier.add(ped);

      // Wrought iron cauldron bowl with curved ribs
      const bowl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.62, 0.32, 0.42, 12, 1, true),
        ironMat
      );
      bowl.position.y = 1.45;
      bowl.castShadow = true;
      brazier.add(bowl);

      // Glowing molten coals
      const coals = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.25, 0.16, 12),
        coalMat
      );
      coals.position.y = 1.42;
      brazier.add(coals);

      // Flame billboard
      const flameMat = new THREE.MeshBasicMaterial({
        map: emberTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const flame = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.5), flameMat);
      flame.position.y = 2.0;
      brazier.add(flame);

      // Flickering light
      const pLight = new THREE.PointLight(0xff5511, 2.5, 8, 2.0);
      pLight.position.set(0, 1.9, 0);
      pLight.castShadow = true;
      brazier.add(pLight);

      if (idx === 0) this.brazierLightLeft = pLight;
      else this.brazierLightRight = pLight;

      this.scene.add(brazier);
    });
  }

  private buildEmbers() {
    const geo = new THREE.BufferGeometry();
    const count = this.emberCount;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 8.5;
      positions[i * 3 + 1] = Math.random() * 6.5;
      positions[i * 3 + 2] = -1.0 + Math.random() * 11.0;

      velocities[i * 3] = (Math.random() - 0.5) * 0.15;
      velocities[i * 3 + 1] = 0.4 + Math.random() * 0.8;
      velocities[i * 3 + 2] = -0.15 + (Math.random() - 0.5) * 0.2;

      const heat = Math.random();
      if (heat > 0.6) {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.8;
        colors[i * 3 + 2] = 0.2;
      } else {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.35 * heat;
        colors[i * 3 + 2] = 0.05;
      }
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const emberTex = createEmberParticleTexture();
    const mat = new THREE.PointsMaterial({
      size: 0.18,
      map: emberTex,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.emberParticles = new THREE.Points(geo, mat);
    this.emberPositions = positions;
    this.emberVelocities = velocities;
    this.scene.add(this.emberParticles);
  }

  /**
   * Swirling vortex particles being sucked directly into the portal event horizon
   */
  private buildSuctionParticles() {
    const geo = new THREE.BufferGeometry();
    const count = this.suctionCount;
    const positions = new Float32Array(count * 3);
    const angles = new Float32Array(count);
    const radii = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      angles[i] = Math.random() * Math.PI * 2;
      radii[i] = 0.4 + Math.random() * 3.2;

      const x = Math.cos(angles[i]) * radii[i];
      const y = 2.7 + Math.sin(angles[i]) * radii[i];
      const z = (Math.random() - 0.5) * 0.6;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.4 + Math.random() * 0.5;
      colors[i * 3 + 2] = 0.1;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const emberTex = createEmberParticleTexture();
    const mat = new THREE.PointsMaterial({
      size: 0.16,
      map: emberTex,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.suctionParticles = new THREE.Points(geo, mat);
    this.suctionPositions = positions;
    this.suctionAngles = angles;
    this.suctionRadii = radii;
    this.scene.add(this.suctionParticles);
  }

  private setupInteraction() {
    const handleMove = (clientX: number, clientY: number) => {
      const halfW = window.innerWidth / 2;
      const halfH = window.innerHeight / 2;
      this.targetPointerX = (clientX - halfW) / halfW;
      this.targetPointerY = (clientY - halfH) / halfH;
    };

    window.addEventListener('pointermove', (e) => {
      handleMove(e.clientX, e.clientY);
    });

    window.addEventListener(
      'touchmove',
      (e) => {
        if (e.touches.length > 0) {
          handleMove(e.touches[0].clientX, e.touches[0].clientY);
        }
      },
      { passive: true }
    );
  }

  public triggerEnterDive() {
    if (this.isDiving) return;
    this.isDiving = true;
    this.diveProgress = 0;
  }

  public resetDive() {
    this.isDiving = false;
    this.diveProgress = 0;
    this.camera.position.copy(this.defaultCameraPos);
    this.camera.fov = 62;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(this.defaultTarget);
    if (this.callbacks.onDiveProgress) {
      this.callbacks.onDiveProgress(0);
    }
  }

  private onWindowResize = () => {
    if (this.isDestroyed || !this.container) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private startLoop() {
    const tick = () => {
      if (this.isDestroyed) return;
      this.animFrameId = requestAnimationFrame(tick);

      const delta = Math.min(this.clock.getDelta(), 0.05);
      const time = this.clock.getElapsedTime();

      // Smooth pointer parallax damping
      this.pointerX += (this.targetPointerX - this.pointerX) * (1 - Math.exp(-8 * delta));
      this.pointerY += (this.targetPointerY - this.pointerY) * (1 - Math.exp(-8 * delta));

      // 1. GPU UV scrolling of magma (0% CPU cost, 60fps locked)
      if (this.lavaTexture) {
        this.lavaTexture.offset.y += delta * 0.04;
        this.lavaTexture.offset.x += delta * 0.02;
      }

      // 2. Multi-layer portal rotation & breathing
      if (this.portalVortexDisk) {
        this.portalVortexDisk.rotation.z += 1.1 * delta;
      }
      if (this.portalSigilRing) {
        this.portalSigilRing.rotation.z -= 0.45 * delta;
      }
      if (this.portalCoronaFlare) {
        this.portalCoronaFlare.rotation.z += 0.25 * delta;
        const breath = 1.0 + Math.sin(time * 2.2) * 0.06;
        this.portalCoronaFlare.scale.set(breath, breath, 1.0);
      }

      // 3. Floating shattered obsidian shards levitation
      if (this.floatingShards.length > 0) {
        this.floatingShards.forEach((shard, idx) => {
          shard.rotation.y += (0.4 + idx * 0.1) * delta;
          shard.rotation.x += (0.3 - idx * 0.05) * delta;
          shard.position.y += Math.sin(time * 1.8 + idx * 1.2) * 0.003;
        });
      }

      // 4. Subtle sway of hanging chains
      if (this.chainsGroup) {
        this.chainsGroup.rotation.z = Math.sin(time * 1.5) * 0.035;
      }

      // 5. Pulsing portal light & flickering brazier lights
      if (this.portalLight) {
        this.portalLight.intensity = 4.0 + Math.sin(time * 4.0) * 0.7;
      }
      if (this.brazierLightLeft && this.brazierLightRight) {
        const noiseL = Math.sin(time * 12) * 0.35 + Math.sin(time * 21) * 0.2;
        const noiseR = Math.cos(time * 14) * 0.35 + Math.sin(time * 27) * 0.2;
        this.brazierLightLeft.intensity = 2.5 + noiseL;
        this.brazierLightRight.intensity = 2.5 + noiseR;
      }

      // 6. Upward drifting embers
      if (this.emberPositions && this.emberVelocities && this.emberParticles) {
        const count = this.emberCount;
        for (let i = 0; i < count; i++) {
          const idx = i * 3;
          this.emberPositions[idx] += this.emberVelocities[idx] * delta + Math.sin(time * 2 + i) * 0.003;
          this.emberPositions[idx + 1] += this.emberVelocities[idx + 1] * delta;
          this.emberPositions[idx + 2] += this.emberVelocities[idx + 2] * delta;

          if (this.emberPositions[idx + 1] > 7.0 || this.emberPositions[idx + 2] > 10.0) {
            this.emberPositions[idx] = (Math.random() - 0.5) * 8.5;
            this.emberPositions[idx + 1] = 0.0;
            this.emberPositions[idx + 2] = -0.5 + Math.random() * 9.5;
          }
        }
        this.emberParticles.geometry.attributes.position.needsUpdate = true;
      }

      // 7. Swirling vortex suction particles (drawn inwards into portal singularity)
      if (this.suctionPositions && this.suctionAngles && this.suctionRadii && this.suctionParticles) {
        const count = this.suctionCount;
        for (let i = 0; i < count; i++) {
          const idx = i * 3;
          // Inward acceleration as it gets closer
          const speed = (3.5 - this.suctionRadii[i]) * 0.9 + 0.4;
          this.suctionAngles[i] += speed * delta * 2.2;
          this.suctionRadii[i] -= speed * delta * 0.6;

          // Respawn at outer edge when sucked into the singularity
          if (this.suctionRadii[i] < 0.2) {
            this.suctionRadii[i] = 3.0 + Math.random() * 0.8;
            this.suctionAngles[i] = Math.random() * Math.PI * 2;
          }

          this.suctionPositions[idx] = Math.cos(this.suctionAngles[i]) * this.suctionRadii[i];
          this.suctionPositions[idx + 1] = 2.7 + Math.sin(this.suctionAngles[i]) * this.suctionRadii[i];
          this.suctionPositions[idx + 2] = (1.0 - this.suctionRadii[i] / 3.5) * 0.4;
        }
        this.suctionParticles.geometry.attributes.position.needsUpdate = true;
      }

      // 8. Camera kinematics (Idle vs. Cinematic Dive)
      if (this.isDiving) {
        this.diveProgress += delta / this.diveDuration;
        const p = Math.min(this.diveProgress, 1.0);

        const ease = p * p * (3.0 - 2.0 * p);
        const plungeZ = THREE.MathUtils.lerp(this.defaultCameraPos.z, -1.8, ease);
        const plungeY = THREE.MathUtils.lerp(this.defaultCameraPos.y, 2.7, ease);
        const plungeX = THREE.MathUtils.lerp(this.currentCameraPos.x, 0, ease);

        this.camera.position.set(plungeX, plungeY, plungeZ);

        this.camera.fov = THREE.MathUtils.lerp(62, 96, ease);
        this.camera.updateProjectionMatrix();

        this.currentTarget.set(0, 2.7, -3.0);
        this.camera.lookAt(this.currentTarget);

        if (this.callbacks.onDiveProgress) {
          this.callbacks.onDiveProgress(p);
        }

        if (p >= 0.80 && this.callbacks.onDiveComplete) {
          this.callbacks.onDiveComplete();
        }
      } else {
        const idleFloatY = Math.sin(time * 1.2) * 0.08;
        const targetX = this.defaultCameraPos.x + this.pointerX * 0.65;
        const targetY = this.defaultCameraPos.y + idleFloatY - this.pointerY * 0.45;
        const targetZ = this.defaultCameraPos.z;

        this.camera.position.x += (targetX - this.camera.position.x) * (1 - Math.exp(-4 * delta));
        this.camera.position.y += (targetY - this.camera.position.y) * (1 - Math.exp(-4 * delta));
        this.camera.position.z += (targetZ - this.camera.position.z) * (1 - Math.exp(-4 * delta));

        const lookX = this.defaultTarget.x + this.pointerX * 0.25;
        const lookY = this.defaultTarget.y - this.pointerY * 0.2;
        this.camera.lookAt(lookX, lookY, this.defaultTarget.z);
      }

      this.renderer.render(this.scene, this.camera);
    };

    tick();
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('resize', this.onWindowResize);
    this.renderer.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
