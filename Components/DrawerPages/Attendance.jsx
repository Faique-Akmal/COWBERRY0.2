import { StyleSheet, Text, View, TouchableOpacity, ImageBackground } from 'react-native'
import React from 'react'

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


      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('StartTask')}
        >
          <Text style={styles.buttonText}>Start Attendance Task</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.endButton]}
          onPress={() => navigation.navigate('EndTask')}
        >
          <Text style={styles.buttonText}>End Attendance Task</Text>
        </TouchableOpacity>
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
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: 20,
    flexDirection: "row"
  },
  button: {
    backgroundColor: '#377355',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginRight: 2,

  },
  endButton: {
    backgroundColor: '#6b1b15',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
