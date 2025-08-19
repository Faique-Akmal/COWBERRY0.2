// import React, { useState } from "react";
// import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
// import DateTimePicker from "@react-native-community/datetimepicker";
// import axiosInstance from "../TokenHandling/axiosInstance";

// export default function UpdateTask({ route, navigation }) {
//   const { taskId } = route.params;
//   const [status, setStatus] = useState("");
//   const [completedAt, setCompletedAt] = useState(new Date());
//   const [showPicker, setShowPicker] = useState({ show: false, mode: "date" });
//   const [notes, setNotes] = useState("");

//   const handleUpdate = async () => {
//     if (!status) return Alert.alert("Error", "Please select task status");
//     const pad = (n) => (n < 10 ? "0" + n : n);

//     const formatDateTime = (date) => {
//       return (
//         date.getFullYear() +
//         "-" +
//         pad(date.getMonth() + 1) +
//         "-" +
//         pad(date.getDate()) +
//         "T" +
//         pad(date.getHours()) +
//         ":" +
//         pad(date.getMinutes()) +
//         ":" +
//         pad(date.getSeconds()) +
//         "+05:30"  // IST offset fix
//       );
//     };

//     const payload = {
//       is_completed: status === "Complete",
//       completed_at: formatDateTime(completedAt),  // ✅ local IST string
//       completion_description: notes,
//     };

//     try {

//       const payload = {
//         is_completed: status === "Complete",
//         completed_at: formatDateTime(completedAt),
//         completion_description: notes,
//       };

//       const response = await axiosInstance.patch(`/tasks/${taskId}/`, payload);

//       Alert.alert("Success", "Task updated successfully");
//       navigation.goBack();
//     } catch (error) {
//       console.log("❌ Update error:", error.response?.data || error.message);
//       Alert.alert("Error", "Failed to update task");
//     }
//   };

//   return (
//     <View style={styles.container}>

//       <TouchableOpacity
//         onPress={() => navigation.goBack()}
//       >
//         <Text>go back</Text>
//       </TouchableOpacity>

//       <Text style={styles.heading}>Update Task</Text>

//       {/* Task Status */}
//       <Text style={styles.label}>Task Status</Text>
//       <View style={styles.row}>
//         <TouchableOpacity
//           style={[styles.option, status === "Complete" && styles.selected]}
//           onPress={() => setStatus("Complete")}
//         >
//           <Text>Complete</Text>
//         </TouchableOpacity>
//         <TouchableOpacity
//           style={[styles.option, status === "Pending" && styles.selected]}
//           onPress={() => setStatus("Pending")}
//         >
//           <Text>Pending</Text>
//         </TouchableOpacity>
//       </View>

//       {/* Date & Time Picker */}
//       <Text style={styles.label}>Completion Date & Time</Text>
//       <TouchableOpacity
//         onPress={() => setShowPicker({ show: true, mode: "date" })}
//         style={styles.input}
//       >
//         <Text>
//           {completedAt.toLocaleDateString()} {completedAt.toLocaleTimeString()}
//         </Text>
//       </TouchableOpacity>

//       {showPicker.show && (
//         <DateTimePicker
//           value={completedAt}
//           mode={showPicker.mode}
//           is24Hour={true}
//           display="default"
//           onChange={(event, date) => {
//             if (event.type === "dismissed") {
//               setShowPicker({ show: false, mode: "date" });
//               return;
//             }
//             if (date) {
//               setCompletedAt(date);
//               if (showPicker.mode === "date") {
//                 // first pick date → now pick time
//                 setShowPicker({ show: true, mode: "time" });
//               } else {
//                 // after time selection
//                 setShowPicker({ show: false, mode: "date" });
//               }
//             }
//           }}
//         />
//       )}

//       {/* Completion Notes */}
//       <Text style={styles.label}>Completion Notes</Text>
//       <TextInput
//         style={[styles.input, { height: 80 }]}
//         value={notes}
//         onChangeText={setNotes}
//         placeholder="Enter notes"
//         multiline
//       />

//       {/* Buttons */}
//       <View style={styles.row}>
//         <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
//           <Text style={{ color: "#000" }}>Cancel</Text>
//         </TouchableOpacity>
//         <TouchableOpacity style={styles.updateBtn} onPress={handleUpdate}>
//           <Text style={{ color: "#fff" }}>Update</Text>
//         </TouchableOpacity>
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, padding: 20, backgroundColor: "#fff" },
//   heading: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
//   label: { fontSize: 16, marginTop: 10, marginBottom: 5 },
//   input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10 },
//   row: { flexDirection: "row", justifyContent: "space-between", marginVertical: 10 },
//   option: { padding: 10, borderWidth: 1, borderRadius: 8, borderColor: "#ccc", marginHorizontal: 5 },
//   selected: { backgroundColor: "#B27F5A", borderColor: "#B27F5A" },
//   cancelBtn: { flex: 1, padding: 15, alignItems: "center", backgroundColor: "#ccc", borderRadius: 8, marginRight: 10 },
//   updateBtn: { flex: 1, padding: 15, alignItems: "center", backgroundColor: "#4880FF", borderRadius: 8 },
// });


import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import axiosInstance from "../TokenHandling/axiosInstance";

export default function UpdateTask({ route, navigation }) {
  const { taskId } = route.params;
  const [status, setStatus] = useState("");
  const [completedAt, setCompletedAt] = useState(new Date());
  const [showPicker, setShowPicker] = useState({ show: false, mode: "date" });
  const [notes, setNotes] = useState("");

  const handleUpdate = async () => {
    if (!status) return Alert.alert("Error", "Please select task status");
    const pad = (n) => (n < 10 ? "0" + n : n);

    const formatDateTime = (date) => {
      return (
        date.getFullYear() +
        "-" +
        pad(date.getMonth() + 1) +
        "-" +
        pad(date.getDate()) +
        "T" +
        pad(date.getHours()) +
        ":" +
        pad(date.getMinutes()) +
        ":" +
        pad(date.getSeconds()) +
        "+05:30"
      );
    };

    const payload = {
      is_completed: status === "Complete",
      completed_at: formatDateTime(completedAt),
      completion_description: notes,
    };

    try {
      const response = await axiosInstance.patch(`/tasks/${taskId}/`, payload);
      Alert.alert("Success", "Task updated successfully");
      navigation.goBack();
    } catch (error) {
      console.log("❌ Update error:", error.response?.data || error.message);
      Alert.alert("Error", "Failed to update task");
    }
  };

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Go Back</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.heading}>Update Task</Text>

        {/* Task Status */}
        <Text style={styles.label}>Task Status</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.option, status === "Complete" && styles.selected]}
            onPress={() => setStatus("Complete")}
          >
            <Text style={[styles.optionText, status === "Complete" && styles.selectedText]}>
              Complete
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.option, status === "Pending" && styles.selected]}
            onPress={() => setStatus("Pending")}
          >
            <Text style={[styles.optionText, status === "Pending" && styles.selectedText]}>
              Pending
            </Text>
          </TouchableOpacity>
        </View>

        {/* Date & Time Picker */}
        <Text style={styles.label}>Completion Date & Time</Text>
        <TouchableOpacity
          onPress={() => setShowPicker({ show: true, mode: "date" })}
          style={styles.input}
        >
          <Text style={{ color: "#333" }}>
            {completedAt.toLocaleDateString()} {completedAt.toLocaleTimeString()}
          </Text>
        </TouchableOpacity>

        {showPicker.show && (
          <DateTimePicker
            value={completedAt}
            mode={showPicker.mode}
            is24Hour={true}
            display="default"
            onChange={(event, date) => {
              if (event.type === "dismissed") {
                setShowPicker({ show: false, mode: "date" });
                return;
              }
              if (date) {
                setCompletedAt(date);
                if (showPicker.mode === "date") {
                  setShowPicker({ show: true, mode: "time" });
                } else {
                  setShowPicker({ show: false, mode: "date" });
                }
              }
            }}
          />
        )}

        {/* Completion Notes */}
        <Text style={styles.label}>Completion Notes</Text>
        <TextInput
          style={[styles.input, { height: 80 }]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Enter notes"
          multiline
        />

        {/* Buttons */}
        <View style={styles.row}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.updateBtn} onPress={handleUpdate}>
            <Text style={styles.updateText}>Update</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
     padding: 20,
      backgroundColor: "#f4f6f9" ,
     
    },

  backBtn: {
     marginBottom: 10 
    },
  backText: { 
    fontSize: 16, 
    color: "#4880FF"
   },

  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },

  heading: { fontSize: 22, fontWeight: "bold", marginBottom: 20, color: "#333" },
  label: { fontSize: 16, marginTop: 15, marginBottom: 8, fontWeight: "600", color: "#555" },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fafafa",
  },

  row: { flexDirection: "row", justifyContent: "space-between", marginVertical: 12 },

  option: {
    flex: 1,
    padding: 12,
    marginHorizontal: 5,
    borderWidth: 1,
    borderRadius: 10,
    borderColor: "#ccc",
    alignItems: "center",
    backgroundColor: "#fafafa",
  },
  optionText: { color: "#333", fontWeight: "500" },
  selected: { backgroundColor: "#4E8D7C", borderColor: "#4E8D7C" },
  selectedText: { color: "#fff", fontWeight: "600" },

  cancelBtn: {
    flex: 1,
    padding: 15,
    alignItems: "center",
    backgroundColor: "#eee",
    borderRadius: 10,
    marginRight: 10,
  },
  cancelText: { color: "#333", fontWeight: "500" },

  updateBtn: {
    flex: 1,
    padding: 15,
    alignItems: "center",
    backgroundColor: "#4E8D7C",
    borderRadius: 10,
  },
  updateText: { color: "#fff", fontWeight: "600" },
});
