// ==========================================
// PLANEJADOR DE FESTA JUNINA
// ==========================================

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import GuestListScreen from './src/screens/GuestListScreen';
import ShoppingListScreen from './src/screens/ShoppingListScreen';
import FinancesScreen from './src/screens/FinancesScreen';
import ChatbotScreen from './src/screens/ChatbotScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Tab.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: '#FFF',
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 1,
              borderBottomColor: '#F0F0F0',
            },
            headerTitleStyle: {
              fontSize: 18,
              fontWeight: '700',
              color: '#333',
            },
            tabBarActiveTintColor: '#E65100',
            tabBarInactiveTintColor: '#999',
            tabBarStyle: {
              backgroundColor: '#FFF',
              borderTopWidth: 1,
              borderTopColor: '#F0F0F0',
              paddingBottom: 8,
              paddingTop: 6,
              height: 60,
            },
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: '600',
            },
          }}
        >
          <Tab.Screen
            name="Convidados"
            component={GuestListScreen}
            options={{
              title: 'Convidados',
              headerTitle: '🎉 Lista de Convidados',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="people" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Compras"
            component={ShoppingListScreen}
            options={{
              title: 'Compras',
              headerTitle: '🛒 Compras e Contratações',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="cart" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Finanças"
            component={FinancesScreen}
            options={{
              title: 'Finanças',
              headerTitle: '💰 Gastos e Recebimentos',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="wallet" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Chat"
            component={ChatbotScreen}
            options={{
              title: 'Assistente',
              headerTitle: '🤖 Assistente IA',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="chatbubbles" size={size} color={color} />
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
