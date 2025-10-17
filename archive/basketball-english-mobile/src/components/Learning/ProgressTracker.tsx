import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ProgressTracker = ({ progress }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Progress Tracker</Text>
      <Text style={styles.progressText}>Words Learned: {progress.wordsLearned}</Text>
      <Text style={styles.progressText}>Sessions Completed: {progress.sessionsCompleted}</Text>
      <Text style={styles.progressText}>Confidence Level: {progress.confidenceLevel}/5</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  progressText: {
    fontSize: 16,
    marginVertical: 5,
  },
});

export default ProgressTracker;