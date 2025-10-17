export interface AudioSettings {
  volume: number;
  balance: number;
  mute: boolean;
}

export interface AudioClip {
  id: string;
  source: string;
  duration: number;
}

export interface GymAudioEnvironment {
  ambientNoise: AudioClip;
  crowdNoise: AudioClip;
  whistleSound: AudioClip;
  basketballBounce: AudioClip;
}

export interface AudioSimulator {
  playClip(clip: AudioClip): void;
  stopClip(clip: AudioClip): void;
  setVolume(volume: number): void;
  mute(): void;
  unmute(): void;
}