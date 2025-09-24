import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Platform,
    PermissionsAndroid,
    NativeModules,
} from 'react-native';
import axiosInstance from '../TokenHandling/axiosInstance';
import Geolocation from 'react-native-geolocation-service';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    startNativeTracking,
    stopNativeTracking,
    setNativeAuth,
    setNativeRefresh,
    setAuthFromStorage,
} from '../native/LocationBridge';

const { LocationServiceBridge } = NativeModules;

const EmployeeCheckinForm = () => {
    const [logType, setLogType] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchingLocation, setFetchingLocation] = useState(false);
    const [tracking, setTracking] = useState(false);

    const isFormComplete = logType && latitude && longitude;

    const requestAndroidLocationPermission = async () => {
        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                {
                    title: 'Location Permission',
                    message: 'App needs access to your location',
                    buttonNeutral: 'Ask Me Later',
                    buttonNegative: 'Cancel',
                    buttonPositive: 'OK',
                }
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (err) {
            console.warn(err);
            return false;
        }
    };

    const fetchLocation = async () => {
        if (fetchingLocation) return;

        if (Platform.OS === 'android') {
            const ok = await requestAndroidLocationPermission();
            if (!ok) {
                Alert.alert('Permission Denied', 'Location permission is required');
                return;
            }
        }

        setFetchingLocation(true);

        Geolocation.getCurrentPosition(
            (position) => {
                // limit to 10 chars like previous behaviour
                const lat = position.coords.latitude.toString().slice(0, 10);
                const lon = position.coords.longitude.toString().slice(0, 10);

                setLatitude(lat);
                setLongitude(lon);
                setFetchingLocation(false);
            },
            (error) => {
                console.error('Geolocation error:', error);
                Alert.alert('Error', 'Failed to fetch location');
                setFetchingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
    };

    const handleSubmit = async () => {
        if (!isFormComplete) return;

        setLoading(true);
        try {
            const response = await axiosInstance.post(
                '/cowberry_app.api.employee_checkin.create_employee_checkin',
                {
                    log_type: logType,
                    latitude: latitude,
                    longitude: longitude,
                }
            );

            console.log('Response:', response.data);
            Alert.alert('Success', 'Check-in recorded successfully');

            // depending on logType start/stop tracking (IN -> start, OUT -> stop)
            if (logType === 'IN') {
                try {
                    await handleStartTracking();
                } catch (e) {
                    console.warn('Start tracking from submit failed', e);
                }
            } else if (logType === 'OUT') {
                try {
                    // silent true: don't show extra alerts in submit flow
                    await handleStopTracking(true);
                } catch (e) {
                    console.warn('Stop tracking from submit failed', e);
                }
            }

            // clear fields AFTER handling tracking (so we still know logType)
            setLogType('');
            setLatitude('');
            setLongitude('');
        } catch (error) {
            console.error('Check-in error:', error.response?.data || error.message);
            Alert.alert('Error', 'Failed to record check-in');
        } finally {
            setLoading(false);
        }
    };

    // -------- START TRACKING (kept for checkin-driven control) --------
    const handleStartTracking = async () => {
        // permission check...
        const sid = await AsyncStorage.getItem('sid');
        if (sid && LocationServiceBridge && typeof LocationServiceBridge.setSessionCookie === 'function') {
            try {
                await LocationServiceBridge.setSessionCookie(sid);
                console.log('DBG: setSessionCookie succeeded');
            } catch (e) { console.warn('setSessionCookie err', e); }
        } else {
            console.warn('DBG: setSessionCookie not available on native bridge');
        }

        // enable network posting
        if (LocationServiceBridge && typeof LocationServiceBridge.enableNetworkPosting === 'function') {
            try {
                LocationServiceBridge.enableNetworkPosting();
                console.log('DBG: enableNetworkPosting called');
            } catch (e) { console.warn('enableNetworkPosting failed', e); }
        } else {
            console.warn('DBG: enableNetworkPosting not available on native bridge');
        }

        // small delay to let native persist cookie/token
        await new Promise(res => setTimeout(res, 150));

        // start tracking
        try {
            const started = startNativeTracking(5);
            if (started) {
                setTracking(true);
                return true;
            } else {
                console.warn('startNativeTracking returned falsy value:', started);
                return !!started;
            }
        } catch (err) {
            console.error('Start native tracking error:', err);
            return false;
        }
    };

    // -------- STOP TRACKING (supports silent mode) --------
    const handleStopTracking = async (silent = false) => {
        if (!tracking) {
            if (!silent) {
                Alert.alert('Tracking', 'Tracking is not running');
            }
            return false;
        }
        try {
            // stop native tracking
            stopNativeTracking();

            // disable posting to be safe
            if (LocationServiceBridge && typeof LocationServiceBridge.disableNetworkPosting === 'function') {
                try {
                    LocationServiceBridge.disableNetworkPosting();
                    console.log('DBG: called disableNetworkPosting on native');
                } catch (e) {
                    console.warn('disableNetworkPosting failed', e);
                }
            }

            setTracking(false);
            if (!silent) Alert.alert('Tracking', 'Background tracking stopped.');
            return true;
        } catch (err) {
            console.error('Stop tracking error:', err);
            if (!silent) Alert.alert('Error', 'Failed to stop tracking');
            return false;
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Employee CheckIn</Text>

            {/* Log Type Dropdown */}
            <Text style={styles.label}>Log Type</Text>
            <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowDropdown(!showDropdown)}
            >
                <Text style={styles.dropdownText}>
                    {logType ? logType : 'Select Log Type'}
                </Text>
            </TouchableOpacity>
            {showDropdown && (
                <View style={styles.dropdownOptions}>
                    {['IN', 'OUT'].map((type) => (
                        <TouchableOpacity
                            key={type}
                            style={styles.dropdownOption}
                            onPress={() => {
                                setLogType(type);
                                setShowDropdown(false);
                            }}
                        >
                            <Text>{type}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* Latitude / Longitude row */}
            <View style={styles.coordRow}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Latitude</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: '#eee' }]}
                        value={latitude}
                        editable={false}
                        placeholder="Latitude"
                    />
                </View>

                <View style={{ width: 12 }} />

                <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Longitude</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: '#eee' }]}
                        value={longitude}
                        editable={false}
                        placeholder="Longitude"
                    />
                </View>
            </View>

            {/* Small left-aligned fetch button */}
            <View style={styles.actionsRow}>
                <TouchableOpacity
                    style={styles.smallIconButton}
                    onPress={fetchLocation}
                    disabled={fetchingLocation}
                >
                    {fetchingLocation ? (
                        <ActivityIndicator color="#377355" />
                    ) : (
                        <Ionicons name="location-outline" size={20} />
                    )}
                </TouchableOpacity>

                <Text style={styles.fetchLabel}>Fetch Geolocation</Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
                style={[
                    styles.button,
                    { backgroundColor: isFormComplete ? '#377355' : '#aaa' },
                ]}
                onPress={handleSubmit}
                disabled={!isFormComplete || loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>Save</Text>
                )}
            </TouchableOpacity>

            {/* NOTE: Manual Start/Stop buttons removed — tracking controlled solely by IN/OUT checkin */}
        </View>
    );
};

export default EmployeeCheckinForm;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
        // justifyContent: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 25,
        textAlign: 'center',
        marginTop: 60
    },
    label: {
        fontSize: 16,
        marginTop: 20,
        marginBottom: 5,
    },
    dropdown: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 12,
        justifyContent: 'center',

    },
    dropdownText: {
        fontSize: 16,
    },
    dropdownOptions: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        marginTop: 5,
    },
    dropdownOption: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    coordRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        marginBottom: 10,
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        marginBottom: 20
    },
    smallIconButton: {
        width: 42,
        height: 42,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f6f6f6',
    },
    fetchLabel: {
        marginLeft: 12,
        fontSize: 14,
        color: '#444',
    },
    button: {
        marginTop: 20,
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    disabledButton: {
        opacity: 0.5
    },
});
