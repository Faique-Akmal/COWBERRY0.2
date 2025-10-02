import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import axiosInstance from '../TokenHandling/axiosInstance';
import { BlurView } from '@react-native-community/blur';

const { width } = Dimensions.get('window');

const CustomDrawer = (props) => {
  const [userData, setUserData] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const response = await axiosInstance.get('/cowberry_app.api.profile.get_profile');
        const profile = response.data.message;

        // Filter Employee role only
        const employeeRole = profile.roles.includes('Employee') ? 'Employee' : '';

        setUserData({
          full_name: profile.full_name,
          email: profile.email,
          employee_id: profile.employee_id,
          company: profile.company,
          role: employeeRole,
        });
      } catch (error) {
        console.error('Error fetching user details:', error.response?.data || error.message);
        Alert.alert('Error', 'Failed to fetch profile data.');
      }
    };

    fetchUserDetails();
  }, []);

  const handleLogout = async () => {
    try {
      await axiosInstance.post('/cowberry_app.api.api.custom_logout', {});
      await AsyncStorage.clear();

      navigation.reset({
        index: 0,
        routes: [{ name: 'LoginScreen' }],
      });

      Alert.alert('Success', 'You have been logged out.');
    } catch (error) {
      console.error('Logout error:', error.response?.data || error.message);
      Alert.alert('Error', 'Logout failed. Please try again.');
    }
  };

  return (
     <BlurView
      style={styles.container}
      blurType="light"     // light | dark | extraLight
      blurAmount={6}      // blur intensity
    >
    <View style={styles.container}>
      <DrawerContentScrollView {...props} contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <View style={styles.profileContainer}>
            {userData && (
              <Image
                source={
                  userData.profile_image
                    ? { uri: userData.profile_image }
                    : require("../images/profile.webp")
                }
                style={styles.avatar}
              />
            )}

            <View style={styles.profileTextContainer}>
              {userData ? (
                <>
                  <Text style={styles.name}>{userData.full_name}</Text>
                  <Text style={styles.role}>{userData.employee_id}</Text>
                  <Text style={styles.email}>{userData.email}</Text>
                  <Text style={styles.role}>Company: {userData.company}</Text>
                  <Text style={styles.role}>Role: {userData.role}</Text>
                </>
              ) : (
                <ActivityIndicator size="small" color="#4E8D7C" />
              )}
            </View>
          </View>
        </View>

        {/* Buttons below settings */}
        <View>
          {/* <TouchableOpacity style={[styles.customButton]} onPress={() => navigation.navigate('SocketChatBox')}>
            <MaterialIcons name="chat" size={20} color="#ffe3afff" />
            <Text style={styles.newButtonText}>Chats</Text>
          </TouchableOpacity> */}

          <TouchableOpacity style={[styles.customButton]} onPress={() => navigation.navigate('Attendance')}>
            <MaterialIcons name="view-list" size={20} color="rgba(255, 255, 255, 0.9)" />
            <Text style={styles.newButtonText}>Employee Checkin</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.customButton]} onPress={() => navigation.navigate('Calender')}>
            <MaterialIcons name="calendar-month" size={20} color="rgba(255, 255, 255, 0.9)" />
            <Text style={styles.newButtonText}>Calender</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.customButton]} onPress={() => navigation.navigate('MyTask')}>
            <FontAwesome5 name="tasks" size={20} color="rgba(255, 255, 255, 0.9)" />
            <Text style={styles.newButtonText}>My Task</Text>
          </TouchableOpacity>

          {/* <TouchableOpacity style={[styles.customButton]} onPress={() => navigation.navigate('AllUsers')}>
            <FontAwesome name="users" size={20} color="#ffe3afff" />
            <Text style={styles.newButtonText}>All Users</Text>
          </TouchableOpacity> */}

       <TouchableOpacity
  style={[styles.customButton]}
  onPress={() =>
    navigation.navigate('LeaveApplications', {
      employeeCode: userData?.employee_id, // yahan se employeeCode pass kar rahe
    })
  }
>
  <FontAwesome name="users" size={20} color="rgba(255, 255, 255, 0.9)" />
  <Text style={styles.newButtonText}>Leave Applications</Text>
</TouchableOpacity>

        </View>
      </DrawerContentScrollView>

      {/* Logout */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
         
            <Ionicons name="log-out-outline" size={22} color="#fff" />
       
          <Text style={styles.logoutText}>Logout</Text>
          
        </TouchableOpacity>
      </View>
    </View>
    </BlurView>
  );
};

export default CustomDrawer;





const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderColor:"rgba(255, 255, 255, 0.34)",
    borderRightWidth:1
    // backgroundColor: 'rgba(210, 175, 111, 0.84)',
  },
  customButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 7,
    borderRadius: 8,
    marginVertical: 4,
    backgroundColor: '#377255',
  },
  newButtonText: {
    marginLeft: 10,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: "700"
  },
  scrollContainer: {
    paddingTop: 0,
    paddingBottom: 20,
    
  },
  header: {
    padding: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.34)',
    marginBottom: 10
    
  },
  profileContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  avatar: {
    height: 70,
    width: 70,
    borderRadius: 35,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.81)',
  },
  profileTextContainer: {
    // marginLeft: 15,
    marginTop: 10,
    alignItems: 'center',
   
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  email: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 3,
  },
   role: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 3,
  },

  actionButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  actionButton: {
    width: width * 0.38,
    backgroundColor: '#4E8D7C',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonIconWrapper: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    padding: 5,
    marginRight: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonElevation: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 20,
    marginVertical: 10,
  },

  buttonHoverEffect: {
    borderLeftWidth: 4,
    borderLeftColor: '#4E8D7C',
  },

  customButtonText: {
    color: '#555',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 15,
  },
  notificationBadge: {
    position: 'absolute',
    right: 25,
    backgroundColor: '#000',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.34)',
     },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
     backgroundColor:"#DC2525",
     alignSelf:"flex-start",
   
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 5,
  
  },
});


// import React, { useEffect, useState } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   TouchableOpacity,
//   Dimensions,
//   ActivityIndicator,
//   Alert,
// } from 'react-native';
// import { DrawerContentScrollView } from '@react-navigation/drawer';
// import Ionicons from 'react-native-vector-icons/Ionicons';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import FontAwesome from 'react-native-vector-icons/FontAwesome';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { useNavigation } from '@react-navigation/native';
// import axios from 'axios';
// import { API_URL } from '@env';
// import AntDesign from 'react-native-vector-icons/AntDesign';
// import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
// import axiosInstance from '../TokenHandling/axiosInstance';

// const { width } = Dimensions.get('window');

// const CustomDrawer = (props) => {
//   const [userData, setUserData] = useState(null);
//   const navigation = useNavigation();

//   // useEffect(() => {
//   //   const fetchUserDetails = async () => {
//   //     try {
//   //       const response = await axiosInstance.get('/me/');
//   //       setUserData(response.data);
//   //     } catch (error) {
//   //       console.error('Error fetching user details:', error);
//   //     }
//   //   };

//   //   fetchUserDetails();
//   // }, []);


// const handleLogout = async () => {
//   try {
//     // Frappe custom logout endpoint
//     await axiosInstance.post('/cowberry_app.api.api.custom_logout', {});

//     // AsyncStorage me jo bhi store tha wo clear karo
//     await AsyncStorage.clear();

//     // Navigation reset to Login screen
//     navigation.reset({
//       index: 0,
//       routes: [{ name: 'LoginScreen' }],
//     });

//     Alert.alert('Success', 'You have been logged out.');
//   } catch (error) {
//     console.error('Logout error:', error.response?.data || error.message);
//     Alert.alert('Error', 'Logout failed. Please try again.');
//   }
// };

//   return (

//     <View style={styles.container}>
//       <DrawerContentScrollView {...props} contentContainerStyle={styles.scrollContainer}>
//         {/* Profile Section */}
//         <View style={styles.header}>
//           <View style={styles.profileContainer}>
            
//             {userData && (
//               <Image
//                 source={
//                   userData.profile_image
//                     ? { uri: userData.profile_image }
//                     : require("../images/profile.webp")
//                 }
//                 style={styles.avatar}
//               />
//             )}

//             <View style={styles.profileTextContainer}>
//               {userData ? (
//                 <>
//                   <Text style={styles.name}>{userData.username}</Text>
//                   <Text style={styles.role}>Role: {userData.role}</Text>
//                   <Text style={styles.email}>{userData.email}</Text>
//                   <Text style={styles.role}>Address: {userData.address}</Text>
//                 </>
//               ) : (
//                 <ActivityIndicator size="small" color="#4E8D7C" />
//               )}
//             </View>
//           </View>
//         </View>



//         {/* NEW BUTTONS BELOW SETTINGS */}
//         <View>


//           <TouchableOpacity
//             style={[styles.customButton]}
//             onPress={() => navigation.navigate('SocketChatBox')}>
//             <MaterialIcons name="chat" size={20} color="#ffe3afff" />
//             <Text style={styles.newButtonText}>Chats</Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={[styles.customButton]}
//             onPress={() => navigation.navigate('Attendance')}>
//             <MaterialIcons name="view-list" size={20} color="#ffe3afff" />
//             <Text style={styles.newButtonText}>Attandance</Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={[styles.customButton]}
//             onPress={() => navigation.navigate('Calender')}>
//             <MaterialIcons name="calendar-month" size={20} color="#ffe3afff" />
//             <Text style={styles.newButtonText}>Calender</Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={[styles.customButton]}
//             onPress={() => navigation.navigate('MyTask')}>
//             <FontAwesome5 name="tasks" size={20} color="#ffe3afff" />
//             <Text style={styles.newButtonText}>My Task</Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={[styles.customButton]}
//             onPress={() => navigation.navigate('AllUsers')}>
//             <FontAwesome name="users" size={20} color="#ffe3afff" />
//             <Text style={styles.newButtonText}>All Users</Text>
//           </TouchableOpacity>

//         </View>
//       </DrawerContentScrollView>

//       {/* Logout */}
//       <View style={styles.footer}>
//         <TouchableOpacity
//           style={[styles.logoutButton, styles.logoutHoverEffect]}
//           onPress={handleLogout}>
//           <View style={styles.logoutIconWrapper}>
//             <Ionicons name="log-out-outline" size={22} color="#D32F2F" />
//           </View>
//           <Text style={styles.logoutText}>Logout</Text>
//         </TouchableOpacity>
//       </View>
//     </View>

//   );
// };

// export default CustomDrawer;

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#d2af6f',
//   },
//   customButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: 7,
//     borderRadius: 8,
//     marginVertical: 4,
//     backgroundColor: '#377255',
//   },
//   newButtonText: {
//     marginLeft: 10,
//     fontSize: 16,
//     color: '#ffe3afff',
//     fontWeight: "700"
//   },
//   scrollContainer: {
//     paddingTop: 0,
//     paddingBottom: 20,
//   },
//   header: {
//     padding: 20,
//     paddingBottom: 15,
//     backgroundColor: '#D2AF6F',
//     borderBottomWidth: 1,
//     borderBottomColor: '#000',
//     marginBottom: 10
//   },
//   profileContainer: {
//     flexDirection: 'column',
//     alignItems: 'center',
//   },
//   avatar: {
//     height: 70,
//     width: 70,
//     borderRadius: 35,
//     borderWidth: 1,
//     borderColor: '#000',
//   },
//   profileTextContainer: {
//     // marginLeft: 15,
//     marginTop: 10,
//     alignItems: 'center',
//   },
//   name: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#333',
//   },
//   email: {
//     fontSize: 14,
//     color: '#000',
//     marginTop: 3,
//   },
//   actionButtonsContainer: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     justifyContent: 'space-between',
//     paddingHorizontal: 15,
//     paddingVertical: 10,
//   },
//   actionButton: {
//     width: width * 0.38,
//     backgroundColor: '#4E8D7C',
//     borderRadius: 12,
//     padding: 15,
//     marginBottom: 15,
//     alignItems: 'center',
//     justifyContent: 'center',
//     flexDirection: 'row',
//   },
//   buttonIconWrapper: {
//     backgroundColor: 'rgba(255,255,255,0.2)',
//     borderRadius: 8,
//     padding: 5,
//     marginRight: 10,
//   },
//   actionButtonText: {
//     color: '#fff',
//     fontSize: 14,
//     fontWeight: '600',
//   },
//   buttonElevation: {
//     shadowColor: '#000',
//     shadowOffset: {
//       width: 0,
//       height: 2,
//     },
//     shadowOpacity: 0.25,
//     shadowRadius: 3.84,
//     elevation: 5,
//   },
//   divider: {
//     height: 1,
//     backgroundColor: '#f0f0f0',
//     marginHorizontal: 20,
//     marginVertical: 10,
//   },

//   buttonHoverEffect: {
//     borderLeftWidth: 4,
//     borderLeftColor: '#4E8D7C',
//   },

//   customButtonText: {
//     color: '#555',
//     fontSize: 16,
//     fontWeight: '500',
//     marginLeft: 15,
//   },
//   notificationBadge: {
//     position: 'absolute',
//     right: 25,
//     backgroundColor: '#000',
//     borderRadius: 10,
//     width: 20,
//     height: 20,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   badgeText: {
//     color: '#fff',
//     fontSize: 12,
//     fontWeight: 'bold',
//   },
//   footer: {
//     padding: 20,
//     borderTopWidth: 1,
//     borderTopColor: '#000',
//     backgroundColor: '#D2AF6F',
//   },
//   logoutButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingVertical: 12,
//     paddingHorizontal: 20,
//     borderRadius: 8,
//     // backgroundColor: 'rgba(211, 47, 47, 0.1)',
//   },
//   logoutHoverEffect: {
//     borderLeftWidth: 4,
//     borderLeftColor: '#D32F2F',
//   },
//   logoutIconWrapper: {
//     backgroundColor: 'rgba(211, 47, 47, 0.2)',
//     borderRadius: 6,
//     padding: 5,
//   },
//   logoutText: {
//     color: '#D32F2F',
//     fontSize: 16,
//     fontWeight: '500',
//     marginLeft: 5,
//   },
// });

