import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Zap, Feather } from 'lucide-react';
import { ControlInput } from '../game/physics';
import { ItemType } from '../types';

interface TouchControlsProps {
  onUpdateInput: (key: keyof ControlInput, active: boolean) => void;
  hasItem: ItemType;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onUpdateInput,
  hasItem,
}) => {
  return (
    <div className="pointer-events-none md:hidden absolute inset-0 z-20 flex flex-col justify-end p-4 pb-20 select-none">
      <div className="flex justify-between items-end w-full">
        {/* Left Side: Steering & Drift */}
        <div className="pointer-events-auto flex items-center gap-3">
          <button
            onTouchStart={() => onUpdateInput('left', true)}
            onTouchEnd={() => onUpdateInput('left', false)}
            onMouseDown={() => onUpdateInput('left', true)}
            onMouseUp={() => onUpdateInput('left', false)}
            className="w-14 h-14 rounded-2xl bg-slate-900/80 active:bg-sky-500/50 border border-slate-700 active:border-sky-400 flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <button
            onTouchStart={() => onUpdateInput('right', true)}
            onTouchEnd={() => onUpdateInput('right', false)}
            onMouseDown={() => onUpdateInput('right', true)}
            onMouseUp={() => onUpdateInput('right', false)}
            className="w-14 h-14 rounded-2xl bg-slate-900/80 active:bg-sky-500/50 border border-slate-700 active:border-sky-400 flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
          >
            <ArrowRight className="w-6 h-6" />
          </button>

          {/* Drift Button */}
          <button
            onTouchStart={() => onUpdateInput('drift', true)}
            onTouchEnd={() => onUpdateInput('drift', false)}
            onMouseDown={() => onUpdateInput('drift', true)}
            onMouseUp={() => onUpdateInput('drift', false)}
            className="w-14 h-14 rounded-2xl bg-amber-950/80 active:bg-amber-500/50 border border-amber-700 active:border-amber-400 flex flex-col items-center justify-center text-amber-300 shadow-lg active:scale-95 transition-transform font-orbitron font-bold text-[10px]"
          >
            <Zap className="w-4 h-4 fill-amber-400" />
            <span>DRIFT</span>
          </button>
        </div>

        {/* Right Side: Gas & Brake & Item */}
        <div className="pointer-events-auto flex items-center gap-3">
          {/* Item Use Button */}
          {hasItem !== 'none' && (
            <button
              onTouchStart={() => onUpdateInput('useItem', true)}
              onTouchEnd={() => onUpdateInput('useItem', false)}
              onMouseDown={() => onUpdateInput('useItem', true)}
              onMouseUp={() => onUpdateInput('useItem', false)}
              className="w-14 h-14 rounded-2xl bg-cyan-950/80 active:bg-cyan-500/50 border border-cyan-500 active:border-cyan-300 flex flex-col items-center justify-center text-cyan-300 shadow-lg active:scale-95 transition-transform font-orbitron font-bold text-[10px]"
            >
              <Feather className="w-5 h-5" />
              <span>USE</span>
            </button>
          )}

          {/* Brake / Reverse */}
          <button
            onTouchStart={() => onUpdateInput('backward', true)}
            onTouchEnd={() => onUpdateInput('backward', false)}
            onMouseDown={() => onUpdateInput('backward', true)}
            onMouseUp={() => onUpdateInput('backward', false)}
            className="w-14 h-14 rounded-2xl bg-rose-950/80 active:bg-rose-500/50 border border-rose-800 active:border-rose-400 flex items-center justify-center text-rose-300 shadow-lg active:scale-95 transition-transform"
          >
            <ArrowDown className="w-6 h-6" />
          </button>

          {/* Gas */}
          <button
            onTouchStart={() => onUpdateInput('forward', true)}
            onTouchEnd={() => onUpdateInput('forward', false)}
            onMouseDown={() => onUpdateInput('forward', true)}
            onMouseUp={() => onUpdateInput('forward', false)}
            className="w-16 h-16 rounded-2xl bg-emerald-950/80 active:bg-emerald-500/50 border border-emerald-600 active:border-emerald-300 flex items-center justify-center text-emerald-300 shadow-lg active:scale-95 transition-transform"
          >
            <ArrowUp className="w-8 h-8 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
