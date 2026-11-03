/**
 * Procedural Web Audio API Sound Engine for Arcade Kart Circuit
 * 100% synthesized sound with zero external audio files.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private engineOsc: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private driftGain: GainNode | null = null;
  private driftNoiseNode: AudioNode | null = null;
  private boostGain: GainNode | null = null;
  private boostNoiseNode: AudioNode | null = null;
  private isEngineRunning: boolean = false;
  private masterGain: GainNode | null = null;

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.7;
      this.masterGain.connect(this.ctx.destination);
      this.setupContinuousNodes();
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.7, this.ctx.currentTime, 0.05);
    }
  }

  public toggleMute(): boolean {
    this.setMute(!this.isMuted);
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  private setupContinuousNodes() {
    if (!this.ctx || !this.masterGain) return;

    // 1. Engine sound (Dual saw/triangle oscillators)
    this.engineOsc = this.ctx.createOscillator();
    this.engineSubOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineSubOsc.type = 'triangle';

    const engineFilter = this.ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 600;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;

    this.engineOsc.connect(engineFilter);
    this.engineSubOsc.connect(engineFilter);
    engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc.start();
    this.engineSubOsc.start();

    // 2. Continuous Drift Screech noise
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const driftFilter = this.ctx.createBiquadFilter();
    driftFilter.type = 'bandpass';
    driftFilter.frequency.value = 1200;
    driftFilter.Q.value = 3.0;

    this.driftGain = this.ctx.createGain();
    this.driftGain.gain.value = 0;

    whiteNoise.connect(driftFilter);
    driftFilter.connect(this.driftGain);
    this.driftGain.connect(this.masterGain);
    whiteNoise.start();
    this.driftNoiseNode = whiteNoise;

    // 3. Boost Roar Noise
    const boostNoise = this.ctx.createBufferSource();
    boostNoise.buffer = noiseBuffer;
    boostNoise.loop = true;

    const boostFilter = this.ctx.createBiquadFilter();
    boostFilter.type = 'lowpass';
    boostFilter.frequency.value = 800;

    this.boostGain = this.ctx.createGain();
    this.boostGain.gain.value = 0;

    boostNoise.connect(boostFilter);
    boostFilter.connect(this.boostGain);
    this.boostGain.connect(this.masterGain);
    boostNoise.start();
    this.boostNoiseNode = boostNoise;

    this.isEngineRunning = true;
  }

  public updateEngine(speedKmH: number, isAccelerating: boolean, isDrifting: boolean, isBoosting: boolean) {
    if (!this.ctx || !this.isEngineRunning || this.isMuted) return;

    const now = this.ctx.currentTime;
    const normalizedSpeed = Math.min(1.2, Math.max(0, speedKmH / 220));

    // Engine Pitch: base 55Hz (idle) up to 240Hz
    const targetFreq = 55 + normalizedSpeed * 170 + (isAccelerating ? 15 : 0);
    const subFreq = targetFreq * 0.5;

    if (this.engineOsc && this.engineSubOsc && this.engineGain) {
      this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.08);
      this.engineSubOsc.frequency.setTargetAtTime(subFreq, now, 0.08);

      const targetGain = 0.08 + normalizedSpeed * 0.12 + (isAccelerating ? 0.05 : 0);
      this.engineGain.gain.setTargetAtTime(targetGain, now, 0.06);
    }

    // Drift screech
    if (this.driftGain) {
      const targetDriftGain = isDrifting && speedKmH > 35 ? Math.min(0.22, (speedKmH / 150) * 0.22) : 0;
      this.driftGain.gain.setTargetAtTime(targetDriftGain, now, 0.05);
    }

    // Boost roar
    if (this.boostGain) {
      const targetBoostGain = isBoosting ? 0.25 : 0;
      this.boostGain.gain.setTargetAtTime(targetBoostGain, now, 0.05);
    }
  }

  /**
   * N e-Shift Pop & Bang exhaust crackle
   */
  public playPopAndBang() {
    if (!this.ctx || this.isMuted) return;
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const delay = i * 0.06 + Math.random() * 0.04;
      this.playCrackle(delay);
    }
  }

  private playCrackle(delaySec: number) {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime + delaySec;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'square';
    osc.frequency.setValueAtTime(140 + Math.random() * 60, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.05);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, t);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.07);
  }

  /**
   * Hyper Boost activation sound (Explosive rocket kick)
   */
  public playBoostStart(isHyper: boolean = false) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(isHyper ? 160 : 220, t);
    osc.frequency.exponentialRampToValueAtTime(isHyper ? 650 : 480, t + 0.35);

    gain.gain.setValueAtTime(isHyper ? 0.35 : 0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.42);
  }

  /**
   * Wing Item Deploy & Flight Whoosh
   */
  public playWingDeploy() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.25);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.5);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.55);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.6);
  }

  /**
   * Item pickup sound (arcade sparkling arpeggio)
   */
  public playItemPickup() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const noteTime = t + idx * 0.05;

      gain.gain.setValueAtTime(0.18, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(noteTime);
      osc.stop(noteTime + 0.13);
    });
  }

  /**
   * Jump Pad Launch sound
   */
  public playJumpPad() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.28);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.32);
  }

  /**
   * Obstacle hit sound (thud + spin screech)
   */
  public playObstacleHit() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.15);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.2);
  }

  /**
   * Duck Quack Sound (Procedural nasal quack)
   */
  public playQuack() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    [0, 0.12].forEach((delay) => {
      const qTime = t + delay;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const filter = this.ctx!.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(380, qTime);
      osc.frequency.exponentialRampToValueAtTime(210, qTime + 0.09);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, qTime);
      filter.Q.value = 5.0;

      gain.gain.setValueAtTime(0.25, qTime);
      gain.gain.exponentialRampToValueAtTime(0.01, qTime + 0.1);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(qTime);
      osc.stop(qTime + 0.11);
    });
  }

  /**
   * Grandma Horn / Cane Bell Sound
   */
  public playGrandmaHorn() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    const freqs = [1046, 1318]; // Double bell chime
    freqs.forEach((freq, idx) => {
      const bTime = t + idx * 0.08;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, bTime);

      gain.gain.setValueAtTime(0.25, bTime);
      gain.gain.exponentialRampToValueAtTime(0.001, bTime + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(bTime);
      osc.stop(bTime + 0.38);
    });
  }

  /**
   * Countdown beeps
   */
  public playCountdownBeep(isGo: boolean = false) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isGo ? 'triangle' : 'sine';
    osc.frequency.value = isGo ? 880 : 440; // A5 vs A4

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (isGo ? 0.5 : 0.2));

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + (isGo ? 0.55 : 0.22));
  }

  /**
   * Race finish victory fanfare
   */
  public playFinishFanfare() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    const chords = [
      { f: 523.25, d: 0.15 },
      { f: 659.25, d: 0.15 },
      { f: 783.99, d: 0.15 },
      { f: 1046.5, d: 0.45 },
    ];
    let offset = 0;
    chords.forEach((note) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.value = note.f;

      const noteTime = t + offset;
      gain.gain.setValueAtTime(0.2, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + note.d);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(noteTime);
      osc.stop(noteTime + note.d + 0.05);
      offset += 0.12;
    });
  }
}

export const soundEngine = new SoundEngine();
