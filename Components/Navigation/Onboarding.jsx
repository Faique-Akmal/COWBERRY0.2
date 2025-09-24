
// import React, { useEffect } from 'react';
// import { ActivityIndicator, View } from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { useNavigation } from '@react-navigation/native';
// import { ensureFreshToken } from '../TokenHandling/authUtils';

// const Onboarding = () => {
//   const navigation = useNavigation();

//   useEffect(() => {
//     const checkAuth = async () => {
//       const token = await AsyncStorage.getItem('accessToken');

//       if (token) {
//         await ensureFreshToken();
//         navigation.reset({
//           index: 0,
//           routes: [{ name: 'DrawerScreen' }],
//         });
//       } else {
//         navigation.reset({
//           index: 0,
//           routes: [{ name: 'LogIn' }],
//         });
//       }
//     };

//     checkAuth();
//   }, []);

//   return (
//     <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
//       <ActivityIndicator size="large" />
//     </View>
//   );
// };

// export default Onboarding;

import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const Onboarding = () => {
  const navigation = useNavigation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const sid = await AsyncStorage.getItem('sid');

        if (sid) {
          // SID hai → logged in
          navigation.reset({
            index: 0,
            routes: [{ name: 'DrawerScreen' }],
          });
        } else {
          // SID nahi → login screen
          navigation.reset({
            index: 0,
            routes: [{ name: 'LoginScreen' }],
          });
        }
      } catch (error) {
        console.warn('Auth check failed:', error);
        navigation.reset({
          index: 0,
          routes: [{ name: 'LoginScreen' }],
        });
      }
    };

    checkAuth();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
};

export default Onboarding;
