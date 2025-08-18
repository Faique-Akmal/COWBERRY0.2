import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { StyleSheet, SafeAreaView } from 'react-native'
import React from 'react'
import AppNavigator from './Components/Navigation/AppNavigator'
import { useEffect } from 'react';
import { startTokenRefreshInterval } from './Components/TokenHandling/tokenRefresher';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StartTask from './Components/Task/StartTask';
import EndTask from './Components/Task/EndTask';


const App = () => {

useEffect(() => {
  const intervalId = startTokenRefreshInterval();

  const checkStoredTokens = async () => {
    const refresh = await AsyncStorage.getItem('refreshToken');
    const access = await AsyncStorage.getItem('accessToken');
    console.log(" Stored Refresh Token:", refresh);
    console.log(" Stored Access Token:", access);
  };

  checkStoredTokens();

  return () => {
    clearInterval(intervalId);
  };
}, []);


return (
    <SafeAreaView style={styles.container}>
      <StartTask />
    </SafeAreaView>
  )
}

export default App

const styles = StyleSheet.create({
  container: {
    flex: 1,
   },
})
