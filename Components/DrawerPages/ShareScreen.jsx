import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Alert,
  Platform,
  Animated,
  Clipboard,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import Icon from "react-native-vector-icons/Ionicons"; // CLI-compatible icon library

// Define separate URLs for Android and iOS (for internal distribution)
const ANDROID_APP_URL = "https://www.cowberry.com"; // Replace with your actual APK link
const IOS_APP_URL = "https://www.youtube.com/"; // Replace with your actual IPA manifest link

// Auto-select platform link
const APP_URL = Platform.OS === "ios" ? IOS_APP_URL : ANDROID_APP_URL;

const ShareScreen = () => {
  // Animation setup
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleButtonPressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handleButtonPressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const onShare = async () => {
    try {
      const result = await Share.share({
        message: `Hey 👋, Join the COWBERRY team! Download our internal app: ${APP_URL}`,
      });

      if (result.action === Share.sharedAction) {
        Platform.OS === "android"
          ? Alert.alert("Success", "App link shared successfully!")
          : Alert.alert("Success", "App link shared successfully!");
      } else if (result.action === Share.dismissedAction) {
        Platform.OS === "android"
          ? Alert.alert("Info", "Share cancelled")
          : Alert.alert("Info", "Share cancelled");
      }
    } catch (error) {
      Alert.alert("Error", `Failed to share: ${error.message}`);
    }
  };

  const onCopyLink = () => {
    Clipboard.setString(APP_URL);
    Alert.alert("Success", "App link copied to clipboard!");
  };

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity: fadeAnim }}>
        <Text style={styles.title}>SHARE COWBERRY</Text>
        <Text style={styles.subtitle}>
          Invite your team to download our internal app via QR code or link!
        </Text>
      </Animated.View>

      <Animated.View style={[styles.qrContainer, { opacity: fadeAnim }]}>
        <QRCode
          value={APP_URL}
          size={200}
          color="#1A3C34"
          backgroundColor="#FFFFFF"
          logo={require("../images/QRImage.jpeg")} // Replace with your logo path
          logoSize={40}
          logoBackgroundColor="#FFFFFF"
        />
      </Animated.View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.shareButton, styles.primaryButton]}
          onPress={onShare}
          onPressIn={handleButtonPressIn}
          onPressOut={handleButtonPressOut}
          accessible={true}
          accessibilityLabel="Share Cowberry app link"
        >
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <View style={styles.buttonContent}>
              <Icon name="share-social-outline" size={20} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.shareText}>Share App</Text>
            </View>
          </Animated.View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shareButton, styles.copyButton]}
          onPress={onCopyLink}
          onPressIn={handleButtonPressIn}
          onPressOut={handleButtonPressOut}
          accessible={true}
          accessibilityLabel="Copy Cowberry app link"
        >
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <View style={styles.buttonContent}>
              <Icon name="copy-outline" size={20} color="#087F5B" style={styles.buttonIcon} />
              <Text style={styles.copyText}>Copy Link</Text>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F6F5",
    alignItems: "center",
    // justifyContent: "center",
    padding: 20,
    marginTop:60
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1A3C34",
    marginBottom: 12,
    letterSpacing: 0.5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#4A6A4A",
    marginBottom: 28,
    textAlign: "center",
    lineHeight: 24,
    opacity: 0.9,
  },
  qrContainer: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    marginBottom: 32,
    borderWidth: 1,
    borderColor: "rgba(0, 100, 0, 0.05)",
  },
  buttonContainer: {
    width: "90%",
    alignItems: "center",
    gap: 16,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 50,
    width: "80%",
  },
  primaryButton: {
    backgroundColor: "#087F5B",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  copyButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#087F5B",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  shareText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  copyText: {
    color: "#087F5B",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default ShareScreen;








// working code but ios android platform add nhi kiya tha 

// import React from "react";
// import { View, Text, StyleSheet, TouchableOpacity, Share, Alert } from "react-native";
// import QRCode from "react-native-qrcode-svg";

// const APP_URL = "https://www.cowberry.com"; // apni app ka link yahan lagao

// const ShareScreen = () => {
//   const onShare = async () => {
//     try {
//       const result = await Share.share({
//         message: `Hey 👋, check out the COWBERRY app! Download it here: ${APP_URL}`,
//       });

//       if (result.action === Share.dismissedAction) {
//         console.log("Share cancelled");
//       }
//     } catch (error) {
//       Alert.alert("Error", error.message);
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Share COWBERRY</Text>
//       <Text style={styles.subtitle}>Scan the QR code or tap below to share</Text>

//       <View style={styles.qrContainer}>
//         <QRCode value={APP_URL} size={200} />
//       </View>

//       <TouchableOpacity style={styles.shareButton} onPress={onShare}>
//         <Text style={styles.shareText}>Share App</Text>
//       </TouchableOpacity>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#FAF8EF",
//     alignItems: "center",
//     justifyContent: "center",
//     padding: 20,
//   },
//   title: {
//     fontSize: 28,
//     fontWeight: "800",
//     color: "#377355",
//     marginBottom: 8,
//   },
//   subtitle: {
//     fontSize: 15,
//     color: "#4b4b4b",
//     marginBottom: 20,
//     textAlign: "center",
//   },
//   qrContainer: {
//     backgroundColor: "#fff",
//     padding: 16,
//     borderRadius: 10,
//     elevation: 3,
//     shadowColor: "#000",
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     marginBottom: 24,
//   },
//   shareButton: {
//     backgroundColor: "#377355",
//     paddingVertical: 14,
//     paddingHorizontal: 24,
//     borderRadius: 50,
//     marginTop:20
//   },
//   shareText: {
//     color: "#fff",
//     fontSize: 16,
//     fontWeight: "700",
//   },
// });

// export default ShareScreen;

