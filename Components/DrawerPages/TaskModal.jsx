import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function TaskModal({ route }) {
  const { date } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>You selected: {date}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  text: {
    fontSize: 20,
    fontWeight: "600",
  },
});
