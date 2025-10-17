import React from 'react';
import { View, StyleSheet } from 'react-native';
import CameraView from '../components/Camera/CameraView';
import MicrophoneInput from '../components/Audio/MicrophoneInput';
import AudioSimulator from '../components/Audio/AudioSimulator';

const CameraMode = () => {
  return (
    <View style={styles.container}>
      <CameraView />
      <MicrophoneInput />
      <AudioSimulator />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

export default CameraMode;