/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * BLV — Babi Life Vibes
 * Service Audio Radio Live Streaming Direct de Côte d'Ivoire
 */

import { LIVE_RADIOS } from '../data/destinies';
import { RadioStation } from '../types/game';

class RadioService {
  private audioElement: HTMLAudioElement | null = null;
  private currentStationId: string = 'frequence2';
  private isPlaying: boolean = false;
  private volume: number = 0.7;
  private listeners: ((playing: boolean, stationId: string) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioElement = new Audio();
      this.audioElement.preload = 'none';
      this.audioElement.volume = this.volume;

      this.audioElement.addEventListener('playing', () => {
        this.isPlaying = true;
        this.notify();
      });

      this.audioElement.addEventListener('pause', () => {
        this.isPlaying = false;
        this.notify();
      });

      this.audioElement.addEventListener('error', (e) => {
        console.warn('[BLV Radio] Erreur de lecture streaming:', e);
        this.isPlaying = false;
        this.notify();
      });
    }
  }

  public subscribe(listener: (playing: boolean, stationId: string) => void) {
    this.listeners.push(listener);
    listener(this.isPlaying, this.currentStationId);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.isPlaying, this.currentStationId));
  }

  public getStation(stationId: string): RadioStation | undefined {
    return LIVE_RADIOS.find((s) => s.id === stationId);
  }

  public getCurrentStation(): RadioStation {
    return this.getStation(this.currentStationId) || LIVE_RADIOS[0];
  }

  public getStations(): RadioStation[] {
    return LIVE_RADIOS;
  }

  public playStation(stationId: string) {
    if (!this.audioElement) return;
    const station = this.getStation(stationId);
    if (!station) return;

    this.currentStationId = stationId;

    if (this.audioElement.src !== station.streamUrl) {
      this.audioElement.src = station.streamUrl;
      this.audioElement.load();
    }

    this.audioElement.play().catch((err) => {
      console.warn('[BLV Radio] Autoplay bloqué ou streaming en attente:', err);
    });
  }

  public togglePlay(stationId?: string): boolean {
    if (!this.audioElement) return false;

    if (stationId && stationId !== this.currentStationId) {
      this.playStation(stationId);
      return true;
    }

    if (this.isPlaying) {
      this.audioElement.pause();
      return false;
    } else {
      if (!this.audioElement.src || this.audioElement.src === '') {
        const station = this.getCurrentStation();
        this.audioElement.src = station.streamUrl;
      }
      this.audioElement.play().catch((err) => {
        console.warn('[BLV Radio] Reprise lecture bloquée:', err);
      });
      return true;
    }
  }

  public setVolume(vol: number) {
    const normalized = vol > 1 ? vol / 100 : vol;
    this.volume = Math.max(0, Math.min(1, normalized));
    if (this.audioElement) {
      this.audioElement.volume = this.volume;
    }
  }

  public stop() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    this.isPlaying = false;
    this.notify();
  }

  public getStatus() {
    return {
      isPlaying: this.isPlaying,
      currentStationId: this.currentStationId,
      volume: this.volume
    };
  }
}

export const radioService = new RadioService();
