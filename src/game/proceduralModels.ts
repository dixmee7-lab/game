import * as THREE from 'three';
import { CarModelId } from '../types';
import { HYUNDAI_N_CARS } from '../constants/vehicles';
import { TRACK_WAYPOINTS, JUMP_PADS, INITIAL_ITEM_BOXES } from './trackPath';

// Texture generators (100% Canvas procedural - Zero 404 dependencies)
function createAsphaltTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Dark asphalt base
  ctx.fillStyle = '#1c1f24';
  ctx.fillRect(0, 0, 1024, 1024);

  // Grain noise
  for (let i = 0; i < 40000; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const brightness = 20 + Math.random() * 35;
    ctx.fillStyle = `rgb(${brightness},${brightness + 2},${brightness + 4})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Dashed white center line
  ctx.strokeStyle = '#e0e6ed';
  ctx.lineWidth = 14;
  ctx.setLineDash([60, 50]);
  ctx.beginPath();
  ctx.moveTo(512, 0);
  ctx.lineTo(512, 1024);
  ctx.stroke();

  // Rubber skid marks
  ctx.strokeStyle = 'rgba(10, 10, 12, 0.45)';
  ctx.lineWidth = 28;
  ctx.setLineDash([]);
  for (let s = 0; s < 6; s++) {
    ctx.beginPath();
    const sx = 300 + Math.random() * 424;
    ctx.moveTo(sx, Math.random() * 500);
    ctx.lineTo(sx + (Math.random() - 0.5) * 60, 1024);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 24);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createCurbTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const stripeH = 32;
  for (let y = 0; y < 256; y += stripeH) {
    const isRed = (y / stripeH) % 2 === 0;
    ctx.fillStyle = isRed ? '#d32f2f' : '#f5f5f5';
    ctx.fillRect(0, y, 256, stripeH);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 60);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createBarrierBannerTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 128);

  ctx.fillStyle = '#00a3e0'; // Hyundai Sky
  ctx.fillRect(0, 0, 512, 12);
  ctx.fillStyle = '#da291c'; // N Red
  ctx.fillRect(0, 116, 512, 12);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 54px Orbitron, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('HYUNDAI  N', 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createStartFinishTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const checkSize = 32;
  for (let y = 0; y < 128; y += checkSize) {
    for (let x = 0; x < 512; x += checkSize) {
      const isBlack = ((x / checkSize) + (y / checkSize)) % 2 === 0;
      ctx.fillStyle = isBlack ? '#111827' : '#ffffff';
      ctx.fillRect(x, y, checkSize, checkSize);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createJumpPadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, 256, 256);

  // Glowing neon cyan/yellow chevrons
  ctx.fillStyle = '#00e5ff';
  for (let i = 0; i < 3; i++) {
    const y = 50 + i * 70;
    ctx.beginPath();
    ctx.moveTo(128, y - 30);
    ctx.lineTo(220, y + 25);
    ctx.lineTo(190, y + 25);
    ctx.lineTo(128, y - 10);
    ctx.lineTo(66, y + 25);
    ctx.lineTo(36, y + 25);
    ctx.closePath();
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Cached shared materials & textures
const asphaltTex = createAsphaltTexture();
const curbTex = createCurbTexture();
const barrierTex = createBarrierBannerTexture();
const startFinishTex = createStartFinishTexture();
const jumpPadTex = createJumpPadTexture();

/**
 * Creates 3D Composite Vehicle Model for any of the 6 Hyundai N Cars
 * Assembled with 10+ distinct procedural parts:
 * - Body / Chassis
 * - Cockpit / Tinted Windshield
 * - Front Aero Splitter & Rear Diffuser
 * - 4x Wheels with metallic rims & red brake calipers
 * - LED Headlights & Taillights
 * - Rear GT / Ducktail Wing
 * - Left & Right Deployable Flight Wings (retractable)
 * - Dual Exhaust with flame nodes
 */
export function createVehicleModel(carId: CarModelId): {
  group: THREE.Group;
  wheels: THREE.Mesh[];
  steerWheels: THREE.Group[];
  leftWing: THREE.Group;
  rightWing: THREE.Group;
  exhaustLeft: THREE.Vector3;
  exhaustRight: THREE.Vector3;
  bodyMesh: THREE.Mesh;
} {
  const carSpec = HYUNDAI_N_CARS.find((c) => c.id === carId) || HYUNDAI_N_CARS[0];
  const group = new THREE.Group();
  group.name = `car-${carId}`;

  // Vehicle Dimensions (approx 4.2m long, 1.9m wide, 1.25m high)
  const isSupercar = carSpec.bodyStyle === 'supercar' || carSpec.bodyStyle === 'streamliner';
  const isWedge = carSpec.bodyStyle === 'wedge-coupe';
  const isCrossover = carSpec.bodyStyle === 'crossover-hatch';

  const bodyLength = isSupercar ? 4.4 : isCrossover ? 4.2 : 4.3;
  const bodyWidth = isSupercar ? 2.05 : 1.95;
  const bodyHeight = isSupercar ? 0.95 : isCrossover ? 1.25 : 1.1;

  // Materials
  const carPaintMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(carSpec.primaryColor),
    metalness: 0.85,
    roughness: 0.22,
  });

  const carbonMat = new THREE.MeshStandardMaterial({
    color: 0x111317,
    roughness: 0.4,
    metalness: 0.6,
  });

  const trimAccentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(carSpec.secondaryColor),
    roughness: 0.3,
    metalness: 0.5,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x1a2332,
    roughness: 0.1,
    metalness: 0.9,
    transmission: 0.6,
    transparent: true,
    opacity: 0.85,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xeeeeee,
    metalness: 0.95,
    roughness: 0.1,
  });

  const brakeCaliperMat = new THREE.MeshStandardMaterial({
    color: 0xda291c, // N Red
    roughness: 0.3,
    metalness: 0.7,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x181a1f,
    roughness: 0.85,
    metalness: 0.1,
  });

  const lightHeadMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xccf0ff,
    emissiveIntensity: 1.5,
  });

  const lightTailMat = new THREE.MeshStandardMaterial({
    color: 0xff0022,
    emissive: 0xff1133,
    emissiveIntensity: 2.0,
  });

  // 1. Lower Chassis & Aerodynamic Floor
  const chassisGeo = new THREE.BoxGeometry(bodyWidth * 0.95, 0.22, bodyLength * 0.98);
  const chassisMesh = new THREE.Mesh(chassisGeo, carbonMat);
  chassisMesh.position.y = 0.22;
  chassisMesh.castShadow = true;
  group.add(chassisMesh);

  // 2. Main Car Body
  let bodyGeo: THREE.BufferGeometry;
  if (isWedge) {
    // N Vision 74 Angular retro sports silhouette
    bodyGeo = new THREE.BoxGeometry(bodyWidth, bodyHeight * 0.7, bodyLength);
  } else if (isCrossover) {
    // IONIQ 5 N Muscular Hatch
    bodyGeo = new THREE.BoxGeometry(bodyWidth, bodyHeight * 0.8, bodyLength);
  } else {
    // Sleek Streamlined GT
    bodyGeo = new THREE.BoxGeometry(bodyWidth, bodyHeight * 0.75, bodyLength);
  }

  const bodyMesh = new THREE.Mesh(bodyGeo, carPaintMat);
  bodyMesh.position.y = 0.35 + (bodyHeight * 0.7) / 2;
  bodyMesh.castShadow = true;
  group.add(bodyMesh);

  // 3. Cabin / Greenhouse & Windshield
  const cabinLength = bodyLength * (isWedge ? 0.48 : isCrossover ? 0.6 : 0.45);
  const cabinWidth = bodyWidth * 0.78;
  const cabinHeight = bodyHeight * 0.62;
  const cabinGeo = new THREE.BoxGeometry(cabinWidth, cabinHeight, cabinLength);
  const cabinMesh = new THREE.Mesh(cabinGeo, glassMat);
  cabinMesh.position.set(0, bodyMesh.position.y + bodyHeight * 0.45, -bodyLength * 0.05);
  cabinMesh.castShadow = true;
  group.add(cabinMesh);

  // Roof cap
  const roofGeo = new THREE.BoxGeometry(cabinWidth * 0.92, 0.08, cabinLength * 0.9);
  const roofMesh = new THREE.Mesh(roofGeo, carbonMat);
  roofMesh.position.set(0, cabinMesh.position.y + cabinHeight * 0.52, cabinMesh.position.z);
  group.add(roofMesh);

  // 4. Front Splitter with N Red Trim
  const splitterGeo = new THREE.BoxGeometry(bodyWidth * 1.02, 0.08, 0.6);
  const splitterMesh = new THREE.Mesh(splitterGeo, trimAccentMat);
  splitterMesh.position.set(0, 0.16, -bodyLength * 0.48);
  splitterMesh.castShadow = true;
  group.add(splitterMesh);

  // 5. Rear Diffuser
  const diffuserGeo = new THREE.BoxGeometry(bodyWidth * 0.95, 0.25, 0.5);
  const diffuserMesh = new THREE.Mesh(diffuserGeo, carbonMat);
  diffuserMesh.position.set(0, 0.25, bodyLength * 0.48);
  diffuserMesh.castShadow = true;
  group.add(diffuserMesh);

  // 6. LED Headlights
  const headLightGeo = new THREE.BoxGeometry(0.42, 0.1, 0.1);
  const headLeft = new THREE.Mesh(headLightGeo, lightHeadMat);
  headLeft.position.set(-bodyWidth * 0.35, bodyMesh.position.y + 0.08, -bodyLength * 0.49);
  const headRight = new THREE.Mesh(headLightGeo, lightHeadMat);
  headRight.position.set(bodyWidth * 0.35, bodyMesh.position.y + 0.08, -bodyLength * 0.49);
  group.add(headLeft, headRight);

  // 7. Full-Width Rear LED Garnish (Ionic Parametric Pixel / GT Lightbar)
  const tailLightGeo = new THREE.BoxGeometry(bodyWidth * 0.88, 0.1, 0.08);
  const tailLight = new THREE.Mesh(tailLightGeo, lightTailMat);
  tailLight.position.set(0, bodyMesh.position.y + 0.18, bodyLength * 0.495);
  group.add(tailLight);

  // 8. Rear Spoiler / Wing
  if (carSpec.spoilerStyle === 'huge-gt' || carSpec.spoilerStyle === 'retro-wing') {
    const wingWidth = bodyWidth * 1.05;
    const wingGeo = new THREE.BoxGeometry(wingWidth, 0.06, 0.4);
    const wingMesh = new THREE.Mesh(wingGeo, carbonMat);
    wingMesh.position.set(0, bodyMesh.position.y + 0.72, bodyLength * 0.44);

    // Stanchions
    const pylonGeo = new THREE.BoxGeometry(0.06, 0.5, 0.18);
    const pylonL = new THREE.Mesh(pylonGeo, carbonMat);
    pylonL.position.set(-wingWidth * 0.32, bodyMesh.position.y + 0.46, bodyLength * 0.44);
    const pylonR = new THREE.Mesh(pylonGeo, carbonMat);
    pylonR.position.set(wingWidth * 0.32, bodyMesh.position.y + 0.46, bodyLength * 0.44);

    group.add(wingMesh, pylonL, pylonR);
  } else if (carSpec.spoilerStyle === 'ducktail') {
    const ducktailGeo = new THREE.BoxGeometry(bodyWidth * 0.85, 0.12, 0.22);
    const ducktailMesh = new THREE.Mesh(ducktailGeo, carbonMat);
    ducktailMesh.rotation.x = -0.3;
    ducktailMesh.position.set(0, bodyMesh.position.y + 0.32, bodyLength * 0.47);
    group.add(ducktailMesh);
  }

  // 9. Wheels & Calipers (4 wheels, 2 front steering pivots)
  const wheelRadius = 0.38;
  const wheelWidth = 0.28;
  const wheelX = bodyWidth * 0.46;
  const wheelFrontZ = -bodyLength * 0.31;
  const wheelRearZ = bodyLength * 0.31;
  const wheelY = wheelRadius;

  const wheels: THREE.Mesh[] = [];
  const steerWheels: THREE.Group[] = [];

  const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 20);
  wheelGeo.rotateZ(Math.PI / 2);

  const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.68, wheelRadius * 0.68, wheelWidth * 1.02, 16);
  rimGeo.rotateZ(Math.PI / 2);

  const caliperGeo = new THREE.BoxGeometry(0.12, 0.18, 0.12);

  const wheelPositions = [
    { x: -wheelX, z: wheelFrontZ, isFront: true },
    { x: wheelX, z: wheelFrontZ, isFront: true },
    { x: -wheelX, z: wheelRearZ, isFront: false },
    { x: wheelX, z: wheelRearZ, isFront: false },
  ];

  wheelPositions.forEach((wp) => {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(wp.x, wheelY, wp.z);

    const tire = new THREE.Mesh(wheelGeo, tireMat);
    tire.castShadow = true;

    const rim = new THREE.Mesh(rimGeo, chromeMat);
    tire.add(rim);

    // Caliper attached to fixed steering hub
    const caliper = new THREE.Mesh(caliperGeo, brakeCaliperMat);
    caliper.position.set(wp.x > 0 ? -0.08 : 0.08, 0.12, 0);

    if (wp.isFront) {
      wheelGroup.add(tire);
      wheelGroup.add(caliper);
      group.add(wheelGroup);
      steerWheels.push(wheelGroup);
    } else {
      wheelGroup.add(tire);
      wheelGroup.add(caliper);
      group.add(wheelGroup);
    }
    wheels.push(tire);
  });

  // 10. Deployable Side Aero Wings (for the Wing Flight Item)
  // Left Wing Group
  const leftWing = new THREE.Group();
  leftWing.position.set(-bodyWidth * 0.5, bodyHeight * 0.65, 0);
  const wingBladeGeo = new THREE.BoxGeometry(1.6, 0.05, 0.7);
  const wingBladeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(carSpec.primaryColor),
    emissive: 0x00e5ff,
    emissiveIntensity: 0.3,
    metalness: 0.9,
    roughness: 0.2,
  });
  const leftBlade = new THREE.Mesh(wingBladeGeo, wingBladeMat);
  leftBlade.position.set(-0.8, 0, 0);
  leftWing.add(leftBlade);
  leftWing.scale.set(0.001, 1, 1); // folded initially
  group.add(leftWing);

  // Right Wing Group
  const rightWing = new THREE.Group();
  rightWing.position.set(bodyWidth * 0.5, bodyHeight * 0.65, 0);
  const rightBlade = new THREE.Mesh(wingBladeGeo, wingBladeMat);
  rightBlade.position.set(0.8, 0, 0);
  rightWing.add(rightBlade);
  rightWing.scale.set(0.001, 1, 1); // folded initially
  group.add(rightWing);

  // 11. Contact Grounding Shadow Plane
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sCtx = shadowCanvas.getContext('2d')!;
  const grad = sCtx.createRadialGradient(64, 64, 10, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0,0,0,0.65)');
  grad.addColorStop(0.7, 'rgba(0,0,0,0.25)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  sCtx.fillStyle = grad;
  sCtx.fillRect(0, 0, 128, 128);

  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const shadowGeo = new THREE.PlaneGeometry(bodyWidth * 1.3, bodyLength * 1.25);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.position.y = 0.03;
  group.add(shadowMesh);

  const exhaustLeft = new THREE.Vector3(-0.4, 0.26, bodyLength * 0.5);
  const exhaustRight = new THREE.Vector3(0.4, 0.26, bodyLength * 0.5);

  return {
    group,
    wheels,
    steerWheels,
    leftWing,
    rightWing,
    exhaustLeft,
    exhaustRight,
    bodyMesh,
  };
}

/**
 * Builds the comprehensive 3D Circuit World:
 * - 32m wide asphalt track ribbon with UV unwrap
 * - Continuous red/white rumble curbstones
 * - Safety barrier walls with Hyundai N sponsor graphics
 * - Start/Finish Arch Gantry with LED counters
 * - Modern Multi-Garage Pit Building
 * - Spectator Grandstands
 * - Jump Pad ramps
 * - Trackside environment trees and lighting pillars
 */
export function buildTrackEnvironment(scene: THREE.Scene): {
  itemMeshes: Map<string, THREE.Group>;
} {
  const itemMeshes = new Map<string, THREE.Group>();

  // 1. Generate 32m Wide Asphalt Track Mesh & Curbs
  const waypoints = TRACK_WAYPOINTS;
  const n = waypoints.length;

  const trackVerts: number[] = [];
  const trackUvs: number[] = [];
  const trackIndices: number[] = [];

  const curbLVerts: number[] = [];
  const curbLUvs: number[] = [];
  const curbLIndices: number[] = [];

  const curbRVerts: number[] = [];
  const curbRUvs: number[] = [];
  const curbRIndices: number[] = [];

  const barrierLVerts: number[] = [];
  const barrierLUvs: number[] = [];
  const barrierLIndices: number[] = [];

  const barrierRVerts: number[] = [];
  const barrierRUvs: number[] = [];
  const barrierRIndices: number[] = [];

  const trackHalfWidth = 16; // 32m total
  const curbWidth = 1.6;
  const barrierHeight = 2.4;

  for (let i = 0; i <= n; i++) {
    const wp = waypoints[i % n];
    const u = i / n;

    // Track Left & Right
    const leftX = wp.x - wp.normalX * trackHalfWidth;
    const leftZ = wp.z - wp.normalZ * trackHalfWidth;
    const rightX = wp.x + wp.normalX * trackHalfWidth;
    const rightZ = wp.z + wp.normalZ * trackHalfWidth;
    const y = wp.y + 0.05;

    // Track surface
    trackVerts.push(leftX, y, leftZ);
    trackVerts.push(rightX, y, rightZ);
    trackUvs.push(0, u * 24);
    trackUvs.push(1, u * 24);

    // Left Curb
    const curbOutLX = wp.x - wp.normalX * (trackHalfWidth + curbWidth);
    const curbOutLZ = wp.z - wp.normalZ * (trackHalfWidth + curbWidth);
    curbLVerts.push(curbOutLX, y + 0.08, curbOutLZ);
    curbLVerts.push(leftX, y + 0.02, leftZ);
    curbLUvs.push(0, u * 60);
    curbLUvs.push(1, u * 60);

    // Right Curb
    const curbOutRX = wp.x + wp.normalX * (trackHalfWidth + curbWidth);
    const curbOutRZ = wp.z + wp.normalZ * (trackHalfWidth + curbWidth);
    curbRVerts.push(rightX, y + 0.02, rightZ);
    curbRVerts.push(curbOutRX, y + 0.08, curbOutRZ);
    curbRUvs.push(0, u * 60);
    curbRUvs.push(1, u * 60);

    // Left Barrier Wall
    const barBaseLX = curbOutLX;
    const barBaseLZ = curbOutLZ;
    barrierLVerts.push(barBaseLX, y, barBaseLZ);
    barrierLVerts.push(barBaseLX, y + barrierHeight, barBaseLZ);
    barrierLUvs.push(u * 12, 0);
    barrierLUvs.push(u * 12, 1);

    // Right Barrier Wall
    const barBaseRX = curbOutRX;
    const barBaseRZ = curbOutRZ;
    barrierRVerts.push(barBaseRX, y, barBaseRZ);
    barrierRVerts.push(barBaseRX, y + barrierHeight, barBaseRZ);
    barrierRUvs.push(u * 12, 0);
    barrierRUvs.push(u * 12, 1);

    if (i < n) {
      const idx = i * 2;
      // Track
      trackIndices.push(idx, idx + 1, idx + 2);
      trackIndices.push(idx + 1, idx + 3, idx + 2);

      // Curbs
      curbLIndices.push(idx, idx + 1, idx + 2);
      curbLIndices.push(idx + 1, idx + 3, idx + 2);

      curbRIndices.push(idx, idx + 1, idx + 2);
      curbRIndices.push(idx + 1, idx + 3, idx + 2);

      // Barriers
      barrierLIndices.push(idx, idx + 1, idx + 2);
      barrierLIndices.push(idx + 1, idx + 3, idx + 2);

      barrierRIndices.push(idx, idx + 2, idx + 1);
      barrierRIndices.push(idx + 1, idx + 2, idx + 3);
    }
  }

  // Track Mesh
  const trackGeo = new THREE.BufferGeometry();
  trackGeo.setAttribute('position', new THREE.Float32BufferAttribute(trackVerts, 3));
  trackGeo.setAttribute('uv', new THREE.Float32BufferAttribute(trackUvs, 2));
  trackGeo.setIndex(trackIndices);
  trackGeo.computeVertexNormals();

  const trackMat = new THREE.MeshStandardMaterial({
    map: asphaltTex,
    roughness: 0.82,
    metalness: 0.1,
  });
  const trackMesh = new THREE.Mesh(trackGeo, trackMat);
  trackMesh.receiveShadow = true;
  scene.add(trackMesh);

  // Left & Right Curbs
  const curbLGeo = new THREE.BufferGeometry();
  curbLGeo.setAttribute('position', new THREE.Float32BufferAttribute(curbLVerts, 3));
  curbLGeo.setAttribute('uv', new THREE.Float32BufferAttribute(curbLUvs, 2));
  curbLGeo.setIndex(curbLIndices);
  curbLGeo.computeVertexNormals();

  const curbRGeo = new THREE.BufferGeometry();
  curbRGeo.setAttribute('position', new THREE.Float32BufferAttribute(curbRVerts, 3));
  curbRGeo.setAttribute('uv', new THREE.Float32BufferAttribute(curbRUvs, 2));
  curbRGeo.setIndex(curbRIndices);
  curbRGeo.computeVertexNormals();

  const curbMat = new THREE.MeshStandardMaterial({
    map: curbTex,
    roughness: 0.6,
  });
  const curbLMesh = new THREE.Mesh(curbLGeo, curbMat);
  const curbRMesh = new THREE.Mesh(curbRGeo, curbMat);
  scene.add(curbLMesh, curbRMesh);

  // Barrier Walls
  const barrierLGeo = new THREE.BufferGeometry();
  barrierLGeo.setAttribute('position', new THREE.Float32BufferAttribute(barrierLVerts, 3));
  barrierLGeo.setAttribute('uv', new THREE.Float32BufferAttribute(barrierLUvs, 2));
  barrierLGeo.setIndex(barrierLIndices);
  barrierLGeo.computeVertexNormals();

  const barrierRGeo = new THREE.BufferGeometry();
  barrierRGeo.setAttribute('position', new THREE.Float32BufferAttribute(barrierRVerts, 3));
  barrierRGeo.setAttribute('uv', new THREE.Float32BufferAttribute(barrierRUvs, 2));
  barrierRGeo.setIndex(barrierRIndices);
  barrierRGeo.computeVertexNormals();

  const barrierMat = new THREE.MeshStandardMaterial({
    map: barrierTex,
    roughness: 0.45,
    metalness: 0.4,
    side: THREE.DoubleSide,
  });
  const barrierLMesh = new THREE.Mesh(barrierLGeo, barrierMat);
  const barrierRMesh = new THREE.Mesh(barrierRGeo, barrierMat);
  barrierLMesh.castShadow = true;
  barrierRMesh.castShadow = true;
  scene.add(barrierLMesh, barrierRMesh);

  // 2. Start / Finish Line Quad
  const sfGeo = new THREE.PlaneGeometry(trackHalfWidth * 2, 4);
  sfGeo.rotateX(-Math.PI / 2);
  const sfMat = new THREE.MeshStandardMaterial({
    map: startFinishTex,
    roughness: 0.5,
  });
  const sfMesh = new THREE.Mesh(sfGeo, sfMat);
  sfMesh.position.set(0, 0.08, 70);
  scene.add(sfMesh);

  // 3. Start / Finish Overhead Gantry Arch
  const gantryGroup = new THREE.Group();
  gantryGroup.position.set(0, 0, 70);

  const postMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.8, roughness: 0.3 });
  const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 12, 12), postMat);
  postL.position.set(-trackHalfWidth - 2.5, 6, 0);
  const postR = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 12, 12), postMat);
  postR.position.set(trackHalfWidth + 2.5, 6, 0);

  const beamGeo = new THREE.BoxGeometry(trackHalfWidth * 2 + 7, 2.2, 1.8);
  const beamMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.2 });
  const beamMesh = new THREE.Mesh(beamGeo, beamMat);
  beamMesh.position.set(0, 11.2, 0);

  // Gantry Digital Banner
  const bannerCanvas = document.createElement('canvas');
  bannerCanvas.width = 1024;
  bannerCanvas.height = 128;
  const bCtx = bannerCanvas.getContext('2d')!;
  bCtx.fillStyle = '#020617';
  bCtx.fillRect(0, 0, 1024, 128);
  bCtx.fillStyle = '#00e5ff';
  bCtx.font = '900 64px Orbitron, sans-serif';
  bCtx.textAlign = 'center';
  bCtx.textBaseline = 'middle';
  bCtx.fillText('CIRCUIT  DE  HYUNDAI  N', 512, 64);
  const gantryTex = new THREE.CanvasTexture(bannerCanvas);

  const bannerPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(trackHalfWidth * 2 + 4, 1.8),
    new THREE.MeshBasicMaterial({ map: gantryTex, side: THREE.DoubleSide })
  );
  bannerPlane.position.set(0, 11.2, -0.92);

  gantryGroup.add(postL, postR, beamMesh, bannerPlane);
  scene.add(gantryGroup);

  // 4. Large Pit Building with Garages
  const pitGroup = new THREE.Group();
  pitGroup.position.set(-trackHalfWidth - 24, 0, -30);

  const pitMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.5, roughness: 0.4 });
  const pitMain = new THREE.Mesh(new THREE.BoxGeometry(16, 9, 90), pitMat);
  pitMain.position.y = 4.5;
  pitGroup.add(pitMain);

  // Garage doors & Hyundai N Branding
  const pitGlass = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.9, roughness: 0.1 });
  for (let g = 0; g < 6; g++) {
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4.5, 9), pitGlass);
    door.position.set(8.1, 2.25, -35 + g * 14);
    pitGroup.add(door);
  }
  scene.add(pitGroup);

  // 5. Grandstand (Spectator Stadium)
  const grandstandGroup = new THREE.Group();
  grandstandGroup.position.set(trackHalfWidth + 28, 0, -80);

  const standTierGeo = new THREE.BoxGeometry(18, 12, 110);
  const standMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
  const standMain = new THREE.Mesh(standTierGeo, standMat);
  standMain.position.y = 6;
  grandstandGroup.add(standMain);

  // Canopy Roof
  const canopyGeo = new THREE.BoxGeometry(24, 0.8, 114);
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, metalness: 0.6, roughness: 0.2 });
  const canopy = new THREE.Mesh(canopyGeo, canopyMat);
  canopy.position.set(-2, 13, 0);
  canopy.rotation.z = 0.1;
  grandstandGroup.add(canopy);
  scene.add(grandstandGroup);

  // 6. Jump Pads (Ramps)
  JUMP_PADS.forEach((jp) => {
    const jumpGroup = new THREE.Group();
    jumpGroup.position.set(jp.x, jp.y, jp.z);

    const rampGeo = new THREE.BoxGeometry(jp.width, 1.2, jp.length);
    const rampMat = new THREE.MeshStandardMaterial({
      map: jumpPadTex,
      emissive: 0x00a3e0,
      emissiveIntensity: 0.6,
      roughness: 0.3,
    });
    const rampMesh = new THREE.Mesh(rampGeo, rampMat);
    rampMesh.rotation.x = -0.18; // angled up
    rampMesh.position.y = 0.5;
    jumpGroup.add(rampMesh);

    // Neon glowing edges
    const edgeGeo = new THREE.BoxGeometry(0.6, 1.4, jp.length);
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    const edgeL = new THREE.Mesh(edgeGeo, edgeMat);
    edgeL.position.set(-jp.width / 2, 0.5, 0);
    const edgeR = new THREE.Mesh(edgeGeo, edgeMat);
    edgeR.position.set(jp.width / 2, 0.5, 0);
    jumpGroup.add(edgeL, edgeR);

    scene.add(jumpGroup);
  });

  // 7. Trackside Environment: Terrain Floor & Instanced Foliage Trees
  const terrainGeo = new THREE.PlaneGeometry(1200, 1200, 24, 24);
  terrainGeo.rotateX(-Math.PI / 2);
  const terrainMat = new THREE.MeshStandardMaterial({
    color: 0x0a140d, // Dark grassy forest floor
    roughness: 0.95,
  });
  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.position.y = -0.2;
  terrain.receiveShadow = true;
  scene.add(terrain);

  // Procedural Trees using InstancedMesh
  const treeCount = 90;
  const trunkGeo = new THREE.CylinderGeometry(0.4, 0.6, 4.5, 6);
  const foliageGeo = new THREE.ConeGeometry(2.8, 6.5, 6);
  foliageGeo.translate(0, 5.5, 0);

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 });
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.75 });

  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
  const foliageInst = new THREE.InstancedMesh(foliageGeo, foliageMat, treeCount);
  trunkInst.castShadow = true;
  foliageInst.castShadow = true;

  const dummy = new THREE.Object3D();
  let placed = 0;
  for (let i = 0; i < treeCount; i++) {
    // Scatter trees outside track bounds
    const angle = (i / treeCount) * Math.PI * 2;
    const rad = 140 + Math.random() * 220;
    const tx = Math.cos(angle) * rad + (Math.random() - 0.5) * 80;
    const tz = Math.sin(angle) * rad + (Math.random() - 0.5) * 80;
    const scale = 0.8 + Math.random() * 0.5;

    dummy.position.set(tx, 2, tz);
    dummy.scale.set(scale, scale, scale);
    dummy.rotation.y = Math.random() * Math.PI;
    dummy.updateMatrix();

    trunkInst.setMatrixAt(placed, dummy.matrix);
    foliageInst.setMatrixAt(placed, dummy.matrix);
    placed++;
  }
  trunkInst.computeBoundingSphere();
  foliageInst.computeBoundingSphere();
  scene.add(trunkInst, foliageInst);

  // 8. Floating Item Boxes
  INITIAL_ITEM_BOXES.forEach((ib) => {
    const itemGroup = new THREE.Group();
    itemGroup.position.set(ib.x, ib.y, ib.z);

    // Glowing crystal cube
    const cubeGeo = new THREE.BoxGeometry(1.6, 1.6, 1.6);
    const cubeMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x0077aa,
      emissiveIntensity: 0.8,
      roughness: 0.15,
      metalness: 0.8,
      transparent: true,
      opacity: 0.88,
    });
    const cubeMesh = new THREE.Mesh(cubeGeo, cubeMat);
    itemGroup.add(cubeMesh);

    // Inner question / N icon core
    const coreGeo = new THREE.OctahedronGeometry(0.7);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    itemGroup.add(coreMesh);

    scene.add(itemGroup);
    itemMeshes.set(ib.id, itemGroup);
  });

  return { itemMeshes };
}

/**
 * 3D Procedural Model for 꼬부랑 할머니 (Grandmother with Cane)
 * Significantly scaled up and clearly visible across the circuit
 */
export function createGrandmaModel(scale: number = 1.85): {
  group: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  cane: THREE.Mesh;
} {
  const group = new THREE.Group();
  group.name = 'grandma';
  group.scale.set(scale, scale, scale);

  const sweaterMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 }); // Warm mustard knit cardigan
  const skirtMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.5 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 }); // Gray hair
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 }); // Cane

  // 1. Skirt / Lower Body
  const skirtGeo = new THREE.CylinderGeometry(0.35, 0.5, 0.75, 10);
  const skirt = new THREE.Mesh(skirtGeo, skirtMat);
  skirt.position.y = 0.55;
  group.add(skirt);

  // 2. Bent Torso (Slouched curved back)
  const torsoGeo = new THREE.BoxGeometry(0.55, 0.65, 0.45);
  const torso = new THREE.Mesh(torsoGeo, sweaterMat);
  torso.rotation.x = 0.42; // Curved / slouched forward
  torso.position.set(0, 1.05, -0.15);
  torso.castShadow = true;
  group.add(torso);

  // 3. Head & Bun
  const headGeo = new THREE.SphereGeometry(0.24, 12, 12);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.set(0, 1.48, -0.32);
  group.add(head);

  // Hair bun
  const bunGeo = new THREE.SphereGeometry(0.16, 10, 10);
  const bun = new THREE.Mesh(bunGeo, hairMat);
  bun.position.set(0, 1.62, -0.4);
  group.add(bun);

  // Glasses
  const glassMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
  const glassRim = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.05), glassMat);
  glassRim.position.set(0, 1.48, -0.55);
  group.add(glassRim);

  // 4. Cane (Walking stick)
  const caneGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.15, 8);
  const cane = new THREE.Mesh(caneGeo, woodMat);
  cane.position.set(0.42, 0.58, -0.55);
  cane.rotation.x = -0.15;
  cane.castShadow = true;
  group.add(cane);

  // Cane Handle
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.035, 6, 12, Math.PI), woodMat);
  handle.position.set(0.42, 1.12, -0.6);
  handle.rotation.z = Math.PI / 2;
  group.add(handle);

  // 5. Walking Legs
  const legGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.45, 8);
  const leftLeg = new THREE.Mesh(legGeo, skinMat);
  leftLeg.position.set(-0.16, 0.22, 0);
  const rightLeg = new THREE.Mesh(legGeo, skinMat);
  rightLeg.position.set(0.16, 0.22, 0);
  group.add(leftLeg, rightLeg);

  // Floating Warning Badge (Caution Grandma Crossing!)
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(64, 64, 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 50px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('👵', 64, 64);
  const iconTex = new THREE.CanvasTexture(canvas);
  const iconPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.85, 0.85),
    new THREE.MeshBasicMaterial({ map: iconTex, transparent: true, side: THREE.DoubleSide })
  );
  iconPlane.position.set(0, 2.25, -0.3);
  group.add(iconPlane);

  return { group, leftLeg, rightLeg, cane };
}

/**
 * 3D Procedural Model for Cute Waddling Duck
 * Scaled up for prominent track presence
 */
export function createDuckModel(scale: number = 2.0): {
  group: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
} {
  const group = new THREE.Group();
  group.name = 'duck';
  group.scale.set(scale, scale, scale);

  const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
  const orangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });

  // 1. Chubby Body
  const bodyGeo = new THREE.SphereGeometry(0.38, 12, 12);
  bodyGeo.scale(1, 0.85, 1.25);
  const body = new THREE.Mesh(bodyGeo, yellowMat);
  body.position.y = 0.35;
  body.castShadow = true;
  group.add(body);

  // 2. Duck Head
  const headGeo = new THREE.SphereGeometry(0.24, 12, 12);
  const head = new THREE.Mesh(headGeo, yellowMat);
  head.position.set(0, 0.65, -0.28);
  group.add(head);

  // Orange Beak
  const beakGeo = new THREE.ConeGeometry(0.12, 0.25, 8);
  beakGeo.rotateX(-Math.PI / 2);
  const beak = new THREE.Mesh(beakGeo, orangeMat);
  beak.position.set(0, 0.62, -0.52);
  group.add(beak);

  // Cute Eyes
  const eyeGeo = new THREE.SphereGeometry(0.04, 6, 6);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.16, 0.72, -0.36);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(0.16, 0.72, -0.36);
  group.add(eyeL, eyeR);

  // 3. Wings
  const wingGeo = new THREE.BoxGeometry(0.08, 0.22, 0.38);
  const leftWing = new THREE.Mesh(wingGeo, yellowMat);
  leftWing.position.set(-0.38, 0.42, 0);
  const rightWing = new THREE.Mesh(wingGeo, yellowMat);
  rightWing.position.set(0.38, 0.42, 0);
  group.add(leftWing, rightWing);

  // 4. Webbed Feet
  const footGeo = new THREE.BoxGeometry(0.16, 0.04, 0.24);
  const footL = new THREE.Mesh(footGeo, orangeMat);
  footL.position.set(-0.16, 0.04, -0.05);
  const footR = new THREE.Mesh(footGeo, orangeMat);
  footR.position.set(0.16, 0.04, -0.05);
  group.add(footL, footR);

  // Floating Warning Badge (Caution Duck Crossing!)
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.arc(64, 64, 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 50px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🦆', 64, 64);
  const iconTex = new THREE.CanvasTexture(canvas);
  const iconPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.75, 0.75),
    new THREE.MeshBasicMaterial({ map: iconTex, transparent: true, side: THREE.DoubleSide })
  );
  iconPlane.position.set(0, 1.45, -0.2);
  group.add(iconPlane);

  return { group, leftWing, rightWing };
}

