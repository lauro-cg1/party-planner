// ==========================================
// PLANEJADOR DE FESTA JUNINA
// ==========================================

import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Platform, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';

import GuestListScreen from './src/screens/GuestListScreen';
import ShoppingListScreen from './src/screens/ShoppingListScreen';
import FinancesScreen from './src/screens/FinancesScreen';
import ChatbotScreen from './src/screens/ChatbotScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  const iosMajorVersion = Platform.OS === 'ios'
    ? Number(String(Platform.Version).split('.')[0])
    : null;
  const shouldSkipSplashVideo = Platform.OS === 'ios' && !!iosMajorVersion && iosMajorVersion <= 15;
  const [isReady, setIsReady] = useState(shouldSkipSplashVideo);

  const player = useVideoPlayer(require('./assets/loading.mp4'), (p) => {
    p.loop = false;
    p.muted = true;
    p.play();
  });

  useEffect(() => {
    if (shouldSkipSplashVideo) {
      return;
    }

    const subscription = player.addListener('playToEnd', () => {
      setIsReady(true);
    });

    const statusSubscription = player.addListener('statusChange', ({ status }) => {
      if (status === 'error') {
        setIsReady(true);
      }
    });

    // Prevent startup lock if the splash video cannot be decoded on older iOS devices.
    const timeoutId = setTimeout(() => {
      setIsReady(true);
    }, 5000);

    return () => {
      subscription.remove();
      statusSubscription.remove();
      clearTimeout(timeoutId);
    };
  }, [player, shouldSkipSplashVideo]);

  if (!isReady) {
    return (
      <View style={splashStyles.container}>
        <StatusBar style="light" />
        {shouldSkipSplashVideo ? (
          <Image source={require('./assets/Logo.png')} style={splashStyles.logo} resizeMode="contain" />
        ) : (
          <VideoView
            player={player}
            style={splashStyles.video}
            contentFit="cover"
            nativeControls={false}
          />
        )}
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Tab.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: '#FFF',
              elevation: 3,
              shadowOpacity: 0.1,
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 4,
              borderBottomWidth: 0,
            },
            headerTitleStyle: {
              fontSize: 20,
              fontWeight: '800',
              color: '#3E2723',
            },
            tabBarActiveTintColor: '#5D4037',
            tabBarInactiveTintColor: '#A1887F',
            tabBarStyle: {
              backgroundColor: '#FFF',
              borderTopWidth: 0,
              elevation: 8,
              shadowOpacity: 0.15,
              shadowOffset: { width: 0, height: -2 },
              shadowRadius: 8,
              paddingBottom: 10,
              paddingTop: 8,
              height: 72,
            },
            tabBarLabelStyle: {
              fontSize: 13,
              fontWeight: '700',
            },
            tabBarIconStyle: {
              marginBottom: -2,
            },
          }}
        >
          <Tab.Screen
            name="Convidados"
            component={GuestListScreen}
            options={{
              title: 'Convidados',
              headerTitle: 'Lista de Convidados',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="people" size={size + 2} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Compras"
            component={ShoppingListScreen}
            options={{
              title: 'Compras',
              headerTitle: 'Compras e Contratações',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="cart" size={size + 2} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Finanças"
            component={FinancesScreen}
            options={{
              title: 'Finanças',
              headerTitle: 'Gastos e Recebimentos',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="wallet" size={size + 2} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Chat"
            component={ChatbotScreen}
            options={{
              title: 'Assistente',
              headerTitle: 'Assistente IA',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="chatbubbles" size={size + 2} color={color} />
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  logo: {
    width: '70%',
    height: '70%',
    alignSelf: 'center',
  },
});
