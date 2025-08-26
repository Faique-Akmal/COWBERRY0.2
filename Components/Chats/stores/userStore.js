import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useUserStore = create((set, get) => ({
  me: null, // { id, name, avatar, ... }

  loadMe: async () => {
    try {
      const raw = await AsyncStorage.getItem('meUser');
      if (raw) set({ me: JSON.parse(raw) });
    } catch (e) {
      console.log('loadMe error', e);
    }
  },

  setMe: async (me) => {
    set({ me });
    try {
      await AsyncStorage.setItem('meUser', JSON.stringify(me));
    } catch (e) {
      console.log('setMe error', e);
    }
  },
}));
