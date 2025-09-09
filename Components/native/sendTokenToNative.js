import { NativeModules } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { LocationServiceBridge } = NativeModules;

export async function sendTokenToNative(userId) {
  try {
    const stored = await AsyncStorage.getItem("accessToken");
    console.log("===DBG=== token from AsyncStorage:", stored);
    if (!stored) {
      console.warn("===DBG=== no token in AsyncStorage");
      return;
    }
    const token = stored.startsWith("Bearer ")
      ? stored.replace(/^Bearer\s+/i, "")
      : stored;
    console.log("===DBG=== token after strip prefix sample:", token.substring(0, 20));

    if (LocationServiceBridge && LocationServiceBridge.setAuthToken) {
  console.log("===DBG=== Calling native setAuthToken with token prefix:", token.substring(0, 20));
  await LocationServiceBridge.setAuthToken(token);
  console.log("===DBG=== setAuthToken finished successfully");
}
 else {
      console.warn("===DBG=== setAuthToken not available");
    }

    if (userId && LocationServiceBridge && LocationServiceBridge.setUserId) {
  console.log("===DBG=== Calling native setUserId:", userId);
  await LocationServiceBridge.setUserId(String(userId));
  console.log("===DBG=== setUserId finished successfully");
}
 else {
      console.warn("===DBG=== setUserId not available or not passed");
    }

    // optional: update interval in native
    const interval = await AsyncStorage.getItem("backendIntervalSec");
    if (interval && LocationServiceBridge && LocationServiceBridge.updateInterval) {
      await LocationServiceBridge.updateInterval(Number(interval));
      console.log("===DBG=== Sent interval to native:", interval);
    }
  } catch (e) {
    console.warn("===DBG=== sendTokenToNative error", e);
  }
}
