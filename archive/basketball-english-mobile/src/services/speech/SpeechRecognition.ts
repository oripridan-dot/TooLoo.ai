import { NativeEventEmitter, NativeModules } from 'react-native';

const { SpeechRecognitionModule } = NativeModules;

class SpeechRecognition {
  constructor() {
    this.eventEmitter = new NativeEventEmitter(SpeechRecognitionModule);
    this.isListening = false;
  }

  async startListening(language = 'he-IL') {
    if (this.isListening) return;

    try {
      await SpeechRecognitionModule.start(language);
      this.isListening = true;
      this.setupListeners();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
    }
  }

  setupListeners() {
    this.eventEmitter.addListener('onSpeechResults', this.handleSpeechResults);
    this.eventEmitter.addListener('onSpeechError', this.handleSpeechError);
  }

  handleSpeechResults = (results) => {
    console.log('Speech results:', results);
    // Handle the recognized speech results here
  };

  handleSpeechError = (error) => {
    console.error('Speech recognition error:', error);
    this.isListening = false;
  };

  async stopListening() {
    if (!this.isListening) return;

    try {
      await SpeechRecognitionModule.stop();
      this.isListening = false;
      this.eventEmitter.removeListener('onSpeechResults', this.handleSpeechResults);
      this.eventEmitter.removeListener('onSpeechError', this.handleSpeechError);
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }
  }
}

export default SpeechRecognition;