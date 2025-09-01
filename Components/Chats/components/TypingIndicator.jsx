import React, { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";

const TypingIndicator = ({ typingUsers = {}, currentUser }) => {
  const [visibleUsers, setVisibleUsers] = useState([]);
  const timeoutRef = useRef(null);
  
useEffect(() => {
  console.log("typingUsers:", typingUsers);
  console.log("currentUser:", currentUser);

  const active = Object.entries(typingUsers)
    .filter(([user, isTyping]) => isTyping && String(user) !== String(currentUser))
    .map(([user]) => user);

  console.log("activeUsers after filter:", active);
  
  setVisibleUsers(active);

  if (active.length > 0) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setVisibleUsers([]);
    }, 2000);
  }

  return () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };
}, [typingUsers, currentUser]);


  if (visibleUsers.length === 0) return null;

  return (
    <View style={{ padding: 4 }}>
      <Text style={{ fontStyle: "italic", color: "#000" }}>
        {visibleUsers.join(", ")} typing...
      </Text>
    </View>
  );
};

export default TypingIndicator;
