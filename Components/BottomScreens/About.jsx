import { StyleSheet, Text, View, TouchableOpacity, ImageBackground } from 'react-native'
import React from 'react'

const About = ({ navigation }) => {
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

      {/* Text and button on top */}
      <View style={styles.overlay}>
        <Text style={styles.title}>Welcome to About Screen</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('LogIn')}
        >
          <Text style={styles.buttonText}>Go to LogIn</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default About

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
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#000',
  },
  button: {
    backgroundColor: '#377355',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
