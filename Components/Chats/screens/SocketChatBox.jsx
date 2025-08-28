import React, { useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ChatListScreen from "./ChatListScreen";
import ChatScreen from "./ChatScreen";
import { useNavigation } from "@react-navigation/native";
import { TouchableOpacity, Text } from "react-native";
import { useSocketStore } from "../stores/socketStore";
import { useMessageStore } from "../stores/messageStore";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
        options={{
          headerShown: true,
          headerTitle: "Chats",
          headerLeft: () => {
            const navigation = useNavigation();
            return (
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={{ marginLeft: 10 }}
              >
                <Text style={{ color: "blue" }}>Back</Text>
              </TouchableOpacity>
            );
          },
        }}
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
