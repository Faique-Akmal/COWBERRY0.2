import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  AccessibilityInfo,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons"; // optional, install react-native-vector-icons

export default function FloatingChatButton({
  onPress = () => {},
  size = 60,
  backgroundColor = "#377355",
  iconName = "chatbubble-ellipses",
  iconSize = 26,
  badge = 0,
  style,
}) {
  const scale = React.useRef(new Animated.Value(1)).current;

  function handlePress() {
    // small press animation
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();

    // accessibility announcement
    AccessibilityInfo.announceForAccessibility && AccessibilityInfo.announceForAccessibility("Open chat");

    onPress();
  }

  return (
    <Animated.View
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 2, transform: [{ scale }] },
        style,
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Open chat"
        accessibilityHint="Opens chat window"
        onPress={handlePress}
        style={[
          styles.button,
          {
            backgroundColor,
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name={iconName} size={iconSize} color="#fff" />
      </TouchableOpacity>

      {badge > 0 ? (
        <View style={[styles.badge, { minWidth: 18, height: 18, borderRadius: 9 }]}>
          <Text style={styles.badgeText}>{badge > 99 ? "99+" : badge}</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 18,
    bottom: Platform.OS === "ios" ? 118 : 82, // safe area shift for iOS
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    zIndex: 9999,
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#ff3b30",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: "#fff",
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
});
