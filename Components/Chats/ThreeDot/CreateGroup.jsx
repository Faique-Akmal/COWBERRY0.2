import {
    StyleSheet,
    Text,
    View,
    TextInput,
    ScrollView,
    TouchableOpacity,
    Button,
    ImageBackground
} from 'react-native';
import React, { useEffect, useState } from 'react';
import axiosInstance from '../../TokenHandling/axiosInstance';
import Ionicons from "react-native-vector-icons/Ionicons";

const CreateGroup = ({ navigation }) => {
    const [groupName, setGroupName] = useState("");
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [users, setUsers] = useState([]);

    // Users fetch karna
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await axiosInstance.get("/users/");
                if (Array.isArray(res.data)) {
                    setUsers(res.data);
                } else if (res.data.results) {
                    setUsers(res.data.results);
                } else {
                    setUsers([]);
                }
            } catch (err) {
                console.error("Error fetching users ❌", err.response?.data || err);
                setUsers([]);
            }
        };
        fetchUsers();
    }, []);

    // Member select/unselect
    const handleSelectMember = (id) => {
        if (selectedMembers.includes(id)) {
            setSelectedMembers(selectedMembers.filter((m) => m !== id));
        } else {
            setSelectedMembers([...selectedMembers, id]);
        }
    };

    // Group create karna
    const handleCreateGroup = async () => {
        if (!groupName.trim()) {
            alert("Please enter group name");
            return;
        }
        try {
            const payload = {
                name: groupName,
                members: selectedMembers,
            };

            const res = await axiosInstance.post("/chat/group/create/", payload);

            console.log("Group Created ✅", res.data);
            alert("Group created successfully!");
            setGroupName("");
            setSelectedMembers([]);
            navigation.navigate("SocketChatBox", { screen: "ChatList" });

        } catch (err) {
            console.error("Error creating group ❌", err.response?.data || err);
        }
    };

    return (
        <ImageBackground
            source={require("../../images/123.png")}
            style={styles.container}
            resizeMode="cover"
        >
            <View
                style={{
                    ...StyleSheet.absoluteFillObject,
                    // backgroundColor: "rgba(255,255,255,0.1)",
                     backgroundColor: "rgba(0,0,0,0.1)", 
                }}
            />
            {/* 🔙 Custom Back Button Row */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                {/* <Text style={styles.headerTitle}>Create Group</Text> */}
            </View>

            <View style={styles.card}>
                <Text style={styles.heading}>Create Chat Group</Text>

                {/* Group Name Input */}
                <Text style={styles.label}>Group Name</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter new group name"
                    value={groupName}
                    onChangeText={setGroupName}
                    placeholderTextColor="#999"
                />

                {/* Selected Members Chips */}
          {selectedMembers.length > 0 && (
  <View style={styles.selectedContainer}>
    {users
      .filter((u) => selectedMembers.includes(u.id))
      .map((user) => (
        <View key={user.id} style={styles.chip}>
          <Text style={styles.chipText}>{user.username}</Text>

          {/* ❌ Remove Button */}
          <TouchableOpacity
            onPress={() =>
              setSelectedMembers((prev) =>
                prev.filter((id) => id !== user.id)
              )
            }
            style={styles.removeBtn}
          >
            <Text style={styles.removeBtnText}>❌</Text>
          </TouchableOpacity>
        </View>
      ))}
  </View>
)}

                {/* Member Selection */}
                <Text style={styles.label}>Select Members</Text>
                <ScrollView style={styles.scroll}>
                    {users.map((user) => (
                        <TouchableOpacity
                            key={user.id}
                            onPress={() => handleSelectMember(user.id)}
                            style={[
                                styles.userItem,
                                selectedMembers.includes(user.id) && styles.selectedUser
                            ]}
                        >
                            <Text
                                style={[
                                    styles.userText,
                                    selectedMembers.includes(user.id) && { color: "white" }
                                ]}
                            >
                                {user.username}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Create Button */}
                <TouchableOpacity style={styles.createBtn} onPress={handleCreateGroup}>
                    <Text style={styles.createBtnText}>Create Group</Text>
                </TouchableOpacity>
            </View>
        </ImageBackground>
    );
};

export default CreateGroup;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f4f6fa",
        // justifyContent: "center",
        padding: 16,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 50,
    },
    backButton: {
        padding: 5,
        marginRight: 10,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "bold",
    },
    card: {
  backgroundColor: "#fff",
  borderRadius: 16,
  padding: 20,

  // iOS Shadow
  shadowColor: "#000",
  shadowOffset: {
    width: 0,
    height: 4,   // neeche ki taraf zyada shadow
  },
  shadowOpacity: 0.15, // shadow ki transparency
  shadowRadius: 6,

  // Android Shadow
  elevation: 6,
},
    heading: {
        fontSize: 20,
        fontWeight: "700",
        marginBottom: 16,
        textAlign: "center",
        color: "#333",
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 6,
        marginTop: 10,
        color: "#444",
    },
    input: {
        borderWidth: 1,
        borderColor: "#ddd",
        padding: 12,
        borderRadius: 10,
        marginBottom: 10,
        fontSize: 14,
        backgroundColor: "#fafafa",
    },
    scroll: {
        maxHeight: 180,
        marginBottom: 16,
    },
    userItem: {
        padding: 12,
        borderWidth: 1,
        borderColor: "#ddd",
        marginBottom: 8,
        borderRadius: 10,
        backgroundColor: "#fff",
    },
    userText: {
        fontSize: 14,
        fontWeight: "500",
        color: "#333",
    },
    selectedUser: {
        backgroundColor: "#367355",
        borderColor: "#367355",
    },
    selectedContainer: {
  flexDirection: "row",
  flexWrap: "wrap",
  marginVertical: 10,
  
},

chip: {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 10,
  margin: 3,
  backgroundColor:"#367355"
},

chipText: {
  marginRight: 6,
  fontSize: 14,
  color: "#FFF",
},

removeBtn: {
  paddingLeft: 4,
},

removeBtnText: {
  fontSize: 14,
  color: "red",
},

    createBtn: {
        backgroundColor: "#367355",
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 10,
    },
    createBtnText: {
        color: "white",
        fontSize: 16,
        fontWeight: "600",
    },
});
