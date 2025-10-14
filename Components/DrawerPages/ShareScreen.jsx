import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Share, Alert, Platform } from "react-native";
import QRCode from "react-native-qrcode-svg";

//  Define separate URLs for Android and iOS
const ANDROID_APP_URL = "https://www.cowberry.com"; // replace this link with real Google play console link
const IOS_APP_URL = "https://www.youtube.com/"; // replace this link with real ios Apple store link

//  Auto-select platform link
const APP_URL = Platform.OS === "ios" ? IOS_APP_URL : ANDROID_APP_URL;

const ShareScreen = () => {
  const onShare = async () => {
    try {
      const result = await Share.share({
        message: `Hey 👋, check out the COWBERRY app! Download it here: ${APP_URL}`,
      });

      if (result.action === Share.dismissedAction) {
        console.log("Share cancelled");
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SHARE COWBERRY</Text>
      <Text style={styles.subtitle}>Scan the QR code (OR) Tap below to share</Text>

      <View style={styles.qrContainer}>
        <QRCode value={APP_URL} size={200} />
      </View>

      <TouchableOpacity style={styles.shareButton} onPress={onShare}>
        <Text style={styles.shareText}>Share App</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF8EF",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#377355",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#4b4b4b",
    marginBottom: 20,
    textAlign: "center",
  },
  qrContainer: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 24,
  },
  shareButton: {
    backgroundColor: "#377355",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 50,
    marginTop: 20,
  },
  shareText: {
    color: "#fff",
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

