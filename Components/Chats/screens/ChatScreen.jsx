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

// export default function ChatScreen({ route }) {
//   const { chatInfo } = route.params;
//   const { sendJson, typingStatus, connect } = useSocketStore();
//   const { messagesByChatId, loadMessages } = useMessageStore();

//   const [input, setInput] = useState("");
//   const [replyTo, setReplyTo] = useState(null);
//   const flatListRef = useRef(null);
//   const [myUserId, setMyUserId] = useState(null);

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
//   const renderMessage = ({ item }) => {
//     const isMe = item.sender === myUserId;
//     console.log("💬 Msg Sender:", item.sender, "| MyID:", myUserId);
//     return (
//       <View
//         style={[
//           styles.msgContainer,
//           { alignSelf: isMe ? "flex-end" : "flex-start" },
//         ]}
//       >
//         {!isMe && (
//           <Text style={styles.username}>{item.sender_username}</Text>
//         )}
//         <View
//           style={[
//             styles.msgBubble,
//             { backgroundColor: isMe ? "#DCF8C6" : "#FFF" },
//           ]}
//         >
//           <Text style={styles.msgText}>{item.content}</Text>
//         </View>
//       </View>
//     );
//   };

//   return (
//     <ImageBackground
//       source={require("../../images/123.png")} // 👈 apna image yaha daalo
//       style={{ flex: 1 }}
//       resizeMode="cover"
//     >
//          {Object.entries(typingStatus || {}).map(([userId, isTyping]) =>
//         isTyping ? (
//           <Text key={userId} style={{ padding: 4, fontStyle: "italic", color: "gray" }}>
//             {userId} is typing...
//           </Text>
//         ) : null
//       )}
//       <FlatList
//         ref={flatListRef}
//         data={messages}
//         keyExtractor={(item, index) => `${item.id}-${index}`}
//         renderItem={renderMessage}
//         contentContainerStyle={{ padding: 10 }}
//       />

//       {replyTo && (
//         <View style={styles.replyBox}>
//           <Text>Replying to: {replyTo.content}</Text>
//           <TouchableOpacity onPress={() => setReplyTo(null)}>
//             <Text style={{ color: "red" }}>Cancel</Text>
//           </TouchableOpacity>
//         </View>
//       )}

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
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMessageStore } from "../stores/messageStore";
import { useSocketStore } from "../stores/socketStore";
import axiosInstance from "../../TokenHandling/axiosInstance";
import TypingIndicator from "../components/TypingIndicator"; 

export default function ChatScreen({ route }) {
  const { chatInfo } = route.params;
  const { sendJson, typingStatus, connect } = useSocketStore();
  const { messagesByChatId, loadMessages } = useMessageStore();

  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const flatListRef = useRef(null);
  const [myUserId, setMyUserId] = useState(null);

  const chatKey = `${chatInfo.chatId}-${chatInfo.chatType}`;
  const messages = messagesByChatId[chatKey] || [];

useEffect(() => {
    // Get userId from AsyncStorage
    AsyncStorage.getItem("userId").then((id) => {
      console.log("📌 Stored User ID:", id);
      if (id) setMyUserId(parseInt(id, 10)); // number me convert karna zaruri hai
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

  // 🎨 Render styled message
  const renderMessage = ({ item }) => {
    const isMe = item.sender === myUserId;
    // console.log("💬 Msg Sender:", item.sender, "| MyID:", myUserId);
    return (
      <View
        style={[
          styles.msgContainer,
          { alignSelf: isMe ? "flex-end" : "flex-start" },
        ]}
      >
        {!isMe && (
          <Text style={styles.username}>{item.sender_username}</Text>
        )}
        <View
          style={[
            styles.msgBubble,
            { backgroundColor: isMe ? "#DCF8C6" : "#FFF" },
          ]}
        >
          <Text style={styles.msgText}>{item.content}</Text>
        </View>
      </View>
    );
  };

  return (
    <ImageBackground
      source={require("../../images/123.png")} // 👈 apna image yaha daalo
      style={{ flex: 1 }}
      resizeMode="cover"
    >
       {/* 👇 Typing Indicator yaha use karo */}
    <TypingIndicator typingUsers={typingStatus} currentUser={myUserId?.toString()} />
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={renderMessage}
        contentContainerStyle={{ padding: 10 }}
      />

      {/* {replyTo && (
        <View style={styles.replyBox}>
          <Text>Replying to: {replyTo.content}</Text>
          <TouchableOpacity onPress={() => setReplyTo(null)}>
            <Text style={{ color: "red" }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )} */}

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

   
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  msgContainer: {
    marginVertical: 6,
    maxWidth: "80%",
    
  },
  username: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
    marginLeft: 5,
    backgroundColor:"#377355",
    width:50,
    textAlign:"center",
    paddingVertical:1,
    borderRadius:5,
    overflow:"hidden"
  },
  msgBubble: {
    padding: 12,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    
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
  replyBox: { padding: 8, backgroundColor: "#f0f0f0" },
});
