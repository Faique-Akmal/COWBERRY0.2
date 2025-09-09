// src/native/LocationBridge.js
import { NativeModules, Platform } from "react-native";
import { sendTokenToNative } from "./sendTokenToNative";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { LocationServiceBridge } = NativeModules;

console.log("===DBG=== LocationBridge loaded. Platform:", Platform.OS);
console.log("===DBG=== Native LocationServiceBridge:", !!LocationServiceBridge, LocationServiceBridge);

export const startNativeTracking = (intervalSec) => {
  console.log("===DBG=== startNativeTracking called. interval:", intervalSec);
  try {
    if (!LocationServiceBridge) {
      console.warn("===DBG=== LocationServiceBridge native module not found (startNativeTracking)");
      return;
    }
    if (LocationServiceBridge.updateInterval) {
      LocationServiceBridge.updateInterval(intervalSec);
      console.log("===DBG=== Called native updateInterval");
    }
    if (Platform.OS === "android") {
      if (LocationServiceBridge.startService) {
        LocationServiceBridge.startService(intervalSec);
        console.log("===DBG=== Called android startService");
      } else {
        console.warn("===DBG=== android startService not present");
      }
    } else {
      if (LocationServiceBridge.startTracking) {
        LocationServiceBridge.startTracking();
        console.log("===DBG=== Called ios startTracking");
      } else {
        console.warn("===DBG=== ios startTracking not present");
      }
    }
  } catch (e) {
    console.error("===DBG=== startNativeTracking error:", e);
  }
};

export const updateNativeInterval = (intervalSec) => {
  console.log("===DBG=== updateNativeInterval called:", intervalSec);
  try {
    if (!LocationServiceBridge) {
      console.warn("===DBG=== LocationServiceBridge native module not found (updateNativeInterval)");
      return;
    }
    if (LocationServiceBridge.updateInterval) {
      LocationServiceBridge.updateInterval(intervalSec);
      console.log("===DBG=== Native updateInterval called");
    } else {
      console.warn("===DBG=== updateInterval not present on native module");
    }
  } catch (e) {
    console.error("===DBG=== updateNativeInterval error:", e);
  }
};

export const stopNativeTracking = () => {
  console.log("===DBG=== stopNativeTracking called");
  try {
    if (!LocationServiceBridge) {
      console.warn("===DBG=== LocationServiceBridge native module not found (stop)");
      return;
    }
    if (Platform.OS === "android" && LocationServiceBridge.stopService) {
      LocationServiceBridge.stopService();
      console.log("===DBG=== Called android stopService");
    } else if (Platform.OS === "ios" && LocationServiceBridge.stopTracking) {
      LocationServiceBridge.stopTracking();
      console.log("===DBG=== Called ios stopTracking");
    } else if (LocationServiceBridge.stopService) {
      LocationServiceBridge.stopService();
      console.log("===DBG=== Called generic stopService");
    } else {
      console.warn("===DBG=== stop method not present on native module");
    }
  } catch (e) {
    console.error("===DBG=== stopNativeTracking error:", e);
  }
};

// set token & uid directly from JS (token should be raw token, without "Bearer ")
export const setNativeAuth = async (token, uid) => {
  try {
    if (!LocationServiceBridge) {
      console.warn("===DBG=== LocationServiceBridge not available (setNativeAuth)");
      return;
    }
    if (token && LocationServiceBridge.setAuthToken) {
      // strip "Bearer " if accidentally passed
      const t = token.startsWith("Bearer ") ? token.replace(/^Bearer\s+/i, "") : token;
      LocationServiceBridge.setAuthToken(t);
      console.log("===DBG=== setAuthToken called (prefix):", t.substring(0, 20));
    } else {
      console.warn("===DBG=== setAuthToken not available or token empty");
    }

    if (uid && LocationServiceBridge.setUserId) {
      LocationServiceBridge.setUserId(String(uid));
      console.log("===DBG=== setUserId called:", uid);
    } else {
      console.warn("===DBG=== setUserId not available or uid empty");
    }
  } catch (e) {
    console.error("===DBG=== setNativeAuth error:", e);
  }
};

// clear persisted token/user in native side (if native exposes clear methods)
export const clearNativeAuth = async () => {
  try {
    if (!LocationServiceBridge) {
      console.warn("===DBG=== LocationServiceBridge not available (clearNativeAuth)");
      return;
    }
    if (LocationServiceBridge.clearAuthToken) {
      LocationServiceBridge.clearAuthToken();
      console.log("===DBG=== clearAuthToken called");
    } else {
      console.warn("===DBG=== clearAuthToken not present on native module");
    }
    if (LocationServiceBridge.clearUserId) {
      LocationServiceBridge.clearUserId();
      console.log("===DBG=== clearUserId called");
    } else {
      console.warn("===DBG=== clearUserId not present on native module");
    }
  } catch (e) {
    console.error("===DBG=== clearNativeAuth error:", e);
  }
};

// convenience: read token from AsyncStorage and send to native (you already have similar sendTokenToNative)
export const setAuthFromStorage = async (userId) => {
  try {
    if (!LocationServiceBridge) {
      console.warn("===DBG=== LocationServiceBridge not available (setAuthFromStorage)");
      return;
    }
    // try to reuse existing sendTokenToNative logic if present
    if (typeof sendTokenToNative === "function") {
      return sendTokenToNative(userId);
    }

    // fallback: read token & send
    const AsyncStorage = require("@react-native-async-storage/async-storage").default;
    const stored = await AsyncStorage.getItem("accessToken");
    if (!stored) {
      console.warn("===DBG=== No accessToken in AsyncStorage");
      return;
    }
    const token = stored.startsWith("Bearer ") ? stored.replace(/^Bearer\s+/i, "") : stored;
    await setNativeAuth(token, userId);
  } catch (e) {
    console.warn("===DBG=== setAuthFromStorage error:", e);
  }
};

export default {
  startNativeTracking,
  updateNativeInterval,
  stopNativeTracking,
  setNativeAuth,
  clearNativeAuth,
  setAuthFromStorage,
  sendTokenToNative, // your existing function
};
