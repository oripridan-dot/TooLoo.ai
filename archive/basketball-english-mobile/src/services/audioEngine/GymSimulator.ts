import { Audio } from 'expo-av';

class GymSimulator {
  constructor() {
    this.audio = new Audio.Sound();
    this.isPlaying = false;
  }

  async loadSounds() {
    try {
      await this.audio.loadAsync(require('../../assets/audio/gym-ambient.mp3'));
      await this.audio.loadAsync(require('../../assets/audio/crowd-cheer.mp3'));
      await this.audio.loadAsync(require('../../assets/audio/whistle.mp3'));
      await this.audio.loadAsync(require('../../assets/audio/basketball-bounce.mp3'));
    } catch (error) {
      console.error('Error loading sounds:', error);
    }
  }

  async playAmbientSound() {
    if (!this.isPlaying) {
      await this.audio.playAsync();
      this.isPlaying = true;
    }
  }

  async stopAmbientSound() {
    if (this.isPlaying) {
      await this.audio.stopAsync();
      this.isPlaying = false;
    }
  }

  async playCrowdCheer() {
    await this.audio.playAsync();
  }

  async playWhistle() {
    await this.audio.playAsync();
  }

  async playBasketballBounce() {
    await this.audio.playAsync();
  }

  async unloadSounds() {
    await this.audio.unloadAsync();
  }
}

export default GymSimulator;