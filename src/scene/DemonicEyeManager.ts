// @ts-nocheck
import * as THREE from 'three';
import { getDemonicEyeTexture, getFaceSkinTexture } from './demonicEyeTexture';

export class DemonicEyeManager {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private animFrameId: number | null = null;
  private isDestroyed: boolean = false;
  private clock: THREE.Clock;

  // Severed Eye Group (The entire eye as removed from the head)
  private severedEyeGroup: THREE.Group = new THREE.Group();
  private eyeballMesh: THREE.Mesh | null = null;
  private opticNerveMesh: THREE.Mesh | null = null;
  private upperEyelid: THREE.Mesh | null = null;
  private lowerEyelid: THREE.Mesh | null = null;

  // Gaze kinematics (Looking side to side)
  private currentGazeX: number = 0;
  private currentGazeY: number = 0;
  private targetGazeX: number = 0;
  private targetGazeY: number = 0;
  private nextSaccadeTime: number = 0.2;

  // Blinking kinematics
  private blinkProgress: number = 0; // 0 = open, 1 = shut
  private isBlinking: boolean = false;
  private blinkTimer: number = 0;
  private nextBlinkInterval: number = 2.0;

  // Initial awakening (eyelid opens immediately as it appears)
  private awakeningProgress: number = 0;
  private isAwakening: boolean = true;

  // Pointer / Touch tracking
  private pointerX: number = 0;
  private pointerY: number = 0;
  private hasUserInteracted: boolean = false;

  constructor(container: HTMLElement) {
    this.container = container;
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
    this.renderer.toneMappingExposure = 1.35;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    // Camera positioned so the smaller severed eye is clearly framed
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 40);
    this.camera.position.set(0, 0, 4.8);

    this.setupLighting();
    this.buildSeveredDemonicEye();
    this.setupInteractions();
    this.startLoop();

    window.addEventListener('resize', this.onResize);
  }

  private setupLighting() {
    // Ambient underworld darkness
    const ambient = new THREE.AmbientLight(0x220505, 1.2);
    this.scene.add(ambient);

    // Key spotlight highlighting wet cornea specular reflections
    const keySpot = new THREE.SpotLight(0xffeedd, 3.4);
    keySpot.position.set(2.0, 3.0, 4.2);
    keySpot.angle = Math.PI / 4;
    keySpot.penumbra = 0.5;
    this.scene.add(keySpot);

    // Deep red rim light accentuating the severed optic nerve and muscle contours
    const rimLight = new THREE.PointLight(0xff2200, 2.5, 8, 1.6);
    rimLight.position.set(-1.8, -1.5, 2.2);
    this.scene.add(rimLight);

    // Backlight for edge silhouette
    const backLight = new THREE.DirectionalLight(0x881100, 1.8);
    backLight.position.set(0, 1, -3);
    this.scene.add(backLight);
  }

  /**
   * Builds the eye as if removed from the head:
   * Compact size, eyeball globe with cornea bulge, veiny sclera,
   * trailing severed optic nerve cord at the back, clinging severed muscle strips,
   * and anatomical eyelids that wrap over and blink.
   */
  private buildSeveredDemonicEye() {
    this.severedEyeGroup = new THREE.Group();

    const { map: eyeMap, bump: eyeBump } = getDemonicEyeTexture();
    const { map: fleshMap, bump: fleshBump } = getFaceSkinTexture();

    // Muscle / nerve material
    const nerveMat = new THREE.MeshStandardMaterial({
      color: 0x5a1210,
      map: fleshMap,
      bumpMap: fleshBump,
      bumpScale: 0.15,
      roughness: 0.6,
      metalness: 0.1,
    });

    const severedEndMat = new THREE.MeshStandardMaterial({
      color: 0x880808,
      roughness: 0.3,
      metalness: 0.2,
    });

    // 1. THE EYEBALL GLOBE (Pure circular sphere with authentic eye proportion)
    const eyeRadius = 0.9;
    const eyeGeo = new THREE.SphereGeometry(eyeRadius, 48, 48);
    eyeGeo.rotateY(-Math.PI / 2); // Orient iris toward +Z

    const eyeMat = new THREE.MeshStandardMaterial({
      map: eyeMap,
      bumpMap: eyeBump,
      bumpScale: 0.035,
      roughness: 0.08, // Wet glistening sclera
      metalness: 0.04,
    });
    this.eyeballMesh = new THREE.Mesh(eyeGeo, eyeMat);
    this.severedEyeGroup.add(this.eyeballMesh);

    // 2. CORNEA (Smooth curved lens sitting flush on the front of the eyeball)
    const corneaGeo = new THREE.SphereGeometry(0.46, 32, 24);
    corneaGeo.scale(1.0, 1.0, 0.4);
    const corneaMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.02,
      metalness: 0.05,
      transparent: true,
      opacity: 0.35,
    });
    const corneaMesh = new THREE.Mesh(corneaGeo, corneaMat);
    corneaMesh.position.set(0, 0, eyeRadius * 0.95);
    this.severedEyeGroup.add(corneaMesh);

    // 3. SEVERED OPTIC NERVE (Clean fleshy cord trailing directly behind the eye)
    const nerveCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, -eyeRadius * 0.95),
      new THREE.Vector3(0.04, -0.06, -eyeRadius * 1.4),
      new THREE.Vector3(-0.05, -0.12, -eyeRadius * 1.8),
      new THREE.Vector3(0.02, -0.18, -eyeRadius * 2.2),
    ]);
    const nerveGeo = new THREE.TubeGeometry(nerveCurve, 18, 0.14, 12, false);
    this.opticNerveMesh = new THREE.Mesh(nerveGeo, nerveMat);
    this.severedEyeGroup.add(this.opticNerveMesh);

    // Severed tip
    const stumpGeo = new THREE.CylinderGeometry(0.14, 0.12, 0.08, 12);
    stumpGeo.rotateX(Math.PI / 2);
    const stumpMesh = new THREE.Mesh(stumpGeo, severedEndMat);
    stumpMesh.position.set(0.02, -0.18, -eyeRadius * 2.24);
    this.severedEyeGroup.add(stumpMesh);

    // 4. CIRCULAR EYELIDS (Smooth spherical caps matching the circular eye contour)
    const lidMat = new THREE.MeshStandardMaterial({
      map: fleshMap,
      bumpMap: fleshBump,
      bumpScale: 0.06,
      roughness: 0.65,
      metalness: 0.08,
      side: THREE.DoubleSide,
    });

    // Upper circular eyelid
    const lidGeoUpper = new THREE.SphereGeometry(
      eyeRadius * 1.015,
      48,
      24,
      0,
      Math.PI * 2,
      0,
      Math.PI * 0.52
    );
    this.upperEyelid = new THREE.Mesh(lidGeoUpper, lidMat);
    this.upperEyelid.rotation.x = -Math.PI * 0.54; // Open position (clean circular eye)
    this.severedEyeGroup.add(this.upperEyelid);

    // Lower circular eyelid
    const lidGeoLower = new THREE.SphereGeometry(
      eyeRadius * 1.012,
      48,
      24,
      0,
      Math.PI * 2,
      Math.PI * 0.48,
      Math.PI * 0.52
    );
    this.lowerEyelid = new THREE.Mesh(lidGeoLower, lidMat);
    this.lowerEyelid.rotation.x = Math.PI * 0.54; // Open position (clean circular eye)
    this.severedEyeGroup.add(this.lowerEyelid);

    this.scene.add(this.severedEyeGroup);
  }

  private setEyelidsClosedFraction(closed: number) {
    if (!this.upperEyelid || !this.lowerEyelid) return;
    // 0 = fully open (revealing round circular eye), 1 = shut over the cornea
    const upperOpen = -Math.PI * 0.54;
    const upperClosed = 0.02;
    this.upperEyelid.rotation.x = THREE.MathUtils.lerp(upperOpen, upperClosed, closed);

    const lowerOpen = Math.PI * 0.54;
    const lowerClosed = -0.02;
    this.lowerEyelid.rotation.x = THREE.MathUtils.lerp(lowerOpen, lowerClosed, closed);
  }

  private setupInteractions() {
    const handleMove = (cx: number, cy: number) => {
      const halfW = window.innerWidth / 2;
      const halfH = window.innerHeight / 2;
      this.pointerX = (cx - halfW) / halfW;
      this.pointerY = (cy - halfH) / halfH;
      this.hasUserInteracted = true;
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

  private onResize = () => {
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

      // 1. Immediate Awakening: Eyelids open smoothly upon entering
      if (this.isAwakening) {
        this.awakeningProgress += delta * 2.4;
        if (this.awakeningProgress >= 1.0) {
          this.awakeningProgress = 1.0;
          this.isAwakening = false;
        }
        const closed = 1.0 - this.awakeningProgress;
        this.setEyelidsClosedFraction(closed);
      }

      // 2. Gaze Movement: Looking from side to side
      this.nextSaccadeTime -= delta;
      if (this.nextSaccadeTime <= 0) {
        if (this.hasUserInteracted && Math.random() > 0.4) {
          // Tracks user finger/cursor
          this.targetGazeX = this.pointerX * 0.45;
          this.targetGazeY = -this.pointerY * 0.35;
        } else {
          // Autonomous darting: Look left, look right, scan restlessly
          const side = Math.random() > 0.5 ? 1 : -1;
          this.targetGazeX = side * (0.25 + Math.random() * 0.4);
          this.targetGazeY = (Math.random() - 0.5) * 0.25;
        }
        this.nextSaccadeTime = 1.0 + Math.random() * 1.8;
      }

      // Smooth organic interpolation
      const damping = 1 - Math.exp(-8 * delta);
      this.currentGazeX += (this.targetGazeX - this.currentGazeX) * damping;
      this.currentGazeY += (this.targetGazeY - this.currentGazeY) * damping;

      // Realistic biological tremor (nystagmus)
      const tremorX = Math.sin(time * 20) * 0.003;
      const tremorY = Math.cos(time * 17) * 0.003;

      // Rotate the severed eye to look around
      this.severedEyeGroup.rotation.y = this.currentGazeX + tremorX;
      this.severedEyeGroup.rotation.x = -this.currentGazeY + tremorY;

      // Secondary sway on the optic nerve cord
      if (this.opticNerveMesh) {
        this.opticNerveMesh.rotation.y = Math.sin(time * 2.5) * 0.08 - this.currentGazeX * 0.2;
        this.opticNerveMesh.rotation.x = Math.cos(time * 2.0) * 0.06 + this.currentGazeY * 0.2;
      }

      // 3. Periodic Blinking
      if (!this.isAwakening) {
        this.blinkTimer += delta;
        if (!this.isBlinking && this.blinkTimer >= this.nextBlinkInterval) {
          this.isBlinking = true;
          this.blinkProgress = 0;
          this.blinkTimer = 0;
          this.nextBlinkInterval = 1.8 + Math.random() * 2.8;
        }

        if (this.isBlinking) {
          this.blinkProgress += delta / 0.17;
          if (this.blinkProgress >= 1.0) {
            this.blinkProgress = 1.0;
            this.isBlinking = false;
          }
          const blinkCurve = Math.sin(this.blinkProgress * Math.PI);
          this.setEyelidsClosedFraction(blinkCurve);
        }
      }

      // Eerie weightless floating in the abyss
      this.severedEyeGroup.position.y = Math.sin(time * 1.6) * 0.05;
      this.severedEyeGroup.position.x = Math.cos(time * 1.2) * 0.03;

      this.renderer.render(this.scene, this.camera);
    };

    tick();
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
