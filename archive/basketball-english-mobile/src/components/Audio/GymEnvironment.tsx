import React, { useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { StyleSheet, View } from 'react-native';

const GymEnvironment = () => {
  const ambientSound = useRef(new Audio.Sound());
  const crowdSound = useRef(new Audio.Sound());

  useEffect(() => {
    const loadSounds = async () => {
      try {
        await ambientSound.current.loadAsync(require('../../../assets/audio/gym-ambient.mp3'));
        await crowdSound.current.loadAsync(require('../../../assets/audio/crowd-cheer.mp3'));
        await ambientSound.current.setIsLoopingAsync(true);
        await crowdSound.current.setIsLoopingAsync(true);
      } catch (error) {
        console.error('Error loading sounds:', error);
      }
    };

    loadSounds();

    return () => {
      ambientSound.current.unloadAsync();
      crowdSound.current.unloadAsync();
    };
  }, []);

  const playSounds = async () => {
    await ambientSound.current.playAsync();
    await crowdSound.current.playAsync();
  };

  const stopSounds = async () => {
    await ambientSound.current.stopAsync();
    await crowdSound.current.stopAsync();
  };

  return (
    <View style={styles.container}>
      {/* Additional UI elements can be added here */}
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

export default GymEnvironment;