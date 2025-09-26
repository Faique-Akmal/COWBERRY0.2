// import React, { useState } from "react";
// import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, ScrollView } from "react-native";
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
//         "+05:30"
//       );
//     };

//     const payload = {
//       is_completed: status === "Complete",
//       completed_at: formatDateTime(completedAt),
//       completion_description: notes,
//     };

//     try {
//       const response = await axiosInstance.patch(`/tasks/${taskId}/`, payload);
//       Alert.alert("Success", "Task updated successfully");
//       navigation.goBack();
//     } catch (error) {
//       console.log("❌ Update error:", error.response?.data || error.message);
//       Alert.alert("Error", "Failed to update task");
//     }
//   };

//   return (
//      <KeyboardAvoidingView
//           style={{ flex: 1 }}
//           behavior={Platform.OS === "ios" ? "padding" : "height"}
//           keyboardVerticalOffset={80} // header ki height jitna offset
//         >
//           <ScrollView 
//         contentContainerStyle={{ flexGrow: 1 }}
//         keyboardShouldPersistTaps="handled"
//       >
//     <View style={styles.container}>
//       {/* Back Button */}
//       <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
//         <Text style={styles.backText}>← Go Back</Text>
//       </TouchableOpacity>

//       <View style={styles.card}>
//         <Text style={styles.heading}>Update Task</Text>

//         {/* Task Status */}
//         <Text style={styles.label}>Task Status</Text>
//         <View style={styles.row}>
//           <TouchableOpacity
//             style={[styles.option, status === "Complete" && styles.selected]}
//             onPress={() => setStatus("Complete")}
//           >
//             <Text style={[styles.optionText, status === "Complete" && styles.selectedText]}>
//               Complete
//             </Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={[styles.option, status === "Pending" && styles.selected]}
//             onPress={() => setStatus("Pending")}
//           >
//             <Text style={[styles.optionText, status === "Pending" && styles.selectedText]}>
//               Pending
//             </Text>
//           </TouchableOpacity>
//         </View>

//         {/* Date & Time Picker */}
//         <Text style={styles.label}>Completion Date & Time</Text>
//         <TouchableOpacity
//           onPress={() => setShowPicker({ show: true, mode: "date" })}
//           style={styles.input}
//         >
//           <Text style={{ color: "#333" }}>
//             {completedAt.toLocaleDateString()} {completedAt.toLocaleTimeString()}
//           </Text>
//         </TouchableOpacity>

//         {showPicker.show && (
//           <DateTimePicker
//             value={completedAt}
//             mode={showPicker.mode}
//             is24Hour={true}
//             display="default"
//             onChange={(event, date) => {
//               if (event.type === "dismissed") {
//                 setShowPicker({ show: false, mode: "date" });
//                 return;
//               }
//               if (date) {
//                 setCompletedAt(date);
//                 if (showPicker.mode === "date") {
//                   setShowPicker({ show: true, mode: "time" });
//                 } else {
//                   setShowPicker({ show: false, mode: "date" });
//                 }
//               }
//             }}
//           />
//         )}

//         {/* Completion Notes */}
//         <Text style={styles.label}>Completion Notes</Text>
//         <TextInput
//           style={[styles.input, { height: 80 }]}
//           value={notes}
//           onChangeText={setNotes}
//           placeholder="Enter notes"
//           multiline
//         />

//         {/* Buttons */}
//         <View style={styles.row}>
//           <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
//             <Text style={styles.cancelText}>Cancel</Text>
//           </TouchableOpacity>
//           <TouchableOpacity style={styles.updateBtn} onPress={handleUpdate}>
//             <Text style={styles.updateText}>Update</Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//     </View>
//     </ScrollView>
//     </KeyboardAvoidingView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { 
//     flex: 1,
//      padding: 20,
//       backgroundColor: "#f4f6f9" ,
     
//     },

//   backBtn: {
//      marginBottom: 10 
//     },
//   backText: { 
//     fontSize: 16, 
//     color: "#4880FF"
//    },

//   card: {
//     flex: 1,
//     backgroundColor: "#fff",
//     borderRadius: 16,
//     padding: 20,
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 3 },
//     shadowOpacity: 0.1,
//     shadowRadius: 6,
//     elevation: 4,
//   },

//   heading: { fontSize: 22, fontWeight: "bold", marginBottom: 20, color: "#333" },
//   label: { fontSize: 16, marginTop: 15, marginBottom: 8, fontWeight: "600", color: "#555" },

//   input: {
//     borderWidth: 1,
//     borderColor: "#ddd",
//     borderRadius: 10,
//     padding: 12,
//     backgroundColor: "#fafafa",
//   },

//   row: { flexDirection: "row", justifyContent: "space-between", marginVertical: 12 },

//   option: {
//     flex: 1,
//     padding: 12,
//     marginHorizontal: 5,
//     borderWidth: 1,
//     borderRadius: 10,
//     borderColor: "#ccc",
//     alignItems: "center",
//     backgroundColor: "#fafafa",
//   },
//   optionText: { color: "#333", fontWeight: "500" },
//   selected: { backgroundColor: "#4E8D7C", borderColor: "#4E8D7C" },
//   selectedText: { color: "#fff", fontWeight: "600" },

//   cancelBtn: {
//     flex: 1,
//     padding: 15,
//     alignItems: "center",
//     backgroundColor: "#eee",
//     borderRadius: 10,
//     marginRight: 10,
//   },
//   cancelText: { color: "#333", fontWeight: "500" },

//   updateBtn: {
//     flex: 1,
//     padding: 15,
//     alignItems: "center",
//     backgroundColor: "#4E8D7C",
//     borderRadius: 10,
//   },
//   updateText: { color: "#fff", fontWeight: "600" },
// });

// UpdateTask.jsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import axiosInstance from "../TokenHandling/axiosInstance";

export default function UpdateTask({ route, navigation }) {
  const routeParams = route?.params || {};
  const initialTaskId = routeParams.taskId || routeParams.taskName || "";
  const [taskId] = useState(initialTaskId);
  const [status, setStatus] = useState(routeParams.status || "Working"); // default to Working
  const [completedAt, setCompletedAt] = useState(new Date());
  const [showPicker, setShowPicker] = useState({ show: false, mode: "date" });
  const [notes, setNotes] = useState("");
  const [progress, setProgress] = useState(
    routeParams.progress !== undefined && routeParams.progress !== null
      ? String(routeParams.progress)
      : ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // If page opened with status/progress passed in, prefill
    if (routeParams.status) setStatus(routeParams.status);
    if (routeParams.progress !== undefined && routeParams.progress !== null)
      setProgress(String(routeParams.progress));
  }, [routeParams]);

  const pad = (n) => (n < 10 ? "0" + n : n);
  const formatDateTime = (date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}+05:30`;

  const buildMethodPath = (methodName) => {
    const base = axiosInstance?.defaults?.baseURL || "";
    const normalizedBase = base.replace(/\/+$/, "");
    const baseHasApiMethod = normalizedBase.endsWith("/api/method");
    const path = baseHasApiMethod ? `/${methodName}` : `/api/method/${methodName}`;
    console.log("Request final URL preview:", `${normalizedBase}${path}`);
    return path;
  };

  const handleUpdate = async () => {
    if (!taskId) return Alert.alert("Error", "Task ID missing");

    // If Completed => ensure progress set to 100
    let progressToSend = progress;
    if (status === "Completed") {
      progressToSend = "100";
      setProgress("100");
    }

    if (progressToSend && isNaN(Number(progressToSend))) {
      return Alert.alert("Error", "Progress must be numeric");
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("task_id", taskId);
      formData.append("status", status);
      formData.append("progress", progressToSend ? String(Number(progressToSend)) : "0");
      formData.append("description", notes || "");
      // include completed_at if provided
      if (completedAt) formData.append("completed_at", formatDateTime(completedAt));

      const methodName = "cowberry_app.api.tasks.update_task";
      const path = buildMethodPath(methodName);

      console.log("POST", path, "formData parts (if available):", formData._parts || "[not inspectable]");

      const response = await axiosInstance.post(path, formData);
      console.log("Update response:", response?.data);

      const message = response?.data?.message?.message || "Task updated successfully";

      // Navigate back to MyTask and request a refresh (replace "MyTask" if your route name differs)
      navigation.navigate("MyTask", { refreshKey: Date.now() });

      // show success toast/alert
      Alert.alert("Success", message);
    } catch (error) {
      console.log("❌ Update error:", error?.response?.data || error?.toString?.());
      const serverMsg = error?.response?.data || {};
      const friendly =
        serverMsg?.message?.message ||
        serverMsg?.message ||
        (serverMsg?.exc_type ? "Server validation error" : "Failed to update task");
      Alert.alert("Error", String(friendly));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={80}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} disabled={isSubmitting}>
            <Text style={styles.backText}>← Go Back</Text>
          </TouchableOpacity>

          <View style={styles.card}>
            <Text style={styles.heading}>Update Task</Text>

            <Text style={styles.label}>Task ID</Text>
            <TextInput style={[styles.input, { backgroundColor: "#eee" }]} value={taskId} editable={false} />

            <Text style={styles.label}>Task Status</Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.option, status === "Working" && styles.selected]}
                onPress={() => setStatus("Working")}
                disabled={isSubmitting}
              >
                <Text style={[styles.optionText, status === "Working" && styles.selectedText]}>Working</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.option, status === "Open" && styles.selected]}
                onPress={() => setStatus("Open")}
                disabled={isSubmitting}
              >
                <Text style={[styles.optionText, status === "Open" && styles.selectedText]}>Open</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.option, status === "Completed" && styles.selected]}
                onPress={() => {
                  setStatus("Completed");
                  setProgress("100"); // also update UI instantly
                }}
                disabled={isSubmitting}
              >
                <Text style={[styles.optionText, status === "Completed" && styles.selectedText]}>Completed</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Progress (%)</Text>
            <TextInput
              style={styles.input}
              value={progress}
              onChangeText={(t) => setProgress(t)}
              placeholder="0"
              keyboardType="numeric"
              maxLength={3}
              editable={!isSubmitting}
            />

            <Text style={styles.label}>Completion Date & Time</Text>
            <TouchableOpacity onPress={() => setShowPicker({ show: true, mode: "date" })} style={styles.input}>
              <Text>
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
                    if (showPicker.mode === "date") setShowPicker({ show: true, mode: "time" });
                    else setShowPicker({ show: false, mode: "date" });
                  }
                }}
              />
            )}

            <Text style={styles.label}>Notes / Description</Text>
            <TextInput style={[styles.input, { height: 80 }]} value={notes} onChangeText={setNotes} multiline editable={!isSubmitting} />

            <View style={styles.row}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()} disabled={isSubmitting}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.updateBtn} onPress={handleUpdate} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.updateText}>Update</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// (styles same as before — reuse)
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f4f6f9" },
  backBtn: { marginBottom: 10 },
  backText: { fontSize: 16, color: "#4880FF" },
  card: { flex: 1, backgroundColor: "#fff", borderRadius: 16, padding: 20, elevation: 4 },
  heading: { fontSize: 22, fontWeight: "bold", marginBottom: 20, color: "#333" },
  label: { fontSize: 16, marginTop: 15, marginBottom: 8, fontWeight: "600", color: "#555" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 12, backgroundColor: "#fafafa" },
  row: { flexDirection: "row", justifyContent: "space-between", marginVertical: 12 },
  option: { flex: 1, padding: 12, marginHorizontal: 5, borderWidth: 1, borderRadius: 10, borderColor: "#ccc", alignItems: "center", backgroundColor: "#fafafa" },
  optionText: { color: "#333", fontWeight: "500" },
  selected: { backgroundColor: "#4E8D7C", borderColor: "#4E8D7C" },
  selectedText: { color: "#fff", fontWeight: "600" },
  cancelBtn: { flex: 1, padding: 15, alignItems: "center", backgroundColor: "#eee", borderRadius: 10, marginRight: 10 },
  cancelText: { color: "#333", fontWeight: "500" },
  updateBtn: { flex: 1, padding: 15, alignItems: "center", backgroundColor: "#4E8D7C", borderRadius: 10 },
  updateText: { color: "#fff", fontWeight: "600" },
});
