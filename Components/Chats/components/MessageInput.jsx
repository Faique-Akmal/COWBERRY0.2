import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSocketStore } from '../stores/socketStore';
import { useUserStore } from '../stores/userStore';

function useDebounce(fn, delay = 600) {
  const t = useRef();
  return useCallback((...args) => {
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

export default function MessageInput({ chatInfo }) {
  const { sendJson } = useSocketStore();
  const { me } = useUserStore();

  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // send typing true quickly, then send false on debounce
  const sendTypingFalse = useDebounce(() => {
    setIsTyping(false);
    sendJson({ type: 'typing', is_typing: false });
  }, 1000);

  useEffect(() => {
    return () => {
      // ensure typing false on unmount
      sendJson({ type: 'typing', is_typing: false });
    };
  }, []);

  const onChange = (v) => {
    setText(v);
    if (!isTyping) {
      setIsTyping(true);
      sendJson({ type: 'typing', is_typing: true });
    }
    sendTypingFalse();
  };

  const sendMessage = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendJson({
      type: 'chat_message',
      content: trimmed,
      group_id: chatInfo.chatType === 'group' ? chatInfo.chatId : null,
      receiver_id: chatInfo.chatType === 'personal' ? chatInfo.chatId : null,
      temp_client_id: `${me?.id}-${Date.now()}`, // useful for optimistic UI if backend supports
    });
    setText('');
    // mark not typing
    sendJson({ type: 'typing', is_typing: false });
    setIsTyping(false);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.wrap}>
        <TextInput
          value={text}
          onChangeText={onChange}
          placeholder="Type a message"
          style={styles.input}
          multiline
        />
        <TouchableOpacity style={styles.send} onPress={sendMessage}>
          <Ionicons name="send" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: '#f8f8f8',
  },
  input: {
    flex: 1,
    maxHeight: 140,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    fontSize: 16,
  },
  send: {
    backgroundColor: '#25D366',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 20,
  },
});
