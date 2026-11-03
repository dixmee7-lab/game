export type GameMode = 'single' | 'multi';

export type CarModelId = 
  | 'genesis-magma-gt'
  | 'ioniq-5-n'
  | 'avante-n'
  | 'rn22e'
  | 'n-vision-74'
  | 'g70-n-line';

export interface CarSpec {
  id: CarModelId;
  name: string;
  subName: string;
  category: string;
  tagline: string;
  topSpeed: number; // km/h
  acceleration: number; // 0-100 rating 1-10
  handling: number; // 1-10
  driftRating: number; // 1-10
  primaryColor: string; // Hex
  secondaryColor: string; // Hex
  accentColor: string; // Hex
  spoilerStyle: 'huge-gt' | 'active-aero' | 'ducktail' | 'carbon-wing' | 'retro-wing' | 'lip';
  bodyStyle: 'supercar' | 'crossover-hatch' | 'sedan' | 'streamliner' | 'wedge-coupe' | 'sport-sedan';
  specialTrait: string;
}

export type ItemType = 'booster' | 'fuel-boost' | 'wing-flight' | 'none';

export interface RacerMapPoint {
  id: string;
  name: string;
  carId: CarModelId;
  x: number;
  z: number;
  isPlayer: boolean;
  speed: number;
  rank: number;
}

export interface RacerState {
  id: string;
  name: string;
  carId: CarModelId;
  isPlayer: boolean;
  isAi: boolean;
  position: [number, number, number];
  rotation: [number, number, number];
  speed: number; // km/h
  driftGauge: number; // 0 to 100
  isDrifting: boolean;
  driftDirection: number; // -1 left, 1 right, 0 none
  isBoosting: boolean;
  isHyperBoosting: boolean;
  boostTimeRemaining: number;
  isFlying: boolean;
  flyingTimeRemaining: number;
  invulnerableTimeRemaining: number; // shield against obstacles
  hasItem: ItemType;
  currentLap: number;
  lapProgress: number; // 0 to 1 along circuit spline
  totalDistance: number;
  rank: number;
  lapTimes: number[];
  bestLapTime: number | null;
  finishTime: number | null;
  isFinished: boolean;
}

export interface TrackWaypoint {
  x: number;
  y: number;
  z: number;
  normalX: number;
  normalZ: number;
  tangentX: number;
  tangentZ: number;
  width: number;
  isShortcut?: boolean;
  hasJumpPad?: boolean;
  isJumpArea?: boolean;
}

export interface Obstacle {
  id: string;
  type: 'oil' | 'cone' | 'grandma' | 'duck';
  x: number;
  y: number;
  z: number;
  radius: number;
  hitCount: number;
}

export interface ItemBox {
  id: string;
  x: number;
  y: number;
  z: number;
  respawnTime: number; // 0 if active, >0 if respawning
}

export interface PeerNetworkMessage {
  type: 'sync' | 'item_used' | 'lap_finish' | 'chat';
  senderId: string;
  senderName: string;
  carId: CarModelId;
  data: any;
}
