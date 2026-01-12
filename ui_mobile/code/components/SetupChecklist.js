import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// In Expo, localhost won't work on physical devices or some emulators.
// For development, you may need to replace this with your machine's LAN IP.
const API_URL = 'http://localhost:8888'; 

export function SetupChecklist({ force_show = false }) {
  const [status, set_status] = useState(null);
  const [error, set_error] = useState(null);
  const [is_loading, set_is_loading] = useState(true);

  const fetchHealth = async () => {
    try {
      const response = await fetch(`${API_URL}/v1/health`);
      if (!response.ok) {
        throw new Error('Failed to fetch health status');
      }
      const data = await response.json();
      set_status(data);
      set_error(null);
    } catch (e) {
      set_error('Cannot connect to API server. Ensure backend is running.');
      set_status(null);
    } finally {
      set_is_loading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Loading state
  if (is_loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#94a3b8" />
        <Text style={styles.loadingText}>Checking system health...</Text>
      </View>
    );
  }

  // Don't show anything if healthy (unless forced)
  if (status?.is_healthy && !force_show) {
    return null;
  }

  // Success state if healthy
  if (status?.is_healthy) {
    return (
      <View style={[styles.container, styles.containerSuccess]}>
        <View style={styles.header}>
          <Ionicons name="checkmark-circle" size={20} color="#059669" />
          <Text style={[styles.title, styles.titleSuccess]}>All systems go!</Text>
        </View>
        <Text style={[styles.subtitle, styles.subtitleSuccess]}>
          API and all services are running correctly.
        </Text>
        
        <View style={[styles.list, styles.listSuccess]}>
          {status.checks.map((check) => (
            <View key={check.id} style={styles.item}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.itemLabelSuccess}>{check.label}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  const showGeminiPrompt = status?.checks.some(c => !c.is_ok && (c.id === 'gemini_key' || c.message.includes('GEMINI')));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="warning" size={20} color="#b45309" />
        <Text style={styles.title}>Setup Required</Text>
      </View>
      
      <Text style={styles.subtitle}>Complete the following to get started:</Text>
      
      <View style={styles.list}>
        {error ? (
          <View style={styles.item}>
            <Ionicons name="close-circle" size={16} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          status?.checks.map((check) => (
            <View key={check.id} style={styles.item}>
              <Ionicons 
                name={check.is_ok ? "checkmark-circle" : "close-circle"} 
                size={16} 
                color={check.is_ok ? "#10b981" : "#ef4444"} 
              />
              <View style={styles.itemContent}>
                <Text style={[styles.itemLabel, !check.is_ok && styles.itemLabelBold]}>
                  {check.label}
                </Text>
                {!check.is_ok && (
                  <Text style={styles.itemMessage}>{check.message}</Text>
                )}
              </View>
            </View>
          ))
        )}
      </View>
      
      {showGeminiPrompt && (
        <Text style={styles.footerText}>
          See .helper/gemini_setup.md for instructions.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  containerSuccess: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  loadingContainer: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
  },
  titleSuccess: {
    color: '#065f46',
  },
  subtitle: {
    fontSize: 14,
    color: '#b45309',
    marginBottom: 12,
  },
  subtitleSuccess: {
    color: '#047857',
    marginBottom: 0,
  },
  list: {
    gap: 8,
  },
  listSuccess: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#d1fae5',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  itemContent: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 14,
    color: '#4b5563',
  },
  itemLabelSuccess: {
    fontSize: 14,
    color: '#065f46',
  },
  itemLabelBold: {
    fontWeight: '500',
    color: '#1f2937',
  },
  itemMessage: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  errorText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  footerText: {
    fontSize: 12,
    color: '#d97706',
    marginTop: 12,
  },
});

