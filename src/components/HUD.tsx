import React, { useState } from 'react';
import { Volume2, VolumeX, RotateCcw, Zap, Feather, Shield, Trophy, Flag, HelpCircle, Users } from 'lucide-react';
import { ItemType, CarModelId, RacerMapPoint, Obstacle } from '../types';
import { HYUNDAI_N_CARS } from '../constants/vehicles';
import { soundEngine } from '../audio/soundEngine';

interface HUDProps {
  carId: CarModelId;
  speed: number;
  rank: number;
  totalRacers: number;
  currentLap: number;
  totalLaps: number;
  lapProgress: number;
  driftGauge: number;
  hasItem: ItemType;
  racerMapPoints?: RacerMapPoint[];
  obstacles?: Obstacle[];
  onUseItem: () => void;
  onResetCar: () => void;
  onOpenMultiplayer: () => void;
  onOpenCarSelect: () => void;
  isMultiplayer: boolean;
  roomCode?: string;
}

export const HUD: React.FC<HUDProps> = ({
  carId,
  speed,
  rank,
  totalRacers,
  currentLap,
  totalLaps,
  lapProgress,
  driftGauge,
  hasItem,
  racerMapPoints = [],
  obstacles = [],
  onUseItem,
  onResetCar,
  onOpenMultiplayer,
  onOpenCarSelect,
  isMultiplayer,
  roomCode,
}) => {
  const [isMuted, setIsMuted] = useState(soundEngine.getIsMuted());
  const [showHelp, setShowHelp] = useState(false);
  const carSpec = HYUNDAI_N_CARS.find((c) => c.id === carId) || HYUNDAI_N_CARS[0];

  const handleToggleMute = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  const roundedSpeed = Math.max(0, Math.round(speed));

  // Rank badge suffix and color
  const getRankBadge = (r: number) => {
    switch (r) {
      case 1:
        return { text: '1ST', bg: 'bg-amber-500 text-slate-950 border-amber-300 shadow-amber-500/30' };
      case 2:
        return { text: '2ND', bg: 'bg-slate-300 text-slate-950 border-slate-100 shadow-slate-300/30' };
      case 3:
        return { text: '3RD', bg: 'bg-amber-700 text-white border-amber-500 shadow-amber-700/30' };
      default:
        return { text: `${r}TH`, bg: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  const rankInfo = getRankBadge(rank);

  return (
    <div className="pointer-events-none absolute inset-0 select-none z-10 flex flex-col justify-between p-4 md:p-6">
      {/* Top Bar: Clean minimal stats, zero center obstruction */}
      <div className="flex items-start justify-between w-full">
        {/* Top-Left: Car Model Badge & Laps */}
        <div className="flex flex-col gap-2">
          <div className="pointer-events-auto flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 backdrop-blur-md shadow-lg">
            <div
              className="w-3.5 h-3.5 rounded-full"
              style={{ backgroundColor: carSpec.primaryColor }}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-orbitron font-bold text-sm tracking-wider text-white">
                  {carSpec.name}
                </span>
                <span className="text-[10px] font-semibold tracking-wider px-1.5 py-0.5 rounded bg-sky-950/80 text-sky-400 border border-sky-800/60">
                  {carSpec.category}
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                {carSpec.specialTrait}
              </div>
            </div>
          </div>

          {/* Lap Counter Badge */}
          <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2 backdrop-blur-md shadow-lg w-fit">
            <Flag className="w-4 h-4 text-sky-400" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs uppercase font-medium text-slate-400">LAP</span>
              <span className="font-orbitron text-lg font-bold text-sky-400">
                {currentLap}
              </span>
              <span className="font-orbitron text-xs text-slate-500">
                / {totalLaps}
              </span>
            </div>
            {/* Lap Progress Mini Bar */}
            <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50 ml-1">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-100"
                style={{ width: `${Math.min(100, Math.round(lapProgress * 100))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Top-Center: Current Rank Indicator */}
        <div className="flex flex-col items-center">
          <div className={`flex items-center gap-2 px-5 py-2 rounded-2xl border font-orbitron font-black text-2xl tracking-wider shadow-lg ${rankInfo.bg}`}>
            <Trophy className="w-5 h-5" />
            <span>{rankInfo.text}</span>
            <span className="text-xs font-rajdhani font-semibold opacity-80">
              / {totalRacers}
            </span>
          </div>
        </div>

        {/* Top-Right: Action buttons */}
        <div className="pointer-events-auto flex items-center gap-2">
          {isMultiplayer && roomCode && (
            <div className="bg-emerald-950/90 border border-emerald-700/80 rounded-xl px-3 py-2 text-xs font-mono text-emerald-300 flex items-center gap-1.5 shadow-lg">
              <Users className="w-3.5 h-3.5" />
              <span>ROOM: {roomCode}</span>
            </div>
          )}

          <button
            onClick={onOpenCarSelect}
            className="bg-slate-900/90 hover:bg-slate-800 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 transition-colors shadow-lg cursor-pointer"
            title="차량 변경"
          >
            차량 선택
          </button>

          <button
            onClick={onOpenMultiplayer}
            className="bg-sky-950/90 hover:bg-sky-900 border border-sky-800 rounded-xl px-3 py-2 text-xs font-bold text-sky-300 transition-colors shadow-lg flex items-center gap-1 cursor-pointer"
            title="멀티플레이 방 생성/참가"
          >
            <Users className="w-3.5 h-3.5" />
            <span>{isMultiplayer ? '멀티 방' : '멀티플레이'}</span>
          </button>

          <button
            onClick={onResetCar}
            className="bg-slate-900/90 hover:bg-slate-800 border border-slate-800 rounded-xl p-2.5 text-slate-300 hover:text-white transition-colors shadow-lg cursor-pointer"
            title="트랙 중앙 리셋 (R)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={handleToggleMute}
            className="bg-slate-900/90 hover:bg-slate-800 border border-slate-800 rounded-xl p-2.5 text-slate-300 hover:text-white transition-colors shadow-lg cursor-pointer"
            title="사운드 온/오프"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
          </button>

          <button
            onClick={() => setShowHelp(!showHelp)}
            className="bg-slate-900/90 hover:bg-slate-800 border border-slate-800 rounded-xl p-2.5 text-slate-300 hover:text-white transition-colors shadow-lg cursor-pointer"
            title="조작법 안내"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Help Modal Overlay */}
      {showHelp && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-orbitron font-bold text-lg text-sky-400">게임 조작법 & 아이템</h3>
              <button
                onClick={() => setShowHelp(false)}
                className="text-slate-400 hover:text-white font-bold text-sm"
              >
                닫기
              </button>
            </div>
            <div className="space-y-3 text-sm text-slate-300">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-white">가속 / 후진 (브레이크)</span>
                <span className="font-mono text-sky-400">↑ / W  &  ↓ / S</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-white">좌우 조향</span>
                <span className="font-mono text-sky-400">← → / A D</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-white">드리프트 (Shift 누르고 코너)</span>
                <span className="font-mono text-amber-400">Shift</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-white">아이템 사용 (부스터/날개)</span>
                <span className="font-mono text-emerald-400">Space / Ctrl</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-white">트랙 복귀 리셋</span>
                <span className="font-mono text-slate-400">R</span>
              </div>
              <div className="pt-2 text-xs text-slate-400 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                <strong className="text-white block mb-1">TIP:</strong>
                • 드리프트 게이지가 100% 차오르면 미니 부스터가 자동 발동됩니다!<br />
                • [일반 부스터] 즉각적인 순간 가속 쾌속 돌파!<br />
                • [고옥탄 연료] 획득 시 260km/h+ 초고속 하이퍼 부스트가 발동됩니다.<br />
                • [비행 날개] 사용 시 사이드 윙이 전개되며 2초간 공중을 활공합니다.<br />
                • 서킷에 출몰하는 [꼬부랑 할머니 👵]와 [오리 가족 🦆]을 주의하세요! 충돌 시 속도가 대폭 감소합니다.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Unified Control Dock (Zero Viewport Occlusion) */}
      <div className="flex items-end justify-between w-full max-w-5xl mx-auto">
        {/* Left: Circuit Mini-Map with Live Multi-Racer Heatmap */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 backdrop-blur-md shadow-xl flex flex-col items-center">
          <div className="text-[10px] font-orbitron font-bold tracking-widest text-slate-400 mb-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            LIVE RADAR & HEATMAP
          </div>
          <div className="relative w-32 h-32 bg-slate-950/85 rounded-xl border border-slate-800/80 overflow-hidden flex items-center justify-center">
            {/* Real Circuit Spline Path SVG */}
            <svg viewBox="-420 -460 840 940" className="w-full h-full p-2 fill-none">
              {/* Outer Glow Track Line */}
              <path
                d="M 0 70 L 0 -280 C 40 -360, 220 -420, 310 -380 C 380 -300, 350 -100, 330 0 C 340 100, 320 200, 270 300 C 190 380, 90 420, -10 430 C -110 410, -210 360, -280 270 C -320 150, -330 30, -320 -80 C -270 -180, -210 -240, -140 -180 C -100 -60, -80 60, -60 150 C -30 180, 0 140, 0 70 Z"
                className="stroke-slate-800 stroke-[40]"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 0 70 L 0 -280 C 40 -360, 220 -420, 310 -380 C 380 -300, 350 -100, 330 0 C 340 100, 320 200, 270 300 C 190 380, 90 420, -10 430 C -110 410, -210 360, -280 270 C -320 150, -330 30, -320 -80 C -270 -180, -210 -240, -140 -180 C -100 -60, -80 60, -60 150 C -30 180, 0 140, 0 70 Z"
                className="stroke-sky-600/60 stroke-[18]"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Dynamic Obstacles (Grandma & Ducks) on Mini-Map */}
              {obstacles.map((obs) => {
                if (obs.type === 'grandma') {
                  return (
                    <g key={obs.id} transform={`translate(${obs.x}, ${obs.z})`}>
                      <circle r="22" fill="rgba(245, 158, 11, 0.35)" />
                      <text textAnchor="middle" dy="8" fontSize="24">👵</text>
                    </g>
                  );
                }
                if (obs.type === 'duck') {
                  return (
                    <g key={obs.id} transform={`translate(${obs.x}, ${obs.z})`}>
                      <circle r="18" fill="rgba(250, 204, 21, 0.35)" />
                      <text textAnchor="middle" dy="6" fontSize="18">🦆</text>
                    </g>
                  );
                }
                return null;
              })}

              {/* All Racers: Heatmap Dots & Speed Glow Rings */}
              {racerMapPoints.map((racer) => {
                const isPlayer = racer.isPlayer;
                const heatRadius = Math.max(16, (racer.speed / 240) * 36);
                const color = isPlayer
                  ? '#00e5ff'
                  : racer.carId === 'genesis-magma-gt'
                  ? '#ff4d00'
                  : racer.carId === 'n-vision-74'
                  ? '#eab308'
                  : '#3b82f6';

                return (
                  <g key={racer.id} transform={`translate(${racer.x}, ${racer.z})`}>
                    {/* Speed Heat Trail Circle */}
                    <circle
                      r={heatRadius}
                      fill={color}
                      opacity={isPlayer ? 0.35 : 0.22}
                    />
                    {/* Core Dot */}
                    <circle
                      r={isPlayer ? 18 : 14}
                      fill={color}
                      stroke="#ffffff"
                      strokeWidth={isPlayer ? 4 : 2}
                    />
                    {isPlayer && (
                      <circle
                        r={26}
                        fill="none"
                        stroke="#00e5ff"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                      />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Center: Digital Speedometer & Drift Gauge Bar */}
        <div className="flex flex-col items-center gap-2">
          {/* Drift Gauge */}
          <div className="w-64 md:w-80 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2 backdrop-blur-md shadow-lg flex flex-col gap-1">
            <div className="flex justify-between items-center text-xs">
              <span className="font-orbitron font-bold tracking-wider text-amber-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 fill-amber-400" /> DRIFT GAUGE
              </span>
              <span className="font-orbitron font-bold text-xs text-slate-300">
                {Math.round(driftGauge)}%
              </span>
            </div>
            <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 relative">
              <div
                className={`h-full transition-all duration-75 ${
                  driftGauge >= 98
                    ? 'bg-amber-400 animate-pulse shadow-[0_0_12px_#fbbf24]'
                    : 'bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-300'
                }`}
                style={{ width: `${driftGauge}%` }}
              />
            </div>
          </div>

          {/* Speedometer Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl px-8 py-3 backdrop-blur-md shadow-xl flex items-baseline gap-2">
            <span className="font-orbitron font-black text-4xl md:text-5xl text-white tracking-tight">
              {roundedSpeed}
            </span>
            <span className="font-orbitron font-bold text-sm text-sky-400 tracking-wider">
              KM/H
            </span>
          </div>
        </div>

        {/* Right: Item Slot & Use Button */}
        <div className="flex flex-col items-center">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 backdrop-blur-md shadow-xl flex flex-col items-center gap-2">
            <div className="text-[10px] font-orbitron font-bold tracking-widest text-slate-400">
              ITEM
            </div>
            <button
              onClick={onUseItem}
              disabled={hasItem === 'none'}
              className={`pointer-events-auto relative w-16 h-16 rounded-2xl border flex items-center justify-center transition-all cursor-pointer shadow-lg ${
                hasItem === 'booster'
                  ? 'bg-gradient-to-br from-yellow-500/25 to-amber-600/35 border-amber-400 hover:scale-105 active:scale-95 shadow-amber-500/20'
                  : hasItem === 'fuel-boost'
                  ? 'bg-gradient-to-br from-amber-500/25 to-orange-600/35 border-orange-500 hover:scale-105 active:scale-95 shadow-orange-500/20'
                  : hasItem === 'wing-flight'
                  ? 'bg-gradient-to-br from-cyan-500/25 to-sky-600/35 border-cyan-400 hover:scale-105 active:scale-95 shadow-cyan-500/20'
                  : 'bg-slate-950/60 border-slate-800 opacity-40 cursor-not-allowed'
              }`}
            >
              {hasItem === 'booster' && (
                <div className="flex flex-col items-center">
                  <Zap className="w-8 h-8 text-yellow-400 fill-yellow-400" />
                  <span className="text-[9px] font-bold text-yellow-300 mt-0.5 font-orbitron">BOOST</span>
                </div>
              )}
              {hasItem === 'fuel-boost' && (
                <div className="flex flex-col items-center">
                  <Zap className="w-8 h-8 text-orange-400 fill-orange-400" />
                  <span className="text-[9px] font-bold text-orange-300 mt-0.5 font-orbitron">HYPER</span>
                </div>
              )}
              {hasItem === 'wing-flight' && (
                <div className="flex flex-col items-center">
                  <Feather className="w-8 h-8 text-cyan-300" />
                  <span className="text-[9px] font-bold text-cyan-200 mt-0.5 font-orbitron">WING 2s</span>
                </div>
              )}
              {hasItem === 'none' && (
                <span className="text-xs text-slate-600 font-mono">EMPTY</span>
              )}
            </button>
            <div className="text-[10px] text-slate-400 font-mono tracking-tight">
              [SPACE]
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
