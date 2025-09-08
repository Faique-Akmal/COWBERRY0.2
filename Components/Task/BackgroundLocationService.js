import BackgroundService from "react-native-background-actions";
import Geolocation from "react-native-geolocation-service";
import axiosInstance from "../TokenHandling/axiosInstance";

let watchId = null;

const options = {
  taskName: "BGLocation",
  taskTitle: "Tracking your location",
  taskDesc: "Location tracking is active",
  taskIcon: { name: "ic_launcher", type: "mipmap" },
  color: "#ff00ff",
  linkingURI: "yourapp://home",
  parameters: {}
};

const bgTask = async () => {
  await new Promise(async (resolve) => {
    watchId = Geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          await axiosInstance.post("/location-update/", { latitude, longitude });
          console.log("📡 Background location sent:", latitude, longitude);
        } catch (err) {
          console.log("❌ BG post error:", err.message);
        }
      },
      (error) => console.log("❌ BG loc error:", error),
      { enableHighAccuracy: true, distanceFilter: 50 }
    );
  });
};

export const startIOSLocationTracking = async () => {
  await BackgroundService.start(bgTask, options);
};

export const stopIOSLocationTracking = async () => {
  if (watchId) Geolocation.clearWatch(watchId);
  await BackgroundService.stop();
};
