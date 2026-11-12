/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * BLV — Babi Life Vibes
 * Moteur Sonore Procédural GTA San Andreas (Web Audio API)
 * Sons de moteur, klaxons d'Abidjan, crissement de pneus, pas et jingle de succès
 */

class AudioFxService {
  private ctx: AudioContext | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private isEngineRunning: boolean = false;
  private isMuted: boolean = false;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopEngine();
    }
  }

  /**
   * Clic mécanique manette PlayStation & UI
   */
  public playButtonClick() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.045);
    } catch {}
  }

  /**
   * Bruit de pas (Bitume / Carrelage)
   */
  public playFootstep() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(90, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.055);
    } catch {}
  }

  /**
   * Klaxon typique Woro-woro / Gbaka d'Abidjan ("Tut-tuuut!")
   */
  public playCarHonk() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      [420, 520].forEach((freq) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.setValueAtTime(0.1, now + 0.22);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.28);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.3);
      });
    } catch {}
  }

  /**
   * Crissement de pneus / Dérapage Drift
   */
  public playTireScreech() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800 + Math.random() * 200, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(500, this.ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.16);
    } catch {}
  }

  /**
   * Choc de carrosserie (intensité 0..1) : impact grave + bruit métallique
   */
  public playCrash(intensity: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const k = Math.max(0.1, Math.min(1, intensity));

    try {
      const now = this.ctx.currentTime;
      const dur = 0.18 + k * 0.32;

      // Bruit blanc filtré (tôle froissée)
      const buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(900 + k * 900, now);
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.12 + k * 0.18, now);
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(now);

      // Choc grave
      const thump = this.ctx.createOscillator();
      const thumpGain = this.ctx.createGain();
      thump.type = 'sine';
      thump.frequency.setValueAtTime(120, now);
      thump.frequency.exponentialRampToValueAtTime(40, now + 0.18);
      thumpGain.gain.setValueAtTime(0.18 + k * 0.2, now);
      thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      thump.connect(thumpGain);
      thumpGain.connect(this.ctx.destination);
      thump.start(now);
      thump.stop(now + 0.24);
    } catch {}
  }

  /**
   * Démarrage et boucle de son de moteur de voiture GTA
   */
  public updateEngineSound(speedRatio: number) {
    if (this.isMuted) {
      this.stopEngine();
      return;
    }
    this.initCtx();
    if (!this.ctx) return;

    try {
      if (!this.isEngineRunning || !this.engineOsc || !this.engineGain) {
        this.engineOsc = this.ctx.createOscillator();
        this.engineGain = this.ctx.createGain();

        this.engineOsc.type = 'sawtooth';
        this.engineOsc.frequency.setValueAtTime(55, this.ctx.currentTime);
        this.engineGain.gain.setValueAtTime(0.05, this.ctx.currentTime);

        // Filtre passe-bas pour sonner comme un moteur d'échappement lourd
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, this.ctx.currentTime);

        this.engineOsc.connect(filter);
        filter.connect(this.engineGain);
        this.engineGain.connect(this.ctx.destination);

        this.engineOsc.start();
        this.isEngineRunning = true;
      }

      // Modulation de fréquence selon la vitesse
      const baseFreq = 55;
      const targetFreq = baseFreq + Math.abs(speedRatio) * 110;
      this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.08);

      const targetGain = 0.04 + Math.abs(speedRatio) * 0.06;
      this.engineGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.08);
    } catch {}
  }

  public stopEngine() {
    if (this.isEngineRunning && this.engineOsc && this.engineGain && this.ctx) {
      try {
        this.engineGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
        setTimeout(() => {
          try {
            this.engineOsc?.stop();
            this.engineOsc?.disconnect();
          } catch {}
          this.engineOsc = null;
          this.engineGain = null;
          this.isEngineRunning = false;
        }, 120);
      } catch {
        this.engineOsc = null;
        this.engineGain = null;
        this.isEngineRunning = false;
      }
    }
  }

  /**
   * Fanfare GTA San Andreas "Mission Passed / Badge Acquis"
   */
  public playMissionPassed() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [
        { f: 392.00, t: 0.00, d: 0.15 }, // Sol
        { f: 523.25, t: 0.16, d: 0.15 }, // Do
        { f: 659.25, t: 0.32, d: 0.15 }, // Mi
        { f: 783.99, t: 0.48, d: 0.45 }  // Sol aigu
      ];

      notes.forEach((n) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.f, now + n.t);

        gain.gain.setValueAtTime(0.18, now + n.t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + n.t);
        osc.stop(now + n.t + n.d);
      });
    } catch {}
  }
}

export const audioFx = new AudioFxService();
