// import React from 'react';
// import { createDrawerNavigator } from '@react-navigation/drawer';
// import { Image, TouchableOpacity, View, Dimensions } from 'react-native';
// import { useNavigation } from '@react-navigation/native';
// import BottomScreen from './BottomScreen';
// import CustomDrawer from './CustomDrawer';

// const Drawer = createDrawerNavigator();
// const { width } = Dimensions.get('window');

// const DrawerLeftHeader = () => {
//   const navigation = useNavigation();

//   return (
//     <View
//       style={{
//         flexDirection: 'row',
//         alignItems: 'center',
//         justifyContent: 'space-between', 
//         paddingBottom: 10,
//         paddingHorizontal: 10,
//         height: 60,
//         width: width,
//       }}
//     >
//       {/* Left: Hamburger */}
//       <TouchableOpacity onPress={() => navigation.toggleDrawer()}>
//         <Image
//           source={require('../images/hamburger.png')}
//           style={{ width: 24, height: 24 }}
//         />
//       </TouchableOpacity>

//       {/* Center: Logo */}
//       <Image
//         source={require('../images/cowberryLogo.png')}
//         style={{ width: 120, height: 50, resizeMode: 'contain' }}
//       />

//       {/* Right: Invisible view to balance */}
//       <View style={{ width: 24 }} />
//     </View>
//   );
// };

// const DrawerScreen = () => {
//   return (
//     <Drawer.Navigator
//       initialRouteName="BottomScreen"
//       drawerContent={(props) => <CustomDrawer {...props} />}
//       screenOptions={{
//         headerLeft: () => <DrawerLeftHeader />,
//         headerTitle: '',
//         headerStyle: {
//           height: 60, 
//           elevation: 0,
//           shadowOpacity: 0,
//         },
//       }}
//     >
//       <Drawer.Screen name="BottomScreen" component={BottomScreen} />
//     </Drawer.Navigator>
//   );
// };

// export default DrawerScreen;


import React, { useEffect } from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Image, TouchableOpacity, View, Dimensions, Platform, Alert, Linking, PermissionsAndroid } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import BottomScreen from './BottomScreen';
import CustomDrawer from './CustomDrawer';
import { ensureFreshToken } from '../TokenHandling/authUtils';
import axiosInstance from '../TokenHandling/axiosInstance';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

const Drawer = createDrawerNavigator();
const { width } = Dimensions.get('window');

const DrawerLeftHeader = () => {
  const navigation = useNavigation();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between', 
        paddingBottom: 10,
        paddingHorizontal: 10,
        height: 60,
        width: width,
      }}
    >
      <TouchableOpacity onPress={() => navigation.toggleDrawer()}>
        <Image
          source={require('../images/hamburger.png')}
          style={{ width: 24, height: 24 }}
        />
      </TouchableOpacity>
      <Image
        source={require('../images/cowberryLogo.png')}
        style={{ width: 120, height: 50, resizeMode: 'contain' }}
      />
      <View style={{ width: 24 }} />
    </View>
  );
};

const DrawerScreen = () => {

  useEffect(() => {
    const loadData = async () => {
      await ensureFreshToken(); // token fresh karo
      try {
        const res = await axiosInstance.get('/me/');
        console.log('User Data:', res.data);
      } catch (err) {
        console.log('Error fetching user details:', err);
      }
    };
    loadData();
  }, []);

  // react-native-permission (All)
useEffect(() => {
  const checkAndRequestPermissions = async () => {
    // ---------------- Camera Permission ----------------
    if (Platform.OS === 'ios') {
      const cameraResult = await check(PERMISSIONS.IOS.CAMERA);

      if (cameraResult === RESULTS.UNAVAILABLE) {
        Alert.alert('Camera is not available on this device');
      } else if (cameraResult === RESULTS.DENIED || cameraResult === RESULTS.LIMITED) {
        const requestResult = await request(PERMISSIONS.IOS.CAMERA);
        if (requestResult !== RESULTS.GRANTED) {
          Alert.alert(
            'Camera Permission',
            'Please allow camera access in settings',
            [
              { text: 'Go to Settings', onPress: () => Linking.openSettings() },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
        }
      } else if (cameraResult === RESULTS.BLOCKED) {
        Alert.alert(
          'Camera Permission Blocked',
          'Please enable camera permission from settings',
          [
            { text: 'Go to Settings', onPress: () => Linking.openSettings() },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      } else if (cameraResult === RESULTS.GRANTED) {
        console.log('Camera permission granted');
      }

      // ---------------- Location Permission (Always + WhenInUse) ----------------
      const locationWhenInUse = await check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
      if (locationWhenInUse === RESULTS.DENIED) {
        await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
      }

      const locationAlways = await check(PERMISSIONS.IOS.LOCATION_ALWAYS);
      if (locationAlways === RESULTS.DENIED) {
        await request(PERMISSIONS.IOS.LOCATION_ALWAYS);
      }

      // ---------------- Precise Location (Accuracy) ----------------
      // const accuracyStatus = await check(PERMISSIONS.IOS.LOCATION_ACCURACY);
      // if (accuracyStatus === RESULTS.DENIED) {
      //   await request(PERMISSIONS.IOS.LOCATION_ACCURACY);
      // }

    } else if (Platform.OS === 'android') {
      try {
        // Android Camera Permission
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.CAMERA
        );
        if (!granted) {
          const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CAMERA,
            {
              title: 'Camera Permission',
              message: 'App needs camera access to take photos',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );

          if (result !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert( 
              'Camera Permission Denied',
              'You need to allow camera access to take photos.'
            );
          }
        }

        // Android Location Permission
        const locationGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'App needs location access to track deliveries',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        if (locationGranted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            'Location Permission Denied',
            'You need to allow location access to track deliveries.'
          );
        }

      } catch (err) {
        console.warn(err);
      }
    }
  };

  checkAndRequestPermissions();
}, []);

  return (
    <Drawer.Navigator
      initialRouteName="BottomScreen"
      drawerContent={(props) => <CustomDrawer {...props} />}
      screenOptions={{
        headerLeft: () => <DrawerLeftHeader />,
        headerTitle: '',
        headerStyle: {
          height: 60, 
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
      <Drawer.Screen name="BottomScreen" component={BottomScreen} />
    </Drawer.Navigator>
  );
};

export default DrawerScreen;
