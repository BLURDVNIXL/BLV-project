/**
 * Audio Engine for BLV:
 * 1. Live Radio streaming (RTI Fréquence 2, Skyrock Abidjan, WaveMaster) with honest live/fallback reporting
 * 2. Distinct procedural Web Audio synth grooves (Zouglou/Coupé-Décalé, Rap Ivoire, Afro-Jazz)
 * 3. Sound Effects (Horn, Cash, Sims WooHoo, Punch, Police Siren)
 */

export type RadioPlayStatus = 'idle' | 'live' | 'synth-fallback';

class SoundEngine {
  private audioCtx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private currentRadioStream: HTMLAudioElement | null = null;
  private isMuted = false;
  private synthLoopId: number | null = null;
  private isSynthPlaying = false;
  private radioStatus: RadioPlayStatus = 'idle';
  private onStatusChange: ((status: RadioPlayStatus) => void) | null = null;
  private currentStationKey: 'rti' | 'skyrock' | 'wavemaster' | 'silence' = 'silence';

  public init() {
    if (this.audioCtx) return;
    try {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      this.musicGain = this.audioCtx.createGain();
      this.sfxGain = this.audioCtx.createGain();

      this.musicGain.gain.value = this.isMuted ? 0 : 0.35;
      this.sfxGain.gain.value = this.isMuted ? 0 : 0.5;

      this.musicGain.connect(this.audioCtx.destination);
      this.sfxGain.connect(this.audioCtx.destination);
    } catch {
      // Ignore until user gesture
    }
  }

  public setStatusListener(cb: ((status: RadioPlayStatus) => void) | null) {
    this.onStatusChange = cb;
    cb?.(this.radioStatus);
  }

  private updateStatus(status: RadioPlayStatus) {
    this.radioStatus = status;
    this.onStatusChange?.(status);
  }

  public ensureContext() {
    if (!this.audioCtx) this.init();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  public pauseForMenu() {
    if (this.currentRadioStream) {
      this.currentRadioStream.pause();
    }
    this.stopProceduralMusic();
  }

  public setRadio(stationKey: 'rti' | 'skyrock' | 'wavemaster' | 'silence', streamUrl?: string) {
    this.ensureContext();
    this.currentStationKey = stationKey;

    if (this.currentRadioStream) {
      this.currentRadioStream.pause();
      this.currentRadioStream.src = '';
      this.currentRadioStream = null;
    }
    this.stopProceduralMusic();

    if (stationKey === 'silence') {
      this.updateStatus('idle');
      return;
    }

    if (stationKey === 'wavemaster' || !streamUrl) {
      this.startProceduralGroove(stationKey);
      this.updateStatus('synth-fallback');
      return;
    }

    try {
      const audio = new Audio();
      audio.src = streamUrl;
      audio.volume = this.isMuted ? 0 : 0.45;
      audio.onplaying = () => {
        if (this.currentStationKey === stationKey) {
          this.stopProceduralMusic();
          this.updateStatus('live');
        }
      };
      audio.onerror = () => {
        if (this.currentStationKey === stationKey) {
          this.startProceduralGroove(stationKey);
          this.updateStatus('synth-fallback');
        }
      };
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          if (this.currentStationKey === stationKey) {
            this.startProceduralGroove(stationKey);
            this.updateStatus('synth-fallback');
          }
        });
      }
      this.currentRadioStream = audio;
    } catch {
      this.startProceduralGroove(stationKey);
      this.updateStatus('synth-fallback');
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.musicGain) this.musicGain.gain.value = this.isMuted ? 0 : 0.35;
    if (this.sfxGain) this.sfxGain.gain.value = this.isMuted ? 0 : 0.5;
    if (this.currentRadioStream) this.currentRadioStream.volume = this.isMuted ? 0 : 0.45;
    return this.isMuted;
  }

  public isSoundMuted(): boolean {
    return this.isMuted;
  }

  private startProceduralGroove(stationKey: 'rti' | 'skyrock' | 'wavemaster') {
    if (this.isSynthPlaying || !this.audioCtx || !this.musicGain) return;
    this.isSynthPlaying = true;

    let step = 0;
    const bpm = stationKey === 'skyrock' ? 136 : stationKey === 'rti' ? 112 : 124;
    const stepInterval = 60 / bpm / 4;
    let nextNoteTime = this.audioCtx.currentTime + 0.05;

    const bassMap = {
      rti: [98.0, 98.0, 123.47, 130.81, 146.83, 130.81, 110.0, 98.0],
      skyrock: [65.41, 65.41, 77.78, 65.41, 87.31, 82.41, 65.41, 58.27],
      wavemaster: [87.31, 87.31, 130.81, 130.81, 146.83, 146.83, 116.54, 116.54],
    };
    const melodyMap = {
      rti: [392.0, 440.0, 493.88, 587.33, 659.25],
      skyrock: [261.63, 311.13, 349.23, 392.0, 466.16],
      wavemaster: [349.23, 392.0, 440.0, 523.25, 587.33, 698.46],
    };

    const bassNotes = bassMap[stationKey];
    const melodyNotes = melodyMap[stationKey];

    const schedule = () => {
      if (!this.isSynthPlaying || !this.audioCtx || !this.musicGain) return;

      while (nextNoteTime < this.audioCtx.currentTime + 0.2) {
        if (step % 4 === 0 || (stationKey !== 'rti' && step === 14)) {
          this.playKick(nextNoteTime);
        }
        if (step === 4 || step === 12) {
          this.playSnare(nextNoteTime);
        }
        if (step % 2 === 0 || (stationKey === 'skyrock' && step % 3 === 1)) {
          this.playShaker(nextNoteTime);
        }
        if (step % 2 === 0) {
          this.playBass(bassNotes[Math.floor(step / 2) % bassNotes.length], nextNoteTime);
        }
        if (step % 4 === 2 || step === 7 || step === 15) {
          this.playSynthPluck(melodyNotes[(step * 3) % melodyNotes.length], nextNoteTime);
        }
        nextNoteTime += stepInterval;
        step = (step + 1) % 16;
      }

      this.synthLoopId = window.setTimeout(schedule, 45);
    };

    schedule();
  }

  private stopProceduralMusic() {
    this.isSynthPlaying = false;
    if (this.synthLoopId !== null) {
      clearTimeout(this.synthLoopId);
      this.synthLoopId = null;
    }
  }

  private playKick(time: number) {
    if (!this.audioCtx || !this.musicGain) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.12);
    gain.gain.setValueAtTime(0.65, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.15);
  }

  private playSnare(time: number) {
    if (!this.audioCtx || !this.musicGain) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, time);
    gain.gain.setValueAtTime(0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.1);
  }

  private playShaker(time: number) {
    if (!this.audioCtx || !this.musicGain) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1850, time);
    gain.gain.setValueAtTime(0.1, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.04);
  }

  private playBass(freq: number, time: number) {
    if (!this.audioCtx || !this.musicGain) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.28, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.22);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.22);
  }

  private playSynthPluck(freq: number, time: number) {
    if (!this.audioCtx || !this.musicGain) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.26);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.26);
  }

  public playHorn() {
    this.ensureContext();
    if (!this.audioCtx || !this.sfxGain || this.isMuted) return;
    const now = this.audioCtx.currentTime;
    const osc1 = this.audioCtx.createOscillator();
    const osc2 = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(392, now);
    osc2.frequency.setValueAtTime(493.88, now);
    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  }

  public playCashSound() {
    this.ensureContext();
    if (!this.audioCtx || !this.sfxGain || this.isMuted) return;
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, now);
    osc.frequency.setValueAtTime(1318.51, now + 0.08);
    gain.gain.setValueAtTime(0.38, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.38);
  }

  public playWooHooJingle() {
    this.ensureContext();
    if (!this.audioCtx || !this.sfxGain || this.isMuted) return;
    const now = this.audioCtx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      if (!this.audioCtx || !this.sfxGain) return;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      const t0 = now + idx * 0.1;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0.35, t0);
      gain.gain.exponentialRampToValueAtTime(0.01, t0 + 0.24);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t0);
      osc.stop(t0 + 0.24);
    });
  }

  public playPoliceSiren() {
    this.ensureContext();
    if (!this.audioCtx || !this.sfxGain || this.isMuted) return;
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(650, now);
    osc.frequency.linearRampToValueAtTime(950, now + 0.25);
    osc.frequency.linearRampToValueAtTime(650, now + 0.5);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.58);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.58);
  }
}

export const soundEngine = new SoundEngine();
