import { StyleSheet, Text, View, TouchableOpacity, ImageBackground, Image } from 'react-native'
import React from 'react'
import Ionicons from "react-native-vector-icons/Ionicons";

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
        <Ionicons name="arrow-back" size={26} color="#377355" />
      </TouchableOpacity>

      {/* Avatar and Button Section */}
      <View style={styles.avatarButtonContainer}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('EmployeeCheckinForm')}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="log-in-outline" size={24} color="#fff" style={styles.buttonIcon} />
              <View>
                <Text style={styles.buttonText}>Employee CheckIn</Text>
                <Text style={styles.buttonSubText}>Record your start time</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.avatarContainer}>
          <Image
            source={require('../images/Avtar-removebg-preview.png')}
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
    top: 40,
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

// import { StyleSheet, Text, View, TouchableOpacity, ImageBackground } from 'react-native'
// import React from 'react'
// import Ionicons from "react-native-vector-icons/Ionicons";

// const Attendance = ({ navigation }) => {
//   return (
//     <View style={styles.container}>
//       {/* Image with reduced opacity */}
//       <ImageBackground
//         source={require('../images/123.png')}
//         style={styles.background}
//         resizeMode="cover"
//       >
//         <View style={styles.imageOverlay} />
//       </ImageBackground>

//       <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 10 }}>
//         <Ionicons name="arrow-back" size={26} color="#377355" />
//       </TouchableOpacity>


//       <View style={styles.overlay}>
//         <TouchableOpacity
//           style={styles.button}
//           onPress={() => navigation.navigate('EmployeeCheckinForm')}
//         >
//           <Text style={styles.buttonText}>Employee Checkin</Text>
//         </TouchableOpacity>
// {/* 
//         <TouchableOpacity
//           style={[styles.button, styles.endButton]}
//           onPress={() => navigation.navigate('AttendanceEnd')}
//         >
//           <Text style={styles.buttonText}>End Attendance Task</Text>
//         </TouchableOpacity> */}
//       </View>
//     </View>
//   )
// }

// export default Attendance

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     position: 'relative',
//   },
//   background: {
//     flex: 1,
//     position: 'absolute',
//     width: '100%',
//     height: '100%',
//   },
//   imageOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(255, 255, 255, 0.7)',
//   },
//   overlay: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'flex-start',
//     padding: 20,
//     flexDirection: "row"
//   },
//   button: {
//     backgroundColor: '#377355',
//     paddingVertical: 12,
//     paddingHorizontal: 15,
//     borderRadius: 8,
//     marginRight: 2,

//   },
//   endButton: {
//     backgroundColor: '#6b1b15',
//   },
//   buttonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '600',
//   },
// })