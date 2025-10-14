import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  NativeModules,
  ImageBackground
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '@env';
import { ensureFreshToken } from "../TokenHandling/authUtils";
import { afterLogin } from "../native/afterLogin";
import { sendTokenToNative } from "../native/sendTokenToNative";
import {
  setNativeSession,
  startNativeTracking,
  stopNativeTracking
} from '../native/LocationBridge';

const { LocationServiceBridge } = NativeModules;

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert("Error", "Please enter both fields");
      return;
    }
    try {
      const response = await axios.post(`${API_URL}/cowberry_app.api.api.login`, {
        username,
        password,
      });
      const data = response.data;

      if (data?.message?.sid) {
        await AsyncStorage.setItem("sid", data.message.sid);
        await AsyncStorage.setItem("username", data.message.user.full_name || "");
        await AsyncStorage.setItem("email", data.message.user.email || "");

        try {
          await setNativeSession(data.message.sid);
        } catch {}

        // tracking logic (untouched)
        try {
          const user = data.message.user || {};
          const roles = Array.isArray(user.roles) ? user.roles : [];
          const isField = roles.includes('Field Employee');
          const isCheckin = !!user.is_checkin;

          if (isField) {
            if (isCheckin) {
              try {
                try {
                  if (typeof stopNativeTracking === 'function') {
                    await stopNativeTracking();
                  } else if (LocationServiceBridge?.stopService) {
                    LocationServiceBridge.stopService();
                  }
                } catch {}
                if (LocationServiceBridge?.enableNetworkPosting) {
                  LocationServiceBridge.enableNetworkPosting();
                }
                await startNativeTracking?.(5);
              } catch {}
            } else {
              try {
                await stopNativeTracking?.();
                if (LocationServiceBridge?.disableNetworkPosting) {
                  LocationServiceBridge.disableNetworkPosting();
                }
              } catch {}
            }
          }
        } catch {}

        navigation.reset({
          index: 0,
          routes: [{ name: "DrawerScreen" }],
        });
      } else {
        Alert.alert("Login Failed", "Invalid response from server");
      }
    } catch (error) {
      Alert.alert("Login Failed", "Invalid credentials or server error");
    }
  };

  return (
    <SafeAreaView style={styles.page}>
      <ImageBackground
        source={require('../images/123.png')}
        style={styles.background}
        resizeMode="cover"
      >
          {/* Overlay absolute hoga */}
            <View style={styles.imageOverlay} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            
            <View style={styles.card}>
              <Text style={styles.title}>Login to continue</Text>
            

              {/* Username */}
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#555" style={styles.icon} />
                <TextInput
                  placeholder="Username"
                  value={username}
                  onChangeText={setUsername}
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
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </SafeAreaView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#fff', 
  },
 background: {
  flex: 1,
  width: '100%',
  height: '100%',
},

imageOverlay: {
  ...StyleSheet.absoluteFillObject, // 👈 pura screen cover karega
  backgroundColor: 'rgba(186, 186, 186, 0.6)', // thoda transparency
},

  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)', 
    borderRadius: 28,
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 40,
    color: '#000',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#e6e6e6',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 16,
    backgroundColor: '#fafafa',
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
    borderRadius: 40,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#2E7D32',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 4,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
});

