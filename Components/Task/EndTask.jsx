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
import {
  check,
  request,
  PERMISSIONS,
  RESULTS,
  openSettings,
} from "react-native-permissions";
import Icon from "react-native-vector-icons/FontAwesome5";
import { stopLocationTracking } from "../Task/AttendanceHelpers";

export default function EndTask({ navigation }) {
  const [odometerImage, setOdometerImage] = useState(null);
  const [selfieImage, setSelfieImage] = useState(null);
  const [endLat, setEndLat] = useState("");
  const [endLng, setEndLng] = useState("");
  const [description, setDescription] = useState("");
  const [userId, setUserId] = useState("");

  const formatCoordinate = (value) => {
    return parseFloat(value).toFixed(6); // max 6 decimal places
  };

  useEffect(() => {
    Geolocation.getCurrentPosition(
      (pos) => {
        setEndLat(formatCoordinate(pos.coords.latitude));
        setEndLng(formatCoordinate(pos.coords.longitude));
      },
      (err) => {
        Alert.alert("Location Error", err.message);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );

    AsyncStorage.getItem("userId").then((id) => {
      if (id) setUserId(id);
    });
  }, []);

  // ✅ Odometer photo (Back Camera)
  const pickOdometerImage = () => {
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
          setOdometerImage({
            uri: img.uri,
            type: img.type || "image/jpeg",
            name: img.fileName || "odometer_end.jpg",
          });
        }
      }
    );
  };

  // ✅ Selfie photo (Front Camera)
  const pickSelfieImage = () => {
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
          setSelfieImage({
            uri: img.uri,
            type: img.type || "image/jpeg",
            name: img.fileName || "selfie_end.jpg",
          });
        }
      }
    );
  };

  const checkLocationPermission = async () => {
    const permission =
      Platform.OS === "android"
        ? PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION
        : PERMISSIONS.IOS.LOCATION_WHEN_IN_USE;

    const result = await check(permission);

    if (result === RESULTS.GRANTED) {
      return true;
    } else if (result === RESULTS.DENIED) {
      const req = await request(permission);
      return req === RESULTS.GRANTED;
    } else if (result === RESULTS.BLOCKED) {
      Alert.alert("Permission Required", "Please enable location permission from Settings", [
        { text: "Open Settings", onPress: () => openSettings() },
      ]);
      return false;
    }
    return false;
  };

  const onPressEndAttendance = async () => {
    const hasPermission = await checkLocationPermission();
    if (!hasPermission) return;

    Geolocation.getCurrentPosition(
      async (pos) => {
        setEndLat(formatCoordinate(pos.coords.latitude));
        setEndLng(formatCoordinate(pos.coords.longitude));
        await handleSubmit();
      },
      (err) => {
        Alert.alert("Location Error", err.message);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleSubmit = async () => {
    if (!odometerImage || !selfieImage || !endLat || !endLng || !description || !userId) {
      Alert.alert("Error", "Please fill all fields and click both photos.");
      return;
    }

    const formData = new FormData();
    formData.append("odometer_image", odometerImage);
    formData.append("selfie_image", selfieImage);
    formData.append("end_lat", endLat);
    formData.append("end_lng", endLng);
    formData.append("description", description);
    formData.append("user", userId);

    try {
      const res = await axiosInstance.post("/attendance-end/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      Alert.alert("Success", "Attendance ended successfully!");
      setOdometerImage(null);
      setSelfieImage(null);
      setEndLat("");
      setEndLng("");
      setDescription("");
      stopLocationTracking();
    } catch (err) {
      console.log("Error:", err.response?.status, err.response?.data || err.message);
      console.log({ odometerImage, selfieImage, endLat, endLng, description, userId });
      Alert.alert("Error", "Failed to end attendance.");
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

        {/* End Latitude */}
        <Text style={styles.label}>
          End Latitude <Icon name="asterisk" size={10} color="red" />
        </Text>
        <TextInput style={styles.input} value={endLat} editable={false} />

        {/* End Longitude */}
        <Text style={styles.label}>
          End Longitude <Icon name="asterisk" size={10} color="red" />
        </Text>
        <TextInput style={styles.input} value={endLng} editable={false} />

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

        <TouchableOpacity style={styles.submitBtn} onPress={onPressEndAttendance}>
          <Text style={styles.submitText}>End Attendance</Text>
        </TouchableOpacity>

        {endLat && endLng ? (
          <TouchableOpacity
            style={styles.mapLinkBtn}
            onPress={() =>
              Linking.openURL(`https://www.google.com/maps?q=${endLat},${endLng}`)
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
