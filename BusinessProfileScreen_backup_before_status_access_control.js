import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Image,
  Platform,
  Alert,
  Dimensions,
  ActivityIndicator,
  ToastAndroid,
  ScrollView,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from './supabaseClient';
import { getSession } from './Auth';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
// Conditional imports for native modules to avoid errors
let Location, MapView, Marker;
try {
  Location = require('expo-location');
} catch (error) {
  console.log('ExpoLocation not available:', error);
  Location = null;
}

try {
  const MapViewModule = require('react-native-maps');
  MapView = MapViewModule.default;
  Marker = MapViewModule.Marker;
} catch (error) {
  console.log('MapView not available:', error);
  MapView = null;
  Marker = null;
}

const { width, height } = Dimensions.get('window');

const BusinessProfileScreen = ({ navigation, route }) => {
  // State for user data
  const [userId, setUserId] = useState(null);
  const [profileId, setProfileId] = useState(null);
  const [businessId, setBusinessId] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // State for business profile data
  const [businessName, setBusinessName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [industry, setIndustry] = useState('');
  const [logoImage, setLogoImage] = useState(null);
  const [logoBackgroundColor, setLogoBackgroundColor] = useState('#000000');
  const [businessPhotos, setBusinessPhotos] = useState([]);
  
  // State for business employees
  const [employees, setEmployees] = useState([]);
  const [currentUserFullName, setCurrentUserFullName] = useState('');
  const [currentUserPhoneNumber, setCurrentUserPhoneNumber] = useState('');
  const [currentPlanInfo, setCurrentPlanInfo] = useState({
    limit: Infinity,
    overageRate: null,
    featureName: 'Employee Accounts',
    basePlanLimit: Infinity,
    currentPlanId: null,
    currentMonthlyPrice: 0,
  });
  const [availablePlans, setAvailablePlans] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);

  // State for contact information
  const [phone, setPhone] = useState('(   )    -    ');
  const [phoneSelection, setPhoneSelection] = useState({ start: 1, end: 1 });
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [locationType, setLocationType] = useState('');
  
  // State for coverage area
  const [coverageType, setCoverageType] = useState('');
  const [coverageDetails, setCoverageDetails] = useState('');
  const [coverageRadius, setCoverageRadius] = useState('10');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for location
  const [location, setLocation] = useState(null);
  const [mapRegion, setMapRegion] = useState(null);
  
  // State for hours of operation
  const [hours, setHours] = useState([
    { day: 'Monday', open: '', close: '', isClosed: false, is24Hours: false },
    { day: 'Tuesday', open: '', close: '', isClosed: false, is24Hours: false },
    { day: 'Wednesday', open: '', close: '', isClosed: false, is24Hours: false },
    { day: 'Thursday', open: '', close: '', isClosed: false, is24Hours: false },
    { day: 'Friday', open: '', close: '', isClosed: false, is24Hours: false },
    { day: 'Saturday', open: '', close: '', isClosed: false, is24Hours: false },
    { day: 'Sunday', open: '', close: '', isClosed: false, is24Hours: false },
  ]);

  // Initialize employees when user data is available
  useEffect(() => {
    if (currentUserFullName && currentUserPhoneNumber && employees.length === 0) {
      console.log('BusinessProfileScreen: Initializing employees with current user');
      initializeEmployees();
    }
  }, [currentUserFullName, currentUserPhoneNumber]);

  // Effect to fetch subscription details and employee limits
  useEffect(() => {
    const fetchSubscriptionAndLimits = async () => {
      let planIdForFeatures = null;
      let currentSubscriptionDetails = null;
      const currentBusinessIdFromState = businessId;
      const selectedPlanIdFromRoute = route.params?.selectedPlanId;
      const isNewSubFromRoute = route.params?.isNewSubscription;

      if (currentBusinessIdFromState) {
        console.log('Employee Counter (Update/Existing): Fetching subscription for businessId:', currentBusinessIdFromState);
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('business_subscriptions')
          .select(
            `subscription_id,
            plan_id, 
            a_la_carte_employee_quantity, 
            total_employee_quantity,
            billing_cycle,
            next_billing_date,
            annual_months_remaining,
            plans ( name, monthly_price )`
          )
          .eq('business_id', currentBusinessIdFromState)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (subscriptionError && subscriptionError.code !== 'PGRST116') {
          console.error('Employee Counter (Update/Existing): Error fetching business subscription:', subscriptionError);
        } else if (subscriptionData) {
          currentSubscriptionDetails = subscriptionData;
          planIdForFeatures = subscriptionData.plan_id;
          setCurrentSubscription(subscriptionData);
        } else {
          console.log('Employee Counter (Update/Existing): No active subscription found for businessId:', currentBusinessIdFromState);
        }
      } else if (isNewSubFromRoute && selectedPlanIdFromRoute) {
        console.log('Employee Counter (New Profile): Using selectedPlanId from route params:', selectedPlanIdFromRoute);
        planIdForFeatures = selectedPlanIdFromRoute;
        const { data: newPlanData, error: newPlanError } = await supabase
          .from('plans')
          .select('name, monthly_price')
          .eq('plan_id', selectedPlanIdFromRoute)
          .single();
        if (newPlanError) console.error("Error fetching new plan details:", newPlanError);
        else if (newPlanData) currentSubscriptionDetails = { plan_id: selectedPlanIdFromRoute, plans: newPlanData, a_la_carte_employee_quantity: 0, total_employee_quantity: 0 };
      }

      if (!planIdForFeatures) {
        console.log('Employee Counter: No plan_id determined. Defaulting limits.');
        setCurrentPlanInfo({ limit: Infinity, basePlanLimit: Infinity, overageRate: null, featureName: 'Employee Accounts', currentPlanId: null, currentMonthlyPrice: 0 });
        return;
      }

      console.log('Employee Counter: Fetching plan features for plan_id:', planIdForFeatures);
      try {
        const { data: featureData, error: featureError } = await supabase
          .from('plan_features')
          .select('feature_value, overage_rate, feature_name')
          .eq('plan_id', planIdForFeatures)
          .eq('feature_name', 'Employee Accounts')
          .single();

        let baseLimit = Infinity;
        let overageRate = null;
        let featureName = 'Employee Accounts';
        let currentPlanId = planIdForFeatures;
        let currentMonthlyPrice = currentSubscriptionDetails?.plans?.monthly_price || 0;

        if (featureError) {
          console.error('Employee Counter: Error fetching plan features for plan_id', planIdForFeatures, 'Error:', featureError);
        } else if (featureData) {
          const parsedLimit = parseInt(featureData.feature_value, 10);
          baseLimit = !isNaN(parsedLimit) ? parsedLimit : Infinity;
          overageRate = featureData.overage_rate;
          featureName = featureData.feature_name || 'Employee Accounts';
        } else {
          console.log('Employee Counter: Employee Accounts feature not found for plan_id:', planIdForFeatures);
        }
        
        let finalLimit = baseLimit;
        if (currentSubscriptionDetails && currentSubscriptionDetails.total_employee_quantity != null && currentSubscriptionDetails.total_employee_quantity > 0) {
            finalLimit = currentSubscriptionDetails.total_employee_quantity;
        } else if (currentSubscriptionDetails && currentSubscriptionDetails.a_la_carte_employee_quantity != null) {
            finalLimit = baseLimit + (currentSubscriptionDetails.a_la_carte_employee_quantity || 0);
        }

        setCurrentPlanInfo({
          limit: finalLimit,
          basePlanLimit: baseLimit,
          overageRate: overageRate,
          featureName: featureName,
          currentPlanId: currentPlanId,
          currentMonthlyPrice: currentMonthlyPrice,
        });
        console.log('Employee Counter: Fetched plan info:', { limit: finalLimit, basePlanLimit: baseLimit, overageRate: overageRate, currentPlanId, currentMonthlyPrice });

      } catch (error) {
        console.error('Employee Counter: Error in feature fetching try-catch for plan_id', planIdForFeatures, 'Error:', error);
        setCurrentPlanInfo({ limit: Infinity, basePlanLimit: Infinity, overageRate: null, featureName: 'Employee Accounts', currentPlanId: null, currentMonthlyPrice: 0 });
      }
    };
    
    const fetchAvailablePlans = async () => {
      const { data: plansData, error: plansError } = await supabase
        .from('plans')
        .select(
          `plan_id, 
          name, 
          monthly_price, 
          yearly_price, 
          description,
          plan_features (feature_name, feature_value)`
        )
        .eq('is_active', true)
        .order('monthly_price', { ascending: true });

      if (plansError) {
        console.error('Error fetching available plans with features:', plansError);
        setAvailablePlans([]);
      } else if (plansData) {
        const formattedPlans = plansData.map(plan => ({
          id: plan.plan_id,
          name: plan.name,
          price: {
            monthly: plan.monthly_price,
            yearly: plan.yearly_price,
          },
          description: plan.description || '',
          features: plan.plan_features.map(f => `${f.feature_name}: ${f.feature_value}`),
          cta: "Select Plan",
        }));
        setAvailablePlans(formattedPlans);
      } else {
        setAvailablePlans([]);
      }
    };

    if (userId) {
      fetchSubscriptionAndLimits();
      fetchAvailablePlans();
    }
  }, [userId, businessId, route.params?.selectedPlanId, route.params?.isNewSubscription]);

  // Callback for BusinessEmployeeScreen to update employees state
  const handleEmployeesUpdate = (updatedEmployees) => {
    setEmployees(updatedEmployees);
  };

  // Callback for BusinessEmployeeScreen to update plan info state
  const handlePlanInfoUpdate = (updatedPlanInfo) => {
    setCurrentPlanInfo(updatedPlanInfo);
  };

  // Fetch user session and profile data on component mount
  useEffect(() => {
    const fetchUserAndProfile = async () => {
      try {
        setLoading(true);
        
        const session = await getSession();
        if (!session) {
          console.log('No active session found');
          setLoading(false);
          return;
        }
        
        const currentUserId = session.user.id;
        setUserId(currentUserId);
        
        const { data: userData, error: userError } = await supabase
          .from('user_profiles')
          .select('full_name, user_phone_number')
          .eq('user_id', currentUserId)
          .single();
          
        if (userError && userError.code !== 'PGRST116') console.error('Error fetching user data:', userError);
        
        if (userData) {
          setCurrentUserFullName(userData.full_name || '');
          setCurrentUserPhoneNumber(userData.user_phone_number || '');
        } else if (session.user.user_metadata) {
          setCurrentUserFullName(session.user.user_metadata.full_name || '');
          setCurrentUserPhoneNumber(session.user.phone || session.user.user_metadata.phone_number || '');
        }
        
        const { data: profileData, error: profileError } = await supabase
          .from('business_profiles')
          .select('*')
          .eq('user_id', currentUserId)
          .single();
        
        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching business profile:', profileError);
        }
        
        let userPhone = null;
        if (session.user.phone) {
          userPhone = session.user.phone;
        } else if (session.user.user_metadata && session.user.user_metadata.phone) {
          userPhone = session.user.user_metadata.phone;
        }
        
        let masterNeo4jBusinessId = null;
        if (userPhone) {
          console.log('Checking master_neo4j table for user phone:', userPhone);
          
          const { data: masterNeo4jData, error: masterNeo4jError } = await supabase
            .from('master_neo4j')
            .select('business_id')
            .eq('user_phone_number', userPhone)
            .maybeSingle(); 
          
          if (masterNeo4jError) {
            console.error('Error fetching from master_neo4j:', masterNeo4jError);
          } else if (masterNeo4jData && masterNeo4jData.business_id) {
            console.log('Found business_id in master_neo4j:', masterNeo4jData.business_id);
            masterNeo4jBusinessId = masterNeo4jData.business_id;
          }
        }
        
        if (profileData) {
          setProfileId(profileData.id);
          if (profileData.business_id) {
            setBusinessId(profileData.business_id);
            console.log('Found existing business ID in profile:', profileData.business_id);
          } 
          else if (masterNeo4jBusinessId) {
            setBusinessId(masterNeo4jBusinessId);
            console.log('Using business ID from master_neo4j:', masterNeo4jBusinessId);
          }
          else {
            console.log('No business_id found in profile or master_neo4j, navigating to BusinessPricing');
            navigation.navigate('BusinessPricing');
            return; 
          }
          setBusinessName(profileData.business_name || '');
          setBusinessDescription(profileData.description || '');
          setIndustry(profileData.industry || '');
          setPhone(profileData.phone || '');
          setEmail(profileData.contact_email || '');
          setWebsite(profileData.website || '');
          setAddress(profileData.address || '');
          setCity(profileData.city || '');
          setState(profileData.state || '');
          setZipCode(profileData.zip_code || '');
          setLocationType(profileData.location_type || '');
          setCoverageType(profileData.coverage_type || '');
          setCoverageDetails(profileData.coverage_details || '');
          setCoverageRadius(profileData.coverage_radius ? profileData.coverage_radius.toString() : '10');
          
          if (profileData.image_url) {
            setLogoImage(profileData.image_url);
          }
          
          if (profileData.business_photos && Array.isArray(profileData.business_photos)) {
            setBusinessPhotos(profileData.business_photos);
          }
          
          if (profileData.hours && typeof profileData.hours === 'object') {
            setHours(profileData.hours);
          }
          
          // Geocode address for map
          if (profileData.address && profileData.city && profileData.state) {
            geocodeAddress(`${profileData.address}, ${profileData.city}, ${profileData.state} ${profileData.zip_code}`);
          }
          
          if (profileData.business_id) {
            fetchBusinessEmployees(profileData.business_id);
          } else {
            console.log('No business ID found after profile check, initializing with current user');
            initializeEmployees();
          }
        } else {
          if (masterNeo4jBusinessId) {
            setBusinessId(masterNeo4jBusinessId);
            console.log('No profile, but using business_id from master_neo4j:', masterNeo4jBusinessId);
            fetchBusinessEmployees(masterNeo4jBusinessId);
          } else {
            console.log('No business profile and no business_id in master_neo4j, navigating to BusinessPricing');
            navigation.navigate('BusinessPricing');
            return;
          }
          initializeEmployees();
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error in fetchUserAndProfile:', error);
        setLoading(false);
      }
    };
    
    fetchUserAndProfile();
  }, []);

  // Geocode address for map display
  const geocodeAddress = async (fullAddress) => {
    if (!Location) {
      console.log('Location service not available, skipping geocoding');
      return;
    }
    
    try {
      const geocoded = await Location.geocodeAsync(fullAddress);
      if (geocoded.length > 0) {
        const { latitude, longitude } = geocoded[0];
        setLocation({ latitude, longitude });
        setMapRegion({
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  };
  
  // Initialize employees array with current user's information
  const initializeEmployees = () => {
    if (currentUserFullName && currentUserPhoneNumber) {
      console.log('BusinessProfileScreen: Initializing employees with current user:', currentUserFullName);
      const initialEmp = [
        {
          id: '1', 
          full_name: currentUserFullName, 
          employee_full_name: currentUserFullName, 
          employee_phone_number: currentUserPhoneNumber, 
          business_role: '', 
          business_job_title: '', 
          isCurrentUser: true, 
          phoneSelection: { start: 1, end: 1 },
        }
      ];
      setEmployees(initialEmp);
    } else {
      console.log('BusinessProfileScreen: Missing user information for employee initialization:', { currentUserFullName, currentUserPhoneNumber });
    }
  };
  
  // Fetch business employees from Supabase
  const fetchBusinessEmployees = async (business_id_to_fetch) => {
    if (!business_id_to_fetch) {
      console.log("BusinessProfileScreen: fetchBusinessEmployees called with no business_id, initializing default.");
      initializeEmployees();
      return;
    }
    try {
      const { data, error } = await supabase
        .from('business_employees')
        .select('*')
        .eq('business_id', business_id_to_fetch);
        
      if (error) {
        console.error('BusinessProfileScreen: Error fetching business employees:', error);
        initializeEmployees(); 
        return;
      }
      
      if (data && data.length > 0) {
        const mappedEmployees = data.map(emp => ({
          id: emp.business_employee_id,
          full_name: emp.employee_full_name || emp.full_name || '', 
          employee_full_name: emp.employee_full_name || emp.full_name || '', 
          employee_phone_number: emp.employee_phone_number || '',
          business_role: emp.business_role || '',
          business_job_title: emp.business_job_title || '',
          isCurrentUser: emp.user_id === userId,
          phoneSelection: { start: 1, end: 1 },
        }));
        setEmployees(mappedEmployees);
      } else {
        initializeEmployees();
      }
    } catch (error) {
      console.error('BusinessProfileScreen: Error in fetchBusinessEmployees:', error);
      initializeEmployees(); 
    }
  };

  // Logo picker
  const pickLogo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLogoImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking logo image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // Business photos picker
  const pickBusinessPhotos = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
        allowsMultipleSelection: true,
        selectionLimit: 5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newPhotos = result.assets.map(asset => asset.uri);
        setBusinessPhotos([...businessPhotos, ...newPhotos].slice(0, 5));
      }
    } catch (error) {
      console.error('Error picking business photos:', error);
      Alert.alert('Error', 'Failed to pick images. Please try again.');
    }
  };

  // Remove photo function
  const removePhoto = (index) => {
    const updatedPhotos = [...businessPhotos];
    updatedPhotos.splice(index, 1);
    setBusinessPhotos(updatedPhotos);
  };

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;
    return phoneRegex.test(phone);
  };

  const validateWebsite = (website) => {
    if (!website) return true;
    const urlRegex = /^(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+([/?].*)?$/;
    return urlRegex.test(website);
  };

  // Toast message function
  const showToast = (message, isSuccess = true) => {
    if (Platform.OS === 'android') {
      ToastAndroid.showWithGravity(
        message,
        ToastAndroid.LONG,
        ToastAndroid.BOTTOM
      );
    } else {
      Toast.show({
        type: isSuccess ? 'success' : 'error',
        text1: message,
        position: 'bottom',
        visibilityTime: 3000,
      });
    }
  };

  // Image processing function
  const processImageUrl = async (uri) => {
    if (!uri) {
      return null;
    }
    if (uri.startsWith('data:')) {
      return uri;
    }
    return uri;
  };

  // Form submission handler
  const handleSubmit = async () => {
    console.log('Submit button pressed');
    setIsSubmitting(true);

    try {
      // Validations
      if (!businessName.trim()) {
        Alert.alert('Missing Information', 'Please enter your business name.');
        showToast('Please enter your business name', false);
        throw new Error("Validation: Business name missing");
      }

      if (!businessDescription.trim()) {
        Alert.alert('Missing Information', 'Please enter a description for your business.');
        showToast('Please enter a business description', false);
        throw new Error("Validation: Description missing");
      }

      if (!logoImage) {
        Alert.alert('Missing Logo', 'Please upload a logo for your business.');
        showToast('Please upload a logo', false);
        throw new Error("Validation: Logo missing");
      }

      if (!coverageType) {
        Alert.alert('Missing Coverage Area', 'Please select a coverage type for your business.');
        showToast('Please select a coverage type', false);
        throw new Error("Validation: Coverage type missing");
      }

      if (!phone.trim()) {
        Alert.alert('Missing Contact Information', 'Please enter a phone number for your business.');
        showToast('Please enter a phone number', false);
        throw new Error("Validation: Phone number missing");
      }

      if (!validatePhone(phone)) {
        Alert.alert('Invalid Phone Number', 'Please enter a valid phone number.');
        showToast('Please enter a valid phone number', false);
        throw new Error("Validation: Invalid phone number");
      }

      if (!email.trim()) {
        Alert.alert('Missing Contact Information', 'Please enter an email address for your business.');
        showToast('Please enter an email address', false);
        throw new Error("Validation: Email missing");
      }

      if (!validateEmail(email)) {
        Alert.alert('Invalid Email', 'Please enter a valid email address.');
        showToast('Please enter a valid email address', false);
        throw new Error("Validation: Invalid email");
      }

      if (website && !validateWebsite(website)) {
        Alert.alert('Invalid Website', 'Please enter a valid website URL.');
        showToast('Please enter a valid website URL', false);
        throw new Error("Validation: Invalid website");
      }

      console.log('Form validation passed, proceeding with submission');

      let currentSubmitUserId = userId;
      if (!currentSubmitUserId) {
        const session = await getSession();
        if (!session || !session.user) {
          Alert.alert('Authentication Required', 'Please log in to create/update a business profile.');
          showToast('Authentication required', false);
          throw new Error("Authentication: No session");
        }
        currentSubmitUserId = session.user.id;
      }
      if (!currentSubmitUserId) throw new Error("Authentication: User ID unavailable");

      console.log('User authenticated, currentSubmitUserId:', currentSubmitUserId);

      let processedLogoUrl = logoImage;
      if (logoImage && !logoImage.startsWith('data:') && !logoImage.startsWith('http')) {
        processedLogoUrl = await processImageUrl(logoImage);
      }

      const processedPhotoUrls = await Promise.all(
        businessPhotos.map(uri => (uri && !uri.startsWith('data:') && !uri.startsWith('http')) ? processImageUrl(uri) : uri)
      );

      const profileUpsertData = {
        user_id: currentSubmitUserId,
        business_name: businessName.trim(),
        description: businessDescription.trim(),
        industry: industry.trim(),
        contact_email: email.trim(),
        phone: phone.trim(),
        website: website.trim(),
        image_url: processedLogoUrl,
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        zip_code: zipCode.trim(),
        location_type: locationType,
        coverage_type: coverageType,
        coverage_details: coverageDetails.trim(),
        coverage_radius: coverageRadius ? parseFloat(coverageRadius) : null,
        business_photos: processedPhotoUrls,
        hours: hours,
        updated_at: new Date(),
      };

      if (businessId) {
        profileUpsertData.business_id = businessId;
      }

      console.log('Upserting profile data:', JSON.stringify(profileUpsertData));

      const { data: upsertedProfile, error: upsertError } = await supabase
        .from('business_profiles')
        .upsert(profileUpsertData, {
          onConflict: businessId ? 'business_id' : 'user_id',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (upsertError) throw upsertError;
      if (!upsertedProfile) throw new Error('Profile upsert failed to return data.');

      console.log('Profile saved successfully:', upsertedProfile);

      const currentBusinessIdFromResult = upsertedProfile.business_id;
      if (!businessId && currentBusinessIdFromResult) setBusinessId(currentBusinessIdFromResult);
      if (!profileId && upsertedProfile.id) setProfileId(upsertedProfile.id);

      await saveBusinessEmployees(currentBusinessIdFromResult);

      showToast('Profile saved successfully!', true);
      Alert.alert(
        'Profile Saved',
        `Your business profile has been ${profileId || businessId ? 'updated' : 'created'} successfully!`,
        [{ text: 'OK', onPress: () => navigation.navigate('MainApp') }]
      );

    } catch (error) {
      console.error('Error in handleSubmit during submission process:', error.message);
      if (!error.message.startsWith("Validation:") && !error.message.startsWith("Authentication:") && error.message !== "User cancelled employee overage") {
        Alert.alert('Submission Error', `An error occurred: ${error.message || 'Please try again.'}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save business employees
  const saveBusinessEmployees = async (businessIdValue) => {
    try {
      if (!businessIdValue) {
        console.error('No
