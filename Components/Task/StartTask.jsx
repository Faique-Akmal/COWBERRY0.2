// StartTask.js (updated)
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
  Linking,
  KeyboardAvoidingView,
} from "react-native";
import * as ImagePicker from "react-native-image-picker";
import Geolocation from "react-native-geolocation-service";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "../TokenHandling/axiosInstance";
import Icon from "react-native-vector-icons/FontAwesome5";
import { fetchMe, fetchLocationConfig } from "../Task/AttendanceHelpers";
// make sure this path matches where you put permissions.js
import { requestPermissions } from "../utils/permissions";

export default function StartTask({ navigation }) {
  const [odometerImage, setOdometerImage] = useState(null);
  const [selfieImage, setSelfieImage] = useState(null);
  const [startLat, setStartLat] = useState("");
  const [startLng, setStartLng] = useState("");
  const [description, setDescription] = useState("");
  const [userId, setUserId] = useState("");

  const formatCoordinate = (value) => {
    return parseFloat(value).toFixed(6); // max 6 decimal places
  };

  // Get location automatically (one-time when screen mounts)
  useEffect(() => {
    console.log("Fetching location...");
    Geolocation.getCurrentPosition(
      (pos) => {
        console.log("Location fetched:", pos.coords);
        setStartLat(formatCoordinate(pos.coords.latitude));
        setStartLng(formatCoordinate(pos.coords.longitude));
      },
      (err) => {
        console.log("Location Error:", err.message);
        // don't alert immediately on mount; show only if user action requires it
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );

    // Get user ID from Asyncstorage
    AsyncStorage.getItem("userId").then((id) => {
      console.log("Stored User ID:", id);
      if (id) setUserId(id);
    });
  }, []);

  // Odometer photo (Back Camera)
  const pickOdometerImage = () => {
    console.log("Opening back camera...");
    ImagePicker.launchCamera(
      {
        mediaType: "photo",
        cameraType: "back",
        saveToPhotos: false,
      },
      (res) => {
        if (res.didCancel) {
          console.log("⚠️ User cancelled camera");
          return;
        }
        if (res.errorMessage) {
          console.log("Camera Error:", res.errorMessage);
          Alert.alert("Camera Error", res.errorMessage);
          return;
        }
        if (res.assets && res.assets.length > 0) {
          const img = res.assets[0];
          console.log("Photo captured:", img);
          setOdometerImage({
            uri: img.uri,
            type: img.type || "image/jpeg",
            name: img.fileName || "odometer.jpg",
          });
        }
      }
    );
  };

  // Selfie photo (Front Camera)
  const pickSelfieImage = () => {
    console.log("Opening front camera...");
    ImagePicker.launchCamera(
      {
        mediaType: "photo",
        cameraType: "front",
        saveToPhotos: false,
      },
      (res) => {
        if (res.didCancel) {
          console.log("⚠️ User cancelled camera");
          return;
        }
        if (res.errorMessage) {
          console.log("Camera Error:", res.errorMessage);
          Alert.alert("Camera Error", res.errorMessage);
          return;
        }
        if (res.assets && res.assets.length > 0) {
          const img = res.assets[0];
          console.log("Photo captured:", img);
          setSelfieImage({
            uri: img.uri,
            type: img.type || "image/jpeg",
            name: img.fileName || "selfie.jpg",
          });
        }
      }
    );
  };

  // onPressStartAttendance: request permissions first, then get fresh location and submit
  const onPressStartAttendance = async () => {
    // 1) Request runtime permissions (foreground + background)
    const perm = await requestPermissions();
    if (!perm.ok) {
      Alert.alert(
        "Permission required",
        "Location permission (including background) is required to start attendance. Please enable it in Settings if blocked."
      );
      return;
    }

    console.log("📍 Permissions OK — fetching fresh location...");

    Geolocation.getCurrentPosition(
      async (pos) => {
        if (pos.coords.latitude === 0) {
          console.log("⚠️ Latitude 0 mila, retrying in 2s...");
          setTimeout(onPressStartAttendance, 2000);
          return;
        }

        console.log("✅ Final Location:", pos.coords);

        setStartLat(formatCoordinate(pos.coords.latitude));
        setStartLng(formatCoordinate(pos.coords.longitude));

        await handleSubmit();
      },
      (err) => {
        console.log("❌ Location Error:", err.message);
        Alert.alert("Location Error", err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

const handleSubmit = async () => {
  console.log("Submitting data...");
  console.log("Current state values:", {
    odometerImage,
    selfieImage,
    startLat,
    startLng,
    description,
    userId,
  });

  if (!odometerImage || !selfieImage || !startLat || !startLng || !description || !userId) {
    Alert.alert("Error", "Please fill all fields and click both photos.");
    return;
  }

  const formData = new FormData();
  formData.append("odometer_image", odometerImage);
  formData.append("selfie_image", selfieImage);
  formData.append("start_lat", startLat);
  formData.append("start_lng", startLng);
  formData.append("description", description);
  formData.append("user", userId);

  try {
    const res = await axiosInstance.post("/attendance-start/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    console.log("API Response:", res.data);

    Alert.alert("Success", "Attendance started successfully!");
    setOdometerImage(null);
    setSelfieImage(null);
    setStartLat("");
    setStartLng("");
    setDescription("");

    // ✅ Update local user
    await fetchMe();

    // ✅ Fetch backend interval & start native background service
    await fetchLocationConfig();

  } catch (err) {
    console.log("API Error:", err.response?.data || err.message);
    Alert.alert("Error", "Failed to start attendance.");
  }
};


  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={80}
    >
      <ScrollView style={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text>go back</Text>
        </TouchableOpacity>

        {/* Odometer */}
        <Text style={styles.label}>
          Odometer Image <Icon name="asterisk" size={10} color="red" />
        </Text>
        {odometerImage && <Image source={{ uri: odometerImage.uri }} style={styles.preview} />}
        <TouchableOpacity style={styles.button} onPress={pickOdometerImage}>
          <Text style={styles.buttonText}>Click Odometer Photo</Text>
        </TouchableOpacity>

        {/* Selfie */}
        <Text style={styles.label}>
          Selfie Image <Icon name="asterisk" size={10} color="red" />
        </Text>
        {selfieImage && <Image source={{ uri: selfieImage.uri }} style={styles.preview} />}
        <TouchableOpacity style={styles.button} onPress={pickSelfieImage}>
          <Text style={styles.buttonText}>Click Selfie</Text>
        </TouchableOpacity>

        {/* Start Latitude */}
        <Text style={styles.label}>
          Start Latitude <Icon name="asterisk" size={10} color="red" />
        </Text>
        <TextInput style={styles.input} value={startLat} editable={false} />

        {/* Start Longitude */}
        <Text style={styles.label}>
          Start Longitude <Icon name="asterisk" size={10} color="red" />
        </Text>
        <TextInput style={styles.input} value={startLng} editable={false} />

        {/* Description */}
        <Text style={styles.label}>
          Description <Icon name="asterisk" size={10} color="red" />
        </Text>
        <TextInput
          style={[styles.input, { height: 80 }]}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <TouchableOpacity style={styles.submitBtn} onPress={onPressStartAttendance}>
          <Text style={styles.submitText}>Attendance Start</Text>
        </TouchableOpacity>

        {startLat && startLng ? (
          <TouchableOpacity
            style={styles.mapLinkBtn}
            onPress={() =>
              Linking.openURL(`https://www.google.com/maps?q=${startLat},${startLng}`)
            }
          >
            <Text style={styles.mapLinkText}>📍 View Location on Google Maps</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  label: { fontSize: 16, fontWeight: "600", marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
    backgroundColor: "#f8f8f8",
  },
  button: {
    backgroundColor: "#2E7D32",
    padding: 10,
    marginTop: 6,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  preview: { width: "100%", height: 150, marginTop: 6, borderRadius: 8 },
  submitBtn: {
    backgroundColor: "#2E7D32",
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  mapLinkBtn: {
    marginTop: 15,
    padding: 12,
    backgroundColor: "#4880FF",
    borderRadius: 8,
    alignItems: "center",
  },
  mapLinkText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
});
