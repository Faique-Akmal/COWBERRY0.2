import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  Linking,
  Alert,
  RefreshControl,
} from "react-native";
import axiosInstance from "../TokenHandling/axiosInstance";
import { useFocusEffect } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";


export default function MyTask({ navigation }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTasks = async () => {
    try {
      const response = await axiosInstance.get("/my-assigned-tasks/");
      setTasks(response.data.results || []);
console.log(tasks);

    } catch (error) {
      console.log("Error fetching tasks:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Screen focus hone par data refresh ho jaye (update ke baad wapas aaye to latest dikhe)
  useFocusEffect(
    useCallback(() => {
      fetchTasks();
    }, [])
  );

  // Pull to refresh handler
  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  // Function to open Google Maps
  const openInGoogleMaps = (lat, lng) => {
    if (!lat || !lng) {
      Alert.alert("Location not available", "Destination coordinates missing");
      return;
    }
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Unable to open Google Maps");
    });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card}>
      <Text style={styles.title}>Title : {item.title}</Text>
      <Text style={styles.desc}>Description : {item.description}</Text>
      <Text style={styles.date}>Start Date : {item.start_date}</Text>
      <Text style={styles.date}>{item.completion_description}</Text>

      {/*  Status badge */}
      <View style={[styles.statusBox, { backgroundColor: "#fff" }]}>
        <Text
          style={[
            styles.statusText,
            { color: item.is_completed ? "green" : "red" },
          ]}
        >
          {item.is_completed ? "Completed" : "Pending"}
        </Text>
      </View>

      <Text style={styles.address}>{item.address}</Text>

      {/*  Google Maps Button */}
      <TouchableOpacity
        style={styles.mapButton}

        onPress={() => {
          console.log("Task LatLng:", item.dest_lat, item.dest_lng);
          openInGoogleMaps(item.dest_lat, item.dest_lng)
        }
        }
      >
        <Text style={styles.mapButtonText}>Start Task</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.mapButton}
        onPress={() => navigation.navigate("UpdateStartTask", { taskId: item.id })}
      >
        <Text style={styles.mapButtonText}>Update Task</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#4880FF" />
      </View>
    );
  }

  if (!loading && tasks.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 10 }}>
          <Ionicons name="arrow-back" size={26} color="#377355" />
        </TouchableOpacity>
        <Text style={{ fontSize: 16, color: "#555" }}>No tasks assigned</Text>
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 10 }}>
        <Ionicons name="arrow-back" size={26} color="#377355" />
      </TouchableOpacity>

      <FlatList
        data={tasks}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
  },
  card: {
    backgroundColor: "#b17f5a",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    ...Platform.select({
      android: { elevation: 3 },
    }),
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  desc: {
    fontSize: 14,
    color: "#000",
    marginVertical: 4,
  },
  date: {
    fontSize: 13,
    color: "#000",
  },
  statusBox: {
    marginTop: 6,
    borderRadius: 5,
    alignSelf: "flex-start",
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
  },
  address: {
    fontSize: 12,
    color: "#000",
    marginTop: 4,
  },
  mapButton: {
    marginTop: 10,
    backgroundColor: "#4E8D7C",
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
    width: 150,
    alignSelf: "center",
  },
  mapButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
