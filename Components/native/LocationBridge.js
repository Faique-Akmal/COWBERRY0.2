// src/native/LocationBridge.js
import { NativeModules, Platform } from "react-native";
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
