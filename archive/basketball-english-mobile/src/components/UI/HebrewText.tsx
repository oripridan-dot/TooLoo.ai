import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';

const HebrewText = ({ children }) => {
  const [fontsLoaded] = useFonts({
    'hebrew-fonts': require('../../assets/fonts/hebrew-fonts.ttf'),
  });

  if (!fontsLoaded) {
    return null; // Optionally, you can return a loading indicator here
  }

  return (
    <Text style={styles.hebrewText}>
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  hebrewText: {
    fontFamily: 'hebrew-fonts',
    fontSize: 18,
    textAlign: 'right',
    color: '#000', // You can customize the color as needed
  },
});

export default HebrewText;