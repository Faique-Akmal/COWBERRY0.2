// All user group is coming with API

// import React, { useEffect, useState } from "react";
// import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, ActionSheetIOS, Platform, Alert } from "react-native";
// import axiosInstance from "../../TokenHandling/axiosInstance";
// import { axiosGetAllGroup } from "../stores/ChatStore";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { useNavigation } from "@react-navigation/native";
// import Ionicons from "react-native-vector-icons/Ionicons";

// const ChatListScreen = () => {
//   const [users, setUsers] = useState([]);
//   const [groups, setGroups] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [currentUserId, setCurrentUserId] = useState(null);
//   const navigation = useNavigation();

//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         const storedUserId = await AsyncStorage.getItem("user_id");
//         setCurrentUserId(storedUserId);

//         // ✅ Users
//         const userRes = await axiosInstance.get("/users/");
//         const filteredUsers = userRes.data.results.filter((u) => u.id != storedUserId);
//         setUsers(filteredUsers);

//         // ✅ Groups
//         const groupRes = await axiosGetAllGroup();
//         setGroups(groupRes || []);
//       } catch (err) {
//         console.log("❌ fetchData error:", err.response?.data || err.message);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchData();
//   }, []);

//   // ThreeDot Option
//   const showGroupOptions = () => {
//     if (Platform.OS === "ios") {
//       ActionSheetIOS.showActionSheetWithOptions(
//         {
//           options: ["Cancel", "Create Group", "Group Settings"],
//           cancelButtonIndex: 0,
//         },
//         (buttonIndex) => {
//           if (buttonIndex === 1) {
//             // console.log("Create Group clicked");
//             navigation.navigate("CreateGroup");
//           } else if (buttonIndex === 3) {
//             console.log("Group Settings clicked");
//           }
//         }
//       );
//     } else {
//       Alert.alert("Group Options", "Choose an action", [
//         { text: "Cancel", style: "cancel" },

//         {
//           text: "Create Group",
//           onPress: () => {
//             console.log("hello");
//             navigation.navigate("CreateGroup");
//           }
//         },



//         { text: "Group Settings", onPress: () => console.log("Group Settings clicked") },
//       ]);
//     }
//   };


//   const renderUserItem = ({ item }) => (
//     <TouchableOpacity
//       onPress={() =>
//         navigation.navigate("ChatScreen", {
//           chatInfo: {
//             chatId: item.id,
//             chatType: "personal",
//             chatName: item.username,
//             members: [
//               { id: currentUserId, username: "You" },
//               { id: item.id, username: item.username },
//             ],
//           },


//         })
//       }

//       style={{
//         flexDirection: "row",
//         alignItems: "center",
//         padding: 12,
//         backgroundColor: "#DAC496",
//         marginVertical: 3,
//         marginHorizontal: 5,
//         borderRadius: 10
//       }}
//     >
//       <Image
//         source={{
//           uri: item.profile_image || "https://cdn-icons-png.flaticon.com/512/149/149071.png",
//         }}
//         style={{
//           width: 40,
//           height: 40,
//           borderRadius: 20,
//           marginRight: 12,
//           borderColor: "#016730",
//           borderWidth: 1
//         }}
//       />
//       <View style={{ flex: 1 }}>
//         <Text style={{ fontSize: 16, fontWeight: "600", color: "#016730" }}>{item.first_name || item.username}</Text>
//         <Text style={{ color: "#000" }}>{item.email}</Text>
//       </View>
//       <View
//         style={{
//           width: 10,
//           height: 10,
//           borderRadius: 5,
//           backgroundColor: item.is_online ? "green" : "gray",
//           marginLeft: 8,
//         }}
//       />
//     </TouchableOpacity>
//   );

//   const renderGroupItem = ({ item }) => (
//     <TouchableOpacity
//       onPress={() =>
//         navigation.navigate("ChatScreen", {
//           chatInfo: {
//             chatId: item.group_id,
//             chatType: "group",
//             chatName: item.group_name,
//             members: item.members, // ✅ members bhej diye
//           },
//         })
//       }

//       style={{
//         flexDirection: "row",
//         alignItems: "center",
//         padding: 12,
//         backgroundColor: "#DAC496",
//         marginVertical: 3,
//         marginHorizontal: 5,
//         borderRadius: 10
//       }}
//     >
//       <Image
//         source={{ uri: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSpkmUS8gXwKRgILf96UVC8zFVSoj9JurVIu2ag3kuXqADz2wCjBZXVrwWYjrmxkhTjOec&usqp=CAU" }}
//         style={{
//           width: 40,
//           height: 40,
//           borderRadius: 20,
//           marginRight: 12,
//           borderWidth: 1,
//           borderColor: "#016730"
//         }}
//       />
//       <View style={{ flex: 1, }}>
//         <Text style={{ fontSize: 16, fontWeight: "600", color: '#016730' }}>{item.group_name}</Text>
//         <Text style={{ color: "#000" }}>Members: {item.members?.length || 0}</Text>
//       </View>
//     </TouchableOpacity>
//   );

//   if (loading) {
//     return (
//       <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
//         <ActivityIndicator size="large" color="#000" />
//       </View>
//     );
//   }

//   return (
//     <View style={{ flex: 1, backgroundColor: "#B27F59" }}>
//       <FlatList
//         ListHeaderComponent={
//           <>
//             <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", margin: 10, }}>
//               <Text style={{ fontSize: 18, fontWeight: "800", color: "#FFF" }}>Groups</Text>
//               <TouchableOpacity onPress={showGroupOptions}>
//                 <Ionicons name="ellipsis-vertical" size={30} color="#FFF" />
//               </TouchableOpacity>
//             </View>

//             <FlatList
//               data={groups}
//               renderItem={renderGroupItem}
//               keyExtractor={(item) => `group-${item.group_id}`}
//             />
//             <Text style={{ fontSize: 18, fontWeight: "800", color: "#FFF", margin: 10 }}>Users</Text>
//           </>
//         }
//         data={users}
//         renderItem={renderUserItem}
//         keyExtractor={(item) => `user-${item.id}`}
//       />
//     </View>
//   );
// };

// export default ChatListScreen;

// Dummy json data (user and group)
import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, ActionSheetIOS, Platform, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";

const ChatListScreen = () => {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    // Dummy current user id (aap change kar sakte ho)
    const storedUserId = "1";
    setCurrentUserId(storedUserId);

    // Dummy users (5 users)
    const dummyUsers = [
      {
        id: "2",
        username: "rahul_k",
        first_name: "Rahul",
        email: "rahul.k@example.com",
        profile_image: "https://randomuser.me/api/portraits/men/32.jpg",
        is_online: true,
      },
      {
        id: "3",
        username: "neha.verma",
        first_name: "Neha",
        email: "neha.verma@example.com",
        profile_image: "https://randomuser.me/api/portraits/women/44.jpg",
        is_online: false,
      },
      {
        id: "4",
        username: "amit94",
        first_name: "Amit",
        email: "amit94@example.com",
        profile_image: "https://randomuser.me/api/portraits/men/45.jpg",
        is_online: true,
      },
      {
        id: "5",
        username: "priya.s",
        first_name: "Priya",
        email: "priya.s@example.com",
        profile_image: "https://randomuser.me/api/portraits/women/50.jpg",
        is_online: false,
      },
      {
        id: "6",
        username: "raj_tech",
        first_name: "Raj",
        email: "raj.tech@example.com",
        profile_image: "https://randomuser.me/api/portraits/men/56.jpg",
        is_online: true,
      },
    ];

    // Dummy groups (2 groups)
    const dummyGroups = [
      {
        group_id: "100",
        group_name: "Team Marketing",
        members: [
          { id: "1", username: "You" },
          { id: "2", username: "Rahul" },
          { id: "3", username: "Neha" },
        ],
      },
      {
        group_id: "101",
        group_name: "Product Owners",
        members: [
          { id: "1", username: "You" },
          { id: "4", username: "Amit" },
          { id: "5", username: "Priya" },
          { id: "6", username: "Raj" },
        ],
      },
    ];

    // Set dummy data
    setUsers(dummyUsers);
    setGroups(dummyGroups);
    setLoading(false);
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
            navigation.navigate("CreateGroup");
          } else if (buttonIndex === 2) {
            console.log("Group Settings clicked");
          }
        }
      );
    } else {
      Alert.alert("Group Options", "Choose an action", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Create Group",
          onPress: () => navigation.navigate("CreateGroup"),
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
        backgroundColor: "#fff",
        marginVertical: 3,
        marginHorizontal: 5,
        borderRadius: 10,
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
          borderColor: "#F5F6F5",
          borderWidth: 1,
        }}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: "#000" }}>{item.first_name || item.username}</Text>
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
            members: item.members,
          },
        })
      }
      style={{
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        backgroundColor: "#fff",
        marginVertical: 3,
        marginHorizontal: 5,
        borderRadius: 10,
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
          borderColor: "#F5F6F5",
        }}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: "#000" }}>{item.group_name}</Text>
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
    <View style={{ flex: 1, backgroundColor: "#F5F6F5" }}>
      <FlatList
        ListHeaderComponent={
          <>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", margin: 10 }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#000" }}>Groups</Text>
              <TouchableOpacity onPress={showGroupOptions}>
                <Ionicons name="ellipsis-vertical" size={30} color="#000" />
              </TouchableOpacity>
            </View>

            <FlatList data={groups} renderItem={renderGroupItem} keyExtractor={(item) => `group-${item.group_id}`} />
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#000", margin: 10 }}>Users</Text>
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
