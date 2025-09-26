// AttendanceHelpers.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import Geolocation from "react-native-geolocation-service";
import NetInfo from "@react-native-community/netinfo";
import axiosInstance from "../TokenHandling/axiosInstance";
import DeviceInfo from "react-native-device-info";
import {
  startNativeTracking,
  updateNativeInterval,
  stopNativeTracking
} from "../native/LocationBridge";

let locationInterval = null;
let userId = null;
let unsubscribeNetInfo = null;

// fetch /me/ and store userId
export const fetchMe = async () => {
  try {
    const res = await axiosInstance.get("/me/");
    await AsyncStorage.setItem("meData", JSON.stringify(res.data));
    if (res.data?.id) {
      await AsyncStorage.setItem("userId", res.data.id.toString());
      userId = res.data.id;
    }
  } catch (err) {
    console.log("Error fetching /me/:", err.response?.data || err.message);
  }
};

// NOTE: backend-interval usage removed — native tracking will use static 5s.
// Keeping the function for compatibility but it no longer starts native tracking.
export const fetchLocationConfig = async () => {
  try {
    const res = await axiosInstance.get("/location-log-config/");
    console.log("Location Config (ignored for native interval):", res.data);
    // we intentionally do NOT call updateNativeInterval/startNativeTracking here
  } catch (err) {
    console.log("Location Config Error (ignored):", err.response?.data || err.message);
  }
};

// Client-side interval-based tracking (JS fallback) — kept for reference but not used
export const startLocationTracking = (intervalSec) => {
  if (locationInterval) clearInterval(locationInterval);
  if (!unsubscribeNetInfo) {
    unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        console.log("Internet back -> sync offline locations");
        syncOfflineLocations();
      }
    });
  }

  locationInterval = setInterval(async () => {
    Geolocation.getCurrentPosition(
      async (pos) => {
        if (!userId) {
          const stored = await AsyncStorage.getItem("userId");
          userId = stored ? parseInt(stored) : null;
        }

        if (!userId) {
          console.log("userId not found, skipping location post");
          return;
        }
        const batteryLevel = await DeviceInfo.getBatteryLevel();
        const payload = {
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
          battery: Math.round(batteryLevel * 100),
          speed: pos.coords.speed || 0,
          pause: false,
          user: userId,
        };

        try {
          // If you later switch to frappe endpoint from JS side, change URL here
          await axiosInstance.post("/locations/", payload);
          console.log("JS Location posted");
        } catch (err) {
          console.log("Location post failed, saving offline:", err.message);
          saveOfflineLocation(payload);
        }
      },
      (err) => console.log("Location error:", err.message),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, intervalSec * 1000);
};

export const saveOfflineLocation = async (location) => {
  try {
    let stored = await AsyncStorage.getItem("offlineLocations");
    stored = stored ? JSON.parse(stored) : [];
    stored.push(location);
    await AsyncStorage.setItem("offlineLocations", JSON.stringify(stored));
  } catch (err) {
    console.log("Error saving offline location:", err);
  }
};

export const syncOfflineLocations = async () => {
  try {
    let stored = await AsyncStorage.getItem("offlineLocations");
    if (stored) {
      let locations = JSON.parse(stored);
      for (let loc of locations) {
        try {
          await axiosInstance.post("/locations/", loc);
          console.log("Offline location synced:", loc);
        } catch (err) {
          console.log("Failed to sync offline location:", err.message);
          return;
        }
      }
      await AsyncStorage.removeItem("offlineLocations");
    }
  } catch (err) {
    console.log("Error syncing offline locations:", err);
  }
};

export const stopLocationTracking = () => {
  if (locationInterval) {
    clearInterval(locationInterval);
    locationInterval = null;
  }
  if (unsubscribeNetInfo) {
    unsubscribeNetInfo();
    unsubscribeNetInfo = null;
  }
};