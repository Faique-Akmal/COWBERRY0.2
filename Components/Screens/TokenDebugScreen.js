// src/screens/TokenDebugScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TokenDebugScreen = () => {
  const [token, setToken] = useState('');

  useEffect(() => {
    const interval = setInterval(async () => {
      const currentToken = await AsyncStorage.getItem('access');
      console.log('🔐 Current Access Token:', currentToken);
      setToken(currentToken);
    }, 10000); // every 10 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>🧪 Access Token:</Text>
      <Text style={styles.tokenText}>{token}</Text>
    </View>
  );
};

export default TokenDebugScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  label: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 8,
  },
  tokenText: {
    fontSize: 14,
    color: '#333',
  },
});
