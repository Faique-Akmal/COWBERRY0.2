// import 'react-native-gesture-handler';
// import 'react-native-reanimated';
import { StyleSheet, SafeAreaView } from 'react-native';
import React from 'react';
import AppNavigator from './Components/Navigation/AppNavigator';
import FloatingChatButton from './Components/Chats/components/FloatingChatButton';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef, navigate } from './Components/RootNavigation'; 

const App = () => {
  // use the global helper instead of expecting `navigation` prop
  const handleChatOpen = () => {
    navigate('SocketChatBox'); // <-- use navigation helper
  };

  return (
    <SafeAreaView style={styles.container}>

      <NavigationContainer ref={navigationRef}>
        <AppNavigator />
      </NavigationContainer>

      {/* Chat button placed after NavigationContainer so it overlays every screen */}
      <FloatingChatButton
        onPress={handleChatOpen}
        badge={5} // example unread count
        backgroundColor="#377355"
        iconName="chatbubble-ellipses"
      />

    </SafeAreaView>
  );
};

export default App;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});