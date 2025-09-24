// LocationBridge.js (robust, returns bools, supports session sid)
import { NativeModules, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { LocationServiceBridge } = NativeModules;

const normalize = (s) => {
  if (!s) return null;
  return typeof s === "string" && s.startsWith("Bearer ")
    ? s.replace(/^Bearer\s+/i, "")
    : s;
};

const hasNative = () => !!LocationServiceBridge;

export const startNativeTracking = (intervalSec = 5) => {
  console.log("LocationBridge.startNativeTracking called with:", intervalSec);
  try {
    if (!hasNative()) {
      console.warn("LocationServiceBridge native module not found (startNativeTracking)");
      return false;
    }
    if (typeof LocationServiceBridge.updateInterval === "function") {
      LocationServiceBridge.updateInterval(intervalSec);
      console.log("Called native updateInterval");
    }
    if (Platform.OS === "android") {
      if (typeof LocationServiceBridge.startService === "function") {
        LocationServiceBridge.startService(intervalSec);
        console.log("Called android startService");
      } else {
        console.warn("android startService not present");
      }
    } else {
      if (typeof LocationServiceBridge.startTracking === "function") {
        LocationServiceBridge.startTracking();
        console.log("Called ios startTracking");
      } else {
        console.warn("ios startTracking not present");
      }
    }
    return true;
  } catch (e) {
    console.error("startNativeTracking error:", e);
    return false;
  }
};

export const stopNativeTracking = () => {
  try {
    if (!hasNative()) return false;
    if (Platform.OS === "android" && typeof LocationServiceBridge.stopService === "function") {
      LocationServiceBridge.stopService();
    } else if (Platform.OS === "ios" && typeof LocationServiceBridge.stopTracking === "function") {
      LocationServiceBridge.stopTracking();
    } else if (typeof LocationServiceBridge.stopService === "function") {
      LocationServiceBridge.stopService();
    } else {
      console.warn("stop method not present on native module");
    }
    return true;
  } catch (e) {
    console.error("stopNativeTracking error:", e);
    return false;
  }
};

export const setNativeAuth = async (token, uid) => {
  try {
    if (!hasNative()) {
      console.warn("setNativeAuth: native module missing");
      return false;
    }
    const t = normalize(token);
    let ok = false;
    if (t && typeof LocationServiceBridge.setAuthToken === "function") {
      await LocationServiceBridge.setAuthToken(t);
      console.log("setAuthToken called on native (prefix):", t.substring(0, 20));
      ok = true;
    } else {
      console.warn("setAuthToken not available or token empty");
    }
    if (uid && typeof LocationServiceBridge.setUserId === "function") {
      await LocationServiceBridge.setUserId(String(uid));
      console.log("setUserId called on native:", uid);
      ok = true;
    } else {
      console.warn("setUserId not available or uid empty");
    }
    return ok;
  } catch (e) {
    console.error("setNativeAuth error:", e);
    return false;
  }
};

export const setNativeRefresh = async (refresh) => {
  try {
    if (!hasNative()) {
      console.warn("setNativeRefresh: native module missing");
      return false;
    }
    const r = normalize(refresh);
    if (r && typeof LocationServiceBridge.setRefreshToken === "function") {
      await LocationServiceBridge.setRefreshToken(r);
      console.log("setRefreshToken called on native (prefix):", r.substring(0, 20));
      return true;
    } else {
      console.warn("setRefreshToken not available or refresh empty");
      return false;
    }
  } catch (e) {
    console.error("setNativeRefresh error:", e);
    return false;
  }
};

/**
 * Set session sid (cookie) on native side, if native supports it.
 * Returns true if native setter existed and was called.
 */
export const setNativeSession = async (sid) => {
  try {
    if (!hasNative()) {
      console.warn("setNativeSession: native module missing");
      return false;
    }
    if (!sid) {
      console.log("setNativeSession: no sid provided");
      return false;
    }
    if (typeof LocationServiceBridge.setSessionCookie === "function") {
      await LocationServiceBridge.setSessionCookie(sid);
      console.log("setSessionCookie called on native (prefix):", sid.substring(0, 20));
      return true;
    } else {
      console.log("setNativeSession: native has no setSessionCookie method");
      return false;
    }
  } catch (e) {
    console.error("setNativeSession error:", e);
    return false;
  }
};

/**
 * Read tokens, refresh and sid from AsyncStorage and push to native where possible.
 * Returns true if any native setter was successfully invoked.
 */
export const setAuthFromStorage = async (userId) => {
  try {
    if (!hasNative()) {
      console.warn("setAuthFromStorage: native module missing");
      return false;
    }
    const stored = await AsyncStorage.getItem("accessToken");
    const refreshStored = await AsyncStorage.getItem("refreshToken");
    const sidStored = await AsyncStorage.getItem("sid");

    const token = normalize(stored);
    const refresh = normalize(refreshStored);

    let ok = false;
    if (token && typeof LocationServiceBridge.setAuthToken === "function") {
      await LocationServiceBridge.setAuthToken(token);
      console.log("setAuthToken called from setAuthFromStorage (prefix):", token.substring(0, 20));
      ok = true;
    } else {
      console.log("No accessToken in AsyncStorage or native setter missing");
    }
    if (refresh && typeof LocationServiceBridge.setRefreshToken === "function") {
      await LocationServiceBridge.setRefreshToken(refresh);
      console.log("setRefreshToken called from setAuthFromStorage (prefix):", refresh.substring(0, 20));
      ok = true;
    } else {
      console.log("No refreshToken in AsyncStorage or native setter missing");
    }
    if (userId && typeof LocationServiceBridge.setUserId === "function") {
      await LocationServiceBridge.setUserId(String(userId));
      console.log("setUserId called from setAuthFromStorage:", userId);
      ok = true;
    } else {
      console.log("No userId provided or native setUserId missing");
    }

    if (sidStored) {
      const sessionOk = await setNativeSession(sidStored);
      if (sessionOk) {
        ok = true;
        console.log("setAuthFromStorage: session sid forwarded to native");
      } else {
        console.log("setAuthFromStorage: native did not accept session sid");
      }
    } else {
      console.log("No sid in AsyncStorage to pass to native");
    }

    return ok;
  } catch (e) {
    console.error("setAuthFromStorage error:", e);
    return false;
  }
};

export default {
  startNativeTracking,
  stopNativeTracking,
  setNativeAuth,
  setNativeRefresh,
  setNativeSession,
  setAuthFromStorage,
};




// src/native/LocationBridge.js
// import { NativeModules, Platform } from "react-native";
// import { sendTokenToNative } from "./sendTokenToNative";
// import AsyncStorage from "@react-native-async-storage/async-storage";

// const { LocationServiceBridge } = NativeModules;

// console.log("===DBG=== LocationBridge loaded. Platform:", Platform.OS);
// console.log("===DBG=== Native LocationServiceBridge:", !!LocationServiceBridge, LocationServiceBridge);

// // helper to normalize token (raw)
// const normalize = (s) => {
//   if (!s) return null;
//   return typeof s === "string" && s.startsWith("Bearer ")
//     ? s.replace(/^Bearer\s+/i, "")
//     : s;
// };

// export const startNativeTracking = (intervalSec) => {
//   console.log("===DBG=== startNativeTracking called. interval:", intervalSec);
//   try {
//     if (!LocationServiceBridge) {
//       console.warn("===DBG=== LocationServiceBridge native module not found (startNativeTracking)");
//       return;
//     }
//     if (typeof LocationServiceBridge.updateInterval === "function") {
//       LocationServiceBridge.updateInterval(intervalSec);
//       console.log("===DBG=== Called native updateInterval");
//     }

//     if (Platform.OS === "android") {
//       if (typeof LocationServiceBridge.startService === "function") {
//         LocationServiceBridge.startService(intervalSec);
//         console.log("===DBG=== Called android startService");
//       } else {
//         console.warn("===DBG=== android startService not present");
//       }
//     } else {
//       if (typeof LocationServiceBridge.startTracking === "function") {
//         LocationServiceBridge.startTracking();
//         console.log("===DBG=== Called ios startTracking");
//       } else {
//         console.warn("===DBG=== ios startTracking not present");
//       }
//     }
//   } catch (e) {
//     console.error("===DBG=== startNativeTracking error:", e);
//   }
// };

// export const updateNativeInterval = (intervalSec) => {
//   console.log("===DBG=== updateNativeInterval called:", intervalSec);
//   try {
//     if (!LocationServiceBridge) {
//       console.warn("===DBG=== LocationServiceBridge native module not found (updateNativeInterval)");
//       return;
//     }
//     if (typeof LocationServiceBridge.updateInterval === "function") {
//       LocationServiceBridge.updateInterval(intervalSec);
//       console.log("===DBG=== Native updateInterval called");
//     } else {
//       console.warn("===DBG=== updateInterval not present on native module");
//     }
//   } catch (e) {
//     console.error("===DBG=== updateNativeInterval error:", e);
//   }
// };

// export const stopNativeTracking = () => {
//   console.log("===DBG=== stopNativeTracking called");
//   try {
//     if (!LocationServiceBridge) {
//       console.warn("===DBG=== LocationServiceBridge native module not found (stop)");
//       return;
//     }
//     if (Platform.OS === "android" && typeof LocationServiceBridge.stopService === "function") {
//       LocationServiceBridge.stopService();
//       console.log("===DBG=== Called android stopService");
//     } else if (Platform.OS === "ios" && typeof LocationServiceBridge.stopTracking === "function") {
//       LocationServiceBridge.stopTracking();
//       console.log("===DBG=== Called ios stopTracking");
//     } else if (typeof LocationServiceBridge.stopService === "function") {
//       LocationServiceBridge.stopService();
//       console.log("===DBG=== Called generic stopService");
//     } else {
//       console.warn("===DBG=== stop method not present on native module");
//     }
//   } catch (e) {
//     console.error("===DBG=== stopNativeTracking error:", e);
//   }
// };

// // set token & uid directly from JS (token should be raw token, without "Bearer ")
// export const setNativeAuth = async (token, uid) => {
//   try {
//     if (!LocationServiceBridge) {
//       console.warn("===DBG=== LocationServiceBridge not available (setNativeAuth)");
//       return;
//     }
//     const t = normalize(token);
//     if (t && typeof LocationServiceBridge.setAuthToken === "function") {
//       await LocationServiceBridge.setAuthToken(t);
//       console.log("===DBG=== setAuthToken called (prefix):", t.substring(0, 20));
//     } else {
//       console.warn("===DBG=== setAuthToken not available or token empty");
//     }

//     if (uid && typeof LocationServiceBridge.setUserId === "function") {
//       await LocationServiceBridge.setUserId(String(uid));
//       console.log("===DBG=== setUserId called:", uid);
//     } else {
//       console.warn("===DBG=== setUserId not available or uid empty");
//     }
//   } catch (e) {
//     console.error("===DBG=== setNativeAuth error:", e);
//   }
// };

// // set refresh token in native (so native can refresh itself)
// export const setNativeRefresh = async (refresh) => {
//   try {
//     if (!LocationServiceBridge) {
//       console.warn("===DBG=== LocationServiceBridge not available (setNativeRefresh)");
//       return;
//     }
//     const r = normalize(refresh);
//     if (r && typeof LocationServiceBridge.setRefreshToken === "function") {
//       await LocationServiceBridge.setRefreshToken(r);
//       console.log("===DBG=== setRefreshToken called (prefix):", r.substring(0, 20));
//     } else {
//       console.warn("===DBG=== setRefreshToken not available or refresh empty");
//     }
//   } catch (e) {
//     console.error("===DBG=== setNativeRefresh error:", e);
//   }
// };

// // clear persisted token/user in native side (if native exposes clear methods)
// export const clearNativeAuth = async () => {
//   try {
//     if (!LocationServiceBridge) {
//       console.warn("===DBG=== LocationServiceBridge not available (clearNativeAuth)");
//       return;
//     }
//     if (typeof LocationServiceBridge.clearAuthToken === "function") {
//       LocationServiceBridge.clearAuthToken();
//       console.log("===DBG=== clearAuthToken called");
//     } else {
//       console.warn("===DBG=== clearAuthToken not present on native module");
//     }
//     if (typeof LocationServiceBridge.clearUserId === "function") {
//       LocationServiceBridge.clearUserId();
//       console.log("===DBG=== clearUserId called");
//     } else {
//       console.warn("===DBG=== clearUserId not present on native module");
//     }
//     if (typeof LocationServiceBridge.clearRefreshToken === "function") {
//       LocationServiceBridge.clearRefreshToken();
//       console.log("===DBG=== clearRefreshToken called");
//     } else {
//       console.warn("===DBG=== clearRefreshToken not present on native module");
//     }
//   } catch (e) {
//     console.error("===DBG=== clearNativeAuth error:", e);
//   }
// };

// // convenience: read token from AsyncStorage and send to native (you already have similar sendTokenToNative)
// export const setAuthFromStorage = async (userId) => {
//   try {
//     if (!LocationServiceBridge) {
//       console.warn("===DBG=== LocationServiceBridge not available (setAuthFromStorage)");
//       return;
//     }
//     // try to reuse existing sendTokenToNative logic if present
//     if (typeof sendTokenToNative === "function") {
//       return sendTokenToNative(userId);
//     }

//     // fallback: read token & send
//     const stored = await AsyncStorage.getItem("accessToken");
//     const refreshStored = await AsyncStorage.getItem("refreshToken");

//     if (!stored && !refreshStored) {
//       console.warn("===DBG=== No accessToken or refreshToken in AsyncStorage");
//       return;
//     }

//     const token = normalize(stored);
//     const refresh = normalize(refreshStored);

//     if (token) {
//       await setNativeAuth(token, userId);
//     }
//     if (refresh) {
//       await setNativeRefresh(refresh);
//     }
//   } catch (e) {
//     console.warn("===DBG=== setAuthFromStorage error:", e);
//   }
// };

// // in your LocationBridge JS - safer promise call with optional chaining
// export const syncOfflineFromJS = async () => {
//   try {
//     if (!LocationServiceBridge) {
//       console.warn("===DBG=== Native module not available (syncOfflineFromJS)");
//       return;
//     }

//     // If native method is promise-based, call and await it
//     if (typeof LocationServiceBridge.syncOffline === "function") {
//       // some RN setups expose promises directly, others via dispatch — handle both
//       const res = LocationServiceBridge.syncOffline();
//       if (res && typeof res.then === "function") {
//         await res;
//       }
//       console.log("===DBG=== Native offline sync requested");
//       return;
//     }

//     // fallback: maybe there's a simple syncOfflineSimple method
//     if (typeof LocationServiceBridge.syncOfflineSimple === "function") {
//       LocationServiceBridge.syncOfflineSimple();
//       console.log("===DBG=== Called syncOfflineSimple (no promise)");
//       return;
//     }

//     console.warn("===DBG=== syncOffline not available on native module");
//   } catch (e) {
//     console.warn("===DBG=== syncOfflineFromJS error", e);
//   }
// };

// export default {
//   startNativeTracking,
//   updateNativeInterval,
//   stopNativeTracking,
//   setNativeAuth,
//   setNativeRefresh,
//   clearNativeAuth,
//   setAuthFromStorage,
//   sendTokenToNative, // your existing function (if present)
//   syncOfflineFromJS
// };
