// import React, { useEffect, useState, useCallback, useRef } from "react";
// import {
//   View,
//   TextInput,
//   TouchableOpacity,
//   FlatList,
//   Text,
//   StyleSheet,
//   ImageBackground,
// } from "react-native";
// import Ionicons from "react-native-vector-icons/Ionicons";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { useMessageStore } from "../stores/messageStore";
// import { useSocketStore } from "../stores/socketStore";
// import axiosInstance from "../../TokenHandling/axiosInstance";
// import TypingIndicator from "../components/TypingIndicator"; 
// import ChatBubble from "../components/ChatBubble";
// import { useRoute } from "@react-navigation/native";

// export default function ChatScreen({ route }) {
//   const { chatInfo } = route.params;
//   const { sendJson, typingStatus, connect } = useSocketStore();
//   const { messagesByChatId, loadMessages } = useMessageStore();

//   const [input, setInput] = useState("");
//   const [replyTo, setReplyTo] = useState(null);
//   const flatListRef = useRef(null);
//   const [myUserId, setMyUserId] = useState(null);
//   const [editingMsg, setEditingMsg] = useState(null);

//   const chatKey = `${chatInfo.chatId}-${chatInfo.chatType}`;
//   const messages = messagesByChatId[chatKey] || [];


// useEffect(() => {
//     // Get userId from AsyncStorage
//     AsyncStorage.getItem("userId").then((id) => {
//       console.log("📌 Stored User ID:", id);
//       if (id) setMyUserId(parseInt(id, 10)); // number me convert karna zaruri hai
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

  

  

//   // 🎨 Render styled message
//   // const renderMessage = ({ item }) => {
//   //   const isMe = item.sender === myUserId;
//   //   // console.log("💬 Msg Sender:", item.sender, "| MyID:", myUserId);
//   //   return (
//   //     <View
//   //       style={[
//   //         styles.msgContainer,
//   //         { alignSelf: isMe ? "flex-end" : "flex-start" },
//   //       ]}
//   //     >
//   //       {!isMe && (
//   //         <Text style={styles.username}>{item.sender_username}</Text>
//   //       )}
//   //       <View
//   //         style={[
//   //           styles.msgBubble,
//   //           { backgroundColor: isMe ? "#DCF8C6" : "#FFF" },
//   //         ]}
//   //       >
//   //         <Text style={styles.msgText}>{item.content}</Text>
//   //       </View>
//   //     </View>
//   //   );
//   // };

//   const renderMessage = ({ item }) => {
//   const isMe = item.sender === myUserId;
//   return <ChatBubble msg={item} isMe={isMe} styles={styles} />;
// };

//   return (
//     <ImageBackground
//       source={require("../../images/123.png")} 
//       style={{ flex: 1 }}
//       resizeMode="cover"
//     >
//       <View
//     style={{
//       ...StyleSheet.absoluteFillObject,
//       backgroundColor: "rgba(0,0,0,0.1)", 
//     }}
//   />
//        {/* 👇 Typing Indicator yaha use karo */}
//     <TypingIndicator typingUsers={typingStatus} currentUser={myUserId?.toString()} />
//       <FlatList
//         ref={flatListRef}
//         data={messages}
//         keyExtractor={(item, index) => `${item.id}-${index}`}
//         renderItem={renderMessage}
//         contentContainerStyle={{ padding: 10 }}
//       />

//       {/* {replyTo && (
//         <View style={styles.replyBox}>
//           <Text>Replying to: {replyTo.content}</Text>
//           <TouchableOpacity onPress={() => setReplyTo(null)}>
//             <Text style={{ color: "red" }}>Cancel</Text>
//           </TouchableOpacity>
//         </View>
//       )} */}

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

   
//     </ImageBackground>
//   );
// }

// const styles = StyleSheet.create({
//   msgContainer: {
//     marginVertical: 6,
//     maxWidth: "80%",
    
//   },
//   username: {
//     fontSize: 12,
//     fontWeight: "600",
//     color: "#fff",
//     marginBottom: 2,
//     marginLeft: 5,
//     backgroundColor:"#377355",
//     width:50,
//     textAlign:"center",
//     paddingVertical:1,
//     borderRadius:5,
//     overflow:"hidden"
//   },
//   msgBubble: {
//     padding: 12,
//     borderRadius: 10,
//     shadowColor: "#000",
//     shadowOpacity: 0.1,
//     shadowRadius: 2,
//     elevation: 1,
    
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
//     borderTopColor:"#000",
//     borderTopWidth:1
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
//   replyBox: { padding: 8, backgroundColor: "#f0f0f0" },
// });


import React, { useEffect, useState, useCallback, useRef } from "react";
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
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMessageStore } from "../stores/messageStore";
import { useSocketStore } from "../stores/socketStore";
import axiosInstance from "../../TokenHandling/axiosInstance";
import TypingIndicator from "../components/TypingIndicator"; 
import ChatBubble from "../components/ChatBubble";
import { useNavigation } from "@react-navigation/native";

export default function ChatScreen({ route }) {
  const { chatInfo } = route.params;
  const { sendJson, typingStatus, connect } = useSocketStore();
  const { messagesByChatId, loadMessages } = useMessageStore();
  const navigation = useNavigation();

  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [myUserId, setMyUserId] = useState(null);
  const [showMembers, setShowMembers] = useState(false); 
  const flatListRef = useRef(null);

  const chatKey = `${chatInfo.chatId}-${chatInfo.chatType}`;
  const messages = messagesByChatId[chatKey] || [];

  useEffect(() => {
  console.log("ChatScreen chatInfo:", chatInfo);
}, [chatInfo]);


  useEffect(() => {
    AsyncStorage.getItem("userId").then((id) => {
      if (id) setMyUserId(parseInt(id, 10));
    });
  }, []);

  useEffect(() => {
    connect(chatInfo);
  }, [chatInfo]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        let res;
        if (chatInfo.chatType === "group") {
          res = await axiosInstance.get(`/chat/messages/group/${chatInfo.chatId}/`);
        } else {
          res = await axiosInstance.get(`/chat/messages/personal/${chatInfo.chatId}/`);
        }
        loadMessages(chatKey, res.data);
      } catch (err) {
        console.log("fetchHistory error", err);
      }
    };
    fetchHistory();
  }, [chatInfo.chatId]);

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleTyping = useCallback(() => {
    sendJson({
      type: "typing",
      is_typing: input.trim().length > 0,
      group_id: chatInfo.chatType === "group" ? chatInfo.chatId : null,
      receiver_id: chatInfo.chatType === "personal" ? chatInfo.chatId : null,
    });
  }, [input, chatInfo]);

  const sendMessage = useCallback(() => {
    if (!input.trim()) return;
    const payload = {
      type: "send_message",
      content: input.trim(),
      group_id: chatInfo.chatType === "group" ? chatInfo.chatId : null,
      receiver_id: chatInfo.chatType === "personal" ? chatInfo.chatId : null,
      parent_id: replyTo?.id || null,
    };
    sendJson(payload);
    setInput("");
    setReplyTo(null);
  }, [input, chatInfo, replyTo]);

  const renderMessage = ({ item }) => {
    const isMe = item.sender === myUserId;
    return <ChatBubble msg={item} isMe={isMe} styles={styles} />;
  };

  return (
    <ImageBackground
      source={require("../../images/123.png")} 
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <View
        style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: "rgba(0,0,0,0.1)", 
        }}
      />

      {/* ✅ Custom Header */}
      <View style={styles.header}>
        {/* Back Button */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 10 }}>
          <Ionicons name="arrow-back" size={26} color="#333" />
        </TouchableOpacity>

        {/* Chat Name */}
        <Text style={styles.headerTitle}>{chatInfo.chatName}</Text>

        {/* Right side (only for group) */}
        {chatInfo.chatType === "group" && (
          <View style={styles.headerRight}>
            <Text style={styles.groupInfoText}>Group Info</Text>
            <TouchableOpacity onPress={() => setShowMembers(true)}>
              <Ionicons name="people-circle" size={28} color="#333" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 👇 Typing Indicator */}
      <TypingIndicator typingUsers={typingStatus} currentUser={myUserId?.toString()} />

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={renderMessage}
        contentContainerStyle={{ padding: 10 }}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={(text) => {
            setInput(text);
            handleTyping();
          }}
          placeholder="Type a message..."
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        <TouchableOpacity onPress={sendMessage}>
          <Ionicons name="send" size={24} color="#377355" />
        </TouchableOpacity>
      </View>

      {/* ✅ Members Modal */}
      <Modal visible={showMembers} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Group Members ({chatInfo.members?.length || 0})</Text>
            <ScrollView>
              {chatInfo.members?.map((m, idx) => (
                <View key={idx} style={styles.memberRow}>
                  <Image
                    source={{ uri: m.profile_image || "https://cdn-icons-png.flaticon.com/512/149/149071.png" }}
                    style={styles.memberAvatar}
                  />
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
    borderTopColor:"#000",
    borderTopWidth:1
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
