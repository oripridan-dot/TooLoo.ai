import { Audio } from 'expo-av';

class SpatialAudio {
  constructor() {
    this.audioPlayers = {};
  }

  async loadSound(key, source) {
    const { sound } = await Audio.Sound.createAsync(source);
    this.audioPlayers[key] = sound;
  }

  async playSound(key) {
    if (this.audioPlayers[key]) {
      await this.audioPlayers[key].playAsync();
    }
  }

  async stopSound(key) {
    if (this.audioPlayers[key]) {
      await this.audioPlayers[key].stopAsync();
    }
  }

  async unloadSound(key) {
    if (this.audioPlayers[key]) {
      await this.audioPlayers[key].unloadAsync();
      delete this.audioPlayers[key];
    }
  }

  async setVolume(key, volume) {
    if (this.audioPlayers[key]) {
      await this.audioPlayers[key].setVolumeAsync(volume);
    }
  }

  async setPosition(key, position) {
    if (this.audioPlayers[key]) {
      await this.audioPlayers[key].setPositionAsync(position);
    }
  }

  async dispose() {
    for (const key in this.audioPlayers) {
      await this.unloadSound(key);
    }
  }
}

export default SpatialAudio;