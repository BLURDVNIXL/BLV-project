/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * BLV — Babi Life Vibes
 * Service de Synthèse Vocale & Voix Off Narrative de la Ville d'Abidjan
 */

class NarratorService {
  private synth: SpeechSynthesis | null = null;
  private isSpeaking: boolean = false;
  private enabled: boolean = true;
  private voices: SpeechSynthesisVoice[] = [];
  private hasUserInteracted: boolean = false;
  private endTimeout: number | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }

      // Détecter la première interaction utilisateur pour autoriser l'AudioContext
      const markInteracted = () => {
        this.hasUserInteracted = true;
        window.removeEventListener('click', markInteracted);
        window.removeEventListener('touchstart', markInteracted);
        window.removeEventListener('keydown', markInteracted);
      };
      window.addEventListener('click', markInteracted, { passive: true });
      window.addEventListener('touchstart', markInteracted, { passive: true });
      window.addEventListener('keydown', markInteracted, { passive: true });
    }
  }

  private loadVoices() {
    if (!this.synth) return;
    try {
      this.voices = this.synth.getVoices();
    } catch {}
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }

  public speak(text: string, isEnglish: boolean = false, onEnd?: () => void) {
    if (!this.enabled || !this.synth) {
      if (onEnd) onEnd();
      return;
    }

    try {
      if (this.endTimeout) clearTimeout(this.endTimeout);
      this.synth.cancel(); // Annule la lecture précédente pour éviter les files d'attente bloquées

      // Contournement du bug Chrome où la synthèse se fige après 15s ou en arrière-plan
      if (this.synth.paused) {
        this.synth.resume();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = isEnglish ? 'en-US' : 'fr-FR';
      utterance.pitch = 0.95;
      utterance.rate = 0.95;

      if (this.voices.length === 0) {
        this.loadVoices();
      }

      const preferredVoice = this.voices.find((v) =>
        isEnglish
          ? v.lang.startsWith('en')
          : v.lang.startsWith('fr')
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        this.isSpeaking = true;
      };

      const cleanup = () => {
        this.isSpeaking = false;
        if (this.endTimeout) clearTimeout(this.endTimeout);
        if (onEnd) onEnd();
      };

      utterance.onend = cleanup;
      utterance.onerror = (e) => {
        console.warn('[BLV Narrator] Synthèse vocale terminée ou interrompue:', e);
        cleanup();
      };

      // Sécurité anti-blocage (si le navigateur ne déclenche jamais onend)
      const approxDurationMs = Math.max(3000, (text.length / 15) * 1000 + 2000);
      this.endTimeout = window.setTimeout(() => {
        if (this.isSpeaking) {
          cleanup();
        }
      }, approxDurationMs);

      this.synth.speak(utterance);
    } catch (e) {
      console.warn('[BLV Narrator] Erreur voix off:', e);
      if (onEnd) onEnd();
    }
  }

  public stop() {
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {}
      this.isSpeaking = false;
    }
    if (this.endTimeout) {
      clearTimeout(this.endTimeout);
    }
  }

  public getIsSpeaking() {
    return this.isSpeaking;
  }
}

export const narratorService = new NarratorService();
