// import React, { useState } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   StyleSheet,
//   TouchableOpacity,
//   Image,
//   KeyboardAvoidingView,
//   Platform,
//   ScrollView,
//   Alert,
//   NativeModules
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import Ionicons from 'react-native-vector-icons/Ionicons';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import axios from 'axios';
// import { API_URL } from '@env';
// import { ensureFreshToken } from "../TokenHandling/authUtils";
// import { afterLogin } from "../native/afterLogin"; // 👈 new import
// import { sendTokenToNative } from "../native/sendTokenToNative";
// import { setNativeSession } from '../native/LocationBridge';

// const { LocationServiceBridge } = NativeModules;

// const LoginScreen = ({ navigation }) => {
//   const [username, setUsername] = useState('');
//   const [password, setPassword] = useState('');
//   const [secureText, setSecureText] = useState(true);

// const handleLogin = async () => {
//   if (!username || !password) {
//     Alert.alert("Error", "Please enter both fields");
//     return;
//   }

//   try {
//     const response = await axios.post(`${API_URL}/cowberry_app.api.api.login`, {
//       username,
//       password,
//     });

//     const data = response.data;
//   console.log(data?.message?.sid);
  
// if (data?.message?.sid) {
//   // Save SID in AsyncStorage
//   await AsyncStorage.setItem("sid", data.message.sid);
//   await AsyncStorage.setItem("username", data.message.user.full_name || "");
//   await AsyncStorage.setItem("email", data.message.user.email || "");

//   // NEW: push sid to native immediately (await it)
//   try {
//     const sessionSet = await setNativeSession(data.message.sid);
//     console.log('DBG: setNativeSession result ->', sessionSet);
//   } catch (e) {
//     console.warn('DBG: setNativeSession error', e);
//   }

//   // Navigate to DrawerScreen
//   navigation.reset({
//     index: 0,
//     routes: [{ name: "DrawerScreen" }],
//   });
// } else {
//   Alert.alert("Login Failed", "Invalid response from server");
// }

//   } catch (error) {
//     console.error("Login Error:", error.response?.data || error.message);
//     Alert.alert("Login Failed", "Invalid credentials or server error");
//   }
// };



//   return (
//     <SafeAreaView style={styles.container}>
//       <KeyboardAvoidingView
//         behavior={Platform.OS === 'ios' ? 'padding' : undefined}
//         style={{ flex: 1 }}
//       >
//         <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
//           <Image
//             source={require('../images/cowberryLogo.png')}
//             style={styles.logo}
//           />
//           <Text style={styles.title}>Login</Text>

//           {/* Employee Code */}
//           <View style={styles.inputContainer}>
//             <Ionicons name="person-outline" size={20} color="#555" style={styles.icon} />
//             <TextInput
//               placeholder="Username"
//               value={username}
//               onChangeText={setUsername}
//               style={styles.input}
//               placeholderTextColor="#888"
//             />
//           </View>

//           {/* Password */}
//           <View style={styles.inputContainer}>
//             <Ionicons name="lock-closed-outline" size={20} color="#555" style={styles.icon} />
//             <TextInput
//               placeholder="Password"
//               secureTextEntry={secureText}
//               value={password}
//               onChangeText={setPassword}
//               style={styles.input}
//               placeholderTextColor="#888"
//             />
//             <TouchableOpacity onPress={() => setSecureText(!secureText)}>
//               <Ionicons
//                 name={secureText ? 'eye-off-outline' : 'eye-outline'}
//                 size={20}
//                 color="#555"
//               />
//             </TouchableOpacity>
//           </View>

//           {/* Forgot Password */}
//           <TouchableOpacity
//             style={{ alignSelf: 'flex-end', marginBottom: 25 }}
//             onPress={() => {
//               Alert.alert(
//                 'Forgot Password',
//                 'Please contact admin or use reset password feature.',
//                 [{ text: 'OK', style: 'default' }]
//               );
//             }}
//           >
//             <Text style={styles.forgotText}>Forgot Password?</Text>
//           </TouchableOpacity>

//           {/* Login Button */}
//           <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
//             <Text style={styles.loginButtonText}>LOGIN</Text>
//           </TouchableOpacity>
//         </ScrollView>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// };

// export default LoginScreen;

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#fff',
//   },
//   scrollContainer: {
//     flexGrow: 1,
//     paddingHorizontal: 25,
//     paddingTop: 50,
//     paddingBottom: 60,
//   },
//   logo: {
//     width: 120,
//     height: 120,
//     resizeMode: 'contain',
//     alignSelf: 'center',
//     marginBottom: 30,
//   },
//   title: {
//     fontSize: 28,
//     fontWeight: '600',
//     textAlign: 'center',
//     color: '#222',
//     marginBottom: 35,
//   },
//   inputContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     borderColor: '#ddd',
//     borderWidth: 1,
//     borderRadius: 10,
//     paddingHorizontal: 12,
//     marginBottom: 15,
//     backgroundColor: '#f9f9f9',
//   },
//   icon: {
//     marginRight: 8,
//   },
//   input: {
//     flex: 1,
//     height: 50,
//     fontSize: 16,
//     color: '#000',
//   },
//   forgotText: {
//     color: '#2E7D32',
//     fontSize: 14,
//   },
//   loginButton: {
//     backgroundColor: '#2E7D32',
//     paddingVertical: 15,
//     borderRadius: 10,
//     shadowColor: '#2E7D32',
//     shadowOpacity: 0.3,
//     shadowOffset: { width: 0, height: 4 },
//     shadowRadius: 5,
//     elevation: 3,
//   },
//   loginButtonText: {
//     color: '#fff',
//     fontSize: 16,
//     textAlign: 'center',
//     fontWeight: 'bold',
//   },
// });

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
import { afterLogin } from "../native/afterLogin"; // 👈 existing import (kept)
import { sendTokenToNative } from "../native/sendTokenToNative";
import {
  setNativeSession,
  startNativeTracking,
  stopNativeTracking
} from '../native/LocationBridge'; // <-- added start/stop here

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
      console.log('Login response:', data);

      if (data?.message?.sid) {
        // Save SID and basic profile info
        await AsyncStorage.setItem("sid", data.message.sid);
        await AsyncStorage.setItem("username", data.message.user.full_name || "");
        await AsyncStorage.setItem("email", data.message.user.email || "");

        // Push sid to native session immediately (await to ensure native has it)
        try {
          const sessionSet = await setNativeSession(data.message.sid);
          console.log('DBG: setNativeSession result ->', sessionSet);
        } catch (e) {
          console.warn('DBG: setNativeSession error', e);
        }

        // --- NEW: decide tracking behaviour based on role & is_checkin ---
        try {
          const user = data.message.user || {};
          const roles = Array.isArray(user.roles) ? user.roles : [];
          const isField = roles.includes('Field Employee');
          const isCheckin = !!user.is_checkin;

          console.log('DBG: isField:', isField, 'is_checkin:', isCheckin);

          if (isField) {
            // Only attempt to start/stop tracking for Field Employee
            if (isCheckin) {
              // Start tracking
              try {
                // enable network posting on native side if available
                if (LocationServiceBridge && typeof LocationServiceBridge.enableNetworkPosting === 'function') {
                  try {
                    LocationServiceBridge.enableNetworkPosting();
                    console.log('DBG: enableNetworkPosting called');
                  } catch (e) {
                    console.warn('DBG: enableNetworkPosting failed', e);
                  }
                }

                // call native start (await in case native bridge returns a promise)
                const started = await startNativeTracking?.(5);
                console.log('DBG: startNativeTracking returned ->', started);
              } catch (e) {
                console.warn('Failed to start native tracking on login:', e);
              }
            } else {
              // Stop tracking (if any)
              try {
                const stopped = await stopNativeTracking?.();
                console.log('DBG: stopNativeTracking returned ->', stopped);

                if (LocationServiceBridge && typeof LocationServiceBridge.disableNetworkPosting === 'function') {
                  try {
                    LocationServiceBridge.disableNetworkPosting();
                    console.log('DBG: disableNetworkPosting called');
                  } catch (e) {
                    console.warn('DBG: disableNetworkPosting failed', e);
                  }
                }
              } catch (e) {
                console.warn('Failed to stop native tracking on login:', e);
              }
            }
          } else {
            console.log('Not Field Employee — skipping any native tracking changes.');
          }
        } catch (e) {
          console.warn('Error while evaluating tracking rules:', e);
        }
        // --- END NEW ---

        // Navigate to DrawerScreen
        navigation.reset({
          index: 0,
          routes: [{ name: "DrawerScreen" }],
        });
      } else {
        Alert.alert("Login Failed", "Invalid response from server");
      }
    } catch (error) {
      console.error("Login Error:", error.response?.data || error.message);
      Alert.alert("Login Failed", "Invalid credentials or server error");
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
