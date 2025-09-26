import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { StyleSheet, SafeAreaView } from 'react-native';
import React from 'react';
import AppNavigator from './Components/Navigation/AppNavigator';

const App = () => {

  return (
    <SafeAreaView style={styles.container}>
      <AppNavigator />
    </SafeAreaView>
  );
};

export default App;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
