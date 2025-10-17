import { NativeModules } from 'react-native';

const { TextToSpeechModule } = NativeModules;

class TextToSpeech {
  static async speak(text: string, language: string = 'en') {
    try {
      await TextToSpeechModule.speak(text, language);
    } catch (error) {
      console.error('Text-to-Speech error:', error);
    }
  }

  static async setLanguage(language: string) {
    try {
      await TextToSpeechModule.setLanguage(language);
    } catch (error) {
      console.error('Error setting language:', error);
    }
  }

  static async stop() {
    try {
      await TextToSpeechModule.stop();
    } catch (error) {
      console.error('Error stopping speech:', error);
    }
  }
}

export default TextToSpeech;