import React, { useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { StyleSheet, View } from 'react-native';

const AudioSimulator = () => {
  const gymAmbientRef = useRef(new Audio.Sound());
  const crowdNoiseRef = useRef(new Audio.Sound());

  useEffect(() => {
    const loadSounds = async () => {
      try {
        await gymAmbientRef.current.loadAsync(require('../../../assets/audio/gym-ambient.mp3'));
        await crowdNoiseRef.current.loadAsync(require('../../../assets/audio/crowd-cheer.mp3'));
        await gymAmbientRef.current.setIsLoopingAsync(true);
        await crowdNoiseRef.current.setIsLoopingAsync(true);
      } catch (error) {
        console.error('Error loading sounds:', error);
      }
    };

    loadSounds();

    return () => {
      gymAmbientRef.current.unloadAsync();
      crowdNoiseRef.current.unloadAsync();
    };
  }, []);

  const startSimulation = async () => {
    await gymAmbientRef.current.playAsync();
    await crowdNoiseRef.current.playAsync();
  };

  const stopSimulation = async () => {
    await gymAmbientRef.current.stopAsync();
    await crowdNoiseRef.current.stopAsync();
  };

  return (
    <View style={styles.container}>
      {/* Add buttons or controls to start/stop the audio simulation */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AudioSimulator;