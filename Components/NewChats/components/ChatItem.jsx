// components/ChatItem.js
import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { formatTime } from '../ utils/utils';

const ChatItem = ({ item, onPress }) => {
  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(item)}>
      <View style={styles.left}>
        <View style={styles.avatar}>
          <Text style={{ color: '#fff' }}>{(item.name || 'U').charAt(0)}</Text>
        </View>
      </View>
      <View style={styles.center}>
        <Text style={styles.name}>{item.name}</Text>
        <Text numberOfLines={1} style={styles.last}>{item.lastMessage}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.time}>{formatTime(item.lastTime)}</Text>
        {item.unread > 0 ? (
          <View style={styles.unread}>
            <Text style={styles.unreadText}>{item.unread}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#eee'
  },
  left: {
    marginRight: 10
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#8e44ad',
    justifyContent: 'center',
    alignItems: 'center'
  },
  center: {
    flex: 1
  },
  name: {
    fontWeight: '600',
    fontSize: 16
  },
  last: {
    color: '#666',
    marginTop: 4
  },
  right: {
    alignItems: 'flex-end'
  },
  time: {
    color: '#999',
    fontSize: 12
  },
  unread: {
    marginTop: 8,
    backgroundColor: '#ff3b30',
    minWidth: 22,
    paddingHorizontal: 6,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center'
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700'
  }
});

export default ChatItem;
