import React from 'react';
import { Check, X, Gauge, Zap, Compass, Flame } from 'lucide-react';
import { CarModelId } from '../types';
import { HYUNDAI_N_CARS } from '../constants/vehicles';

interface CarSelectModalProps {
  currentCarId: CarModelId;
  onSelectCar: (carId: CarModelId) => void;
  onClose: () => void;
}

export const CarSelectModal: React.FC<CarSelectModalProps> = ({
  currentCarId,
  onSelectCar,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-6 md:p-8 text-white shadow-2xl relative my-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="text-xs font-orbitron font-bold text-sky-400 tracking-wider">
              HYUNDAI HIGH-PERFORMANCE N SERIES
            </div>
            <h2 className="text-2xl md:text-3xl font-orbitron font-black text-white">
              차량 선택 (SELECT YOUR N MACHINE)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 6 Car Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {HYUNDAI_N_CARS.map((car) => {
            const isSelected = car.id === currentCarId;

            return (
              <div
                key={car.id}
                onClick={() => onSelectCar(car.id)}
                className={`group relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-sky-950/40 border-sky-400 shadow-[0_0_20px_rgba(0,163,224,0.25)]'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                {/* Selected Checkmark */}
                {isSelected && (
                  <div className="absolute top-3 right-3 bg-sky-400 text-slate-950 p-1 rounded-full shadow-md">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}

                <div>
                  {/* Category Pill & Color accent */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-sky-300 border border-slate-700 font-orbitron">
                      {car.category}
                    </span>
                    <div
                      className="w-3 h-3 rounded-full border border-white/30"
                      style={{ backgroundColor: car.primaryColor }}
                    />
                  </div>

                  <h3 className="font-orbitron font-bold text-lg text-white mb-0.5">
                    {car.name}
                  </h3>
                  <div className="text-xs text-slate-400 font-medium mb-3">
                    {car.tagline}
                  </div>

                  {/* Spec Bars */}
                  <div className="space-y-1.5 text-xs">
                    {/* Top Speed */}
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-0.5">
                        <span className="flex items-center gap-1">
                          <Gauge className="w-3 h-3 text-sky-400" /> 최고속도
                        </span>
                        <span className="font-mono text-white font-bold">{car.topSpeed} km/h</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-sky-400 rounded-full"
                          style={{ width: `${(car.topSpeed / 240) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Acceleration */}
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-0.5">
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-400" /> 가속력 (토크)
                        </span>
                        <span className="font-mono text-white font-bold">{car.acceleration}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full"
                          style={{ width: `${car.acceleration * 10}%` }}
                        />
                      </div>
                    </div>

                    {/* Handling */}
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-0.5">
                        <span className="flex items-center gap-1">
                          <Compass className="w-3 h-3 text-emerald-400" /> 코너링 핸들링
                        </span>
                        <span className="font-mono text-white font-bold">{car.handling}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full"
                          style={{ width: `${car.handling * 10}%` }}
                        />
                      </div>
                    </div>

                    {/* Drift */}
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-0.5">
                        <span className="flex items-center gap-1">
                          <Flame className="w-3 h-3 text-orange-400" /> 드리프트 성향
                        </span>
                        <span className="font-mono text-white font-bold">{car.driftRating}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-400 rounded-full"
                          style={{ width: `${car.driftRating * 10}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Special Trait Box */}
                <div className="mt-4 pt-2.5 border-t border-slate-800/80 text-[11px] text-sky-200/90 font-medium bg-slate-900/40 p-2 rounded-lg">
                  ★ {car.specialTrait}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-orbitron font-bold text-sm transition-all shadow-lg shadow-sky-500/20 cursor-pointer"
          >
            선택 완료 (RACE NOW)
          </button>
        </div>
      </div>
    </div>
  );
};
