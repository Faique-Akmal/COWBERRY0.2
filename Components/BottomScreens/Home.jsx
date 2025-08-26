import React from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

const Home = () => {
  return (
    <View style={styles.container}>
      <WebView 
        source={{ uri: 'https://www.cowberry.com/' }} 
        style={{ flex: 1 }}
      />
    </View>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
