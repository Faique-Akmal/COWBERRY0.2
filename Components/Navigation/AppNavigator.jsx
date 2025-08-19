import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DrawerScreen from './DrawerScreen';
import SignUp from '../Registration/SignUp';
import LogIn from '../Registration/LogIn';
import TokenDebugScreen from '../Screens/TokenDebugScreen';
import Onboarding from './Onboarding';
import OTPVerificationScreen from '../Screens/OTPVerificationScreen';
import AllUsers from '../DrawerPages/AllUsers';
import Calender from '../DrawerPages/Calender';
import TaskModal from '../DrawerPages/TaskModal';
import MyTask from '../DrawerPages/MyTask';
import UpdateStartTask from '../DrawerPages/UpdateStartTask';
import StartTask from '../Task/StartTask';
import EndTask from '../Task/EndTask';


const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator 
      initialRouteName="Onboarding" 
      screenOptions={{ headerShown: false }}
      >
        <Stack.Screen
          name="Onboarding"
          component={Onboarding}
          options={{ headerShown: false }}
        />
         <Stack.Screen
          name="LogIn"
          component={LogIn}
          options={{ headerShown: false }}
        />
         <Stack.Screen
          name="DrawerScreen"
          component={DrawerScreen}
          options={{ headerShown: false }}
        />
       {/* Dummy Screen for Debugging */}
        <Stack.Screen 
        name="TokenDebug" 
        component={TokenDebugScreen}
         />
         {/* OTP screen */}
         <Stack.Screen 
         name="OTPVerificationScreen"
          component={OTPVerificationScreen} 
          options={{ headerShown: false }} 
          />
          {/* Task */}
          <Stack.Screen 
         name="StartTask"
          component={StartTask} 
          options={{ headerShown: false }} 
          />
          <Stack.Screen 
         name="EndTask"
          component={EndTask} 
          options={{ headerShown: false }} 
          />
          {/* DrawerPage */}
          <Stack.Screen 
         name="AllUsers"
          component={AllUsers} 
          options={{ headerShown: false }} 
          />
          <Stack.Screen 
         name="Calender"
          component={Calender} 
          options={{ headerShown: false }} 
          />
           <Stack.Screen 
         name="TaskModal"
          component={TaskModal} 
          options={{ headerShown: false }} 
          />
           <Stack.Screen 
         name="MyTask"
          component={MyTask} 
          options={{ headerShown: false }} 
          />
           <Stack.Screen 
         name="UpdateStartTask"
          component={UpdateStartTask} 
          options={{ headerShown: false }} 
          />




      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
