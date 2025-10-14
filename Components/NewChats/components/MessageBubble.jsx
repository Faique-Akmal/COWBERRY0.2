// components/MessageBubble.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatTime } from '../utils/utils';

const MessageBubble = ({ msg }) => {
  const containerStyle = msg.fromMe ? styles.rightContainer : styles.leftContainer;
  const bubbleStyle = msg.fromMe ? styles.rightBubble : styles.leftBubble;
  return (
    <View style={containerStyle}>
      <View style={bubbleStyle}>
        <Text style={msg.fromMe ? styles.rightText : styles.leftText}>{msg.text}</Text>
        <Text style={styles.time}>{formatTime(msg.time)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  leftContainer:{ alignSelf:'flex-start', maxWidth:'80%', marginVertical:6, marginLeft:12 },
  rightContainer:{ alignSelf:'flex-end', maxWidth:'80%', marginVertical:6, marginRight:12 },
  leftBubble:{ backgroundColor:'#f1f0f0', padding:10, borderRadius:12, borderTopLeftRadius:4 },
  rightBubble:{ backgroundColor:'#0b93f6', padding:10, borderRadius:12, borderTopRightRadius:4 },
  leftText:{ color:'#000' },
  rightText:{ color:'#fff' },
  time:{ fontSize:10, color:'#666', marginTop:6, alignSelf:'flex-end' }
});

export default MessageBubble;
