import React, { useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ChatListScreen from "./ChatListScreen";
import ChatScreen from "./ChatScreen";
import { useNavigation } from "@react-navigation/native";
import { TouchableOpacity, Image, Text } from "react-native";
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
        options={{
          headerShown: true,
          headerTitle: () => (
            <Image
              source={require("../../images/cowberryLogo.png")}
              style={{ width: 120, height: 40, resizeMode: "contain" }}
            />
          ),
          headerLeft: () => {
            const navigation = useNavigation();
            return (
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={{ marginLeft: 10 }}
              >
                <Ionicons name="arrow-back" size={24} color="#377355" />
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
