import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';

const CoachAvatar = () => {
  return (
    <View style={styles.container}>
      <Image 
        source={require('../../assets/images/coach-avatar.png')} 
        style={styles.avatar} 
      />
      <Text style={styles.text}>Your Virtual Coach</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  text: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default CoachAvatar;