import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const WordCluster = () => {
  const words = ['ball', 'pass', 'dribble', 'coach', "let's go"];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Word Cluster</Text>
      <View style={styles.wordList}>
        {words.map((word, index) => (
          <Text key={index} style={styles.word}>
            {word}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  wordList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  word: {
    fontSize: 18,
    margin: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    backgroundColor: '#fff',
  },
});

export default WordCluster;