import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
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
    <View style={styles.container}>
      <Text style={styles.title}>Apply Leave</Text>

      <Text style={styles.label}>Employee ID</Text>
      <TextInput
        value={employeeCode}
        style={[styles.prefilled, { backgroundColor: '#e0e0e0' }]}
        editable={false}
      />

      <Text style={styles.label}>Leave Type</Text>
      <TouchableOpacity
        style={styles.dropdown}
        onPress={() => setShowDropdown(!showDropdown)}
      >
        <Text style={styles.dropdownText}>
          {leaveTypesLoading ? 'Loading...' : leaveType || 'Select Leave Type'}
        </Text>
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

      <Text style={styles.label}>From Date</Text>
      <TouchableOpacity onPress={() => setShowFromPicker(true)} style={styles.dateButton}>
        <Text>{formatDate(fromDate)}</Text>
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

      <Text style={styles.label}>To Date</Text>
      <TouchableOpacity onPress={() => setShowToPicker(true)} style={styles.dateButton}>
        <Text>{formatDate(toDate)}</Text>
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

      {loading ? (
        <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 20 }} />
      ) : (
        <TouchableOpacity style={styles.submitButton} onPress={handleApplyLeave}>
          <Text style={styles.submitButtonText}>Submit Leave</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, alignSelf: 'center' },
  label: { marginTop: 15, fontWeight: 'bold' },
  prefilled: { padding: 10, borderWidth: 1, borderColor: '#ccc', borderRadius: 8 },
  dropdown: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
    marginBottom: 5,
  },
  dropdownText: { fontSize: 16 },
  dropdownOptions: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 15 },
  dropdownOption: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#ddd' },
  dateButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 15,
  },
  submitButton: {
    backgroundColor: '#377355',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

export default ApplyLeavePage;
