import * as THREE from 'three';
import { RacerState, ItemType } from '../types';
import { ControlInput, KartPhysics } from './physics';
import { trackCurve, getTrackProjection } from './trackPath';

export interface AiProfile {
  targetOffset: number; // Lateral offset from center (-8 to +8)
  aggression: number; // 0.8 to 1.1
  driftSensitivity: number; // how early they initiate drift
  itemCooldown: number;
  stuckTimer: number;
}

export class AiManager {
  private profiles = new Map<string, AiProfile>();

  public registerAi(id: string, offset: number, aggression: number) {
    this.profiles.set(id, {
      targetOffset: offset,
      aggression: Math.max(1.15, aggression * 1.2), // Boosted AI aggression
      driftSensitivity: 0.22,
      itemCooldown: 1.5 + Math.random() * 2,
      stuckTimer: 0,
    });
  }

  public updateAiRacer(
    racer: RacerState,
    delta: number,
    dynamicObstacles?: any[],
    allRacers?: RacerState[]
  ) {
    const profile = this.profiles.get(racer.id) || {
      targetOffset: 0,
      aggression: 1.2,
      driftSensitivity: 0.22,
      itemCooldown: 2.0,
      stuckTimer: 0,
    };

    // 1. Anti-Stuck & Collision Recovery Watchdog
    if (racer.speed < 40) {
      profile.stuckTimer = (profile.stuckTimer || 0) + delta;
    } else {
      profile.stuckTimer = Math.max(0, (profile.stuckTimer || 0) - delta * 2);
    }

    // If pinned or moving too slowly for >0.45s, trigger emergency recovery burst!
    if (profile.stuckTimer > 0.45) {
      racer.speed = Math.max(80, racer.speed + 90 * delta);
      const proj = getTrackProjection(racer.position[0], racer.position[2]);
      const targetTrackYaw = Math.atan2(-proj.tangent.x, -proj.tangent.z);
      let diff = (targetTrackYaw - racer.rotation[1]) % (Math.PI * 2);
      if (diff > Math.PI) diff -= Math.PI * 2;
      if (diff < -Math.PI) diff += Math.PI * 2;
      racer.rotation[1] += diff * Math.min(1.0, 6.0 * delta);
      racer.isDrifting = false;
      racer.driftGauge = 0;
      if (profile.stuckTimer > 1.2) {
        profile.stuckTimer = 0;
      }
    }

    // 2. Smart lookahead based on speed
    const lookAheadDistance = 0.045 * profile.aggression;
    const lookAheadProgress = (racer.lapProgress + lookAheadDistance) % 1.0;
    const targetPt = trackCurve.getPointAt(lookAheadProgress);
    const tangent = trackCurve.getTangentAt(lookAheadProgress).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    // Corner apex cutting: pull offset towards the inside on turns
    let effectiveOffset = profile.targetOffset;
    const nextPt = trackCurve.getPointAt((lookAheadProgress + 0.04) % 1.0);
    const turnDirection = (nextPt.x - targetPt.x) * tangent.z - (nextPt.z - targetPt.z) * tangent.x;
    if (Math.abs(turnDirection) > 0.05) {
      effectiveOffset *= 0.4; // Cut to apex
    }

    // 3. Inter-Vehicle Avoidance (Push offset away from nearby karts so they don't tangle)
    if (allRacers) {
      for (const other of allRacers) {
        if (other.id === racer.id) continue;
        const edx = other.position[0] - racer.position[0];
        const edz = other.position[2] - racer.position[2];
        const distSq = edx * edx + edz * edz;
        if (distSq < 36 && distSq > 0.01) {
          const dist = Math.sqrt(distSq);
          const relAngle = Math.atan2(-edx, -edz) - racer.rotation[1];
          const sinRel = Math.sin(relAngle);
          const repulsion = ((6.0 - dist) / 6.0) * 5.0;
          effectiveOffset += sinRel > 0 ? -repulsion : repulsion;
        }
      }
    }

    // 4. Obstacle Avoidance (Grandma 👵 & Duck 🦆 radar avoidance)
    if (dynamicObstacles) {
      for (const obs of dynamicObstacles) {
        const odx = obs.x - racer.position[0];
        const odz = obs.z - racer.position[2];
        const distSq = odx * odx + odz * odz;
        if (distSq < 225 && distSq > 9) { // within 3m - 15m
          const headingX = -Math.sin(racer.rotation[1]);
          const headingZ = -Math.cos(racer.rotation[1]);
          const dist = Math.sqrt(distSq);
          const dot = (odx * headingX + odz * headingZ) / dist;
          if (dot > 0.65) {
            const cross = headingX * odz - headingZ * odx;
            effectiveOffset += cross > 0 ? -4.5 : 4.5;
          }
        }
      }
    }

    effectiveOffset = Math.max(-11, Math.min(11, effectiveOffset));

    const targetX = targetPt.x + normal.x * effectiveOffset;
    const targetZ = targetPt.z + normal.z * effectiveOffset;

    // Angle to target point
    const dx = targetX - racer.position[0];
    const dz = targetZ - racer.position[2];
    const targetAngle = Math.atan2(-dx, -dz);

    // Current heading difference
    let angleDiff = targetAngle - racer.rotation[1];
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    // Aggressive drift on curves
    const isSharpCorner = Math.abs(angleDiff) > profile.driftSensitivity;
    const isDrifting = isSharpCorner && racer.speed > 55;

    // AI periodic item acquisition & smart tactical usage
    if (racer.hasItem === 'none') {
      profile.itemCooldown -= delta;
      if (profile.itemCooldown <= 0) {
        const items = ['booster', 'fuel-boost', 'wing-flight'];
        racer.hasItem = items[Math.floor(Math.random() * items.length)] as any;
        profile.itemCooldown = 5 + Math.random() * 4;
      }
    }

    let useItem = false;
    if (racer.hasItem !== 'none') {
      // Use boost on straights
      if (!isSharpCorner && racer.speed > 95) {
        useItem = true;
      }
    }

    // Faster AI response & counter-steering
    const input: ControlInput = {
      forward: true,
      backward: false,
      left: angleDiff > 0.025,
      right: angleDiff < -0.025,
      drift: isDrifting,
      useItem,
    };

    KartPhysics.update(racer, input, delta, undefined, dynamicObstacles);
  }
}

export const aiManager = new AiManager();
