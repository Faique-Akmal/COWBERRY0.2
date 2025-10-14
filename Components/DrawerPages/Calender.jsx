import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  ScrollView,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { useNavigation } from "@react-navigation/native";
import axiosInstance from "../TokenHandling/axiosInstance";
import Ionicons from "react-native-vector-icons/Ionicons";

export default function Calender() {
  const [allRecords, setAllRecords] = useState([]); // combined records (leave, attendance, holiday)
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("Leave"); // Leave | Attendance | Holiday | All
  const navigation = useNavigation();

  // Leave type color mapping
  const leaveColors = {
    "Casual Leave": "#FF5733", // orange. 
    "Leave Without Pay": "#FF33A8", // pink/magenta
    "sick leave": "#33C1FF", // blue
    "Work From Home": "#9D33FF", // purple
    Present: "#377355", // green-ish
    Absent: "#FF0000", // red
    Holiday: "#FFD700", // gold for holiday (you can change)
  };

  // isColorDark helper
  const isColorDark = (hexColor) => {
    const hex = (hexColor || "#000000").replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminance < 150;
  };

  useEffect(() => {
    fetchData();
  }, []);

  // fetch attendance/leave + holidays and combine
  const fetchData = async () => {
    try {
      // 1) existing attendance/leave API
      const res1 = await axiosInstance.get("/cowberry_app.api.mark_attandance.get_attendance");
      const records = res1.data.message || [];

  
      const holidayRes = await axiosInstance.get(
        "/cowberry_app.api.holiday.get_holiday_list"
      );
      const holidays = holidayRes.data.message || [];

      // Normalize holidays to match record shape and mark type = 'Holiday'
      const holidayRecords = holidays.map((h) => ({
        type: "Holiday",
        // keep original holiday_date field too
        holiday_date: h.holiday_date,
        date: h.holiday_date, // add date so existing helpers can pick it
        description: h.description,
        weekly_off: h.weekly_off,
        holiday_list_name: h.holiday_list_name,
      }));

      // combine: attendance/leave first, then holidays appended
      const combined = [...records, ...holidayRecords];

      setAllRecords(combined);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setAllRecords([]);
      setLoading(false);
    }
  };

  // helper to normalize date string
  const toDateStr = (d) => {
    if (!d) return null;
    if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}/.test(d)) {
      return d.split("T")[0];
    }
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return null;
    return dateObj.toISOString().split("T")[0];
  };

  // compute marked dates based on selectedCategory
  const displayedMarkedDates = useMemo(() => {
    const marked = {};

    allRecords.forEach((rec) => {
      const type = (rec.type || (rec.record_type || "")).toString().toLowerCase();

      if (selectedCategory === "Leave" && type === "leave") {
        const fromStr = rec?.date_range?.from;
        const toStr = rec?.date_range?.to;
        const color = leaveColors[rec.leave_type] || "#000000";

        if (fromStr && toStr) {
          let start = new Date(fromStr);
          const end = new Date(toStr);
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            while (start <= end) {
              const dateStr = start.toISOString().split("T")[0];
              marked[dateStr] = { color };
              start.setDate(start.getDate() + 1);
            }
          }
        } else {
          const single = toDateStr(rec.date);
          if (single) marked[single] = { color };
        }
      } else if (selectedCategory === "Attendance" && type === "attendance") {
        const dateStr = toDateStr(rec.date);
        if (!dateStr) return;
        const color =
          (rec.status || "").toLowerCase() === "present" ? leaveColors["Present"] : leaveColors["Absent"];
        marked[dateStr] = { color };
      } else if (selectedCategory === "Holiday" && type === "holiday") {
        // holiday records we normalized have date/holiday_date single date
        const dateStr = toDateStr(rec.holiday_date || rec.date);
        if (dateStr) {
          const color = leaveColors["Holiday"] || "#FFD700";
          marked[dateStr] = { color, description: rec.description };
        }
      } else if (selectedCategory === "All") {
        // show everything
        if (type === "leave") {
          const fromStr = rec?.date_range?.from;
          const toStr = rec?.date_range?.to;
          const color = leaveColors[rec.leave_type] || "#000000";
          if (fromStr && toStr) {
            let start = new Date(fromStr);
            const end = new Date(toStr);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
              while (start <= end) {
                const dateStr = start.toISOString().split("T")[0];
                marked[dateStr] = { color };
                start.setDate(start.getDate() + 1);
              }
            }
          } else {
            const single = toDateStr(rec.date);
            if (single) marked[single] = { color };
          }
        } else if (type === "attendance") {
          const dateStr = toDateStr(rec.date);
          if (!dateStr) return;
          const color =
            (rec.status || "").toLowerCase() === "present" ? leaveColors["Present"] : leaveColors["Absent"];
          marked[dateStr] = { color };
        } else if (type === "holiday") {
          const dateStr = toDateStr(rec.holiday_date || rec.date);
          if (dateStr) {
            const color = leaveColors["Holiday"] || "#FFD700";
            marked[dateStr] = { color, description: rec.description };
          }
        }
      }
    });

    return marked;
  }, [allRecords, selectedCategory]);

  const handleDayPress = (day) => {
    const date = day.dateString;
    if (displayedMarkedDates[date]) {
      navigation.navigate("MyTask", { date });
    }
  };

  const topButtons = [
    { key: "Leave", label: "Leave" },
    { key: "Attendance", label: "Attendance" },
    { key: "Holiday", label: "Holiday" },
    { key: "All", label: "All" },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4880FF" />
      </View>
    );
  }

  // Legend selection for Holiday mode
  const legendEntries = (() => {
    if (selectedCategory === "Leave") {
      return Object.keys(leaveColors)
        .filter((k) => k !== "Present" && k !== "Absent" && k !== "Holiday")
        .map((k) => ({ key: k, color: leaveColors[k] }));
    } else if (selectedCategory === "Attendance") {
      return [
        { key: "Present", color: leaveColors["Present"] },
        { key: "Absent", color: leaveColors["Absent"] },
      ];
    } else if (selectedCategory === "Holiday") {
      return [{ key: "Holiday", color: leaveColors["Holiday"] }];
    } else {
      return Object.entries(leaveColors).map(([k, color]) => ({ key: k, color }));
    }
  })();

  return (
    <View style={styles.container}>

          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 10, marginTop:10, marginBottom:20 }}>
          <Ionicons name="arrow-back" size={28} color="#000" />
        </TouchableOpacity>

      <View style={styles.headerRow}>
    

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toggleScroll}>
          {topButtons.map((btn) => {
            const active = selectedCategory === btn.key;
            return (
              <TouchableOpacity
                key={btn.key}
                onPress={() => setSelectedCategory(btn.key)}
                style={[styles.toggleButton, active && styles.toggleButtonActive]}
              >
                <Text style={[styles.toggleText, active && styles.toggleTextActive]}>{btn.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

    <Calendar
  onDayPress={handleDayPress}
  enableSwipeMonths={true}
  theme={{
    todayTextColor: "#377355",
    arrowColor: "#377355",
  }}
  dayComponent={({ date, state }) => {
    const dateStr = date.dateString;
    const mark = displayedMarkedDates[dateStr];

    // is today?
    const todayStr = new Date().toISOString().split("T")[0];
    const isToday = dateStr === todayStr;

    // base background: marked color or white
    const bgColor = mark ? mark.color : "#ffffff";

    // text color: if bg is dark -> white, else black; disabled keep grey
    const textColor =
      state === "disabled"
        ? "#d9d9d9"
        : mark
        ? isColorDark(bgColor)
          ? "#fff"
          : "#000"
        : "#000";

    // if it's today, show an outer ring. Choose ring color that contrasts (use theme green)
    const ringColor = "#377355";

    return (
      <View
        style={{
          width: 40,
          height: 40,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* Outer ring for today */}
        <View
          style={{
            position: "absolute",
            width: 40,
            height: 40,
            borderRadius: 40,
            justifyContent: "center",
            alignItems: "center",
            // show ring only for today
            borderWidth: isToday ? 2 : 0,
            borderColor: isToday ? ringColor : "transparent",
          }}
        />

        {/* Inner circle (actual day badge), shows mark color or white */}
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

        {/* Optional: small description dot for holidays or other info (uncomment if you want) */}
        {/* {mark?.description && (
          <View style={{ position: "absolute", bottom: 2, width: 6, height: 6, borderRadius: 3, backgroundColor: "#000" }} />
        )} */}
      </View>
    );
  }}
/>


      <View style={styles.legendContainer}>
        {legendEntries.map((entry) => (
          <View key={entry.key} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: entry.color }]} />
            <Text style={styles.legendText}>{entry.key}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
     flex: 1, 
    //  paddingTop: 40,
      backgroundColor: "#fff",
       paddingHorizontal: 12 
      },
  loadingContainer: {
     flex: 1, 
     justifyContent: "center",
      alignItems: "center" 
    },
  legendContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 20,
    justifyContent: "flex-start",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 8,
    marginVertical: 5,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: { fontSize: 14 },

  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  toggleScroll: { alignItems: "center" },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#d0d0d0",
    marginRight: 10,
    backgroundColor: "#fff",
  },
  toggleButtonActive: {
    backgroundColor: "#377355",
    borderColor: "#377355",
  },
  toggleText: {
    color: "#333",
    fontSize: 14,
  },
  toggleTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
});

