import React, { useEffect, useState } from "react";
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text } from "react-native";
import { Calendar } from "react-native-calendars";
import { useNavigation } from "@react-navigation/native";
import axiosInstance from "../TokenHandling/axiosInstance";
import Ionicons from "react-native-vector-icons/Ionicons";

export default function Calender() {
  const [markedDates, setMarkedDates] = useState({});
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  // Leave type color mapping
  const leaveColors = {
  "Casual Leave": "#FF5733",      // orange
  "Leave Without Pay": "#FF0000",  // red
  "sick leave": "#33C1FF",         // blue
  "Work From Home": "#9D33FF",     // purple
  "Present": "#377355",             // gold
  "Absent": "#FF33A8",              // pink/magenta
};


  // Helper function to determine if color is dark
const isColorDark = (hexColor) => {
  // Remove '#' if present
  const hex = hexColor.replace('#', '');
  // Convert hex to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  // Calculate luminance (perceived brightness)
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  // Threshold: if luminance < 150 consider dark
  return luminance < 150;
};


  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      const res = await axiosInstance.get("/cowberry_app.api.mark_attandance.get_attendance");
      const records = res.data.message || [];

      const marked = {};

      records.forEach((rec) => {
        if (rec.type === "Leave") {
          let start = new Date(rec.date_range.from);
          const end = new Date(rec.date_range.to);
          const color = leaveColors[rec.leave_type] || "#000";

          while (start <= end) {
            const dateStr = start.toISOString().split("T")[0];
            marked[dateStr] = { color };
            start.setDate(start.getDate() + 1);
          }
        } else if (rec.type === "Attendance") {
          const dateStr = rec.date;
          const color = rec.status === "Present" ? leaveColors["Present"] : leaveColors["Absent"];
          marked[dateStr] = { color };
        }
      });

      setMarkedDates(marked);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching attendance:", error);
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
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 10 }}>
        <Ionicons name="arrow-back" size={26} color="#377355" />
      </TouchableOpacity>

      <Calendar
        onDayPress={handleDayPress}
        enableSwipeMonths={true}
        theme={{
          todayTextColor: "#377355",
          arrowColor: "#377355",
        }}
        dayComponent={({ date, state }) => {
  const dateStr = date.dateString;
  const mark = markedDates[dateStr];
  const bgColor = mark ? mark.color : "#fff";
  const textColor = mark ? (isColorDark(bgColor) ? "#fff" : "#000") : "#000";

  return (
    <View
      style={{
        width: 34,
        height: 34,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 50,
        backgroundColor: bgColor,
      }}
    >
      <Text style={{ color: textColor }}>{date.day}</Text>
    </View>
  );
}}
 />

      {/* Legend for dot colors */}
      <View style={styles.legendContainer}>
        {Object.entries(leaveColors).map(([key, color]) => (
          <View key={key} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{key}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, backgroundColor: "#fff" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  legendContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 65,
    justifyContent: "end",

  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 10,
    marginVertical: 5,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: { fontSize: 14 },
});

