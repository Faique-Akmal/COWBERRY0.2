// ChatsList.js
import React, { useState } from 'react';
import { SafeAreaView, FlatList, View, Text, StyleSheet } from 'react-native';
import ChatItem from './components/ChatItem';
import { sampleConversations } from './ utils/utils';

const ChatsList = ({ navigation }) => {
  const [convs, setConvs] = useState(sampleConversations());

  const openChat = (conv) => {
    navigation.navigate('ChatScreen', { convId: conv.id, conv });
  };

  return (
    <SafeAreaView style={{flex:1}}>
      <FlatList
        data={convs}
        keyExtractor={(i) => i.id}
        renderItem={({item}) => <ChatItem item={item} onPress={openChat} />}
        ListHeaderComponent={<View style={styles.header}><Text style={styles.h1}>Chats</Text></View>}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header:{ padding:16, borderBottomWidth:1, borderColor:'#f0f0f0' },
  h1:{ fontSize:22, fontWeight:'700' }
});

export default ChatsList;
