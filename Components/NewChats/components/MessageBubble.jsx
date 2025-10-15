import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatTime } from '../ utils/utils';

const MessageBubble = ({ msg }) => {
  const containerStyle = msg.fromMe ? styles.rightContainer : styles.leftContainer;
  const bubbleStyle = msg.fromMe ? styles.rightBubble : styles.leftBubble;
  const textStyle = msg.fromMe ? styles.rightText : styles.leftText;
  const timeStyle = msg.fromMe ? styles.rightTime : styles.leftTime;

  return (
    <View style={containerStyle}>
      <View style={bubbleStyle}>
        <Text style={textStyle}>{msg.text}</Text>
        <Text style={timeStyle}>{formatTime(msg.time)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  leftContainer: {
    alignSelf: 'flex-start',
    maxWidth: '80%',
    marginVertical: 6,
    marginLeft: 12,
  },
  rightContainer: {
    alignSelf: 'flex-end',
    maxWidth: '80%',
    marginVertical: 6,
    marginRight: 12,
  },
  leftBubble: {
    // backgroundColor: '#fff',
    backgroundColor: '#d2af6f',
    padding: 10,
    borderRadius: 12,
    borderTopLeftRadius: 4,
  },
  rightBubble: {
    backgroundColor: '#377355',
    padding: 10,
    borderRadius: 12,
    borderTopRightRadius: 4,
  },
  leftText: {
    color: '#000',
  },
  rightText: {
    color: '#fff',
  },
  leftTime: {
    fontSize: 10,
    color: '#444', // darker for received
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  rightTime: {
    fontSize: 10,
    color: '#dcdcdc', // light for sent
    marginTop: 6,
    alignSelf: 'flex-end',
  },
});

export default MessageBubble;
