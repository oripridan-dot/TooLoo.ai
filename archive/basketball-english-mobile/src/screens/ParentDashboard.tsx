import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import ProgressTracker from '../components/Learning/ProgressTracker';
import HebrewText from '../components/UI/HebrewText';

const ParentDashboard = () => {
  return (
    <View style={styles.container}>
      <ScrollView>
        <Text style={styles.title}>Parent Dashboard</Text>
        <HebrewText text="ברוך הבא ללוח הבקרה של ההורים!" />
        <Text style={styles.subtitle}>התקדמות הילד שלך:</Text>
        <ProgressTracker />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    marginVertical: 10,
  },
});

export default ParentDashboard;