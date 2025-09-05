// // ===================================== Location Tracking After Set TimeInterval ========================================// 
// //  fetch user id by using /me/ api
// // get time interval by using /location-log-config/ api (ye time ke hisaab se location baar baar send hogi)
// // startLocationTracking() ye function location send krega time interval ke hisab se aur agar net off hoga to Async me store krega aur jaise net aaega to wo bhi bhi send krega

// import AsyncStorage from "@react-native-async-storage/async-storage";
// import Geolocation from "react-native-geolocation-service";
// import axiosInstance from "../TokenHandling/axiosInstance";

// let locationInterval = null;
// let userId = null;

// // ✅ /me/ call
// export const fetchMe = async () => {
//   try {
//     const res = await axiosInstance.get("/me/");
//     console.log("Updated /me/:", res.data);
//     await AsyncStorage.setItem("meData", JSON.stringify(res.data));
//     // id bhi store kar lo
//     if (res.data?.id) {
//       await AsyncStorage.setItem("userId", res.data.id.toString());
//       userId = res.data.id;
//     }
//   } catch (err) {
//     console.log("Error fetching /me/:", err.response?.data || err.message);
//   }
// };

// // ✅ /location-log-config/ call
// export const fetchLocationConfig = async () => {
//   try {
//     const res = await axiosInstance.get("/location-log-config/");
//     console.log("Location Config:", res.data);
//     if (res.data?.[0]?.refresh_interval) {
//       startLocationTracking(res.data[0].refresh_interval);
//     }
//   } catch (err) {
//     console.log("Location Config Error:", err.response?.data || err.message);
//   }
// };

// // ✅ location tracking interval
// export const startLocationTracking = (intervalSec) => {
//   if (locationInterval) clearInterval(locationInterval); // duplicate avoid

//   locationInterval = setInterval(async () => {
//     Geolocation.getCurrentPosition(
//       async (pos) => {
//         if (!userId) {
//           const stored = await AsyncStorage.getItem("userId");
//           userId = stored ? parseInt(stored) : null;
//         }

//         if (!userId) {
//           console.log("⚠️ userId not found, skipping location post");
//           return;
//         }

//         const payload = {
//           latitude: pos.coords.latitude.toFixed(6),
//           longitude: pos.coords.longitude.toFixed(6),
//           battery_level: 90, // TODO: battery API se lena
//           user: userId,
//         };

//         console.log("Posting location:", payload);

//         try {
//           await axiosInstance.post("/locations/", payload);
//           console.log("✅ Location posted");
//         } catch (err) {
//           console.log("❌ Location post failed, saving offline:", err.message);
//           saveOfflineLocation(payload);
//         }
//       },
//       (err) => console.log("Location error:", err.message),
//       { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
//     );
//   }, intervalSec * 1000);
// };

// // ✅ offline save
// export const saveOfflineLocation = async (location) => {
//   try {
//     let stored = await AsyncStorage.getItem("offlineLocations");
//     stored = stored ? JSON.parse(stored) : [];
//     stored.push(location);
//     await AsyncStorage.setItem("offlineLocations", JSON.stringify(stored));
//   } catch (err) {
//     console.log("Error saving offline location:", err);
//   }
// };

// // ✅ sync offline data
// export const syncOfflineLocations = async () => {
//   try {
//     let stored = await AsyncStorage.getItem("offlineLocations");
//     if (stored) {
//       let locations = JSON.parse(stored);
//       for (let loc of locations) {
//         try {
//           await axiosInstance.post("/locations/", loc);
//           console.log("📤 Offline location synced:", loc);
//         } catch (err) {
//           console.log("❌ Failed to sync:", err.message);
//           return; // agar fail hua to baaki retry next time
//         }
//       }
//       await AsyncStorage.removeItem("offlineLocations"); // all synced
//     }
//   } catch (err) {
//     console.log("Error syncing offline locations:", err);
//   }
// };

// // ✅ stop tracking (logout/unmount)
// export const stopLocationTracking = () => {
//   if (locationInterval) {
//     clearInterval(locationInterval);
//     locationInterval = null;
//   }
// };


// ===================================== Location Tracking After Set TimeInterval ========================================//
// 1. fetch user id by using /me/ api
// 2. get time interval by using /location-log-config/ api (ye time ke hisaab se location baar baar send hogi)
// 3. startLocationTracking() ye function location send krega time interval ke hisab se
//    aur agar net off hoga to Async me store krega aur jaise net aaega to wo bhi send krega

import AsyncStorage from "@react-native-async-storage/async-storage";
import Geolocation from "react-native-geolocation-service";
import NetInfo from "@react-native-community/netinfo";
import axiosInstance from "../TokenHandling/axiosInstance";
import DeviceInfo from "react-native-device-info";

let locationInterval = null;
let userId = null;
let unsubscribeNetInfo = null;

// ✅ /me/ call
export const fetchMe = async () => {
  try {
    const res = await axiosInstance.get("/me/");
    console.log("Updated /me/:", res.data);
    await AsyncStorage.setItem("meData", JSON.stringify(res.data));
    if (res.data?.id) {
      await AsyncStorage.setItem("userId", res.data.id.toString());
      userId = res.data.id;
    }
  } catch (err) {
    console.log("Error fetching /me/:", err.response?.data || err.message);
  }
};

// ✅ /location-log-config/ call
export const fetchLocationConfig = async () => {
  try {
    const res = await axiosInstance.get("/location-log-config/");
    console.log("Location Config:", res.data);
    if (res.data?.[0]?.refresh_interval) {
      startLocationTracking(res.data[0].refresh_interval);
    }
  } catch (err) {
    console.log("Location Config Error:", err.response?.data || err.message);
  }
};

// ✅ location tracking interval
export const startLocationTracking = (intervalSec) => {
  if (locationInterval) clearInterval(locationInterval); // duplicate avoid

  // NetInfo listener add (sirf ek hi bar add karna hai)
  if (!unsubscribeNetInfo) {
    unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        console.log("🌐 Internet is back, syncing offline locations...");
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
          console.log("⚠️ userId not found, skipping location post");
          return;
        }
        const batteryLevel = await DeviceInfo.getBatteryLevel();
        const payload = {
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
          battery_level: Math.round(batteryLevel * 100),
          user: userId,
        };

        console.log("Posting location:", payload);

        try {
          await axiosInstance.post("/locations/", payload);
          console.log("✅ Location posted");
        } catch (err) {
          console.log("❌ Location post failed, saving offline:", err.message);
          saveOfflineLocation(payload);
        }
      },
      (err) => console.log("Location error:", err.message),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, intervalSec * 1000);
};

// ✅ offline save
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

// ✅ sync offline data
export const syncOfflineLocations = async () => {
  try {
    let stored = await AsyncStorage.getItem("offlineLocations");
    if (stored) {
      let locations = JSON.parse(stored);
      for (let loc of locations) {
        try {
          await axiosInstance.post("/locations/", loc);
          console.log("📤 Offline location synced:", loc);
        } catch (err) {
          console.log("❌ Failed to sync:", err.message);
          return; // agar fail hua to baaki retry next time
        }
      }
      await AsyncStorage.removeItem("offlineLocations"); // all synced
    }
  } catch (err) {
    console.log("Error syncing offline locations:", err);
  }
};

// ✅ stop tracking (logout/unmount)
export const stopLocationTracking = () => {
  if (locationInterval) {
    clearInterval(locationInterval);
    locationInterval = null;
  }
  if (unsubscribeNetInfo) {
    unsubscribeNetInfo(); // listener hatao
    unsubscribeNetInfo = null;
  }
};

