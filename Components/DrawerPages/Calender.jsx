import React, { useEffect, useState } from "react";
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text } from "react-native";
import { Calendar } from "react-native-calendars";
import { useNavigation } from "@react-navigation/native";
import axiosInstance from "../TokenHandling/axiosInstance"; // ✅ apne axiosInstance ka path lagao

export default function Calender() {
  const [markedDates, setMarkedDates] = useState({});
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      // ✅ API se data fetch
      const res = await axiosInstance.get("/my-assigned-tasks/");
      const tasks = res.data.results || []; 
      console.log(res.data);
      
      // ✅ Marked dates banate hain (sirf incomplete tasks)
      const marked = {};
      tasks.forEach((task) => {
        if (!task.is_completed && task.start_date) {
          marked[task.start_date] = {
            marked: true,
            dotColor: "red",
          };
        }
      });

      setMarkedDates(marked);
      setLoading(false);
    } catch (error) {
      console.log("❌ Error fetching tasks:", error);
      setLoading(false);
    }
  };

  const handleDayPress = (day) => {
    const date = day.dateString;
    if (markedDates[date]) {
      navigation.navigate("MyTask", { date });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4880FF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
         <TouchableOpacity
              onPress={() => navigation.goBack()}
            >
              <Text>go back</Text>
            </TouchableOpacity>
      <Calendar
        markedDates={markedDates}
        onDayPress={handleDayPress}
        enableSwipeMonths={true}
        theme={{
          selectedDayBackgroundColor: "#4880FF",
          todayTextColor: "#c7c41c",
          arrowColor: "#4880FF",
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
