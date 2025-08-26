// // utils/axiosInstance.js
// // import axios from 'axios';
// // import AsyncStorage from '@react-native-async-storage/async-storage';
// // import { API_URL } from '@env';

// // const axiosInstance = axios.create({
// //   baseURL: API_URL,
// //   timeout: 10000, // 10 sec
// // });

// // // Automatically attach token to each request
// // axiosInstance.interceptors.request.use(
// //   async (config) => {
// //     const token = await AsyncStorage.getItem('accessToken');
// //     if (token) {
// //       config.headers.Authorization = `Bearer ${token}`;
// //     }
// //     return config;
// //   },
// //   (error) => {
// //     return Promise.reject(error);
// //   }
// // );

// // export default axiosInstance;


// // utils/axiosInstance.js
// import axios from 'axios';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { API_URL } from '@env';

// const axiosInstance = axios.create({
//   baseURL: API_URL,
//   timeout: 10000, // 10 sec
// });

// // Automatically attach token to each request
// axiosInstance.interceptors.request.use(
//   async (config) => {
//     try {
//       const token = await AsyncStorage.getItem('accessToken');
//       console.log('🔐 Interceptor Token:', token); // temp debug
//       if (token) {
//         config.headers.Authorization = `Bearer ${token}`;
//       }
//     } catch (error) {
//       console.log('❌ Token fetch error:', error);
//     }
//     return config;
//   },
//   (error) => {
//     return Promise.reject(error);
//   }
// );


// export default axiosInstance;


import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from "jwt-decode";
import { API_URL } from '@env';


const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      let token = await AsyncStorage.getItem('accessToken'); // same key jo tum use kar rahe ho
      const refreshToken = await AsyncStorage.getItem('refreshToken');

      if (token) {
        const decoded = jwtDecode(token);
        const now = Date.now() / 1000;

        if (decoded.exp < now && refreshToken) {
          console.log(' Access token expired — refreshing before request...');
          try {
            const res = await axios.post(`${API_URL}/token/refresh/`, {
              refresh: refreshToken,
            });
            token = res.data.access;
            await AsyncStorage.setItem('accessToken', token);
          } catch (err) {
            console.log(' Token refresh failed before request', err);
          }
        }

        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.log(' Token fetch error:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default axiosInstance;
