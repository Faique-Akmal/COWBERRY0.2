// import { create } from 'zustand';
// import { useMessageStore } from './messageStore';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { WS_URL } from '@env';

// export const useSocketStore = create((set, get) => ({
//     socket: null,
//     isConnected: false,
//     typingStatus: {},
//     onlineGroupUsers: [],
//     personalOnlineUsers: {},

//     connect: async (chatInfo) => {
//     const { addMessage, loadMessages, editMessage, deleteMessage } = useMessageStore.getState();

//     // meUser nikalna
//     const meUserJson = await AsyncStorage.getItem("meUser");
//     const meUser = meUserJson ? JSON.parse(meUserJson) : null;
//     const meUserId = meUser?.id;

//     // ✅ Token yaha se lo
//     const token = await AsyncStorage.getItem("accessToken");
//     if (!token) {
//         console.error("❌ No token found in storage, cannot connect WebSocket");
//         return;
//     }

//     const socketUrl = `wss://${WS_URL}/ws/chat/${chatInfo.chatType === "group"
//         ? chatInfo?.chatId
//         : `personal/${chatInfo?.chatId}`
//         }/?token=${token}`;

//     console.log("🔌 Connecting to:", socketUrl);

//     const ws = new WebSocket(socketUrl);

//     ws.onopen = () => {
//         console.log('✅ WebSocket connected');
//         set({ socket: ws, isConnected: true });

//         // Request message history
//         get().sendJson({
//             type: 'message_history',
//             group_id: chatInfo.chatType === "group" ? chatInfo?.chatId : null,
//             receiver_id: chatInfo.chatType === "personal" ? chatInfo?.chatId : null
//         });

//         // Set typing false
//         get().sendJson({
//             type: "typing",
//             is_typing: false,
//         });

//         // Ask online status
//         get().sendJson({
//             type: "get_online_status",
//             group_id: chatInfo.chatType === "group" ? chatInfo.chatId : null,
//             personal_ids: [meUserId]
//         });
//     };

//     ws.onmessage = (event) => {
//         const data = JSON.parse(event.data);
//         console.log('📥 WebSocket message:', data);

//         switch (data?.type) {
//             case 'message_history':
//                 loadMessages(chatInfo.chatId, data?.messages || []);
//                 break;
//             case 'chat_message':
//                 addMessage(chatInfo.chatId, data);
//                 break;
//             case 'edit_message':
//                 editMessage(chatInfo.chatId, data?.id, { content: data?.content, is_edited: data?.is_edited });
//                 break;
//             case 'delete_message':
//                 deleteMessage(chatInfo.chatId, data?.id);
//                 break;
//             case "typing":
//                 set((state) => ({
//                     typingStatus: {
//                         ...state.typingStatus,
//                         [data.user]: data.is_typing,
//                     },
//                 }));
//                 break;
//             case "read_receipt":
//                 console.log(`📨 Message ${data.message_id} read by user ${data.user_id}`);
//                 break;
//             case "online_status":
//                 set({
//                     onlineGroupUsers: data.group_online_users || [],
//                     personalOnlineUsers: data.personal_online_users || {},
//                 });
//                 break;
//             default:
//                 console.warn('🤷‍♂️ Unknown WebSocket type:', data);
//         }
//     };

//     ws.onerror = (err) => {
//         console.error('❌ WebSocket error', err);
//     };

//     ws.onclose = () => {
//         console.log('🔌 WebSocket disconnected');
//         set({ isConnected: false, socket: null });
//     };
// },


//     disconnect: () => {
//         const { socket } = get();

//         if (socket?.readyState === WebSocket.OPEN) {
//             socket.send(JSON.stringify({
//                 type: "typing",
//                 is_typing: false,
//             }));
//             socket.close();
//         }

//         set({ socket: null, isConnected: false });
//     },

//     sendJson: (data) => {
//         const { socket } = get();
//         if (socket?.readyState === WebSocket.OPEN) {
//             socket.send(JSON.stringify(data));
//         } else {
//             console.error('❌ WebSocket is not connected');
//         }
//     },
// }));





import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { WS_URL } from "@env";
import { useMessageStore } from "./messageStore";

export const useSocketStore = create((set, get) => ({
  socket: null,
  isConnected: false,
  typingStatus: {},
  onlineGroupUsers: [],
  personalOnlineUsers: {},

  connect: async (chatInfo) => {
    // ✅ Purana socket disconnect karo
    get().disconnect();

    const token = await AsyncStorage.getItem("accessToken");
    if (!token) {
      console.error("❌ No token found in storage");
      return;
    }

    const socketUrl = `wss://${WS_URL}/ws/chat/${chatInfo.chatType === "group"
      ? chatInfo.chatId
      : `personal/${chatInfo.chatId}`
      }/?token=${token}`;

    console.log("🔌 Connecting to:", socketUrl);

    const ws = new WebSocket(socketUrl);

    ws.onopen = () => {
      console.log("✅ WebSocket connected");
      set({ socket: ws, isConnected: true });
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("📩 WS DATA:", data);

      const { addMessage, loadMessages, editMessage, deleteMessage, clearMessages } =
        useMessageStore.getState();

      switch (data?.type) {
        case "message_history":
          // ✅ Purane clear karo, naye load
          clearMessages(`${chatInfo.chatId}-${chatInfo.chatType}`);
          loadMessages(`${chatInfo.chatId}-${chatInfo.chatType}`, data?.messages || []);
          break;
        case "chat_message":
          addMessage(`${chatInfo.chatId}-${chatInfo.chatType}`, data);
          break;
        case "edit_message":
          editMessage(
            `${chatInfo.chatId}-${chatInfo.chatType}`,
            {
              id: data.id,
              content: data.content,
              is_edited: data.is_edited,
              sender: data.sender,
              sender_username: data.sender_username,
              created_at: data.created_at,
            }
          );
          break;

        case "delete_message":
      // ✅ yahan turant store update karo
      deleteMessage(`${chatInfo.chatId}-${chatInfo.chatType}`, data.message_id || data.id);
      break;


        case "typing":
          set((state) => ({
            typingStatus: { ...state.typingStatus, [data.user]: data.is_typing },
          }));
          break;
        case "online_status":
          set({
            onlineGroupUsers: data.group_online_users || [],
            personalOnlineUsers: data.personal_online_users || {},
          });
          break;
        default:
          console.warn("🤷‍♂️ Unknown WebSocket type:", data);
      }
    };

    ws.onerror = (err) => console.error("❌ WebSocket error", err);

    ws.onclose = () => {
      console.log("🔌 WebSocket disconnected");
      set({ socket: null, isConnected: false });
    };

    set({ socket: ws });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      console.log("🔌 Disconnecting existing socket...");
      // typing off bhej do
      get().sendJson({ type: "typing", is_typing: false });

      socket.close();
      set({ socket: null, isConnected: false });
    }
  },

  sendJson: (data) => {
    const { socket, isConnected } = get();
    if (socket && isConnected) {
      socket.send(JSON.stringify(data));
    } else {
      console.error("❌ WebSocket is not connected");
    }
  },
}));
