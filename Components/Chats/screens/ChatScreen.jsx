// ChatScreen.jsx
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Text,
  StyleSheet,
  ImageBackground,
  Modal,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
  PermissionsAndroid,
  Linking,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import Feather from "react-native-vector-icons/Feather";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMessageStore } from "../stores/messageStore";
import { useSocketStore } from "../stores/socketStore";
import axiosInstance from "../../TokenHandling/axiosInstance";
import TypingIndicator from "../components/TypingIndicator";
import ChatBubble from "../components/ChatBubble";
import { useNavigation } from "@react-navigation/native";
import debounce from "lodash.debounce";
import DocumentPicker from "react-native-document-picker";
import { launchImageLibrary } from "react-native-image-picker";
import Geolocation from "react-native-geolocation-service";
import RNFS from "react-native-fs";

// === compressor import (kept from your earlier changes) ===
import { Video as VideoCompressor } from "react-native-compressor";

/* ------------------------------------------------------------------
  Minimal change: only fixed DocumentPicker usage.
  UI and all other flows unchanged (video compression etc remain).
------------------------------------------------------------------ */

const UPLOAD_PATH = "/upload/"; // (unused for new base64 flow but kept)
const MAX_VIDEO_BYTES = 5 * 1024 * 1024; // 5 MB target
const BASE64_SAFE_LIMIT_BYTES = 28 * 1024 * 1024; // safety cap (approx 28 MB base64)

function FloatingAttachmentMenu({
  show,
  toggle,
  chatId = null,
  chatType = null,
  onImagePress: onImagePressProp,
  onDocPress: onDocPressProp,
  onLocationPress: onLocationPressProp,
  onThemePress: onThemePressProp,
  bottomOffset = Platform.select({ ios: 80, android: 64 }),
  dropDistance = 70,
  size = 50,
}) {
  const anim = useRef(new Animated.Value(show ? 1 : 0)).current;
  const sendJson = useSocketStore((s) => s.sendJson);

  // support multiple selected images/videos and multiple docs (preview in menu)
  const [selectedMedia, setSelectedMedia] = useState([]); // [{ uri, name, type }]
  const [selectedDocs, setSelectedDocs] = useState([]); // [{ uri, name, type }]
  const [selectedLocation, setSelectedLocation] = useState(null); // { latitude, longitude }

  useEffect(() => {
    Animated.timing(anim, { toValue: show ? 1 : 0, duration: 300, useNativeDriver: false }).start();
  }, [show, anim]);

  const centerSize = anim.interpolate({ inputRange: [0, 1], outputRange: [size, 130] });
  const centerOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, dropDistance] });

  const makePinStyle = (ox, oy) => {
    const tx = anim.interpolate({ inputRange: [0, 1], outputRange: [12 * ox, 40 * ox] });
    const ty = anim.interpolate({ inputRange: [0, 1], outputRange: [12 * oy, 40 * oy] });
    const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [7 / 30, 1] });
    const opacity = anim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0.8, 1] });
    return { transform: [{ translateX: tx }, { translateY: ty }, { scale }], opacity };
  };

  const makeBasePayload = useCallback(
    (extra = {}) => {
      const group_id = chatType === "group" ? chatId : null;
      const receiver_id = chatType === "personal" ? chatId : null;
      return { group_id, receiver_id, parent_id: null, ...extra };
    },
    [chatId, chatType]
  );

  // ------------------ IMAGE / VIDEO ------------------
  const internalImageHandler = useCallback(async () => {
    try {
      // allow images + videos, up to 5
      const res = await launchImageLibrary({ mediaType: "mixed", selectionLimit: 5 });
      if (res.didCancel) return;
      if (!res.assets || res.assets.length === 0) return;
      const assets = res.assets.map((a) => ({
        uri: a.uri,
        name: a.fileName || `file_${Date.now()}`,
        type: a.type || (a.uri?.endsWith(".mp4") ? "video/mp4" : "image/jpeg"),
        size: a.fileSize || null,
        duration: a.duration || null,
      }));
      // Forward to parent if it expects assets (parent will normalize)
      if (typeof onImagePressProp === "function") {
        try {
          onImagePressProp(assets);
        } catch (e) {
          console.log("onImagePressProp error", e);
        }
        return;
      }
      // fallback: keep local selection for preview inside menu
      setSelectedMedia((prev) => [...prev, ...assets]);
    } catch (e) {
      console.log("internalImageHandler error:", e);
      Alert.alert("Image error", "Could not open gallery.");
    }
  }, [onImagePressProp]);

  // ------------------ DOCUMENTS ------------------
  // *** FIXED: use modern DocumentPicker.pick with allowMultiSelection and fileCopyUri fallback ***
  const internalDocHandler = useCallback(async () => {
    try {
      // use `pick` with allowMultiSelection (works across versions)
      const res = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
        allowMultiSelection: true,
      });

      // res may be a single object or an array depending on version/options
      const filesArray = Array.isArray(res) ? res : [res];

      // Normalize: prefer fileCopyUri (iOS) else uri
      const docs = filesArray.map((d) => {
        const uri = d.fileCopyUri || d.uri || null;
        return {
          uri,
          name: d.name || `file_${Date.now()}`,
          type: d.type || "application/octet-stream",
          size: d.size || null,
        };
      });

      if (!docs || docs.length === 0) return;

      if (typeof onDocPressProp === "function") {
        try {
          onDocPressProp(docs);
        } catch (e) {
          console.log("onDocPressProp error", e);
        }
        return;
      }
      setSelectedDocs((prev) => [...prev, ...docs]);
    } catch (err) {
      // user cancelled
      if (DocumentPicker.isCancel(err)) return;
      console.log("internalDocHandler error", err);
      Alert.alert("Document error", "Could not pick document.");
    }
  }, [onDocPressProp]);

  // ------------------ LOCATION ------------------
  const requestAndroidLocationPermission = async () => {
    if (Platform.OS !== "android") return true;
    try {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
        title: "Location permission",
        message: "App needs access to your location to share it.",
        buttonNeutral: "Ask me later",
        buttonNegative: "Cancel",
        buttonPositive: "OK",
      });
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn("requestAndroidLocationPermission err", err);
      return false;
    }
  };

  const internalLocationHandler = useCallback(async () => {
    try {
      const ok = await requestAndroidLocationPermission();
      if (!ok) {
        Alert.alert("Permission denied", "Location permission is required.");
        return;
      }
      Geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          if (typeof onLocationPressProp === "function") {
            try {
              onLocationPressProp({ latitude, longitude });
            } catch (e) {
              console.log("onLocationPressProp error", e);
            }
            // parent will handle closing menu — do not toggle here
            return;
          }
          setSelectedLocation({ latitude, longitude });
        },
        (err) => {
          console.log("Geolocation error:", err);
          Alert.alert("Location error", "Could not get location.");
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    } catch (e) {
      console.log("internalLocationHandler outer error", e);
      Alert.alert("Location error", "Could not get location.");
    }
  }, [onLocationPressProp]);

  const sendSelectedMedia = useCallback(
    async (caption = "") => {
      if (!selectedMedia || selectedMedia.length === 0) return;
      // This local menu preview send is unused when parent handles; kept for parity
      // In typical flow parent handles and will call uploadAndSendAttachments in ChatScreen
      Alert.alert("Info", "Please use main send button in chat after selecting files.");
    },
    [selectedMedia]
  );

  const sendSelectedDocs = useCallback(
    async (caption = "") => {
      if (!selectedDocs || selectedDocs.length === 0) return;
      Alert.alert("Info", "Please use main send button in chat after selecting files.");
    },
    [selectedDocs]
  );

  const sendSelectedLocation = useCallback(async () => {
    if (selectedLocation && typeof onLocationPressProp === "function") {
      try {
        onLocationPressProp({ latitude: selectedLocation.latitude, longitude: selectedLocation.longitude });
      } catch (e) {
        console.log("onLocationPressProp error", e);
      }
      setSelectedLocation(null);
      return;
    }

    if (!selectedLocation) return;
    try {
      const payload = makeBasePayload({
        type: "send_message",
        message_type: "location",
        content: "Shared current location",
        latitude: Number(selectedLocation.latitude),
        longitude: Number(selectedLocation.longitude),
        files: [],
      });
      sendJson(payload);
      setSelectedLocation(null);
      toggle();
    } catch (e) {
      console.log("sendSelectedLocation error", e);
      Alert.alert("Send failed", "Could not send location.");
    }
  }, [selectedLocation, onLocationPressProp, makeBasePayload, sendJson, toggle]);

  const openInMaps = (lat, lng) => {
    const latlng = `${lat},${lng}`;
    const geoUrl = Platform.select({ ios: `maps:0,0?q=${latlng}`, android: `geo:0,0?q=${latlng}` });
    const webUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.canOpenURL(geoUrl)
      .then((supported) => (supported ? Linking.openURL(geoUrl) : Linking.openURL(webUrl)))
      .catch((err) => console.log("openInMaps error", err));
  };

  const openFile = (uri) => {
    Linking.openURL(uri).catch((e) => {
      Alert.alert("Open file", "Cannot open this file on device.");
      console.log("openFile error", e);
    });
  };

  // handlers to expose
  const handleImage = internalImageHandler;
  const handleDoc = internalDocHandler;
  const handleLocation = internalLocationHandler;
  const handleTheme = onThemePressProp ?? (() => toggle());

  const pins = [
    { key: "image", ox: 1, oy: 0, onPress: handleImage, icon: <Feather name="image" size={16} color="#fff" /> },
    { key: "doc", ox: -1, oy: 0, onPress: handleDoc, icon: <Feather name="file-text" size={16} color="#fff" /> },
    { key: "location", ox: 0, oy: -1, onPress: handleLocation, icon: <Feather name="map-pin" size={16} color="#fff" /> },
    { key: "theme", ox: 0, oy: 1, onPress: handleTheme, icon: <Ionicons name="moon" size={16} color="#fff" /> },
    { key: "close", ox: 0, oy: 0, onPress: toggle, icon: <Ionicons name="close" size={18} color="#fff" /> },
  ];

  return (
    <View style={[styles.wrapper, { bottom: bottomOffset }]}>
      <Animated.View
        pointerEvents={show ? "auto" : "none"}
        style={[
          styles.container,
          {
            width: centerSize,
            height: centerSize,
            borderRadius: Animated.divide(centerSize, 2),
            opacity: centerOpacity,
            transform: [{ translateY }],
          },
        ]}
      >
        {pins.map((p) => (
          <Animated.View key={p.key} style={[styles.pinBase, makePinStyle(p.ox, p.oy)]}>
            <TouchableOpacity accessibilityLabel={p.key} onPress={p.onPress} activeOpacity={0.85} style={styles.pinTouchable}>
              {p.icon}
            </TouchableOpacity>
          </Animated.View>
        ))}
      </Animated.View>

      {/* Previews for media/docs/location */}
      {selectedMedia.length > 0 && (
        <View style={styles.previewBox}>
          <ScrollView horizontal>
            {selectedMedia.map((m, i) => (
              <View key={i} style={{ marginRight: 8, alignItems: "center" }}>
                {m.type && m.type.startsWith("image/") ? (
                  <Image source={{ uri: m.uri }} style={{ width: 70, height: 70, borderRadius: 8 }} />
                ) : (
                  <View style={{ width: 70, height: 70, borderRadius: 8, backgroundColor: "#222", alignItems: "center", justifyContent: "center" }}>
                    <Feather name="video" size={24} color="#fff" />
                  </View>
                )}
                <Text numberOfLines={1} style={{ maxWidth: 70, fontSize: 11 }}>{m.name}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={{ marginTop: 8, flexDirection: "row", justifyContent: "flex-end" }}>
            <TouchableOpacity style={styles.sendBtn} onPress={() => sendSelectedMedia()}>
              <Text style={styles.sendText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {selectedDocs.length > 0 && (
        <View style={styles.previewBox}>
          <ScrollView horizontal>
            {selectedDocs.map((d, i) => (
              <View key={i} style={{ marginRight: 8, alignItems: "center", width: 140 }}>
                <Feather name="file" size={36} color="#333" />
                <Text numberOfLines={1} style={{ maxWidth: 120, fontSize: 12 }}>{d.name}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={{ marginTop: 8, flexDirection: "row", justifyContent: "flex-end" }}>
            <TouchableOpacity style={styles.sendBtn} onPress={() => sendSelectedDocs()}>
              <Text style={styles.sendText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {selectedLocation && (
        <View style={styles.previewBox}>
          <TouchableOpacity onPress={() => openInMaps(selectedLocation.latitude, selectedLocation.longitude)} style={styles.previewInner}>
            <Feather name="map-pin" size={28} color="#fff" />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.previewTitle}>Your Location</Text>
              <Text style={styles.previewSmall}>
                {selectedLocation.latitude.toFixed(5)}, {selectedLocation.longitude.toFixed(5)}
              </Text>
            </View>
            <TouchableOpacity style={styles.sendBtn} onPress={sendSelectedLocation}>
              <Text style={styles.sendText}>Send</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

/* ----------------- ChatScreen (default export) ----------------- */

export default function ChatScreen({ route }) {
  const { chatInfo } = route.params;
  const navigation = useNavigation();

  const connect = useSocketStore((s) => s.connect);
  const sendJson = useSocketStore((s) => s.sendJson);
  const typingStatus = useSocketStore((s) => s.typingStatus);
  const loadMessages = useMessageStore((s) => s.loadMessages);

  const chatKey = useMemo(() => `${chatInfo.chatId}-${chatInfo.chatType}`, [chatInfo.chatId, chatInfo.chatType]);
  const isGroup = useMemo(() => chatInfo.chatType === "group", [chatInfo.chatType]);
  const emptyArrRef = useRef([]);
  const messagesFromStore = useMessageStore((state) => state.messagesByChatId?.[chatKey]);
  const messages = messagesFromStore ?? emptyArrRef.current;

  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [myUserId, setMyUserId] = useState(null);
  const [showMembers, setShowMembers] = useState(false);
  const [pendingLocation, setPendingLocation] = useState(null); // { latitude, longitude }
  const flatListRef = useRef(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const connectedChatRef = useRef(null);

  // NEW: pending arrays for parent-handled selections
  const [pendingMedia, setPendingMedia] = useState([]); // assets chosen from gallery (when parent handles)
  const [pendingDocs, setPendingDocs] = useState([]); // docs chosen from menu

  useEffect(() => {
    AsyncStorage.getItem("userId")
      .then((id) => {
        if (id) setMyUserId(parseInt(id, 10));
      })
      .catch((e) => console.log("AsyncStorage error", e));
  }, []);

  useEffect(() => {
    if (!chatInfo?.chatId) return;
    const targetKey = chatKey;
    if (connectedChatRef.current === targetKey) return;
    connectedChatRef.current = targetKey;
    try {
      connect({ chatId: chatInfo.chatId, chatType: chatInfo.chatType });
    } catch (e) {
      console.log("connect error", e);
    }
    return () => {
      if (connectedChatRef.current === targetKey) connectedChatRef.current = null;
    };
  }, [chatInfo.chatId, chatInfo.chatType, chatKey, connect]);

  useEffect(() => {
    let cancelled = false;
    const fetchHistory = async () => {
      try {
        let res;
        if (isGroup) {
          res = await axiosInstance.get(`/chat/messages/group/${chatInfo.chatId}/`);
        } else {
          res = await axiosInstance.get(`/chat/messages/personal/${chatInfo.chatId}/`);
        }
        if (!cancelled) {
          if (Array.isArray(res.data)) {
            loadMessages(chatKey, res.data);
          } else {
            console.log("fetchHistory: unexpected data", res.data);
          }
        }
      } catch (err) {
        console.log("fetchHistory error", err);
      }
    };
    if (chatInfo?.chatId) fetchHistory();
    return () => {
      cancelled = true;
    };
  }, [chatKey, chatInfo.chatId, isGroup, loadMessages]);

  useEffect(() => {
    if (!flatListRef.current) return;
    try {
      flatListRef.current.scrollToEnd({ animated: true });
    } catch (e) {}
  }, [messages.length]);

  const sendTypingRef = useRef(null);
  useEffect(() => {
    sendTypingRef.current = debounce((isTyping) => {
      try {
        sendJson({
          type: "typing",
          is_typing: !!isTyping,
          group_id: isGroup ? chatInfo.chatId : null,
          receiver_id: !isGroup ? chatInfo.chatId : null,
        });
      } catch (e) {
        console.log("sendTyping error", e);
      }
    }, 400);
    return () => {
      sendTypingRef.current?.cancel?.();
      sendTypingRef.current = null;
    };
  }, [isGroup, chatInfo.chatId, sendJson]);

  useEffect(() => {
    const isTyping = input.trim().length > 0;
    sendTypingRef.current?.(isTyping);
  }, [input]);

  // -------------------- helper: toArray --------------------
  const toArray = useCallback((x) => {
    if (!x) return [];
    return Array.isArray(x) ? x : [x];
  }, []);

  // Parent handlers for media/docs/location coming from FloatingAttachmentMenu
  const handleMediaChosen = useCallback(
    (assets) => {
      // Normalize assets to array always
      const arr = Array.isArray(assets) ? assets : assets ? [assets] : [];
      setPendingMedia(arr);
      setShowAttachmentMenu(false);
    },
    []
  );

  const handleDocsChosen = useCallback((docs) => {
    const arr = Array.isArray(docs) ? docs : docs ? [docs] : [];
    setPendingDocs(arr);
    setShowAttachmentMenu(false);
  }, []);

  const handleLocationChosen = useCallback(
    (loc) => {
      if (!loc?.latitude || !loc?.longitude) return;
      setPendingLocation({ latitude: Number(loc.latitude), longitude: Number(loc.longitude) });
      setShowAttachmentMenu(false);
    },
    []
  );

  // compress helper using react-native-compressor
  const compressVideoIfNeeded = useCallback(async (uri, name, providedSize = null) => {
    try {
      // if provided size and already <= target => skip compression
      if (providedSize && providedSize <= MAX_VIDEO_BYTES) {
        return { ok: true, uri, size: providedSize };
      }

      // call compressor
      console.log("compressVideoIfNeeded -> compressing", uri, name);
      const compressed = await VideoCompressor.compress(uri, { compressionMethod: "auto" });
      if (!compressed) {
        console.log("compressVideoIfNeeded -> compressor returned falsy");
        return { ok: false, error: "compressor-failed" };
      }

      // ensure we have file path and stat it
      const path = compressed.startsWith("file://") ? compressed.replace("file://", "") : compressed;
      const exists = await RNFS.exists(path);
      if (!exists) {
        console.log("compressVideoIfNeeded -> compressed file not found", path);
        return { ok: false, error: "compressed-not-found" };
      }
      const stat = await RNFS.stat(path);
      const newSize = Number(stat.size || 0);
      console.log("compressVideoIfNeeded -> compressed size", newSize);
      return { ok: true, uri: path.startsWith("/") ? `file://${path}` : `file://${path}`, size: newSize };
    } catch (e) {
      console.log("compressVideoIfNeeded error", e);
      return { ok: false, error: e };
    }
  }, []);

  // helper to base64 encode items and send via websocket (no REST upload)
  const uploadAndSendAttachments = useCallback(
    async (items, caption = "") => {
      try {
        const list = Array.isArray(items) ? items : [];
        if (list.length === 0) {
          console.log("uploadAndSendAttachments: no items to send");
          return false;
        }

        const normalized = list
          .map((it, idx) => {
            if (!it) return null;
            if (it.uri) return { uri: it.uri, name: it.name || it.fileName || `file_${Date.now()}_${idx}`, type: it.type || "application/octet-stream", size: it.size || null };
            return { uri: String(it), name: `file_${Date.now()}_${idx}`, type: "application/octet-stream", size: null };
          })
          .filter(Boolean);

        const filesBase64 = [];
        const attachments = [];

        for (const f of normalized) {
          // If video -> compress if needed
          if ((f.type || "").startsWith("video/")) {
            const res = await compressVideoIfNeeded(f.uri, f.name, f.size);
            if (!res.ok) {
              Alert.alert("Video error", `Could not compress ${f.name}.`);
              return false;
            }
            f.uri = res.uri;
            f.size = res.size;
            // prefer mp4 mime
            f.type = "video/mp4";
            if (!f.name.endsWith(".mp4")) f.name = `${f.name.split(".")[0] || "video"}.mp4`;
          }

          // Size safety
          if (f.size && f.size > BASE64_SAFE_LIMIT_BYTES) {
            Alert.alert("File too large", `${f.name} is too large to send.`);
            return false;
          }

          // read file
          const filePath = f.uri.startsWith("file://") ? f.uri.replace("file://", "") : f.uri;
          let b64;
          try {
            b64 = await RNFS.readFile(filePath, "base64");
          } catch (e) {
            console.log("readFile failed", filePath, e);
            Alert.alert("File read error", `Cannot read ${f.name}`);
            return false;
          }

          if (!b64) {
            Alert.alert("File error", `Empty file ${f.name}`);
            return false;
          }

          // optional extra safety check for video size
          const estimatedBytes = Math.round((b64.length * 3) / 4);
          if ((f.type || "").startsWith("video/") && estimatedBytes > MAX_VIDEO_BYTES) {
            Alert.alert("File too large", `${f.name} is larger than ${Math.round(MAX_VIDEO_BYTES / 1024 / 1024)} MB after compression.`);
            return false;
          }

          filesBase64.push(`data:${f.type};base64,${b64}`);
          attachments.push({ file_name: f.name, file_type: f.type, file_url: null });
        }

        const payload = {
          type: "send_message",
          message_type: "file",
          content: caption || attachments.map((a) => a.file_name).join(", "),
          group_id: isGroup ? chatInfo.chatId : null,
          receiver_id: !isGroup ? chatInfo.chatId : null,
          parent_id: replyTo?.id || null,
          latitude: null,
          longitude: null,
          files: filesBase64,
          attachments,
        };

        console.log("uploadAndSendAttachments -> sending payload", { count: filesBase64.length, attachments });
        sendJson(payload);
        return true;
      } catch (e) {
        console.log("uploadAndSendAttachments error", e);
        Alert.alert("Send failed", "Could not send attachments.");
        return false;
      }
    },
    [isGroup, chatInfo?.chatId, replyTo, sendJson, compressVideoIfNeeded]
  );

  // -------------------- sendMessage (REPLACED WITH SAFE MERGE) --------------------
  const sendMessage = useCallback(async () => {
    try {
      // normalize pending arrays safely
      const pMedia = toArray(pendingMedia);
      const pDocs = toArray(pendingDocs);

      // combined attachments chosen via parent
      const all = pMedia.concat(pDocs);

      console.log("sendMessage -> pendingMedia:", pMedia.length, "pendingDocs:", pDocs.length, "combined:", all.length);

      // If there are attachments chosen, upload them and send as a file message
      if (all.length > 0) {
        const ok = await uploadAndSendAttachments(all, input.trim());
        if (ok) {
          // reset UI
          setInput("");
          setReplyTo(null);
          setPendingMedia([]);
          setPendingDocs([]);
        } else {
          console.warn("sendMessage: uploadAndSendAttachments returned false");
        }
        return;
      }

      // If there's a pending location, send it with caption (if any)
      if (pendingLocation) {
        const payload = {
          type: "send_message",
          message_type: "location",
          content: input.trim() || "Shared location",
          group_id: isGroup ? chatInfo.chatId : null,
          receiver_id: !isGroup ? chatInfo.chatId : null,
          parent_id: replyTo?.id || null,
          latitude: Number(pendingLocation.latitude),
          longitude: Number(pendingLocation.longitude),
          files: [],
        };
        console.log("sendMessage -> sending location payload", payload);
        try {
          sendJson(payload);
          // reset UI
          setInput("");
          setReplyTo(null);
          setPendingLocation(null);
        } catch (e) {
          console.error("sendMessage -> sendJson location error", e);
          Alert.alert("Send failed", "Could not send location.");
        }
        return;
      }

      // Normal text message
      if (!input.trim()) {
        console.log("sendMessage -> nothing to send (empty input)");
        return;
      }

      const textPayload = {
        type: "send_message",
        content: input.trim(),
        group_id: isGroup ? chatInfo.chatId : null,
        receiver_id: !isGroup ? chatInfo.chatId : null,
        parent_id: replyTo?.id || null,
      };
      console.log("sendMessage -> sending text payload", textPayload);
      try {
        sendJson(textPayload);
        setInput("");
        setReplyTo(null);
      } catch (e) {
        console.error("sendMessage -> sendJson text error", e);
        Alert.alert("Send failed", "Could not send message.");
      }
    } catch (err) {
      console.error("sendMessage unexpected error", err);
      Alert.alert("Error", "Something went wrong while sending message.");
    }
  }, [
    input,
    pendingMedia,
    pendingDocs,
    pendingLocation,
    isGroup,
    chatInfo.chatId,
    replyTo,
    sendJson,
    uploadAndSendAttachments,
    toArray,
  ]);

  const renderMessage = ({ item }) => {
    const isMe = item.sender === myUserId;
    return <ChatBubble msg={item} isMe={isMe} styles={styles} />;
  };

  const openMaps = (lat, lon) => {
    const latlng = `${lat},${lon}`;
    const geoUrl = Platform.select({ ios: `maps:0,0?q=${latlng}`, android: `geo:0,0?q=${latlng}` });
    const webUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
    Linking.canOpenURL(geoUrl)
      .then((supported) => (supported ? Linking.openURL(geoUrl) : Linking.openURL(webUrl)))
      .catch((err) => {
        console.log("openMaps error", err);
        Linking.openURL(webUrl).catch(() => {});
      });
  };

  // load userId
  useEffect(() => {
    AsyncStorage.getItem("userId")
      .then((id) => {
        if (id) setMyUserId(parseInt(id, 10));
      })
      .catch((e) => console.log("AsyncStorage error", e));
  }, []);

  return (
    <ImageBackground source={require("../../images/123.png")} style={{ flex: 1 }} resizeMode="cover">
      <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.1)" }} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={80}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 10 }}>
            <Ionicons name="arrow-back" size={26} color="#377355" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>{chatInfo.chatName}</Text>

          {isGroup && (
            <View style={styles.headerRight}>
              <Text style={styles.groupInfoText}>Group Info</Text>
              <TouchableOpacity onPress={() => setShowMembers(true)}>
                <Ionicons name="people-circle" size={28} color="#333" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TypingIndicator typingUsers={typingStatus} currentUser={myUserId?.toString()} />

        <FlatList ref={flatListRef} data={messages} keyExtractor={(item, index) => `${item.id ?? "idx-" + index}`} renderItem={renderMessage} contentContainerStyle={{ padding: 10 }} />

        {/* Pending media preview (when parent handles selection) */}
        {pendingMedia && pendingMedia.length > 0 && (
          <View style={styles.previewBox}>
            <ScrollView horizontal>
              {pendingMedia.map((m, i) => (
                <View key={i} style={{ marginRight: 8, alignItems: "center" }}>
                  {m.type.startsWith("image/") ? (
                    <Image source={{ uri: m.uri }} style={{ width: 70, height: 70, borderRadius: 8 }} />
                  ) : m.type.startsWith("video/") ? (
                    <View style={{ width: 70, height: 70, borderRadius: 8, backgroundColor: "#222", alignItems: "center", justifyContent: "center" }}>
                      <Feather name="video" size={24} color="#fff" />
                    </View>
                  ) : (
                    <View style={{ width: 70, height: 70, borderRadius: 8, backgroundColor: "#999", alignItems: "center", justifyContent: "center" }}>
                      <Feather name="file-text" size={24} color="#fff" />
                    </View>
                  )}
                  <Text numberOfLines={1} style={{ maxWidth: 70, fontSize: 11 }}>{m.name}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Pending docs preview */}
        {pendingDocs && pendingDocs.length > 0 && (
          <View style={styles.previewBox}>
            <ScrollView horizontal>
              {pendingDocs.map((d, i) => (
                <View key={i} style={{ marginRight: 8, alignItems: "center", width: 140 }}>
                  <Feather name="file" size={36} color="#333" />
                  <Text numberOfLines={1} style={{ maxWidth: 120, fontSize: 12 }}>{d.name}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Location pending preview */}
        {pendingLocation && (
          <View style={styles.pendingLocationBox}>
            <TouchableOpacity onPress={() => openMaps(pendingLocation.latitude, pendingLocation.longitude)} style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              <Image
                source={{
                  uri: `https://static-maps.yandex.ru/1.x/?ll=${pendingLocation.longitude},${pendingLocation.latitude}&size=450,200&z=15&l=map&pt=${pendingLocation.longitude},${pendingLocation.latitude},pm2rdm`,
                }}
                style={styles.pendingLocationImage}
                resizeMode="cover"
              />
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text numberOfLines={1} style={{ fontWeight: "700" }}>
                  Location selected
                </Text>
                <Text style={{ color: "#666", marginTop: 2 }}>
                  {pendingLocation.latitude.toFixed(5)}, {pendingLocation.longitude.toFixed(5)}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setPendingLocation(null)} style={styles.removeLocationBtn}>
              <Feather name="x" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* FloatingAttachmentMenu - pass handlers so menu will hand stuff to parent */}
        <FloatingAttachmentMenu
          show={showAttachmentMenu}
          toggle={() => setShowAttachmentMenu((s) => !s)}
          bottomOffset={Platform.select({ ios: 130, android: 110 })}
          dropDistance={70}
          chatId={chatInfo.chatId}
          chatType={chatInfo.chatType}
          onImagePress={handleMediaChosen}
          onDocPress={handleDocsChosen}
          onLocationPress={handleLocationChosen}
        />

        <View style={styles.inputRow}>
          <TouchableOpacity style={{ marginRight: 8 }} onPress={() => setShowAttachmentMenu((s) => !s)}>
            <MaterialCommunityIcons name="dots-grid" size={30} color="#377355" />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            value={input}
            onChangeText={(text) => setInput(text)}
            placeholder={pendingLocation ? "Add a caption..." : "Type a message..."}
            onSubmitEditing={() => sendMessage()}
            returnKeyType="send"
            multiline
          />
          <TouchableOpacity onPress={() => sendMessage()}>
            <Ionicons name="send" size={24} color="#377355" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={showMembers} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{chatInfo.members?.length || 0} Members</Text>
            <ScrollView>
              {chatInfo.members?.map((m, idx) => (
                <View key={idx} style={styles.memberRow}>
                  <Image source={{ uri: m.profile_image || "https://cdn-icons-png.flaticon.com/512/149/149071.png" }} style={styles.memberAvatar} />
                  <Text style={styles.memberName}>{m.username || `User ${m.id}`}</Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowMembers(false)}>
              <Text style={{ color: "#fff", fontWeight: "600" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

/* ----------------- Styles (merged, same as your file) ----------------- */

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#FFF",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  groupInfoText: {
    fontSize: 14,
    color: "#555",
    marginRight: 5,
  },
  msgContainer: {
    marginVertical: 6,
    maxWidth: "80%",
  },
  msgBubble: {
    padding: 12,
    borderRadius: 10,
  },
  msgText: {
    fontSize: 16,
    color: "#000",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: "#fff",
    borderTopColor: "#000",
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#000",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 120,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    maxHeight: "70%",
    padding: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  memberName: {
    fontSize: 16,
    color: "#333",
  },
  closeBtn: {
    backgroundColor: "#377355",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  wrapper: { position: "absolute", left: 6, zIndex: 9999 },
  container: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  pinBase: { position: "absolute", width: 30, height: 30, borderRadius: 15, backgroundColor: "#333849", alignItems: "center", justifyContent: "center" },
  pinTouchable: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  previewBox: { marginTop: 8, backgroundColor: "#fff", borderRadius: 12, padding: 8, width: "96%", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 4 },
  previewInner: { flexDirection: "row", alignItems: "center" },
  previewImage: { width: 48, height: 48, borderRadius: 6, backgroundColor: "#eee" },
  previewTitle: { fontSize: 14, fontWeight: "600", color: "#222" },
  previewSmall: { fontSize: 12, color: "#666", marginTop: 2 },
  sendBtn: { backgroundColor: "#377355", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  sendText: { color: "#fff", fontWeight: "600" },
  pendingLocationBox: {
    margin: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  pendingLocationImage: { width: 96, height: 64, borderRadius: 8, backgroundColor: "#ddd" },
  removeLocationBtn: { backgroundColor: "#cf2520ff", padding: 8, borderRadius: 8, marginLeft: 8, alignItems: "center", justifyContent: "center" },
});





// ChatScreen.jsx
// import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
// import {
//   View,
//   TextInput,
//   TouchableOpacity,
//   FlatList,
//   Text,
//   StyleSheet,
//   ImageBackground,
//   Modal,
//   ScrollView,
//   Image,
//   KeyboardAvoidingView,
//   Platform,
//   Animated,
//   Alert,
//   PermissionsAndroid,
//   Linking,
// } from "react-native";
// import Ionicons from "react-native-vector-icons/Ionicons";
// import Feather from "react-native-vector-icons/Feather";
// import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { useMessageStore } from "../stores/messageStore";
// import { useSocketStore } from "../stores/socketStore";
// import axiosInstance from "../../TokenHandling/axiosInstance";
// import TypingIndicator from "../components/TypingIndicator";
// import ChatBubble from "../components/ChatBubble";
// import { useNavigation } from "@react-navigation/native";
// import debounce from "lodash.debounce";
// import DocumentPicker from "react-native-document-picker";
// import { launchImageLibrary } from "react-native-image-picker";
// import Geolocation from "react-native-geolocation-service";
// import RNBlobUtil from "react-native-blob-util";

// /* ------------------------------------------------------------------
//   ChatScreen with:
//    - RNBlobUtil multipart upload (content:// + file:// support)
//    - fetch(FormData) fallback for iOS tmp files
//    - normalizeFileUrl to ensure recipients get full http(s) URLs
//    - sends `files` array in websocket payload with {url,type,name}
// ------------------------------------------------------------------ */

// const UPLOAD_PATH = "/upload/"; // change if your API differs

// const getUploadUrl = () => {
//   const base = axiosInstance?.defaults?.baseURL || "";
//   if (!base) return UPLOAD_PATH;
//   return base.endsWith("/") ? base.slice(0, -1) + UPLOAD_PATH : base + UPLOAD_PATH;
// };

// const normalizeFileUrl = (rawUrl) => {
//   if (!rawUrl) return rawUrl;
//   try {
//     const s = String(rawUrl);
//     if (s.startsWith("http://") || s.startsWith("https://")) return s;
//     // try axiosInstance baseURL
//     const base = axiosInstance?.defaults?.baseURL || "";
//     if (base) return base.replace(/\/+$/, "") + "/" + s.replace(/^\/+/, "");
//     return s;
//   } catch (e) {
//     return rawUrl;
//   }
// };

// async function requestAndroidStoragePermission() {
//   if (Platform.OS !== "android") return true;
//   try {
//     if (Platform.Version >= 33) {
//       const readImages = await PermissionsAndroid.request("android.permission.READ_MEDIA_IMAGES", {
//         title: "Read images permission",
//         message: "App needs access to your images to pick photos.",
//         buttonPositive: "OK",
//       });
//       const readVideo = await PermissionsAndroid.request("android.permission.READ_MEDIA_VIDEO", {
//         title: "Read videos permission",
//         message: "App needs access to your videos to pick videos.",
//         buttonPositive: "OK",
//       });
//       return (
//         readImages === PermissionsAndroid.RESULTS.GRANTED ||
//         readVideo === PermissionsAndroid.RESULTS.GRANTED
//       );
//     } else {
//       const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE, {
//         title: "Storage permission",
//         message: "App needs access to your storage to pick files.",
//         buttonPositive: "OK",
//       });
//       return granted === PermissionsAndroid.RESULTS.GRANTED;
//     }
//   } catch (err) {
//     console.warn("requestAndroidStoragePermission err", err);
//     return false;
//   }
// }

// /**
//  * uploadFileBlob:
//  * - Attempts RNBlobUtil.multipart upload (good for content:// and file://)
//  * - On failure falls back to fetch + FormData (works well on iOS tmp file URLs)
//  */
// async function uploadFileBlob(file) {
//   try {
//     if (!file || !file.uri) {
//       console.warn("uploadFileBlob: invalid file", file);
//       return { success: false, error: "invalid file" };
//     }
//     const uri = String(file.uri);
//     const filename = file.name || uri.split("/").pop() || `file_${Date.now()}`;
//     const type = file.type || "application/octet-stream";
//     const url = getUploadUrl();

//     console.log("uploadFileBlob -> attempt RNBlobUtil upload", { filename, uri, type, url });

//     const headers = { "Content-Type": "multipart/form-data" };
//     try {
//       const token = axiosInstance?.defaults?.headers?.common?.Authorization;
//       if (token) headers.Authorization = token;
//     } catch (e) {}

//     // Try RNBlobUtil multipart first
//     try {
//       const wrappedUri = RNBlobUtil.wrap(uri);
//       const parts = [
//         {
//           name: "file",
//           filename,
//           type,
//           data: wrappedUri,
//         },
//       ];
//       const resp = await RNBlobUtil.fetch("POST", url, headers, parts);
//       let data;
//       try {
//         data = resp.json ? resp.json() : JSON.parse(resp.data || "{}");
//       } catch (e) {
//         console.warn("uploadFileBlob: RNBlobUtil response parse failed", e, resp.data);
//         data = {};
//       }
//       const fileUrl = data?.file_url || data?.url || (data?.file && data.file.url) || null;
//       console.log("uploadFileBlob -> RNBlobUtil success", { fileUrl, data });
//       return { success: true, fileUrl, raw: data };
//     } catch (rnErr) {
//       console.warn("uploadFileBlob -> RNBlobUtil failed, falling back to fetch FormData", rnErr);
//     }

//     // fallback: use fetch + FormData
//     try {
//       const form = new FormData();
//       form.append("file", {
//         uri,
//         name: filename,
//         type,
//       });
//       console.log("uploadFileBlob -> fetch fallback form prepared, posting to", url);

//       const fetchHeaders = {};
//       try {
//         const token = axiosInstance?.defaults?.headers?.common?.Authorization;
//         if (token) fetchHeaders.Authorization = token;
//       } catch (e) {}

//       const resp = await fetch(url, {
//         method: "POST",
//         headers: fetchHeaders,
//         body: form,
//       });

//       const resultText = await resp.text();
//       let data;
//       try {
//         data = JSON.parse(resultText);
//       } catch (e) {
//         console.warn("uploadFileBlob -> fetch response parse failed", e, resultText);
//         data = {};
//       }
//       const fileUrl = data?.file_url || data?.url || (data?.file && data.file.url) || null;
//       console.log("uploadFileBlob -> fetch fallback success", { fileUrl, data, status: resp.status });
//       return { success: true, fileUrl, raw: data };
//     } catch (fetchErr) {
//       console.log("uploadFileBlob -> fetch fallback failed:", fetchErr);
//       return { success: false, error: fetchErr };
//     }
//   } catch (err) {
//     console.log("uploadFileBlob outer error:", err);
//     return { success: false, error: err };
//   }
// }

// /* ------------------ FloatingAttachmentMenu (local) ------------------ */
// function FloatingAttachmentMenu({
//   show,
//   toggle,
//   chatId = null,
//   chatType = null,
//   onImagePress: onImagePressProp,
//   onDocPress: onDocPressProp,
//   onLocationPress: onLocationPressProp,
//   onThemePress: onThemePressProp,
//   bottomOffset = Platform.select({ ios: 80, android: 64 }),
//   dropDistance = 70,
//   size = 50,
// }) {
//   const anim = useRef(new Animated.Value(show ? 1 : 0)).current;
//   const sendJson = useSocketStore((s) => s.sendJson);

//   const [selectedMedia, setSelectedMedia] = useState([]);
//   const [selectedDocs, setSelectedDocs] = useState([]);
//   const [selectedLocation, setSelectedLocation] = useState(null);

//   useEffect(() => {
//     Animated.timing(anim, { toValue: show ? 1 : 0, duration: 300, useNativeDriver: false }).start();
//   }, [show, anim]);

//   const centerSize = anim.interpolate({ inputRange: [0, 1], outputRange: [size, 130] });
//   const centerOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
//   const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, dropDistance] });

//   const makePinStyle = (ox, oy) => {
//     const tx = anim.interpolate({ inputRange: [0, 1], outputRange: [12 * ox, 40 * ox] });
//     const ty = anim.interpolate({ inputRange: [0, 1], outputRange: [12 * oy, 40 * oy] });
//     const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [7 / 30, 1] });
//     const opacity = anim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0.8, 1] });
//     return { transform: [{ translateX: tx }, { translateY: ty }, { scale }], opacity };
//   };

//   const makeBasePayload = useCallback(
//     (extra = {}) => {
//       const group_id = chatType === "group" ? chatId : null;
//       const receiver_id = chatType === "personal" ? chatId : null;
//       return { group_id, receiver_id, parent_id: null, ...extra };
//     },
//     [chatId, chatType]
//   );

//   const uploadFile = useCallback(async (file) => {
//     return await uploadFileBlob(file);
//   }, []);

//   const internalImageHandler = useCallback(async () => {
//     try {
//       const ok = await requestAndroidStoragePermission();
//       if (!ok) {
//         Alert.alert("Permission denied", "Storage permission is required to pick media.");
//         return;
//       }

//       const res = await launchImageLibrary({ mediaType: "mixed", selectionLimit: 5 });
//       console.log("launchImageLibrary result:", JSON.stringify(res, null, 2));
//       if (res?.didCancel) return;
//       if (!res?.assets || res.assets.length === 0) return;
//       const assets = res.assets.map((a) => ({
//         uri: a.uri,
//         name: a.fileName || `file_${Date.now()}`,
//         type: a.type || (a.uri?.endsWith(".mp4") ? "video/mp4" : "image/jpeg"),
//       }));
//       if (typeof onImagePressProp === "function") {
//         try {
//           onImagePressProp(assets);
//         } catch (e) {
//           console.log("onImagePressProp error", e);
//         }
//         return;
//       }
//       setSelectedMedia((prev) => [...prev, ...assets]);
//     } catch (e) {
//       console.log("internalImageHandler error:", e);
//       Alert.alert("Image error", "Could not open gallery.");
//     }
//   }, [onImagePressProp]);

//   const sendSelectedMedia = useCallback(
//     async (caption = "") => {
//       if (!selectedMedia || selectedMedia.length === 0) return;
//       try {
//         // upload each file and collect responses
//         const ups = [];
//         for (const m of selectedMedia) {
//           const r = await uploadFile(m);
//           ups.push(r);
//           if (!r.success) {
//             console.log("sendSelectedMedia: upload failed for", m, r);
//             Alert.alert("Upload failed", `Could not upload ${m.name}`);
//             return;
//           }
//         }

//         // normalize attachments and full urls
//         const attachments = ups.map((u, i) => {
//           const raw = u?.fileUrl || (u?.raw && (u.raw.file_url || u.raw.url)) || null;
//           const file_url = normalizeFileUrl(raw);
//           return {
//             file_url,
//             file_type: selectedMedia[i].type || "",
//             file_name: selectedMedia[i].name || "",
//           };
//         });

//         // canonical files array for websocket / recipient clients
//         const filesForWs = attachments.map((a) => ({
//           url: a.file_url,
//           type: a.file_type,
//           name: a.file_name,
//         }));

//         const payload = makeBasePayload({
//           type: "send_message",
//           message_type: "file",
//           content: caption || attachments.map((m) => m.file_name).join(", "),
//           files: filesForWs,
//           attachments,
//         });

//         sendJson(payload);
//         setSelectedMedia([]);
//         toggle();
//       } catch (e) {
//         console.log("sendSelectedMedia error", e);
//         Alert.alert("Send failed", "Could not send media.");
//       }
//     },
//     [selectedMedia, uploadFile, makeBasePayload, sendJson, toggle]
//   );

//   const internalDocHandler = useCallback(async () => {
//     try {
//       const ok = await requestAndroidStoragePermission();
//       if (!ok) {
//         Alert.alert("Permission denied", "Storage permission is required to pick documents.");
//         return;
//       }

//       let res;
//       if (typeof DocumentPicker.pickMultiple === "function") {
//         res = await DocumentPicker.pickMultiple({
//           type: [DocumentPicker.types.allFiles],
//           copyTo: "cachesDirectory",
//         });
//       } else {
//         res = await DocumentPicker.pick({
//           type: [DocumentPicker.types.allFiles],
//           allowMultiSelection: true,
//           copyTo: "cachesDirectory",
//         });
//       }

//       console.log("DocumentPicker result:", JSON.stringify(res, null, 2));
//       if (!res || (Array.isArray(res) && res.length === 0)) return;

//       const items = Array.isArray(res) ? res : [res];
//       const docs = items.map((d) => {
//         const uri = d.fileCopyUri || d.uri;
//         return { uri, name: d.name, type: d.type || "application/octet-stream" };
//       });

//       if (typeof onDocPressProp === "function") {
//         try {
//           onDocPressProp(docs);
//         } catch (e) {
//           console.log("onDocPressProp error", e);
//         }
//         return;
//       }
//       setSelectedDocs((prev) => [...prev, ...docs]);
//     } catch (err) {
//       if (DocumentPicker.isCancel && DocumentPicker.isCancel(err)) return;
//       console.log("internalDocHandler error", err);
//       Alert.alert("Document error", "Could not pick document.");
//     }
//   }, [onDocPressProp]);

//   const sendSelectedDocs = useCallback(
//     async (caption = "") => {
//       if (!selectedDocs || selectedDocs.length === 0) return;
//       try {
//         const ups = [];
//         for (const d of selectedDocs) {
//           const r = await uploadFile(d);
//           ups.push(r);
//           if (!r.success) {
//             console.log("sendSelectedDocs: upload failed for", d, r);
//             Alert.alert("Upload failed", `Could not upload ${d.name}`);
//             return;
//           }
//         }

//         const attachments = ups.map((u, i) => {
//           const raw = u?.fileUrl || (u?.raw && (u.raw.file_url || u.raw.url)) || null;
//           const file_url = normalizeFileUrl(raw);
//           return {
//             file_url,
//             file_type: selectedDocs[i].type || "",
//             file_name: selectedDocs[i].name || "",
//           };
//         });

//         const filesForWs = attachments.map((a) => ({
//           url: a.file_url,
//           type: a.file_type,
//           name: a.file_name,
//         }));

//         const payload = makeBasePayload({
//           type: "send_message",
//           message_type: "file",
//           content: caption || attachments.map((d) => d.file_name).join(", "),
//           files: filesForWs,
//           attachments,
//         });

//         sendJson(payload);
//         setSelectedDocs([]);
//         toggle();
//       } catch (e) {
//         console.log("sendSelectedDocs error", e);
//         Alert.alert("Send failed", "Could not send documents.");
//       }
//     },
//     [selectedDocs, uploadFile, makeBasePayload, sendJson, toggle]
//   );

//   const requestAndroidLocationPermission = async () => {
//     if (Platform.OS !== "android") return true;
//     try {
//       const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
//         title: "Location permission",
//         message: "App needs access to your location to share it.",
//         buttonNeutral: "Ask me later",
//         buttonNegative: "Cancel",
//         buttonPositive: "OK",
//       });
//       return granted === PermissionsAndroid.RESULTS.GRANTED;
//     } catch (err) {
//       console.warn("requestAndroidLocationPermission err", err);
//       return false;
//     }
//   };

//   const internalLocationHandler = useCallback(async () => {
//     try {
//       const ok = await requestAndroidLocationPermission();
//       if (!ok) {
//         Alert.alert("Permission denied", "Location permission is required.");
//         return;
//       }
//       Geolocation.getCurrentPosition(
//         (pos) => {
//           const { latitude, longitude } = pos.coords;
//           if (typeof onLocationPressProp === "function") {
//             try {
//               onLocationPressProp({ latitude, longitude });
//             } catch (e) {
//               console.log("onLocationPressProp error", e);
//             }
//             return;
//           }
//           setSelectedLocation({ latitude, longitude });
//         },
//         (err) => {
//           console.log("Geolocation error:", err);
//           Alert.alert("Location error", "Could not get location.");
//         },
//         { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
//       );
//     } catch (e) {
//       console.log("internalLocationHandler outer error", e);
//       Alert.alert("Location error", "Could not get location.");
//     }
//   }, [onLocationPressProp]);

//   const sendSelectedLocation = useCallback(async () => {
//     if (selectedLocation && typeof onLocationPressProp === "function") {
//       try {
//         onLocationPressProp({ latitude: selectedLocation.latitude, longitude: selectedLocation.longitude });
//       } catch (e) {
//         console.log("onLocationPressProp error", e);
//       }
//       setSelectedLocation(null);
//       return;
//     }

//     if (!selectedLocation) return;
//     try {
//       const payload = makeBasePayload({
//         type: "send_message",
//         message_type: "location",
//         content: "Shared current location",
//         latitude: Number(selectedLocation.latitude),
//         longitude: Number(selectedLocation.longitude),
//         files: [],
//       });
//       sendJson(payload);
//       setSelectedLocation(null);
//       toggle();
//     } catch (e) {
//       console.log("sendSelectedLocation error:", e);
//       Alert.alert("Send failed", "Could not send location.");
//     }
//   }, [selectedLocation, onLocationPressProp, makeBasePayload, sendJson, toggle]);

//   const openInMaps = (lat, lng) => {
//     const latlng = `${lat},${lng}`;
//     const geoUrl = Platform.select({ ios: `maps:0,0?q=${latlng}`, android: `geo:0,0?q=${latlng}` });
//     const webUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
//     Linking.canOpenURL(geoUrl)
//       .then((supported) => (supported ? Linking.openURL(geoUrl) : Linking.openURL(webUrl)))
//       .catch((err) => console.log("openInMaps error", err));
//   };

//   const openFile = (uri) => {
//     Linking.openURL(uri).catch((e) => {
//       Alert.alert("Open file", "Cannot open this file on device.");
//       console.log("openFile error", e);
//     });
//   };

//   const handleImage = internalImageHandler;
//   const handleDoc = internalDocHandler;
//   const handleLocation = internalLocationHandler;
//   const handleTheme = onThemePressProp ?? (() => toggle());

//   const pins = [
//     { key: "image", ox: 1, oy: 0, onPress: handleImage, icon: <Feather name="image" size={16} color="#fff" /> },
//     { key: "doc", ox: -1, oy: 0, onPress: handleDoc, icon: <Feather name="file-text" size={16} color="#fff" /> },
//     { key: "location", ox: 0, oy: -1, onPress: handleLocation, icon: <Feather name="map-pin" size={16} color="#fff" /> },
//     { key: "theme", ox: 0, oy: 1, onPress: handleTheme, icon: <Ionicons name="moon" size={16} color="#fff" /> },
//     { key: "close", ox: 0, oy: 0, onPress: toggle, icon: <Ionicons name="close" size={18} color="#fff" /> },
//   ];

//   return (
//     <View style={[styles.wrapper, { bottom: bottomOffset }]}>
//       <Animated.View
//         pointerEvents={show ? "auto" : "none"}
//         style={[
//           styles.container,
//           {
//             width: centerSize,
//             height: centerSize,
//             borderRadius: Animated.divide(centerSize, 2),
//             opacity: centerOpacity,
//             transform: [{ translateY }],
//           },
//         ]}
//       >
//         {pins.map((p) => (
//           <Animated.View key={p.key} style={[styles.pinBase, makePinStyle(p.ox, p.oy)]}>
//             <TouchableOpacity accessibilityLabel={p.key} onPress={p.onPress} activeOpacity={0.85} style={styles.pinTouchable}>
//               {p.icon}
//             </TouchableOpacity>
//           </Animated.View>
//         ))}
//       </Animated.View>

//       {selectedMedia.length > 0 && (
//         <View style={styles.previewBox}>
//           <ScrollView horizontal>
//             {selectedMedia.map((m, i) => (
//               <View key={i} style={{ marginRight: 8, alignItems: "center" }}>
//                 {(m.type || "").startsWith("image/") ? (
//                   <Image source={{ uri: m.uri }} style={{ width: 70, height: 70, borderRadius: 8 }} />
//                 ) : (m.type || "").startsWith("video/") ? (
//                   <View style={{ width: 70, height: 70, borderRadius: 8, backgroundColor: "#222", alignItems: "center", justifyContent: "center" }}>
//                     <Feather name="video" size={24} color="#fff" />
//                   </View>
//                 ) : (
//                   <View style={{ width: 70, height: 70, borderRadius: 8, backgroundColor: "#999", alignItems: "center", justifyContent: "center" }}>
//                     <Feather name="file-text" size={24} color="#fff" />
//                   </View>
//                 )}
//                 <Text numberOfLines={1} style={{ maxWidth: 70, fontSize: 11 }}>{m.name}</Text>
//               </View>
//             ))}
//           </ScrollView>
//           <View style={{ marginTop: 8, flexDirection: "row", justifyContent: "flex-end" }}>
//             <TouchableOpacity style={styles.sendBtn} onPress={() => sendSelectedMedia()}>
//               <Text style={styles.sendText}>Send</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       )}

//       {selectedDocs.length > 0 && (
//         <View style={styles.previewBox}>
//           <ScrollView horizontal>
//             {selectedDocs.map((d, i) => (
//               <View key={i} style={{ marginRight: 8, alignItems: "center", width: 140 }}>
//                 <Feather name="file" size={36} color="#333" />
//                 <Text numberOfLines={1} style={{ maxWidth: 120, fontSize: 12 }}>{d.name}</Text>
//               </View>
//             ))}
//           </ScrollView>
//           <View style={{ marginTop: 8, flexDirection: "row", justifyContent: "flex-end" }}>
//             <TouchableOpacity style={styles.sendBtn} onPress={() => sendSelectedDocs()}>
//               <Text style={styles.sendText}>Send</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       )}

//       {selectedLocation && (
//         <View style={styles.previewBox}>
//           <TouchableOpacity onPress={() => openInMaps(selectedLocation.latitude, selectedLocation.longitude)} style={styles.previewInner}>
//             <Feather name="map-pin" size={28} color="#fff" />
//             <View style={{ flex: 1, marginLeft: 8 }}>
//               <Text style={styles.previewTitle}>Your Location</Text>
//               <Text style={styles.previewSmall}>
//                 {selectedLocation.latitude.toFixed(5)}, {selectedLocation.longitude.toFixed(5)}
//               </Text>
//             </View>
//             <TouchableOpacity style={styles.sendBtn} onPress={sendSelectedLocation}>
//               <Text style={styles.sendText}>Send</Text>
//             </TouchableOpacity>
//           </TouchableOpacity>
//         </View>
//       )}
//     </View>
//   );
// }

// /* rest of ChatScreen implementation (UI, sendMessage, uploadAndSendAttachments etc.) is unchanged */
// /* Keep your existing styles and other code from the previous ChatScreen file. */
// /* Important: make sure uploadAndSendAttachments uses normalizeFileUrl (as used above) and sends `files` array with url,type,name. */


// /* ----------------- ChatScreen (default export) ----------------- */

// export default function ChatScreen({ route }) {
//   const { chatInfo } = route.params;
//   const navigation = useNavigation();

//   const connect = useSocketStore((s) => s.connect);
//   const sendJson = useSocketStore((s) => s.sendJson);
//   const typingStatus = useSocketStore((s) => s.typingStatus);
//   const loadMessages = useMessageStore((s) => s.loadMessages);

//   const chatKey = useMemo(() => `${chatInfo.chatId}-${chatInfo.chatType}`, [chatInfo.chatId, chatInfo.chatType]);
//   const isGroup = useMemo(() => chatInfo.chatType === "group", [chatInfo.chatType]);
//   const emptyArrRef = useRef([]);
//   const messagesFromStore = useMessageStore((state) => state.messagesByChatId?.[chatKey]);
//   const messages = messagesFromStore ?? emptyArrRef.current;

//   const [input, setInput] = useState("");
//   const [replyTo, setReplyTo] = useState(null);
//   const [myUserId, setMyUserId] = useState(null);
//   const [showMembers, setShowMembers] = useState(false);
//   const [pendingLocation, setPendingLocation] = useState(null);
//   const flatListRef = useRef(null);
//   const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
//   const connectedChatRef = useRef(null);

//   const [pendingMedia, setPendingMedia] = useState([]);
//   const [pendingDocs, setPendingDocs] = useState([]);

//   useEffect(() => {
//     AsyncStorage.getItem("userId")
//       .then((id) => {
//         if (id) setMyUserId(parseInt(id, 10));
//       })
//       .catch((e) => console.log("AsyncStorage error", e));
//   }, []);

//   useEffect(() => {
//     if (!chatInfo?.chatId) return;
//     const targetKey = chatKey;
//     if (connectedChatRef.current === targetKey) return;
//     connectedChatRef.current = targetKey;
//     try {
//       connect({ chatId: chatInfo.chatId, chatType: chatInfo.chatType });
//     } catch (e) {
//       console.log("connect error", e);
//     }
//     return () => {
//       if (connectedChatRef.current === targetKey) connectedChatRef.current = null;
//     };
//   }, [chatInfo.chatId, chatInfo.chatType, chatKey, connect]);

//   useEffect(() => {
//     let cancelled = false;
//     const fetchHistory = async () => {
//       try {
//         let res;
//         if (isGroup) {
//           res = await axiosInstance.get(`/chat/messages/group/${chatInfo.chatId}/`);
//         } else {
//           res = await axiosInstance.get(`/chat/messages/personal/${chatInfo.chatId}/`);
//         }
//         if (!cancelled) {
//           if (Array.isArray(res.data)) {
//             loadMessages(chatKey, res.data);
//           } else {
//             console.log("fetchHistory: unexpected data", res.data);
//           }
//         }
//       } catch (err) {
//         console.log("fetchHistory error", err);
//       }
//     };
//     if (chatInfo?.chatId) fetchHistory();
//     return () => {
//       cancelled = true;
//     };
//   }, [chatKey, chatInfo.chatId, isGroup, loadMessages]);

//   useEffect(() => {
//     if (!flatListRef.current) return;
//     try {
//       flatListRef.current.scrollToEnd({ animated: true });
//     } catch (e) {}
//   }, [messages.length]);

//   const sendTypingRef = useRef(null);
//   useEffect(() => {
//     sendTypingRef.current = debounce((isTyping) => {
//       try {
//         sendJson({
//           type: "typing",
//           is_typing: !!isTyping,
//           group_id: isGroup ? chatInfo.chatId : null,
//           receiver_id: !isGroup ? chatInfo.chatId : null,
//         });
//       } catch (e) {
//         console.log("sendTyping error", e);
//       }
//     }, 400);
//     return () => {
//       sendTypingRef.current?.cancel?.();
//       sendTypingRef.current = null;
//     };
//   }, [isGroup, chatInfo.chatId, sendJson]);

//   useEffect(() => {
//     const isTyping = input.trim().length > 0;
//     sendTypingRef.current?.(isTyping);
//   }, [input]);

//   const toArray = useCallback((x) => {
//     if (!x) return [];
//     return Array.isArray(x) ? x : [x];
//   }, []);

//   const handleMediaChosen = useCallback(
//     (assets) => {
//       const arr = Array.isArray(assets) ? assets : assets ? [assets] : [];
//       setPendingMedia(arr);
//       setShowAttachmentMenu(false);
//     },
//     []
//   );

//   const handleDocsChosen = useCallback((docs) => {
//     const arr = Array.isArray(docs) ? docs : docs ? [docs] : [];
//     setPendingDocs(arr);
//     setShowAttachmentMenu(false);
//   }, []);

//   const handleLocationChosen = useCallback(
//     (loc) => {
//       if (!loc?.latitude || !loc?.longitude) return;
//       setPendingLocation({ latitude: Number(loc.latitude), longitude: Number(loc.longitude) });
//       setShowAttachmentMenu(false);
//     },
//     []
//   );

//   const uploadAndSendAttachments = useCallback(
//     async (items, caption = "") => {
//       try {
//         const list = Array.isArray(items) ? items : [];
//         if (list.length === 0) {
//           console.log("uploadAndSendAttachments: no items to send");
//           return false;
//         }

//         console.log("uploadAndSendAttachments: encoding items count=", list.length);

//         const normalized = list
//           .map((it, idx) => {
//             if (!it) return null;
//             if (it.uri) return { uri: it.uri, name: it.name || it.fileName || `file_${Date.now()}_${idx}`, type: it.type || "application/octet-stream" };
//             return { uri: String(it), name: `file_${Date.now()}_${idx}`, type: "application/octet-stream" };
//           })
//           .filter(Boolean);

//         const ups = [];
//         for (const f of normalized) {
//           const u = await uploadFileBlob(f);
//           ups.push(u);
//           if (!u.success) {
//             console.log("uploadAndSendAttachments: upload failed for", f, u);
//             Alert.alert("Upload failed", `Could not upload ${f.name}`);
//             return false;
//           }
//         }

//         const attachments = ups.map((u, i) => ({
//           file_url: u.fileUrl,
//           file_type: normalized[i].type,
//           file_name: normalized[i].name,
//         }));

//         const payload = {
//           type: "send_message",
//           message_type: "file",
//           content: caption || attachments.map((a) => a.file_name).join(", "),
//           group_id: isGroup ? chatInfo.chatId : null,
//           receiver_id: !isGroup ? chatInfo.chatId : null,
//           parent_id: replyTo?.id || null,
//           latitude: null,
//           longitude: null,
//           files: [],
//           attachments,
//         };

//         console.log("uploadAndSendAttachments -> sending websocket payload with attachments:", attachments);
//         sendJson(payload);
//         return true;
//       } catch (e) {
//         console.log("uploadAndSendAttachments error (blob flow)", e);
//         Alert.alert("Send failed", "Could not send attachments via websocket.");
//         return false;
//       }
//     },
//     [isGroup, chatInfo?.chatId, replyTo, sendJson]
//   );

//   const sendMessage = useCallback(async () => {
//     try {
//       const pMedia = toArray(pendingMedia);
//       const pDocs = toArray(pendingDocs);
//       const all = pMedia.concat(pDocs);

//       console.log("sendMessage -> pendingMedia:", pMedia.length, "pendingDocs:", pDocs.length, "combined:", all.length);

//       if (all.length > 0) {
//         const ok = await uploadAndSendAttachments(all, input.trim());
//         if (ok) {
//           setInput("");
//           setReplyTo(null);
//           setPendingMedia([]);
//           setPendingDocs([]);
//         } else {
//           console.warn("sendMessage: uploadAndSendAttachments returned false");
//         }
//         return;
//       }

//       if (pendingLocation) {
//         const payload = {
//           type: "send_message",
//           message_type: "location",
//           content: input.trim() || "Shared location",
//           group_id: isGroup ? chatInfo.chatId : null,
//           receiver_id: !isGroup ? chatInfo.chatId : null,
//           parent_id: replyTo?.id || null,
//           latitude: Number(pendingLocation.latitude),
//           longitude: Number(pendingLocation.longitude),
//           files: [],
//         };
//         console.log("sendMessage -> sending location payload", payload);
//         try {
//           sendJson(payload);
//           setInput("");
//           setReplyTo(null);
//           setPendingLocation(null);
//         } catch (e) {
//           console.error("sendMessage -> sendJson location error", e);
//           Alert.alert("Send failed", "Could not send location.");
//         }
//         return;
//       }

//       if (!input.trim()) {
//         console.log("sendMessage -> nothing to send (empty input)");
//         return;
//       }

//       const textPayload = {
//         type: "send_message",
//         content: input.trim(),
//         group_id: isGroup ? chatInfo.chatId : null,
//         receiver_id: !isGroup ? chatInfo.chatId : null,
//         parent_id: replyTo?.id || null,
//       };
//       console.log("sendMessage -> sending text payload", textPayload);
//       try {
//         sendJson(textPayload);
//         setInput("");
//         setReplyTo(null);
//       } catch (e) {
//         console.error("sendMessage -> sendJson text error", e);
//         Alert.alert("Send failed", "Could not send message.");
//       }
//     } catch (err) {
//       console.error("sendMessage unexpected error", err);
//       Alert.alert("Error", "Something went wrong while sending message.");
//     }
//   }, [
//     input,
//     pendingMedia,
//     pendingDocs,
//     pendingLocation,
//     isGroup,
//     chatInfo.chatId,
//     replyTo,
//     sendJson,
//     uploadAndSendAttachments,
//     toArray,
//   ]);

//   const renderMessage = ({ item }) => {
//     const isMe = item.sender === myUserId;
//     return <ChatBubble msg={item} isMe={isMe} styles={styles} />;
//   };

//   const openMaps = (lat, lon) => {
//     const latlng = `${lat},${lon}`;
//     const geoUrl = Platform.select({ ios: `maps:0,0?q=${latlng}`, android: `geo:0,0?q=${latlng}` });
//     const webUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
//     Linking.canOpenURL(geoUrl)
//       .then((supported) => (supported ? Linking.openURL(geoUrl) : Linking.openURL(webUrl)))
//       .catch((err) => {
//         console.log("openMaps error", err);
//         Linking.openURL(webUrl).catch(() => {});
//       });
//   };

//   useEffect(() => {
//     AsyncStorage.getItem("userId")
//       .then((id) => {
//         if (id) setMyUserId(parseInt(id, 10));
//       })
//       .catch((e) => console.log("AsyncStorage error", e));
//   }, []);

//   return (
//     <ImageBackground source={require("../../images/123.png")} style={{ flex: 1 }} resizeMode="cover">
//       <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.1)" }} />

//       <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={80}>
//         <View style={styles.header}>
//           <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 10 }}>
//             <Ionicons name="arrow-back" size={26} color="#377355" />
//           </TouchableOpacity>

//           <Text style={styles.headerTitle}>{chatInfo.chatName}</Text>

//           {isGroup && (
//             <View style={styles.headerRight}>
//               <Text style={styles.groupInfoText}>Group Info</Text>
//               <TouchableOpacity onPress={() => setShowMembers(true)}>
//                 <Ionicons name="people-circle" size={28} color="#333" />
//               </TouchableOpacity>
//             </View>
//           )}
//         </View>

//         <TypingIndicator typingUsers={typingStatus} currentUser={myUserId?.toString()} />

//         <FlatList ref={flatListRef} data={messages} keyExtractor={(item, index) => `${item.id ?? "idx-" + index}`} renderItem={renderMessage} contentContainerStyle={{ padding: 10 }} />

//         {pendingMedia && pendingMedia.length > 0 && (
//           <View style={styles.previewBox}>
//             <ScrollView horizontal>
//               {pendingMedia.map((m, i) => (
//                 <View key={i} style={{ marginRight: 8, alignItems: "center" }}>
//                   {(m.type || "").startsWith("image/") ? (
//                     <Image source={{ uri: m.uri }} style={{ width: 70, height: 70, borderRadius: 8 }} />
//                   ) : (m.type || "").startsWith("video/") ? (
//                     <View style={{ width: 70, height: 70, borderRadius: 8, backgroundColor: "#222", alignItems: "center", justifyContent: "center" }}>
//                       <Feather name="video" size={24} color="#fff" />
//                     </View>
//                   ) : (
//                     <View style={{ width: 70, height: 70, borderRadius: 8, backgroundColor: "#999", alignItems: "center", justifyContent: "center" }}>
//                       <Feather name="file-text" size={24} color="#fff" />
//                     </View>
//                   )}
//                   <Text numberOfLines={1} style={{ maxWidth: 70, fontSize: 11 }}>{m.name}</Text>
//                 </View>
//               ))}
//             </ScrollView>
//           </View>
//         )}

//         {pendingDocs && pendingDocs.length > 0 && (
//           <View style={styles.previewBox}>
//             <ScrollView horizontal>
//               {pendingDocs.map((d, i) => (
//                 <View key={i} style={{ marginRight: 8, alignItems: "center", width: 140 }}>
//                   <Feather name="file" size={36} color="#333" />
//                   <Text numberOfLines={1} style={{ maxWidth: 120, fontSize: 12 }}>{d.name}</Text>
//                 </View>
//               ))}
//             </ScrollView>
//           </View>
//         )}

//         {pendingLocation && (
//           <View style={styles.pendingLocationBox}>
//             <TouchableOpacity onPress={() => openMaps(pendingLocation.latitude, pendingLocation.longitude)} style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
//               <Image
//                 source={{
//                   uri: `https://static-maps.yandex.ru/1.x/?ll=${pendingLocation.longitude},${pendingLocation.latitude}&size=450,200&z=15&l=map&pt=${pendingLocation.longitude},${pendingLocation.latitude},pm2rdm`,
//                 }}
//                 style={styles.pendingLocationImage}
//                 resizeMode="cover"
//               />
//               <View style={{ marginLeft: 8, flex: 1 }}>
//                 <Text numberOfLines={1} style={{ fontWeight: "700" }}>
//                   Location selected
//                 </Text>
//                 <Text style={{ color: "#666", marginTop: 2 }}>
//                   {pendingLocation.latitude.toFixed(5)}, {pendingLocation.longitude.toFixed(5)}
//                 </Text>
//               </View>
//             </TouchableOpacity>

//             <TouchableOpacity onPress={() => setPendingLocation(null)} style={styles.removeLocationBtn}>
//               <Feather name="x" size={18} color="#fff" />
//             </TouchableOpacity>
//           </View>
//         )}

//         <FloatingAttachmentMenu
//           show={showAttachmentMenu}
//           toggle={() => setShowAttachmentMenu((s) => !s)}
//           bottomOffset={Platform.select({ ios: 130, android: 110 })}
//           dropDistance={70}
//           chatId={chatInfo.chatId}
//           chatType={chatInfo.chatType}
//           onImagePress={handleMediaChosen}
//           onDocPress={handleDocsChosen}
//           onLocationPress={handleLocationChosen}
//         />

//         <View style={styles.inputRow}>
//           <TouchableOpacity style={{ marginRight: 8 }} onPress={() => setShowAttachmentMenu((s) => !s)}>
//             <MaterialCommunityIcons name="dots-grid" size={30} color="#377355" />
//           </TouchableOpacity>

//           <TextInput
//             style={styles.input}
//             value={input}
//             onChangeText={(text) => setInput(text)}
//             placeholder={pendingLocation ? "Add a caption..." : "Type a message..."}
//             onSubmitEditing={() => sendMessage()}
//             returnKeyType="send"
//             multiline
//           />
//           <TouchableOpacity onPress={() => sendMessage()}>
//             <Ionicons name="send" size={24} color="#377355" />
//           </TouchableOpacity>
//         </View>
//       </KeyboardAvoidingView>

//       <Modal visible={showMembers} animationType="slide" transparent>
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalContent}>
//             <Text style={styles.modalTitle}>{chatInfo.members?.length || 0} Members</Text>
//             <ScrollView>
//               {chatInfo.members?.map((m, idx) => (
//                 <View key={idx} style={styles.memberRow}>
//                   <Image source={{ uri: m.profile_image || "https://cdn-icons-png.flaticon.com/512/149/149071.png" }} style={styles.memberAvatar} />
//                   <Text style={styles.memberName}>{m.username || `User ${m.id}`}</Text>
//                 </View>
//               ))}
//             </ScrollView>
//             <TouchableOpacity style={styles.closeBtn} onPress={() => setShowMembers(false)}>
//               <Text style={{ color: "#fff", fontWeight: "600" }}>Close</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>
//     </ImageBackground>
//   );
// }

// /* ----------------- Styles (merged) ----------------- */

// const styles = StyleSheet.create({
//   header: {
//     paddingHorizontal: 12,
//     paddingVertical: 10,
//     borderBottomWidth: 1,
//     borderColor: "#ddd",
//     backgroundColor: "#FFF",
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//   },
//   headerTitle: {
//     fontSize: 18,
//     fontWeight: "bold",
//     flex: 1,
//   },
//   headerRight: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 6,
//   },
//   groupInfoText: {
//     fontSize: 14,
//     color: "#555",
//     marginRight: 5,
//   },
//   msgContainer: {
//     marginVertical: 6,
//     maxWidth: "80%",
//   },
//   msgBubble: {
//     padding: 12,
//     borderRadius: 10,
//   },
//   msgText: {
//     fontSize: 16,
//     color: "#000",
//   },
//   inputRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     padding: 8,
//     backgroundColor: "#fff",
//     borderTopColor: "#000",
//     borderTopWidth: 1,
//   },
//   input: {
//     flex: 1,
//     borderWidth: 1,
//     borderColor: "#000",
//     borderRadius: 10,
//     paddingHorizontal: 15,
//     paddingVertical: 10,
//     marginRight: 8,
//     maxHeight: 120,
//   },
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: "rgba(0,0,0,0.5)",
//     justifyContent: "flex-end",
//   },
//   modalContent: {
//     backgroundColor: "#fff",
//     borderTopLeftRadius: 15,
//     borderTopRightRadius: 15,
//     maxHeight: "70%",
//     padding: 15,
//   },
//   modalTitle: {
//     fontSize: 18,
//     fontWeight: "bold",
//     marginBottom: 12,
//   },
//   memberRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingVertical: 8,
//     borderBottomWidth: 1,
//     borderBottomColor: "#eee",
//   },
//   memberAvatar: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     marginRight: 12,
//   },
//   memberName: {
//     fontSize: 16,
//     color: "#333",
//   },
//   closeBtn: {
//     backgroundColor: "#377355",
//     padding: 12,
//     borderRadius: 8,
//     alignItems: "center",
//     marginTop: 10,
//   },
//   wrapper: { position: "absolute", left: 6, zIndex: 9999 },
//   container: {
//     width: 50,
//     height: 50,
//     borderRadius: 25,
//     backgroundColor: "#10B981",
//     alignItems: "center",
//     justifyContent: "center",
//     overflow: "visible",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 3 },
//     shadowOpacity: 0.2,
//     shadowRadius: 4,
//     elevation: 6,
//   },
//   pinBase: { position: "absolute", width: 30, height: 30, borderRadius: 15, backgroundColor: "#333849", alignItems: "center", justifyContent: "center" },
//   pinTouchable: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
//   previewBox: { marginTop: 8, backgroundColor: "#fff", borderRadius: 12, padding: 8, width: "96%", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 4 },
//   previewInner: { flexDirection: "row", alignItems: "center" },
//   previewImage: { width: 48, height: 48, borderRadius: 6, backgroundColor: "#eee" },
//   previewTitle: { fontSize: 14, fontWeight: "600", color: "#222" },
//   previewSmall: { fontSize: 12, color: "#666", marginTop: 2 },
//   sendBtn: { backgroundColor: "#377355", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignItems: "center", justifyContent: "center" },
//   sendText: { color: "#fff", fontWeight: "600" },
//   pendingLocationBox: {
//     margin: 10,
//     backgroundColor: "#fff",
//     borderRadius: 12,
//     padding: 8,
//     flexDirection: "row",
//     alignItems: "center",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.12,
//     shadowRadius: 4,
//     elevation: 4,
//   },
//   pendingLocationImage: { width: 96, height: 64, borderRadius: 8, backgroundColor: "#ddd" },
//   removeLocationBtn: { backgroundColor: "#cf2520ff", padding: 8, borderRadius: 8, marginLeft: 8, alignItems: "center", justifyContent: "center" },
// });







// import React, { useEffect, useState, useCallback, useRef } from "react";
// import {
//   View,
//   TextInput,
//   TouchableOpacity,
//   FlatList,
//   Text,
//   StyleSheet,
//   ImageBackground,
//   Modal,
//   ScrollView,
//   Image,
//   KeyboardAvoidingView
// } from "react-native";
// import Ionicons from "react-native-vector-icons/Ionicons";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { useMessageStore } from "../stores/messageStore";
// import { useSocketStore } from "../stores/socketStore";
// import axiosInstance from "../../TokenHandling/axiosInstance";
// import TypingIndicator from "../components/TypingIndicator";
// import ChatBubble from "../components/ChatBubble";
// import { useNavigation } from "@react-navigation/native";

// export default function ChatScreen({ route }) {
//   const { chatInfo } = route.params;
//   const { sendJson, typingStatus, connect } = useSocketStore();
//   const { messagesByChatId, loadMessages } = useMessageStore();
//   const navigation = useNavigation();

//   const [input, setInput] = useState("");
//   const [replyTo, setReplyTo] = useState(null);
//   const [myUserId, setMyUserId] = useState(null);
//   const [showMembers, setShowMembers] = useState(false);
//   const flatListRef = useRef(null);

//   const chatKey = `${chatInfo.chatId}-${chatInfo.chatType}`;
  
//   const messages = useMessageStore(
//   (state) => state.messagesByChatId[chatKey] || []
// );


//   useEffect(() => {
//     console.log("ChatScreen chatInfo:", chatInfo);
//   }, [chatInfo]);


//   useEffect(() => {
//     AsyncStorage.getItem("userId").then((id) => {
//       if (id) setMyUserId(parseInt(id, 10));
//     });
//   }, []);

//   useEffect(() => {
//     connect(chatInfo);
//   }, [chatInfo]);

//   useEffect(() => {
//     const fetchHistory = async () => {
//       try {
//         let res;
//         if (chatInfo.chatType === "group") {
//           res = await axiosInstance.get(`/chat/messages/group/${chatInfo.chatId}/`);
//         } else {
//           res = await axiosInstance.get(`/chat/messages/personal/${chatInfo.chatId}/`);
//         }
//         loadMessages(chatKey, res.data);
//       } catch (err) {
//         console.log("fetchHistory error", err);
//       }
//     };
//     fetchHistory();
//   }, [chatInfo.chatId]);

//   useEffect(() => {
//     flatListRef.current?.scrollToEnd({ animated: true });
//   }, [messages]);

//   const handleTyping = useCallback(() => {
//     sendJson({
//       type: "typing",
//       is_typing: input.trim().length > 0,
//       group_id: chatInfo.chatType === "group" ? chatInfo.chatId : null,
//       receiver_id: chatInfo.chatType === "personal" ? chatInfo.chatId : null,
//     });
//   }, [input, chatInfo]);

//   const sendMessage = useCallback(() => {
//     if (!input.trim()) return;
//     const payload = {
//       type: "send_message",
//       content: input.trim(),
//       group_id: chatInfo.chatType === "group" ? chatInfo.chatId : null,
//       receiver_id: chatInfo.chatType === "personal" ? chatInfo.chatId : null,
//       parent_id: replyTo?.id || null,
//     };
//     sendJson(payload);
//     setInput("");
//     setReplyTo(null);
//   }, [input, chatInfo, replyTo]);

//   const renderMessage = ({ item }) => {
//     const isMe = item.sender === myUserId;
//     return <ChatBubble msg={item} isMe={isMe} styles={styles} />;
//   };

//   return (
//     <ImageBackground
//       source={require("../../images/123.png")}
//       style={{ flex: 1 }}
//       resizeMode="cover"
//     >
//       <View
//         style={{
//           ...StyleSheet.absoluteFillObject,
//           backgroundColor: "rgba(0,0,0,0.1)",
//         }}
//       />

//         {/* ✅ KeyboardAvoidingView Wrap */}
//   <KeyboardAvoidingView
//     style={{ flex: 1 }}
//     behavior={Platform.OS === "ios" ? "padding" : "height"}
//     keyboardVerticalOffset={80} // header ki height jitna offset
//   >

//       {/* ✅ Custom Header */}
//       <View style={styles.header}>
//         {/* Back Button */}
//         <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 10 }}>
//           <Ionicons name="arrow-back" size={26} color="#377355" />
//         </TouchableOpacity>

//         {/* Chat Name */}
//         <Text style={styles.headerTitle}>{chatInfo.chatName}</Text>

//         {/* Right side (only for group) */}
//         {chatInfo.chatType === "group" && (
//           <View style={styles.headerRight}>
//             <Text style={styles.groupInfoText}>Group Info</Text>
//             <TouchableOpacity onPress={() => setShowMembers(true)}>
//               <Ionicons name="people-circle" size={28} color="#333" />
//             </TouchableOpacity>
//           </View>
//         )}
//       </View>

//       {/* 👇 Typing Indicator */}
//       <TypingIndicator typingUsers={typingStatus} currentUser={myUserId?.toString()} />

//       <FlatList
//         ref={flatListRef}
//         data={messages}
//         keyExtractor={(item, index) => `${item.id}-${index}`}
//         renderItem={renderMessage}
//         contentContainerStyle={{ padding: 10 }}
//       />

//       <View style={styles.inputRow}>
//         <TextInput
//           style={styles.input}
//           value={input}
//           onChangeText={(text) => {
//             setInput(text);
//             handleTyping();
//           }}
//           placeholder="Type a message..."
//           onSubmitEditing={sendMessage}
//           returnKeyType="send"
//         />
//         <TouchableOpacity onPress={sendMessage}>
//           <Ionicons name="send" size={24} color="#377355" />
//         </TouchableOpacity>
//       </View>
//       </KeyboardAvoidingView>

//       {/* ✅ Members Modal */}
//       <Modal visible={showMembers} animationType="slide" transparent>
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalContent}>
//             <Text style={styles.modalTitle}>{chatInfo.members?.length || 0} Members</Text>
//             <ScrollView>
//               {chatInfo.members?.map((m, idx) => (
//                 <View key={idx} style={styles.memberRow}>
//                   <Image
//                     source={{ uri: m.profile_image || "https://cdn-icons-png.flaticon.com/512/149/149071.png" }}
//                     style={styles.memberAvatar}
//                   />
//                   <Text style={styles.memberName}>{m.username || `User ${m.id}`}</Text>
//                 </View>
//               ))}
//             </ScrollView>
//             <TouchableOpacity style={styles.closeBtn} onPress={() => setShowMembers(false)}>
//               <Text style={{ color: "#fff", fontWeight: "600" }}>Close</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>
//     </ImageBackground>
//   );
// }

// const styles = StyleSheet.create({
//   header: {
//     paddingHorizontal: 12,
//     paddingVertical: 10,
//     borderBottomWidth: 1,
//     borderColor: "#ddd",
//     backgroundColor: "#FFF",
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//   },
//   headerTitle: {
//     fontSize: 18,
//     fontWeight: "bold",
//     flex: 1,
//   },
//   headerRight: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 6,
//   },
//   groupInfoText: {
//     fontSize: 14,
//     color: "#555",
//     marginRight: 5,
//   },
//   msgContainer: {
//     marginVertical: 6,
//     maxWidth: "80%",
//   },
//   msgBubble: {
//     padding: 12,
//     borderRadius: 10,
//   },
//   msgText: {
//     fontSize: 16,
//     color: "#000",
//   },
//   inputRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     padding: 8,
//     backgroundColor: "#fff",
//     borderTopColor: "#000",
//     borderTopWidth: 1
//   },
//   input: {
//     flex: 1,
//     borderWidth: 1,
//     borderColor: "#000",
//     borderRadius: 10,
//     paddingHorizontal: 15,
//     paddingVertical: 10,
//     marginRight: 8,
//   },
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: "rgba(0,0,0,0.5)",
//     justifyContent: "flex-end",
//   },
//   modalContent: {
//     backgroundColor: "#fff",
//     borderTopLeftRadius: 15,
//     borderTopRightRadius: 15,
//     maxHeight: "70%",
//     padding: 15,
//   },
//   modalTitle: {
//     fontSize: 18,
//     fontWeight: "bold",
//     marginBottom: 12,
//   },
//   memberRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingVertical: 8,
//     borderBottomWidth: 1,
//     borderBottomColor: "#eee",
//   },
//   memberAvatar: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     marginRight: 12,
//   },
//   memberName: {
//     fontSize: 16,
//     color: "#333",
//   },
//   closeBtn: {
//     backgroundColor: "#377355",
//     padding: 12,
//     borderRadius: 8,
//     alignItems: "center",
//     marginTop: 10,
//   },
// });
