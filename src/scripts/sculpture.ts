import {
  ACESFilmicToneMapping,
  AmbientLight,
  Color,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PMREMGenerator,
  PerspectiveCamera,
  PointLight,
  Scene,
  Shape,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';

interface MountOptions {
  canvas: HTMLCanvasElement;
  host: HTMLElement;
  fallback: Element | null;
}

const Z_PATH: [number, number][] = [
  [-1.56, 1.34],
  [1.56, 1.34],
  [1.56, 0.86],
  [-0.38, -0.86],
  [1.56, -0.86],
  [1.56, -1.34],
  [-1.56, -1.34],
  [-1.56, -0.86],
  [0.38, 0.86],
  [-1.56, 0.86],
];

function createZGeometry(detail: number) {
  const shape = new Shape();
  Z_PATH.forEach(([x, y], index) => {
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();

  const geometry = new ExtrudeGeometry(shape, {
    depth: 0.62,
    bevelEnabled: true,
    bevelThickness: 0.16,
    bevelSize: 0.11,
    bevelOffset: -0.02,
    bevelSegments: detail,
    curveSegments: detail,
  });

  geometry.center();

  const pos = geometry.attributes.position;
  const vertex = new Vector3();
  for (let i = 0; i < pos.count; i += 1) {
    vertex.fromBufferAttribute(pos, i);
    const t = (vertex.y + 1.55) / 3.1;
    const twist = (t - 0.5) * 0.92;
    const x = vertex.x * Math.cos(twist) - vertex.z * Math.sin(twist);
    const z = vertex.x * Math.sin(twist) + vertex.z * Math.cos(twist);
    const swell = Math.sin(t * Math.PI) * 0.1;
    pos.setXYZ(i, x * (1 + swell * 0.18), vertex.y, z + Math.cos(t * Math.PI * 2) * 0.14);
  }

  geometry.computeVertexNormals();
  return geometry;
}

function createEnvMap(renderer: WebGLRenderer) {
  const envScene = new Scene();
  envScene.background = new Color(0x16082c);

  const addOrb = (color: number, x: number, y: number, z: number, scale: number) => {
    const mesh = new Mesh(new SphereGeometry(scale, 16, 16), new MeshBasicMaterial({ color }));
    mesh.position.set(x, y, z);
    envScene.add(mesh);
    return mesh;
  };

  const orbs = [
    addOrb(0xffffff, 10, 14, 8, 5.5),
    addOrb(0x5b8cff, -14, 3, 10, 8),
    addOrb(0xe84aff, 12, -11, -6, 7),
    addOrb(0x7c3aed, -4, -9, 12, 6.5),
    addOrb(0xc4b5fd, 0, 16, -10, 9),
    addOrb(0x1e3a8a, -10, 8, -12, 6),
  ];

  const pmrem = new PMREMGenerator(renderer);
  const texture = pmrem.fromScene(envScene, 0.06).texture;
  pmrem.dispose();
  orbs.forEach((orb) => {
    orb.geometry.dispose();
    (orb.material as MeshBasicMaterial).dispose();
    envScene.remove(orb);
  });

  return texture;
}

export function mountSculpture({ canvas, host, fallback }: MountOptions): () => void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = window.matchMedia('(max-width: 767px)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      canvas,
      antialias: !mobile,
      alpha: true,
      powerPreference: 'high-performance',
      stencil: false,
    });
  } catch {
    return () => undefined;
  }

  if (!renderer.capabilities.isWebGL2 && renderer.capabilities.maxTextures < 8) {
    renderer.dispose();
    return () => undefined;
  }

  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(32, 1, 0.1, 30);
  camera.position.set(0.15, 0.08, 6.1);

  const envMap = createEnvMap(renderer);
  const geometry = createZGeometry(mobile ? 5 : 10);
  const material = new MeshPhysicalMaterial({
    color: 0xe9e4f5,
    metalness: 1,
    roughness: 0.09,
    iridescence: 1,
    iridescenceIOR: 1.24,
    iridescenceThicknessRange: [120, 540],
    clearcoat: 1,
    clearcoatRoughness: 0.07,
    envMap,
    envMapIntensity: 1.45,
    reflectivity: 1,
  });

  const mesh = new Mesh(geometry, material);
  mesh.rotation.set(0.18, -0.42, 0.08);
  mesh.scale.setScalar(mobile ? 1.15 : 1.28);

  const group = new Group();
  group.add(mesh);
  scene.add(group);

  scene.add(new AmbientLight(0x3b1268, 0.55));
  scene.add(new HemisphereLight(0xd4c4ff, 0x1a0530, 0.85));

  const key = new DirectionalLight(0xffffff, 1.35);
  key.position.set(4.2, 5.4, 6);
  scene.add(key);

  const blue = new PointLight(0x5b8cff, 18, 14, 2);
  blue.position.set(-3.6, 1.4, 3.2);
  scene.add(blue);

  const magenta = new PointLight(0xe84aff, 14, 12, 2);
  magenta.position.set(3.4, -2.2, 2.4);
  scene.add(magenta);

  const rim = new PointLight(0x7c3aed, 10, 16, 2);
  rim.position.set(0.4, 0.6, -4.2);
  scene.add(rim);

  canvas.hidden = false;
  if (fallback instanceof HTMLElement) fallback.hidden = true;

  const pointer = new Vector2(0, 0);
  const target = new Vector2(0, 0);
  let width = 0;
  let height = 0;
  let raf = 0;
  let visible = true;
  let running = false;
  const clock = { start: performance.now() };

  const setSize = () => {
    const rect = host.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const render = () => {
    const t = (performance.now() - clock.start) / 1000;
    pointer.x += (target.x - pointer.x) * 0.06;
    pointer.y += (target.y - pointer.y) * 0.06;

    if (!reduced) {
      group.rotation.y = t * 0.18 + pointer.x * 0.45;
      group.rotation.x = Math.sin(t * 0.35) * 0.06 + pointer.y * 0.28;
      group.position.y = Math.sin(t * 0.7) * 0.08;
    } else {
      group.rotation.y = -0.2;
      group.rotation.x = 0.12;
    }

    renderer.render(scene, camera);
  };

  const loop = () => {
    raf = requestAnimationFrame(loop);
    if (!visible) return;
    render();
  };

  const onPointerMove = (event: PointerEvent) => {
    const rect = host.getBoundingClientRect();
    target.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    target.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
  };

  const onPointerLeave = () => {
    target.set(0, 0);
  };

  const io = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !running && !reduced) {
        running = true;
        cancelAnimationFrame(raf);
        loop();
      }
    },
    { threshold: 0.05 },
  );
  io.observe(host);

  const resize = new ResizeObserver(setSize);
  resize.observe(host);
  setSize();
  render();

  if (!reduced) {
    running = true;
    loop();
  }

  if (finePointer && !reduced) {
    host.addEventListener('pointermove', onPointerMove);
    host.addEventListener('pointerleave', onPointerLeave);
  }

  const onLost = (event: Event) => {
    event.preventDefault();
    canvas.hidden = true;
    if (fallback instanceof HTMLElement) fallback.hidden = false;
  };
  canvas.addEventListener('webglcontextlost', onLost);

  return () => {
    running = false;
    visible = false;
    cancelAnimationFrame(raf);
    io.disconnect();
    resize.disconnect();
    host.removeEventListener('pointermove', onPointerMove);
    host.removeEventListener('pointerleave', onPointerLeave);
    canvas.removeEventListener('webglcontextlost', onLost);
    geometry.dispose();
    material.dispose();
    envMap.dispose();
    renderer.dispose();
  };
}
