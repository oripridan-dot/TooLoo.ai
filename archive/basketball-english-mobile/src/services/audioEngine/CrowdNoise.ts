import { Audio } from 'expo-av';

class CrowdNoise {
  constructor() {
    this.sound = null;
  }

  async loadSound() {
    const { sound } = await Audio.Sound.createAsync(
      require('../../../assets/audio/crowd-cheer.mp3')
    );
    this.sound = sound;
  }

  async play() {
    if (this.sound) {
      await this.sound.playAsync();
    }
  }

  async stop() {
    if (this.sound) {
      await this.sound.stopAsync();
    }
  }

  async unload() {
    if (this.sound) {
      await this.sound.unloadAsync();
      this.sound = null;
    }
  }
}

export default CrowdNoise;