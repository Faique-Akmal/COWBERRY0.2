// ChatScreen.js
import React, { useEffect, useLayoutEffect, useState, useRef } from 'react';
import { SafeAreaView, View, Text, FlatList, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import MessageBubble from './components/MessageBubble';
import InputBar from './components/InputBar';
import { makeId, sampleConversations } from './utils/utils';

const ChatScreen = ({ route, navigation }) => {
  const { convId, conv } = route.params || {};
  const [messages, setMessages] = useState(conv ? conv.messages : []);
  const [contact, setContact] = useState(conv ? conv : { name: 'Unknown' });
  const flatRef = useRef();

  useLayoutEffect(() => {
    navigation.setOptions({ title: contact.name });
  }, [navigation, contact]);

  useEffect(() => {
    // just simulating incoming message after 8s for demo
    const t = setTimeout(() => {
      const incoming = { id: makeId('m_'), fromMe: false, text: 'Ye demo incoming message hai', time: Date.now(), status: 'delivered' };
      setMessages(prev => [...prev, incoming]);
    }, 8000);
    return () => clearTimeout(t);
  }, []);

  const handleSend = (text) => {
    const newMsg = { id: makeId('out_'), fromMe: true, text, time: Date.now(), status: 'sending' };
    setMessages(prev => [...prev, newMsg]);
    // simulate network send
    setTimeout(() => {
      setMessages(prev => prev.map(m => (m.id===newMsg.id ? {...m, status:'sent'}: m)));
    }, 1000);
  };

  return (
    <SafeAreaView style={{flex:1}}>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={m => m.id}
          renderItem={({item}) => <MessageBubble msg={item} />}
          contentContainerStyle={{ paddingVertical:12 }}
        />
        <InputBar onSend={handleSend} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatScreen;
