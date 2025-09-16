// // components/ChatBubble.js
// import React from "react";
// import {
//   Text,
//   TouchableOpacity,
//   ActionSheetIOS,
//   Platform,
//   Alert,
//   View,
// } from "react-native";
// import axiosInstance from "../../TokenHandling/axiosInstance"; 
// import { useMessageStore } from "../stores/messageStore"; 

// export default function ChatBubble({ msg, isMe, styles }) {
// const handleDeleteMessage = () => {
//     try {
//       // 🔹 Step 1: WebSocket emit
//       sendJson({ type: "delete_message", message_id: msg.id });

//       // 🔹 Step 2: Local store update turant
//       useMessageStore.getState().markMessageDeleted(msg.id);

//       console.log("🗑 Message delete emitted:", msg.id);
//     } catch (error) {
//       console.error("❌ Delete failed:", error);
//     }
//   };


//   const showOptions = () => {
//     if (Platform.OS === "ios") {
//       ActionSheetIOS.showActionSheetWithOptions(
//         {
//           options: ["Cancel", "Delete"],
//           destructiveButtonIndex: 1,
//           cancelButtonIndex: 0,
//         },
//         (buttonIndex) => {
//           if (buttonIndex === 1) handleDeleteMessage(msg.id);
//         }
//       );
//     } else {
//       Alert.alert(
//         "Message Options",
//         "Choose an action",
//         [
//           { text: "Cancel", style: "cancel" },
//           { text: "Delete", onPress: () => handleDeleteMessage(msg.id), style: "destructive" },
//         ],
//         { cancelable: true }
//       );
//     }
//   };

//   return (
//     <TouchableOpacity onLongPress={showOptions}>
//       <View
//         style={[
//           styles.msgContainer,
//           { alignSelf: isMe ? "flex-end" : "flex-start" },
//         ]}
//       >
//         {!isMe && <Text style={styles.username}>{msg.sender_username}</Text>}
//         <View
//           style={[
//             styles.msgBubble,
//             { backgroundColor: isMe ? "#DCF8C6" : "#FFF" },
//           ]}
//         >
//           <Text style={styles.msgText}>
//             {msg.is_deleted ? "🗑 Message deleted" : msg.content}
//           </Text>
//         </View>
//       </View>
//     </TouchableOpacity>
//   );
// }


import React from "react";
import { Text, TouchableOpacity, ActionSheetIOS, Platform, Alert, View, Image, Linking } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSocketStore } from "../stores/socketStore";
import { useMessageStore } from "../stores/messageStore";

export default function ChatBubble({ msg, isMe, styles }) {
  const { sendJson } = useSocketStore();

  const handleDeleteMessage = () => {
    try {
      sendJson({ type: "delete_message", message_id: msg.id });
      useMessageStore.getState().markMessageDeleted(msg.id);
      console.log("🗑 Message delete emitted:", msg.id);
    } catch (error) {
      console.error(" Delete failed:", error);
    }
  };

  const showOptions = () => {
    if (msg.is_deleted) return;  // Deleted message ko option na dikhaye

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Delete"],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) handleDeleteMessage();
        }
      );
    } else {
      Alert.alert(
        "Message Options",
        "Choose an action",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", onPress: handleDeleteMessage, style: "destructive" },
        ],
        { cancelable: true }
      );
    }
  };


  const openMaps = (lat, lon) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${lat},${lon}`,
      android: `geo:0,0?q=${lat},${lon}`,
    }) || `https://www.google.com/maps?q=${lat},${lon}`;

    Linking.canOpenURL(url)
      .then((supported) =>
        supported ? Linking.openURL(url) : Linking.openURL(`https://www.google.com/maps?q=${lat},${lon}`)
      )
      .catch(() => Linking.openURL(`https://www.google.com/maps?q=${lat},${lon}`));
  };

  return (
    <TouchableOpacity onLongPress={showOptions}>
      <View style={[styles.msgContainer, { alignSelf: isMe ? "flex-end" : "flex-start" }]}>
        {!isMe && <Text style={styles.username}>{msg.sender_username}</Text>}

        <View style={[styles.msgBubble, { backgroundColor: isMe ? "#DCF8C6" : "#FFFF" }]}>

          {msg.message_type !== "location" && !msg.latitude && !msg.longitude && (
            <Text style={styles.msgText}>
              {msg.is_deleted ? "🚫 Message deleted" : msg.content}
            </Text>
          )}

          {/* 📍 Location Preview */}
          {msg.message_type === "location" && msg.latitude && msg.longitude && (
            msg.is_deleted ? (
              <View>
                <Text style={styles.msgText}>🚫 Message deleted</Text>
              </View>
            ) : (
              <View style={{ backgroundColor: "#144c3a", borderRadius: 12, overflow: "hidden", marginTop: 2, width: 260 }}>
                <TouchableOpacity onPress={() => openMaps(msg.latitude, msg.longitude)}>
                  <Image
                    source={{
                      uri: `https://static-maps.yandex.ru/1.x/?ll=${msg.longitude},${msg.latitude}&size=650,300&z=15&l=map&pt=${msg.longitude},${msg.latitude},pm2rdm`,
                    }}
                    style={{ width: "100%", height: 160, backgroundColor: "#ddd" }}
                    resizeMode="cover"
                  />
                </TouchableOpacity>

                <View style={{ padding: 12, backgroundColor: "#0f6b4a", flexDirection: "column", alignItems: "center", }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name="location-outline" size={16} color="#fff" />
                    <Text style={{ color: "#fff", fontWeight: "700", marginLeft: 6 }}>
                      {msg.content || "Location shared"}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => openMaps(msg.latitude, msg.longitude)}
                    style={{ backgroundColor: "#2f8a5a", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, marginTop: 5 }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "700" }}>Open map</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          )}
        </View>


      </View>
    </TouchableOpacity>
  );
}
