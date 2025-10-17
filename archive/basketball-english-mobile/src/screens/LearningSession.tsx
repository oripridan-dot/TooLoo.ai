import React from 'react';
import { View, StyleSheet } from 'react-native';
import CameraView from '../components/Camera/CameraView';
import MicrophoneInput from '../components/Audio/MicrophoneInput';
import AudioSimulator from '../components/Audio/AudioSimulator';
import WordCluster from '../components/Learning/WordCluster';
import DrillSession from '../components/Learning/DrillSession';
import ProgressTracker from '../components/Learning/ProgressTracker';

const LearningSession = () => {
  return (
    <View style={styles.container}>
      <CameraView />
      <MicrophoneInput />
      <AudioSimulator />
      <WordCluster />
      <DrillSession />
      <ProgressTracker />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LearningSession;