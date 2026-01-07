import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function FooScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Foo Page</Text>
      <Text style={styles.text}>This is a placeholder page to demonstrate navigation.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 10,
  },
  text: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
});

