// utils/tokenRefresher.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '@env'; 

export const startTokenRefreshInterval = () => {
  const refreshInterval = 25 * 60 * 1000; // 25 min

  const intervalId = setInterval(async () => {
    console.log('Token refresh interval triggered');

    const refreshToken = await AsyncStorage.getItem('refreshToken'); 
    console.log("Refresh token available?", !!refreshToken);

    if (refreshToken) {
      try {
        const res = await axios.post(`${API_URL}/token/refresh/`, {
          refresh: refreshToken,
        });

        const newAccessToken = res.data.access;
        await AsyncStorage.setItem('accessToken', newAccessToken); 
        console.log('Access token refreshed in background');
      } catch (error) {
        console.error('Refresh token failed:', error);
        // await AsyncStorage.clear();
        // Optionally navigate to login screen here
      }
    }
  }, refreshInterval);

  return intervalId;
};
