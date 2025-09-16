// ChatScreen.jsx
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Text,
  StyleSheet,
  ImageBackground,
  Modal,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import Feather from "react-native-vector-icons/Feather";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMessageStore } from "../stores/messageStore";
import { useSocketStore } from "../stores/socketStore";
import axiosInstance from "../../TokenHandling/axiosInstance";
import TypingIndicator from "../components/TypingIndicator";
import ChatBubble from "../components/ChatBubble";
import { useNavigation } from "@react-navigation/native";
import debounce from "lodash.debounce";
import FloatingAttachmentMenu from "./FloatingAttachmentMenu";

export default function ChatScreen({ route }) {
  const { chatInfo } = route.params;
  const navigation = useNavigation();

  // --- Zustand selectors (select minimal pieces) ---
  const connect = useSocketStore((s) => s.connect);
  const sendJson = useSocketStore((s) => s.sendJson);
  const typingStatus = useSocketStore((s) => s.typingStatus);
  const loadMessages = useMessageStore((s) => s.loadMessages);

  // memoized key & flags (primitives so deps stable)
  const chatKey = useMemo(() => `${chatInfo.chatId}-${chatInfo.chatType}`, [chatInfo.chatId, chatInfo.chatType]);
  const isGroup = useMemo(() => chatInfo.chatType === "group", [chatInfo.chatType]);

  // stable empty array to avoid returning new [] each render from selector
  const emptyArrRef = useRef([]);

  // select messages WITHOUT falling back to `[]` inside selector (avoid creating new array each render)
  const messagesFromStore = useMessageStore((state) => state.messagesByChatId?.[chatKey]);
  const messages = messagesFromStore ?? emptyArrRef.current;

  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [myUserId, setMyUserId] = useState(null);
  const [showMembers, setShowMembers] = useState(false);
  
  const flatListRef = useRef(null);

  // new: show/hide attachment menu (controlled here, actions handled in component)
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  // prevent re-entrant connects
  const connectedChatRef = useRef(null);

  useEffect(() => {
    AsyncStorage.getItem("userId")
      .then((id) => {
        if (id) setMyUserId(parseInt(id, 10));
      })
      .catch((e) => console.log("AsyncStorage error", e));
  }, []);

  // guarded connect: only call when chat actually changes, avoid repeated connect on re-renders
  useEffect(() => {
    if (!chatInfo?.chatId) return;
    const targetKey = chatKey;
    if (connectedChatRef.current === targetKey) return;
    connectedChatRef.current = targetKey;
    try {
      connect({ chatId: chatInfo.chatId, chatType: chatInfo.chatType });
    } catch (e) {
      console.log("connect error", e);
    }
    return () => {
      if (connectedChatRef.current === targetKey) connectedChatRef.current = null;
    };
  }, [chatInfo.chatId, chatInfo.chatType, chatKey, connect]);

  // fetch history when chatKey changes
  useEffect(() => {
    let cancelled = false;
    const fetchHistory = async () => {
      try {
        let res;
        if (isGroup) {
          res = await axiosInstance.get(`/chat/messages/group/${chatInfo.chatId}/`);
        } else {
          res = await axiosInstance.get(`/chat/messages/personal/${chatInfo.chatId}/`);
        }
        if (!cancelled) {
          if (Array.isArray(res.data)) {
            loadMessages(chatKey, res.data);
          } else {
            console.log("fetchHistory: unexpected data", res.data);
          }
        }
      } catch (err) {
        console.log("fetchHistory error", err);
      }
    };
    if (chatInfo?.chatId) fetchHistory();
    return () => {
      cancelled = true;
    };
  }, [chatKey, chatInfo.chatId, isGroup, loadMessages]);

  // scroll to end when messages length changes
  useEffect(() => {
    if (!flatListRef.current) return;
    try {
      flatListRef.current.scrollToEnd({ animated: true });
    } catch (e) {
      // ignore if not supported
    }
  }, [messages.length]);

  // typing notification: debounce
  const sendTypingRef = useRef(null);
  useEffect(() => {
    sendTypingRef.current = debounce((isTyping) => {
      try {
        sendJson({
          type: "typing",
          is_typing: !!isTyping,
          group_id: isGroup ? chatInfo.chatId : null,
          receiver_id: !isGroup ? chatInfo.chatId : null,
        });
      } catch (e) {
        console.log("sendTyping error", e);
      }
    }, 400);
    return () => {
      sendTypingRef.current?.cancel?.();
      sendTypingRef.current = null;
    };
  }, [isGroup, chatInfo.chatId, sendJson]);

  useEffect(() => {
    const isTyping = input.trim().length > 0;
    sendTypingRef.current?.(isTyping);
  }, [input]);

  const sendMessage = useCallback(() => {
    if (!input.trim()) return;
    const payload = {
      type: "send_message",
      content: input.trim(),
      group_id: isGroup ? chatInfo.chatId : null,
      receiver_id: !isGroup ? chatInfo.chatId : null,
      parent_id: replyTo?.id || null,
    };
    try {
      sendJson(payload);
    } catch (e) {
      console.log("sendJson error", e);
    }
    setInput("");
    setReplyTo(null);
  }, [input, isGroup, chatInfo.chatId, replyTo, sendJson]);

  const renderMessage = ({ item }) => {
    const isMe = item.sender === myUserId;
    return <ChatBubble msg={item} isMe={isMe} styles={styles} />;
  };

  return (
    <ImageBackground source={require("../../images/123.png")} style={{ flex: 1 }} resizeMode="cover">
      <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.1)" }} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={80}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 10 }}>
            <Ionicons name="arrow-back" size={26} color="#377355" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>{chatInfo.chatName}</Text>

          {isGroup && (
            <View style={styles.headerRight}>
              <Text style={styles.groupInfoText}>Group Info</Text>
              <TouchableOpacity onPress={() => setShowMembers(true)}>
                <Ionicons name="people-circle" size={28} color="#333" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TypingIndicator typingUsers={typingStatus} currentUser={myUserId?.toString()} />

        <FlatList ref={flatListRef} data={messages} keyExtractor={(item, index) => `${item.id ?? "idx-" + index}`} renderItem={renderMessage} contentContainerStyle={{ padding: 10 }} />

        {/* Floating Attachment Menu - internal handlers live inside the component.
            ChatScreen only toggles visibility to keep screen clean. */}
        <FloatingAttachmentMenu
          show={showAttachmentMenu}
          toggle={() => setShowAttachmentMenu((s) => !s)}
          bottomOffset={Platform.select({ ios: 130, android: 110 })}
          dropDistance={70}
          chatId={chatInfo.chatId}
         chatType={chatInfo.chatType}
        />

        <View style={styles.inputRow}>
          {/* Quick toggle button to open menu */}
          <TouchableOpacity style={{ marginRight: 8 }} onPress={() => setShowAttachmentMenu((s) => !s)}>
            <MaterialCommunityIcons name="dots-grid" size={30} color="#377355" />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            value={input}
            onChangeText={(text) => {
              setInput(text);
            }}
            placeholder="Type a message..."
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity onPress={sendMessage}>
            <Ionicons name="send" size={24} color="#377355" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={showMembers} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{chatInfo.members?.length || 0} Members</Text>
            <ScrollView>
              {chatInfo.members?.map((m, idx) => (
                <View key={idx} style={styles.memberRow}>
                  <Image source={{ uri: m.profile_image || "https://cdn-icons-png.flaticon.com/512/149/149071.png" }} style={styles.memberAvatar} />
                  <Text style={styles.memberName}>{m.username || `User ${m.id}`}</Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowMembers(false)}>
              <Text style={{ color: "#fff", fontWeight: "600" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#FFF",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  groupInfoText: {
    fontSize: 14,
    color: "#555",
    marginRight: 5,
  },
  msgContainer: {
    marginVertical: 6,
    maxWidth: "80%",
  },
  msgBubble: {
    padding: 12,
    borderRadius: 10,
  },
  msgText: {
    fontSize: 16,
    color: "#000",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: "#fff",
    borderTopColor: "#000",
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#000",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    maxHeight: "70%",
    padding: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  memberName: {
    fontSize: 16,
    color: "#333",
  },
  closeBtn: {
    backgroundColor: "#377355",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
});


// import React, { useEffect, useState, useCallback, useRef } from "react";
// import {
//   View,
//   TextInput,
//   TouchableOpacity,
//   FlatList,
//   Text,
//   StyleSheet,
//   ImageBackground,
//   Modal,
//   ScrollView,
//   Image,
//   KeyboardAvoidingView
// } from "react-native";
// import Ionicons from "react-native-vector-icons/Ionicons";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { useMessageStore } from "../stores/messageStore";
// import { useSocketStore } from "../stores/socketStore";
// import axiosInstance from "../../TokenHandling/axiosInstance";
// import TypingIndicator from "../components/TypingIndicator";
// import ChatBubble from "../components/ChatBubble";
// import { useNavigation } from "@react-navigation/native";

// export default function ChatScreen({ route }) {
//   const { chatInfo } = route.params;
//   const { sendJson, typingStatus, connect } = useSocketStore();
//   const { messagesByChatId, loadMessages } = useMessageStore();
//   const navigation = useNavigation();

//   const [input, setInput] = useState("");
//   const [replyTo, setReplyTo] = useState(null);
//   const [myUserId, setMyUserId] = useState(null);
//   const [showMembers, setShowMembers] = useState(false);
//   const flatListRef = useRef(null);

//   const chatKey = `${chatInfo.chatId}-${chatInfo.chatType}`;
  
//   const messages = useMessageStore(
//   (state) => state.messagesByChatId[chatKey] || []
// );


//   useEffect(() => {
//     console.log("ChatScreen chatInfo:", chatInfo);
//   }, [chatInfo]);


//   useEffect(() => {
//     AsyncStorage.getItem("userId").then((id) => {
//       if (id) setMyUserId(parseInt(id, 10));
//     });
//   }, []);

//   useEffect(() => {
//     connect(chatInfo);
//   }, [chatInfo]);

//   useEffect(() => {
//     const fetchHistory = async () => {
//       try {
//         let res;
//         if (chatInfo.chatType === "group") {
//           res = await axiosInstance.get(`/chat/messages/group/${chatInfo.chatId}/`);
//         } else {
//           res = await axiosInstance.get(`/chat/messages/personal/${chatInfo.chatId}/`);
//         }
//         loadMessages(chatKey, res.data);
//       } catch (err) {
//         console.log("fetchHistory error", err);
//       }
//     };
//     fetchHistory();
//   }, [chatInfo.chatId]);

//   useEffect(() => {
//     flatListRef.current?.scrollToEnd({ animated: true });
//   }, [messages]);

//   const handleTyping = useCallback(() => {
//     sendJson({
//       type: "typing",
//       is_typing: input.trim().length > 0,
//       group_id: chatInfo.chatType === "group" ? chatInfo.chatId : null,
//       receiver_id: chatInfo.chatType === "personal" ? chatInfo.chatId : null,
//     });
//   }, [input, chatInfo]);

//   const sendMessage = useCallback(() => {
//     if (!input.trim()) return;
//     const payload = {
//       type: "send_message",
//       content: input.trim(),
//       group_id: chatInfo.chatType === "group" ? chatInfo.chatId : null,
//       receiver_id: chatInfo.chatType === "personal" ? chatInfo.chatId : null,
//       parent_id: replyTo?.id || null,
//     };
//     sendJson(payload);
//     setInput("");
//     setReplyTo(null);
//   }, [input, chatInfo, replyTo]);

//   const renderMessage = ({ item }) => {
//     const isMe = item.sender === myUserId;
//     return <ChatBubble msg={item} isMe={isMe} styles={styles} />;
//   };

//   return (
//     <ImageBackground
//       source={require("../../images/123.png")}
//       style={{ flex: 1 }}
//       resizeMode="cover"
//     >
//       <View
//         style={{
//           ...StyleSheet.absoluteFillObject,
//           backgroundColor: "rgba(0,0,0,0.1)",
//         }}
//       />

//         {/* ✅ KeyboardAvoidingView Wrap */}
//   <KeyboardAvoidingView
//     style={{ flex: 1 }}
//     behavior={Platform.OS === "ios" ? "padding" : "height"}
//     keyboardVerticalOffset={80} // header ki height jitna offset
//   >

//       {/* ✅ Custom Header */}
//       <View style={styles.header}>
//         {/* Back Button */}
//         <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 10 }}>
//           <Ionicons name="arrow-back" size={26} color="#377355" />
//         </TouchableOpacity>

//         {/* Chat Name */}
//         <Text style={styles.headerTitle}>{chatInfo.chatName}</Text>

//         {/* Right side (only for group) */}
//         {chatInfo.chatType === "group" && (
//           <View style={styles.headerRight}>
//             <Text style={styles.groupInfoText}>Group Info</Text>
//             <TouchableOpacity onPress={() => setShowMembers(true)}>
//               <Ionicons name="people-circle" size={28} color="#333" />
//             </TouchableOpacity>
//           </View>
//         )}
//       </View>

//       {/* 👇 Typing Indicator */}
//       <TypingIndicator typingUsers={typingStatus} currentUser={myUserId?.toString()} />

//       <FlatList
//         ref={flatListRef}
//         data={messages}
//         keyExtractor={(item, index) => `${item.id}-${index}`}
//         renderItem={renderMessage}
//         contentContainerStyle={{ padding: 10 }}
//       />

//       <View style={styles.inputRow}>
//         <TextInput
//           style={styles.input}
//           value={input}
//           onChangeText={(text) => {
//             setInput(text);
//             handleTyping();
//           }}
//           placeholder="Type a message..."
//           onSubmitEditing={sendMessage}
//           returnKeyType="send"
//         />
//         <TouchableOpacity onPress={sendMessage}>
//           <Ionicons name="send" size={24} color="#377355" />
//         </TouchableOpacity>
//       </View>
//       </KeyboardAvoidingView>

//       {/* ✅ Members Modal */}
//       <Modal visible={showMembers} animationType="slide" transparent>
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalContent}>
//             <Text style={styles.modalTitle}>{chatInfo.members?.length || 0} Members</Text>
//             <ScrollView>
//               {chatInfo.members?.map((m, idx) => (
//                 <View key={idx} style={styles.memberRow}>
//                   <Image
//                     source={{ uri: m.profile_image || "https://cdn-icons-png.flaticon.com/512/149/149071.png" }}
//                     style={styles.memberAvatar}
//                   />
//                   <Text style={styles.memberName}>{m.username || `User ${m.id}`}</Text>
//                 </View>
//               ))}
//             </ScrollView>
//             <TouchableOpacity style={styles.closeBtn} onPress={() => setShowMembers(false)}>
//               <Text style={{ color: "#fff", fontWeight: "600" }}>Close</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>
//     </ImageBackground>
//   );
// }

// const styles = StyleSheet.create({
//   header: {
//     paddingHorizontal: 12,
//     paddingVertical: 10,
//     borderBottomWidth: 1,
//     borderColor: "#ddd",
//     backgroundColor: "#FFF",
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//   },
//   headerTitle: {
//     fontSize: 18,
//     fontWeight: "bold",
//     flex: 1,
//   },
//   headerRight: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 6,
//   },
//   groupInfoText: {
//     fontSize: 14,
//     color: "#555",
//     marginRight: 5,
//   },
//   msgContainer: {
//     marginVertical: 6,
//     maxWidth: "80%",
//   },
//   msgBubble: {
//     padding: 12,
//     borderRadius: 10,
//   },
//   msgText: {
//     fontSize: 16,
//     color: "#000",
//   },
//   inputRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     padding: 8,
//     backgroundColor: "#fff",
//     borderTopColor: "#000",
//     borderTopWidth: 1
//   },
//   input: {
//     flex: 1,
//     borderWidth: 1,
//     borderColor: "#000",
//     borderRadius: 10,
//     paddingHorizontal: 15,
//     paddingVertical: 10,
//     marginRight: 8,
//   },
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: "rgba(0,0,0,0.5)",
//     justifyContent: "flex-end",
//   },
//   modalContent: {
//     backgroundColor: "#fff",
//     borderTopLeftRadius: 15,
//     borderTopRightRadius: 15,
//     maxHeight: "70%",
//     padding: 15,
//   },
//   modalTitle: {
//     fontSize: 18,
//     fontWeight: "bold",
//     marginBottom: 12,
//   },
//   memberRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingVertical: 8,
//     borderBottomWidth: 1,
//     borderBottomColor: "#eee",
//   },
//   memberAvatar: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     marginRight: 12,
//   },
//   memberName: {
//     fontSize: 16,
//     color: "#333",
//   },
//   closeBtn: {
//     backgroundColor: "#377355",
//     padding: 12,
//     borderRadius: 8,
//     alignItems: "center",
//     marginTop: 10,
//   },
// });
