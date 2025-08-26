import React, { useEffect, useRef, useMemo, useState } from "react";
import { Text, View } from "react-native";

const TypingIndicator = ({ typingUsers, currentUser }) => {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef(null);

  // filter karo apna khud ka typing status hata ke
  const activeUsers = useMemo(() => {
    return Object.entries(typingUsers || {})
      .filter(([userId, isTyping]) => isTyping && userId !== currentUser)
      .map(([userId]) => userId);
  }, [typingUsers, currentUser]);

  useEffect(() => {
    if (activeUsers.length > 0) {
      setVisible(true);

      // purana timeout clear karo
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      // naya timeout set karo
      timeoutRef.current = setTimeout(() => {
        setVisible(false);
      }, 2000); // 👈 whatsapp jaisa 2 sec me hide ho jaega
    } else {
      setVisible(false);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [activeUsers]);

  if (!visible || activeUsers.length === 0) return null;

  return (
    <View style={{ padding: 4 }}>
      <Text style={{ fontStyle: "italic", color: "#000" }}>
        {activeUsers.join(", ")} is typing...
      </Text>
    </View>
  );
};

export default TypingIndicator;
