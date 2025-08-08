import { StyleSheet, Text, View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import React from 'react'

const SignUp = ({ navigation }) => {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create Account</Text>

        <TextInput
          placeholder="Full Name"
          style={styles.input}
          placeholderTextColor="#888"
        />
        <TextInput
          placeholder="Email"
          style={styles.input}
          placeholderTextColor="#888"
          keyboardType="email-address"
        />
        <TextInput
          placeholder="Password"
          style={styles.input}
          placeholderTextColor="#888"
          secureTextEntry
        />

        <TouchableOpacity style={styles.signupButton}>
          <Text style={styles.signupButtonText}>Sign Up</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('DrawerScreen')}>
          <Text style={styles.drawerText}>Already have an account? Go to Drawer</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

export default SignUp

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF9',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#2E7D32', // Green
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: '#D2AF6F',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    color: '#000',
  },
  signupButton: {
    width: '100%',
    backgroundColor: '#D2AF6F',
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 25,
    alignItems: 'center',
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  drawerText: {
    fontSize: 14,
    color: '#2E7D32', // Green
    textDecorationLine: 'underline',
  },
})
