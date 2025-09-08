// src/utils/permissions.js
import { Platform, Alert } from "react-native";
import { check, request, openSettings, PERMISSIONS, RESULTS } from "react-native-permissions";

/**
 * Request required location permissions for background tracking.
 * Returns: { ok: boolean, reason?: string }
 */
export async function requestPermissions() {
  if (Platform.OS === "android") {
    const finePermission = PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
    const bgPermission = PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION;

    const fineStatus = await check(finePermission);
    if (fineStatus === RESULTS.BLOCKED) {
      Alert.alert(
        "Permission blocked",
        "Please enable Location permission (Allow all the time) from Settings",
        [{ text: "Open Settings", onPress: () => openSettings() }, { text: "Cancel" }]
      );
      return { ok: false, reason: "fine_blocked" };
    }

    let r1 = fineStatus;
    if (fineStatus !== RESULTS.GRANTED) r1 = await request(finePermission);
    if (r1 !== RESULTS.GRANTED) return { ok: false, reason: "fine_not_granted" };

    const bgStatus = await check(bgPermission);
    if (bgStatus === RESULTS.BLOCKED) {
      Alert.alert(
        "Background location blocked",
        "Please enable Background Location from Settings (Allow all the time)",
        [{ text: "Open Settings", onPress: () => openSettings() }, { text: "Cancel" }]
      );
      return { ok: false, reason: "bg_blocked" };
    }

    let r2 = bgStatus;
    if (bgStatus !== RESULTS.GRANTED) r2 = await request(bgPermission);
    if (r2 !== RESULTS.GRANTED) return { ok: false, reason: "bg_not_granted" };

    return { ok: true };
  } else {
    const whenInUse = PERMISSIONS.IOS.LOCATION_WHEN_IN_USE;
    const always = PERMISSIONS.IOS.LOCATION_ALWAYS;

    const whenStatus = await check(whenInUse);
    if (whenStatus === RESULTS.BLOCKED) {
      Alert.alert(
        "Permission blocked",
        "Please enable Location permission from Settings (While Using the App / Always)",
        [{ text: "Open Settings", onPress: () => openSettings() }, { text: "Cancel" }]
      );
      return { ok: false, reason: "when_blocked" };
    }

    let r1 = whenStatus;
    if (whenStatus !== RESULTS.GRANTED) r1 = await request(whenInUse);
    if (r1 !== RESULTS.GRANTED) return { ok: false, reason: "when_not_granted" };

    const alwaysStatus = await check(always);
    if (alwaysStatus === RESULTS.BLOCKED) {
      Alert.alert(
        "Background location blocked",
        "Please enable 'Always' Location permission from Settings for background tracking",
        [{ text: "Open Settings", onPress: () => openSettings() }, { text: "Cancel" }]
      );
      return { ok: false, reason: "always_blocked" };
    }

    let r2 = alwaysStatus;
    if (alwaysStatus !== RESULTS.GRANTED) r2 = await request(always);
    if (r2 !== RESULTS.GRANTED) return { ok: false, reason: "always_not_granted" };

    return { ok: true };
  }
}
