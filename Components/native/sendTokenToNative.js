// src/native/sendTokenToNative.js
import { NativeModules } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { LocationServiceBridge } = NativeModules;

export async function sendTokenToNative(userId) {
  try {
    const stored = await AsyncStorage.getItem("accessToken"); // adjust key if needed
    if (!stored) {
      console.log("===DBG=== no token found in AsyncStorage (accessToken)");
      return;
    }

    // strip Bearer prefix if present
    const token = stored.startsWith("Bearer ")
      ? stored.replace(/^Bearer\s+/i, "")
      : stored;

if (LocationServiceBridge && LocationServiceBridge.setAuthToken) {
  LocationServiceBridge.setAuthToken(token);
  console.log("===DBG=== Sent auth token to native:", token.substring(0, 10));
} else {
  console.warn("===DBG=== setAuthToken not available on native module");
}


    if (userId && LocationServiceBridge && LocationServiceBridge.setUserId) {
      LocationServiceBridge.setUserId(String(userId));
      console.log("===DBG=== Sent userId to native");
    }
  } catch (e) {
    console.warn("===DBG=== sendTokenToNative error", e);
  }
}
