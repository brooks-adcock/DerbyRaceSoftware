import React from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { SetupChecklist } from '../components/SetupChecklist';

export function HealthScreen() {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>System Health</Text>
          <Text style={styles.subtitle}>Current status of API and integrated services.</Text>
        </View>
        
        <View style={styles.content}>
          <SetupChecklist force_show={true} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 20,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
});

