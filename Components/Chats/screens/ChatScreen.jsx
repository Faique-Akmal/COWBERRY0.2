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
  Keyboard,
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
import { Video as VideoCompressor } from "react-native-compressor";
import DotLoader from "./DotLoader";

const UPLOAD_PATH = "/upload/";
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

  const internalImageHandler = useCallback(async () => {
    try {
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
      if (typeof onImagePressProp === "function") {
        try {
          onImagePressProp(assets);
        } catch (e) {
          console.log("onImagePressProp error", e);
        }
        return;
      }
      setSelectedMedia((prev) => [...prev, ...assets]);
    } catch (e) {
      console.log("internalImageHandler error:", e);
      Alert.alert("Image error", "Could not open gallery.");
    }
  }, [onImagePressProp]);

  const internalDocHandler = useCallback(async () => {
    try {
      const res = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
        allowMultiSelection: true,
      });
      const filesArray = Array.isArray(res) ? res : [res];
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
      if (DocumentPicker.isCancel(err)) return;
      console.log("internalDocHandler error", err);
      Alert.alert("Document error", "Could not pick document.");
    }
  }, [onDocPressProp]);

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

  const handleImage = internalImageHandler;
  const handleDoc = internalDocHandler;
  const handleLocation = internalLocationHandler;
  const handleTheme = onThemePressProp ?? (() => toggle());

  const removeSelectedMedia = useCallback((index) => {
    setSelectedMedia((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const removeSelectedDoc = useCallback((index) => {
    setSelectedDocs((prev) => prev.filter((_, i) => i !== index));
  }, []);

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

      {selectedMedia.length > 0 && (
        <View style={styles.previewBox}>
          <ScrollView horizontal>
            {selectedMedia.map((m, i) => (
              <View key={i} style={{ marginRight: 8, alignItems: "center", position: "relative" }}>
                {m.type && m.type.startsWith("image/") ? (
                  <Image source={{ uri: m.uri }} style={{ width: 70, height: 70, borderRadius: 8 }} />
                ) : (
                  <View style={{ width: 70, height: 70, borderRadius: 8, backgroundColor: "#222", alignItems: "center", justifyContent: "center" }}>
                    <Feather name="video" size={24} color="#fff" />
                  </View>
                )}
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => removeSelectedMedia(i)}
                  accessibilityLabel={`Remove ${m.name}`}
                >
                  <Feather name="x" size={16} color="#fff" />
                </TouchableOpacity>
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
              <View key={i} style={{ marginRight: 8, alignItems: "center", width: 140, position: "relative" }}>
                <Feather name="file" size={36} color="#333" />
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => removeSelectedDoc(i)}
                  accessibilityLabel={`Remove ${d.name}`}
                >
                  <Feather name="x" size={16} color="#fff" />
                </TouchableOpacity>
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
  const [pendingLocation, setPendingLocation] = useState(null);
  const flatListRef = useRef(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const connectedChatRef = useRef(null);
  const [pendingMedia, setPendingMedia] = useState([]);
  const [pendingDocs, setPendingDocs] = useState([]);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const sendTypingRef = useRef(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem("userId")
      .then((id) => {
        if (id) setMyUserId(parseInt(id, 10));
      })
      .catch((e) => console.log("AsyncStorage error", e));
  }, []);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (event) => {
        setKeyboardHeight(event.endCoordinates.height);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
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
      setIsLoadingMessages(true);
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
      } finally {
        if (!cancelled) {
          setIsLoadingMessages(false);
        }
      }
    };
    if (chatInfo?.chatId) fetchHistory();
    return () => {
      cancelled = true;
    };
  }, [chatKey, chatInfo.chatId, isGroup, loadMessages]);

  const scrollToBottom = useCallback((animated = true) => {
    if (!flatListRef.current) {
      console.warn("scrollToBottom: flatListRef is null, skipping scroll");
      return;
    }
    if (messages.length === 0) return;
    try {
      flatListRef.current.scrollToIndex({ index: 0, animated });
    } catch (e) {
      console.error("scrollToBottom error:", e);
    }
  }, [messages.length]);

  useEffect(() => {
    if (messages.length === 0 || isLoadingMessages) return;
    const timer = setTimeout(() => {
      if (flatListRef.current) {
        scrollToBottom(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [isLoadingMessages]);

  useEffect(() => {
    if (isLoadingMessages) return;
    const timer = setTimeout(() => {
      if (flatListRef.current && isAtBottom) {
        scrollToBottom(true);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [pendingMedia, pendingDocs, pendingLocation, scrollToBottom, isLoadingMessages, isAtBottom]);

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

  const toArray = useCallback((x) => {
    if (!x) return [];
    return Array.isArray(x) ? x : [x];
  }, []);

  const handleMediaChosen = useCallback(
    (assets) => {
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

  const compressVideoIfNeeded = useCallback(async (uri, name, providedSize = null) => {
    try {
      if (providedSize && providedSize <= MAX_VIDEO_BYTES) {
        return { ok: true, uri, size: providedSize };
      }
      console.log("compressVideoIfNeeded -> compressing", uri, name);
      const compressed = await VideoCompressor.compress(uri, { compressionMethod: "auto" });
      if (!compressed) {
        console.log("compressVideoIfNeeded -> compressor returned falsy");
        return { ok: false, error: "compressor-failed" };
      }
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
          if ((f.type || "").startsWith("video/")) {
            const res = await compressVideoIfNeeded(f.uri, f.name, f.size);
            if (!res.ok) {
              Alert.alert("Video error", `Could not compress ${f.name}.`);
              return false;
            }
            f.uri = res.uri;
            f.size = res.size;
            f.type = "video/mp4";
            if (!f.name.endsWith(".mp4")) f.name = `${f.name.split(".")[0] || "video"}.mp4`;
          }

          if (f.size && f.size > BASE64_SAFE_LIMIT_BYTES) {
            Alert.alert("File too large", `${f.name} is too large to send.`);
            return false;
          }

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

  const sendMessage = useCallback(async () => {
    try {
      const pMedia = toArray(pendingMedia);
      const pDocs = toArray(pendingDocs);
      const all = pMedia.concat(pDocs);

      console.log("sendMessage -> pendingMedia:", pMedia.length, "pendingDocs:", pDocs.length, "combined:", all.length);

      if (all.length > 0) {
        const ok = await uploadAndSendAttachments(all, input.trim());
        if (ok) {
          setInput("");
          setReplyTo(null);
          setPendingMedia([]);
          setPendingDocs([]);
          if (isAtBottom) {
            scrollToBottom(true);
          }
        } else {
          console.warn("sendMessage: uploadAndSendAttachments returned false");
        }
        return;
      }

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
          setInput("");
          setReplyTo(null);
          setPendingLocation(null);
          if (isAtBottom) {
            scrollToBottom(true);
          }
        } catch (e) {
          console.error("sendMessage -> sendJson location error", e);
          Alert.alert("Send failed", "Could not send location.");
        }
        return;
      }

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
        if (isAtBottom) {
          scrollToBottom(true);
        }
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
    scrollToBottom,
    isAtBottom,
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

  const removePendingMedia = useCallback((index) => {
    setPendingMedia((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const removePendingDoc = useCallback((index) => {
    setPendingDocs((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const renderLoading = () => <DotLoader />;

  const baseBottomOffset = Platform.select({ ios: 130, android: 110 });
  const keyboardOffset = Platform.select({ ios: 43, android: 0 });

  return (
    <ImageBackground source={require("../../images/123.png")} style={{ flex: 1 }} resizeMode="cover">
      <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.1)" }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={keyboardOffset}
      >
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

        {isLoadingMessages ? (
          renderLoading()
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages.slice().reverse()}
            keyExtractor={(item, index) => `${item.id ?? "idx-" + index}`}
            renderItem={renderMessage}
            contentContainerStyle={{ padding: 10, flexGrow: 1 }}
            inverted
            initialNumToRender={10}
            maxToRenderPerBatch={5}
            windowSize={10}
            removeClippedSubviews={true}
            updateCellsBatchingPeriod={50}
            initialScrollIndex={0}
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
              autoscrollThreshold: 100,
            }}
            onScroll={(event) => {
              const offset = event.nativeEvent.contentOffset.y;
              setIsAtBottom(offset <= 100);
            }}
            onContentSizeChange={() => {
              if (isAtBottom) {
                scrollToBottom(true);
              }
            }}
          />
        )}

        {pendingMedia && pendingMedia.length > 0 && (
          <View style={styles.previewBox}>
            <ScrollView horizontal>
              {pendingMedia.map((m, i) => (
                <View key={i} style={{ marginRight: 8, alignItems: "center", position: "relative" }}>
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
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removePendingMedia(i)}
                    accessibilityLabel={`Remove ${m.name}`}
                  >
                    <Feather name="x" size={16} color="#fff" />
                  </TouchableOpacity>
                  <Text numberOfLines={1} style={{ maxWidth: 70, fontSize: 11 }}>{m.name}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {pendingDocs && pendingDocs.length > 0 && (
          <View style={styles.previewBox}>
            <ScrollView horizontal>
              {pendingDocs.map((d, i) => (
                <View key={i} style={{ marginRight: 8, alignItems: "center", width: 140, position: "relative" }}>
                  <Feather name="file" size={36} color="#333" />
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removePendingDoc(i)}
                    accessibilityLabel={`Remove ${d.name}`}
                  >
                    <Feather name="x" size={16} color="#fff" />
                  </TouchableOpacity>
                  <Text numberOfLines={1} style={{ maxWidth: 120, fontSize: 12 }}>{d.name}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

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

        <FloatingAttachmentMenu
          show={showAttachmentMenu}
          toggle={() => setShowAttachmentMenu((s) => !s)}
          bottomOffset={baseBottomOffset + keyboardHeight}
          dropDistance={70}
          chatId={chatInfo.chatId}
          chatType={chatInfo.chatType}
          onImagePress={handleMediaChosen}
          onDocPress={handleDocsChosen}
          onLocationPress={handleLocationChosen}
        />
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
  removeBtn: {
    position: "absolute",
    top: 1,
    right: -1,
    backgroundColor: "rgba(184, 15, 15, 0.7)",
    borderRadius: 12,
    padding: 2,
    zIndex: 10,
  },
});





// 9dot and keyboard ke problem ko solve karne se pahle ka code aur isme sab thik hai

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
// import RNFS from "react-native-fs";
// import { Video as VideoCompressor } from "react-native-compressor";
// import AnimatedBubbleLoading from "./DotLoader";
// import DotLoader from "./DotLoader";

// const UPLOAD_PATH = "/upload/";
// const MAX_VIDEO_BYTES = 5 * 1024 * 1024; // 5 MB target
// const BASE64_SAFE_LIMIT_BYTES = 28 * 1024 * 1024; // safety cap (approx 28 MB base64)

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

//   const [selectedMedia, setSelectedMedia] = useState([]); // [{ uri, name, type }]
//   const [selectedDocs, setSelectedDocs] = useState([]); // [{ uri, name, type }]
//   const [selectedLocation, setSelectedLocation] = useState(null); // { latitude, longitude }

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

//   const internalImageHandler = useCallback(async () => {
//     try {
//       const res = await launchImageLibrary({ mediaType: "mixed", selectionLimit: 5 });
//       if (res.didCancel) return;
//       if (!res.assets || res.assets.length === 0) return;
//       const assets = res.assets.map((a) => ({
//         uri: a.uri,
//         name: a.fileName || `file_${Date.now()}`,
//         type: a.type || (a.uri?.endsWith(".mp4") ? "video/mp4" : "image/jpeg"),
//         size: a.fileSize || null,
//         duration: a.duration || null,
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

//   const internalDocHandler = useCallback(async () => {
//     try {
//       const res = await DocumentPicker.pick({
//         type: [DocumentPicker.types.allFiles],
//         allowMultiSelection: true,
//       });
//       const filesArray = Array.isArray(res) ? res : [res];
//       const docs = filesArray.map((d) => {
//         const uri = d.fileCopyUri || d.uri || null;
//         return {
//           uri,
//           name: d.name || `file_${Date.now()}`,
//           type: d.type || "application/octet-stream",
//           size: d.size || null,
//         };
//       });
//       if (!docs || docs.length === 0) return;
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
//       if (DocumentPicker.isCancel(err)) return;
//       console.log("internalDocHandler error", err);
//       Alert.alert("Document error", "Could not pick document.");
//     }
//   }, [onDocPressProp]);

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

//   const sendSelectedMedia = useCallback(
//     async (caption = "") => {
//       if (!selectedMedia || selectedMedia.length === 0) return;
//       Alert.alert("Info", "Please use main send button in chat after selecting files.");
//     },
//     [selectedMedia]
//   );

//   const sendSelectedDocs = useCallback(
//     async (caption = "") => {
//       if (!selectedDocs || selectedDocs.length === 0) return;
//       Alert.alert("Info", "Please use main send button in chat after selecting files.");
//     },
//     [selectedDocs]
//   );

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
//       console.log("sendSelectedLocation error", e);
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

//   // Handler to remove an item from selectedMedia
//   const removeSelectedMedia = useCallback((index) => {
//     setSelectedMedia((prev) => prev.filter((_, i) => i !== index));
//   }, []);

//   // Handler to remove an item from selectedDocs
//   const removeSelectedDoc = useCallback((index) => {
//     setSelectedDocs((prev) => prev.filter((_, i) => i !== index));
//   }, []);

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

//       {/* Previews for media/docs/location */}
//       {selectedMedia.length > 0 && (
//         <View style={styles.previewBox}>
//           <ScrollView horizontal>
//             {selectedMedia.map((m, i) => (
//               <View key={i} style={{ marginRight: 8, alignItems: "center", position: "relative" }}>
//                 {m.type && m.type.startsWith("image/") ? (
//                   <Image source={{ uri: m.uri }} style={{ width: 70, height: 70, borderRadius: 8 }} />
//                 ) : (
//                   <View style={{ width: 70, height: 70, borderRadius: 8, backgroundColor: "#222", alignItems: "center", justifyContent: "center" }}>
//                     <Feather name="video" size={24} color="#fff" />
//                   </View>
//                 )}
//                 <TouchableOpacity
//                   style={styles.removeBtn}
//                   onPress={() => removeSelectedMedia(i)}
//                   accessibilityLabel={`Remove ${m.name}`}
//                 >
//                   <Feather name="x" size={16} color="#fff" />
//                 </TouchableOpacity>
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
//               <View key={i} style={{ marginRight: 8, alignItems: "center", width: 140, position: "relative" }}>
//                 <Feather name="file" size={36} color="#333" />
//                 <TouchableOpacity
//                   style={styles.removeBtn}
//                   onPress={() => removeSelectedDoc(i)}
//                   accessibilityLabel={`Remove ${d.name}`}
//                 >
//                   <Feather name="x" size={16} color="#fff" />
//                 </TouchableOpacity>
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

//   // Track if at bottom for auto-scroll
//   const [isAtBottom, setIsAtBottom] = useState(true);
//   const sendTypingRef = useRef(null);

//   // Show loading state while messages are being fetched
//   const [isLoadingMessages, setIsLoadingMessages] = useState(true);

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
//       setIsLoadingMessages(true);
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
//       } finally {
//         if (!cancelled) {
//           setIsLoadingMessages(false);
//         }
//       }
//     };
//     if (chatInfo?.chatId) fetchHistory();
//     return () => {
//       cancelled = true;
//     };
//   }, [chatKey, chatInfo.chatId, isGroup, loadMessages]);

// // Function to safely scroll to bottom
// const scrollToBottom = useCallback((animated = true) => {
//   if (!flatListRef.current) {
//     console.warn("scrollToBottom: flatListRef is null, skipping scroll");
//     return;
//   }
//   if (messages.length === 0) return; // No need to scroll if no messages
//   try {
//     flatListRef.current.scrollToIndex({ index: 0, animated });
//   } catch (e) {
//     console.error("scrollToBottom error:", e);
//   }
// }, [messages.length]);

// // Scroll to bottom on initial render only
// useEffect(() => {
//   if (messages.length === 0 || isLoadingMessages) return;

//   const timer = setTimeout(() => {
//     if (flatListRef.current) {
//       scrollToBottom(false); // Non-animated for initial scroll
//     }
//   }, 300); // Keep the 300ms delay to allow FlatList to mount

//   return () => clearTimeout(timer);
// }, [isLoadingMessages]); // Depend only on isLoadingMessages to run once after loading

// // Scroll to bottom when pending media, docs, or location change (only if at bottom)
// useEffect(() => {
//   if (isLoadingMessages) return; // Skip if still loading
//   const timer = setTimeout(() => {
//     if (flatListRef.current && isAtBottom) {
//       scrollToBottom(true); // Animated for updates
//     }
//   }, 100);

//   return () => clearTimeout(timer);
// }, [pendingMedia, pendingDocs, pendingLocation, scrollToBottom, isLoadingMessages, isAtBottom]);

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

//   const compressVideoIfNeeded = useCallback(async (uri, name, providedSize = null) => {
//     try {
//       if (providedSize && providedSize <= MAX_VIDEO_BYTES) {
//         return { ok: true, uri, size: providedSize };
//       }
//       console.log("compressVideoIfNeeded -> compressing", uri, name);
//       const compressed = await VideoCompressor.compress(uri, { compressionMethod: "auto" });
//       if (!compressed) {
//         console.log("compressVideoIfNeeded -> compressor returned falsy");
//         return { ok: false, error: "compressor-failed" };
//       }
//       const path = compressed.startsWith("file://") ? compressed.replace("file://", "") : compressed;
//       const exists = await RNFS.exists(path);
//       if (!exists) {
//         console.log("compressVideoIfNeeded -> compressed file not found", path);
//         return { ok: false, error: "compressed-not-found" };
//       }
//       const stat = await RNFS.stat(path);
//       const newSize = Number(stat.size || 0);
//       console.log("compressVideoIfNeeded -> compressed size", newSize);
//       return { ok: true, uri: path.startsWith("/") ? `file://${path}` : `file://${path}`, size: newSize };
//     } catch (e) {
//       console.log("compressVideoIfNeeded error", e);
//       return { ok: false, error: e };
//     }
//   }, []);

//   const uploadAndSendAttachments = useCallback(
//     async (items, caption = "") => {
//       try {
//         const list = Array.isArray(items) ? items : [];
//         if (list.length === 0) {
//           console.log("uploadAndSendAttachments: no items to send");
//           return false;
//         }

//         const normalized = list
//           .map((it, idx) => {
//             if (!it) return null;
//             if (it.uri) return { uri: it.uri, name: it.name || it.fileName || `file_${Date.now()}_${idx}`, type: it.type || "application/octet-stream", size: it.size || null };
//             return { uri: String(it), name: `file_${Date.now()}_${idx}`, type: "application/octet-stream", size: null };
//           })
//           .filter(Boolean);

//         const filesBase64 = [];
//         const attachments = [];

//         for (const f of normalized) {
//           if ((f.type || "").startsWith("video/")) {
//             const res = await compressVideoIfNeeded(f.uri, f.name, f.size);
//             if (!res.ok) {
//               Alert.alert("Video error", `Could not compress ${f.name}.`);
//               return false;
//             }
//             f.uri = res.uri;
//             f.size = res.size;
//             f.type = "video/mp4";
//             if (!f.name.endsWith(".mp4")) f.name = `${f.name.split(".")[0] || "video"}.mp4`;
//           }

//           if (f.size && f.size > BASE64_SAFE_LIMIT_BYTES) {
//             Alert.alert("File too large", `${f.name} is too large to send.`);
//             return false;
//           }

//           const filePath = f.uri.startsWith("file://") ? f.uri.replace("file://", "") : f.uri;
//           let b64;
//           try {
//             b64 = await RNFS.readFile(filePath, "base64");
//           } catch (e) {
//             console.log("readFile failed", filePath, e);
//             Alert.alert("File read error", `Cannot read ${f.name}`);
//             return false;
//           }

//           if (!b64) {
//             Alert.alert("File error", `Empty file ${f.name}`);
//             return false;
//           }

//           const estimatedBytes = Math.round((b64.length * 3) / 4);
//           if ((f.type || "").startsWith("video/") && estimatedBytes > MAX_VIDEO_BYTES) {
//             Alert.alert("File too large", `${f.name} is larger than ${Math.round(MAX_VIDEO_BYTES / 1024 / 1024)} MB after compression.`);
//             return false;
//           }

//           filesBase64.push(`data:${f.type};base64,${b64}`);
//           attachments.push({ file_name: f.name, file_type: f.type, file_url: null });
//         }

//         const payload = {
//           type: "send_message",
//           message_type: "file",
//           content: caption || attachments.map((a) => a.file_name).join(", "),
//           group_id: isGroup ? chatInfo.chatId : null,
//           receiver_id: !isGroup ? chatInfo.chatId : null,
//           parent_id: replyTo?.id || null,
//           latitude: null,
//           longitude: null,
//           files: filesBase64,
//           attachments,
//         };

//         console.log("uploadAndSendAttachments -> sending payload", { count: filesBase64.length, attachments });
//         sendJson(payload);
//         return true;
//       } catch (e) {
//         console.log("uploadAndSendAttachments error", e);
//         Alert.alert("Send failed", "Could not send attachments.");
//         return false;
//       }
//     },
//     [isGroup, chatInfo?.chatId, replyTo, sendJson, compressVideoIfNeeded]
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
//           if (isAtBottom) {
//             scrollToBottom(true); // Scroll to bottom after sending attachments only if at bottom
//           }
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
//           if (isAtBottom) {
//             scrollToBottom(true); // Scroll to bottom after sending location only if at bottom
//           }
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
//         if (isAtBottom) {
//           scrollToBottom(true); // Scroll to bottom after sending text only if at bottom
//         }
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
//     scrollToBottom,
//     isAtBottom,
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

//   // Handler to remove an item from pendingMedia
//   const removePendingMedia = useCallback((index) => {
//     setPendingMedia((prev) => prev.filter((_, i) => i !== index));
//   }, []);

//   // Handler to remove an item from pendingDocs
//   const removePendingDoc = useCallback((index) => {
//     setPendingDocs((prev) => prev.filter((_, i) => i !== index));
//   }, []);

//   // Render loading indicator
// const renderLoading = () => (
//   <DotLoader />
// );

// // calculate offset
// const keyboardOffset = Platform.select({
//   ios: 43,
//   android: 0,
// });

//   return (
//     <ImageBackground source={require("../../images/123.png")} style={{ flex: 1 }} resizeMode="cover">
//       <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.1)" }} />

// <KeyboardAvoidingView
//       style={{ flex: 1 }}
//       behavior={Platform.OS === "ios" ? "padding" : "height"}
//       keyboardVerticalOffset={keyboardOffset}
//     >
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

//         {isLoadingMessages ? (
//           renderLoading()
//         ) : (
//           <FlatList
//             ref={flatListRef}
//             data={messages.slice().reverse()} // Reverse messages for inverted display
//             keyExtractor={(item, index) => `${item.id ?? "idx-" + index}`}
//             renderItem={renderMessage}
//             contentContainerStyle={{ padding: 10, flexGrow: 1 }}
//             inverted // Invert the list to show latest messages at the bottom
//             initialNumToRender={10} // Reduced to 10 for faster initial render
//             maxToRenderPerBatch={5} // Smaller batches for smoother rendering
//             windowSize={10} // Smaller window to reduce memory usage
//             removeClippedSubviews={true} // Clip off-screen views to improve performance
//             updateCellsBatchingPeriod={50} // Batch updates for smoother scrolling
//             initialScrollIndex={0} // Start at bottom (index 0 in inverted list)
//             maintainVisibleContentPosition={{
//               minIndexForVisible: 0,
//               autoscrollThreshold: 100,
//             }} // Maintain position during updates to reduce blink
//             onScroll={(event) => {
//               const offset = event.nativeEvent.contentOffset.y;
//               setIsAtBottom(offset <= 100); // Consider at bottom if offset is small (threshold 100)
//             }}
//             onContentSizeChange={() => {
//               if (isAtBottom) {
//                 scrollToBottom(true);
//               }
//             }}
//           />
//         )}

//         {/* Pending media preview */}
//         {pendingMedia && pendingMedia.length > 0 && (
//           <View style={styles.previewBox}>
//             <ScrollView horizontal>
//               {pendingMedia.map((m, i) => (
//                 <View key={i} style={{ marginRight: 8, alignItems: "center", position: "relative" }}>
//                   {m.type.startsWith("image/") ? (
//                     <Image source={{ uri: m.uri }} style={{ width: 70, height: 70, borderRadius: 8 }} />
//                   ) : m.type.startsWith("video/") ? (
//                     <View style={{ width: 70, height: 70, borderRadius: 8, backgroundColor: "#222", alignItems: "center", justifyContent: "center" }}>
//                       <Feather name="video" size={24} color="#fff" />
//                     </View>
//                   ) : (
//                     <View style={{ width: 70, height: 70, borderRadius: 8, backgroundColor: "#999", alignItems: "center", justifyContent: "center" }}>
//                       <Feather name="file-text" size={24} color="#fff" />
//                     </View>
//                   )}
//                   <TouchableOpacity
//                     style={styles.removeBtn}
//                     onPress={() => removePendingMedia(i)}
//                     accessibilityLabel={`Remove ${m.name}`}
//                   >
//                     <Feather name="x" size={16} color="#fff" />
//                   </TouchableOpacity>
//                   <Text numberOfLines={1} style={{ maxWidth: 70, fontSize: 11 }}>{m.name}</Text>
//                 </View>
//               ))}
//             </ScrollView>
//           </View>
//         )}

//         {/* Pending docs preview */}
//         {pendingDocs && pendingDocs.length > 0 && (
//           <View style={styles.previewBox}>
//             <ScrollView horizontal>
//               {pendingDocs.map((d, i) => (
//                 <View key={i} style={{ marginRight: 8, alignItems: "center", width: 140, position: "relative" }}>
//                   <Feather name="file" size={36} color="#333" />
//                   <TouchableOpacity
//                     style={styles.removeBtn}
//                     onPress={() => removePendingDoc(i)}
//                     accessibilityLabel={`Remove ${d.name}`}
//                   >
//                     <Feather name="x" size={16} color="#fff" />
//                   </TouchableOpacity>
//                   <Text numberOfLines={1} style={{ maxWidth: 120, fontSize: 12 }}>{d.name}</Text>
//                 </View>
//               ))}
//             </ScrollView>
//           </View>
//         )}

//         {/* Location pending preview */}
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
//   removeBtn: {
//     position: "absolute",
//     top: 1,
//     right: -1,
//     backgroundColor: "rgba(184, 15, 15, 0.7)",
//     borderRadius: 12,
//     padding: 2,
//     zIndex: 10,
//   },
// });
