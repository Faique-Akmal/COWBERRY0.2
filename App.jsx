import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { StyleSheet, SafeAreaView } from 'react-native';
import React, { useEffect } from 'react';
import AppNavigator from './Components/Navigation/AppNavigator';
import { startTokenRefreshInterval } from './Components/TokenHandling/tokenRefresher';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';



const { LocationServiceBridge } = NativeModules;

const App = () => {
  useEffect(() => {
    const intervalId = startTokenRefreshInterval();

    const checkStoredTokens = async () => {
      const refresh = await AsyncStorage.getItem('refreshToken');
      const access = await AsyncStorage.getItem('accessToken');
      console.log('Stored Refresh Token:', refresh);
      console.log('Stored Access Token:', access);
    };

    checkStoredTokens();

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const initializeNativeAuth = async () => {
      const token = await AsyncStorage.getItem('accessToken');
      const userId = await AsyncStorage.getItem('userId');

      if (token && userId) {
        console.log('🌟 Re-initializing native module auth on app start');
        console.log('🔧 Setting authToken (without Bearer):', token.replace('Bearer ', ''));
        console.log('🔧 Setting userId:', userId);

        await LocationServiceBridge.setAuthToken(token.replace('Bearer ', ''));
        await LocationServiceBridge.setUserId(userId);

        console.log('✅ Native auth token & userId set successfully');
      } else {
        console.warn('⚠️ No stored token or userId found to initialize native module');
      }
    };

    initializeNativeAuth();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <AppNavigator />
    </SafeAreaView>
  );
};

export default App;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
