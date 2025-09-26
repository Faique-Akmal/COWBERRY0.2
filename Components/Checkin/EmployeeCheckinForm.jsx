// image pick from Camera
// import React, { useState, useEffect } from 'react';
// import {
//     View,
//     Text,
//     TextInput,
//     TouchableOpacity,
//     StyleSheet,
//     ActivityIndicator,
//     Alert,
//     Platform,
//     PermissionsAndroid,
//     NativeModules,
//     Image,
//     ScrollView
// } from 'react-native';
// import axiosInstance from '../TokenHandling/axiosInstance';
// import Geolocation from 'react-native-geolocation-service';
// import Ionicons from 'react-native-vector-icons/Ionicons';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {
//     startNativeTracking,
//     stopNativeTracking,
// } from '../native/LocationBridge';
// import { launchCamera } from 'react-native-image-picker';

// const { LocationServiceBridge } = NativeModules;

// const EmployeeCheckinForm = () => {
//     const [logType, setLogType] = useState('');
//     const [showDropdown, setShowDropdown] = useState(false);
//     const [latitude, setLatitude] = useState('');
//     const [longitude, setLongitude] = useState('');
//     const [loading, setLoading] = useState(false);
//     const [fetchingLocation, setFetchingLocation] = useState(false);
//     const [tracking, setTracking] = useState(false);

//     // Profile related
//     const [isFieldEmployee, setIsFieldEmployee] = useState(false);
//     const [profileLoading, setProfileLoading] = useState(true);
//     const [employeeId, setEmployeeId] = useState(null);

//     // Images (only for Field Employee)
//     const [odometerImage, setOdometerImage] = useState(null); // { uri, fileName, type }
//     const [selfieImage, setSelfieImage] = useState(null);

//     useEffect(() => {
//         fetchUserProfile();
//     }, []);

//     const fetchUserProfile = async () => {
//         setProfileLoading(true);
//         try {
//             const res = await axiosInstance.get('/cowberry_app.api.me.me_api');
//             const msg = res.data?.message;
//             const user = msg?.user;
//             const sid = msg?.sid;

//             console.log('Profile Response:', { user, sid }); // Debug

//             if (user) {
//                 const roles = Array.isArray(user.roles) ? user.roles : [];
//                 const isField = roles.includes('Field Employee');
//                 console.log('User Roles:', roles, 'Is Field Employee:', isField); // Debug
//                 setIsFieldEmployee(isField);
//                 setEmployeeId(user.employee_id || null);

//                 // Persist sid
//                 if (sid) {
//                     try {
//                         await AsyncStorage.setItem('sid', sid);
//                         console.log('SID saved:', sid);
//                     } catch (e) {
//                         console.warn('Failed to save sid', e);
//                     }
//                     if (LocationServiceBridge && typeof LocationServiceBridge.setSessionCookie === 'function') {
//                         try {
//                             await LocationServiceBridge.setSessionCookie(sid);
//                             console.log('DBG: setSessionCookie succeeded (on profile fetch)');
//                         } catch (e) {
//                             console.warn('setSessionCookie err (on profile fetch)', e);
//                         }
//                     }
//                 }

//                 // Start tracking if Field Employee and already checked in
//                 if (isField && user.is_checkin) {
//                     try {
//                         await handleStartTracking();
//                         console.log('Auto-started tracking for Field Employee');
//                     } catch (e) {
//                         console.warn('Auto start tracking failed', e);
//                     }
//                 } else {
//                     setTracking(false);
//                     console.log('Not starting tracking: isField=', isField, 'is_checkin=', user.is_checkin);
//                 }
//             } else {
//                 console.warn('No user data in profile response');
//                 setIsFieldEmployee(false);
//             }
//         } catch (err) {
//             console.warn('Failed to fetch profile (me_api):', err.response?.data || err.message || err);
//             setIsFieldEmployee(false);
//         } finally {
//             setProfileLoading(false);
//         }
//     };

//     const requestAndroidLocationPermission = async () => {
//         try {
//             const granted = await PermissionsAndroid.request(
//                 PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
//                 {
//                     title: 'Location Permission',
//                     message: 'App needs access to your location',
//                     buttonNeutral: 'Ask Me Later',
//                     buttonNegative: 'Cancel',
//                     buttonPositive: 'OK',
//                 }
//             );
//             return granted === PermissionsAndroid.RESULTS.GRANTED;
//         } catch (err) {
//             console.warn(err);
//             return false;
//         }
//     };

//     const fetchLocation = async () => {
//         if (fetchingLocation) return;

//         if (Platform.OS === 'android') {
//             const ok = await requestAndroidLocationPermission();
//             if (!ok) {
//                 Alert.alert('Permission Denied', 'Location permission is required');
//                 return;
//             }
//         }

//         setFetchingLocation(true);

//         Geolocation.getCurrentPosition(
//             (position) => {
//                 const lat = position.coords.latitude.toString().slice(0, 10);
//                 const lon = position.coords.longitude.toString().slice(0, 10);

//                 setLatitude(lat);
//                 setLongitude(lon);
//                 setFetchingLocation(false);
//             },
//             (error) => {
//                 console.error('Geolocation error:', error);
//                 Alert.alert('Error', 'Failed to fetch location');
//                 setFetchingLocation(false);
//             },
//             { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
//         );
//     };

//     // Camera helper
//     const openCameraFor = async (which) => {
//         if (Platform.OS === 'android') {
//             const camPerm = await PermissionsAndroid.request(
//                 PermissionsAndroid.PERMISSIONS.CAMERA,
//                 {
//                     title: 'Camera Permission',
//                     message: 'App needs access to your camera to take photo',
//                     buttonNeutral: 'Ask Me Later',
//                     buttonNegative: 'Cancel',
//                     buttonPositive: 'OK',
//                 }
//             );
//             if (camPerm !== PermissionsAndroid.RESULTS.GRANTED) {
//                 Alert.alert('Permission Denied', 'Camera permission required');
//                 return;
//             }
//         }

//         const options = {
//             mediaType: 'photo',
//             cameraType: which === 'selfie' ? 'front' : 'back',
//             saveToPhotos: false,
//             maxWidth: 1024, // Reduce file size
//             maxHeight: 1024,
//             quality: 0.7,
//         };

//         launchCamera(options, (response) => {
//             if (response.didCancel) {
//                 return;
//             } else if (response.errorCode) {
//                 console.warn('Camera error', response.errorMessage || response.errorCode);
//                 Alert.alert('Error', 'Camera error: ' + (response.errorMessage || response.errorCode));
//                 return;
//             } else {
//                 const asset = response.assets && response.assets[0];
//                 if (!asset) {
//                     Alert.alert('Error', 'No image captured');
//                     return;
//                 }
//                 const file = {
//                     uri: asset.uri,
//                     name: asset.fileName || `${which}_${Date.now()}.jpg`,
//                     type: asset.type || 'image/jpeg',
//                 };
//                 console.log('Captured image:', file); // Debug
//                 if (which === 'odometer') setOdometerImage(file);
//                 else setSelfieImage(file);
//             }
//         });
//     };

//     // Prepare file for FormData
//     const prepareFileForForm = (file) => {
//         if (!file || !file.uri) {
//             console.warn('Invalid file object:', file);
//             return null;
//         }
//         let uri = file.uri;
//         // Fix URI for Android/iOS
//         if (Platform.OS === 'android' && !uri.startsWith('file://') && !uri.startsWith('content://')) {
//             uri = `file://${uri}`;
//         }
//         const fileObj = {
//             uri,
//             name: file.name || `photo_${Date.now()}.jpg`,
//             type: file.type || 'image/jpeg',
//         };
//         console.log('Prepared file for FormData:', fileObj); // Debug
//         return fileObj;
//     };

//     // Form validation
//     const isFormComplete = () => {
//         if (!logType || !latitude || !longitude) return false;
//         if (isFieldEmployee) {
//             return !!(odometerImage && selfieImage);
//         }
//         return true;
//     };

//     // Submit handler
//     const handleSubmit = async () => {
//         if (!isFormComplete()) {
//             if (isFieldEmployee) {
//                 Alert.alert('Incomplete', 'Odometer and selfie images are required for Field Employee.');
//             } else {
//                 Alert.alert('Incomplete', 'Please fill all required fields.');
//             }
//             return;
//         }

//         setLoading(true);
//         try {
//             const hasImages = isFieldEmployee && odometerImage && selfieImage; // Strict check
//             console.log('Submitting with:', { logType, latitude, longitude, isFieldEmployee, hasImages, odometerImage, selfieImage }); // Debug

//             if (hasImages) {
//                 const formData = new FormData();
//                 formData.append('log_type', logType);
//                 formData.append('latitude', latitude);
//                 formData.append('longitude', longitude);
//                 if (employeeId) formData.append('employee_id', employeeId);

//                 const odometerFile = prepareFileForForm(odometerImage);
//                 const selfFile = prepareFileForForm(selfieImage);

//                 if (!odometerFile || !selfFile) {
//                     Alert.alert('Error', 'Failed to prepare one or both images.');
//                     setLoading(false);
//                     return;
//                 }

//                 formData.append('odometer_image', odometerFile);
//                 formData.append('self_image', selfFile);

//                 // Debug FormData (FormData can't be logged directly, so log metadata)
//                 console.log('FormData contents:', {
//                     log_type: logType,
//                     latitude,
//                     longitude,
//                     employee_id: employeeId,
//                     odometer_image: odometerFile,
//                     self_image: selfFile,
//                 });

//                 const response = await axiosInstance.post(
//                     '/cowberry_app.api.employee_checkin.create_employee_checkin',
//                     formData,
//                     {
//                         headers: {
//                             'Content-Type': undefined, // Let browser set multipart boundary
//                         },
//                     }
//                 );

//                 console.log('Response (form):', response.data);
//             } else {
//                 const body = {
//                     log_type: logType,
//                     latitude: latitude,
//                     longitude: longitude,
//                     employee_id: employeeId || undefined,
//                 };

//                 const response = await axiosInstance.post(
//                     '/cowberry_app.api.employee_checkin.create_employee_checkin',
//                     body
//                 );

//                 console.log('Response (json):', response.data);
//             }

//             Alert.alert('Success', 'Check-in recorded successfully');

//             if (isFieldEmployee) {
//                 if (logType === 'IN') {
//                     try {
//                         await handleStartTracking();
//                         console.log('Started tracking for Field Employee');
//                     } catch (e) {
//                         console.warn('Start tracking from submit failed', e);
//                     }
//                 } else if (logType === 'OUT') {
//                     try {
//                         await handleStopTracking(true);
//                         console.log('Stopped tracking for Field Employee');
//                     } catch (e) {
//                         console.warn('Stop tracking from submit failed', e);
//                     }
//                 }
//             } else {
//                 console.log('Not Field Employee — skipping native tracking.');
//             }

//             // Reset form
//             setLogType('');
//             setLatitude('');
//             setLongitude('');
//             setOdometerImage(null);
//             setSelfieImage(null);
//         } catch (error) {
//             console.error('Check-in error:', error.response?.data || error.message);
//             Alert.alert('Error', error.response?.data?.exception || 'Failed to record check-in');
//         } finally {
//             setLoading(false);
//         }
//     };

//     const handleStartTracking = async () => {
//         if (!isFieldEmployee) {
//             console.log('Skipping startNativeTracking: user not Field Employee');
//             return false;
//         }

//         const sid = await AsyncStorage.getItem('sid');
//         if (sid && LocationServiceBridge && typeof LocationServiceBridge.setSessionCookie === 'function') {
//             try {
//                 await LocationServiceBridge.setSessionCookie(sid);
//                 console.log('DBG: setSessionCookie succeeded');
//             } catch (e) {
//                 console.warn('setSessionCookie err', e);
//             }
//         } else {
//             console.warn('DBG: setSessionCookie not available on native bridge or sid missing');
//         }

//         if (LocationServiceBridge && typeof LocationServiceBridge.enableNetworkPosting === 'function') {
//             try {
//                 LocationServiceBridge.enableNetworkPosting();
//                 console.log('DBG: enableNetworkPosting called');
//             } catch (e) {
//                 console.warn('enableNetworkPosting failed', e);
//             }
//         }

//         await new Promise(res => setTimeout(res, 150));

//         try {
//             const started = startNativeTracking(5);
//             if (started) setTracking(true);
//             else setTracking(!!started);
//             return !!started;
//         } catch (err) {
//             console.error('Start native tracking error:', err);
//             return false;
//         }
//     };

//     const handleStopTracking = async (silent = false) => {
//         if (!isFieldEmployee) {
//             console.log('Skipping stopNativeTracking: user not Field Employee');
//             if (!silent) Alert.alert('Tracking', 'Not a Field Employee — tracking not applicable.');
//             return false;
//         }

//         if (!tracking) {
//             if (!silent) Alert.alert('Tracking', 'Tracking is not running');
//             return false;
//         }
//         try {
//             stopNativeTracking();
//             if (LocationServiceBridge && typeof LocationServiceBridge.disableNetworkPosting === 'function') {
//                 try {
//                     LocationServiceBridge.disableNetworkPosting();
//                 } catch (e) {
//                     console.warn('disableNetworkPosting failed', e);
//                 }
//             }
//             setTracking(false);
//             if (!silent) Alert.alert('Tracking', 'Background tracking stopped.');
//             return true;
//         } catch (err) {
//             console.error('Stop tracking error:', err);
//             if (!silent) Alert.alert('Error', 'Failed to stop tracking');
//             return false;
//         }
//     };

//     return (
//         <ScrollView>
//             <View style={styles.container}>
//                 <Text style={styles.title}>Employee CheckIn</Text>

//                 <Text style={styles.label}>Log Type</Text>
//                 <TouchableOpacity
//                     style={styles.dropdown}
//                     onPress={() => setShowDropdown(!showDropdown)}
//                 >
//                     <Text style={styles.dropdownText}>
//                         {logType ? logType : 'Select Log Type'}
//                     </Text>
//                 </TouchableOpacity>
//                 {showDropdown && (
//                     <View style={styles.dropdownOptions}>
//                         {['IN', 'OUT'].map((type) => (
//                             <TouchableOpacity
//                                 key={type}
//                                 style={styles.dropdownOption}
//                                 onPress={() => {
//                                     setLogType(type);
//                                     setShowDropdown(false);
//                                 }}
//                             >
//                                 <Text>{type}</Text>
//                             </TouchableOpacity>
//                         ))}
//                     </View>
//                 )}

//                 {/* Latitude / Longitude row */}
//                 <View style={styles.coordRow}>
//                     <View style={{ flex: 1 }}>
//                         <Text style={styles.label}>Latitude</Text>
//                         <TextInput
//                             style={[styles.input, { backgroundColor: '#eee' }]}
//                             value={latitude}
//                             editable={false}
//                             placeholder="Latitude"
//                         />
//                     </View>

//                     <View style={{ width: 12 }} />

//                     <View style={{ flex: 1 }}>
//                         <Text style={styles.label}>Longitude</Text>
//                         <TextInput
//                             style={[styles.input, { backgroundColor: '#eee' }]}
//                             value={longitude}
//                             editable={false}
//                             placeholder="Longitude"
//                         />
//                     </View>
//                 </View>

//                 {/* Image fields (only for Field Employee) */}
//                 {isFieldEmployee && (
//                     <>
//                         <Text style={[styles.label, { marginTop: 8 }]}>Odometer Image</Text>
//                         <TouchableOpacity
//                             style={styles.imagePicker}
//                             onPress={() => openCameraFor('odometer')}
//                         >
//                             {odometerImage ? (
//                                 <Image source={{ uri: odometerImage.uri }} style={styles.preview} />
//                             ) : (
//                                 <View style={styles.imagePlaceholder}>
//                                     <Ionicons name="camera-outline" size={28} />
//                                     <Text style={{ marginTop: 6 }}>Tap to capture odometer</Text>
//                                 </View>
//                             )}
//                         </TouchableOpacity>

//                         <Text style={[styles.label, { marginTop: 10 }]}>Selfie Image</Text>
//                         <TouchableOpacity
//                             style={styles.imagePicker}
//                             onPress={() => openCameraFor('selfie')}
//                         >
//                             {selfieImage ? (
//                                 <Image source={{ uri: selfieImage.uri }} style={styles.preview} />
//                             ) : (
//                                 <View style={styles.imagePlaceholder}>
//                                     <Ionicons name="camera-outline" size={28} />
//                                     <Text style={{ marginTop: 6 }}>Tap to capture selfie</Text>
//                                 </View>
//                             )}
//                         </TouchableOpacity>
//                     </>
//                 )}

//                 {/* Small left-aligned fetch button */}
//                 <View style={styles.actionsRow}>
//                     <TouchableOpacity
//                         style={styles.smallIconButton}
//                         onPress={fetchLocation}
//                         disabled={fetchingLocation}
//                     >
//                         {fetchingLocation ? (
//                             <ActivityIndicator color="#377355" />
//                         ) : (
//                             <Ionicons name="location-outline" size={20} />
//                         )}
//                     </TouchableOpacity>

//                     <Text style={styles.fetchLabel}>Fetch Geolocation</Text>
//                 </View>

//                 {/* Submit Button */}
//                 <TouchableOpacity
//                     style={[
//                         styles.button,
//                         { backgroundColor: isFormComplete() ? '#377355' : '#aaa' },
//                     ]}
//                     onPress={handleSubmit}
//                     disabled={!isFormComplete() || loading}
//                 >
//                     {loading ? (
//                         <ActivityIndicator color="#fff" />
//                     ) : (
//                         <Text style={styles.buttonText}>Save</Text>
//                     )}
//                 </TouchableOpacity>
//             </View>
//         </ScrollView>
//     );
// };

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         padding: 20,
//         backgroundColor: '#fff',
//     },
//     title: {
//         fontSize: 24,
//         fontWeight: 'bold',
//         marginBottom: 12,
//         textAlign: 'center',
//     },
//     label: {
//         fontSize: 16,
//         marginTop: 10,
//         marginBottom: 6,
//     },
//     dropdown: {
//         borderWidth: 1,
//         borderColor: '#ccc',
//         borderRadius: 8,
//         padding: 12,
//         justifyContent: 'center',
//     },
//     dropdownText: {
//         fontSize: 16,
//     },
//     dropdownOptions: {
//         borderWidth: 1,
//         borderColor: '#ccc',
//         borderRadius: 8,
//         marginTop: 5,
//     },
//     dropdownOption: {
//         padding: 12,
//         borderBottomWidth: 1,
//         borderBottomColor: '#ddd',
//     },
//     coordRow: {
//         flexDirection: 'row',
//         alignItems: 'flex-start',
//         marginTop: 8,
//     },
//     input: {
//         borderWidth: 1,
//         borderColor: '#ccc',
//         borderRadius: 8,
//         paddingHorizontal: 12,
//         paddingVertical: 10,
//         fontSize: 16,
//         marginBottom: 10,
//     },
//     actionsRow: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         marginTop: 12,
//         marginBottom: 20,
//     },
//     smallIconButton: {
//         width: 42,
//         height: 42,
//         borderRadius: 10,
//         borderWidth: 1,
//         borderColor: '#ccc',
//         alignItems: 'center',
//         justifyContent: 'center',
//         backgroundColor: '#f6f6f6',
//     },
//     fetchLabel: {
//         marginLeft: 12,
//         fontSize: 14,
//         color: '#444',
//     },
//     button: {
//         marginTop: 20,
//         paddingVertical: 15,
//         borderRadius: 10,
//         alignItems: 'center',
//     },
//     buttonText: {
//         color: '#fff',
//         fontWeight: 'bold',
//         fontSize: 16,
//     },
//     imagePicker: {
//         marginTop: 6,
//         borderWidth: 1,
//         borderColor: '#ddd',
//         borderRadius: 8,
//         height: 140,
//         alignItems: 'center',
//         justifyContent: 'center',
//         overflow: 'hidden',
//     },
//     imagePlaceholder: {
//         alignItems: 'center',
//     },
//     preview: {
//         width: '100%',
//         height: '100%',
//         resizeMode: 'cover',
//     },
// });

// export default EmployeeCheckinForm;


// image pick from Gellery 
import React, { useState, useEffect } from 'react';
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
    Image,
    ScrollView
} from 'react-native';
import axiosInstance from '../TokenHandling/axiosInstance';
import Geolocation from 'react-native-geolocation-service';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    startNativeTracking,
    stopNativeTracking,
} from '../native/LocationBridge';
import { launchCamera } from 'react-native-image-picker';

const { LocationServiceBridge } = NativeModules;

const EmployeeCheckinForm = () => {
    const [logType, setLogType] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchingLocation, setFetchingLocation] = useState(false);
    const [tracking, setTracking] = useState(false);

    // Profile related
    const [isFieldEmployee, setIsFieldEmployee] = useState(false);
    const [profileLoading, setProfileLoading] = useState(true);
    const [employeeId, setEmployeeId] = useState(null);

    // Images (only for Field Employee)
    const [odometerImage, setOdometerImage] = useState(null); // { uri, fileName, type, fileSize }
    const [selfieImage, setSelfieImage] = useState(null);

    useEffect(() => {
        fetchUserProfile();
    }, []);

    const fetchUserProfile = async () => {
        setProfileLoading(true);
        try {
            const res = await axiosInstance.get('/cowberry_app.api.me.me_api');
            const msg = res.data?.message;
            const user = msg?.user;
            const sid = msg?.sid;

            console.log('Profile Response:', { user, sid }); // Debug

            if (user) {
                const roles = Array.isArray(user.roles) ? user.roles : [];
                const isField = roles.includes('Field Employee');
                console.log('User Roles:', roles, 'Is Field Employee:', isField); // Debug
                setIsFieldEmployee(isField);
                setEmployeeId(user.employee_id || null);

                // Persist sid
                if (sid) {
                    try {
                        await AsyncStorage.setItem('sid', sid);
                        console.log('SID saved:', sid);
                    } catch (e) {
                        console.warn('Failed to save sid', e);
                    }
                    if (LocationServiceBridge && typeof LocationServiceBridge.setSessionCookie === 'function') {
                        try {
                            await LocationServiceBridge.setSessionCookie(sid);
                            console.log('DBG: setSessionCookie succeeded (on profile fetch)');
                        } catch (e) {
                            console.warn('setSessionCookie err (on profile fetch)', e);
                        }
                    }
                }

                // Start tracking if Field Employee and already checked in
                if (isField && user.is_checkin) {
                    try {
                        await handleStartTracking();
                        console.log('Auto-started tracking for Field Employee');
                    } catch (e) {
                        console.warn('Auto start tracking failed', e);
                    }
                } else {
                    setTracking(false);
                    console.log('Not starting tracking: isField=', isField, 'is_checkin=', user.is_checkin);
                }
            } else {
                console.warn('No user data in profile response');
                setIsFieldEmployee(false);
            }
        } catch (err) {
            console.warn('Failed to fetch profile (me_api):', err.response?.data || err.message || err);
            setIsFieldEmployee(false);
        } finally {
            setProfileLoading(false);
        }
    };

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

    const requestAndroidCameraPermission = async () => {
        try {
            // For older Android versions request READ_EXTERNAL_STORAGE as well if needed
            const permissionsToAsk = [PermissionsAndroid.PERMISSIONS.CAMERA];
            // If your targetSdk < 33 or you need storage access, uncomment below:
            // permissionsToAsk.push(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);

            const results = await PermissionsAndroid.requestMultiple(permissionsToAsk);
            const cameraGranted = results[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED;
            // const storageGranted = results[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] === PermissionsAndroid.RESULTS.GRANTED;
            return cameraGranted; // && storageGranted; // if storage required, include check
        } catch (err) {
            console.warn('Camera permission error', err);
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

    // Camera helper (replaces gallery) — opens camera and returns captured image
    const openCameraFor = async (which) => {
        if (Platform.OS === 'android') {
            const ok = await requestAndroidCameraPermission();
            if (!ok) {
                Alert.alert('Permission Denied', 'Camera permission required to take photos');
                return;
            }
        }

        const options = {
            mediaType: 'photo',
            maxWidth: 600,
            maxHeight: 600,
            quality: 0.4,
            saveToPhotos: true,
            cameraType: which === 'selfie' ? 'front' : 'back',
        };

        launchCamera(options, (response) => {
            if (response.didCancel) {
                return;
            } else if (response.errorCode) {
                console.warn('Camera error', response.errorMessage || response.errorCode);
                Alert.alert('Error', 'Camera error: ' + (response.errorMessage || response.errorCode));
                return;
            } else {
                const asset = response.assets && response.assets[0];
                if (!asset) {
                    Alert.alert('Error', 'No image captured');
                    return;
                }
                const file = {
                    uri: asset.uri,
                    name: asset.fileName || `${which}_${Date.now()}.jpg`,
                    type: asset.type || 'image/jpeg',
                    fileSize: asset.fileSize || 0,
                };
                console.log('Captured image from camera:', file, 'Size:', (file.fileSize / 1024 / 1024).toFixed(2), 'MB');
                if (which === 'odometer') setOdometerImage(file);
                else setSelfieImage(file);
            }
        });
    };

    // Prepare file for FormData
    const prepareFileForForm = (file) => {
        if (!file || !file.uri) {
            console.warn('Invalid file object:', file);
            return null;
        }
        let uri = file.uri;
        if (Platform.OS === 'android' && !uri.startsWith('file://') && !uri.startsWith('content://')) {
            uri = `file://${uri}`;
        }
        const fileObj = {
            uri,
            name: file.name || `photo_${Date.now()}.jpg`,
            type: file.type || 'image/jpeg',
        };
        console.log('Prepared file for FormData:', fileObj, 'Size:', (file.fileSize / 1024 / 1024).toFixed(2), 'MB'); // Debug size
        return fileObj;
    };

    // Form validation
    const isFormComplete = () => {
        if (!logType || !latitude || !longitude) return false;
        if (isFieldEmployee) {
            return !!(odometerImage && selfieImage);
        }
        return true;
    };

    // Submit handler
    const handleSubmit = async () => {
        if (!isFormComplete()) {
            if (isFieldEmployee) {
                Alert.alert('Incomplete', 'Odometer and selfie images are required for Field Employee.');
            } else {
                Alert.alert('Incomplete', 'Please fill all required fields.');
            }
            return;
        }

        setLoading(true);
        try {
            const hasImages = isFieldEmployee && odometerImage && selfieImage;
            console.log('Submitting with:', { logType, latitude, longitude, isFieldEmployee, hasImages, odometerImage, selfieImage }); // Debug

            if (hasImages) {
                const formData = new FormData();
                formData.append('log_type', logType);
                formData.append('latitude', latitude);
                formData.append('longitude', longitude);
                if (employeeId) formData.append('employee_id', employeeId);

                const odometerFile = prepareFileForForm(odometerImage);
                const selfFile = prepareFileForForm(selfieImage);

                if (!odometerFile || !selfFile) {
                    Alert.alert('Error', 'Failed to prepare one or both images.');
                    setLoading(false);
                    return;
                }

                // IMPORTANT: use field names expected by server (match Postman)
                formData.append('odometer_file', odometerFile);
                formData.append('self_file', selfFile);

                // Debug print of FormData parts (RN keeps parts in _parts)
                if (formData._parts) {
                    console.log('FormData parts:');
                    formData._parts.forEach((p) => console.log(p));
                }

                const response = await axiosInstance.post(
                    '/cowberry_app.api.employee_checkin.create_employee_checkin',
                    formData
                ); // Do NOT override headers — let axios set multipart boundary

                console.log('Response (form):', response.data);
            } else {
                const body = {
                    log_type: logType,
                    latitude: latitude,
                    longitude: longitude,
                    employee_id: employeeId || undefined,
                };

                const response = await axiosInstance.post(
                    '/cowberry_app.api.employee_checkin.create_employee_checkin',
                    body
                );

                console.log('Response (json):', response.data);
            }

            // --- replace the success + tracking + reset section with this ---
Alert.alert('Success', 'Check-in recorded successfully');

// Decide tracking based on logType (IN / OUT) for Field Employee only
if (isFieldEmployee) {
  if (logType === 'IN') {
    try {
      await handleStartTracking();
      console.log('Started tracking for Field Employee after IN');
    } catch (e) {
      console.warn('Start tracking from submit failed', e);
    }
  } else if (logType === 'OUT') {
    try {
      // pass silent = true so user doesn't get extra alert (optional)
      await handleStopTracking(true);
      console.log('Stopped tracking for Field Employee after OUT');
    } catch (e) {
      console.warn('Stop tracking from submit failed', e);
    }
  } else {
    console.log('Unknown logType, skipping native tracking change:', logType);
  }
} else {
  console.log('Not Field Employee — skipping native tracking.');
}

// Reset form (unchanged)
setLogType('');
setLatitude('');
setLongitude('');
setOdometerImage(null);
setSelfieImage(null);

        } catch (error) {
            console.error('Check-in error:', error.response?.data || error.message);
            Alert.alert('Error', error.response?.data?.exception || 'Failed to record check-in');
        } finally {
            setLoading(false);
        }
    };

    const handleStartTracking = async () => {
        if (!isFieldEmployee) {
            console.log('Skipping startNativeTracking: user not Field Employee');
            return false;
        }

        const sid = await AsyncStorage.getItem('sid');
        if (sid && LocationServiceBridge && typeof LocationServiceBridge.setSessionCookie === 'function') {
            try {
                await LocationServiceBridge.setSessionCookie(sid);
                console.log('DBG: setSessionCookie succeeded');
            } catch (e) {
                console.warn('setSessionCookie err', e);
            }
        } else {
            console.warn('DBG: setSessionCookie not available on native bridge or sid missing');
        }

        if (LocationServiceBridge && typeof LocationServiceBridge.enableNetworkPosting === 'function') {
            try {
                LocationServiceBridge.enableNetworkPosting();
                console.log('DBG: enableNetworkPosting called');
            } catch (e) {
                console.warn('enableNetworkPosting failed', e);
            }
        }

        await new Promise(res => setTimeout(res, 150));

        try {
            const started = startNativeTracking(5);
            if (started) setTracking(true);
            else setTracking(!!started);
            return !!started;
        } catch (err) {
            console.error('Start native tracking error:', err);
            return false;
        }
    };

    const handleStopTracking = async (silent = false) => {
        if (!isFieldEmployee) {
            console.log('Skipping stopNativeTracking: user not Field Employee');
            if (!silent) Alert.alert('Tracking', 'Not a Field Employee — tracking not applicable.');
            return false;
        }

        if (!tracking) {
            if (!silent) Alert.alert('Tracking', 'Tracking is not running');
            return false;
        }
        try {
            stopNativeTracking();
            if (LocationServiceBridge && typeof LocationServiceBridge.disableNetworkPosting === 'function') {
                try {
                    LocationServiceBridge.disableNetworkPosting();
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
        <ScrollView>
            <View style={styles.container}>
                <Text style={styles.title}>Employee CheckIn</Text>

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

                {/* Image fields (only for Field Employee) */}
                {isFieldEmployee && (
                    <>
                        <Text style={[styles.label, { marginTop: 8 }]}>Odometer Image</Text>
                        <TouchableOpacity
                            style={styles.imagePicker}
                            onPress={() => openCameraFor('odometer')}
                        >
                            {odometerImage ? (
                                <Image source={{ uri: odometerImage.uri }} style={styles.preview} />
                            ) : (
                                <View style={styles.imagePlaceholder}>
                                    <Ionicons name="image-outline" size={28} />
                                    <Text style={{ marginTop: 6 }}>Tap to take odometer photo</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <Text style={[styles.label, { marginTop: 10 }]}>Selfie Image</Text>
                        <TouchableOpacity
                            style={styles.imagePicker}
                            onPress={() => openCameraFor('selfie')}
                        >
                            {selfieImage ? (
                                <Image source={{ uri: selfieImage.uri }} style={styles.preview} />
                            ) : (
                                <View style={styles.imagePlaceholder}>
                                    <Ionicons name="image-outline" size={28} />
                                    <Text style={{ marginTop: 6 }}>Tap to take selfie photo</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </>
                )}

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
                        { backgroundColor: isFormComplete() ? '#377355' : '#aaa' },
                    ]}
                    onPress={handleSubmit}
                    disabled={!isFormComplete() || loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Save</Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: '#fff',
        minHeight: '100%',
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 12,
    },
    label: {
        fontSize: 14,
        marginBottom: 6,
    },
    dropdown: {
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 12,
        borderRadius: 6,
    },
    dropdownText: {
        color: '#333',
    },
    dropdownOptions: {
        borderWidth: 1,
        borderColor: '#ddd',
        marginTop: 6,
        borderRadius: 6,
        overflow: 'hidden',
    },
    dropdownOption: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    coordRow: {
        flexDirection: 'row',
        marginTop: 12,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 10,
        borderRadius: 6,
    },
    imagePicker: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 6,
        height: 140,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 6,
    },
    imagePlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    preview: {
        width: '100%',
        height: '100%',
        borderRadius: 6,
        resizeMode: 'cover',
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
    },
    smallIconButton: {
        width: 40,
        height: 40,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#ddd',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    fetchLabel: {
        fontSize: 14,
    },
    button: {
        padding: 14,
        borderRadius: 8,
        marginTop: 18,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
    },
});

export default EmployeeCheckinForm;
