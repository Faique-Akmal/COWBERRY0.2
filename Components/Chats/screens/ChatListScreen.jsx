import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, ActionSheetIOS, Platform, Alert } from "react-native";
import axiosInstance from "../../TokenHandling/axiosInstance";
import { axiosGetAllGroup } from "../stores/ChatStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";

const ChatListScreen = () => {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem("user_id");
        setCurrentUserId(storedUserId);

        // ✅ Users
        const userRes = await axiosInstance.get("/users/");
        const filteredUsers = userRes.data.results.filter((u) => u.id != storedUserId);
        setUsers(filteredUsers);

        // ✅ Groups
        const groupRes = await axiosGetAllGroup();
        setGroups(groupRes || []);
      } catch (err) {
        console.log("❌ fetchData error:", err.response?.data || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ThreeDot Option
  const showGroupOptions = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Create Group", "Group Settings"],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            // console.log("Create Group clicked");
            navigation.navigate("CreateGroup");
          } else if (buttonIndex === 3) {
            console.log("Group Settings clicked");
          }
        }
      );
    } else {
      Alert.alert("Group Options", "Choose an action", [
        { text: "Cancel", style: "cancel" },

        {
          text: "Create Group",
          onPress: () => {
            console.log("hello");
            navigation.navigate("CreateGroup");
          }
        },



        { text: "Group Settings", onPress: () => console.log("Group Settings clicked") },
      ]);
    }
  };


  const renderUserItem = ({ item }) => (
    <TouchableOpacity
      onPress={() =>
        navigation.navigate("ChatScreen", {
          chatInfo: {
            chatId: item.id,
            chatType: "personal",
            chatName: item.username,
            members: [
              { id: currentUserId, username: "You" },
              { id: item.id, username: item.username },
            ],
          },


        })
      }

      style={{
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        backgroundColor: "#DAC496",
        marginVertical: 3,
        marginHorizontal: 5,
        borderRadius: 10
      }}
    >
      <Image
        source={{
          uri: item.profile_image || "https://cdn-icons-png.flaticon.com/512/149/149071.png",
        }}
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          marginRight: 12,
          borderColor: "#016730",
          borderWidth: 1
        }}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: "#016730" }}>{item.first_name || item.username}</Text>
        <Text style={{ color: "#000" }}>{item.email}</Text>
      </View>
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: item.is_online ? "green" : "gray",
          marginLeft: 8,
        }}
      />
    </TouchableOpacity>
  );

  const renderGroupItem = ({ item }) => (
    <TouchableOpacity
      onPress={() =>
        navigation.navigate("ChatScreen", {
          chatInfo: {
            chatId: item.group_id,
            chatType: "group",
            chatName: item.group_name,
            members: item.members, // ✅ members bhej diye
          },
        })
      }

      style={{
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        backgroundColor: "#DAC496",
        marginVertical: 3,
        marginHorizontal: 5,
        borderRadius: 10
      }}
    >
      <Image
        source={{ uri: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSpkmUS8gXwKRgILf96UVC8zFVSoj9JurVIu2ag3kuXqADz2wCjBZXVrwWYjrmxkhTjOec&usqp=CAU" }}
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          marginRight: 12,
          borderWidth: 1,
          borderColor: "#016730"
        }}
      />
      <View style={{ flex: 1, }}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: '#016730' }}>{item.group_name}</Text>
        <Text style={{ color: "#000" }}>Members: {item.members?.length || 0}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#B27F59" }}>
      <FlatList
        ListHeaderComponent={
          <>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", margin: 10, }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#FFF" }}>Groups</Text>
              <TouchableOpacity onPress={showGroupOptions}>
                <Ionicons name="ellipsis-vertical" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={groups}
              renderItem={renderGroupItem}
              keyExtractor={(item) => `group-${item.group_id}`}
            />
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#FFF", margin: 10 }}>Users</Text>
          </>
        }
        data={users}
        renderItem={renderUserItem}
        keyExtractor={(item) => `user-${item.id}`}
      />
    </View>
  );
};

export default ChatListScreen;
