import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "../TokenHandling/axiosInstance";

// Screens
import Onboarding from "./Onboarding";
import LoginScreen from "../Registration/LoginScreen";
import DrawerScreen from "./DrawerScreen";
import AttendanceStart from "../Task/AttendanceStart";
import AttendanceEnd from "../Task/AttendanceEnd";
import OTPVerificationScreen from "../Screens/OTPVerificationScreen";
import TokenDebugScreen from "../Screens/TokenDebugScreen";
import AllUsers from "../DrawerPages/AllUsers";
import Attendance from "../DrawerPages/Attendance";
import Calender from "../DrawerPages/Calender";
import TaskModal from "../DrawerPages/TaskModal";
import MyTask from "../DrawerPages/MyTask";
import UpdateStartTask from "../DrawerPages/UpdateStartTask";
import UpdateProfile from "../DrawerPages/UpdateProfile";
import SocketChatBox from "../Chats/screens/SocketChatBox";
import CreateGroup from "../Chats/ThreeDot/CreateGroup";

const Stack = createStackNavigator();

export default function AppNavigator() {
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    const determineInitialRoute = async () => {
      try {
        const token = await AsyncStorage.getItem("accessToken");
        if (!token) {
          setInitialRoute("LoginScreen");
          return;
        }

        const res = await axiosInstance.get("/me/");
        const { is_attendance_started, is_attendance_ended } = res.data;

        if (is_attendance_started && !is_attendance_ended) {
          setInitialRoute("DrawerScreen");  // Dashboard accessible
        } else {
          setInitialRoute("AttendanceStart");  // Force attendance start
        }
      } catch (err) {
        console.warn("Error fetching /me/:", err);
        setInitialRoute("LoginScreen");
      }
    };

    determineInitialRoute();
  }, []);

  if (!initialRoute) {
    return null;  // Splash screen / loader can be added here
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen 
        name="Onboarding" 
        component={Onboarding}
         />
        <Stack.Screen 
        name="LoginScreen" 
        component={LoginScreen} 
        />
        <Stack.Screen 
        name="OTPVerificationScreen"
         component={OTPVerificationScreen} 
         />
        <Stack.Screen 
        name="DrawerScreen"
         component={DrawerScreen}
          />
        <Stack.Screen 
        name="AttendanceStart"
         component={AttendanceStart} 
         />
        <Stack.Screen 
        name="AttendanceEnd" 
        component={AttendanceEnd}
         />
        <Stack.Screen 
        name="AllUsers" 
        component={AllUsers}
         />
        <Stack.Screen
         name="Attendance"
          component={Attendance}
           />
        <Stack.Screen 
        name="Calender" 
        component={Calender} 
        />
        <Stack.Screen 
        name="TaskModal"
         component={TaskModal} 
         />
        <Stack.Screen 
        name="MyTask" 
        component={MyTask} 
        />
        <Stack.Screen 
        name="UpdateStartTask"
         component={UpdateStartTask} 
         />
        <Stack.Screen 
        name="UpdateProfile" 
        component={UpdateProfile}
         />
        <Stack.Screen 
        name="SocketChatBox"
         component={SocketChatBox} 
         />
        <Stack.Screen
         name="CreateGroup" 
         component={CreateGroup}
          />
        <Stack.Screen
         name="TokenDebug" 
         component={TokenDebugScreen} 
         />
      </Stack.Navigator>
    </NavigationContainer>
  );
}



// import React from 'react';
// import { TouchableOpacity, Text } from 'react-native';
// import { NavigationContainer } from '@react-navigation/native';
// import { createNativeStackNavigator } from '@react-navigation/native-stack';
// import DrawerScreen from './DrawerScreen';
// import SignUp from '../Registration/SignUp';
// import LogIn from '../Registration/LogIn';
// import TokenDebugScreen from '../Screens/TokenDebugScreen';
// import Onboarding from './Onboarding';
// import OTPVerificationScreen from '../Screens/OTPVerificationScreen';
// import AllUsers from '../DrawerPages/AllUsers';
// import Calender from '../DrawerPages/Calender';
// import TaskModal from '../DrawerPages/TaskModal';
// import MyTask from '../DrawerPages/MyTask';
// import UpdateStartTask from '../DrawerPages/UpdateStartTask';
// import AttendanceStart from '../Task/AttendanceStart';
// import AttendanceEnd from '../Task/AttendanceEnd';
// import Attendance from '../DrawerPages/Attendance';
// import UpdateProfile from '../DrawerPages/UpdateProfile';
// import SocketChatBox from '../Chats/screens/SocketChatBox';
// import { ChatListScreen, ChatScreen } from '../Chats';
// import CreateGroup from '../Chats/ThreeDot/CreateGroup';
// import { useNavigation } from "@react-navigation/native";

// const Stack = createNativeStackNavigator();

// const AppNavigator = () => {
//   return (
//     <NavigationContainer>
//       <Stack.Navigator
//         initialRouteName="Onboarding"
//         screenOptions={{ headerShown: false }}
//       >
//         <Stack.Screen
//           name="Onboarding"
//           component={Onboarding}
//           options={{ headerShown: false }}
//         />
//         <Stack.Screen
//           name="LogIn"
//           component={LogIn}
//           options={{ headerShown: false }}
//         />
//         <Stack.Screen
//           name="DrawerScreen"
//           component={DrawerScreen}
//           options={{ headerShown: false }}
//         />
//         {/* Dummy Screen for Debugging */}
//         <Stack.Screen
//           name="TokenDebug"
//           component={TokenDebugScreen}
//         />
//         {/* OTP screen */}
//         <Stack.Screen
//           name="OTPVerificationScreen"
//           component={OTPVerificationScreen}
//           options={{ headerShown: false }}
//         />
//         {/* Task */}
//         <Stack.Screen
//           name="AttendanceStart"
//           component={AttendanceStart}
//           options={{ headerShown: false }}
//         />
//         <Stack.Screen
//           name="AttendanceEnd"
//           component={AttendanceEnd}
//           options={{ headerShown: false }}
//         />
//         {/* DrawerPage */}
//         <Stack.Screen
//           name="AllUsers"
//           component={AllUsers}
//           options={{ headerShown: false }}
//         />
//         <Stack.Screen
//           name="Attendance"
//           component={Attendance}
//           options={{ headerShown: false }}
//         />
//         <Stack.Screen
//           name="Calender"
//           component={Calender}
//           options={{ headerShown: false }}
//         />
//         <Stack.Screen
//           name="TaskModal"
//           component={TaskModal}
//           options={{ headerShown: false }}
//         />
//         <Stack.Screen
//           name="MyTask"
//           component={MyTask}
//           options={{ headerShown: false }}
//         />
//         <Stack.Screen
//           name="UpdateStartTask"
//           component={UpdateStartTask}
//           options={{ headerShown: false }}
//         />
//         <Stack.Screen
//           name="UpdateProfile"
//           component={UpdateProfile}
//           options={{ headerShown: false }}
//         />
//         {/* Chats Screen */}
//         {/* <Stack.Screen 
//           name="ChatList" 
//           component={ChatListScreen} 
//           options={{ title: 'Chats' }} 
//           />
//         <Stack.Screen 
//         name="ChatScreen" 
//         component={ChatScreen} 
//         options={{ title: 'Chat' }} 
//         /> */}
//         <Stack.Screen
//           name="SocketChatBox"
//           component={SocketChatBox}
//           options={{ title: 'SocketChatBox' }}
//         />
//         {/* ThreeDot */}
//         <Stack.Screen
//           name="CreateGroup"
//           component={CreateGroup}
//         />


//       </Stack.Navigator>
//     </NavigationContainer>
//   );
// };

// export default AppNavigator;
