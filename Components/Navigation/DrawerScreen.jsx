import React, { useEffect } from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Image, TouchableOpacity, View, Dimensions, Platform, Alert, Linking, PermissionsAndroid } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import BottomScreen from './BottomScreen';
import CustomDrawer from './CustomDrawer';
import { ensureFreshToken } from '../TokenHandling/authUtils';
import axiosInstance from '../TokenHandling/axiosInstance';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      <TouchableOpacity onPress={() => navigation.navigate('BottomScreen', { screen: 'Home' })}>
        <Image
          source={require('../images/cowberryLogo.png')}
          style={{ width: 120, height: 50, resizeMode: 'contain' }}
        />
      </TouchableOpacity>
      <View style={{ width: 24 }} />
    </View>
  );
};

const DrawerScreen = () => {
  const navigation = useNavigation();

  
  useEffect(() => {
    const checkAndRequestPermissions = async () => {
      if (Platform.OS === 'ios') {
        const cameraResult = await check(PERMISSIONS.IOS.CAMERA);
        if (cameraResult === RESULTS.DENIED || cameraResult === RESULTS.LIMITED) {
          const requestResult = await request(PERMISSIONS.IOS.CAMERA);
          if (requestResult !== RESULTS.GRANTED) {
            Alert.alert(
              'Camera Permission',
              'Please allow camera access in settings',
              [{ text: 'Go to Settings', onPress: () => Linking.openSettings() }, { text: 'Cancel', style: 'cancel' }]
            );
          }
        }

        const locationWhenInUse = await check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
        if (locationWhenInUse === RESULTS.DENIED) {
          await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
        }

        const locationAlways = await check(PERMISSIONS.IOS.LOCATION_ALWAYS);
        if (locationAlways === RESULTS.DENIED) {
          await request(PERMISSIONS.IOS.LOCATION_ALWAYS);
        }

      } else if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
        if (!granted) {
          const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
          if (result !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert('Camera Permission Denied', 'You need to allow camera access to take photos.');
          }
        }

        const locationGranted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        if (locationGranted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Location Permission Denied', 'You need to allow location access to track deliveries.');
        }
      }
    };

    checkAndRequestPermissions();
  }, []);

  useEffect(() => {
    const requestContactsPermission = async () => {
      const permission =
        Platform.OS === "android" ? PERMISSIONS.ANDROID.READ_CONTACTS : PERMISSIONS.IOS.CONTACTS;

      const result = await request(permission);
      if (result !== RESULTS.GRANTED) {
        Alert.alert('Permission Blocked', 'Enable contacts access from settings.');
      }
    };

    requestContactsPermission();
  }, []);

  useEffect(() => {
    const requestStoragePermission = async () => {
      let permission = Platform.OS === "android"
        ? Platform.Version >= 33
          ? PERMISSIONS.ANDROID.READ_MEDIA_IMAGES
          : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE
        : PERMISSIONS.IOS.PHOTO_LIBRARY;

      const result = await request(permission);
      if (result !== RESULTS.GRANTED) {
        Alert.alert('Storage Permission Blocked', 'Enable storage access from settings.');
      }
    };

    requestStoragePermission();
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

