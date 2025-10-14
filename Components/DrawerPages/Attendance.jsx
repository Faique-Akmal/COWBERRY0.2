import { StyleSheet, Text, View, TouchableOpacity, ImageBackground, Image } from 'react-native'
import React from 'react'
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";


const Attendance = ({ navigation }) => {
  return (
    <View style={styles.container}>
      {/* Image with reduced opacity */}
      <ImageBackground
        source={require('../images/123.png')}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.imageOverlay} />
      </ImageBackground>

      {/* Back button */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={28} color="#000" />
      </TouchableOpacity>

      {/* Avatar and Button Section */}
      <View style={styles.avatarButtonContainer}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('EmployeeCheckinForm')}
          >
            <View style={styles.buttonContent}>
             
              <View>
                <Text style={styles.buttonText}>Employee CheckIn</Text>
                {/* <Text style={styles.buttonSubText}>Record your start time</Text> */}
              </View>
               <MaterialIcons name="keyboard-double-arrow-right" size={24} color="#fff" style={styles.buttonIcon} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.avatarContainer}>
          <Image
            source={require('../images/Avatar.png')}
            style={styles.avatar}
          />
        </View>
      </View>

      {/* Check-in Information */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>About Employee CheckIn</Text>
        <Text style={styles.infoText}>
          The Employee Check-in feature allows you to record your attendance with ease. Simply tap the Check-in button to log your start time. Ensure you check in at the beginning of your shift to maintain accurate attendance records. This system helps track your work hours efficiently and ensures compliance with company policies.
        </Text>
      </View>
    </View>
  )
}

export default Attendance

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  background: {
    flex: 1,
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 1,
  },
  avatarButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start', // Changed to flex-start to minimize gap
    paddingHorizontal: 0, // Reduced to 0 to eliminate outer padding
    marginTop: 60,
    marginBottom: 20,
  },
  avatarContainer: {
    alignItems: 'flex-start',
    marginRight: 0, // Reduced to 0 to minimize gap
    marginLeft: 2, // Small margin to prevent overlap
  },
  avatar: {
    width: 260,
    height: 320,
    borderRadius: 60,
  },
  buttonContainer: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginTop: -190, // Keep button moved upward
    marginLeft:5
  },
  button: {
    backgroundColor: '#377355',
    paddingVertical: 10,
    paddingHorizontal: 7,
    borderRadius: 8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal:5
  },
  buttonSubText: {
    color: '#e0e0e0',
    fontSize: 12,
    fontWeight: '400',
     paddingHorizontal:5
  },
  infoContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#377355',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
})
