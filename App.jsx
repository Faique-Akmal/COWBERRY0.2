// import 'react-native-gesture-handler';
// import 'react-native-reanimated';
import { StyleSheet, SafeAreaView } from 'react-native';
import React, { useState } from 'react';
import AppNavigator from './Components/Navigation/AppNavigator';
import FloatingChatButton from './Components/Chats/components/FloatingChatButton';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef, navigate } from './Components/RootNavigation';

const App = () => {
  const [currentRoute, setCurrentRoute] = useState(null);

  // Jis screen par chat button show nhi karna hai usko yha add kar do
  const excludedRoutes = ['LoginScreen']; 

  const handleChatOpen = () => { 
    navigate('SocketChatBox');
  };

  // helper to decide show/hide
  const shouldShowChat = () => {
    if (!currentRoute) return true;
    return !excludedRoutes.includes(currentRoute);
  };

  return (
    <SafeAreaView style={styles.container}>
      <NavigationContainer
        ref={navigationRef}
        onReady={() => {
          const route = navigationRef.current?.getCurrentRoute();
          setCurrentRoute(route?.name ?? null);
        }}
        onStateChange={() => {
          const route = navigationRef.current?.getCurrentRoute();
          setCurrentRoute(route?.name ?? null);
        }}
      >
        <AppNavigator />
      </NavigationContainer>

      {shouldShowChat() ? (
        <FloatingChatButton
          onPress={handleChatOpen}
          badge={5}
          backgroundColor="#377355"
          iconName="chatbubble-ellipses"
        />
      ) : null}
    </SafeAreaView>
  );
};

export default App;

const styles = StyleSheet.create({
  container: { flex: 1 },
});


