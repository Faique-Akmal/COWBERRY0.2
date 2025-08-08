import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../TokenHandling/axiosInstance'; 

const OTPVerificationScreen = ({ route, navigation }) => {
  const { refreshToken, employee_code } = route.params || {};
  const [otp, setOtp] = useState('');

  useEffect(() => {
  console.log('📦 OTP Screen Params:', route.params);
}, []);


const verifyOTP = async () => {
  if (!otp) {
    Alert.alert('Error', 'Please enter the OTP');
    return;
  }

  try {
    const response = await axiosInstance.post('/verify-otp/', {
      refresh: refreshToken,
      otp: otp,
    });

    console.log("✅ OTP response:", response.data);

    const newAccessToken = response.data.access;

    if (newAccessToken) {
      await AsyncStorage.setItem('accessToken', newAccessToken);
    } else {
      console.log("⚠️ No access token in OTP response. Skipping token save.");
    }

    Alert.alert('Verified', 'OTP Verified Successfully!');
    navigation.replace('DrawerScreen');

  } catch (error) {
    console.error('OTP Verification Error:', error.response?.data || error.message);
    Alert.alert('Verification Failed', 'Invalid OTP or session expired.');
  }
};


  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter OTP</Text>
      <Text style={styles.subtitle}>Sent to Employee Code: {employee_code}</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter OTP"
        keyboardType="numeric"
        value={otp}
        onChangeText={setOtp}
      />

      <TouchableOpacity style={styles.button} onPress={verifyOTP}>
        <Text style={styles.buttonText}>Verify OTP</Text>
      </TouchableOpacity>
    </View>
  );
};

export default OTPVerificationScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#555',
    marginBottom: 25,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 15,
    borderRadius: 10,
    fontSize: 16,
    height: 50,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
  },
  button: {
    backgroundColor: '#2E7D32',
    padding: 15,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});