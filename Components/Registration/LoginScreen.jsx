import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  NativeModules
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '@env';
import { ensureFreshToken } from "../TokenHandling/authUtils";
import { afterLogin } from "../native/afterLogin"; // 👈 new import
import { sendTokenToNative } from "../native/sendTokenToNative";


const { LocationServiceBridge } = NativeModules;

const LoginScreen = ({ navigation }) => {
  const [employeeCode, setEmployeeCode] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);

  // const handleLogin = async () => {
  //   if (!employeeCode || !password) {
  //     Alert.alert('Error', 'Please enter both fields');
  //     return;
  //   }

  //   try {
      
  //     const response = await axios.post(`${API_URL}/login/`, {
  //       employee_code: employeeCode,
  //       password: password,
  //     });


  //     const data = response.data;

  //     await AsyncStorage.setItem('accessToken', data.access);
  //     await AsyncStorage.setItem('refreshToken', data.refresh);
  //     await ensureFreshToken();
  //     await AsyncStorage.setItem('username', data.username);
  //     await AsyncStorage.setItem('email', data.email);
  //     await AsyncStorage.setItem('role', data.role);
  //     await AsyncStorage.setItem('employee_code', data.employee_code);


  //     if (data.is_employee_code_verified) {
  //       // Alert.alert('Success', data.message || 'Login Successful');
  //       navigation.replace('DrawerScreen');
  //     } else {
  //       navigation.navigate('OTPVerificationScreen', {
  //         refreshToken: data.refresh,
  //         employee_code: data.employee_code,
  //       });

  //     }

  //   } catch (error) {
  //     console.error('Login Error:', error.response?.data || error.message);
  //     const errorMsg =
  //       error.response?.data?.message || 'Invalid credentials or server error';
  //     Alert.alert('Login Failed', errorMsg);
  //   }
  // };

  const handleLogin = async () => {
  if (!employeeCode || !password) {
    Alert.alert("Error", "Please enter both fields");
    return;
  }

  try {
    const response = await axios.post(`${API_URL}/login/`, {
      employee_code: employeeCode,
      password: password,
    });

    const data = response.data;

    // ✅ save tokens and other details
// store RAW token (no "Bearer " prefix)
await AsyncStorage.setItem("accessToken", data.access); // raw JWT
await AsyncStorage.setItem("refreshToken", data.refresh);
await AsyncStorage.setItem("userId", String(data.id));
await AsyncStorage.setItem("username", data.username);
await AsyncStorage.setItem("email", data.email);
await AsyncStorage.setItem("role", data.role);
await AsyncStorage.setItem("employee_code", data.employee_code);

// update native with raw token, refresh token & userId
// send both tokens to native
try {
  if (LocationServiceBridge && LocationServiceBridge.setAuthToken) {
    await LocationServiceBridge.setAuthToken(data.access);
  }
  if (LocationServiceBridge && LocationServiceBridge.setRefreshToken) {
    await LocationServiceBridge.setRefreshToken(data.refresh);
  }
  if (LocationServiceBridge && LocationServiceBridge.setUserId) {
    await LocationServiceBridge.setUserId(String(data.id));
  }
  console.log("===DBG=== Sent access & refresh token to native");
} catch (e) {
  console.warn("===DBG=== Failed to send tokens to native:", e);
}

// continue app flow
// continue app flow (safe)
// try {
//   if (typeof afterLogin === "function") {
//     await afterLogin(data.id);
//     console.log("===DBG=== afterLogin called successfully");
//   } else {
//     console.warn("===DBG=== afterLogin is not a function:", typeof afterLogin);
//   }
// } catch (err) {
//   console.warn("===DBG=== afterLogin error", err);
// }



// optional: you can call ensureFreshToken() here but it's redundant immediately after login
// because you just saved a fresh token from the server. If you keep it, make sure it DOES NOT
// overwrite the fresh token erroneously.




    
 
// const { LocationServiceBridge } = NativeModules;
// // start or update interval - example:
// if (LocationServiceBridge && LocationServiceBridge.updateInterval) {
//   await LocationServiceBridge.updateInterval(120); // or backend interval
// }
// if (LocationServiceBridge && LocationServiceBridge.startTracking) {
//   await LocationServiceBridge.startTracking();
// }



    if (data.is_employee_code_verified) {
      navigation.replace("DrawerScreen");
    } else {
      navigation.navigate("OTPVerificationScreen", {
        refreshToken: data.refresh,
        employee_code: data.employee_code,
      });
    }
  } catch (error) {
    console.error("Login Error:", error.response?.data || error.message);
    const errorMsg =
      error.response?.data?.message || "Invalid credentials or server error";
    Alert.alert("Login Failed", errorMsg);
  }
};

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <Image
            source={require('../images/cowberryLogo.png')}
            style={styles.logo}
          />
          <Text style={styles.title}>Login</Text>

          {/* Employee Code */}
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#555" style={styles.icon} />
            <TextInput
              placeholder="Employee Code"
              value={employeeCode}
              onChangeText={setEmployeeCode}
              style={styles.input}
              placeholderTextColor="#888"
            />
          </View>

          {/* Password */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#555" style={styles.icon} />
            <TextInput
              placeholder="Password"
              secureTextEntry={secureText}
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              placeholderTextColor="#888"
            />
            <TouchableOpacity onPress={() => setSecureText(!secureText)}>
              <Ionicons
                name={secureText ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#555"
              />
            </TouchableOpacity>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity
            style={{ alignSelf: 'flex-end', marginBottom: 25 }}
            onPress={() => {
              Alert.alert(
                'Forgot Password',
                'Please contact admin or use reset password feature.',
                [{ text: 'OK', style: 'default' }]
              );
            }}
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>LOGIN</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 25,
    paddingTop: 50,
    paddingBottom: 60,
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    alignSelf: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
    color: '#222',
    marginBottom: 35,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#000',
  },
  forgotText: {
    color: '#2E7D32',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 15,
    borderRadius: 10,
    shadowColor: '#2E7D32',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 5,
    elevation: 3,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
});
