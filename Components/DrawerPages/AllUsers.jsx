// import React, { useEffect, useState } from "react";
// import {
//     View,
//     Text,
//     TextInput,
//     TouchableOpacity,
//     FlatList,
//     ActivityIndicator,
//     StyleSheet,
// } from "react-native";
// import { Picker } from "@react-native-picker/picker";
// import axiosInstance from "../TokenHandling/axiosInstance"; // correct path lagao

// export default function AllUser() {
//     const [users, setUsers] = useState([]);
//     const [filteredUsers, setFilteredUsers] = useState([]);
//     const [search, setSearch] = useState("");
//     const [role, setRole] = useState("");
//     const [status, setStatus] = useState("");

//     const [page, setPage] = useState(1);
//     const [totalPages, setTotalPages] = useState(1);
//     const [loading, setLoading] = useState(false);
//     const [loadingMore, setLoadingMore] = useState(false);

//     useEffect(() => {
//         fetchUsers(1, true);
//     }, []);

//     useEffect(() => {
//         applyFilters();
//     }, [search, role, status, users]);

//     const fetchUsers = async (pageNumber, reset = false) => {
//         if (loading || loadingMore) return;

//         if (reset) {
//             setLoading(true);
//         } else {
//             setLoadingMore(true);
//         }

//         try {
//             const res = await axiosInstance.get(`/users/?page=${pageNumber}`);
//             const newUsers = res.data.results || [];

//             setTotalPages(res.data.total_pages || 1);

//             if (reset) {
//                 setUsers(newUsers);
//                 setFilteredUsers(newUsers);
//             } else {
//                 setUsers((prev) => [...prev, ...newUsers]);
//                 setFilteredUsers((prev) => [...prev, ...newUsers]);
//             }

//             setPage(pageNumber);
//         } catch (err) {
//             console.error("Error fetching users:", err);
//         } finally {
//             setLoading(false);
//             setLoadingMore(false);
//         }
//     };

//     const applyFilters = () => {
//         let filtered = [...users];

//         if (search) {
//             filtered = filtered.filter(
//                 (user) =>
//                     user.username?.toLowerCase().includes(search.toLowerCase()) ||
//                     user.email?.toLowerCase().includes(search.toLowerCase())
//             );
//         }

//         if (role) {
//             filtered = filtered.filter(
//                 (user) => String(user.role) === String(role)
//             );
//         }

//         if (status) {
//             filtered = filtered.filter(
//                 (user) =>
//                     (status === "online" && user.is_online) ||
//                     (status === "offline" && !user.is_online)
//             );
//         }

//         setFilteredUsers(filtered);
//     };

//     const clearFilters = () => {
//         setSearch("");
//         setRole("");
//         setStatus("");
//         setFilteredUsers(users);
//     };

//     const handleLoadMore = () => {
//         if (page < totalPages && !loadingMore) {
//             fetchUsers(page + 1);
//         }
//     };

//     const renderItem = ({ item, index }) => (
//         <View style={styles.row}>
//             <Text style={styles.cell}>{index + 1}</Text>
//             <Text style={styles.cell}>{item.username}</Text>
//             <Text style={styles.cell}>{item.email}</Text>
//             <Text style={styles.cell}>{item.mobile_no || "N/A"}</Text>
//             <Text style={styles.cell}>{item.employee_code}</Text>
//             <Text style={styles.roleBadge}>{item.role}</Text>
//             <Text
//                 style={[
//                     styles.status,
//                     { color: item.is_online ? "green" : "red" },
//                 ]}
//             >
//                 {item.is_online ? "Online" : "Offline"}
//             </Text>
//         </View>
//     );

//     return (
//         <View style={styles.container}>
//             {/* Search */}
//             <TextInput
//                 style={styles.input}
//                 placeholder="Search by username or email"
//                 value={search}
//                 onChangeText={setSearch}
//             />

//             {/* Role Filter */}
//             <Picker
//                 selectedValue={role}
//                 onValueChange={(val) => setRole(val)}
//                 style={styles.picker}
//             >
//                 <Picker.Item label="Filter by Role" value="" />
//                 <Picker.Item label="Admin" value="1" />
//                 <Picker.Item label="HR" value="2" />
//                 <Picker.Item label="Department Head" value="3" />
//                 <Picker.Item label="Manager" value="4" />
//                 <Picker.Item label="Executive" value="5" />
//                 <Picker.Item label="Employee" value="6" />
//                 <Picker.Item label="Employee Office" value="7" />
//             </Picker>


//             {/* Status (online, offline) mode Filter */}
//             <Picker
//                 selectedValue={status}
//                 onValueChange={(val) => setStatus(val)}
//                 style={styles.picker}
//             >
//                 <Picker.Item label="Filter by Status" value="" />
//                 <Picker.Item label="Online" value="online" />
//                 <Picker.Item label="Offline" value="offline" />
//             </Picker>

//             {/* Clear Filters Button */}
//             <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
//                 <Text style={{ color: "#fff" }}>Clear All Filters</Text>
//             </TouchableOpacity>

//             {/* Table Header */}
//             <View style={[styles.row, styles.header]}>
//                 <Text style={styles.headerCell}>#</Text>
//                 <Text style={styles.headerCell}>Username</Text>
//                 <Text style={styles.headerCell}>Email</Text>
//                 <Text style={styles.headerCell}>Mobile</Text>
//                 <Text style={styles.headerCell}>Code</Text>
//                 <Text style={styles.headerCell}>Role</Text>
//                 <Text style={styles.headerCell}>Status</Text>
//             </View>

//             {/* User List */}
//             {loading ? (
//                 <ActivityIndicator size="large" color="#B27F5A" style={{ marginTop: 20 }} />
//             ) : (
//                 <FlatList
//                     data={filteredUsers}
//                     renderItem={renderItem}
//                     keyExtractor={(item) => item.id.toString()}
//                     onEndReached={handleLoadMore}
//                     onEndReachedThreshold={0.5}
//                     ListFooterComponent={
//                         loadingMore ? <ActivityIndicator size="small" color="#B27F5A" /> : null
//                     }
//                 />
//             )}
//         </View>
//     );
// }

// const styles = StyleSheet.create({
//     container: { flex: 1, padding: 10, backgroundColor: "#fff" },
//     input: {
//         borderWidth: 1,
//         borderColor: "#ccc",
//         padding: 8,
//         borderRadius: 8,
//         marginBottom: 10,
//     },
//     picker: {
//         borderWidth: 1,
//         borderColor: "#ccc",
//         borderRadius: 8,
//         marginBottom: 10,
//     },
//     clearBtn: {
//         backgroundColor: "#d62b4d",
//         padding: 10,
//         alignItems: "center",
//         borderRadius: 8,
//         marginBottom: 10,
//     },
//     row: {
//         flexDirection: "row",
//         paddingVertical: 6,
//         borderBottomWidth: 1,
//         borderBottomColor: "#eee",
//         alignItems: "center",
//     },
//     cell: { flex: 1, fontSize: 12 },
//     header: { backgroundColor: "#4E8D7C" },
//     headerCell: { flex: 1, fontWeight: "bold", color: "#fff", fontSize: 12 },
//     roleBadge: {
//         flex: 1,
//         fontSize: 12,
//         backgroundColor: "#eee",
//         textAlign: "center",
//         paddingVertical: 2,
//         borderRadius: 6,
//     },
//     status: { flex: 1, fontWeight: "bold", fontSize: 12 },
// });

// Components/AllUser.jsx

//main
// import React, { useEffect, useState } from "react";
// import {
//   SafeAreaView,
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   FlatList,
//   ActivityIndicator,
//   StyleSheet,
//   Platform,
// } from "react-native";
// import DropDownPicker from "react-native-dropdown-picker";
// import axiosInstance from "../TokenHandling/axiosInstance";

// export default function AllUser() {
//   const [users, setUsers] = useState([]);
//   const [filteredUsers, setFilteredUsers] = useState([]);
//   const [search, setSearch] = useState("");

//   const [roleOpen, setRoleOpen] = useState(false);
//   const [statusOpen, setStatusOpen] = useState(false);
//   const [role, setRole] = useState(null);
//   const [status, setStatus] = useState(null);

//   const [roleItems, setRoleItems] = useState([
//     { label: "All Roles", value: null },
//     { label: "Admin", value: "1" },
//     { label: "HR", value: "2" },
//     { label: "Department Head", value: "3" },
//     { label: "Manager", value: "4" },
//     { label: "Executive", value: "5" },
//     { label: "Employee", value: "6" },
//     { label: "Employee Office", value: "7" },
//   ]);
//   const [statusItems, setStatusItems] = useState([
//     { label: "All Status", value: null },
//     { label: "Online", value: "online" },
//     { label: "Offline", value: "offline" },
//   ]);

//   const [page, setPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(1);
//   const [loading, setLoading] = useState(false);
//   const [loadingMore, setLoadingMore] = useState(false);
//   const [refreshing, setRefreshing] = useState(false);

//   const [fetchError, setFetchError] = useState(null);

//   useEffect(() => {
//     fetchUsers(1, true);
//   }, []);

//   useEffect(() => {
//     applyFilters();
//   }, [users, search, role, status]);

//   const fetchUsers = async (pageNumber = 1, reset = false) => {
//     if (loading || loadingMore || refreshing) return;
//     setFetchError(null);
//     if (reset) setLoading(true);
//     else setLoadingMore(true);

//     try {
//       const res = await axiosInstance.get(`/users/?page=${pageNumber}`);
//       const newUsers = Array.isArray(res.data.results) ? res.data.results : [];
//       setUsers((prev) => {
//         if (reset) return newUsers;
//         const ids = new Set(prev.map((p) => p.id));
//         const add = newUsers.filter((n) => !ids.has(n.id));
//         return [...prev, ...add];
//       });
//       setPage(pageNumber);
//       setTotalPages(res.data.total_pages ?? 1);
//     } catch (err) {
//       const status = err?.response?.status;
//       setFetchError(`Request failed${status ? ` (status ${status})` : ""}`);
//     } finally {
//       setLoading(false);
//       setLoadingMore(false);
//       setRefreshing(false);
//     }
//   };

//   const applyFilters = () => {
//     let tmp = [...users];
//     if (search.trim()) {
//       const q = search.toLowerCase();
//       tmp = tmp.filter(
//         (u) =>
//           (u.username || "").toLowerCase().includes(q) ||
//           (u.email || "").toLowerCase().includes(q)
//       );
//     }
//     if (role) tmp = tmp.filter((u) => String(u.role) === String(role));
//     if (status) tmp = tmp.filter((u) => (status === "online" ? u.is_online : !u.is_online));
//     setFilteredUsers(tmp);
//   };

//   const clearFilters = () => {
//     setSearch("");
//     setRole(null);
//     setStatus(null);
//     setFilteredUsers(users);
//   };

//   const handleLoadMore = () => {
//     if (page < totalPages && !loadingMore) {
//       fetchUsers(page + 1);
//     }
//   };

//   const handleRefresh = () => {
//     setRefreshing(true);
//     setUsers([]);
//     fetchUsers(1, true);
//   };

//   const ListHeader = () => (
//     <View style={styles.headerContainer}>
//       {fetchError ? <Text style={styles.errorText}>{fetchError}</Text> : null}

//       <TextInput
//         value={search}
//         onChangeText={setSearch}
//         placeholder="Search by username or email"
//         style={styles.input}
//         returnKeyType="search"
//       />

//       <View style={styles.filterRow}>
// <View style={[styles.dropdownWrapper, { zIndex: roleOpen ? 3000 : 1 }]}>
//   <DropDownPicker
//     open={roleOpen}
//     value={role}
//     items={roleItems}
//     setOpen={setRoleOpen}
//     setValue={setRole}
//     setItems={setRoleItems}
//     placeholder="Filter by Role"
//     containerStyle={styles.dropdownContainerStyle}
//     style={[styles.dropdown, { backgroundColor: '#fff' }]}
//     dropDownContainerStyle={[styles.dropDownBox, { backgroundColor: '#fff', maxHeight: 300 }]}
//     listMode="SCROLLVIEW"
//     nestedScrollEnabled={true}
//   />
// </View>

// <View style={[styles.dropdownWrapper, { zIndex: statusOpen ? 2000 : 1 }]}>
//   <DropDownPicker
//     open={statusOpen}
//     value={status}
//     items={statusItems}
//     setOpen={setStatusOpen}
//     setValue={setStatus}
//     setItems={setStatusItems}
//     placeholder="Filter by Status"
//     containerStyle={styles.dropdownContainerStyle}
//     style={[styles.dropdown, { backgroundColor: '#fff' }]}
//     dropDownContainerStyle={[styles.dropDownBox, { backgroundColor: '#fff', maxHeight: 300 }]}
//     listMode="SCROLLVIEW"
//     nestedScrollEnabled={true}
//   />
// </View>

//       </View>

//       <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
//         <Text style={styles.clearBtnText}>Clear All Filters</Text>
//       </TouchableOpacity>

//       <View style={[styles.row, styles.tableHeader]}>
//         <Text style={styles.headerCell}>#</Text>
//         <Text style={styles.headerCell}>Username</Text>
//         <Text style={styles.headerCell}>Email</Text>
//         <Text style={styles.headerCell}>Mobile</Text>
//         <Text style={styles.headerCell}>Code</Text>
//         <Text style={styles.headerCell}>Role</Text>
//         <Text style={styles.headerCell}>Status</Text>
//       </View>
//     </View>
//   );

//   const renderItem = ({ item, index }) => {
//     const absoluteIndex = users.findIndex((u) => u.id === item.id) + 1 || index + 1;
//     return (
//       <View style={styles.row}>
//         <Text style={styles.cell}>{absoluteIndex}</Text>
//         <Text style={styles.cell}>{item.username}</Text>
//         <Text style={styles.cell}>{item.email}</Text>
//         <Text style={styles.cell}>{item.mobile_no ?? "N/A"}</Text>
//         <Text style={styles.cell}>{item.employee_code}</Text>
//         <Text style={styles.roleBadge}>{item.role}</Text>
//         <Text style={[styles.status, { color: item.is_online ? "green" : "red" }]}>
//           {item.is_online ? "Online" : "Offline"}
//         </Text>
//       </View>
//     );
//   };

//   return (
//     <SafeAreaView style={styles.safe}>
//       <View style={styles.container}>
//         {loading && users.length === 0 ? (
//           <ActivityIndicator size="large" color="#B27F5A" style={{ marginTop: 30 }} />
//         ) : (
//           <FlatList
//             data={filteredUsers}
//             keyExtractor={(item) => item.id.toString()}
//             renderItem={renderItem}
//             ListHeaderComponent={ListHeader}
//             onEndReached={handleLoadMore}
//             onEndReachedThreshold={0.5}
//             ListFooterComponent={
//               loadingMore ? (
//                 <ActivityIndicator size="small" color="#B27F5A" style={{ margin: 12 }} />
//               ) : null
//             }
//             refreshing={refreshing}
//             onRefresh={handleRefresh}
//             contentContainerStyle={{ paddingBottom: 60 }}
//             keyboardShouldPersistTaps="handled"
//             keyboardDismissMode="on-drag"
//             nestedScrollEnabled={true}
//           />
//         )}
//       </View>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   safe: {
//      flex: 1, 
//      backgroundColor: "#fff" ,
//     },
//   container: { 
//     flex: 1,
//      padding: 10, 
//      backgroundColor: "#fff" ,
//     },

//   headerContainer: { 
//     marginBottom: 8,
//    },

//   input: {
//     borderWidth: 1,
//     borderColor: "#ccc",
//     padding: Platform.OS === "ios" ? 12 : 8,
//     borderRadius: 8,
//     marginBottom: 10,
//   },

//   filterRow: { 
//     flexDirection: "row", 
//     marginBottom: 10 ,
//   },
//   dropdownWrapper: { 
//     flex: 1, 
//     marginRight: 6 ,
//   },
//   dropdownContainerStyle: { 
//     height: 40,
//    },
//   dropdown: { 
//     borderColor: "#ccc", 
//     borderRadius: 8,
//      height: 10 ,
//     },
//   dropDownBox: {
//      borderColor: "#ccc",
//      },

//   clearBtn: {
//     backgroundColor: "#D2AF6F",
//     padding: 10,
//     borderRadius: 8,
//     alignItems: "center",
//     marginBottom: 8,
//     marginTop:8
//   },
//   clearBtnText: { 
//     color: "#fff", 
//     fontWeight: "600",
//    },

//   row: {
//     flexDirection: "row",
//     paddingVertical:12,
//     borderBottomWidth: 1,
//     borderBottomColor: "#eee",
//     alignItems: "center",
//   },
//   cell: { 
//     flex: 1, 
//     fontSize: 12 
//   },
//   tableHeader: {
//      backgroundColor: "#4E8D7C" ,
//     borderRadius: 8,
//       },
//   headerCell: { 
//     flex: 1, 
//     fontWeight: "700", 
//     color: "#fff", 
//     fontSize: 12 
//   },

//   roleBadge: {
//     flex: 1,
//     fontSize: 12,
//     backgroundColor: "#eee",
//     textAlign: "center",
//     paddingVertical: 4,
//     borderRadius: 6,
//   },
//   status: { 
//     flex: 1, 
//     fontWeight: "700",
//      fontSize: 12 
//     },
//   errorText: { 
//     color: "red", 
//     marginBottom: 8 
//   },

//   dropdown: { 
//   borderColor: "#ccc", 
//   borderRadius: 8, 
//   height: 40, 
//   backgroundColor: '#fff' 
// },
// dropDownBox: { 
//   borderColor: "#ccc", 
//   backgroundColor: '#fff', 
//   maxHeight: 300 
// },

// });


// import React, { useEffect, useState } from "react";
// import {
//   SafeAreaView,
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   FlatList,
//   ActivityIndicator,
//   StyleSheet,
//   Platform,
//   ScrollView,
// } from "react-native";
// import DropDownPicker from "react-native-dropdown-picker";
// import axiosInstance from "../TokenHandling/axiosInstance";

// export default function AllUser() {
//   const [users, setUsers] = useState([]);
//   const [filteredUsers, setFilteredUsers] = useState([]);
//   const [search, setSearch] = useState("");

//   const [roleOpen, setRoleOpen] = useState(false);
//   const [statusOpen, setStatusOpen] = useState(false);
//   const [role, setRole] = useState(null);
//   const [status, setStatus] = useState(null);

//   const [roleItems, setRoleItems] = useState([
//     { label: "All Roles", value: null },
//     { label: "Admin", value: "1" },
//     { label: "HR", value: "2" },
//     { label: "Department Head", value: "3" },
//     { label: "Manager", value: "4" },
//     { label: "Executive", value: "5" },
//     { label: "Employee", value: "6" },
//     { label: "Employee Office", value: "7" },
//   ]);
//   const [statusItems, setStatusItems] = useState([
//     { label: "All Status", value: null },
//     { label: "Online", value: "online" },
//     { label: "Offline", value: "offline" },
//   ]);

//   const [page, setPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(1);
//   const [loading, setLoading] = useState(false);
//   const [loadingMore, setLoadingMore] = useState(false);
//   const [refreshing, setRefreshing] = useState(false);

//   const [fetchError, setFetchError] = useState(null);

//   useEffect(() => {
//     fetchUsers(1, true);
//   }, []);

//   useEffect(() => {
//     applyFilters();
//   }, [users, search, role, status]);

//   const fetchUsers = async (pageNumber = 1, reset = false) => {
//     if (loading || loadingMore || refreshing) return;
//     setFetchError(null);
//     if (reset) setLoading(true);
//     else setLoadingMore(true);

//     try {
//       const res = await axiosInstance.get(`/users/?page=${pageNumber}`);
//       const newUsers = Array.isArray(res.data.results) ? res.data.results : [];
//       setUsers((prev) => {
//         if (reset) return newUsers;
//         const ids = new Set(prev.map((p) => p.id));
//         const add = newUsers.filter((n) => !ids.has(n.id));
//         return [...prev, ...add];
//       });
//       setPage(pageNumber);
//       setTotalPages(res.data.total_pages ?? 1);
//     } catch (err) {
//       const status = err?.response?.status;
//       setFetchError(`Request failed${status ? ` (status ${status})` : ""}`);
//     } finally {
//       setLoading(false);
//       setLoadingMore(false);
//       setRefreshing(false);
//     }
//   };

//   const applyFilters = () => {
//     let tmp = [...users];
//     if (search.trim()) {
//       const q = search.toLowerCase();
//       tmp = tmp.filter(
//         (u) =>
//           (u.username || "").toLowerCase().includes(q) ||
//           (u.email || "").toLowerCase().includes(q)
//       );
//     }
//     if (role) tmp = tmp.filter((u) => String(u.role) === String(role));
//     if (status) tmp = tmp.filter((u) => (status === "online" ? u.is_online : !u.is_online));
//     setFilteredUsers(tmp);
//   };

//   const clearFilters = () => {
//     setSearch("");
//     setRole(null);
//     setStatus(null);
//     setFilteredUsers(users);
//   };

//   const handleLoadMore = () => {
//     if (page < totalPages && !loadingMore) {
//       fetchUsers(page + 1);
//     }
//   };

//   const handleRefresh = () => {
//     setRefreshing(true);
//     setUsers([]);
//     fetchUsers(1, true);
//   };

//   const ListHeader = () => (
//     <View style={styles.headerContainer}>
//       {fetchError ? <Text style={styles.errorText}>{fetchError}</Text> : null}

//       <TextInput
//         value={search}
//         onChangeText={setSearch}
//         placeholder="Search by username or email"
//         style={styles.input}
//         returnKeyType="search"
//       />

//       <View style={styles.filterRow}>
//         <View style={[styles.dropdownWrapper, { zIndex: roleOpen ? 3000 : 1 }]}>
//           <DropDownPicker
//             open={roleOpen}
//             value={role}
//             items={roleItems}
//             setOpen={setRoleOpen}
//             setValue={setRole}
//             setItems={setRoleItems}
//             placeholder="Filter by Role"
//             containerStyle={styles.dropdownContainerStyle}
//             style={styles.dropdown}
//             dropDownContainerStyle={styles.dropDownBox}
//             listMode="SCROLLVIEW"
//             nestedScrollEnabled={true}
//           />
//         </View>

//         <View style={[styles.dropdownWrapper, { zIndex: statusOpen ? 2000 : 1 }]}>
//           <DropDownPicker
//             open={statusOpen}
//             value={status}
//             items={statusItems}
//             setOpen={setStatusOpen}
//             setValue={setStatus}
//             setItems={setStatusItems}
//             placeholder="Filter by Status"
//             containerStyle={styles.dropdownContainerStyle}
//             style={styles.dropdown}
//             dropDownContainerStyle={styles.dropDownBox}
//             listMode="SCROLLVIEW"
//             nestedScrollEnabled={true}
//           />
//         </View>
//       </View>

//       <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
//         <Text style={styles.clearBtnText}>Clear All Filters</Text>
//       </TouchableOpacity>

//       <View style={[styles.row, styles.tableHeader]}>
//         <Text style={[styles.headerCell, styles.col1]}>#</Text>
//         <Text style={[styles.headerCell, styles.col2]}>Username</Text>
//         <Text style={[styles.headerCell, styles.col3]}>Email</Text>
//         <Text style={[styles.headerCell, styles.col4]}>Mobile</Text>
//         <Text style={[styles.headerCell, styles.col5]}>Code</Text>
//         <Text style={[styles.headerCell, styles.col6]}>Role</Text>
//         <Text style={[styles.headerCell, styles.col7]}>Status</Text>
//       </View>
//     </View>
//   );

//   const renderItem = ({ item, index }) => {
//     const absoluteIndex = users.findIndex((u) => u.id === item.id) + 1 || index + 1;
//     return (
//       <View style={styles.row}>
//         <Text style={[styles.cell, styles.col1]}>{absoluteIndex}</Text>
//         <Text style={[styles.cell, styles.col2]}>{item.username}</Text>
//         <Text style={[styles.cell, styles.col3]}>{item.email}</Text>
//         <Text style={[styles.cell, styles.col4]}>{item.mobile_no ?? "N/A"}</Text>
//         <Text style={[styles.cell, styles.col5]}>{item.employee_code}</Text>
//         <Text style={[styles.roleBadge, styles.col6]}>{item.role}</Text>
//         <Text style={[styles.status, styles.col7, { color: item.is_online ? "green" : "red" }]}>
//           {item.is_online ? "Online" : "Offline"}
//         </Text>
//       </View>
//     );
//   };

//   return (
//     <SafeAreaView style={styles.safe}>
//       <ScrollView horizontal style={{ flex: 1 }} bounces={false}>
//         <View style={{ minWidth: 900, flex: 1 }}>
//           {loading && users.length === 0 ? (
//             <ActivityIndicator size="large" color="#B27F5A" style={{ marginTop: 30 }} />
//           ) : (
//             <FlatList
//               data={filteredUsers}
//               keyExtractor={(item) => item.id.toString()}
//               renderItem={renderItem}
//               ListHeaderComponent={ListHeader}
//               onEndReached={handleLoadMore}
//               onEndReachedThreshold={0.5}
//               ListFooterComponent={
//                 loadingMore ? (
//                   <ActivityIndicator size="small" color="#B27F5A" style={{ margin: 12 }} />
//                 ) : null
//               }
//               refreshing={refreshing}
//               onRefresh={handleRefresh}
//               contentContainerStyle={{ paddingBottom: 60 }}
//               keyboardShouldPersistTaps="handled"
//               keyboardDismissMode="on-drag"
//               nestedScrollEnabled={true}
//               bounces={false}
//             />
//           )}
//         </View>
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   safe: { flex: 1, backgroundColor: "#fff" },
//   headerContainer: { marginBottom: 8 },
//   input: {
//     borderWidth: 1,
//     borderColor: "#ccc",
//     padding: Platform.OS === "ios" ? 12 : 8,
//     borderRadius: 8,
//     marginBottom: 10,
//   },
//   filterRow: { flexDirection: "row", marginBottom: 10 },
//   dropdownWrapper: { flex: 1, marginRight: 6 },
//   dropdownContainerStyle: { height: 40 },
//   dropdown: { borderColor: "#ccc", borderRadius: 8, height: 40, backgroundColor: "#fff" },
//   dropDownBox: { borderColor: "#ccc", backgroundColor: "#fff", maxHeight: 300 },
//   clearBtn: {
//     backgroundColor: "#D2AF6F",
//     padding: 10,
//     borderRadius: 8,
//     alignItems: "center",
//     marginBottom: 8,
//     marginTop: 8,
//   },
//   clearBtnText: { color: "#fff", fontWeight: "600" },
//   row: {
//     flexDirection: "row",
//     paddingVertical: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: "#eee",
//     alignItems: "center",
//   },
//   cell: { fontSize: 13, paddingHorizontal: 8 },
//   tableHeader: { backgroundColor: "#4E8D7C" },
//   headerCell: {
//     fontWeight: "700",
//     color: "#fff",
//     fontSize: 13,
//     paddingHorizontal: 8,
//   },
//   col1: { width: 40 },
//   col2: { width: 120 },
//   col3: { width: 200 },
//   col4: { width: 120 },
//   col5: { width: 100 },
//   col6: { width: 120 },
//   col7: { width: 100 },
//   roleBadge: {
//     fontSize: 13,
//     backgroundColor: "#eee",
//     textAlign: "center",
//     paddingVertical: 4,
//     borderRadius: 6,
//     paddingHorizontal: 8,
//   },
//   status: { fontWeight: "700", fontSize: 13, paddingHorizontal: 8 },
//   errorText: { color: "red", marginBottom: 8 },
// });



import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Platform,
  ScrollView,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import axiosInstance from "../TokenHandling/axiosInstance";

export default function AllUser() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [search, setSearch] = useState("");

  const [roleOpen, setRoleOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [role, setRole] = useState(null);
  const [status, setStatus] = useState(null);

  const [roleItems, setRoleItems] = useState([
    { label: "All Roles", value: null },
    { label: "Admin", value: "1" },
    { label: "HR", value: "2" },
    { label: "Department Head", value: "3" },
    { label: "Manager", value: "4" },
    { label: "Executive", value: "5" },
    { label: "Employee", value: "6" },
    { label: "Employee Office", value: "7" },
  ]);
  const [statusItems, setStatusItems] = useState([
    { label: "All Status", value: null },
    { label: "Online", value: "online" },
    { label: "Offline", value: "offline" },
  ]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    fetchUsers(1, true);
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, search, role, status]);

  const fetchUsers = async (pageNumber = 1, reset = false) => {
    if (loading || loadingMore || refreshing) return;
    setFetchError(null);
    if (reset) setLoading(true);
    else setLoadingMore(true);

    try {
      const res = await axiosInstance.get(`/users/?page=${pageNumber}`);
      const newUsers = Array.isArray(res.data.results) ? res.data.results : [];
      setUsers((prev) => {
        if (reset) return newUsers;
        const ids = new Set(prev.map((p) => p.id));
        const add = newUsers.filter((n) => !ids.has(n.id));
        return [...prev, ...add];
      });
      setPage(pageNumber);
      setTotalPages(res.data.total_pages ?? 1);
    } catch (err) {
      const status = err?.response?.status;
      setFetchError(`Request failed${status ? ` (status ${status})` : ""}`);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const applyFilters = () => {
    let tmp = [...users];
    if (search.trim()) {
      const q = search.toLowerCase();
      tmp = tmp.filter(
        (u) =>
          (u.username || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q)
      );
    }
    if (role) tmp = tmp.filter((u) => String(u.role) === String(role));
    if (status) tmp = tmp.filter((u) => (status === "online" ? u.is_online : !u.is_online));
    setFilteredUsers(tmp);
  };

  const clearFilters = () => {
    setSearch("");
    setRole(null);
    setStatus(null);
    setPage(1); // ✅ Reset pagination
    setFilteredUsers(users);
  };

  const handleLoadMore = () => {
    if (page < totalPages && !loadingMore) {
      fetchUsers(page + 1);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setUsers([]);
    fetchUsers(1, true);
  };

  const ListHeader = () => (
    <View style={styles.headerContainer}>
      {fetchError ? <Text style={styles.errorText}>{fetchError}</Text> : null}

      <TextInput
  value={search}
  onChangeText={(text) => {
    setSearch(text);
    let tmp = [...users];
    if (text.trim()) {
      const q = text.toLowerCase();
      tmp = tmp.filter(
        (u) =>
          (u.username || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q)
      );
    }
    if (role) tmp = tmp.filter((u) => String(u.role) === String(role));
    if (status) tmp = tmp.filter((u) => (status === "online" ? u.is_online : !u.is_online));
    setFilteredUsers(tmp);
  }}
  placeholder="Search by username or email"
  style={styles.input}
  returnKeyType="search"
/>

      <View style={styles.filterRow}>
        <View style={[styles.dropdownWrapper, { zIndex: roleOpen ? 3000 : 1 }]}>
          <DropDownPicker
            open={roleOpen}
            value={role}
            items={roleItems}
            setOpen={setRoleOpen}
            setValue={setRole}
            setItems={setRoleItems}
            placeholder="Filter by Role"
            containerStyle={styles.dropdownContainerStyle}
            style={styles.dropdown}
            dropDownContainerStyle={styles.dropDownBox}
            listMode="SCROLLVIEW"
            nestedScrollEnabled={true}
          />
        </View>

        <View style={[styles.dropdownWrapper, { zIndex: statusOpen ? 2000 : 1 }]}>
          <DropDownPicker
            open={statusOpen}
            value={status}
            items={statusItems}
            setOpen={setStatusOpen}
            setValue={setStatus}
            setItems={setStatusItems}
            placeholder="Filter by Status"
            containerStyle={styles.dropdownContainerStyle}
            style={styles.dropdown}
            dropDownContainerStyle={styles.dropDownBox}
            listMode="SCROLLVIEW"
            nestedScrollEnabled={true}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
        <Text style={styles.clearBtnText}>Clear All Filters</Text>
      </TouchableOpacity>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={[styles.row, styles.tableHeader]}>
          <Text style={styles.headerCell}>#</Text>
          <Text style={styles.headerCell}>Username</Text>
          <Text style={styles.headerCell}>Email</Text>
          <Text style={styles.headerCell}>Mobile</Text>
          <Text style={styles.headerCell}>Code</Text>
          <Text style={styles.headerCell}>Role</Text>
          <Text style={styles.headerCell}>Status</Text>
        </View>
      </ScrollView>
    </View>
  );

  const renderItem = ({ item, index }) => {
    const absoluteIndex = users.findIndex((u) => u.id === item.id) + 1 || index + 1;
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>
          <Text style={styles.cell}>{absoluteIndex}</Text>
          <Text style={styles.cell}>{item.username}</Text>
          <Text style={styles.cell}>{item.email}</Text>
          <Text style={styles.cell}>{item.mobile_no ?? "N/A"}</Text>
          <Text style={styles.cell}>{item.employee_code}</Text>
          <Text style={styles.roleBadge}>{item.role}</Text>
          <Text style={[styles.status, { color: item.is_online ? "green" : "red" }]}>
            {item.is_online ? "Online" : "Offline"}
          </Text>
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {loading && users.length === 0 ? (
          <ActivityIndicator size="large" color="#B27F5A" style={{ marginTop: 30 }} />
        ) : filteredUsers.length === 0 ? ( // ✅ Show message if no data
          <View style={{ alignItems: "center", marginTop: 50 }}>
            <Text style={{ fontSize: 16, color: "#666" }}>No data found</Text>
          </View>
        ) : (
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            ListHeaderComponent={ListHeader}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator size="small" color="#B27F5A" style={{ margin: 12 }} />
              ) : null
            }
            refreshing={refreshing}
            onRefresh={handleRefresh}
            contentContainerStyle={{ paddingBottom: 60 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            nestedScrollEnabled={true}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, padding: 10, backgroundColor: "#fff" },
  headerContainer: { marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: Platform.OS === "ios" ? 12 : 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  filterRow: { flexDirection: "row", marginBottom: 10 },
  dropdownWrapper: { flex: 1, marginRight: 6 },
  dropdownContainerStyle: { height: 40 },
  dropdown: {
    borderColor: "#ccc",
    borderRadius: 8,
    height: 40,
    backgroundColor: "#fff",
  },
  dropDownBox: {
    borderColor: "#ccc",
    backgroundColor: "#fff",
    maxHeight: 300,
  },
  clearBtn: {
    backgroundColor: "#D2AF6F",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 8,
    marginTop: 8,
  },
  clearBtnText: { color: "#fff", fontWeight: "600" },
  row: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
    minWidth: 800,
  },
  cell: { flex: 1, fontSize: 12, minWidth: 100 },
  tableHeader: { backgroundColor: "#4E8D7C", borderRadius: 8 },
  headerCell: {
    flex: 1,
    fontWeight: "700",
    color: "#fff",
    fontSize: 12,
    minWidth: 100,
  },
  roleBadge: {
    flex: 1,
    fontSize: 12,
    backgroundColor: "#eee",
    textAlign: "center",
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 100,
  },
  status: { flex: 1, fontWeight: "700", fontSize: 12, minWidth: 100 },
  errorText: { color: "red", marginBottom: 8 },
});
