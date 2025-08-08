import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { API_URL } from "@env";

export const ensureFreshToken = async () => {
  const accessToken = await AsyncStorage.getItem("accessToken"); // tumhare key ke hisaab se
  const refreshToken = await AsyncStorage.getItem("refreshToken");

  if (!accessToken || !refreshToken) return;

  const decoded = jwtDecode(accessToken);
  const now = Date.now() / 1000;

  if (decoded.exp < now) {
    console.log("♻️ Access token expired on app start — refreshing...");
    try {
      const res = await axios.post(`${API_URL}/token/refresh/`, {
        refresh: refreshToken,
      });
      await AsyncStorage.setItem("accessToken", res.data.access);
    } catch (err) {
      console.log("❌ Initial token refresh failed", err);
    }
  }
};
