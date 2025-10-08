import React, { useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ChatListScreen from "./ChatListScreen";
import ChatScreen from "./ChatScreen";
import { useNavigation } from "@react-navigation/native";
import { TouchableOpacity, Image, Text, View } from "react-native";
import { useSocketStore } from "../stores/socketStore";
import { useMessageStore } from "../stores/messageStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "react-native-vector-icons/Ionicons";

const Stack = createNativeStackNavigator();

export default function SocketChatBox(route) {

  const { connect, disconnect } = useSocketStore();
  const { clearMessages } = useMessageStore();
  const { chatInfo } = route.params || {};

  useEffect(() => {
    let token;

    const setup = async () => {
      token = await AsyncStorage.getItem("accessToken");
      if (!token || !chatInfo) return;

      // 🧹 clear old messages
      clearMessages();

      // 🔌 disconnect old & connect new
      disconnect();
      connect(chatInfo, token);
    };

    setup();

    // cleanup jab screen se bahar jao
    return () => {
      disconnect();
    };
  }, [chatInfo?.id]);
  return (
    <Stack.Navigator>
      {/* Chat List */}

<Stack.Screen
  name="ChatList"
  component={ChatListScreen}
  options={({ navigation }) => ({
    headerShown: true,

    // Custom centered title
    headerTitle: () => (
      <Text style={{
        fontSize: 20,
        fontWeight: "700",
        color: "#377355",
        letterSpacing: 0.2,
      }}>
        Chats
      </Text>
    ),
    headerTitleAlign: "center",

    // Header style (clean, no heavy shadow)
    headerStyle: {
      backgroundColor: "#ffffff",
      elevation: 0,        // Android: remove default shadow
      shadowOpacity: 0,    // iOS: remove default shadow
      borderBottomWidth: 0.5,
      borderBottomColor: "#eee",
    },

    // Back button (left)
    headerLeft: () => (
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ marginLeft: 10}}
        accessibilityRole="button"
      >
        <Ionicons name="arrow-back" size={28} color="#000" />
      </TouchableOpacity>
    ),

    // Invisible right element to keep title visually centered
    headerRight: () => <View style={{ width: 40 }} />,
  })}
/>


      {/* Chat Screen */}
      <Stack.Screen
        name="ChatScreen"
        component={ChatScreen}
        options={{
          headerShown: false,
        }}

      />
    </Stack.Navigator>
  );
}
