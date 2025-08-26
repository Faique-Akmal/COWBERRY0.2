import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function ChatBubble({ message, isMe, showName }) {
  return (
    <View style={[styles.row, { justifyContent: isMe ? "flex-end" : "flex-start" }]}>
      <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
        {showName && !isMe ? (
          <Text style={[styles.name]} numberOfLines={1}>
            {message.sender_username || "Unknown"}
          </Text>
        ) : null}
        <Text style={[styles.text, isMe ? styles.myText : styles.theirText]}>
          {message.content}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { width: "100%", marginVertical: 4, paddingHorizontal: 8 },
  bubble: {
    maxWidth: "78%",
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  myBubble: {
    backgroundColor: "#4880FF",
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: "#E5E5EA",
    borderBottomLeftRadius: 4,
  },
  text: { fontSize: 15 },
  myText: { color: "#fff" },
  theirText: { color: "#000" },
  name: { fontSize: 11, color: "#555", marginBottom: 2 },
});
