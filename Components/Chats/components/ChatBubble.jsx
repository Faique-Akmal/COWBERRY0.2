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
import { Text, TouchableOpacity, ActionSheetIOS, Platform, Alert, View } from "react-native";
import { useSocketStore } from "../stores/socketStore";
import { useMessageStore } from "../stores/messageStore";

export default function ChatBubble({ msg, isMe, styles }) {
  const { sendJson } = useSocketStore();

  const handleDeleteMessage = () => {
    try {
      // 🔹 Step 1: WebSocket emit
      sendJson({ type: "delete_message", message_id: msg.id });

      // 🔹 Step 2: Local store update turant
      useMessageStore.getState().markMessageDeleted(msg.id);

      console.log("🗑 Message delete emitted:", msg.id);
    } catch (error) {
      console.error(" Delete failed:", error);
    }
  };

  const showOptions = () => {
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

  return (
    <TouchableOpacity onLongPress={showOptions}>
      <View style={[styles.msgContainer, { alignSelf: isMe ? "flex-end" : "flex-start" }]}>
        {!isMe && <Text style={styles.username}>{msg.sender_username}</Text>}
        <View style={[styles.msgBubble, { backgroundColor: isMe ? "#DCF8C6" : "#FFFF" }]}>
          <Text style={styles.msgText}>
            {msg.is_deleted ? "🚫 Message deleted" : msg.content}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
