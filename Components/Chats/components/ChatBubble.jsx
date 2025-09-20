// Google map ke liye ungli karne se pahle ka code baki isme sab sahi hai
// ChatBubble.jsx

// import React, { useState, useEffect } from "react";
// import {
//   View,
//   Text,
//   Image,
//   TouchableOpacity,
//   StyleSheet,
//   Linking,
//   Platform,
//   ActionSheetIOS,
//   Alert,
// } from "react-native";
// import Video from "react-native-video";
// import Feather from "react-native-vector-icons/Feather";
// import Ionicons from "react-native-vector-icons/Ionicons";
// import RNFS from "react-native-fs";
// import { useSocketStore } from "../stores/socketStore";
// import { useMessageStore } from "../stores/messageStore";
// import { BASE_URL } from "@env";

// // Helper: normalize url
// function normalizeUrl(raw) {
//   if (!raw) return null;
//   if (typeof raw !== "string") return String(raw);
//   if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
//   const base = (BASE_URL || "").replace(/\/+$/, "");
//   return base ? `${base}/${String(raw).replace(/^\/+/, "")}` : raw;
// }

// // Do HEAD request to inspect remote headers
// async function headUrl(url) {
//   try {
//     const res = await fetch(url, { method: "HEAD" });
//     return {
//       status: res.status,
//       contentType: res.headers.get("content-type"),
//       acceptRanges: res.headers.get("accept-ranges"),
//       contentLength: res.headers.get("content-length"),
//     };
//   } catch (e) {
//     console.log("headUrl error:", e);
//     return null;
//   }
// }

// // Download to cache path or documents directory
// async function downloadToCache(url, cachePath, onProgress) {
//   try {
//     const dl = RNFS.downloadFile({
//       fromUrl: url,
//       toFile: cachePath,
//       discretionary: true,
//       progressDivider: 10,
//       progress: (p) => {
//         if (onProgress) onProgress(p.bytesWritten, p.contentLength);
//       },
//     });
//     const res = await dl.promise;
//     if (res && res.statusCode >= 200 && res.statusCode < 300) {
//       return cachePath;
//     } else {
//       console.log("downloadToCache failed status:", res && res.statusCode);
//       return null;
//     }
//   } catch (e) {
//     console.log("downloadToCache error:", e);
//     return null;
//   }
// }

// // DynamicMedia component
// function DynamicMedia({ fileUrl, fileType }) {
//   const [dimensions, setDimensions] = useState({ width: 220, height: 140 });
//   const [ready, setReady] = useState(false);
//   const [isVideo, setIsVideo] = useState(false);
//   const [localUri, setLocalUri] = useState(null);
//   const [error, setError] = useState(null);
//   const [videoDims, setVideoDims] = useState({ width: 260, height: 160 });
//   const [downloading, setDownloading] = useState(false); // NEW: Track download state

//   const uri = normalizeUrl(fileUrl);
//   const fileName = uri ? uri.split("/").pop() : "document";

//   // NEW: Download handler for documents
//   const handleDownload = async () => {
//     if (!uri) {
//       Alert.alert("Error", "No file URL available.");
//       return;
//     }

//     setDownloading(true);
//     try {
//       // Use Documents directory for user-accessible storage
//       const downloadDir = Platform.OS === "ios" ? RNFS.DocumentDirectoryPath : RNFS.DownloadDirectoryPath;
//       const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_"); // Sanitize filename
//       const destPath = `${downloadDir}/${safeFileName}`;

//       // Check if file already exists
//       const exists = await RNFS.exists(destPath);
//       if (exists) {
//         Alert.alert("Info", `File already downloaded: ${safeFileName}`);
//         setDownloading(false);
//         return;
//       }

//       const downloaded = await downloadToCache(uri, destPath, (bytesWritten, contentLength) => {
//         console.log(`Download progress: ${Math.round((bytesWritten / contentLength) * 100)}%`);
//       });

//       if (downloaded) {
//         Alert.alert("Success", `File downloaded to: ${safeFileName}`);
//       } else {
//         Alert.alert("Error", "Failed to download file.");
//       }
//     } catch (e) {
//       console.log("handleDownload error:", e);
//       Alert.alert("Error", "Could not download file.");
//     } finally {
//       setDownloading(false);
//     }
//   };

//   useEffect(() => {
//     let cancelled = false;
//     setReady(false);
//     setError(null);
//     setIsVideo(false);
//     setLocalUri(null);

//     if (!uri) {
//       setReady(true);
//       return;
//     }

//     const prepare = async () => {
//       try {
//         if ((fileType || "").startsWith("image/")) {
//           Image.getSize(
//             uri,
//             (w, h) => {
//               const maxWidth = 260;
//               const scaleFactor = w > maxWidth ? maxWidth / w : 1;
//               if (!cancelled) {
//                 setDimensions({ width: Math.round(w * scaleFactor), height: Math.round(h * scaleFactor) });
//                 setReady(true);
//               }
//             },
//             (e) => {
//               console.warn("Image.getSize failed:", e);
//               if (!cancelled) {
//                 setDimensions({ width: 220, height: 140 });
//                 setReady(true);
//               }
//             }
//           );
//           return;
//         }

//         const head = await headUrl(uri);
//         if (!head) {
//           setError("Could not reach server");
//           setReady(true);
//           return;
//         }

//         if (!head.contentType || !head.contentType.startsWith("video/")) {
//           setIsVideo(false);
//           setReady(true);
//           return;
//         }

//         setIsVideo(true);
//         const accept = (head.acceptRanges || "").toLowerCase();
//         if (accept && accept.includes("bytes")) {
//           setLocalUri(uri);
//           setReady(true);
//           return;
//         }

//         const name = `chat_video_${Date.now()}.mp4`;
//         const cachePath = `${RNFS.CachesDirectoryPath}/${name}`;
//         const downloaded = await downloadToCache(uri, cachePath);
//         if (!downloaded) {
//           setError("Download failed");
//           setReady(true);
//           return;
//         }

//         try {
//           const st = await RNFS.stat(downloaded);
//           if (st.size < 1000) {
//             setError("Downloaded file invalid");
//             setReady(true);
//             return;
//           }
//         } catch (e) {
//           console.log("stat error:", e);
//         }

//         if (!cancelled) {
//           const final = downloaded.startsWith("file://") ? downloaded : `file://${downloaded}`;
//           setLocalUri(final);
//           setReady(true);
//         }
//       } catch (err) {
//         console.log("DynamicMedia prepare error:", err);
//         if (!cancelled) {
//           setError("Media prepare failed");
//           setReady(true);
//         }
//       }
//     };

//     prepare();
//     return () => {
//       cancelled = true;
//     };
//   }, [uri, fileType]);

//   if (!uri) {
//     return (
//       <View style={localStyles.unknownBox}>
//         <Text style={localStyles.small}>No preview available</Text>
//       </View>
//     );
//   }

//   if ((fileType || "").startsWith("image/")) {
//     return (
//       <Image
//         source={{ uri }}
//         style={{ width: dimensions.width, height: dimensions.height, borderRadius: 8, backgroundColor: "#eee", marginTop: 6 }}
//         resizeMode="cover"
//       />
//     );
//   }

//   if (!ready) {
//     return (
//       <View style={localStyles.unknownBox}>
//         <Text style={localStyles.small}>Preparing media…</Text>
//       </View>
//     );
//   }

//   if (error || !isVideo) {
//     return (
//       <View style={localStyles.docWrap}>
//         <TouchableOpacity
//           style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
//           onPress={() => {
//             Linking.canOpenURL(uri)
//               .then((supported) => (supported ? Linking.openURL(uri) : Linking.openURL(uri.startsWith("http") ? uri : `https://${uri}`)))
//               .catch((e) => console.log("Open document error:", e));
//           }}
//         >
//           <Feather name="file-text" size={22} color="#444" />
//           <View style={{ marginLeft: 8, flex: 1 }}>
//             <Text numberOfLines={1} style={localStyles.filename}>
//               {fileName}
//             </Text>
//             <Text style={localStyles.small}>{error || "Open document"}</Text>
//           </View>
//         </TouchableOpacity>
//         <TouchableOpacity
//           style={localStyles.downloadBtn}
//           onPress={handleDownload}
//           disabled={downloading}
//           accessibilityLabel={`Download ${fileName}`}
//         >
//           <Feather name="download" size={20} color={downloading ? "#aaa" : "#377355"} />
//         </TouchableOpacity>
//       </View>
//     );
//   }

//   const onVideoLoad = (meta) => {
//     try {
//       const ns = meta?.naturalSize || {};
//       let w = ns.width || meta?.width || 0;
//       let h = ns.height || meta?.height || 0;

//       if (!w || !h) {
//         return;
//       }

//       const maxWidth = 260;
//       const scaleFactor = w > maxWidth ? maxWidth / w : 1;
//       const scaledWidth = Math.round(w * scaleFactor);
//       const scaledHeight = Math.round(h * scaleFactor);

//       setVideoDims({ width: scaledWidth, height: scaledHeight });
//     } catch (e) {
//       console.log("onVideoLoad error:", e);
//     }
//   };

//   return (
//     <View style={localStyles.mediaWrap}>
//       <Video
//         source={{ uri: localUri || uri }}
//         style={{
//           width: videoDims.width,
//           height: videoDims.height,
//           borderRadius: 8,
//           backgroundColor: "#000",
//         }}
//         controls={true}
//         paused={false}
//         resizeMode="contain"
//         onLoad={onVideoLoad}
//         onError={(e) => {
//           console.log("Video playback error:", e);
//         }}
//       />
//       <Text numberOfLines={1} style={localStyles.filenameSmall}>
//         {localUri ? "Playing local copy" : "Streaming remote video"}
//       </Text>
//     </View>
//   );
// }

// // ChatBubble component
// export default function ChatBubble({ msg, isMe, styles }) {
//   const { sendJson } = useSocketStore();

//   const handleDeleteMessage = () => {
//     try {
//       sendJson({ type: "delete_message", message_id: msg.id });
//       useMessageStore.getState().markMessageDeleted(msg.id);
//       console.log("🗑 Message delete emitted:", msg.id);
//     } catch (error) {
//       console.error(" Delete failed:", error);
//     }
//   };

//   const showOptions = () => {
//     if (msg.is_deleted) return;

//     if (Platform.OS === "ios") {
//       ActionSheetIOS.showActionSheetWithOptions(
//         {
//           options: ["Cancel", "Delete"],
//           destructiveButtonIndex: 1,
//           cancelButtonIndex: 0,
//         },
//         (buttonIndex) => {
//           if (buttonIndex === 1) handleDeleteMessage();
//         }
//       );
//     } else {
//       Alert.alert(
//         "Message Options",
//         "Choose an action",
//         [
//           { text: "Cancel", style: "cancel" },
//           { text: "Delete", onPress: handleDeleteMessage, style: "destructive" },
//         ],
//         { cancelable: true }
//       );
//     }
//   };

//   let files = [];
//   if (Array.isArray(msg.files) && msg.files.length > 0) {
//     files = msg.files.map((f) => ({
//       url: f.url || f.file_url || f.fileUrl || f.url,
//       type: f.type || f.file_type || "",
//       name: f.name || f.file_name || (f.url || "").split("/").pop(),
//     }));
//   } else if (Array.isArray(msg.attachments) && msg.attachments.length > 0) {
//     files = msg.attachments.map((a) => ({
//       url: a.file_url || a.url || a.fileUrl || null,
//       type: a.file_type || a.type || "",
//       name: a.file_name || a.name || (a.file_url || "").split("/").pop(),
//     }));
//   }

//   return (
//     <TouchableOpacity onLongPress={showOptions} activeOpacity={0.9}>
//       <View style={[styles.msgContainer, { alignSelf: isMe ? "flex-end" : "flex-start" }]}>
//         {!isMe && <Text style={styles.username}>{msg.sender_username}</Text>}

//         <View style={[styles.msgBubble, { backgroundColor: isMe ? "#DCF8C6" : "#FFFF" }]}>
//           {msg.is_deleted ? (
//             <Text style={styles.msgText}>🚫 Message deleted</Text>
//           ) : (
//             <>
//               {msg.content ? <Text style={styles.msgText}>{msg.content}</Text> : null}

//               {msg.message_type === "file" && files.length > 0 && (
//                 <View style={{ marginTop: 6 }}>
//                   {files.map((f, idx) => (
//                     <View key={idx} style={{ marginTop: 8 }}>
//                       <DynamicMedia fileUrl={f.url} fileType={f.type} />
//                       <Text numberOfLines={1} style={localStyles.filename}>
//                         {f.name || (f.url || "").split("/").pop()}
//                       </Text>
//                     </View>
//                   ))}
//                 </View>
//               )}

//               {msg.message_type === "location" && msg.latitude && msg.longitude && (
//                 <View style={{ backgroundColor: "#144c3a", borderRadius: 12, overflow: "hidden", marginTop: 8, width: 260 }}>
//                   <TouchableOpacity
//                     onPress={() => {
//                       const lat = msg.latitude;
//                       const lon = msg.longitude;
//                       const url =
//                         Platform.select({
//                           ios: `maps:0,0?q=${lat},${lon}`,
//                           android: `geo:0,0?q=${lat},${lon}`,
//                         }) || `https://www.google.com/maps?q=${lat},${lon}`;
//                       Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps?q=${lat},${lon}`));
//                     }}
//                   >
//                     <Image
//                       source={{
//                         uri: `https://static-maps.yandex.ru/1.x/?ll=${msg.longitude},${msg.latitude}&size=650,300&z=15&l=map&pt=${msg.longitude},${msg.latitude},pm2rdm`,
//                       }}
//                       style={{ width: "100%", height: 160, backgroundColor: "#ddd" }}
//                       resizeMode="cover"
//                     />
//                   </TouchableOpacity>

//                   <View style={{ padding: 12, backgroundColor: "#0f6b4a", flexDirection: "column", alignItems: "center" }}>
//                     <View style={{ flexDirection: "row", alignItems: "center" }}>
//                       <Ionicons name="location-outline" size={16} color="#fff" />
//                       <Text style={{ color: "#fff", fontWeight: "700", marginLeft: 6 }}>
//                         {msg.content || "Location shared"}
//                       </Text>
//                     </View>

//                     <TouchableOpacity
//                       onPress={() => {
//                         const lat = msg.latitude;
//                         const lon = msg.longitude;
//                         const url =
//                           Platform.select({
//                             ios: `maps:0,0?q=${lat},${lon}`,
//                             android: `geo:0,0?q=${lat},${lon}`,
//                           }) || `https://www.google.com/maps?q=${lat},${lon}`;
//                         Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps?q=${lat},${lon}`));
//                       }}
//                       style={{ backgroundColor: "#2f8a5a", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, marginTop: 8 }}
//                     >
//                       <Text style={{ color: "#fff", fontWeight: "700" }}>Open map</Text>
//                     </TouchableOpacity>
//                   </View>
//                 </View>
//               )}
//             </>
//           )}
//         </View>
//       </View>
//     </TouchableOpacity>
//   );
// }

// const localStyles = StyleSheet.create({
//   mediaWrap: {
//     marginTop: 6
//   },
//   image: {
//     borderRadius: 8,
//     backgroundColor: "#eee"
//   },
//   video: {
//     width: 260,
//     height: 160,
//     borderRadius: 8,
//     backgroundColor: "#000"
//   },
//   docWrap: {
//     marginTop: 6,
//     padding: 8,
//     borderRadius: 8,
//     backgroundColor: "#fafafa",
//     flexDirection: "row",
//     alignItems: "center",
//   },
//   filename: {
//     fontSize: 13,
//     marginTop: 6,
//     color: "#222"
//   },
//   filenameSmall: {
//     fontSize: 12,
//     color: "#666",
//     marginTop: 4
//   },
//   small: {
//     fontSize: 12,
//     color: "#666"
//   },
//   unknownBox: {
//     marginTop: 6,
//     padding: 8,
//     borderRadius: 8,
//     backgroundColor: "#fff3"
//   },
//   downloadBtn: {
//     padding: 8,
//     borderRadius: 8,
//     backgroundColor: "#fff",
//     marginLeft: 8,
//   },
// });


import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
  ActionSheetIOS,
  Alert,
} from "react-native";
import Video from "react-native-video";
import Feather from "react-native-vector-icons/Feather";
import Ionicons from "react-native-vector-icons/Ionicons";
import RNFS from "react-native-fs";
import { useSocketStore } from "../stores/socketStore";
import { useMessageStore } from "../stores/messageStore";
import { BASE_URL } from "@env";

// Helper: normalize url
function normalizeUrl(raw) {
  if (!raw) return null;
  if (typeof raw !== "string") return String(raw);
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  const base = (BASE_URL || "").replace(/\/+$/, "");
  return base ? `${base}/${String(raw).replace(/^\/+/, "")}` : raw;
}

// Do HEAD request to inspect remote headers
async function headUrl(url) {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return {
      status: res.status,
      contentType: res.headers.get("content-type"),
      acceptRanges: res.headers.get("accept-ranges"),
      contentLength: res.headers.get("content-length"),
    };
  } catch (e) {
    console.log("headUrl error:", e);
    return null;
  }
}

// Download to cache path or documents directory
async function downloadToCache(url, cachePath, onProgress) {
  try {
    const dl = RNFS.downloadFile({
      fromUrl: url,
      toFile: cachePath,
      discretionary: true,
      progressDivider: 10,
      progress: (p) => {
        if (onProgress) onProgress(p.bytesWritten, p.contentLength);
      },
    });
    const res = await dl.promise;
    if (res && res.statusCode >= 200 && res.statusCode < 300) {
      return cachePath;
    } else {
      console.log("downloadToCache failed status:", res && res.statusCode);
      return null;
    }
  } catch (e) {
    console.log("downloadToCache error:", e);
    return null;
  }
}

// DynamicMedia component
function DynamicMedia({ fileUrl, fileType }) {
  const [dimensions, setDimensions] = useState({ width: 220, height: 140 });
  const [ready, setReady] = useState(false);
  const [isVideo, setIsVideo] = useState(false);
  const [localUri, setLocalUri] = useState(null);
  const [error, setError] = useState(null);
  const [videoDims, setVideoDims] = useState({ width: 260, height: 160 });
  const [downloading, setDownloading] = useState(false); // Track download state

  const uri = normalizeUrl(fileUrl);
  const fileName = uri ? uri.split("/").pop() : "document";

  // Download handler for documents
  const handleDownload = async () => {
    if (!uri) {
      Alert.alert("Error", "No file URL available.");
      return;
    }

    setDownloading(true);
    try {
      // Use Documents directory for user-accessible storage
      const downloadDir = Platform.OS === "ios" ? RNFS.DocumentDirectoryPath : RNFS.DownloadDirectoryPath;
      const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_"); // Sanitize filename
      const destPath = `${downloadDir}/${safeFileName}`;

      // Check if file already exists
      const exists = await RNFS.exists(destPath);
      if (exists) {
        Alert.alert("Info", `File already downloaded: ${safeFileName}`);
        setDownloading(false);
        return;
      }

      const downloaded = await downloadToCache(uri, destPath, (bytesWritten, contentLength) => {
        console.log(`Download progress: ${Math.round((bytesWritten / contentLength) * 100)}%`);
      });

      if (downloaded) {
        Alert.alert("Success", `File downloaded to: ${safeFileName}`);
      } else {
        Alert.alert("Error", "Failed to download file.");
      }
    } catch (e) {
      console.log("handleDownload error:", e);
      Alert.alert("Error", "Could not download file.");
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);
    setIsVideo(false);
    setLocalUri(null);

    if (!uri) {
      setReady(true);
      return;
    }

    const prepare = async () => {
      try {
        if ((fileType || "").startsWith("image/")) {
          Image.getSize(
            uri,
            (w, h) => {
              const maxWidth = 260;
              const scaleFactor = w > maxWidth ? maxWidth / w : 1;
              if (!cancelled) {
                setDimensions({ width: Math.round(w * scaleFactor), height: Math.round(h * scaleFactor) });
                setReady(true);
              }
            },
            (e) => {
              console.warn("Image.getSize failed:", e);
              if (!cancelled) {
                setDimensions({ width: 220, height: 140 });
                setReady(true);
              }
            }
          );
          return;
        }

        const head = await headUrl(uri);
        if (!head) {
          setError("Could not reach server");
          setReady(true);
          return;
        }

        if (!head.contentType || !head.contentType.startsWith("video/")) {
          setIsVideo(false);
          setReady(true);
          return;
        }

        setIsVideo(true);
        const accept = (head.acceptRanges || "").toLowerCase();
        if (accept && accept.includes("bytes")) {
          setLocalUri(uri);
          setReady(true);
          return;
        }

        const name = `chat_video_${Date.now()}.mp4`;
        const cachePath = `${RNFS.CachesDirectoryPath}/${name}`;
        const downloaded = await downloadToCache(uri, cachePath);
        if (!downloaded) {
          setError("Download failed");
          setReady(true);
          return;
        }

        try {
          const st = await RNFS.stat(downloaded);
          if (st.size < 1000) {
            setError("Downloaded file invalid");
            setReady(true);
            return;
          }
        } catch (e) {
          console.log("stat error:", e);
        }

        if (!cancelled) {
          const final = downloaded.startsWith("file://") ? downloaded : `file://${downloaded}`;
          setLocalUri(final);
          setReady(true);
        }
      } catch (err) {
        console.log("DynamicMedia prepare error:", err);
        if (!cancelled) {
          setError("Media prepare failed");
          setReady(true);
        }
      }
    };

    prepare();
    return () => {
      cancelled = true;
    };
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
        style={{ width: dimensions.width, height: dimensions.height, borderRadius: 8, backgroundColor: "#eee", marginTop: 6 }}
        resizeMode="cover"
      />
    );
  }

  if (!ready) {
    return (
      <View style={localStyles.unknownBox}>
        <Text style={localStyles.small}>Preparing media…</Text>
      </View>
    );
  }

  if (error || !isVideo) {
    return (
      <View style={localStyles.docWrap}>
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
          onPress={() => {
            Linking.canOpenURL(uri)
              .then((supported) => (supported ? Linking.openURL(uri) : Linking.openURL(uri.startsWith("http") ? uri : `https://${uri}`)))
              .catch((e) => console.log("Open document error:", e));
          }}
        >
          <Feather name="file-text" size={22} color="#444" />
          <View style={{ marginLeft: 8, flex: 1 }}>
            <Text numberOfLines={1} style={localStyles.filename}>
              {fileName}
            </Text>
            <Text style={localStyles.small}>{error || "Open document"}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={localStyles.downloadBtn}
          onPress={handleDownload}
          disabled={downloading}
          accessibilityLabel={`Download ${fileName}`}
        >
          <Feather name="download" size={20} color={downloading ? "#aaa" : "#377355"} />
        </TouchableOpacity>
      </View>
    );
  }

  const onVideoLoad = (meta) => {
    try {
      const ns = meta?.naturalSize || {};
      let w = ns.width || meta?.width || 0;
      let h = ns.height || meta?.height || 0;

      if (!w || !h) {
        return;
      }

      const maxWidth = 260;
      const scaleFactor = w > maxWidth ? maxWidth / w : 1;
      const scaledWidth = Math.round(w * scaleFactor);
      const scaledHeight = Math.round(h * scaleFactor);

      setVideoDims({ width: scaledWidth, height: scaledHeight });
    } catch (e) {
      console.log("onVideoLoad error:", e);
    }
  };

  return (
    <View style={localStyles.mediaWrap}>
      <Video
        source={{ uri: localUri || uri }}
        style={{
          width: videoDims.width,
          height: videoDims.height,
          borderRadius: 8,
          backgroundColor: "#000",
        }}
        controls={true}
        paused={false}
        resizeMode="contain"
        onLoad={onVideoLoad}
        onError={(e) => {
          console.log("Video playback error:", e);
        }}
      />
      <Text numberOfLines={1} style={localStyles.filenameSmall}>
        {localUri ? "Playing local copy" : "Streaming remote video"}
      </Text>
    </View>
  );
}

// ChatBubble component
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

  let files = [];
  if (Array.isArray(msg.files) && msg.files.length > 0) {
    files = msg.files.map((f) => ({
      url: f.url || f.file_url || f.fileUrl || f.url,
      type: f.type || f.file_type || "",
      name: f.name || f.file_name || (f.url || "").split("/").pop(),
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
                  <TouchableOpacity
                    onPress={async () => {
                      const lat = msg.latitude;
                      const lon = msg.longitude;
                      const googleMapsUrl = `comgooglemaps://?q=${lat},${lon}&center=${lat},${lon}&zoom=15`;
                      const webUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
                      try {
                        const supported = await Linking.canOpenURL(googleMapsUrl);
                        if (supported) {
                          await Linking.openURL(googleMapsUrl);
                        } else {
                          await Linking.openURL(webUrl);
                        }
                      } catch (err) {
                        console.log("Error opening Google Maps:", err);
                        await Linking.openURL(webUrl);
                      }
                    }}
                  >
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
                      onPress={async () => {
                        const lat = msg.latitude;
                        const lon = msg.longitude;
                        const googleMapsUrl = `comgooglemaps://?q=${lat},${lon}&center=${lat},${lon}&zoom=15`;
                        const webUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
                        try {
                          const supported = await Linking.canOpenURL(googleMapsUrl);
                          if (supported) {
                            await Linking.openURL(googleMapsUrl);
                          } else {
                            await Linking.openURL(webUrl);
                          }
                        } catch (err) {
                          console.log("Error opening Google Maps:", err);
                          await Linking.openURL(webUrl);
                        }
                      }}
                      style={{ backgroundColor: "#2f8a5a", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, marginTop: 8 }}
                    >
                      <Text style={{ color: "#fff", fontWeight: "700" }}>Open in Google Maps</Text>
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
  mediaWrap: {
    marginTop: 6
  },
  image: {
    borderRadius: 8,
    backgroundColor: "#eee"
  },
  video: {
    width: 260,
    height: 160,
    borderRadius: 8,
    backgroundColor: "#000"
  },
  docWrap: {
    marginTop: 6,
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#fafafa",
    flexDirection: "row",
    alignItems: "center",
  },
  filename: {
    fontSize: 13,
    marginTop: 6,
    color: "#222"
  },
  filenameSmall: {
    fontSize: 12,
    color: "#666",
    marginTop: 4
  },
  small: {
    fontSize: 12,
    color: "#666"
  },
  unknownBox: {
    marginTop: 6,
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#fff3"
  },
  downloadBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#fff",
    marginLeft: 8,
  },
});
