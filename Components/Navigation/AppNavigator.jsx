import React from "react";
import { createStackNavigator } from "@react-navigation/stack";

// Screens (same as before)
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
import EmployeeCheckinForm from "../Checkin/EmployeeCheckinForm";
import LeaveApplications from "../DrawerPages/LeaveApplications";
import LocationDebugScreen from "../Screens/LocationDebugScreen";

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Onboarding"
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
      <Stack.Screen
        name="EmployeeCheckinForm"
        component={EmployeeCheckinForm}
      />
      <Stack.Screen
        name="LeaveApplications"
        component={LeaveApplications}
      />
      <Stack.Screen
        name="LocationDebugScreen"
        component={LocationDebugScreen}
      />
    </Stack.Navigator>
  );
}


// NavigationContainer remove karne se pahle ka code

// import React from "react";
// import { NavigationContainer } from "@react-navigation/native";
// import { createStackNavigator } from "@react-navigation/stack";

// // Screens
// import Onboarding from "./Onboarding";
// import LoginScreen from "../Registration/LoginScreen";
// import DrawerScreen from "./DrawerScreen";
// import AttendanceStart from "../Task/AttendanceStart";
// import AttendanceEnd from "../Task/AttendanceEnd";
// import OTPVerificationScreen from "../Screens/OTPVerificationScreen";
// import TokenDebugScreen from "../Screens/TokenDebugScreen";
// import AllUsers from "../DrawerPages/AllUsers";
// import Attendance from "../DrawerPages/Attendance";
// import Calender from "../DrawerPages/Calender";
// import TaskModal from "../DrawerPages/TaskModal";
// import MyTask from "../DrawerPages/MyTask";
// import UpdateStartTask from "../DrawerPages/UpdateStartTask";
// import UpdateProfile from "../DrawerPages/UpdateProfile";
// import SocketChatBox from "../Chats/screens/SocketChatBox";
// import CreateGroup from "../Chats/ThreeDot/CreateGroup";
// import EmployeeCheckinForm from "../Checkin/EmployeeCheckinForm";
// import LeaveApplications from "../DrawerPages/LeaveApplications";

// const Stack = createStackNavigator();

// export default function AppNavigator() {
//   return (
//     <NavigationContainer>
//       <Stack.Navigator
//         initialRouteName="Onboarding"
//         screenOptions={{ headerShown: false }}
//       >
//         <Stack.Screen
//           name="Onboarding"
//           component={Onboarding}
//         />
//         <Stack.Screen
//           name="LoginScreen"
//           component={LoginScreen}
//         />
//         <Stack.Screen
//           name="OTPVerificationScreen"
//           component={OTPVerificationScreen}
//         />
//         <Stack.Screen
//           name="DrawerScreen"
//           component={DrawerScreen}
//         />
//         <Stack.Screen
//           name="AttendanceStart"
//           component={AttendanceStart}
//         />
//         <Stack.Screen
//           name="AttendanceEnd"
//           component={AttendanceEnd}
//         />
//         <Stack.Screen
//           name="AllUsers"
//           component={AllUsers}
//         />
//         <Stack.Screen
//           name="Attendance"
//           component={Attendance}
//         />
//         <Stack.Screen
//           name="Calender"
//           component={Calender}
//         />
//         <Stack.Screen
//           name="TaskModal"
//           component={TaskModal}
//         />
//         <Stack.Screen
//           name="MyTask"
//           component={MyTask}
//         />
//         <Stack.Screen
//           name="UpdateStartTask"
//           component={UpdateStartTask}
//         />
//         <Stack.Screen
//           name="UpdateProfile"
//           component={UpdateProfile}
//         />
//         <Stack.Screen
//           name="SocketChatBox"
//           component={SocketChatBox}
//         />
//         <Stack.Screen
//           name="CreateGroup"
//           component={CreateGroup}
//         />
//         <Stack.Screen
//           name="TokenDebug"
//           component={TokenDebugScreen}
//         />
//         <Stack.Screen
//           name="EmployeeCheckinForm"
//           component={EmployeeCheckinForm}
//         />
//         <Stack.Screen
//           name="LeaveApplications"
//           component={LeaveApplications}
//         />
//       </Stack.Navigator>
//     </NavigationContainer>
//   );
// }




