import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import HebrewText from './HebrewText';

const VictoryFrame = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏆 Congratulations!</Text>
      <HebrewText text="הגעת להישג!" />
      <Text style={styles.message}>You've unlocked new skills and made great progress!</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default VictoryFrame;