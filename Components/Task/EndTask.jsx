// EndTask.jsx
import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Alert, ScrollView, Platform, Linking } from "react-native";
import * as ImagePicker from "react-native-image-picker";
import Geolocation from "react-native-geolocation-service";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "../TokenHandling/axiosInstance";
import { check, request, PERMISSIONS, RESULTS, openSettings } from "react-native-permissions";

export default function EndTask() {
  const [odometerImage, setOdometerImage] = useState(null);
  const [selfieImage, setSelfieImage] = useState(null);
  const [endLat, setEndLat] = useState("");
  const [endLng, setEndLng] = useState("");
  const [description, setDescription] = useState("");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    Geolocation.getCurrentPosition(
      (pos) => {
        setEndLat(pos.coords.latitude.toString());
        setEndLng(pos.coords.longitude.toString());
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

  const pickImage = (setImage) => {
    ImagePicker.launchImageLibrary({ mediaType: "photo" }, (res) => {
      if (res.assets && res.assets.length > 0) {
        const img = res.assets[0];
        setImage({
          uri: img.uri,
          type: img.type || "image/jpeg",
          name: img.fileName || "photo.jpg",
        });
      }
    });
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
      Alert.alert(
        "Permission Required",
        "Please enable location permission from Settings",
        [{ text: "Open Settings", onPress: () => openSettings() }]
      );
      return false;
    }
    return false;
  };

  const onPressEndAttendance = async () => {
    const hasPermission = await checkLocationPermission();
    if (!hasPermission) return;

    Geolocation.getCurrentPosition(
      async (pos) => {
        setEndLat(pos.coords.latitude.toString());
        setEndLng(pos.coords.longitude.toString());
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
      Alert.alert("Error", "Please fill all fields and select images.");
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
    } catch (err) {
         console.log("Error:", err.response?.status, err.response?.data || err.message);
         console.log({ odometerImage, selfieImage, endLat, endLng, description, userId });
      Alert.alert("Error", "Failed to end attendance.");
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

      <Text style={styles.label}>End Latitude *</Text>
      <TextInput style={styles.input} value={endLat} onChangeText={setEndLat} editable={false} />

      <Text style={styles.label}>End Longitude *</Text>
      <TextInput style={styles.input} value={endLng} onChangeText={setEndLng} editable={false} />

      <Text style={styles.label}>Description *</Text>
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