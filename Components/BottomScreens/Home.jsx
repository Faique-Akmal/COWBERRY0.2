import { 
  StyleSheet, 
  Text, 
  View, 
  ImageBackground, 
  Image, 
  Animated, 
  Easing, 
  Dimensions 
} from 'react-native'
import React, { useEffect, useRef } from 'react' 

const { width } = Dimensions.get('window');


const TEXT_WIDTH = 350; 

const Home = () => {
  const scrollAnim = useRef(new Animated.Value(0)).current 

  // 2. Animation Logic (Looping)
  useEffect(() => {
    // Scroll Animation Sequence
    const startScrolling = () => {
        Animated.loop(
            Animated.sequence([
                
                Animated.timing(scrollAnim, {
                    toValue: 1, 
                    duration: 6000, 
                    easing: Easing.linear,
                    useNativeDriver: true, 
                }),
            ])
        ).start();
    };

    startScrolling();
  }, [scrollAnim]) 

  
  const animatedTranslateX = scrollAnim.interpolate({
    inputRange: [0, 1], 
    outputRange: [width, -TEXT_WIDTH], 
  });
  
  
  const animatedTextStyle = {
    transform: [{ translateX: animatedTranslateX }],
    position: 'absolute', 
    left: 0,
    top: 0,
  };


  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../images/123.png')}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.imageOverlay} />
      </ImageBackground>

      {/* Content on top */}
      <View style={styles.overlay}>
        <Image
          source={require('../images/HomeLogo.png')} 
          style={styles.welcomeImage}
          resizeMode="contain"
        />

       
        <View style={styles.textContainer}> 
            <Animated.Text 
                style={[
                    styles.title, 
                    animatedTextStyle 
                ]}
            >
                Welcome to Cowberry! 
            </Animated.Text>
        </View>
       
      </View>
    </View>
  )
}

export default Home

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
    alignItems: 'center',
    padding: 20,
    marginTop: 50, 
  },
  welcomeImage: {
    width: 350,  
    height: 350,
  },
 
  textContainer: {
    width: '100%', 
    height: 50, 
    overflow: 'hidden', 
    justifyContent: 'center',
   
    
  },
  title: {
    fontSize: 28, 
    fontWeight: '900', 
    color: '#377355', 
    width: TEXT_WIDTH, 
    textShadowColor: 'rgba(0, 0, 0, 0.3)', 
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
})