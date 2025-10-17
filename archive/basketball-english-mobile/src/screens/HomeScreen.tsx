import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import HebrewText from '../components/UI/HebrewText';
import CoachAvatar from '../components/UI/CoachAvatar';
import AudioSimulator from '../components/Audio/AudioSimulator';

const HomeScreen = () => {
  return (
    <View style={styles.container}>
      <CoachAvatar />
      <HebrewText text="ברוך הבא לאימון כדורסל באנגלית!" />
      <AudioSimulator />
      <Text style={styles.instructions}>
        לחץ על הכפתור למטה כדי להתחיל את האימון.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  instructions: {
    marginTop: 20,
    fontSize: 18,
    textAlign: 'center',
  },
});

export default HomeScreen;