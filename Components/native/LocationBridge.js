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
