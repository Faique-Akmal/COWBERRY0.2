// import axios from 'axios';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { jwtDecode } from "jwt-decode";
// import { API_URL } from '@env';


// const axiosInstance = axios.create({
//   baseURL: API_URL,
//   timeout: 10000,
// });

// axiosInstance.interceptors.request.use(
//   async (config) => {
//     try {
//       let token = await AsyncStorage.getItem('accessToken'); // same key jo tum use kar rahe ho
//       const refreshToken = await AsyncStorage.getItem('refreshToken');

//       if (token) {
//         const decoded = jwtDecode(token);
//         const now = Date.now() / 1000;

//         if (decoded.exp < now && refreshToken) {
//           console.log(' Access token expired — refreshing before request...');
//           try {
//             const res = await axios.post(`${API_URL}/token/refresh/`, {
//               refresh: refreshToken,
//             });
//             token = res.data.access;
//             await AsyncStorage.setItem('accessToken', token);
//           } catch (err) {
//             console.log(' Token refresh failed before request', err);
//           }
//         }

//         config.headers.Authorization = `Bearer ${token}`;
//       }
//     } catch (error) {
//       console.log(' Token fetch error:', error);
//     }
//     return config;
//   },
//   (error) => Promise.reject(error)
// );

// export default axiosInstance;


// src/TokenHandling/axiosInstance.js
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import jwtDecode from "jwt-decode";
import { API_URL } from "@env";
import { setNativeAuth } from "../native/LocationBridge";

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// helper to normalize token (raw)
const normalizeToken = (raw) => {
  if (!raw) return null;
  return raw.startsWith("Bearer ") ? raw.replace(/^Bearer\s+/i, "") : raw;
};

const getRawToken = async () => {
  const stored = await AsyncStorage.getItem("accessToken");
  return normalizeToken(stored);
};

// proactive refresh before requests
axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      let token = await getRawToken();
      const refreshToken = await AsyncStorage.getItem("refreshToken");

      if (token) {
        let decoded = null;
        try { decoded = jwtDecode(token); } catch (e) { decoded = null; }

        const now = Date.now() / 1000;
        if ((decoded && decoded.exp && decoded.exp < now) && refreshToken) {
          // refresh using plain axios to avoid interceptor recursion
          console.log("===DBG=== Access token expired — refreshing before request");
          try {
            const r = await axios.post(`${API_URL}/token/refresh/`, { refresh: refreshToken });
            const newAccess = normalizeToken(r.data.access);
            await AsyncStorage.setItem("accessToken", newAccess);
            const uid = await AsyncStorage.getItem("userId");
            await setNativeAuth(newAccess, uid);
            token = newAccess;
            console.log("===DBG=== Token refreshed and native updated (request)");
          } catch (err) {
            console.warn("===DBG=== Token refresh failed in request interceptor", err);
            // optionally handle logout
          }
        }

        if (token) config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn("===DBG=== Request interceptor error:", err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// response interceptor with refresh queue for 401
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve(token);
  });
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // wait for refresh to finish
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers["Authorization"] = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refresh = await AsyncStorage.getItem("refreshToken");
        if (!refresh) throw new Error("No refresh token");

        const r = await axios.post(`${API_URL}/token/refresh/`, { refresh });
        const newAccess = normalizeToken(r.data.access);

        await AsyncStorage.setItem("accessToken", newAccess);

        const uid = await AsyncStorage.getItem("userId");
        await setNativeAuth(newAccess, uid);

        processQueue(null, newAccess);
        isRefreshing = false;

        originalRequest.headers["Authorization"] = `Bearer ${newAccess}`;
        return axiosInstance(originalRequest);
      } catch (err) {
        processQueue(err, null);
        isRefreshing = false;
        // optional: logout user here
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
