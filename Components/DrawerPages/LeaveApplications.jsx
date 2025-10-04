import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axiosInstance from '../TokenHandling/axiosInstance';
import DateTimePicker from '@react-native-community/datetimepicker';

const ApplyLeavePage = ({ route }) => {
  const { employeeCode } = route.params;

  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveTypesLoading, setLeaveTypesLoading] = useState(true);
  const [leaveType, setLeaveType] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [halfDay, setHalfDay] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  const fetchLeaveTypes = async () => {
    setLeaveTypesLoading(true);
    try {
      const res = await axiosInstance.get('/cowberry_app.api.leave_api.get_leave_types');
      const types = res.data.message?.leave_types?.map(item => item.leave_type_name) || [];
      setLeaveTypes(types);
      if (types.length > 0) setLeaveType(types[0]); // default selection
    } catch (err) {
      console.error('Error fetching leave types:', err);
      Alert.alert('Error', 'Failed to fetch leave types');
      setLeaveTypes([]);
    } finally {
      setLeaveTypesLoading(false);
    }
  };

  const formatDate = date => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  };

  const handleApplyLeave = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.post('/cowberry_app.api.leave_api.apply_leave', {
        employee: employeeCode,
        leave_type: leaveType,
        from_date: formatDate(fromDate),
        to_date: formatDate(toDate),
        half_day: halfDay,
      });

      const data = response.data;
      if (data.message?.leave) {
        Alert.alert('Success', `Leave submitted successfully!\nLeave ID: ${data.message.leave}`);
      } else {
        Alert.alert('Info', JSON.stringify(data));
      }
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.message || 'Something went wrong';
      Alert.alert('Error', typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.page}>
      <ImageBackground
        source={require('../images/123.png')}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.imageOverlay} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.card}>
              <Text style={styles.title}>Apply Leave</Text>

              {/* Employee ID (prefilled) */}
              <Text style={styles.label}>Employee ID</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="id-card-outline" size={20} color="#555" style={styles.icon} />
                <TextInput
                  value={employeeCode}
                  style={styles.input}
                  editable={false}
                  placeholderTextColor="#888"
                />
              </View>

              {/* Leave Type (dropdown-like) */}
              <Text style={styles.label}>Leave Type</Text>
              <TouchableOpacity
                style={styles.inputContainer}
                onPress={() => setShowDropdown(!showDropdown)}
                activeOpacity={0.8}
              >
                <Ionicons name="clipboard-outline" size={20} color="#555" style={styles.icon} />
                <Text style={{ flex: 1, color: leaveTypesLoading ? '#888' : '#000' }}>
                  {leaveTypesLoading ? 'Loading...' : leaveType || 'Select Leave Type'}
                </Text>
                <Ionicons
                  name={showDropdown ? 'chevron-up-outline' : 'chevron-down-outline'}
                  size={20}
                  color="#555"
                />
              </TouchableOpacity>

              {showDropdown && !leaveTypesLoading && (
                <View style={styles.dropdownOptions}>
                  {leaveTypes.map(type => (
                    <TouchableOpacity
                      key={type}
                      style={styles.dropdownOption}
                      onPress={() => {
                        setLeaveType(type);
                        setShowDropdown(false);
                      }}
                    >
                      <Text>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* From Date */}
              <Text style={styles.label}>From Date</Text>
              <TouchableOpacity
                style={styles.inputContainer}
                onPress={() => setShowFromPicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#555" style={styles.icon} />
                <Text style={{ flex: 1 }}>{formatDate(fromDate)}</Text>
                <Ionicons name="chevron-down-outline" size={20} color="#555" />
              </TouchableOpacity>
              {showFromPicker && (
                <DateTimePicker
                  value={fromDate}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowFromPicker(false);
                    if (selectedDate) setFromDate(selectedDate);
                  }}
                />
              )}

              {/* To Date */}
              <Text style={styles.label}>To Date</Text>
              <TouchableOpacity
                style={styles.inputContainer}
                onPress={() => setShowToPicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#555" style={styles.icon} />
                <Text style={{ flex: 1 }}>{formatDate(toDate)}</Text>
                <Ionicons name="chevron-down-outline" size={20} color="#555" />
              </TouchableOpacity>
              {showToPicker && (
                <DateTimePicker
                  value={toDate}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowToPicker(false);
                    if (selectedDate) setToDate(selectedDate);
                  }}
                />
              )}

              {/* Submit / Loading */}
              {loading ? (
                <ActivityIndicator size="large" style={{ marginTop: 20 }} />
              ) : (
                <TouchableOpacity style={styles.loginButton} onPress={handleApplyLeave}>
                  <Text style={styles.loginButtonText}>Submit Leave</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </SafeAreaView>
  );
};

export default ApplyLeavePage;

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#fff',
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(186, 186, 186, 0.6)',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 28,
    padding: 24,
 
   
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 24,
    color: '#000',
  },
  label: {
    marginTop: 12,
    marginBottom: 6,
    fontWeight: '700',
    color: '#212121',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#e6e6e6',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 12,
    backgroundColor: '#fafafa',
    height: 50,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#000',
  },
  dropdownOptions: {
    borderWidth: 1,
    borderColor: '#e6e6e6',
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  dropdownOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  loginButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 15,
    borderRadius: 40,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#2E7D32',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 4,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
});


// ye code design change karne se pahle ka hai

// import React, { useEffect, useState } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   Alert,
//   ActivityIndicator,
// } from 'react-native';
// import axiosInstance from '../TokenHandling/axiosInstance';
// import DateTimePicker from '@react-native-community/datetimepicker';

// const ApplyLeavePage = ({ route }) => {
//   const { employeeCode } = route.params;

//   const [leaveTypes, setLeaveTypes] = useState([]);
//   const [leaveTypesLoading, setLeaveTypesLoading] = useState(true);
//   const [leaveType, setLeaveType] = useState('');
//   const [showDropdown, setShowDropdown] = useState(false);
//   const [fromDate, setFromDate] = useState(new Date());
//   const [toDate, setToDate] = useState(new Date());
//   const [showFromPicker, setShowFromPicker] = useState(false);
//   const [showToPicker, setShowToPicker] = useState(false);
//   const [halfDay, setHalfDay] = useState(0);
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     fetchLeaveTypes();
//   }, []);

//   const fetchLeaveTypes = async () => {
//     setLeaveTypesLoading(true);
//     try {
//       const res = await axiosInstance.get('/cowberry_app.api.leave_api.get_leave_types');
//       const types = res.data.message?.leave_types?.map(item => item.leave_type_name) || [];
//       setLeaveTypes(types);
//       if (types.length > 0) setLeaveType(types[0]); // default selection
//     } catch (err) {
//       console.error('Error fetching leave types:', err);
//       Alert.alert('Error', 'Failed to fetch leave types');
//       setLeaveTypes([]);
//     } finally {
//       setLeaveTypesLoading(false);
//     }
//   };

//   const formatDate = date => {
//     const d = new Date(date);
//     return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
//       d.getDate()
//     ).padStart(2, '0')}`;
//   };

//   // const handleApplyLeave = async () => {
//   //   setLoading(true);
//   //   try {
//   //     const response = await axiosInstance.post('/cowberry_app.api.leave_api.apply_leave', {
//   //       employee: employeeCode,
//   //       leave_type: leaveType,
//   //       from_date: formatDate(fromDate),
//   //       to_date: formatDate(toDate),
//   //       half_day: halfDay,
//   //     });

//   //     const data = response.data;
//   //     if (data.message?.leave) {
//   //       Alert.alert('Success', `Leave submitted successfully!\nLeave ID: ${data.message.leave}`);
//   //     } else {
//   //       Alert.alert('Info', JSON.stringify(data));
//   //     }
//   //   } catch (error) {
//   //     console.error(error);
//   //     const msg = error.response?.data?.message || 'Something went wrong';
//   //     Alert.alert('Error', typeof msg === 'string' ? msg : JSON.stringify(msg));
//   //   } finally {
//   //     setLoading(false);
//   //   }
//   // };
// const handleApplyLeave = async () => {
//   setLoading(true);
//   try {
//     const response = await axiosInstance.post('/cowberry_app.api.leave_api.apply_leave', {
//       employee: employeeCode,
//       leave_type: leaveType,
//       from_date: formatDate(fromDate),
//       to_date: formatDate(toDate),
//       half_day: halfDay,
//     });

//     const data = response.data;
//     if (data.message?.leave) {
//       Alert.alert('Success', `Leave submitted successfully!\nLeave ID: ${data.message.leave}`);
//     } else {
//       Alert.alert('Info', JSON.stringify(data));
//     }
//   } catch (error) {
//     console.error(error);
//     const msg = error.response?.data?.message || 'Something went wrong';
//     Alert.alert('Error', typeof msg === 'string' ? msg : JSON.stringify(msg));
//   } finally {
//     setLoading(false);
//   }
// };

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Apply Leave</Text>

//       <Text style={styles.label}>Employee ID</Text>
//       <TextInput
//         value={employeeCode}
//         style={[styles.prefilled, { backgroundColor: '#e0e0e0' }]}
//         editable={false}
//       />

//       <Text style={styles.label}>Leave Type</Text>
//       <TouchableOpacity
//         style={styles.dropdown}
//         onPress={() => setShowDropdown(!showDropdown)}
//       >
//         <Text style={styles.dropdownText}>
//           {leaveTypesLoading ? 'Loading...' : leaveType || 'Select Leave Type'}
//         </Text>
//       </TouchableOpacity>
//       {showDropdown && !leaveTypesLoading && (
//         <View style={styles.dropdownOptions}>
//           {leaveTypes.map(type => (
//             <TouchableOpacity
//               key={type}
//               style={styles.dropdownOption}
//               onPress={() => {
//                 setLeaveType(type);
//                 setShowDropdown(false);
//               }}
//             >
//               <Text>{type}</Text>
//             </TouchableOpacity>
//           ))}
//         </View>
//       )}

//       <Text style={styles.label}>From Date</Text>
//       <TouchableOpacity onPress={() => setShowFromPicker(true)} style={styles.dateButton}>
//         <Text>{formatDate(fromDate)}</Text>
//       </TouchableOpacity>
//       {showFromPicker && (
//         <DateTimePicker
//           value={fromDate}
//           mode="date"
//           display="default"
//           onChange={(event, selectedDate) => {
//             setShowFromPicker(false);
//             if (selectedDate) setFromDate(selectedDate);
//           }}
//         />
//       )}

//       <Text style={styles.label}>To Date</Text>
//       <TouchableOpacity onPress={() => setShowToPicker(true)} style={styles.dateButton}>
//         <Text>{formatDate(toDate)}</Text>
//       </TouchableOpacity>
//       {showToPicker && (
//         <DateTimePicker
//           value={toDate}
//           mode="date"
//           display="default"
//           onChange={(event, selectedDate) => {
//             setShowToPicker(false);
//             if (selectedDate) setToDate(selectedDate);
//           }}
//         />
//       )}

//       {loading ? (
//         <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 20 }} />
//       ) : (
//         <TouchableOpacity style={styles.submitButton} onPress={handleApplyLeave}>
//           <Text style={styles.submitButtonText}>Submit Leave</Text>
//         </TouchableOpacity>
//       )}
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: { flex: 1, padding: 20, backgroundColor: '#fff' },
//   title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, alignSelf: 'center' },
//   label: { marginTop: 15, fontWeight: 'bold' },
//   prefilled: { padding: 10, borderWidth: 1, borderColor: '#ccc', borderRadius: 8 },
//   dropdown: {
//     borderWidth: 1,
//     borderColor: '#ccc',
//     borderRadius: 8,
//     padding: 12,
//     justifyContent: 'center',
//     marginBottom: 5,
//   },
//   dropdownText: { fontSize: 16 },
//   dropdownOptions: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 15 },
//   dropdownOption: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#ddd' },
//   dateButton: {
//     padding: 12,
//     borderWidth: 1,
//     borderColor: '#ccc',
//     borderRadius: 8,
//     marginBottom: 15,
//   },
//   submitButton: {
//     backgroundColor: '#377355',
//     padding: 15,
//     borderRadius: 10,
//     alignItems: 'center',
//     marginTop: 10,
//   },
//   submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
// });

// export default ApplyLeavePage;


// import React, { useEffect, useState } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   Alert,
//   ActivityIndicator,
// } from 'react-native';
// import axiosInstance from '../TokenHandling/axiosInstance';
// import DateTimePicker from '@react-native-community/datetimepicker';

// const ApplyLeavePage = ({ route }) => {
//   const { employeeCode } = route.params;

//   const [leaveTypes, setLeaveTypes] = useState([]);
//   const [leaveTypesLoading, setLeaveTypesLoading] = useState(true);
//   const [leaveType, setLeaveType] = useState('');
//   const [showDropdown, setShowDropdown] = useState(false);
//   const [fromDate, setFromDate] = useState(new Date());
//   const [toDate, setToDate] = useState(new Date());
//   const [showFromPicker, setShowFromPicker] = useState(false);
//   const [showToPicker, setShowToPicker] = useState(false);
//   const [halfDay, setHalfDay] = useState(0);
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     fetchLeaveTypes();
//   }, []);

//   const fetchLeaveTypes = async () => {
//     setLeaveTypesLoading(true);
//     try {
//       const res = await axiosInstance.get('/cowberry_app.api.leave_api.get_leave_types');
//       const types = res.data.message?.leave_types?.map(item => item.leave_type_name) || [];
//       setLeaveTypes(types);
//       if (types.length > 0) setLeaveType(types[0]); // default selection
//     } catch (err) {
//       console.error('Error fetching leave types:', err);
//       Alert.alert('Error', 'Failed to fetch leave types');
//       setLeaveTypes([]);
//     } finally {
//       setLeaveTypesLoading(false);
//     }
//   };

//   const formatDate = date => {
//     const d = new Date(date);
//     return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
//       d.getDate()
//     ).padStart(2, '0')}`;
//   };

//   const handleApplyLeave = async () => {
//     setLoading(true);
//     try {
//       const response = await axiosInstance.post('/cowberry_app.api.leave_api.apply_leave', {
//         employee: employeeCode,
//         leave_type: leaveType,
//         from_date: formatDate(fromDate),
//         to_date: formatDate(toDate),
//         half_day: halfDay,
//       });

//       const data = response.data;
//       if (data.message?.leave) {
//         Alert.alert('Success', `Leave submitted successfully!\nLeave ID: ${data.message.leave}`);
//       } else {
//         Alert.alert('Info', JSON.stringify(data));
//       }
//     } catch (error) {
//       console.error(error);
//       const msg = error.response?.data?.message || 'Something went wrong';
//       Alert.alert('Error', typeof msg === 'string' ? msg : JSON.stringify(msg));
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Apply Leave</Text>

//       <Text style={styles.label}>Employee ID</Text>
//       <TextInput
//         value={employeeCode}
//         style={[styles.prefilled, { backgroundColor: '#e0e0e0' }]}
//         editable={false}
//       />

//       <Text style={styles.label}>Leave Type</Text>
//       <TouchableOpacity
//         style={styles.dropdown}
//         onPress={() => setShowDropdown(!showDropdown)}
//       >
//         <Text style={styles.dropdownText}>
//           {leaveTypesLoading ? 'Loading...' : leaveType || 'Select Leave Type'}
//         </Text>
//       </TouchableOpacity>
//       {showDropdown && !leaveTypesLoading && (
//         <View style={styles.dropdownOptions}>
//           {leaveTypes.map(type => (
//             <TouchableOpacity
//               key={type}
//               style={styles.dropdownOption}
//               onPress={() => {
//                 setLeaveType(type);
//                 setShowDropdown(false);
//               }}
//             >
//               <Text>{type}</Text>
//             </TouchableOpacity>
//           ))}
//         </View>
//       )}

//       <Text style={styles.label}>From Date</Text>
//       <TouchableOpacity onPress={() => setShowFromPicker(true)} style={styles.dateButton}>
//         <Text>{formatDate(fromDate)}</Text>
//       </TouchableOpacity>
//       {showFromPicker && (
//         <DateTimePicker
//           value={fromDate}
//           mode="date"
//           display="default"
//           onChange={(event, selectedDate) => {
//             setShowFromPicker(false);
//             if (selectedDate) setFromDate(selectedDate);
//           }}
//         />
//       )}

//       <Text style={styles.label}>To Date</Text>
//       <TouchableOpacity onPress={() => setShowToPicker(true)} style={styles.dateButton}>
//         <Text>{formatDate(toDate)}</Text>
//       </TouchableOpacity>
//       {showToPicker && (
//         <DateTimePicker
//           value={toDate}
//           mode="date"
//           display="default"
//           onChange={(event, selectedDate) => {
//             setShowToPicker(false);
//             if (selectedDate) setToDate(selectedDate);
//           }}
//         />
//       )}

//       {loading ? (
//         <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 20 }} />
//       ) : (
//         <TouchableOpacity style={styles.submitButton} onPress={handleApplyLeave}>
//           <Text style={styles.submitButtonText}>Submit Leave</Text>
//         </TouchableOpacity>
//       )}
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: { flex: 1, padding: 20, backgroundColor: '#fff' },
//   title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, alignSelf: 'center' },
//   label: { marginTop: 15, fontWeight: 'bold' },
//   prefilled: { padding: 10, borderWidth: 1, borderColor: '#ccc', borderRadius: 8 },
//   dropdown: {
//     borderWidth: 1,
//     borderColor: '#ccc',
//     borderRadius: 8,
//     padding: 12,
//     justifyContent: 'center',
//     marginBottom: 5,
//   },
//   dropdownText: { fontSize: 16 },
//   dropdownOptions: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 15 },
//   dropdownOption: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#ddd' },
//   dateButton: {
//     padding: 12,
//     borderWidth: 1,
//     borderColor: '#ccc',
//     borderRadius: 8,
//     marginBottom: 15,
//   },
//   submitButton: {
//     backgroundColor: '#377355',
//     padding: 15,
//     borderRadius: 10,
//     alignItems: 'center',
//     marginTop: 10,
//   },
//   submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
// });

// export default ApplyLeavePage;

