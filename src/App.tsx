import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { CarSelectModal } from './components/CarSelectModal';
import { MultiplayerModal } from './components/MultiplayerModal';
import { TouchControls } from './components/TouchControls';
import { RaceFinishModal } from './components/RaceFinishModal';
import { CarModelId, ItemType, RacerMapPoint, Obstacle } from './types';
import { ControlInput } from './game/physics';
import { soundEngine } from './audio/soundEngine';
import { multiplayerNet } from './network/multiplayer';

export default function App() {
  const [selectedCarId, setSelectedCarId] = useState<CarModelId>('ioniq-5-n');
  const [playerName, setPlayerName] = useState<string>('N-Driver');
  const [isMultiplayer, setIsMultiplayer] = useState<boolean>(false);
  const [roomCode, setRoomCode] = useState<string>('');

  // Modals
  const [showCarSelect, setShowCarSelect] = useState<boolean>(false);
  const [showMultiplayer, setShowMultiplayer] = useState<boolean>(false);
  const [showFinishModal, setShowFinishModal] = useState<boolean>(false);

  // Countdown & Race State
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isGameStarted, setIsGameStarted] = useState<boolean>(false);
  const [gameKey, setGameKey] = useState<number>(0);

  // HUD stats
  const [speed, setSpeed] = useState<number>(0);
  const [rank, setRank] = useState<number>(1);
  const [currentLap, setCurrentLap] = useState<number>(1);
  const [lapProgress, setLapProgress] = useState<number>(0);
  const [driftGauge, setDriftGauge] = useState<number>(0);
  const [hasItem, setHasItem] = useState<ItemType>('booster');
  const [racerMapPoints, setRacerMapPoints] = useState<RacerMapPoint[]>([]);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [finishResults, setFinishResults] = useState<{ rank: number; totalTime: number; bestLap: number } | null>(null);

  // Keyboard input state
  const [inputState, setInputState] = useState<ControlInput>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    drift: false,
    useItem: false,
  });

  // Check URL query parameters for direct room join (e.g. ?room=ABCD)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setRoomCode(roomParam.toUpperCase());
      setShowMultiplayer(true);
    }
  }, []);

  // Initialize sound engine on first user interaction
  useEffect(() => {
    const handleFirstGesture = () => {
      soundEngine.init();
      soundEngine.resume();
      window.removeEventListener('keydown', handleFirstGesture);
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
    };

    window.addEventListener('keydown', handleFirstGesture);
    window.addEventListener('click', handleFirstGesture);
    window.addEventListener('touchstart', handleFirstGesture);

    return () => {
      window.removeEventListener('keydown', handleFirstGesture);
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
    };
  }, []);

  // Start Race Countdown
  const startRaceCountdown = useCallback(() => {
    soundEngine.init();
    soundEngine.resume();
    setIsGameStarted(false);
    setCountdown(3);
    soundEngine.playCountdownBeep(false);

    let count = 3;
    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
        soundEngine.playCountdownBeep(false);
      } else if (count === 0) {
        setCountdown(0); // Show "GO!"
        soundEngine.playCountdownBeep(true);
        setIsGameStarted(true);
      } else {
        clearInterval(interval);
        setCountdown(null);
      }
    }, 1000);
  }, []);

  // Trigger countdown when app loads or resets
  useEffect(() => {
    startRaceCountdown();
  }, [gameKey, startRaceCountdown]);

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (showCarSelect || showMultiplayer || showFinishModal) return;

      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          setInputState((prev) => ({ ...prev, forward: true }));
          break;
        case 'ArrowDown':
        case 'KeyS':
          setInputState((prev) => ({ ...prev, backward: true }));
          break;
        case 'ArrowLeft':
        case 'KeyA':
          setInputState((prev) => ({ ...prev, left: true }));
          break;
        case 'ArrowRight':
        case 'KeyD':
          setInputState((prev) => ({ ...prev, right: true }));
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          setInputState((prev) => ({ ...prev, drift: true }));
          break;
        case 'Space':
        case 'ControlLeft':
        case 'ControlRight':
          e.preventDefault();
          setInputState((prev) => ({ ...prev, useItem: true }));
          break;
        case 'KeyR':
          handleResetCar();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          setInputState((prev) => ({ ...prev, forward: false }));
          break;
        case 'ArrowDown':
        case 'KeyS':
          setInputState((prev) => ({ ...prev, backward: false }));
          break;
        case 'ArrowLeft':
        case 'KeyA':
          setInputState((prev) => ({ ...prev, left: false }));
          break;
        case 'ArrowRight':
        case 'KeyD':
          setInputState((prev) => ({ ...prev, right: false }));
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          setInputState((prev) => ({ ...prev, drift: false }));
          break;
        case 'Space':
        case 'ControlLeft':
        case 'ControlRight':
          setInputState((prev) => ({ ...prev, useItem: false }));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [showCarSelect, showMultiplayer, showFinishModal]);

  const handleUpdateInput = (key: keyof ControlInput, active: boolean) => {
    setInputState((prev) => ({ ...prev, [key]: active }));
  };

  const handleUseItem = () => {
    setInputState((prev) => ({ ...prev, useItem: true }));
    setTimeout(() => {
      setInputState((prev) => ({ ...prev, useItem: false }));
    }, 150);
  };

  const handleResetCar = () => {
    setGameKey((prev) => prev + 1);
  };

  const handleLapProgress = (
    lap: number,
    progress: number,
    currentSpeed: number,
    currentRank: number,
    gauge: number,
    item: ItemType,
    isFinished: boolean
  ) => {
    setCurrentLap(lap);
    setLapProgress(progress);
    setSpeed(currentSpeed);
    setRank(currentRank);
    setDriftGauge(gauge);
    setHasItem(item);
  };

  const handleLapComplete = (lap: number, lapTime: number) => {
    // Lap completed notification
  };

  const handleRaceFinish = (results: { rank: number; totalTime: number; bestLap: number }) => {
    setFinishResults(results);
    setShowFinishModal(true);
  };

  const handleSelectCar = (carId: CarModelId) => {
    setSelectedCarId(carId);
    setShowCarSelect(false);
    handleResetCar();
  };

  const handleSetMultiplayer = (active: boolean, code?: string) => {
    setIsMultiplayer(active);
    if (code) setRoomCode(code);
    handleResetCar();
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans">
      {/* 3D Game Canvas */}
      <GameCanvas
        key={gameKey}
        playerCarId={selectedCarId}
        playerName={playerName}
        isMultiplayer={isMultiplayer}
        inputState={inputState}
        onLapProgress={handleLapProgress}
        onLapComplete={handleLapComplete}
        onRaceFinish={handleRaceFinish}
        onRacersUpdate={(points, obs) => {
          setRacerMapPoints(points);
          setObstacles(obs);
        }}
        isGameStarted={isGameStarted}
      />

      {/* Arcade HUD */}
      <HUD
        carId={selectedCarId}
        speed={speed}
        rank={rank}
        totalRacers={isMultiplayer ? multiplayerNet.getRemotePlayers().length + 1 : 4}
        currentLap={currentLap}
        totalLaps={2}
        lapProgress={lapProgress}
        driftGauge={driftGauge}
        hasItem={hasItem}
        racerMapPoints={racerMapPoints}
        obstacles={obstacles}
        onUseItem={handleUseItem}
        onResetCar={handleResetCar}
        onOpenMultiplayer={() => setShowMultiplayer(true)}
        onOpenCarSelect={() => setShowCarSelect(true)}
        isMultiplayer={isMultiplayer}
        roomCode={roomCode}
      />

      {/* On-screen touch controls for mobile/tablet */}
      <TouchControls
        onUpdateInput={handleUpdateInput}
        hasItem={hasItem}
      />

      {/* Countdown 3, 2, 1, GO! Overlay */}
      {countdown !== null && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <span
              className={`font-orbitron font-black text-8xl md:text-9xl drop-shadow-[0_0_40px_rgba(0,229,255,0.8)] ${
                countdown === 0 ? 'text-emerald-400 scale-125' : 'text-sky-400 animate-bounce'
              }`}
            >
              {countdown === 0 ? 'GO!' : countdown}
            </span>
            <div className="mt-4 px-6 py-2 rounded-full bg-slate-900/80 border border-slate-700 text-xs font-orbitron font-bold text-slate-300">
              {countdown === 0 ? 'NEVER JUST DRIVE' : 'READY TO RACE'}
            </div>
          </div>
        </div>
      )}

      {/* Car Selection Showroom Modal */}
      {showCarSelect && (
        <CarSelectModal
          currentCarId={selectedCarId}
          onSelectCar={handleSelectCar}
          onClose={() => setShowCarSelect(false)}
        />
      )}

      {/* Multiplayer PeerJS Modal */}
      {showMultiplayer && (
        <MultiplayerModal
          currentCarId={selectedCarId}
          playerName={playerName}
          isMultiplayer={isMultiplayer}
          roomCode={roomCode}
          onSetMultiplayer={handleSetMultiplayer}
          onClose={() => setShowMultiplayer(false)}
        />
      )}

      {/* Race Finish Podium Modal */}
      {showFinishModal && finishResults && (
        <RaceFinishModal
          rank={finishResults.rank}
          totalTime={finishResults.totalTime}
          bestLap={finishResults.bestLap}
          carId={selectedCarId}
          onRestart={() => {
            setShowFinishModal(false);
            handleResetCar();
          }}
          onOpenCarSelect={() => {
            setShowFinishModal(false);
            setShowCarSelect(true);
          }}
        />
      )}
    </div>
  );
}
