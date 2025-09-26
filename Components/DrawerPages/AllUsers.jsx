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
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import axiosInstance from "../TokenHandling/axiosInstance";
import Ionicons from "react-native-vector-icons/Ionicons";

export default function AllUser({ navigation }) {
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

      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 10 }}>
        <Ionicons name="arrow-back" size={26} color="#377355" />
      </TouchableOpacity>

      {fetchError ? <Text style={styles.errorText}>{fetchError}</Text> : null}

      <TextInput
        value={search}
        onChangeText={setSearch}
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
            style={[styles.dropdown, { backgroundColor: '#fff' }]}
            dropDownContainerStyle={[styles.dropDownBox, { backgroundColor: '#fff', maxHeight: 300 }]}
            listMode="MODAL"
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
            style={[styles.dropdown, { backgroundColor: '#fff' }]}
            dropDownContainerStyle={[styles.dropDownBox, { backgroundColor: '#fff', maxHeight: 300 }]}
            listMode="MODAL"
            nestedScrollEnabled={true}
          />
        </View>

      </View>

      <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
        <Text style={styles.clearBtnText}>Clear All Filters</Text>
      </TouchableOpacity>

      <View style={[styles.row, styles.tableHeader]}>
        <Text style={styles.headerCell}>#</Text>
        <Text style={styles.headerCell}>Username</Text>
        <Text style={styles.headerCell}>Email</Text>
        <Text style={styles.headerCell}>Mobile</Text>
        <Text style={styles.headerCell}>Code</Text>
        <Text style={styles.headerCell}>Role</Text>
        <Text style={styles.headerCell}>Status</Text>
      </View>
    </View>
  );

  const renderItem = ({ item, index }) => {
    const absoluteIndex = users.findIndex((u) => u.id === item.id) + 1 || index + 1;
    return (
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
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {loading && users.length === 0 ? (
          <ActivityIndicator size="large" color="#B27F5A" style={{ marginTop: 30 }} />
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
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    padding: 5,
    backgroundColor: "#fff",
  },

  headerContainer: {
    marginBottom: 8,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: Platform.OS === "ios" ? 12 : 8,
    borderRadius: 8,
    marginBottom: 10,
  },

  filterRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  dropdownWrapper: {
    flex: 1,
    marginRight: 6,
  },
  dropdownContainerStyle: {
    height: 40,
  },
  dropdown: {
    borderColor: "#ccc",
    borderRadius: 8,
    height: 10,
  },
  dropDownBox: {
    borderColor: "#ccc",
  },

  clearBtn: {
    backgroundColor: "#D2AF6F",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 8,
    marginTop: 8
  },
  clearBtnText: {
    color: "#fff",
    fontWeight: "600",
  },

  row: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
    columnGap: 10,
  },
  cell: {
    flex: 1,
    fontSize: 12
  },
  tableHeader: {
    //  backgroundColor: "#4E8D7C" ,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#4E8D7C",
    paddingLeft: 5
  },
  headerCell: {
    flex: 1,
    fontWeight: "700",
    color: "#000",
    fontSize: 12,


  },

  roleBadge: {
    flex: 1,
    fontSize: 12,
    backgroundColor: "#eee",
    textAlign: "center",
    paddingVertical: 4,
    borderRadius: 6,
  },
  status: {
    flex: 1,
    fontWeight: "700",
    fontSize: 12
  },
  errorText: {
    color: "red",
    marginBottom: 8
  },

  dropdown: {
    borderColor: "#ccc",
    borderRadius: 8,
    height: 40,
    backgroundColor: '#fff'
  },
  dropDownBox: {
    borderColor: "#ccc",
    backgroundColor: '#fff',
    maxHeight: 300
  },

});