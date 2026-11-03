import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RacerState, CarModelId, ItemType, RacerMapPoint, Obstacle } from '../types';
import { ControlInput, KartPhysics } from '../game/physics';
import { createVehicleModel, buildTrackEnvironment, createGrandmaModel, createDuckModel } from '../game/proceduralModels';
import { getTrackProjection, INITIAL_ITEM_BOXES, INITIAL_OBSTACLES, TRACK_LENGTH } from '../game/trackPath';
import { aiManager } from '../game/aiController';
import { soundEngine } from '../audio/soundEngine';
import { multiplayerNet } from '../network/multiplayer';

interface GameCanvasProps {
  playerCarId: CarModelId;
  playerName: string;
  isMultiplayer: boolean;
  inputState: ControlInput;
  onLapProgress: (lap: number, progress: number, speed: number, rank: number, driftGauge: number, item: ItemType, isFinished: boolean) => void;
  onLapComplete: (lap: number, lapTime: number) => void;
  onRaceFinish: (results: { rank: number; totalTime: number; bestLap: number }) => void;
  onRacersUpdate?: (racers: RacerMapPoint[], obstacles: Obstacle[]) => void;
  isGameStarted: boolean;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  playerCarId,
  playerName,
  isMultiplayer,
  inputState,
  onLapProgress,
  onLapComplete,
  onRaceFinish,
  onRacersUpdate,
  isGameStarted,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef(inputState);
  inputRef.current = inputState;

  const isStartedRef = useRef(isGameStarted);
  isStartedRef.current = isGameStarted;

  const playerCarIdRef = useRef(playerCarId);
  playerCarIdRef.current = playerCarId;

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Detect software WebGL
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Setup Three.js Renderer
    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    containerRef.current.appendChild(renderer.domElement);

    // 3. Setup Scene & Environment
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d16);
    scene.fog = new THREE.FogExp2(0x090d16, 0.0032);

    try {
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    } catch (e) {
      console.warn('RoomEnvironment fallback:', e);
    }

    // Camera setup (Behind start line at Z = 70, looking forward down straight)
    const camera = new THREE.PerspectiveCamera(65, width / height, 0.5, 900);
    camera.position.set(0, 4.5, 75);

    // 4. Lighting Rig (Key Warm Sun, Cool Sky Fill, Rim)
    const sunLight = new THREE.DirectionalLight(0xfff3e0, 2.4);
    sunLight.position.set(120, 180, 90);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 450;
    const d = 110;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0x7fb5d4, 0x111625, 1.2);
    scene.add(hemiLight);

    // 5. Track & Environment Setup
    const { itemMeshes } = buildTrackEnvironment(scene);

    // 6. Setup Racers
    // Player Racer State (Starts at Z = 65, facing forward toward negative Z)
    const playerRacer: RacerState = {
      id: 'player',
      name: playerName || 'You (N Driver)',
      carId: playerCarIdRef.current,
      isPlayer: true,
      isAi: false,
      position: [0, 0.08, 65],
      rotation: [0, 0, 0],
      speed: 0,
      driftGauge: 0,
      isDrifting: false,
      driftDirection: 0,
      isBoosting: false,
      isHyperBoosting: false,
      boostTimeRemaining: 0,
      isFlying: false,
      flyingTimeRemaining: 0,
      invulnerableTimeRemaining: 0,
      hasItem: 'fuel-boost',
      currentLap: 1,
      lapProgress: 0,
      totalDistance: 0,
      rank: 1,
      lapTimes: [],
      bestLapTime: null,
      finishTime: null,
      isFinished: false,
    };

    const playerVehicle = createVehicleModel(playerRacer.carId);
    scene.add(playerVehicle.group);

    // AI Racers (for Single Player)
    const aiCars: { state: RacerState; vehicle: ReturnType<typeof createVehicleModel> }[] = [];
    const aiSpecs: { id: string; name: string; carId: CarModelId; offset: number; startZ: number }[] = [
      { id: 'ai-1', name: 'N-Vision AI', carId: 'n-vision-74', offset: -5.5, startZ: 78 },
      { id: 'ai-2', name: 'Magma GT AI', carId: 'genesis-magma-gt', offset: 5.5, startZ: 88 },
      { id: 'ai-3', name: 'RN22e AI', carId: 'rn22e', offset: 0, startZ: 98 },
    ];

    if (!isMultiplayer) {
      aiSpecs.forEach((spec) => {
        const aiState: RacerState = {
          id: spec.id,
          name: spec.name,
          carId: spec.carId,
          isPlayer: false,
          isAi: true,
          position: [spec.offset, 0.08, spec.startZ],
          rotation: [0, 0, 0],
          speed: 0,
          driftGauge: 0,
          isDrifting: false,
          driftDirection: 0,
          isBoosting: false,
          isHyperBoosting: false,
          boostTimeRemaining: 0,
          isFlying: false,
          flyingTimeRemaining: 0,
          invulnerableTimeRemaining: 0,
          hasItem: 'none',
          currentLap: 1,
          lapProgress: 0,
          totalDistance: 0,
          rank: 2,
          lapTimes: [],
          bestLapTime: null,
          finishTime: null,
          isFinished: false,
        };
        const aiVeh = createVehicleModel(spec.carId);
        scene.add(aiVeh.group);
        aiCars.push({ state: aiState, vehicle: aiVeh });
        aiManager.registerAi(spec.id, spec.offset, 0.95 + Math.random() * 0.1);
      });
    }

    // Remote Players Map for Multiplayer
    const remoteVehicles = new Map<string, ReturnType<typeof createVehicleModel>>();

    // 7. Particle Systems
    // Exhaust Boost Flame Particles
    const flameCount = 45;
    const flameGeo = new THREE.BufferGeometry();
    const flamePositions = new Float32Array(flameCount * 3);
    const flameColors = new Float32Array(flameCount * 3);
    flameGeo.setAttribute('position', new THREE.BufferAttribute(flamePositions, 3));
    flameGeo.setAttribute('color', new THREE.BufferAttribute(flameColors, 3));

    const flameMat = new THREE.PointsMaterial({
      size: 0.9,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const flameParticles = new THREE.Points(flameGeo, flameMat);
    scene.add(flameParticles);

    // Drift Sparks / Smoke Particles
    const driftCount = 60;
    const driftGeo = new THREE.BufferGeometry();
    const driftPositions = new Float32Array(driftCount * 3);
    driftGeo.setAttribute('position', new THREE.BufferAttribute(driftPositions, 3));
    const driftMat = new THREE.PointsMaterial({
      size: 0.7,
      color: 0xffaa00,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const driftParticles = new THREE.Points(driftGeo, driftMat);
    scene.add(driftParticles);

    // Shield Mesh for Invulnerability
    const shieldGeo = new THREE.SphereGeometry(2.4, 16, 16);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    });
    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    shieldMesh.visible = false;
    scene.add(shieldMesh);

    // 8. 꼬부랑 할머니 (Multiple Grandmothers crossing track at intermediate spots)
    const grandmasConfig = [
      { id: 'grandma-1', baseX: 0, baseY: 0.05, baseZ: -160, nx: 1, nz: 0, walkTime: 0, speed: 1.4, width: 11 },
      { id: 'grandma-2', baseX: 200, baseY: 3.0, baseZ: -415, nx: -0.2, nz: 0.98, walkTime: 1.2, speed: 1.3, width: 11 },
      { id: 'grandma-3', baseX: 360, baseY: 11.0, baseZ: -150, nx: -0.98, nz: -0.2, walkTime: 2.5, speed: 1.5, width: 11 },
      { id: 'grandma-4', baseX: 50, baseY: 2.0, baseZ: 425, nx: 0.1, nz: -0.99, walkTime: 0.8, speed: 1.4, width: 11 },
      { id: 'grandma-5', baseX: -320, baseY: 1.0, baseZ: 60, nx: 0.99, nz: 0.05, walkTime: 3.1, speed: 1.3, width: 11 },
      { id: 'grandma-6', baseX: -100, baseY: 0.05, baseZ: -60, nx: 0.8, nz: -0.6, walkTime: 1.9, speed: 1.4, width: 11 },
    ];

    const grandmas = grandmasConfig.map((cfg) => {
      const model = createGrandmaModel(1.85); // Significantly enlarged
      scene.add(model.group);
      return { ...cfg, model };
    });

    // 9. 오리 가족 (Multiple Duck Flocks waddling across track at intermediate spots)
    const duckFlocksConfig = [
      { id: 'flock-1', baseX: 0, baseY: 0.05, baseZ: -270, nx: 1, nz: 0, walkTime: 0.5, speed: 1.3, width: 10 },
      { id: 'flock-2', baseX: 130, baseY: 1.5, baseZ: -410, nx: 0.4, nz: 0.9, walkTime: 1.8, speed: 1.4, width: 10 },
      { id: 'flock-3', baseX: 330, baseY: 16.0, baseZ: 10, nx: -0.98, nz: 0.2, walkTime: 2.9, speed: 1.2, width: 10 },
      { id: 'flock-4', baseX: 160, baseY: 5.0, baseZ: 390, nx: -0.7, nz: 0.7, walkTime: 0.2, speed: 1.4, width: 10 },
      { id: 'flock-5', baseX: -315, baseY: 1.0, baseZ: 180, nx: 0.99, nz: 0.05, walkTime: 2.1, speed: 1.3, width: 10 },
      { id: 'flock-6', baseX: -50, baseY: 0.05, baseZ: 160, nx: 0.9, nz: -0.4, walkTime: 1.4, speed: 1.4, width: 10 },
    ];

    const duckFlocks = duckFlocksConfig.map((cfg) => {
      const mama = createDuckModel(2.2); // Large Mama Duck
      const baby1 = createDuckModel(1.5); // Large Baby Ducks
      const baby2 = createDuckModel(1.5);
      const baby3 = createDuckModel(1.5);
      scene.add(mama.group, baby1.group, baby2.group, baby3.group);
      return { ...cfg, mama, baby1, baby2, baby3 };
    });

    // Pre-warm shaders
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Timing & Lap Tracking
    const clock = new THREE.Clock();
    let currentLapStartTime = 0;
    let raceStartTime = 0;
    let netSyncTimer = 0;

    // Software WebGL pacing helper
    let frameId = 0;
    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    // Animation Tick
    const tick = () => {
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsedTime = clock.getElapsedTime();

      if (isStartedRef.current && raceStartTime === 0) {
        raceStartTime = elapsedTime;
        currentLapStartTime = elapsedTime;
      }

      // Collect all dynamic obstacles across the circuit
      const dynamicObstacles: Obstacle[] = [...INITIAL_OBSTACLES];

      // Update All Grandmothers
      grandmas.forEach((gm) => {
        gm.walkTime += delta * gm.speed;
        const lateral = Math.sin(gm.walkTime * 0.35) * gm.width;
        const dir = Math.cos(gm.walkTime * 0.35) >= 0 ? 1 : -1;
        const gx = gm.baseX + gm.nx * lateral;
        const gz = gm.baseZ + gm.nz * lateral;

        gm.model.group.position.set(gx, gm.baseY, gz);
        const headingAngle = Math.atan2(gm.nx * dir, gm.nz * dir);
        gm.model.group.rotation.y = headingAngle;
        gm.model.leftLeg.rotation.x = Math.sin(gm.walkTime * 4) * 0.45;
        gm.model.rightLeg.rotation.x = -Math.sin(gm.walkTime * 4) * 0.45;
        gm.model.cane.rotation.x = -0.15 + Math.sin(gm.walkTime * 4) * 0.25;

        dynamicObstacles.push({
          id: gm.id,
          type: 'grandma',
          x: gx,
          y: gm.baseY,
          z: gz,
          radius: 2.5,
          hitCount: 0,
        });
      });

      // Update All Duck Flocks
      duckFlocks.forEach((df) => {
        df.walkTime += delta * df.speed;
        const lateral = Math.sin(df.walkTime * 0.3) * df.width;
        const dir = Math.cos(df.walkTime * 0.3) >= 0 ? 1 : -1;
        const headingAngle = Math.atan2(df.nx * dir, df.nz * dir);

        // Mama Duck
        const mx = df.baseX + df.nx * lateral;
        const mz = df.baseZ + df.nz * lateral;
        df.mama.group.position.set(mx, df.baseY, mz);
        df.mama.group.rotation.y = headingAngle;
        df.mama.leftWing.rotation.z = Math.sin(df.walkTime * 8) * 0.35;
        df.mama.rightWing.rotation.z = -Math.sin(df.walkTime * 8) * 0.35;

        dynamicObstacles.push({
          id: `${df.id}-mama`,
          type: 'duck',
          x: mx,
          y: df.baseY,
          z: mz,
          radius: 2.0,
          hitCount: 0,
        });

        // 3 Ducklings following behind
        const ducklings = [
          { model: df.baby1, offset: 1.6, id: `${df.id}-b1`, phase: 0.3 },
          { model: df.baby2, offset: 3.1, id: `${df.id}-b2`, phase: 0.6 },
          { model: df.baby3, offset: 4.6, id: `${df.id}-b3`, phase: 0.9 },
        ];

        ducklings.forEach((dk) => {
          const bLat = lateral - dir * dk.offset;
          const bx = df.baseX + df.nx * bLat;
          const bz = df.baseZ + df.nz * bLat;
          dk.model.group.position.set(bx, df.baseY, bz);
          dk.model.group.rotation.y = headingAngle;
          dk.model.leftWing.rotation.z = Math.sin((df.walkTime + dk.phase) * 8) * 0.35;
          dk.model.rightWing.rotation.z = -Math.sin((df.walkTime + dk.phase) * 8) * 0.35;

          dynamicObstacles.push({
            id: dk.id,
            type: 'duck',
            x: bx,
            y: df.baseY,
            z: bz,
            radius: 1.4,
            hitCount: 0,
          });
        });
      });

      // 1. Update Player Physics
      if (isStartedRef.current && !playerRacer.isFinished) {
        KartPhysics.update(playerRacer, inputRef.current, delta, (usedItem) => {
          if (isMultiplayer) {
            multiplayerNet.broadcast({
              type: 'item_used',
              senderId: playerRacer.id,
              senderName: playerRacer.name,
              carId: playerRacer.carId,
              data: { item: usedItem },
            });
          }
        }, dynamicObstacles);
      }

      // Update Audio Engine with player stats
      soundEngine.updateEngine(
        playerRacer.speed,
        inputRef.current.forward,
        playerRacer.isDrifting,
        playerRacer.isBoosting
      );

      // Track progress & Lap counting
      const prevProgress = playerRacer.lapProgress;
      const proj = getTrackProjection(playerRacer.position[0], playerRacer.position[2]);
      playerRacer.lapProgress = proj.progress;

      // Check Lap Crossing (from >0.92 to <0.08)
      if (prevProgress > 0.9 && playerRacer.lapProgress < 0.1) {
        const lapTime = elapsedTime - currentLapStartTime;
        currentLapStartTime = elapsedTime;
        playerRacer.lapTimes.push(lapTime);
        if (!playerRacer.bestLapTime || lapTime < playerRacer.bestLapTime) {
          playerRacer.bestLapTime = lapTime;
        }
        onLapComplete(playerRacer.currentLap, lapTime);

        if (playerRacer.currentLap < 2) {
          playerRacer.currentLap += 1;
        } else if (!playerRacer.isFinished) {
          playerRacer.isFinished = true;
          playerRacer.finishTime = elapsedTime - raceStartTime;
          soundEngine.playFinishFanfare();
          onRaceFinish({
            rank: playerRacer.rank,
            totalTime: playerRacer.finishTime,
            bestLap: playerRacer.bestLapTime || lapTime,
          });
        }
      }

      // Item Box Pickup Check
      INITIAL_ITEM_BOXES.forEach((ib) => {
        const mesh = itemMeshes.get(ib.id);
        if (mesh) {
          mesh.rotation.y += delta * 2;
          mesh.rotation.x = Math.sin(elapsedTime * 3) * 0.2;
        }

        if (ib.respawnTime > 0) {
          ib.respawnTime -= delta;
          if (ib.respawnTime <= 0 && mesh) {
            mesh.visible = true;
          }
        } else if (playerRacer.hasItem === 'none') {
          const dx = playerRacer.position[0] - ib.x;
          const dz = playerRacer.position[2] - ib.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < 4.2) {
            ib.respawnTime = 5.0; // 5s respawn
            if (mesh) mesh.visible = false;
            // Grant random item: booster, hyper fuel boost, or wing flight
            const itemPool: ItemType[] = ['booster', 'fuel-boost', 'wing-flight'];
            playerRacer.hasItem = itemPool[Math.floor(Math.random() * itemPool.length)];
            soundEngine.playItemPickup();
          }
        }
      });

      // 2. Update AI Racers with inter-kart awareness
      const allActiveRacers = [playerRacer, ...aiCars.map((c) => c.state)];

      if (!isMultiplayer) {
        aiCars.forEach((ai) => {
          if (isStartedRef.current && !ai.state.isFinished) {
            aiManager.updateAiRacer(ai.state, delta, dynamicObstacles, allActiveRacers);
            const aiPrevProg = ai.state.lapProgress;
            const aiProj = getTrackProjection(ai.state.position[0], ai.state.position[2]);
            ai.state.lapProgress = aiProj.progress;

            if (aiPrevProg > 0.9 && ai.state.lapProgress < 0.1) {
              if (ai.state.currentLap < 2) {
                ai.state.currentLap += 1;
              } else {
                ai.state.isFinished = true;
              }
            }

            // AI pitch tilt on slopes
            const aiSlope = Math.atan2(aiProj.tangent.y, Math.hypot(aiProj.tangent.x, aiProj.tangent.z));
            ai.vehicle.group.rotation.x = THREE.MathUtils.damp(ai.vehicle.group.rotation.x, -aiSlope, 8.0, delta);
          }

          // Update AI 3D Mesh
          ai.vehicle.group.position.set(ai.state.position[0], ai.state.position[1], ai.state.position[2]);
          ai.vehicle.group.rotation.y = ai.state.rotation[1];

          // AI wheels rotation
          const aiWheelSpeed = (ai.state.speed / 3.6) / 0.38;
          ai.vehicle.wheels.forEach((w) => (w.rotation.x += aiWheelSpeed * delta));

          // AI wing folding/expanding
          const aiWingScale = ai.state.isFlying ? 1.0 : 0.001;
          ai.vehicle.leftWing.scale.x = THREE.MathUtils.damp(ai.vehicle.leftWing.scale.x, aiWingScale, 6.0, delta);
          ai.vehicle.rightWing.scale.x = THREE.MathUtils.damp(ai.vehicle.rightWing.scale.x, aiWingScale, 6.0, delta);
        });

        // Inter-vehicle collision resolution (Prevents cars from tangling or freezing)
        KartPhysics.resolveVehicleCollisions(allActiveRacers, delta);
      }

      // 3. Update Multiplayer Remote Racers
      if (isMultiplayer) {
        netSyncTimer += delta;
        if (netSyncTimer > 0.04) {
          netSyncTimer = 0;
          multiplayerNet.broadcast({
            type: 'sync',
            senderId: multiplayerNet.myPeerId,
            senderName: playerName,
            carId: playerCarIdRef.current,
            data: {
              position: playerRacer.position,
              rotation: playerRacer.rotation,
              speed: playerRacer.speed,
              isDrifting: playerRacer.isDrifting,
              driftDirection: playerRacer.driftDirection,
              isBoosting: playerRacer.isBoosting,
              isHyperBoosting: playerRacer.isHyperBoosting,
              isFlying: playerRacer.isFlying,
              invulnerableTimeRemaining: playerRacer.invulnerableTimeRemaining,
              lapProgress: playerRacer.lapProgress,
              currentLap: playerRacer.currentLap,
              isFinished: playerRacer.isFinished,
            },
          });
        }

        const remotes = multiplayerNet.getRemotePlayers();
        remotes.forEach((rp) => {
          let rVeh = remoteVehicles.get(rp.peerId);
          if (!rVeh) {
            rVeh = createVehicleModel(rp.carId);
            scene.add(rVeh.group);
            remoteVehicles.set(rp.peerId, rVeh);
          }

          // Smooth interpolation
          rVeh.group.position.set(rp.racerState.position[0], rp.racerState.position[1], rp.racerState.position[2]);
          rVeh.group.rotation.y = rp.racerState.rotation[1];
        });
      }

      // 4. Update Player 3D Vehicle Transform & Animations
      playerVehicle.group.position.set(
        playerRacer.position[0],
        playerRacer.position[1],
        playerRacer.position[2]
      );

      // Body roll/tilt when drifting or sharp steering
      let targetTiltZ = 0;
      if (playerRacer.isDrifting) {
        targetTiltZ = playerRacer.driftDirection * 0.12;
      } else if (inputRef.current.left) {
        targetTiltZ = 0.06;
      } else if (inputRef.current.right) {
        targetTiltZ = -0.06;
      }

      // Pitch tilt according to track slope
      const slopePitch = Math.atan2(proj.tangent.y, Math.hypot(proj.tangent.x, proj.tangent.z));
      playerVehicle.group.rotation.x = THREE.MathUtils.damp(playerVehicle.group.rotation.x, -slopePitch, 8.0, delta);
      playerVehicle.group.rotation.y = playerRacer.rotation[1];
      playerVehicle.group.rotation.z = THREE.MathUtils.damp(playerVehicle.group.rotation.z, targetTiltZ, 7.0, delta);

      // Wheel spin & steer angles
      const wheelRotSpeed = (playerRacer.speed / 3.6) / 0.38;
      playerVehicle.wheels.forEach((w) => (w.rotation.x += wheelRotSpeed * delta));

      let targetSteerAngle = 0;
      if (inputRef.current.left) targetSteerAngle = 0.38;
      if (inputRef.current.right) targetSteerAngle = -0.38;
      playerVehicle.steerWheels.forEach((sw) => {
        sw.rotation.y = THREE.MathUtils.damp(sw.rotation.y, targetSteerAngle, 12.0, delta);
      });

      // Deployable Wings: Smoothly expand sideways when Wing Item is active
      const targetWingScale = playerRacer.isFlying ? 1.0 : 0.001;
      playerVehicle.leftWing.scale.x = THREE.MathUtils.damp(playerVehicle.leftWing.scale.x, targetWingScale, 6.0, delta);
      playerVehicle.rightWing.scale.x = THREE.MathUtils.damp(playerVehicle.rightWing.scale.x, targetWingScale, 6.0, delta);

      // Invulnerability Shield Mesh
      if (playerRacer.invulnerableTimeRemaining > 0) {
        shieldMesh.visible = true;
        shieldMesh.position.copy(playerVehicle.group.position);
        shieldMesh.rotation.y += delta * 4;
        (shieldMesh.material as THREE.MeshBasicMaterial).opacity = 0.35 + Math.sin(elapsedTime * 15) * 0.2;
      } else {
        shieldMesh.visible = false;
      }

      // 5. Update Flame & Drift Particles
      const fPos = flameGeo.attributes.position as THREE.BufferAttribute;
      const fCol = flameGeo.attributes.color as THREE.BufferAttribute;

      if (playerRacer.isBoosting || playerRacer.isHyperBoosting) {
        flameParticles.visible = true;
        const exhaustWorld = playerVehicle.group.localToWorld(new THREE.Vector3(0, 0.3, 2.2));
        for (let i = 0; i < flameCount; i++) {
          const spread = 0.25;
          const px = exhaustWorld.x + (Math.random() - 0.5) * spread;
          const py = exhaustWorld.y + (Math.random() - 0.5) * spread;
          const pz = exhaustWorld.z + (Math.random() - 0.5) * spread;

          fPos.setXYZ(i, px, py, pz);
          if (playerRacer.isHyperBoosting) {
            // Intense Neon Magma Orange / Red
            fCol.setXYZ(i, 1.0, 0.3 + Math.random() * 0.3, 0.0);
          } else {
            // Electric N Sky Blue / Cyan
            fCol.setXYZ(i, 0.0, 0.8, 1.0);
          }
        }
        fPos.needsUpdate = true;
        fCol.needsUpdate = true;
      } else {
        flameParticles.visible = false;
      }

      // Drift sparks
      const dPos = driftGeo.attributes.position as THREE.BufferAttribute;
      if (playerRacer.isDrifting) {
        driftParticles.visible = true;
        const driftOrigin = playerVehicle.group.localToWorld(
          new THREE.Vector3(playerRacer.driftDirection * 0.8, 0.1, 1.8)
        );
        for (let i = 0; i < driftCount; i++) {
          dPos.setXYZ(
            i,
            driftOrigin.x + (Math.random() - 0.5) * 0.8,
            driftOrigin.y + Math.random() * 0.4,
            driftOrigin.z + (Math.random() - 0.5) * 0.8
          );
        }
        dPos.needsUpdate = true;
      } else {
        driftParticles.visible = false;
      }

      // 6. Camera Follow (Dynamic Chase Cam with Speed FOV & Hyperboost Shake)
      const carYaw = playerVehicle.group.rotation.y;
      const camDist = playerRacer.isHyperBoosting ? 9.2 : 7.6;
      const camHeight = playerRacer.isFlying ? 5.2 : 3.4;

      const targetCamX = playerRacer.position[0] + Math.sin(carYaw) * camDist;
      const targetCamZ = playerRacer.position[2] + Math.cos(carYaw) * camDist;
      const targetCamY = playerRacer.position[1] + camHeight;

      camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamX, 9.0, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamY, 8.0, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamZ, 9.0, delta);

      // Camera look target (just ahead of vehicle nose)
      const lookX = playerRacer.position[0] - Math.sin(carYaw) * 4.0;
      const lookZ = playerRacer.position[2] - Math.cos(carYaw) * 4.0;
      const lookY = playerRacer.position[1] + 1.2;
      camera.lookAt(lookX, lookY, lookZ);

      // Dynamic FOV Warp during Hyper Boost
      const targetFov = playerRacer.isHyperBoosting ? 82 : playerRacer.isBoosting ? 74 : 65;
      camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 6.0, delta);
      camera.updateProjectionMatrix();

      // 7. Calculate Rank
      const allRacers: RacerState[] = [playerRacer];
      if (!isMultiplayer) {
        aiCars.forEach((c) => allRacers.push(c.state));
      } else {
        multiplayerNet.getRemotePlayers().forEach((r) => allRacers.push(r.racerState));
      }

      allRacers.sort((a, b) => {
        if (a.currentLap !== b.currentLap) return b.currentLap - a.currentLap;
        return b.lapProgress - a.lapProgress;
      });

      const playerRank = allRacers.findIndex((r) => r.id === playerRacer.id) + 1;
      playerRacer.rank = playerRank;

      onLapProgress(
        playerRacer.currentLap,
        playerRacer.lapProgress,
        playerRacer.speed,
        playerRank,
        playerRacer.driftGauge,
        playerRacer.hasItem,
        playerRacer.isFinished
      );

      if (onRacersUpdate) {
        const racerPoints: RacerMapPoint[] = allRacers.map((r) => ({
          id: r.id,
          name: r.name,
          carId: r.carId,
          x: r.position[0],
          z: r.position[2],
          isPlayer: r.isPlayer,
          speed: r.speed,
          rank: r.rank,
        }));
        onRacersUpdate(racerPoints, dynamicObstacles);
      }

      // Render scene
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    // Start loop
    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [playerCarId, isMultiplayer]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full overflow-hidden bg-slate-950"
    />
  );
};
