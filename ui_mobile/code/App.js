import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { HealthScreen } from './screens/HealthScreen';
import { FooScreen } from './screens/FooScreen';

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Health') {
            iconName = focused ? 'heart-pulse' : 'heart-pulse-outline';
          } else if (route.name === 'Foo') {
            iconName = focused ? 'code-slash' : 'code-slash-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Health" component={HealthScreen} />
      <Tab.Screen name="Foo" component={FooScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Drawer.Navigator
        screenOptions={{
          drawerActiveTintColor: '#2563eb',
          headerStyle: {
            backgroundColor: '#fff',
          },
          headerShadowVisible: false,
        }}
      >
        <Drawer.Screen 
          name="Main" 
          component={TabNavigator} 
          options={{ 
            title: 'Dashboard',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="apps-outline" size={size} color={color} />
            )
          }} 
        />
        <Drawer.Screen 
          name="Settings" 
          component={FooScreen} 
          options={{ 
            drawerIcon: ({ color, size }) => (
              <Ionicons name="settings-outline" size={size} color={color} />
            )
          }} 
        />
      </Drawer.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}
