import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Alert, ScrollView, Platform, Linking } from "react-native";
import * as ImagePicker from "react-native-image-picker";
import Geolocation from "react-native-geolocation-service";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "../TokenHandling/axiosInstance";
import { check, request, PERMISSIONS, RESULTS, openSettings } from "react-native-permissions";

export default function StartTask() {
  const [odometerImage, setOdometerImage] = useState(null);
  const [selfieImage, setSelfieImage] = useState(null);
  const [startLat, setStartLat] = useState("");
  const [startLng, setStartLng] = useState("");
  const [description, setDescription] = useState("");
  const [userId, setUserId] = useState("");

  // Get location automatically
  useEffect(() => {
    console.log("Fetching location...");
    Geolocation.getCurrentPosition(
      (pos) => {
        console.log("Location fetched:", pos.coords);
        setStartLat(pos.coords.latitude.toString());
        setStartLng(pos.coords.longitude.toString());
      },
      (err) => {
        console.log("Location Error:", err.message);
        Alert.alert("Location Error", err.message);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );

    // Get user ID from Asyncstorage
    AsyncStorage.getItem("userId").then((id) => {
      console.log("Stored User ID:", id);
      if (id) setUserId(id);
    });
  }, []);

  const pickImage = (setImage) => {
    console.log("Opening gallery...");
    ImagePicker.launchImageLibrary({ mediaType: "photo" }, (res) => {
      if (res.didCancel) {
        console.log("⚠️ User cancelled image picker");
        return;
      }
      if (res.errorMessage) {
        console.log("Image Picker Error:", res.errorMessage);
        return;
      }
      if (res.assets && res.assets.length > 0) {
        const img = res.assets[0];
        console.log("Image selected:", img);
        setImage({
          uri: img.uri,
          type: img.type || "image/jpeg",
          name: img.fileName || "photo.jpg",
        });
      } else {
        console.log("No image returned");
      }
    });
  };

  // 👇 ye helper bana lo
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
    Alert.alert(
      "Permission Required",
      "Please enable location permission from Settings",
      [{ text: "Open Settings", onPress: () => openSettings() }]
    );
    return false;
  }
  return false;
};
const onPressStartAttendance = async () => {
  const hasPermission = await checkLocationPermission();

  if (!hasPermission) return; // agar permission nahi mili to API run hi na ho

  // ✅ agar permission mil gayi, tabhi location fetch karo
  Geolocation.getCurrentPosition(
    async (pos) => {
      setStartLat(pos.coords.latitude.toString());
      setStartLng(pos.coords.longitude.toString());

      // location mil gayi to ab API call karo
      await handleSubmit();
    },
    (err) => {
      console.log("Location Error:", err.message);
      Alert.alert("Location Error", err.message);
    },
    { enableHighAccuracy: true, timeout: 15000 }
  );
};


  const handleSubmit = async () => {
    console.log("🚀 Submitting data...");
    console.log("🛠 Current state values:", {
      odometerImage,
      selfieImage,
      startLat,
      startLng,
      description,
      userId,
    });

    if (!odometerImage || !selfieImage || !startLat || !startLng || !description || !userId) {
      Alert.alert("Error", "Please fill all fields and select images.");
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
    } catch (err) {
      console.log("API Error:", err.response?.data || err.message);
      Alert.alert("Error", "Failed to start attendance.");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Odometer Image *</Text>
      {odometerImage && <Image source={{ uri: odometerImage.uri }} style={styles.preview} />}
      <TouchableOpacity style={styles.button} onPress={() => pickImage(setOdometerImage)}>
        <Text style={styles.buttonText}>Pick Odometer Photo</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Selfie Image *</Text>
      {selfieImage && <Image source={{ uri: selfieImage.uri }} style={styles.preview} />}
      <TouchableOpacity style={styles.button} onPress={() => pickImage(setSelfieImage)}>
        <Text style={styles.buttonText}>Pick Selfie</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Start Latitude *</Text>
      <TextInput style={styles.input} value={startLat} onChangeText={setStartLat} editable={false} />

      <Text style={styles.label}>Start Longitude *</Text>
      <TextInput style={styles.input} value={startLng} onChangeText={setStartLng} editable={false} />

      <Text style={styles.label}>Description *</Text>
      <TextInput
        style={[styles.input, { height: 80 }]}
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <TouchableOpacity style={styles.submitBtn} onPress={onPressStartAttendance}>
        <Text style={styles.submitText}>Start Attendance</Text>
      </TouchableOpacity>


      {startLat && startLng ? (
  <TouchableOpacity
    style={styles.mapLinkBtn}
    onPress={() =>
      Linking.openURL(`https://www.google.com/maps?q=${startLat},${startLng}`)
    }
  >
    <Text style={styles.mapLinkText}>
      📍 View Location on Google Maps
    </Text>
  </TouchableOpacity>
) : null}
    </ScrollView>
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