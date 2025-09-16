// Components/FloatingAttachmentMenu.jsx
import React, { useEffect, useRef, useCallback, useState } from "react";
import {
  View,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Platform,
  Alert,
  Text,
  Image,
  PermissionsAndroid,
  Linking,
} from "react-native";
import Feather from "react-native-vector-icons/Feather";
import Ionicons from "react-native-vector-icons/Ionicons";
import DocumentPicker from "react-native-document-picker";
import { launchImageLibrary } from "react-native-image-picker";
import Geolocation from "react-native-geolocation-service";
import axiosInstance from "../../TokenHandling/axiosInstance";
import { useSocketStore } from "../stores/socketStore";

/**
 * FloatingAttachmentMenu
 *
 * Props:
 *  - show: boolean
 *  - toggle: () => void
 *  - chatId: number|string (required to send to correct chat)
 *  - chatType: "group" | "personal"
 *  - bottomOffset?, dropDistance?, size?
 *
 * IMPORTANT:
 *  - Set UPLOAD_PATH to your actual upload endpoint (relative to axiosInstance baseURL),
 *    e.g. "/chat/upload/" or "/files/upload/". I use "/upload/" as default — change if needed.
 *  - This implementation uploads the picked file via axiosInstance (multipart/form-data),
 *    then sends a websocket message with attachments metadata so message rendering (images/docs) works
 *    like in web app.
 */

const UPLOAD_PATH = "/upload/"; // <-- CHANGE THIS to your real upload endpoint if different

export default function FloatingAttachmentMenu({
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

  const [selectedImage, setSelectedImage] = useState(null); // { uri, fileName, type }
  const [selectedDoc, setSelectedDoc] = useState(null); // { uri, name, type }
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

  // Build payload with chat routing fields
  const makeBasePayload = useCallback((extra = {}) => {
    const group_id = chatType === "group" ? chatId : null;
    const receiver_id = chatType === "personal" ? chatId : null;
    return { group_id, receiver_id, parent_id: null, ...extra };
  }, [chatId, chatType]);

  // ------------------ Upload helpers ------------------
  // Upload file via axiosInstance (multipart/form-data)
  const uploadFile = useCallback(async (file) => {
    // file: { uri, name, type } (for image asset) or { uri, name, type } for doc
    try {
      const form = new FormData();
      // On Android content:// URIs keep as-is; React Native FormData accepts { uri, name, type }
      form.append("file", {
        uri: file.uri,
        name: file.name || file.fileName || `file_${Date.now()}`,
        type: file.type || "application/octet-stream",
      });

      // Example additional fields if your API expects them (auth handled by axiosInstance)
      // form.append("other_field", "value");

      const res = await axiosInstance.post(UPLOAD_PATH, form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000,
      });

      // Expect response to include the uploaded file URL — adapt to your API response shape
      // I try common keys: data.url or data.file_url or data.file?.url
      const data = res?.data;
      const fileUrl = data?.file_url || data?.url || data?.file_url_full || data?.data?.url || null;

      // If server returns object with path, send the appropriate value — adapt as needed.
      return { success: true, fileUrl: fileUrl ?? data, raw: data };
    } catch (err) {
      console.log("uploadFile error:", err);
      return { success: false, error: err };
    }
  }, []);

  // ------------------ handlers ------------------
  const internalImageHandler = useCallback(async () => {
    try {
      const res = await launchImageLibrary({ mediaType: "photo", selectionLimit: 1 });
      if (res.didCancel) return;
      const asset = res.assets && res.assets[0];
      if (!asset) return;
      const file = { uri: asset.uri, name: asset.fileName || `photo_${Date.now()}.jpg`, type: asset.type || "image/jpeg" };
      setSelectedImage(file);
      // keep menu open for preview / user to confirm send
    } catch (e) {
      console.log("internalImageHandler error:", e);
      Alert.alert("Image error", "Could not open gallery.");
    }
  }, []);

  const internalDocHandler = useCallback(async () => {
    try {
      const res = await DocumentPicker.pickSingle({ type: [DocumentPicker.types.allFiles] });
      setSelectedDoc({ uri: res.uri, name: res.name, type: res.type || "application/octet-stream" });
    } catch (err) {
      if (DocumentPicker.isCancel(err)) return;
      console.log("internalDocHandler error:", err);
      Alert.alert("Document error", "Could not pick document.");
    }
  }, []);

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
  }, []);

  // ------------------ send actions (upload then ws) ------------------
  const sendSelectedImage = useCallback(async () => {
    if (!selectedImage) return;
    try {
      // 1) upload
      const up = await uploadFile(selectedImage);
      if (!up.success) {
        Alert.alert("Upload failed", "Could not upload image.");
        return;
      }
      // 2) send websocket message with attachments metadata
      // Adapt the attachment key names to your backend. I'm using file_url & file_type like web.
      const attachments = [{ file_url: up.fileUrl || up.raw, file_type: selectedImage.type }];
      const payload = makeBasePayload({
        type: "send_message",
        message_type: "file",
        content: selectedImage.name || "Image",
        files: [], // web left files as base64; here we send attachments instead
        attachments,
      });
      console.log("sending image payload", payload);
      sendJson(payload);
      setSelectedImage(null);
      toggle();
    } catch (e) {
      console.log("sendSelectedImage error:", e);
      Alert.alert("Send failed", "Could not send image. Try again.");
    }
  }, [selectedImage, uploadFile, makeBasePayload, sendJson, toggle]);

  const sendSelectedDoc = useCallback(async () => {
    if (!selectedDoc) return;
    try {
      const up = await uploadFile(selectedDoc);
      if (!up.success) {
        Alert.alert("Upload failed", "Could not upload document.");
        return;
      }
      const attachments = [{ file_url: up.fileUrl || up.raw, file_type: selectedDoc.type }];
      const payload = makeBasePayload({
        type: "send_message",
        message_type: "file",
        content: selectedDoc.name || "Document",
        files: [],
        attachments,
      });
      console.log("sending doc payload", payload);
      sendJson(payload);
      setSelectedDoc(null);
      toggle();
    } catch (e) {
      console.log("sendSelectedDoc error:", e);
      Alert.alert("Send failed", "Could not send document. Try again.");
    }
  }, [selectedDoc, uploadFile, makeBasePayload, sendJson, toggle]);

  const sendSelectedLocation = useCallback(async () => {
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
      console.log("sending location payload", payload);
      sendJson(payload);
      setSelectedLocation(null);
      toggle();
    } catch (e) {
      console.log("sendSelectedLocation error:", e);
      Alert.alert("Send failed", "Could not send location.");
    }
  }, [selectedLocation, makeBasePayload, sendJson, toggle]);

  // ---------------- utilities ----------------
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

  const handleImage = onImagePressProp ?? internalImageHandler;
  const handleDoc = onDocPressProp ?? internalDocHandler;
  const handleLocation = onLocationPressProp ?? internalLocationHandler;
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
      <Animated.View pointerEvents={show ? "auto" : "none"} style={[styles.container, { width: centerSize, height: centerSize, borderRadius: Animated.divide(centerSize, 2), opacity: centerOpacity, transform: [{ translateY }] }]}>
        {pins.map((p) => (
          <Animated.View key={p.key} style={[styles.pinBase, makePinStyle(p.ox, p.oy)]}>
            <TouchableOpacity accessibilityLabel={p.key} onPress={p.onPress} activeOpacity={0.85} style={styles.pinTouchable}>
              {p.icon}
            </TouchableOpacity>
          </Animated.View>
        ))}
      </Animated.View>

      {/* previews */}
      {selectedImage && (
        <View style={styles.previewBox}>
          <TouchableOpacity onPress={() => openFile(selectedImage.uri)} style={styles.previewInner}>
            <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text numberOfLines={1} style={styles.previewTitle}>{selectedImage.name}</Text>
              <Text style={styles.previewSmall}>Tap to open</Text>
            </View>
            <TouchableOpacity style={styles.sendBtn} onPress={sendSelectedImage}><Text style={styles.sendText}>Send</Text></TouchableOpacity>
          </TouchableOpacity>
        </View>
      )}

      {selectedDoc && (
        <View style={styles.previewBox}>
          <TouchableOpacity onPress={() => openFile(selectedDoc.uri)} style={styles.previewInner}>
            <Feather name="file" size={28} color="#fff" />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text numberOfLines={1} style={styles.previewTitle}>{selectedDoc.name}</Text>
              <Text style={styles.previewSmall}>Tap to open</Text>
            </View>
            <TouchableOpacity style={styles.sendBtn} onPress={sendSelectedDoc}><Text style={styles.sendText}>Send</Text></TouchableOpacity>
          </TouchableOpacity>
        </View>
      )}

      {selectedLocation && (
        <View style={styles.previewBox}>
          <TouchableOpacity onPress={() => openInMaps(selectedLocation.latitude, selectedLocation.longitude)} style={styles.previewInner}>
            <Feather name="map-pin" size={28} color="#fff" />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.previewTitle}>Your Location</Text>
              <Text style={styles.previewSmall}>{selectedLocation.latitude.toFixed(5)}, {selectedLocation.longitude.toFixed(5)}</Text>
            </View>
            <TouchableOpacity style={styles.sendBtn} onPress={sendSelectedLocation}><Text style={styles.sendText}>Send</Text></TouchableOpacity>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: "absolute", left: 6, zIndex: 9999 },
  container: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#10B981", alignItems: "center", justifyContent: "center", overflow: "visible", shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 6 },
  pinBase: { position: "absolute", width: 30, height: 30, borderRadius: 15, backgroundColor: "#333849", alignItems: "center", justifyContent: "center" },
  pinTouchable: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  previewBox: { marginTop: 8, backgroundColor: "#fff", borderRadius: 12, padding: 8, width: 260, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 4 },
  previewInner: { flexDirection: "row", alignItems: "center" },
  previewImage: { width: 48, height: 48, borderRadius: 6, backgroundColor: "#eee" },
  previewTitle: { fontSize: 14, fontWeight: "600", color: "#222" },
  previewSmall: { fontSize: 12, color: "#666", marginTop: 2 },
  sendBtn: { backgroundColor: "#377355", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  sendText: { color: "#fff", fontWeight: "600" },
});
