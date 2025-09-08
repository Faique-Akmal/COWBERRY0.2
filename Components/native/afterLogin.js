import { NativeModules } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
const { LocationServiceBridge } = NativeModules;

export async function afterLogin(userId) {
  try {
    const token = await AsyncStorage.getItem("accessToken"); // adjust key if needed
    if (token) {
      const raw = token.startsWith("Bearer ") ? token.replace(/^Bearer\s+/i, "") : token;
      if (LocationServiceBridge) {
        LocationServiceBridge.setAuthToken(raw);
        LocationServiceBridge.setUserId(String(userId));
        console.log("===DBG=== Token + UserId sent to native");
      } else {
        console.warn("===DBG=== LocationServiceBridge not available");
      }
    } else {
      console.warn("===DBG=== No token in AsyncStorage (accessToken)");
    }

    // Example: start background service with 2 min interval
    LocationServiceBridge.startService(120);
    console.log("===DBG=== Background service started with 120s interval");
  } catch (e) {
    console.error("===DBG=== afterLogin error", e);
  }
}
