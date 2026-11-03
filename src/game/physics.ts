import * as THREE from 'three';
import { RacerState, ItemType, Obstacle } from '../types';
import { HYUNDAI_N_CARS } from '../constants/vehicles';
import { resolveWallCollision, JUMP_PADS, INITIAL_OBSTACLES } from './trackPath';
import { soundEngine } from '../audio/soundEngine';

export interface ControlInput {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  drift: boolean;
  useItem: boolean;
}

export class KartPhysics {
  // Reusable vectors to avoid per-frame GC allocations
  private static _forward = new THREE.Vector3();
  private static _up = new THREE.Vector3(0, 1, 0);

  /**
   * Update a racer's physics for one frame
   */
  public static update(
    racer: RacerState,
    input: ControlInput,
    delta: number,
    onItemUsed?: (item: ItemType) => void,
    dynamicObstacles?: Obstacle[]
  ) {
    const spec = HYUNDAI_N_CARS.find((c) => c.id === racer.carId) || HYUNDAI_N_CARS[0];

    // Timers
    if (racer.boostTimeRemaining > 0) {
      racer.boostTimeRemaining -= delta;
      if (racer.boostTimeRemaining <= 0) {
        racer.isBoosting = false;
        racer.isHyperBoosting = false;
      }
    }

    if (racer.flyingTimeRemaining > 0) {
      racer.flyingTimeRemaining -= delta;
      if (racer.flyingTimeRemaining <= 0) {
        racer.isFlying = false;
      }
    }

    if (racer.invulnerableTimeRemaining > 0) {
      racer.invulnerableTimeRemaining -= delta;
    }

    // Item activation trigger
    if (input.useItem && racer.hasItem !== 'none') {
      const item = racer.hasItem;
      racer.hasItem = 'none';

      if (item === 'booster') {
        racer.isBoosting = true;
        racer.boostTimeRemaining = 2.4;
        if (racer.isPlayer) {
          soundEngine.playBoostStart(false);
        }
      } else if (item === 'fuel-boost') {
        racer.isBoosting = true;
        racer.isHyperBoosting = true;
        racer.boostTimeRemaining = 4.0;
        if (racer.isPlayer) {
          soundEngine.playBoostStart(true);
        }
      } else if (item === 'wing-flight') {
        racer.isFlying = true;
        racer.flyingTimeRemaining = 2.0; // 2 seconds flight duration as requested
        racer.isBoosting = true;
        racer.boostTimeRemaining = 2.0;
        if (racer.isPlayer) {
          soundEngine.playWingDeploy();
        }
      }

      if (onItemUsed) {
        onItemUsed(item);
      }
    }

    // Target speeds (km/h)
    let maxSpeed = spec.topSpeed;
    if (racer.isHyperBoosting) {
      maxSpeed = spec.topSpeed * 1.35; // 280+ km/h hyper boost
    } else if (racer.isBoosting) {
      maxSpeed = spec.topSpeed * 1.18;
    }

    // Acceleration & Braking (Arcade Kart punchy launch)
    const baseAccel = 72;
    const accelRate = baseAccel * (spec.acceleration / 10) * (racer.isHyperBoosting ? 2.4 : racer.isBoosting ? 1.7 : 1.0);
    const brakeRate = 60;
    const dragRate = 10;

    if (input.forward) {
      racer.speed = Math.min(maxSpeed, racer.speed + accelRate * delta);
    } else if (input.backward) {
      if (racer.speed > 5) {
        racer.speed = Math.max(0, racer.speed - brakeRate * delta);
      } else {
        racer.speed = Math.max(-45, racer.speed - 30 * delta); // Reverse
      }
    } else {
      // Natural rolling resistance
      if (racer.speed > 0) {
        racer.speed = Math.max(0, racer.speed - dragRate * delta);
      } else if (racer.speed < 0) {
        racer.speed = Math.min(0, racer.speed + dragRate * delta);
      }
    }

    // Drift Mechanics
    const speedRatio = Math.abs(racer.speed) / 100;
    const canDrift = input.drift && (input.left || input.right) && racer.speed > 30 && !racer.isFlying;

    if (canDrift) {
      if (!racer.isDrifting) {
        racer.isDrifting = true;
        racer.driftDirection = input.left ? -1 : 1;
        if (racer.isPlayer) {
          soundEngine.playPopAndBang();
        }
      }

      // Drift gauge accumulation
      // N Vision 74 special trait: 1.35x drift charge speed
      const driftMultiplier = racer.carId === 'n-vision-74' ? 1.35 : 1.0;
      racer.driftGauge = Math.min(100, racer.driftGauge + 42 * driftMultiplier * delta);

      // Automatic Mini-Turbo when gauge hits 100%
      if (racer.driftGauge >= 100) {
        racer.driftGauge = 0;
        racer.isBoosting = true;
        racer.boostTimeRemaining = 2.4;
        if (racer.isPlayer) {
          soundEngine.playBoostStart(false);
          soundEngine.playPopAndBang();
        }
      }
    } else {
      racer.isDrifting = false;
      racer.driftDirection = 0;
      // Decay drift gauge slowly if released before 100%
      if (racer.driftGauge > 0) {
        racer.driftGauge = Math.max(0, racer.driftGauge - 18 * delta);
      }
    }

    // Steering & Turn Rate
    let steerRate = 2.4 * (spec.handling / 10);
    if (racer.isDrifting) {
      steerRate *= 1.4; // Sharper angle in drift
    }

    let steerInput = 0;
    if (input.left) steerInput += 1;
    if (input.right) steerInput -= 1;

    if (steerInput !== 0) {
      const turnAmount = steerInput * steerRate * Math.min(1.2, speedRatio + 0.3) * delta;
      racer.rotation[1] += turnAmount;
    }

    // Position Update (Speed in km/h -> m/s is / 3.6)
    const speedMs = racer.speed / 3.6;
    let headingYaw = racer.rotation[1];

    // In drift, actual velocity slides outward
    if (racer.isDrifting) {
      headingYaw -= racer.driftDirection * 0.28;
    }

    // Step forward along heading
    racer.position[0] -= Math.sin(headingYaw) * speedMs * delta;
    racer.position[2] -= Math.cos(headingYaw) * speedMs * delta;

    // Safety Wall Collisions & Ground Elevation (Evaluated after position step)
    const roadProj = resolveWallCollision(
      racer.position[0],
      racer.position[1],
      racer.position[2],
      1.6
    );

    // Track surface elevation (+ flight height)
    const targetHeight = roadProj.y + 0.05 + (racer.isFlying ? 4.5 : 0);
    racer.position[1] = THREE.MathUtils.damp(racer.position[1], targetHeight, 18.0, delta);

    // Jump Pad Collision Check
    if (!racer.isFlying) {
      JUMP_PADS.forEach((jp) => {
        const dx = racer.position[0] - jp.x;
        const dz = racer.position[2] - jp.z;
        if (Math.abs(dx) < jp.width / 2 && Math.abs(dz) < jp.length / 2) {
          // Launch into air with boost!
          racer.isBoosting = true;
          racer.boostTimeRemaining = 2.5;
          racer.speed = Math.max(racer.speed, 210);
          racer.position[1] = Math.max(racer.position[1], jp.y + 3.0);
          if (racer.isPlayer) {
            soundEngine.playJumpPad();
          }
        }
      });
    }

    // Obstacle Interaction (Oil slick, cone, Grandma, Ducks)
    if (!racer.isFlying && racer.invulnerableTimeRemaining <= 0) {
      const obstacleList = dynamicObstacles || INITIAL_OBSTACLES;
      obstacleList.forEach((obs) => {
        const dx = racer.position[0] - obs.x;
        const dz = racer.position[2] - obs.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < obs.radius + 1.2) {
          obs.hitCount++;
          racer.invulnerableTimeRemaining = 2.0; // 2 seconds protection

          if (obs.type === 'grandma') {
            // Hit Grandma: major slowdown + cane horn sound
            racer.speed = Math.max(15, racer.speed * 0.35);
            racer.rotation[1] += (Math.random() - 0.5) * 0.4;
            if (racer.isPlayer) {
              soundEngine.playGrandmaHorn();
            }
          } else if (obs.type === 'duck') {
            // Hit Duck: slowdown + quack sound
            racer.speed = Math.max(25, racer.speed * 0.5);
            if (racer.isPlayer) {
              soundEngine.playQuack();
            }
          } else {
            // Oil slick / cone
            racer.speed = Math.max(25, racer.speed * 0.65);
            racer.rotation[1] += (Math.random() - 0.5) * 0.25;
            if (racer.isPlayer) {
              soundEngine.playObstacleHit();
            }
          }
        }
      });
    }

    // Safety Wall Collisions - Shock absorption & smooth barrier glide (Zero bouncing/jitter, especially during boost)
    if (roadProj.collided) {
      racer.position[0] = roadProj.x;
      racer.position[2] = roadProj.z;

      // Gently align heading parallel to wall tangent with angle unwrapping (eliminates 360-deg snap spin / pinball bouncing)
      const trackYaw = Math.atan2(-roadProj.tangent.x, -roadProj.tangent.z);
      let angleDiff = (trackYaw - racer.rotation[1]) % (Math.PI * 2);
      if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      const targetYaw = racer.rotation[1] + angleDiff;
      racer.rotation[1] = THREE.MathUtils.damp(racer.rotation[1], targetYaw, 7.5, delta);

      // Slide smoothly along barrier without harsh braking or bounce
      if (racer.isHyperBoosting || racer.isBoosting) {
        racer.speed = Math.max(90, racer.speed - 35 * delta);
      } else {
        racer.speed = Math.max(30, racer.speed - 20 * delta);
      }
    }
  }

  /**
   * Vehicle-to-Vehicle collision resolution
   * Separates touching karts and prevents them from freezing/getting stuck together
   */
  public static resolveVehicleCollisions(racers: RacerState[], delta: number) {
    const CAR_RADIUS = 1.6;
    const MIN_DIST = CAR_RADIUS * 2; // 3.2m
    const MIN_DIST_SQ = MIN_DIST * MIN_DIST;

    for (let i = 0; i < racers.length; i++) {
      const rA = racers[i];
      if (rA.isFlying) continue;

      for (let j = i + 1; j < racers.length; j++) {
        const rB = racers[j];
        if (rB.isFlying) continue;

        const dx = rB.position[0] - rA.position[0];
        const dz = rB.position[2] - rA.position[2];
        const distSq = dx * dx + dz * dz;

        if (distSq < MIN_DIST_SQ && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const overlap = (MIN_DIST - dist) * 0.5;
          const nx = dx / dist;
          const nz = dz / dist;

          // Soft lateral push apart
          rA.position[0] -= nx * overlap;
          rA.position[2] -= nz * overlap;
          rB.position[0] += nx * overlap;
          rB.position[2] += nz * overlap;

          // Maintain rolling momentum so karts never freeze or stall when colliding
          const minRollingSpeed = 55;
          if (rA.speed < minRollingSpeed) {
            rA.speed = Math.min(minRollingSpeed, rA.speed + 60 * delta);
          }
          if (rB.speed < minRollingSpeed) {
            rB.speed = Math.min(minRollingSpeed, rB.speed + 60 * delta);
          }

          // Gentle angle separation deflection
          rA.rotation[1] -= nx * 0.04;
          rB.rotation[1] += nx * 0.04;
        }
      }
    }
  }
}
