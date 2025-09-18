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



// ChatBubble.jsx
import React, { useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, Linking, Platform, ActionSheetIOS, Alert } from "react-native";
import Video from "react-native-video";
import Feather from "react-native-vector-icons/Feather";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSocketStore } from "../stores/socketStore";
import { useMessageStore } from "../stores/messageStore";
import { BASE_URL } from "@env";

function normalizeUrl(raw) {
  if (!raw) return null;
  if (typeof raw !== "string") return String(raw);
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  // avoid double slashes
  const base = (BASE_URL || "").replace(/\/+$/, "");
  return base ? `${base}/${String(raw).replace(/^\/+/, "")}` : raw;
}

function DynamicMedia({ fileUrl, fileType }) {
  const [dimensions, setDimensions] = useState({ width: 220, height: 140 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoPaused, setVideoPaused] = useState(true);

  const uri = normalizeUrl(fileUrl);

  useEffect(() => {
    if (!uri) return;
    if ((fileType || "").startsWith("image/")) {
      // Try to get real image size but fallback to defaults
      Image.getSize(
        uri,
        (w, h) => {
          const maxWidth = 260;
          const scaleFactor = w > maxWidth ? maxWidth / w : 1;
          setDimensions({ width: Math.round(w * scaleFactor), height: Math.round(h * scaleFactor) });
        },
        () => {
          setDimensions({ width: 220, height: 140 });
        }
      );
    }
  }, [uri, fileType]);

  if (!uri) {
    return (
      <View style={localStyles.unknownBox}>
        <Text style={localStyles.small}>No preview available</Text>
      </View>
    );
  }

  if ((fileType || "").startsWith("image/")) {
    return (
      <Image
        source={{ uri }}
        style={[localStyles.image, { width: dimensions.width, height: dimensions.height }]}
        resizeMode="cover"
      />
    );
  }

  if ((fileType || "").startsWith("video/") || uri.match(/\.(mp4|mov|m4v)$/i)) {
    // Video player with simple play/pause toggle
    return (
      <View style={localStyles.mediaWrap}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            setVideoPaused((s) => !s);
            setIsPlaying((p) => !p);
          }}
          style={{ width: "100%" }}
        >
          <Video
            source={{ uri }}
            style={localStyles.video}
            controls={true}
            paused={videoPaused}
            resizeMode="contain"
            onError={(e) => {
              console.log("Video playback error:", e);
            }}
          />
        </TouchableOpacity>
        <Text numberOfLines={1} style={localStyles.filenameSmall}>
          Tap to {videoPaused ? "play" : "pause"}
        </Text>
      </View>
    );
  }

  // document fallback
  return (
    <TouchableOpacity
      style={localStyles.docWrap}
      onPress={() => {
        Linking.canOpenURL(uri)
          .then((supported) => {
            if (supported) return Linking.openURL(uri);
            // try add http scheme if missing
            const tryUrl = uri.startsWith("http") ? uri : `https://${uri}`;
            return Linking.openURL(tryUrl);
          })
          .catch((e) => console.log("Open document error:", e));
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Feather name="file-text" size={22} color="#444" />
        <View style={{ marginLeft: 8 }}>
          <Text numberOfLines={1} style={localStyles.filename}>
            {uri.split("/").pop()}
          </Text>
          <Text style={localStyles.small}>Open document</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

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
    if (msg.is_deleted) return;

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

  // Prefer msg.files (canonical) else use attachments fallback
  let files = [];
  if (Array.isArray(msg.files) && msg.files.length > 0) {
    files = msg.files.map((f) => ({
      url: f.url || f.file_url || f.fileUrl || f.url,
      type: f.type || f.file_type || "",
      name: f.name || f.file_name || f.name || (f.url || "").split("/").pop(),
    }));
  } else if (Array.isArray(msg.attachments) && msg.attachments.length > 0) {
    files = msg.attachments.map((a) => ({
      url: a.file_url || a.url || a.fileUrl || null,
      type: a.file_type || a.type || "",
      name: a.file_name || a.name || (a.file_url || "").split("/").pop(),
    }));
  }

  return (
    <TouchableOpacity onLongPress={showOptions} activeOpacity={0.9}>
      <View style={[styles.msgContainer, { alignSelf: isMe ? "flex-end" : "flex-start" }]}>
        {!isMe && <Text style={styles.username}>{msg.sender_username}</Text>}

        <View style={[styles.msgBubble, { backgroundColor: isMe ? "#DCF8C6" : "#FFFF" }]}>
          {msg.is_deleted ? (
            <Text style={styles.msgText}>🚫 Message deleted</Text>
          ) : (
            <>
              {msg.content ? <Text style={styles.msgText}>{msg.content}</Text> : null}

              {msg.message_type === "file" && files.length > 0 && (
                <View style={{ marginTop: 6 }}>
                  {files.map((f, idx) => (
                    <View key={idx} style={{ marginTop: 8 }}>
                      <DynamicMedia fileUrl={f.url} fileType={f.type} />
                      <Text numberOfLines={1} style={localStyles.filename}>
                        {f.name || (f.url || "").split("/").pop()}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {msg.message_type === "location" && msg.latitude && msg.longitude && (
                <View style={{ backgroundColor: "#144c3a", borderRadius: 12, overflow: "hidden", marginTop: 8, width: 260 }}>
                  <TouchableOpacity onPress={() => {
                    const lat = msg.latitude;
                    const lon = msg.longitude;
                    const url = Platform.select({
                      ios: `maps:0,0?q=${lat},${lon}`,
                      android: `geo:0,0?q=${lat},${lon}`,
                    }) || `https://www.google.com/maps?q=${lat},${lon}`;
                    Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps?q=${lat},${lon}`));
                  }}>
                    <Image
                      source={{
                        uri: `https://static-maps.yandex.ru/1.x/?ll=${msg.longitude},${msg.latitude}&size=650,300&z=15&l=map&pt=${msg.longitude},${msg.latitude},pm2rdm`,
                      }}
                      style={{ width: "100%", height: 160, backgroundColor: "#ddd" }}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>

                  <View style={{ padding: 12, backgroundColor: "#0f6b4a", flexDirection: "column", alignItems: "center" }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Ionicons name="location-outline" size={16} color="#fff" />
                      <Text style={{ color: "#fff", fontWeight: "700", marginLeft: 6 }}>
                        {msg.content || "Location shared"}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => {
                        const lat = msg.latitude;
                        const lon = msg.longitude;
                        const url = Platform.select({
                          ios: `maps:0,0?q=${lat},${lon}`,
                          android: `geo:0,0?q=${lat},${lon}`,
                        }) || `https://www.google.com/maps?q=${lat},${lon}`;
                        Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps?q=${lat},${lon}`));
                      }}
                      style={{ backgroundColor: "#2f8a5a", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, marginTop: 8 }}
                    >
                      <Text style={{ color: "#fff", fontWeight: "700" }}>Open map</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const localStyles = StyleSheet.create({
  mediaWrap: { marginTop: 6 },
  image: { borderRadius: 8, backgroundColor: "#eee" },
  video: { width: 260, height: 160, borderRadius: 8, backgroundColor: "#000" },
  docWrap: { marginTop: 6, padding: 8, borderRadius: 8, backgroundColor: "#fafafa" },
  filename: { fontSize: 13, marginTop: 6, color: "#222" },
  filenameSmall: { fontSize: 12, color: "#666", marginTop: 4 },
  small: { fontSize: 12, color: "#666" },
  unknownBox: { marginTop: 6, padding: 8, borderRadius: 8, backgroundColor: "#fff3" },
});
