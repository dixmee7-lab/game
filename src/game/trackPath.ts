import * as THREE from 'three';
import { TrackWaypoint, Obstacle, ItemBox } from '../types';

export const TRACK_WIDTH = 32; // 32m wide asphalt track
export const HALF_WIDTH = TRACK_WIDTH / 2; // 16m
export const WALL_OFFSET = HALF_WIDTH + 1.2;

// Clean, expansive, non-intersecting Grand Prix Circuit (Circuit de Hyundai N)
// Designed with 32m wide asphalt, generous curve radii, safe clearances (>80m), and elevation changes
const CIRCUIT_POINTS: [number, number, number][] = [
  // 1. Main High-Speed Straight (Starts at +70m, stretches straight to -260m)
  [0, 0, 70],      // Start / Finish Line (t ~ 0)
  [0, 0, 0],
  [0, 0, -100],
  [0, 0, -200],
  [0, 0, -280],

  // 2. Turn 1 & 2: Wide sweeping right into technical sector
  [40, 0, -360],
  [120, 1, -410],
  [220, 3, -420],
  [310, 5, -380],

  // 3. Magma Mountain Climb & Hairpin
  [370, 8, -300],
  [380, 10, -200],
  [350, 13, -100],
  [330, 16, 0],     // High elevation ridge
  [340, 17, 100],   // Magma Crest (Jump Pad 1)
  [320, 14, 200],

  // 4. Downhill Carousel
  [270, 10, 300],
  [190, 6, 380],
  [90, 3, 420],
  [-10, 1, 430],
  [-110, 0, 410],

  // 5. West Straight & Hydrogen Cutting (Jump Pad 2 Shortcut)
  [-210, 0, 360],
  [-280, 0, 270],
  [-320, 1, 150],
  [-330, 2, 30],
  [-320, 1, -80],   // Hydrogen Ramp Shortcut
  [-270, 0, -180],

  // 6. Sweeping return to Main Straight (Always separated >80m from Main Straight at X=0)
  [-210, 0, -240],
  [-140, 0, -180],
  [-100, 0, -60],
  [-80, 0, 60],
  [-60, 0, 150],
  [-30, 0, 180],
  [0, 0, 140],      // Approaches Main Straight smoothly from behind
];

// Closed CatmullRomCurve3
export const trackCurve = new THREE.CatmullRomCurve3(
  CIRCUIT_POINTS.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
  true, // closed loop
  'catmullrom',
  0.5
);

export const WAYPOINT_COUNT = 300;
export const TRACK_WAYPOINTS: TrackWaypoint[] = [];

for (let i = 0; i < WAYPOINT_COUNT; i++) {
  const t = i / WAYPOINT_COUNT;
  const pos = trackCurve.getPointAt(t);
  const tangent = trackCurve.getTangentAt(t).normalize();
  // Normal vector perpendicular to tangent on XZ plane
  const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

  TRACK_WAYPOINTS.push({
    x: pos.x,
    y: pos.y,
    z: pos.z,
    tangentX: tangent.x,
    tangentZ: tangent.z,
    normalX: normal.x,
    normalZ: normal.z,
    width: TRACK_WIDTH,
  });
}

export const TRACK_LENGTH = trackCurve.getLength();

// Jump Pads & Shortcut Ramps
export const JUMP_PADS = [
  {
    id: 'jump-magma-1',
    x: 340,
    y: 17,
    z: 100,
    width: 16,
    length: 12,
    boostForce: 35,
    name: 'Magma Crest Jump',
  },
  {
    id: 'jump-hydrogen-2',
    x: -320,
    y: 1.5,
    z: -80,
    width: 14,
    length: 12,
    boostForce: 35,
    name: 'N-Vision Shortcut Ramp',
  },
];

// Obstacles placed safely around corners, never blocking the starting straight!
export const INITIAL_OBSTACLES: Obstacle[] = [
  { id: 'oil-1', type: 'oil', x: 260, y: 3.5, z: -400, radius: 4.5, hitCount: 0 },
  { id: 'oil-2', type: 'oil', x: 360, y: 11, z: -150, radius: 4.5, hitCount: 0 },
  { id: 'oil-3', type: 'oil', x: 140, y: 4.5, z: 400, radius: 4.5, hitCount: 0 },
  { id: 'oil-4', type: 'oil', x: -325, y: 1.5, z: 80, radius: 4.5, hitCount: 0 },
  { id: 'cone-1', type: 'cone', x: 50, y: 0, z: -370, radius: 1.8, hitCount: 0 },
  { id: 'cone-2', type: 'cone', x: 275, y: 10, z: 290, radius: 1.8, hitCount: 0 },
  { id: 'cone-3', type: 'cone', x: -80, y: 0, z: 415, radius: 1.8, hitCount: 0 },
  { id: 'cone-4', type: 'cone', x: -140, y: 0, z: -170, radius: 1.8, hitCount: 0 },
];

// Item Box Gatings placed along the circuit (Start straight, hill, and back straight)
export const INITIAL_ITEM_BOXES: ItemBox[] = [
  // Gantry 1: Mid Main Straight (Z = -120, well ahead of start line at Z = 70)
  { id: 'item-1a', x: -8, y: 1.5, z: -120, respawnTime: 0 },
  { id: 'item-1b', x: 0, y: 1.5, z: -120, respawnTime: 0 },
  { id: 'item-1c', x: 8, y: 1.5, z: -120, respawnTime: 0 },
  // Gantry 2: Turn 2 exit
  { id: 'item-2a', x: 345, y: 6.5, z: -320, respawnTime: 0 },
  { id: 'item-2b', x: 355, y: 6.5, z: -310, respawnTime: 0 },
  // Gantry 3: Downhill carousel exit
  { id: 'item-3a', x: -20, y: 1.5, z: 430, respawnTime: 0 },
  { id: 'item-3b', x: 0, y: 1.5, z: 430, respawnTime: 0 },
  // Gantry 4: West straight
  { id: 'item-4a', x: -325, y: 1.5, z: 120, respawnTime: 0 },
  { id: 'item-4b', x: -315, y: 1.5, z: 120, respawnTime: 0 },
];

/**
 * Finds the closest track progress (0 to 1) and lateral distance from center line
 * Global search across waypoints ensures it NEVER gets lost or locked to an incorrect segment
 */
export function getTrackProjection(x: number, z: number): {
  progress: number;
  centerPoint: THREE.Vector3;
  lateralDistance: number;
  tangent: THREE.Vector3;
  normal: THREE.Vector3;
} {
  let bestIdx = 0;
  let bestDistSq = Infinity;

  // Ultra-fast global search across all 300 waypoints (0.01ms in JS)
  for (let i = 0; i < WAYPOINT_COUNT; i++) {
    const wp = TRACK_WAYPOINTS[i];
    const dx = wp.x - x;
    const dz = wp.z - z;
    const distSq = dx * dx + dz * dz;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      bestIdx = i;
    }
  }

  const baseProgress = bestIdx / WAYPOINT_COUNT;
  let refinedT = baseProgress;
  const fineSteps = 6;
  const fineStepSize = 1 / (WAYPOINT_COUNT * 4);

  for (let s = -fineSteps; s <= fineSteps; s++) {
    let t = (baseProgress + s * fineStepSize) % 1.0;
    if (t < 0) t += 1.0;
    const pt = trackCurve.getPointAt(t);
    const dx = pt.x - x;
    const dz = pt.z - z;
    const distSq = dx * dx + dz * dz;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      refinedT = t;
    }
  }

  const centerPoint = trackCurve.getPointAt(refinedT);
  const tangent = trackCurve.getTangentAt(refinedT).normalize();
  const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

  const dx = x - centerPoint.x;
  const dz = z - centerPoint.z;
  const lateralDistance = dx * normal.x + dz * normal.z;

  return {
    progress: refinedT,
    centerPoint,
    lateralDistance,
    tangent,
    normal,
  };
}

/**
 * Wall collision detection & resolution
 * Prevents cars from falling off the 32m track while allowing smooth sliding along barriers
 */
export function resolveWallCollision(
  x: number,
  y: number,
  z: number,
  carRadius: number = 1.6
): {
  collided: boolean;
  x: number;
  y: number;
  z: number;
  tangent: THREE.Vector3;
  normal: THREE.Vector3;
} {
  const proj = getTrackProjection(x, z);
  const maxLateral = HALF_WIDTH - carRadius; // 16 - 1.6 = 14.4m

  if (Math.abs(proj.lateralDistance) > maxLateral) {
    const sign = Math.sign(proj.lateralDistance);
    const clampedLateral = sign * maxLateral;

    // Reposition gently inside the track
    const correctedX = proj.centerPoint.x + proj.normal.x * clampedLateral;
    const correctedZ = proj.centerPoint.z + proj.normal.z * clampedLateral;

    const wallNormal = new THREE.Vector3(
      -sign * proj.normal.x,
      0,
      -sign * proj.normal.z
    ).normalize();

    return {
      collided: true,
      x: correctedX,
      y: proj.centerPoint.y,
      z: correctedZ,
      tangent: proj.tangent,
      normal: wallNormal,
    };
  }

  return {
    collided: false,
    x,
    y: proj.centerPoint.y,
    z,
    tangent: proj.tangent,
    normal: new THREE.Vector3(0, 1, 0),
  };
}
