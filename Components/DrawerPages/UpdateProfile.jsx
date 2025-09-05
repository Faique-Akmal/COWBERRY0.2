import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import axiosInstance from "../TokenHandling/axiosInstance"; 

export default function UpdateProfile({ route, navigation }) {
  const { userData } = route.params;

  const [form, setForm] = useState({
    username: userData.username || "",
    email: userData.email || "",
    branch: String(userData.branch || ""),
    mobile_no: userData.mobile_no || "",
    birth_date: userData.birth_date || "",
    address: userData.address || "",
    first_name: userData.first_name || "",
    last_name: userData.last_name || "",
    employee_code: userData.employee_code || "",
  });

  const [showDate, setShowDate] = useState(false);

  const handleChange = (key, value) => {
    setForm({ ...form, [key]: value });
  };



//   Patch API    /users/{id}/
const handleUpdate = async () => {
  try {
    // Direct JSON body
    const response = await axiosInstance.patch(`/users/${userData.id}/`, form, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("✅ Profile updated:", response.data);
    Alert.alert("Success", "Profile updated successfully!");
    navigation.goBack();
  } catch (error) {
    console.error("❌ Update failed:", error.response?.data || error);
    Alert.alert("Error", "Failed to update profile");
  }
};





  return (
     <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={80} // header ki height jitna offset
      > 
    <ScrollView style={styles.container}>
      {Object.keys(form).map((key) =>
        key !== "birth_date" ? (
          <TextInput
            key={key}
            style={styles.input}
            placeholder={key.replace("_", " ").toUpperCase()}
            value={form[key]}
            onChangeText={(val) => handleChange(key, val)}
          />
        ) : (
          <TouchableOpacity
            key={key}
            style={styles.input}
            onPress={() => setShowDate(true)}
          >
            <Text>{form.birth_date || "Select Birth Date"}</Text>
          </TouchableOpacity>
        )
      )}

      {showDate && (
        <DateTimePicker
          value={form.birth_date ? new Date(form.birth_date) : new Date()}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDate(false);
            if (date) {
              handleChange("birth_date", date.toISOString().split("T")[0]); // yyyy-mm-dd
            }
          }}
        />
      )}

      <TouchableOpacity style={styles.button} onPress={handleUpdate}>
        <Text style={styles.buttonText}>Update Profile</Text>
      </TouchableOpacity>
    </ScrollView>
     </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: "#fff",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#377355",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
