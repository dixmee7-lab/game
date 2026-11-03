import React, { useState } from 'react';
import { Users, Copy, Check, X, Play, Share2 } from 'lucide-react';
import { multiplayerNet } from '../network/multiplayer';
import { CarModelId } from '../types';

interface MultiplayerModalProps {
  currentCarId: CarModelId;
  playerName: string;
  isMultiplayer: boolean;
  roomCode: string;
  onSetMultiplayer: (active: boolean, roomCode?: string) => void;
  onClose: () => void;
}

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  currentCarId,
  playerName,
  isMultiplayer,
  roomCode,
  onSetMultiplayer,
  onClose,
}) => {
  const [targetCode, setTargetCode] = useState('');
  const [createdCode, setCreatedCode] = useState(roomCode || '');
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Host a new room
  const handleCreateRoom = async () => {
    setIsCreating(true);
    setStatusMsg('PeerJS WebRTC 방 생성 중...');
    try {
      const code = await multiplayerNet.init();
      setCreatedCode(code);
      multiplayerNet.isHost = true;
      setStatusMsg(`방 생성 완료! 방 코드: ${code}`);
      onSetMultiplayer(true, code);
    } catch (e: any) {
      setStatusMsg('방 생성 실패: ' + (e?.message || '네트워크 오류'));
    } finally {
      setIsCreating(false);
    }
  };

  // Join existing room
  const handleJoinRoom = async () => {
    if (!targetCode.trim()) return;
    setIsJoining(true);
    setStatusMsg(`방 (${targetCode.toUpperCase()})에 연결 중...`);
    try {
      await multiplayerNet.joinRoom(targetCode.toUpperCase().trim(), playerName, currentCarId);
      setStatusMsg('방 참가 성공! 레이스를 시작합니다.');
      onSetMultiplayer(true, targetCode.toUpperCase().trim());
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (e: any) {
      setStatusMsg('참가 실패: 호스트 코드를 확인해주세요.');
    } finally {
      setIsJoining(false);
    }
  };

  // Copy share link
  const handleCopyLink = () => {
    const code = createdCode || roomCode;
    const shareUrl = `${window.location.origin}${window.location.pathname}?room=${code}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Switch to single player
  const handleSwitchToSingle = () => {
    multiplayerNet.disconnect();
    onSetMultiplayer(false);
    setStatusMsg('싱글 플레이 모드로 전환되었습니다.');
    setTimeout(() => onClose(), 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 md:p-8 text-white shadow-2xl relative">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-950 border border-sky-800 text-sky-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-orbitron font-bold text-sky-400">P2P WEBRTC MULTIPLAYER</div>
              <h2 className="text-xl font-orbitron font-bold text-white">멀티플레이 레이싱</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div className="mb-4 p-3 rounded-xl bg-sky-950/60 border border-sky-800/80 text-xs text-sky-300 font-mono">
            {statusMsg}
          </div>
        )}

        {/* Host Room Section */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 mb-4">
          <h3 className="font-orbitron font-bold text-sm text-slate-200 mb-2 flex items-center gap-2">
            <span>방 만들기 (HOST A RACE)</span>
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            새로운 방을 생성하고 친구에게 방 코드 또는 참가 링크를 전달하여 함께 대전하세요.
          </p>

          {createdCode || roomCode ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-700">
                <span className="text-xs text-slate-400">방 코드:</span>
                <span className="font-orbitron font-bold text-xl text-sky-400 tracking-wider">
                  {createdCode || roomCode}
                </span>
              </div>
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-orbitron font-bold text-xs transition-colors cursor-pointer shadow-lg shadow-sky-600/20"
              >
                {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                <span>{copied ? '초대 링크 복사 완료!' : '친구 초대 링크 복사'}</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleCreateRoom}
              disabled={isCreating}
              className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-orbitron font-bold text-xs transition-colors cursor-pointer"
            >
              {isCreating ? '방 생성 중...' : '새 방 생성하기 (CREATE ROOM)'}
            </button>
          )}
        </div>

        {/* Join Room Section */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 mb-6">
          <h3 className="font-orbitron font-bold text-sm text-slate-200 mb-2">
            방 참가하기 (JOIN EXISTING ROOM)
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="방 코드 입력 (예: 7AF2K)"
              value={targetCode}
              onChange={(e) => setTargetCode(e.target.value.toUpperCase())}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
            />
            <button
              onClick={handleJoinRoom}
              disabled={isJoining || !targetCode.trim()}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-orbitron font-bold text-xs transition-colors cursor-pointer"
            >
              {isJoining ? '연결 중...' : '참가'}
            </button>
          </div>
        </div>

        {/* Footer / Switch Mode */}
        <div className="flex justify-between items-center pt-2 border-t border-slate-800">
          {isMultiplayer ? (
            <button
              onClick={handleSwitchToSingle}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
            >
              싱글 플레이로 전환
            </button>
          ) : (
            <span className="text-xs text-slate-500">현재 모드: AI 싱글 플레이</span>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-white font-bold cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
