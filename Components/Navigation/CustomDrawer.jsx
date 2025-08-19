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
import axios from 'axios';
import { API_URL } from '@env';
import AntDesign from 'react-native-vector-icons/AntDesign';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import axiosInstance from '../TokenHandling/axiosInstance';

const { width } = Dimensions.get('window');

const CustomDrawer = (props) => {
  const [userData, setUserData] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const response = await axiosInstance.get('/me/');
        setUserData(response.data);
      } catch (error) {
        console.error('Error fetching user details:', error);
      }
    };

    fetchUserDetails();
  }, []);


  const handleLogout = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');

      await axios.post(
        `${API_URL}/logout/`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      await AsyncStorage.clear();
      navigation.reset({
        index: 0,
        routes: [{ name: 'LogIn' }],
      });
      Alert.alert('Success', 'You have been logged out.');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Logout failed. Please try again.');
    }
  };

  return (

    <View style={styles.container}>
      <DrawerContentScrollView {...props} contentContainerStyle={styles.scrollContainer}>
        {/* Profile Section */}
        <View style={styles.header}>
          <View style={styles.profileContainer}>
            <Image source={require('../images/profile.webp')} style={styles.avatar} />
            <View style={styles.profileTextContainer}>
              {userData ? (
                <>
                  <Text style={styles.name}>{userData.username}</Text>
                  <Text style={styles.role}>Role: {userData.role}</Text>
                  <Text style={styles.email}>{userData.email}</Text>
                  <Text style={styles.role}>Address: {userData.address}</Text>
                </>
              ) : (
                <ActivityIndicator size="small" color="#4E8D7C" />
              )}
            </View>
          </View>
        </View>



        {/* NEW BUTTONS BELOW SETTINGS */}
        <View>
          <TouchableOpacity
            style={[styles.customButton]}
            onPress={() => console.log('Profile pressed')}>
            <MaterialIcons name="dashboard" size={20} color="#ffe3afff" />
            <Text style={styles.newButtonText}>Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.customButton]}
            onPress={() => navigation.navigate('Calender')}>
            <MaterialIcons name="calendar-month" size={20} color="#ffe3afff" />
            <Text style={styles.newButtonText}>Calender</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.customButton]}
            onPress={() => console.log('Reports pressed')}>
            <MaterialIcons name="chat" size={20} color="#ffe3afff" />
            <Text style={styles.newButtonText}>Chats</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.customButton]}
            onPress={() => console.log('Support pressed')}>
            <FontAwesome name="wpforms" size={20} color="#ffe3afff" />
            <Text style={styles.newButtonText}>Forms</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.customButton]}
            onPress={() => console.log('Support pressed')}>
            <MaterialIcons name="view-list" size={20} color="#ffe3afff" />
            <Text style={styles.newButtonText}>Attandance list</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.customButton]}
            onPress={() => console.log('Support pressed')}>
            <AntDesign name="form" size={20} color="#ffe3afff" />
            <Text style={styles.newButtonText}>Register User Form</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.customButton]}
            onPress={() => navigation.navigate('MyTask')}>
            <FontAwesome5 name="tasks" size={20} color="#ffe3afff" />
            <Text style={styles.newButtonText}>My Task</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.customButton]}
            onPress={() => navigation.navigate('AllUsers')}>
            <FontAwesome name="users" size={20} color="#ffe3afff" />
            <Text style={styles.newButtonText}>All Users</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.customButton]}
            onPress={() => console.log('Support pressed')}>
            <FontAwesome5 name="search-location" size={20} color="#ffe3afff" />
            <Text style={styles.newButtonText}>Employee Tracker</Text>
          </TouchableOpacity>
        </View>
      </DrawerContentScrollView>

      {/* Logout */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.logoutButton, styles.logoutHoverEffect]}
          onPress={handleLogout}>
          <View style={styles.logoutIconWrapper}>
            <Ionicons name="log-out-outline" size={22} color="#D32F2F" />
          </View>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>

  );
};

export default CustomDrawer;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D2AF6F',
  },
  customButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 7,
    borderRadius: 8,
    marginVertical: 4,
    backgroundColor: '#4E8D7C',
  },
  newButtonText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#ffe3afff',
    fontWeight: "700"
  },
  scrollContainer: {
    paddingTop: 0,
    paddingBottom: 20,
  },
  header: {
    padding: 20,
    paddingBottom: 15,
    backgroundColor: '#D2AF6F',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    marginBottom:10
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
    borderColor: '#000',
  },
  profileTextContainer: {
    // marginLeft: 15,
    marginTop: 10,
    alignItems: 'center',
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  email: {
    fontSize: 14,
    color: '#000',
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
    borderTopColor: '#000',
    backgroundColor: '#D2AF6F',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    // backgroundColor: 'rgba(211, 47, 47, 0.1)',
  },
  logoutHoverEffect: {
    borderLeftWidth: 4,
    borderLeftColor: '#D32F2F',
  },
  logoutIconWrapper: {
    backgroundColor: 'rgba(211, 47, 47, 0.2)',
    borderRadius: 6,
    padding: 5,
  },
  logoutText: {
    color: '#D32F2F',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 5,
  },
});