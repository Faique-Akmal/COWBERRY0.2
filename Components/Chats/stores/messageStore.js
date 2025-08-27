// import { create } from 'zustand';

// export const useMessageStore = create((set, get) => ({
//   messages: [],

//   loadMessages: (newMessages) => set({ messages: newMessages }),

//   addMessage: (msg) => set((state) => {
//     if (!msg || typeof msg !== 'object' || !msg.id) {
//       console.warn("⚠️ Invalid message ignored:", msg);
//       return state;
//     }

//     if (state.messages.some((m) => m.id === msg.id)) {
//       return state;
//     }

//     return {
//       messages: [...state.messages, msg],
//     };
//   }),

//   editMessage: (id, updatedFields) =>
//     set((state) => ({
//       messages: state.messages.map((msg) =>
//         msg.id === id ? { ...msg, ...updatedFields } : msg
//       ),
//     })),

//   deleteMessage: (id) =>
//     set((state) => ({
//       messages: state.messages.map((msg) =>
//         msg.id === id ? { ...msg, content: "", is_deleted: true } : msg
//       ),
//     })),

//   addReply: (parentId, reply) =>
//     set((state) => ({
//       messages: state.messages.map((msg) =>
//         msg?.id === parentId
//           ? { ...msg, replies: [...(msg.replies || []), reply] }
//           : msg
//       ),
//     })),

//   clearMessages: () => set({ messages: [] }),

//   getMessageById: (id) => {
//     const { messages } = get();
//     return messages.find((msg) => msg.id === id);
//   },
// }));

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const useMessageStore = create(
  persist(
    (set, get) => ({
      // 🔹 Per-chat messages
      messagesByChatId: {}, // { "<chatId>-<type>": [msg1, msg2...] }

      loadMessages: (chatKey, newMessages) =>
        set((state) => ({
          messagesByChatId: {
            ...state.messagesByChatId,
            [chatKey]: newMessages,
          },
        })),

      addMessage: (chatKey, message) =>
        set((state) => ({
          messagesByChatId: {
            ...state.messagesByChatId,
            [chatKey]: [...(state.messagesByChatId[chatKey] || []), message],
          },
        })),

      editMessage: (chatKey, messageId, patch) =>
        set((state) => ({
          messagesByChatId: {
            ...state.messagesByChatId,
            [chatKey]: (state.messagesByChatId[chatKey] || []).map((msg) =>
              msg.id === messageId ? { ...msg, ...patch } : msg
            ),
          },
        })),


      deleteMessage: (chatKey, messageId) =>
        set((state) => ({
          messagesByChatId: {
            ...state.messagesByChatId,
            [chatKey]: (state.messagesByChatId[chatKey] || []).filter(
              (msg) => msg.id !== messageId
            ),
          },
        })),

      clearMessages: (chatKey) =>
        set((state) => {
          const updated = { ...state.messagesByChatId };
          delete updated[chatKey];
          return { messagesByChatId: updated };
        }),

      // 🔹 Global messages (like your old store)
      messages: [],

      addMessageGlobal: (msg) =>
        set((state) => ({ messages: [...state.messages, msg] })),

      clearMessagesGlobal: () => set({ messages: [] }),
    }),
    {
      name: "messages-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
