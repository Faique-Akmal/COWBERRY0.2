import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  ImageBackground,
  RefreshControl,
} from "react-native";
import { Avatar } from "react-native-paper";
import axiosInstance from "../TokenHandling/axiosInstance";
import { createShimmerPlaceholder } from "react-native-shimmer-placeholder";
import LinearGradient from "react-native-linear-gradient";

const Shimmer = createShimmerPlaceholder(LinearGradient);

export default function Home({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [taskStats, setTaskStats] = useState({
    total: 0,
    completed: 0,
    active: 0,
    due: 0,
    progress: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Common function for fetch
  const fetchData = async () => {
    try {
      const userRes = await axiosInstance.get("/me/");
      setUserData(userRes.data);

      const taskRes = await axiosInstance.get("/tasks/");
      const tasks = taskRes.data.results;

      const total = tasks.length;
      const completed = tasks.filter((t) => t.is_completed).length;
      const active = tasks.filter((t) => !t.is_completed).length;

      const today = new Date().toISOString().split("T")[0];
      const due = tasks.filter(
        (t) => !t.is_completed && t.start_date < today
      ).length;

      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

      setTaskStats({ total, completed, active, due, progress });
    } catch (err) {
      console.log(" Error fetching data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false); // stop refresh after API call
    }
  };

  //  Initial fetch
  useEffect(() => {
    fetchData();
  }, []);

  // Pull-to-refresh handler (like instagram ulta scroll)
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  if (loading && !refreshing) {
    return (

      <ScrollView style={{ flex: 1, padding: 15 }}>

        {/* Greeting shimmer */}
        <View style={styles.greetingBox}>
          <Shimmer style={{ height: 20, marginBottom: 10, borderRadius: 5 }} />
          <Shimmer style={{ height: 14, width: "80%", borderRadius: 5 }} />
        </View>

        {/* Profile card shimmer */}
        <View style={styles.profileCard}>
          <Shimmer
            style={{ height: 50, width: 50, borderRadius: 25, marginBottom: 10 }}
          />

          <Shimmer style={{ height: 18, width: 100, borderRadius: 5 }} />
          <Shimmer style={{ height: 14, width: 60, marginTop: 5, borderRadius: 5 }} />
          <Shimmer style={{ height: 12, width: 120, marginTop: 5, borderRadius: 5 }} />
        </View>

        {/* Task boxes shimmer */}
        <View style={styles.taskContainer}>
          {[...Array(5)].map((_, i) => (
            <View key={i} style={styles.taskBox}>
              <Shimmer style={{ flex: 1, borderRadius: 10 }} />
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <ImageBackground
      source={require("../images/123.png")}
      style={styles.bgImage}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> // Pull to refresh
        }
      >
        <View style={styles.container}>
          {/* Greeting */}
          <View style={styles.greetingBox}>
            <Text style={styles.greetingText}>
              Hey,{" "}
              {userData?.first_name?.toUpperCase() || userData?.username}
            </Text>
            <Text style={styles.tagline}>
              Cowberry is glad to have you onboard!
            </Text>
            <Text style={styles.tagline}>
              Stay focused, stay productive, and keep growing.
            </Text>
          </View>

          {/* Profile Card */}
          <View style={styles.profileCard}>
            <Avatar.Text
              size={50}
              label={userData?.first_name?.charAt(0) || "U"}
            />
            <Text style={styles.name}>{userData?.username}</Text>
            <Text style={styles.role}>{userData?.role}</Text>
            <Text style={styles.location}>{userData?.address}</Text>
            <TouchableOpacity
              style={styles.editBtn}>
              <Text style={styles.editText}
                onPress={() => navigation.navigate("UpdateProfile", { userData: userData })}
              >Edit</Text>
            </TouchableOpacity>
          </View>

          {/* Task Updates (Dynamic) */}
          <Text style={styles.taskHeading}>TASK UPDATES</Text>
          <View style={styles.taskContainer}>
            <View style={styles.taskBox}>
              <ImageBackground
                source={require("../images/123.png")}
                style={styles.taskBoxBg}
                imageStyle={{ borderRadius: 10 }}
              >
                <View style={styles.overlay} />
                <Text style={styles.taskTitle}>Total Tasks</Text>
                <Text style={styles.taskValue}>{taskStats.total}</Text>
              </ImageBackground>
            </View>

            <View style={styles.taskBox}>
              <ImageBackground
                source={require("../images/123.png")}
                style={styles.taskBoxBg}
                imageStyle={{ borderRadius: 10 }}
              >
                <View style={styles.overlay} />
                <Text style={styles.taskTitle}>Progress</Text>
                <Text style={styles.taskValue}>{taskStats.progress}%</Text>
              </ImageBackground>
            </View>

            <View style={styles.taskBox}>
              <ImageBackground
                source={require("../images/123.png")}
                style={styles.taskBoxBg}
                imageStyle={{ borderRadius: 10 }}
              >
                <View style={styles.overlay} />
                <Text style={styles.taskTitle}>Completed Tasks</Text>
                <Text style={styles.taskValue}>{taskStats.completed}</Text>
              </ImageBackground>
            </View>

            <View style={styles.taskBox}>
              <ImageBackground
                source={require("../images/123.png")}
                style={styles.taskBoxBg}
                imageStyle={{ borderRadius: 10 }}
              >
                <View style={styles.overlay} />
                <Text style={styles.taskTitle}>Active Tasks</Text>
                <Text style={styles.taskValue}>{taskStats.active}</Text>
              </ImageBackground>
            </View>

            <View style={styles.taskBox}>
              <ImageBackground
                source={require("../images/123.png")}
                style={styles.taskBoxBg}
                imageStyle={{ borderRadius: 10 }}
              >
                <View style={styles.overlay} />
                <Text style={styles.taskTitle}>Due Tasks</Text>
                <Text style={styles.taskValue}>{taskStats.due}</Text>
              </ImageBackground>
            </View>
          </View>

          {/* Button */}
          <TouchableOpacity
            style={styles.taskBtn}
            onPress={() => navigation.navigate("MyTask")}
          >
            <Text style={styles.taskBtnText}>Go to Task Page</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bgImage: {
    flex: 1,
  },
  container: {
    padding: 15,
    flexGrow: 1,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  greetingBox: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  greetingText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
    marginBottom: 12,
  },

  tagline: {
    fontSize: 16,
    fontWeight: "500",
    color: "#555",
    textAlign: "center",
  },

  profileCard: {
    backgroundColor: "#fff",
    alignItems: "center",
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  name: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 10,
  },
  role: {
    fontSize: 14,
    color: "#777",
  },
  location: {
    fontSize: 12,
    color: "#777",
    marginBottom: 10,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#377355",
    borderRadius: 25,
    paddingHorizontal: 25,
    paddingVertical: 7,
    marginTop: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 4,
    elevation: 5,
    width: 250,
  },
  editText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 5,
  },

  taskHeading: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#000",
    textAlign: "center",
  },
  taskContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
  },
  taskBox: {
    width: "48%",
    height: 100,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 12,
  },
  taskBoxBg: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 15,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(210, 175, 111, 0.3)",
    borderRadius: 10,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  taskValue: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 6,
    color: "#377355",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  taskBtn: {
    backgroundColor: "#377355",
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 15,
    alignItems: "center",
  },
  taskBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
