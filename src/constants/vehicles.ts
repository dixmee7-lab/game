import { CarSpec } from '../types';

export const HYUNDAI_N_CARS: CarSpec[] = [
  {
    id: 'genesis-magma-gt',
    name: 'Genesis Magma GT',
    subName: 'High-Performance Concept GT',
    category: 'TRACK SPECIAL',
    tagline: '마그마의 열정을 품은 하이퍼 트랙 GT 콘셉트',
    topSpeed: 235,
    acceleration: 9.8,
    handling: 8.9,
    driftRating: 8.5,
    primaryColor: '#ff4d00', // Iconic Magma Orange
    secondaryColor: '#121316', // Obsidian Carbon
    accentColor: '#ff8800',
    spoilerStyle: 'huge-gt',
    bodyStyle: 'supercar',
    specialTrait: '최고 속도 한계 돌파 & 하이퍼 다운포스',
  },
  {
    id: 'ioniq-5-n',
    name: 'IONIQ 5 N',
    subName: 'All-Electric High Performance',
    category: 'EV BEAST',
    tagline: '듀얼 모터 650마력의 폭발적 토크와 N e-Shift 쾌감',
    topSpeed: 220,
    acceleration: 10.0,
    handling: 8.7,
    driftRating: 9.2,
    primaryColor: '#7fb5d4', // N Performance Blue
    secondaryColor: '#f95738', // Luminous N Red/Orange
    accentColor: '#ffffff',
    spoilerStyle: 'active-aero',
    bodyStyle: 'crossover-hatch',
    specialTrait: '순간 토크 가속 & N Grin Boost 폭발력',
  },
  {
    id: 'avante-n',
    name: 'Avante N (Elantra N)',
    subName: 'TCR Corner Rascal',
    category: 'CORNER MASTER',
    tagline: '코너링의 악동! TCR 레이싱 DNA의 정밀한 조향성',
    topSpeed: 215,
    acceleration: 8.8,
    handling: 9.8,
    driftRating: 9.4,
    primaryColor: '#8ec5e6', // N Blue
    secondaryColor: '#da291c', // N Red Trim
    accentColor: '#151515',
    spoilerStyle: 'carbon-wing',
    bodyStyle: 'sedan',
    specialTrait: '날카로운 헤어핀 코너링 & e-LSD 턴인',
  },
  {
    id: 'rn22e',
    name: 'RN22e Rolling Lab',
    subName: 'Next-Gen EV Aerodynamic Lab',
    category: 'AERO CONCEPT',
    tagline: '공기역학 스트림라이너 실루엣의 미래형 트랙 랩',
    topSpeed: 228,
    acceleration: 9.5,
    handling: 9.1,
    driftRating: 8.8,
    primaryColor: '#4f85b8', // Metallic Blue
    secondaryColor: '#0a0d14', // Carbon Black
    accentColor: '#00e5ff',
    spoilerStyle: 'huge-gt',
    bodyStyle: 'streamliner',
    specialTrait: '고속 트랙 에어로다이내믹스 & 롤링 밸런스',
  },
  {
    id: 'n-vision-74',
    name: 'N Vision 74',
    subName: 'Hydrogen Hybrid Drift Monster',
    category: 'DRIFT SPECIALIST',
    tagline: '헤리티지 포니 쿠페 리마스터! 드리프트 제어 특화 머신',
    topSpeed: 225,
    acceleration: 9.3,
    handling: 9.2,
    driftRating: 10.0,
    primaryColor: '#c5cbd3', // Dark Silver & Sky Accent
    secondaryColor: '#1a1d24',
    accentColor: '#7bb0da',
    spoilerStyle: 'retro-wing',
    bodyStyle: 'wedge-coupe',
    specialTrait: '초고속 드리프트 게이지 충전 & 오버스티어 복원력',
  },
  {
    id: 'g70-n-line',
    name: 'G70 N-Line',
    subName: 'Athletic High-Speed Cruiser',
    category: 'PREMIUM SEDAN',
    tagline: '안정적인 최고속 주행과 묵직한 고속 코너링 그립',
    topSpeed: 222,
    acceleration: 9.0,
    handling: 9.0,
    driftRating: 8.6,
    primaryColor: '#2b303c', // Tasman Blue / Gunmetal
    secondaryColor: '#da291c',
    accentColor: '# silver',
    spoilerStyle: 'ducktail',
    bodyStyle: 'sport-sedan',
    specialTrait: '고속 직진 안정성 & 충돌 반동 흡수 밸런스',
  },
];

export const DEFAULT_CAR_ID = 'ioniq-5-n';
