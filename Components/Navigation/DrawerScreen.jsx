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
import { Image, TouchableOpacity, View, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import BottomScreen from './BottomScreen';
import CustomDrawer from './CustomDrawer';
import { ensureFreshToken } from '../TokenHandling/authUtils';
import axiosInstance from '../TokenHandling/axiosInstance';

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
