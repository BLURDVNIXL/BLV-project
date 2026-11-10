/**
 * GTA Abidjan - Web Audio API Procedural Sound Engine
 * Zero external audio files (Zero 404s).
 * Synthesizes engine sounds, car horns, sirens, gunshots, punches,
 * mission passed fanfare, and 3 procedural African radio stations.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted = false;

  // Engine sound state
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;

  // Siren sound state
  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private sirenLfo: OscillatorNode | null = null;

  // Radio state
  private activeRadioStation: string | null = 'gbaka_fm';
  private radioInterval: number | null = null;
  private radioStep = 0;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopEngine();
      this.stopSiren();
      this.stopRadio();
    } else {
      this.startRadio(this.activeRadioStation || 'gbaka_fm');
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Start continuous vehicle engine sound
   */
  public startEngine() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || this.engineOsc) return;

    try {
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(65, this.ctx.currentTime);

      // Lowpass filter to muffle harsh sawtooth
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, this.ctx.currentTime);

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);

      this.engineOsc.start();
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /**
   * Update engine pitch with RPM and speed
   */
  public updateEngine(speed: number, maxSpeed: number, throttle: number) {
    if (!this.engineOsc || !this.ctx || this.isMuted) return;
    const absSpeed = Math.abs(speed);
    const speedRatio = Math.min(1, absSpeed / maxSpeed);

    // Simulated 4-gear cycle
    const gearRatio = (speedRatio * 3.5) % 1;
    const baseFreq = 55 + (throttle > 0 ? 30 : 0);
    const targetFreq = baseFreq + gearRatio * 90 + speedRatio * 40;

    this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.08);
  }

  public stopEngine() {
    if (this.engineOsc) {
      try {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
      } catch {
        // ignore
      }
      this.engineOsc = null;
    }
  }

  /**
   * Car horn (Peugeot 504 dual-tone)
   */
  public playHorn() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(440, this.ctx.currentTime); // A4
    osc2.frequency.setValueAtTime(554.37, this.ctx.currentTime); // C#5

    gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(this.ctx.currentTime + 0.36);
    osc2.stop(this.ctx.currentTime + 0.36);
  }

  /**
   * Police siren (sweeping wail)
   */
  public startSiren() {
    if (this.isMuted || this.sirenOsc) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'sine';

      this.sirenLfo = this.ctx.createOscillator();
      this.sirenLfo.frequency.setValueAtTime(1.2, this.ctx.currentTime); // 1.2 Hz wail

      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(250, this.ctx.currentTime);

      this.sirenOsc.frequency.setValueAtTime(750, this.ctx.currentTime);
      this.sirenLfo.connect(lfoGain);
      lfoGain.connect(this.sirenOsc.frequency);

      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.ctx.destination);

      this.sirenLfo.start();
      this.sirenOsc.start();
    } catch {
      // ignore
    }
  }

  public stopSiren() {
    if (this.sirenOsc) {
      try {
        this.sirenOsc.stop();
        this.sirenLfo?.stop();
        this.sirenOsc.disconnect();
        this.sirenLfo?.disconnect();
      } catch {
        // ignore
      }
      this.sirenOsc = null;
      this.sirenLfo = null;
    }
  }

  /**
   * Gunshot sound
   */
  public playGunshot(weapon: string) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    // 1. Noise burst for gunshot crack
    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseGain = this.ctx.createGain();
    const volume = weapon === 'ak47' ? 0.3 : 0.22;
    noiseGain.gain.setValueAtTime(volume, this.ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

    // 2. Low boom
    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(weapon === 'ak47' ? 140 : 180, this.ctx.currentTime);
    subOsc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.15);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    subGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    noise.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);

    noise.start();
    subOsc.start();
    subOsc.stop(this.ctx.currentTime + 0.16);
  }

  /**
   * Punch / Melee Impact sound
   */
  public playPunch() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.12);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.28, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.13);
  }

  /**
   * GTA Mission Passed Fanfare (Trumpet-like synthesizer arpeggio)
   */
  public playMissionPassed() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99]; // C E G C E G
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * 0.14);

      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, this.ctx!.currentTime + idx * 0.14);

      const gain = this.ctx!.createGain();
      gain.gain.setValueAtTime(0.14, this.ctx!.currentTime + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + idx * 0.14 + 0.45);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(this.ctx!.currentTime + idx * 0.14);
      osc.stop(this.ctx!.currentTime + idx * 0.14 + 0.46);
    });
  }

  /**
   * Radio Station Synthesizer (Procedural African Grooves)
   */
  public startRadio(stationId: string | null) {
    this.stopRadio();
    this.activeRadioStation = stationId;
    if (!stationId || this.isMuted) return;

    this.initContext();
    if (!this.ctx) return;

    // Radio tuning static sound effect
    this.playTuningStatic();

    const bpm = stationId === 'gbaka_fm' ? 128 : stationId === 'ebony_radio' ? 140 : 96;
    const intervalMs = (60 / bpm / 4) * 1000; // 16th notes

    this.radioStep = 0;
    this.radioInterval = window.setInterval(() => {
      this.playRadioStep(stationId, this.radioStep);
      this.radioStep = (this.radioStep + 1) % 16;
    }, intervalMs);
  }

  public stopRadio() {
    if (this.radioInterval) {
      clearInterval(this.radioInterval);
      this.radioInterval = null;
    }
  }

  private playTuningStatic() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.08;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.connect(this.ctx.destination);
    noise.start();
  }

  private playRadioStep(station: string, step: number) {
    if (!this.ctx || this.isMuted) return;

    // Bass kick on 1, 5, 9, 13 (four on the floor for Coupé-Décalé)
    if (step % 4 === 0) {
      const kick = this.ctx.createOscillator();
      kick.type = 'sine';
      kick.frequency.setValueAtTime(110, this.ctx.currentTime);
      kick.frequency.exponentialRampToValueAtTime(35, this.ctx.currentTime + 0.08);

      const kickGain = this.ctx.createGain();
      kickGain.gain.setValueAtTime(0.16, this.ctx.currentTime);
      kickGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.09);

      kick.connect(kickGain);
      kickGain.connect(this.ctx.destination);
      kick.start();
      kick.stop(this.ctx.currentTime + 0.1);
    }

    // Snare / clap on 4, 12
    if (step === 4 || step === 12) {
      const snareOsc = this.ctx.createOscillator();
      snareOsc.type = 'triangle';
      snareOsc.frequency.setValueAtTime(180, this.ctx.currentTime);

      const snareGain = this.ctx.createGain();
      snareGain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      snareGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.07);

      snareOsc.connect(snareGain);
      snareGain.connect(this.ctx.destination);
      snareOsc.start();
      snareOsc.stop(this.ctx.currentTime + 0.08);
    }

    // Melodic synth / Coupé-Décalé stabs
    if (station === 'gbaka_fm') {
      const notes = [220, 261.63, 329.63, 392, 440, 523.25];
      const note = notes[(step * 3) % notes.length];
      if (step % 2 === 1) {
        const lead = this.ctx.createOscillator();
        lead.type = 'sawtooth';
        lead.frequency.setValueAtTime(note, this.ctx.currentTime);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, this.ctx.currentTime);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.035, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

        lead.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        lead.start();
        lead.stop(this.ctx.currentTime + 0.11);
      }
    }
  }
}

export const soundEngine = new SoundEngine();
