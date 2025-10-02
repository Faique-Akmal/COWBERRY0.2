// MyTask.jsx
import React, { useCallback, useState } from "react";
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
  SafeAreaView,
  ImageBackground,
} from "react-native";
import axiosInstance from "../TokenHandling/axiosInstance";
import { useFocusEffect } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { BlurView } from "@react-native-community/blur";

export default function MyTask({ navigation }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Build method path robustly
  const buildMethodPath = (methodName) => {
    const base = axiosInstance?.defaults?.baseURL || "";
    const normalizedBase = base.replace(/\/+$/, "");
    const baseHasApiMethod = normalizedBase.endsWith("/api/method");
    const path = baseHasApiMethod ? `/${methodName}` : `/api/method/${methodName}`;
    console.log("Request final URL preview:", `${normalizedBase}${path}`);
    return path;
  };

  const fetchTasks = async () => {
    if (!refreshing) setLoading(true);
    try {
      const methodName = "cowberry_app.api.tasks.get_my_tasks";
      const path = buildMethodPath(methodName);
      const response = await axiosInstance.get(path);
      const newTasks = response?.data?.message?.tasks || [];
      setTasks(newTasks);
    } catch (error) {
      console.log("Error fetching tasks:", error?.toString?.() || error);
      if (error?.response) {
        console.log("status:", error.response.status);
        console.log("data:", error.response.data);
      }
      Alert.alert(
        "Unable to fetch tasks",
        `Server returned an error. See console logs for details (status: ${error?.response?.status || "no response"})`
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTasks();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

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

  const renderItem = ({ item }) => {
    const status = (item.status || "").toString();
    const statusLower = status.toLowerCase();
    const isWorking = statusLower === "working" || statusLower === "in progress";
    const isCompleted = statusLower === "completed" || statusLower === "done";
    const statusColor = isCompleted ? "#2e7d32" : isWorking ? "#D4A017" : "#b22222";

    let progressNum = 0;
    if (item.progress !== undefined && item.progress !== null) {
      progressNum = Number(item.progress) || 0;
      if (progressNum < 0) progressNum = 0;
      if (progressNum > 100) progressNum = 100;
    }

    const hasLocation = !!(item.dest_lat && item.dest_lng);

    return (
      <View style={styles.cardWrapper}>
        <View style={styles.card}>
          {/* Blur background */}
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="light"   // 'light' | 'dark' | 'xlight' etc.
            blurAmount={6}    // intensity
            reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.34)"
          />

          {/* optional overlay for text readability */}
          <View style={styles.cardOverlay} />

          <View style={styles.cardContent}>
            <Text style={styles.title}>{item.subject || item.name}</Text>
            <Text style={styles.small}>Task ID: {item.name}</Text>
            <Text style={styles.desc}>{item.description}</Text>

            <View style={styles.row}>
              <Text style={styles.meta}>Start: {item.exp_start_date || "-"}</Text>
              <Text style={styles.meta}>End: {item.exp_end_date || "-"}</Text>
            </View>

            <Text style={styles.meta}>priority: {item.priority || "-"}</Text>

            <View style={[styles.statusBox, { backgroundColor: statusColor }]}>
              <Text style={[styles.statusText, { color: "#fff" }]}>
                {isCompleted ? "Completed" : isWorking ? "Working" : status || "Unknown"}
              </Text>
            </View>

            <View style={{ marginTop: 10 }}>
              <Text style={{ fontSize: 12, color: "#000", marginBottom: 6 }}>
                Progress: {progressNum}%
              </Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressNum}%` }]} />
              </View>
            </View>

            <View style={styles.buttonsRow}>
              {hasLocation ? (
                <TouchableOpacity
                  style={styles.mapButton}
                  onPress={() => openInGoogleMaps(item.dest_lat, item.dest_lng)}
                >
                  <Text style={styles.mapButtonText}>Start Task</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.mapButton, styles.mapButtonDisabled]}
                  onPress={() => Alert.alert("No location", "This task has no coordinates")}
                >
                  <Text style={styles.mapButtonText}>No Location</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.mapButton, { marginLeft: 10 }]}
                onPress={() =>
                  navigation.navigate("UpdateStartTask", {
                    taskName: item.name,
                    status: item.status,
                    progress: item.progress,
                  })
                }
              >
                <Text style={styles.mapButtonText}>Update Task</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <ImageBackground source={require("../images/123.png")} style={styles.bgImage}>
        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.1)" }} />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color="#4880FF" />
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  if (!loading && tasks.length === 0) {
    return (
      <ImageBackground source={require("../images/123.png")} style={styles.bgImage}>
        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.25)" }} />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.emptyContainer}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 10 }}>
              <Ionicons name="arrow-back" size={28} color="#000" />
            </TouchableOpacity>
            <Text style={{ fontSize: 20, color: "#000", fontWeight: "600" }}>
              No tasks assigned
            </Text>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={require("../images/123.png")} style={styles.bgImage}>
      <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.1)" }} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 10 }}>
            <Ionicons name="arrow-back" size={26} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Tasks</Text>
        </View>

        <FlatList
          data={tasks}
          renderItem={renderItem}
          keyExtractor={(item) => item.name}
          contentContainerStyle={styles.container}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bgImage: { flex: 1, resizeMode: "cover" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    color: "#000",
    fontWeight: "600",
  },
  container: { padding: 12, paddingBottom: 40 },

  cardWrapper: {
    marginBottom: 12,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
    }),
  },
  card: {
    borderRadius: 12,
    overflow: "hidden", // blur respects rounded corners
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    // backgroundColor: "rgba(0,0,0,0.22)",
  },
  cardContent: { padding: 16 },

  title: { fontSize: 18, fontWeight: "bold", color: "#000", marginBottom: 5 },
  small: { fontSize: 12, color: "#000", marginBottom: 6 },
  desc: { fontSize: 14, color: "#000", marginVertical: 6 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  meta: { fontSize: 13, color: "#000", marginTop: 4 },

  statusBox: {
    marginTop: 8,
    borderRadius: 5,
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  statusText: { fontSize: 14, fontWeight: "600" },

  progressTrack: {
    height: 10,
    backgroundColor: "#e0e0e0",
    borderRadius: 6,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#377355" },

  buttonsRow: { flexDirection: "row", justifyContent: "center", marginTop: 10 },
  mapButton: {
    backgroundColor: "#377355",
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
    width: 150,
  },
  mapButtonDisabled: { backgroundColor: "#9aa4a0" },
  mapButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
});





// // MyTask.jsx before add blur effect in card bg
// import React, { useCallback, useState } from "react";
// import {
//   View,
//   Text,
//   FlatList,
//   StyleSheet,
//   ActivityIndicator,
//   TouchableOpacity,
//   Platform,
//   Linking,
//   Alert,
//   RefreshControl,
//   SafeAreaView,
//   ImageBackground
// } from "react-native";
// import axiosInstance from "../TokenHandling/axiosInstance";
// import { useFocusEffect } from "@react-navigation/native";
// import Ionicons from "react-native-vector-icons/Ionicons";

// export default function MyTask({ navigation }) {
//   const [tasks, setTasks] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);

//   // Build method path robustly (handles baseURL that may already include /api/method)
//   const buildMethodPath = (methodName) => {
//     const base = axiosInstance?.defaults?.baseURL || "";
//     const normalizedBase = base.replace(/\/+$/, "");
//     const baseHasApiMethod = normalizedBase.endsWith("/api/method");
//     const path = baseHasApiMethod ? `/${methodName}` : `/api/method/${methodName}`;
//     console.log("Request final URL preview:", `${normalizedBase}${path}`);
//     return path;
//   };

//   const fetchTasks = async () => {
//     // show loading indicator on fetch (unless pull-to-refresh)
//     if (!refreshing) setLoading(true);
//     try {
//       const methodName = "cowberry_app.api.tasks.get_my_tasks";
//       const path = buildMethodPath(methodName);
//       console.log("Calling GET", path);
//       const response = await axiosInstance.get(path);

//       console.log("GET response status:", response.status);
//       const newTasks = response?.data?.message?.tasks || [];
//       console.log("Fetched tasks (GET):", newTasks);
//       setTasks(newTasks);
//     } catch (error) {
//       console.log("Error fetching tasks:", error?.toString?.() || error);
//       if (error?.response) {
//         console.log("status:", error.response.status);
//         console.log("data:", error.response.data);
//       }
//       Alert.alert(
//         "Unable to fetch tasks",
//         `Server returned an error. See console logs for details (status: ${error?.response?.status || "no response"})`
//       );
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   };

//   // Refresh when screen gains focus
//   useFocusEffect(
//     useCallback(() => {
//       fetchTasks();
//     }, [])
//   );

//   const onRefresh = () => {
//     setRefreshing(true);
//     fetchTasks();
//   };

//   const openInGoogleMaps = (lat, lng) => {
//     if (!lat || !lng) {
//       Alert.alert("Location not available", "Destination coordinates missing");
//       return;
//     }
//     const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
//     Linking.openURL(url).catch(() => {
//       Alert.alert("Error", "Unable to open Google Maps");
//     });
//   };

//   // const renderItem = ({ item }) => {
//   //   // Normalize status to show consistent badges
//   //   const status = (item.status || "").toString();
//   //   const statusLower = status.toLowerCase();
//   //   const isWorking = statusLower === "working" || statusLower === "in progress";
//   //   const isCompleted = statusLower === "completed" || statusLower === "done";

//   //   const statusColor = isCompleted ? "#2e7d32" : isWorking ? "#ff9800" : "#b22222";

//   //   // Ensure progress number between 0-100
//   //   let progressNum = 0;
//   //   if (item.progress !== undefined && item.progress !== null) {
//   //     progressNum = Number(item.progress) || 0;
//   //     if (progressNum < 0) progressNum = 0;
//   //     if (progressNum > 100) progressNum = 100;
//   //   }

//   //   const hasLocation = !!(item.dest_lat && item.dest_lng);

//   //   return (

//   //     <View style={styles.card}>
//   //       <Text style={styles.title}>{item.subject || item.name}</Text>
//   //       <Text style={styles.small}>Task ID: {item.name}</Text>

//   //       <Text style={styles.desc}>{item.description}</Text>

//   //       <View style={styles.row}>
//   //         <Text style={styles.meta}>Start: {item.exp_start_date || "-"}</Text>
//   //         <Text style={styles.meta}>End: {item.exp_end_date || "-"}</Text>
//   //       </View>

//   //       <Text style={styles.meta}>priority: {item.priority || "-"}</Text>

//   //       <View style={[styles.statusBox, { backgroundColor: "#fff" }]}>
//   //         <Text style={[styles.statusText, { color: statusColor }]}>
//   //           {isCompleted ? "Completed" : isWorking ? "Working" : status || "Unknown"}
//   //         </Text>
//   //       </View>

//   //       {/* Progress bar + percent */}
//   //       <View style={{ marginTop: 10 }}>
//   //         <Text style={{ fontSize: 12, color: "#FFF", marginBottom: 6 }}>
//   //           Progress: {progressNum}%
//   //         </Text>

//   //         <View style={styles.progressTrack}>
//   //           <View style={[styles.progressFill, { width: `${progressNum}%` }]} />
//   //         </View>
//   //       </View>

//   //       <View style={styles.buttonsRow}>
//   //         {hasLocation ? (
//   //           <TouchableOpacity
//   //             style={styles.mapButton}
//   //             onPress={() => openInGoogleMaps(item.dest_lat, item.dest_lng)}
//   //           >
//   //             <Text style={styles.mapButtonText}>Start Task</Text>
//   //           </TouchableOpacity>
//   //         ) : (
//   //           <TouchableOpacity
//   //             style={[styles.mapButton, styles.mapButtonDisabled]}
//   //             onPress={() => Alert.alert("No location", "This task has no coordinates")}
//   //           >
//   //             <Text style={styles.mapButtonText}>No Location</Text>
//   //           </TouchableOpacity>
//   //         )}

//   //         {/* pass status & progress so Update screen pre-fills */}
//   //         <TouchableOpacity
//   //           style={[styles.mapButton, { marginLeft: 10 }]}
//   //           onPress={() =>
//   //             navigation.navigate("UpdateStartTask", {
//   //               taskName: item.name,
//   //               status: item.status,
//   //               progress: item.progress,
//   //             })
//   //           }
//   //         >
//   //           <Text style={styles.mapButtonText}>Update Task</Text>
//   //         </TouchableOpacity>
//   //       </View>
//   //     </View>

//   //   );
//   // };
// const renderItem = ({ item }) => {
//   // Normalize status to show consistent badges
//   const status = (item.status || "").toString();
//   const statusLower = status.toLowerCase();
//   const isWorking = statusLower === "working" || statusLower === "in progress";
//   const isCompleted = statusLower === "completed" || statusLower === "done";

//   const statusColor = isCompleted ? "#2e7d32" : isWorking ? "#D4A017" : "#b22222";

//   // Ensure progress number between 0-100
//   let progressNum = 0;
//   if (item.progress !== undefined && item.progress !== null) {
//     progressNum = Number(item.progress) || 0;
//     if (progressNum < 0) progressNum = 0;
//     if (progressNum > 100) progressNum = 100;
//   }

//   const hasLocation = !!(item.dest_lat && item.dest_lng);

//   return (
//     <View style={styles.card}>
//       <Text style={styles.title}>{item.subject || item.name}</Text>
//       <Text style={styles.small}>Task ID: {item.name}</Text>
//       <Text style={styles.desc}>{item.description}</Text>
//       <View style={styles.row}>
//         <Text style={styles.meta}>Start: {item.exp_start_date || "-"}</Text>
//         <Text style={styles.meta}>End: {item.exp_end_date || "-"}</Text>
//       </View>
//       <Text style={styles.meta}>priority: {item.priority || "-"}</Text>
//       <View style={[styles.statusBox, { backgroundColor: statusColor }]}>
//         <Text style={[styles.statusText, { color: "#fff" }]}> {/* White text for contrast */}
//           {isCompleted ? "Completed" : isWorking ? "Working" : status || "Unknown"}
//         </Text>
//       </View>
//       {/* Progress bar + percent */}
//       <View style={{ marginTop: 10 }}>
//         <Text style={{ fontSize: 12, color: "#FFF", marginBottom: 6 }}>
//           Progress: {progressNum}%
//         </Text>
//         <View style={styles.progressTrack}>
//           <View style={[styles.progressFill, { width: `${progressNum}%` }]} />
//         </View>
//       </View>
//       <View style={styles.buttonsRow}>
//         {hasLocation ? (
//           <TouchableOpacity
//             style={styles.mapButton}
//             onPress={() => openInGoogleMaps(item.dest_lat, item.dest_lng)}
//           >
//             <Text style={styles.mapButtonText}>Start Task</Text>
//           </TouchableOpacity>
//         ) : (
//           <TouchableOpacity
//             style={[styles.mapButton, styles.mapButtonDisabled]}
//             onPress={() => Alert.alert("No location", "This task has no coordinates")}
//           >
//             <Text style={styles.mapButtonText}>No Location</Text>
//           </TouchableOpacity>
//         )}
//         <TouchableOpacity
//           style={[styles.mapButton, { marginLeft: 10 }]}
//           onPress={() =>
//             navigation.navigate("UpdateStartTask", {
//               taskName: item.name,
//               status: item.status,
//               progress: item.progress,
//             })
//           }
//         >
//           <Text style={styles.mapButtonText}>Update Task</Text>
//         </TouchableOpacity>
//       </View>
//     </View>
//   );
// };
//   if (loading && !refreshing) {
//     return (
//       <ImageBackground
//         source={require("../images/123.png")}
//         style={styles.bgImage}
//       >
//         <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.1)" }} />
//         <SafeAreaView style={{ flex: 1 }}>
//           <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
//             <ActivityIndicator size="large" color="#4880FF" />
//           </View>
//         </SafeAreaView>
//       </ImageBackground>
//     );
//   }

//   if (!loading && tasks.length === 0) {
//     return (
//       <ImageBackground
//         source={require("../images/123.png")}
//         style={styles.bgImage}
//       >
//         <View
//           style={{
//             ...StyleSheet.absoluteFillObject,
//             backgroundColor: "rgba(0,0,0,0.25)", // थोड़ा और dark overlay readability के लिए
//           }}
//         />
//         <SafeAreaView style={{ flex: 1 }}>
//           <View style={styles.emptyContainer}>
//             <TouchableOpacity
//               onPress={() => navigation.goBack()}
//               style={{ marginRight: 10 }}
//             >
//               <Ionicons name="arrow-back" size={28} color="#000" />
//             </TouchableOpacity>
//             <Text
//               style={{
//                 fontSize: 20,
//                 color: "#000",
//                 fontWeight: "600",
//                 textShadowColor: "rgba(0, 0, 0, 0.3)", // shadow for clarity
//                 textShadowOffset: { width: 1, height: 1 },
//                 textShadowRadius: 3,
//               }}
//             >
//               No tasks assigned
//             </Text>
//           </View>
//         </SafeAreaView>
//       </ImageBackground>

//     );
//   }

//   return (
//     <ImageBackground
//       source={require("../images/123.png")}
//       style={styles.bgImage}
//     >
//       <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.1)" }} />
//       <SafeAreaView style={{ flex: 1 }}>
//         <View style={styles.headerRow}>
//           <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 10 }}>
//             <View
//               style={{
//                 shadowColor: "#000",
//                 shadowOffset: { width: 1, height: 1 },
//                 shadowOpacity: 0.3,
//                 shadowRadius: 3,
//                 elevation: 4, // Android shadow
//               }}
//             >
//               <Ionicons
//                 name="arrow-back"
//                 size={26}
//                 color="#000"
//               />
//             </View>

//           </TouchableOpacity>
//           <Text style={styles.headerTitle}>My Tasks</Text>
//         </View>

//         <FlatList
//           data={tasks}
//           renderItem={renderItem}
//           keyExtractor={(item) => item.name}
//           contentContainerStyle={styles.container}
//           refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
//         />
//       </SafeAreaView>
//     </ImageBackground>
//   );
// }

// const styles = StyleSheet.create({
//   bgImage: {
//     flex: 1,
//     resizeMode: "cover",
//   },
//   headerRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingHorizontal: 12,
//     paddingTop: 8,
//     paddingBottom: 8,
//   },
//   headerTitle: {
//     fontSize: 18,
//     color: "#000",
//     fontWeight: "600",
//     textShadowColor: "rgba(0, 0, 0, 0.3)",
//     textShadowOffset: { width: 1, height: 1 },
//     textShadowRadius: 3,
//   },
//   container: {
//     padding: 12,
//     paddingBottom: 40,
//   },
//   card: {
//     backgroundColor: "#b17f5a",
//     padding: 16,
//     borderRadius: 12,
//     marginBottom: 12,
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     ...Platform.select({
//       android: { elevation: 3 },
//     }),
//   },
//   title: {
//     fontSize: 18,
//     fontWeight: "bold",
//     color: "#FFF",
//     marginBottom: 5
//   },
//   small: {
//     fontSize: 12,
//     color: "#FFF",
//     marginBottom: 6,
//   },
//   desc: {
//     fontSize: 14,
//     color: "#FFF",
//     marginVertical: 6,
//   },
//   row: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//   },
//   meta: {
//     fontSize: 13,
//     color: "#FFF",
//     marginTop: 4,
//   },
//   statusBox: {
//     marginTop: 8,
//     borderRadius: 5,
//     alignSelf: "flex-start",
//     paddingVertical: 4,
//     paddingHorizontal: 10,
//   },
//   statusText: {
//     fontSize: 14,
//     fontWeight: "600",
//   },
//   progressText: {
//     marginTop: 6,
//     fontSize: 13,
//     color: "#000",
//   },
//   progressTrack: {
//     height: 10,
//     backgroundColor: "#e0e0e0",
//     borderRadius: 6,
//     overflow: "hidden",
//   },
//   progressFill: {
//     height: "100%",
//     backgroundColor: "#377355",
//   },
//   buttonsRow: {
//     flexDirection: "row",
//     justifyContent: "center",
//     marginTop: 10,
//   },
//   mapButton: {
//     marginTop: 0,
//     backgroundColor: "#377355",
//     paddingVertical: 8,
//     borderRadius: 6,
//     alignItems: "center",
//     width: 150,
//   },
//   mapButtonDisabled: {
//     backgroundColor: "#9aa4a0",
//   },
//   mapButtonText: {
//     color: "#fff",
//     fontSize: 14,
//     fontWeight: "600",
//   },
//   emptyContainer: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//   },
// });






// import React, { useEffect, useState, useCallback } from "react";
// import {
//   View,
//   Text,
//   FlatList,
//   StyleSheet,
//   ActivityIndicator,
//   TouchableOpacity,
//   Platform,
//   Linking,
//   Alert,
//   RefreshControl,
// } from "react-native";
// import axiosInstance from "../TokenHandling/axiosInstance";
// import { useFocusEffect } from "@react-navigation/native";
// import Ionicons from "react-native-vector-icons/Ionicons";


// export default function MyTask({ navigation }) {
//   const [tasks, setTasks] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);

//   const fetchTasks = async () => {
//     try {
//       const response = await axiosInstance.get("/my-assigned-tasks/");
//       setTasks(response.data.results || []);
// console.log(tasks);

//     } catch (error) {
//       console.log("Error fetching tasks:", error);
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   };

//   // Screen focus hone par data refresh ho jaye (update ke baad wapas aaye to latest dikhe)
//   useFocusEffect(
//     useCallback(() => {
//       fetchTasks();
//     }, [])
//   );

//   // Pull to refresh handler
//   const onRefresh = () => {
//     setRefreshing(true);
//     fetchTasks();
//   };

//   // Function to open Google Maps
//   const openInGoogleMaps = (lat, lng) => {
//     if (!lat || !lng) {
//       Alert.alert("Location not available", "Destination coordinates missing");
//       return;
//     }
//     const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
//     Linking.openURL(url).catch(() => {
//       Alert.alert("Error", "Unable to open Google Maps");
//     });
//   };

//   const renderItem = ({ item }) => (
//     <TouchableOpacity style={styles.card}>
//       <Text style={styles.title}>Title : {item.title}</Text>
//       <Text style={styles.desc}>Description : {item.description}</Text>
//       <Text style={styles.date}>Start Date : {item.start_date}</Text>
//       <Text style={styles.date}>{item.completion_description}</Text>

//       {/*  Status badge */}
//       <View style={[styles.statusBox, { backgroundColor: "#fff" }]}>
//         <Text
//           style={[
//             styles.statusText,
//             { color: item.is_completed ? "green" : "red" },
//           ]}
//         >
//           {item.is_completed ? "Completed" : "Pending"}
//         </Text>
//       </View>

//       <Text style={styles.address}>{item.address}</Text>

//       {/*  Google Maps Button */}
//       <TouchableOpacity
//         style={styles.mapButton}

//         onPress={() => {
//           console.log("Task LatLng:", item.dest_lat, item.dest_lng);
//           openInGoogleMaps(item.dest_lat, item.dest_lng)
//         }
//         }
//       >
//         <Text style={styles.mapButtonText}>Start Task</Text>
//       </TouchableOpacity>
//       <TouchableOpacity
//         style={styles.mapButton}
//         onPress={() => navigation.navigate("UpdateStartTask", { taskId: item.id })}
//       >
//         <Text style={styles.mapButtonText}>Update Task</Text>
//       </TouchableOpacity>
//     </TouchableOpacity>
//   );

//   if (loading && !refreshing) {
//     return (
//       <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
//         <ActivityIndicator size="large" color="#4880FF" />
//       </View>
//     );
//   }

//   if (!loading && tasks.length === 0) {
//     return (
//       <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
//         <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 10 }}>
//           <Ionicons name="arrow-back" size={26} color="#377355" />
//         </TouchableOpacity>
//         <Text style={{ fontSize: 16, color: "#555" }}>No tasks assigned</Text>
//       </View>
//     );
//   }

//   return (
//     <>
//       <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 10 }}>
//         <Ionicons name="arrow-back" size={26} color="#377355" />
//       </TouchableOpacity>

//       <FlatList
//         data={tasks}
//         renderItem={renderItem}
//         keyExtractor={(item) => item.id.toString()}
//         contentContainerStyle={styles.container}
//         refreshControl={
//           <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
//         }
//       />
//     </>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     padding: 12,
//   },
//   card: {
//     backgroundColor: "#b17f5a",
//     padding: 16,
//     borderRadius: 12,
//     marginBottom: 12,
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     ...Platform.select({
//       android: { elevation: 3 },
//     }),
//   },
//   title: {
//     fontSize: 18,
//     fontWeight: "bold",
//     color: "#000",
//   },
//   desc: {
//     fontSize: 14,
//     color: "#000",
//     marginVertical: 4,
//   },
//   date: {
//     fontSize: 13,
//     color: "#000",
//   },
//   statusBox: {
//     marginTop: 6,
//     borderRadius: 5,
//     alignSelf: "flex-start",
//     paddingVertical: 3,
//     paddingHorizontal: 10,
//   },
//   statusText: {
//     fontSize: 14,
//     fontWeight: "600",
//   },
//   address: {
//     fontSize: 12,
//     color: "#000",
//     marginTop: 4,
//   },
//   mapButton: {
//     marginTop: 10,
//     backgroundColor: "#4E8D7C",
//     paddingVertical: 8,
//     borderRadius: 6,
//     alignItems: "center",
//     width: 150,
//     alignSelf: "center",
//   },
//   mapButtonText: {
//     color: "#fff",
//     fontSize: 14,
//     fontWeight: "600",
//   },
// });

