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
// import React, { useState, useEffect, useRef } from "react";
// import { View, Text, Image, TouchableOpacity, StyleSheet, Linking, Platform, ActionSheetIOS, Alert } from "react-native";
// import Video from "react-native-video";
// import Feather from "react-native-vector-icons/Feather";
// import Ionicons from "react-native-vector-icons/Ionicons";
// import { useSocketStore } from "../stores/socketStore";
// import { useMessageStore } from "../stores/messageStore";
// import RNFS from "react-native-fs";
// import { BASE_URL } from "@env";

// /**
//  * Updated DynamicMedia:
//  * - If data URI (base64) => write to cache and play local file
//  * - If remote URL => try to play directly
//  *    - if server lacks Accept-Ranges OR playback fails with AVFoundation streaming error => download to cache and play local file
//  * - Cleanup cache on unmount
//  */

// function normalizeUrl(raw) {
//   if (!raw) return null;
//   if (typeof raw !== "string") return String(raw);
//   if (raw.startsWith("data:")) return raw;
//   if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
//   const base = (BASE_URL || "").replace(/\/+$/, "");
//   return base ? `${base}/${String(raw).replace(/^\/+/, "")}` : raw;
// }

// function isDataUri(uri) {
//   return typeof uri === "string" && uri.startsWith("data:");
// }

// async function writeDataUriToCache(dataUri, hint = "media") {
//   try {
//     const parts = dataUri.split(",");
//     if (parts.length < 2) throw new Error("Invalid data URI");
//     const meta = parts[0]; // data:<mime>;base64
//     const b64 = parts[1];
//     const mime = (meta.match(/data:([^;]+);/) || [null, "application/octet-stream"])[1];
//     const ext = (mime.split("/")[1] || "bin").replace(/\+.*$/g, "");
//     const fileName = `${Date.now()}_${hint}.${ext}`;
//     const cacheDir = RNFS.CachesDirectoryPath;
//     const path = `${cacheDir}/${fileName}`;
//     await RNFS.writeFile(path, b64, "base64");
//     return { ok: true, path: `file://${path}`, rawPath: path };
//   } catch (e) {
//     console.log("writeDataUriToCache error", e);
//     return { ok: false, error: e };
//   }
// }

// /** Do a HEAD request and return headers if available (fallback if HEAD not allowed) */
// async function fetchHeadHeaders(url) {
//   try {
//     const res = await fetch(url, { method: "HEAD" });
//     return { ok: true, status: res.status, headers: res.headers };
//   } catch (e) {
//     // some servers disallow HEAD; try GET with range request for 0 bytes
//     try {
//       const res2 = await fetch(url, { method: "GET", headers: { Range: "bytes=0-0" } });
//       return { ok: true, status: res2.status, headers: res2.headers };
//     } catch (err) {
//       console.log("fetchHeadHeaders failed", err);
//       return { ok: false, error: err };
//     }
//   }
// }

// /** Download remote URL to cache and return file:// path */
// async function downloadUrlToCache(url, hint = "video") {
//   try {
//     const extMatch = url.match(/\.(mp4|mov|m4v|webm|ogg)(\?.*)?$/i);
//     const ext = extMatch ? extMatch[1] : "mp4";
//     const filename = `${Date.now()}_${hint}.${ext}`;
//     const destPath = `${RNFS.CachesDirectoryPath}/${filename}`;
//     console.log("downloadUrlToCache -> downloading", url, "to", destPath);
//     const downloadResult = await RNFS.downloadFile({ fromUrl: url, toFile: destPath }).promise;
//     if (downloadResult && (downloadResult.statusCode === 200 || downloadResult.statusCode === 206)) {
//       return { ok: true, path: `file://${destPath}`, rawPath: destPath };
//     } else {
//       console.log("downloadUrlToCache -> unexpected status", downloadResult);
//       return { ok: false, error: downloadResult };
//     }
//   } catch (e) {
//     console.log("downloadUrlToCache error", e);
//     return { ok: false, error: e };
//   }
// }

// function DynamicMedia({ fileUrl, fileType }) {
//   const [dimensions, setDimensions] = useState({ width: 220, height: 140 });
//   const [videoPaused, setVideoPaused] = useState(true);
//   const [loading, setLoading] = useState(false);
//   const [localVideoUri, setLocalVideoUri] = useState(null);
//   const [directUriPlayable, setDirectUriPlayable] = useState(true);
//   const cleanupPathRef = useRef(null);
//   const uri = normalizeUrl(fileUrl);

//   useEffect(() => {
//     let mounted = true;

//     const cleanupPrevious = async () => {
//       if (cleanupPathRef.current) {
//         try {
//           const p = cleanupPathRef.current.replace("file://", "");
//           await RNFS.unlink(p).catch(() => {});
//         } catch (e) {}
//         cleanupPathRef.current = null;
//         setLocalVideoUri(null);
//       }
//     };

//     async function prepare() {
//       await cleanupPrevious();
//       if (!uri) return;

//       // image size calc
//       if ((fileType || "").startsWith("image/") && uri && !isDataUri(uri)) {
//         Image.getSize(
//           uri,
//           (w, h) => {
//             const maxWidth = 260;
//             const scaleFactor = w > maxWidth ? maxWidth / w : 1;
//             if (!mounted) return;
//             setDimensions({ width: Math.round(w * scaleFactor), height: Math.round(h * scaleFactor) });
//           },
//           () => {
//             if (!mounted) return;
//             setDimensions({ width: 220, height: 140 });
//           }
//         );
//         return;
//       }

//       // Data URI base64 video — write to cache
//       if (isDataUri(uri) && (fileType || "").startsWith("video/")) {
//         setLoading(true);
//         const res = await writeDataUriToCache(uri, "video");
//         if (!mounted) return;
//         setLoading(false);
//         if (res.ok) {
//           cleanupPathRef.current = res.path;
//           setLocalVideoUri(res.path);
//           setDirectUriPlayable(true); // we will play local file
//           console.log("DynamicMedia: wrote base64 to", res.path);
//         } else {
//           console.warn("DynamicMedia: failed writeDataUriToCache", res.error);
//         }
//         return;
//       }

//       // Remote URL: check headers to detect Accept-Ranges support
//       if (uri && uri.startsWith("http")) {
//         try {
//           const head = await fetchHeadHeaders(uri);
//           if (head.ok && head.headers) {
//             const ar = head.headers.get ? head.headers.get("accept-ranges") : head.headers["accept-ranges"];
//             const ct = head.headers.get ? head.headers.get("content-type") : head.headers["content-type"];
//             console.log("DynamicMedia HEAD:", { status: head.status, acceptRanges: ar, contentType: ct });
//             // If server doesn't support Accept-Ranges, we'll prefer to download and play locally
//             if (!ar || (typeof ar === "string" && ar.toLowerCase() !== "bytes")) {
//               console.warn("DynamicMedia: server missing Accept-Ranges. Will download and play local copy.");
//               setLoading(true);
//               const dl = await downloadUrlToCache(uri, "video");
//               if (!mounted) return;
//               setLoading(false);
//               if (dl.ok) {
//                 cleanupPathRef.current = dl.path;
//                 setLocalVideoUri(dl.path);
//                 setDirectUriPlayable(true);
//                 console.log("DynamicMedia: downloaded remote video to", dl.path);
//               } else {
//                 console.warn("DynamicMedia download fallback failed", dl.error);
//                 // still try direct streaming (some servers work despite no Accept-Ranges)
//                 setDirectUriPlayable(true);
//               }
//               return;
//             } else {
//               // server supports ranges — we can attempt direct playback
//               setDirectUriPlayable(true);
//               return;
//             }
//           } else {
//             console.log("DynamicMedia: HEAD failed; will attempt direct playback and fallback to download on error.");
//             setDirectUriPlayable(true);
//           }
//         } catch (e) {
//           console.log("DynamicMedia: error while fetching HEAD", e);
//           setDirectUriPlayable(true);
//         }
//       }
//     }

//     prepare();

//     return () => {
//       mounted = false;
//       // cleanup cached file on unmount
//       (async () => {
//         if (cleanupPathRef.current) {
//           try {
//             const p = cleanupPathRef.current.replace("file://", "");
//             await RNFS.unlink(p).catch(() => {});
//             cleanupPathRef.current = null;
//           } catch (e) {
//             // ignore
//           }
//         }
//       })();
//     };
//   }, [uri, fileType]);

//   // Render
//   if (!uri) {
//     return (
//       <View style={localStyles.unknownBox}>
//         <Text style={localStyles.small}>No preview available</Text>
//       </View>
//     );
//   }

//   if ((fileType || "").startsWith("image/")) {
//     const imgUri = uri;
//     return (
//       <Image
//         source={{ uri: imgUri }}
//         style={[localStyles.image, { width: dimensions.width, height: dimensions.height }]}
//         resizeMode="cover"
//       />
//     );
//   }

//   // Video
//   if ((fileType || "").startsWith("video/") || (uri && uri.match(/\.(mp4|mov|m4v|webm)$/i))) {
//     if (loading) {
//       return (
//         <View style={[localStyles.video, { alignItems: "center", justifyContent: "center" }]}>
//           <Text style={{ color: "#fff" }}>Preparing video…</Text>
//         </View>
//       );
//     }

//     // choose source: localVideoUri if present else uri
//     const sourceUri = localVideoUri || uri;

//     if (!sourceUri) {
//       return (
//         <View style={localStyles.video}>
//           <Text style={{ color: "#fff" }}>Video unavailable</Text>
//         </View>
//       );
//     }

//     return (
//       <View style={localStyles.mediaWrap}>
//         <TouchableOpacity
//           activeOpacity={0.95}
//           onPress={() => {
//             // toggle pause
//             // Note: when using `controls`, iOS may handle playback UI; keep paused toggle simple
//           }}
//           style={{ width: "100%" }}
//         >
//           <Video
//             source={{ uri: sourceUri }}
//             style={localStyles.video}
//             controls={true}
//             paused={false}
//             resizeMode="contain"
//             onError={async (e) => {
//               console.log("Video playback error:", e);
//               // If remote playback failed, attempt to download and play local copy (but only if we didn't already)
//               if (!localVideoUri && uri && uri.startsWith("http")) {
//                 console.warn("Video remote playback failed — attempting to download and play local copy.");
//                 setLoading(true);
//                 const dl = await downloadUrlToCache(uri, "video");
//                 setLoading(false);
//                 if (dl.ok) {
//                   cleanupPathRef.current = dl.path;
//                   setLocalVideoUri(dl.path);
//                   console.log("DynamicMedia: after remote error, downloaded to", dl.path);
//                 } else {
//                   console.warn("DynamicMedia: download after error also failed", dl.error);
//                 }
//               } else {
//                 // base64 path failed earlier — fallback shown implicitly
//               }

//               // Helpful hint for server issues:
//               if (e?.error && e.error.domain === "AVFoundationErrorDomain") {
//                 console.warn("AVFoundation error — check server Accept-Ranges & Content-Type for remote URL.");
//               }
//             }}
//           />
//         </TouchableOpacity>
//         <Text numberOfLines={1} style={localStyles.filenameSmall}>
//           Video
//         </Text>
//       </View>
//     );
//   }

//   // document fallback
//   return (
//     <TouchableOpacity
//       style={localStyles.docWrap}
//       onPress={() => {
//         const openUri = uri.startsWith("http") ? uri : `https://${uri}`;
//         Linking.canOpenURL(openUri)
//           .then((supported) => {
//             if (supported) return Linking.openURL(openUri);
//             return Linking.openURL(uri).catch((e) => console.log("Open document error:", e));
//           })
//           .catch((e) => console.log("Open document error:", e));
//       }}
//     >
//       <View style={{ flexDirection: "row", alignItems: "center" }}>
//         <Feather name="file-text" size={22} color="#444" />
//         <View style={{ marginLeft: 8 }}>
//           <Text numberOfLines={1} style={localStyles.filename}>
//             {(uri || "").split("/").pop()}
//           </Text>
//           <Text style={localStyles.small}>Open document</Text>
//         </View>
//       </View>
//     </TouchableOpacity>
//   );
// }

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

//   // Build files list robustly:
//   let files = [];

//   // msg.files may be: array of strings (base64/data URIs) OR array of objects { url / type / name }
//   if (Array.isArray(msg.files) && msg.files.length > 0) {
//     files = msg.files.map((f, idx) => {
//       if (!f) return null;
//       if (typeof f === "string") {
//         return { url: f, type: "", name: `file_${idx}` };
//       }
//       return {
//         url: f.url || f.file_url || f.fileUrl || null,
//         type: f.type || f.file_type || "",
//         name: f.name || f.file_name || (f.url || "").split("/").pop(),
//       };
//     }).filter(Boolean);
//   } else if (Array.isArray(msg.attachments) && msg.attachments.length > 0) {
//     files = msg.attachments.map((a, idx) => ({
//       url: a.file_url || a.url || a.fileUrl || null,
//       type: a.file_type || a.type || "",
//       name: a.file_name || a.name || (a.file_url || "").split("/").pop() || `file_${idx}`,
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
//                   <TouchableOpacity onPress={() => {
//                     const lat = msg.latitude;
//                     const lon = msg.longitude;
//                     const url = Platform.select({
//                       ios: `maps:0,0?q=${lat},${lon}`,
//                       android: `geo:0,0?q=${lat},${lon}`,
//                     }) || `https://www.google.com/maps?q=${lat},${lon}`;
//                     Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps?q=${lat},${lon}`));
//                   }}>
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
//                         const url = Platform.select({
//                           ios: `maps:0,0?q=${lat},${lon}`,
//                           android: `geo:0,0?q=${lat},${lon}`,
//                         }) || `https://www.google.com/maps?q=${lat},${lon}`;
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
//   mediaWrap: { marginTop: 6 },
//   image: { borderRadius: 8, backgroundColor: "#eee" },
//   video: { width: 260, height: 160, borderRadius: 8, backgroundColor: "#000" },
//   docWrap: { marginTop: 6, padding: 8, borderRadius: 8, backgroundColor: "#fafafa" },
//   filename: { fontSize: 13, marginTop: 6, color: "#222" },
//   filenameSmall: { fontSize: 12, color: "#666", marginTop: 4 },
//   small: { fontSize: 12, color: "#666" },
//   unknownBox: { marginTop: 6, padding: 8, borderRadius: 8, backgroundColor: "#fff3" },
// });



// ChatBubble.jsx
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
  const [downloading, setDownloading] = useState(false); // NEW: Track download state

  const uri = normalizeUrl(fileUrl);
  const fileName = uri ? uri.split("/").pop() : "document";

  // NEW: Download handler for documents
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
                    onPress={() => {
                      const lat = msg.latitude;
                      const lon = msg.longitude;
                      const url =
                        Platform.select({
                          ios: `maps:0,0?q=${lat},${lon}`,
                          android: `geo:0,0?q=${lat},${lon}`,
                        }) || `https://www.google.com/maps?q=${lat},${lon}`;
                      Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps?q=${lat},${lon}`));
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
                      onPress={() => {
                        const lat = msg.latitude;
                        const lon = msg.longitude;
                        const url =
                          Platform.select({
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