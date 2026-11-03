import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Clock, Flag, RotateCcw, Car } from 'lucide-react';
import { CarModelId } from '../types';
import { HYUNDAI_N_CARS } from '../constants/vehicles';

interface RaceFinishModalProps {
  rank: number;
  totalTime: number;
  bestLap: number;
  carId: CarModelId;
  onRestart: () => void;
  onOpenCarSelect: () => void;
}

export const RaceFinishModal: React.FC<RaceFinishModalProps> = ({
  rank,
  totalTime,
  bestLap,
  carId,
  onRestart,
  onOpenCarSelect,
}) => {
  const carSpec = HYUNDAI_N_CARS.find((c) => c.id === carId) || HYUNDAI_N_CARS[0];

  useEffect(() => {
    if (rank === 1) {
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 },
      });
    }
  }, [rank]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${mins}:${Number(secs) < 10 ? '0' : ''}${secs}`;
  };

  const isWin = rank === 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 md:p-8 text-white shadow-2xl relative text-center">
        {/* Trophy / Result Icon */}
        <div className="flex justify-center mb-4">
          <div
            className={`w-20 h-20 rounded-3xl flex items-center justify-center border shadow-xl ${
              isWin
                ? 'bg-amber-500/20 border-amber-400 text-amber-400 shadow-amber-500/20'
                : 'bg-slate-800 border-slate-700 text-sky-400'
            }`}
          >
            <Trophy className="w-10 h-10" />
          </div>
        </div>

        {/* Title */}
        <div className="text-xs font-orbitron font-bold text-sky-400 tracking-widest mb-1">
          {isWin ? 'VICTORY! CHAMPION' : 'RACE FINISHED!'}
        </div>
        <h2 className="text-3xl font-orbitron font-black text-white mb-2">
          {rank === 1 ? '1ST PLACE' : rank === 2 ? '2ND PLACE' : rank === 3 ? '3RD PLACE' : `${rank}TH PLACE`}
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          {isWin
            ? '현대 N 서킷의 새로운 챔피언 탄생! 압도적인 코너링과 부스터 질주였습니다.'
            : '치열한 아케이드 레이스 완료! 다시 도전하여 1위를 탈환해보세요.'}
        </p>

        {/* Stats Summary Card */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 mb-6 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Clock className="w-3.5 h-3.5 text-sky-400" /> 총 레이스 타임 (2 Laps)
            </span>
            <span className="font-orbitron font-bold text-white text-sm">
              {formatTime(totalTime)}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Flag className="w-3.5 h-3.5 text-amber-400" /> 베스트 랩 타임
            </span>
            <span className="font-orbitron font-bold text-amber-400 text-sm">
              {formatTime(bestLap)}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-800">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Car className="w-3.5 h-3.5 text-emerald-400" /> 출전 머신
            </span>
            <span className="font-semibold text-slate-200">
              {carSpec.name}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onOpenCarSelect}
            className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-orbitron font-bold text-xs transition-colors cursor-pointer"
          >
            차량 변경
          </button>
          <button
            onClick={onRestart}
            className="flex-1 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-orbitron font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-sky-500/20"
          >
            <RotateCcw className="w-4 h-4" />
            <span>재도전 (RETRY)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
