import AsyncStorage from '@react-native-async-storage/async-storage';

class ProgressStorage {
  static async saveProgress(userId, progressData) {
    try {
      const jsonValue = JSON.stringify(progressData);
      await AsyncStorage.setItem(`progress_${userId}`, jsonValue);
    } catch (e) {
      console.error('Failed to save progress:', e);
    }
  }

  static async loadProgress(userId) {
    try {
      const jsonValue = await AsyncStorage.getItem(`progress_${userId}`);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (e) {
      console.error('Failed to load progress:', e);
      return null;
    }
  }

  static async clearProgress(userId) {
    try {
      await AsyncStorage.removeItem(`progress_${userId}`);
    } catch (e) {
      console.error('Failed to clear progress:', e);
    }
  }
}

export default ProgressStorage;