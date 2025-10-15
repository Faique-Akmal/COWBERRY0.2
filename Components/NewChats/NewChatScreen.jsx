// // ChatScreen.js
// import React, { useEffect, useLayoutEffect, useState, useRef } from 'react';
// import { SafeAreaView, View, Text, FlatList, KeyboardAvoidingView, Platform, StyleSheet, ImageBackground } from 'react-native';
// import MessageBubble from './components/MessageBubble';
// import InputBar from './components/InputBar';
// import { makeId, sampleConversations } from './ utils/utils';

// const NewChatScreen = ({ route, navigation }) => {
//   const { convId, conv } = route.params || {};
//   const [messages, setMessages] = useState(conv ? conv.messages : []);
//   const [contact, setContact] = useState(conv ? conv : { name: 'Unknown' });
//   const flatRef = useRef();

//   useLayoutEffect(() => {
//     navigation.setOptions({ title: contact.name });
//   }, [navigation, contact]);

//   useEffect(() => {
//     // just simulating incoming message after 8s for demo
//     const t = setTimeout(() => {
//       const incoming = { id: makeId('m_'), fromMe: false, text: 'Ye demo incoming message hai', time: Date.now(), status: 'delivered' };
//       setMessages(prev => [...prev, incoming]);
//     }, 8000);
//     return () => clearTimeout(t);
//   }, []);

//   const handleSend = (text) => {
//     const newMsg = { id: makeId('out_'), fromMe: true, text, time: Date.now(), status: 'sending' };
//     setMessages(prev => [...prev, newMsg]);
//     // simulate network send
//     setTimeout(() => {
//       setMessages(prev => prev.map(m => (m.id === newMsg.id ? { ...m, status: 'sent' } : m)));
//     }, 1000);
//   };

//   return (
//     <SafeAreaView style={{ flex: 1 }}>

//       <KeyboardAvoidingView
//         style={{ flex: 1 }}
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         keyboardVerticalOffset={Platform.OS === 'ios' ? 44 : 32}
//       >
//         <ImageBackground
//           source={require('../images/123.png')}
//           style={{ flex: 1 }}
//           resizeMode="cover"
//         >
         
//           <FlatList
//             ref={flatRef}
//             data={messages}
//             keyExtractor={m => m.id}
//             renderItem={({ item }) => <MessageBubble msg={item} />}
//             contentContainerStyle={{ paddingVertical: 12 }}
//           />
//           <InputBar onSend={handleSend} />
        
//         </ImageBackground>
//       </KeyboardAvoidingView>

//     </SafeAreaView>
//   );
// };

// export default NewChatScreen;

// const styles = StyleSheet.create({
//   imageOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(255, 255, 255, 0.7)',
//   },
// });



import React, { useState, useRef, useMemo } from "react";
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
  Keyboard,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import Feather from "react-native-vector-icons/Feather";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

/**
 * Props:
 * - chatInfo: { chatId, chatName, chatType, members }
 * - messages: array (most recent last). Each message: { id, text, sender, time }
 * - onBack: () => void
 * - onSend: (text) => void
 * - onToggleAttachments: () => void
 * - showAttachmentMenu: bool
 * - onAttachmentPress: { image: fn, doc: fn, location: fn, theme: fn }
 * - onOpenMembers: () => void
 *
 * NOTE: This component is UI-only — no socket/axios/filesystem logic.
 */

export default function ChatScreenUI({
  chatInfo = { chatName: "Chat", chatType: "personal", members: [] },
  messages = [],
  onBack = () => {},
  onSend = () => {},
  onToggleAttachments = () => {},
  showAttachmentMenu = false,
  onAttachmentPress = {},
  onOpenMembers = () => {},
  keyboardVerticalOffset = Platform.select({ ios: 43, android: 30 }),
}) {
  const [input, setInput] = useState("");
  const [pendingMedia, setPendingMedia] = useState([]);
  const [pendingDocs, setPendingDocs] = useState([]);
  const [pendingLocation, setPendingLocation] = useState(null);
  const [showMembers, setShowMembers] = useState(false);
  const flatListRef = useRef(null);

  const isGroup = useMemo(() => chatInfo.chatType === "group", [chatInfo.chatType]);

  const send = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
  };

  const renderMessage = ({ item }) => {
    const isMe = item.sender === "me" || item.sender === "self";
    return (
      <View style={[styles.msgContainer, isMe ? { alignSelf: "flex-end" } : { alignSelf: "flex-start" }]}>
        <View style={[styles.msgBubble, isMe ? styles.rightBubble : styles.leftBubble]}>
          <Text style={[styles.msgText, isMe ? { color: "#fff" } : { color: "#000" }]}>{item.text}</Text>
          <Text style={[styles.time, isMe ? styles.rightTime : styles.leftTime]}>{item.time || ""}</Text>
        </View>
      </View>
    );
  };

  return (
    <ImageBackground  source={require('../images/123.png')} style={{ flex: 1 }} resizeMode="cover">
      <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.08)" }} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={keyboardVerticalOffset}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={{ marginRight: 10 }}>
            <Ionicons name="arrow-back" size={26} color="#377355" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{chatInfo.chatName}</Text>
          {isGroup && (
            <View style={styles.headerRight}>
              <Text style={styles.groupInfoText}>Group Info</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowMembers(true);
                  onOpenMembers?.();
                }}
              >
                <Ionicons name="people-circle" size={28} color="#333" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <FlatList
          ref={flatListRef}
          data={[...(messages || [])]}
          keyExtractor={(item, idx) => `${item.id ?? "idx-" + idx}`}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 10, flexGrow: 1 }}
          inverted
        />

        {/* pending previews (UI-only) */}
        {pendingMedia.length > 0 && (
          <View style={styles.previewBox}>
            <ScrollView horizontal>
              {pendingMedia.map((m, i) => (
                <View key={i} style={{ marginRight: 8, alignItems: "center", position: "relative" }}>
                  <Image source={{ uri: m.uri }} style={{ width: 70, height: 70, borderRadius: 8 }} />
                  <TouchableOpacity style={styles.removeBtn} onPress={() => setPendingMedia((p) => p.filter((_, idx) => idx !== i))}>
                    <Feather name="x" size={16} color="#fff" />
                  </TouchableOpacity>
                  <Text numberOfLines={1} style={{ maxWidth: 70, fontSize: 11 }}>
                    {m.name}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {pendingDocs.length > 0 && (
          <View style={styles.previewBox}>
            <ScrollView horizontal>
              {pendingDocs.map((d, i) => (
                <View key={i} style={{ marginRight: 8, alignItems: "center", width: 140, position: "relative" }}>
                  <Feather name="file" size={36} color="#333" />
                  <TouchableOpacity style={styles.removeBtn} onPress={() => setPendingDocs((p) => p.filter((_, idx) => idx !== i))}>
                    <Feather name="x" size={16} color="#fff" />
                  </TouchableOpacity>
                  <Text numberOfLines={1} style={{ maxWidth: 120, fontSize: 12 }}>
                    {d.name}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {pendingLocation && (
          <View style={styles.pendingLocationBox}>
            <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              <Image source={{ uri: pendingLocation.mapUrl }} style={styles.pendingLocationImage} resizeMode="cover" />
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text numberOfLines={1} style={{ fontWeight: "700" }}>
                  Location selected
                </Text>
                <Text style={{ color: "#666", marginTop: 2 }}>
                  {pendingLocation.latitude?.toFixed(5)}, {pendingLocation.longitude?.toFixed(5)}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPendingLocation(null)} style={styles.removeLocationBtn}>
              <Feather name="x" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputRow}>
          <TouchableOpacity style={{ marginRight: 8 }} onPress={onToggleAttachments}>
            <MaterialCommunityIcons name="dots-grid" size={30} color="#377355" />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={pendingLocation ? "Add a caption..." : "Type a message..."}
            onSubmitEditing={send}
            returnKeyType="send"
            multiline
          />
          <TouchableOpacity onPress={send}>
            <Ionicons name="send" size={24} color="#377355" />
          </TouchableOpacity>
        </View>

        {/* Attachment menu (visual only) */}
        {showAttachmentMenu && (
          <View style={[styles.wrapper, { bottom: Platform.select({ ios: 130, android: 110 }) }]}>
            <View style={styles.container}>
              <TouchableOpacity onPress={() => onAttachmentPress.image?.()} style={styles.pinTouchable}>
                <Feather name="image" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={{ position: "absolute", left: 60, bottom: -10 }}>
              <View style={[styles.container, { width: 48, height: 48, borderRadius: 24 }]}>
                <TouchableOpacity onPress={() => onAttachmentPress.doc?.()} style={styles.pinTouchable}>
                  <Feather name="file-text" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
            {/* keep it minimal — you can expand visuals as needed */}
          </View>
        )}

        {/* Members Modal (UI-only) */}
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
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => {
                  setShowMembers(false);
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
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
  leftBubble: {
    backgroundColor: "#E6D8C3",
  },
  rightBubble: {
    backgroundColor: "#377355",
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
    maxHeight: 120,
  },
  wrapper: { position: "absolute", left: 6, zIndex: 9999 },
  container: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  pinTouchable: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  previewBox: { marginTop: 8, backgroundColor: "#fff", borderRadius: 12, padding: 8, width: "96%", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 4 },
  pendingLocationBox: {
    margin: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  pendingLocationImage: { width: 96, height: 64, borderRadius: 8, backgroundColor: "#ddd" },
  removeLocationBtn: { backgroundColor: "#cf2520ff", padding: 8, borderRadius: 8, marginLeft: 8, alignItems: "center", justifyContent: "center" },
  removeBtn: {
    position: "absolute",
    top: 1,
    right: -1,
    backgroundColor: "rgba(184, 15, 15, 0.7)",
    borderRadius: 12,
    padding: 2,
    zIndex: 10,
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
  time: {
    fontSize: 10,
    color: "#000",
    marginTop: 6,
    alignSelf: "flex-end",
  },
  leftTime: { color: "#444" },
  rightTime: { color: "#dcdcdc" },
});
