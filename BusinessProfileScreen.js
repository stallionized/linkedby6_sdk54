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
  Modal,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from './supabaseClient';
import { getSession } from './Auth';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import BusinessProfileInterviewChat from './components/BusinessProfileInterviewChat';
import { searchIndustries } from './utils/industryData';
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
  const [initialBusinessStatus, setInitialBusinessStatus] = useState(null);

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
  
  // State for AI Assistant (replaced with targeted helpers)
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [showSmartToolsMenu, setShowSmartToolsMenu] = useState(false);

  // State for industry autocomplete
  const [industrySuggestions, setIndustrySuggestions] = useState([]);
  const [showIndustrySuggestions, setShowIndustrySuggestions] = useState(false);

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

  // Reusable function to load business profile data
  const loadBusinessProfile = async () => {
    try {
      const session = await getSession();
      if (!session) {
        console.log('No active session found');
        return;
      }

      const currentUserId = session.user.id;

      // Fetch business profile
      const { data: profileData, error: profileError } = await supabase
        .from('business_profiles')
        .select('*, business_status, is_active')
        .eq('user_id', currentUserId)
        .single();

      if (profileError || !profileData) {
        console.error('Error fetching business profile:', profileError);
        return;
      }

      // Update all form fields with profile data
      setProfileId(profileData.id);
      setInitialBusinessStatus(profileData.business_status);

      if (profileData.business_id) {
        setBusinessId(profileData.business_id);
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
      }

      console.log('Business profile loaded successfully');
    } catch (error) {
      console.error('Error loading business profile:', error);
    }
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
        
        // Check business profile with status information
        const { data: profileData, error: profileError } = await supabase
          .from('business_profiles')
          .select('*, business_status, is_active')
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
          
          // Check business profile status
          const businessStatus = profileData.business_status;
          const isActive = profileData.is_active;

          console.log('Business profile status check:', { businessStatus, isActive });

          // Store initial business status to track if we're completing an incomplete profile
          setInitialBusinessStatus(businessStatus);

          // Allow user to complete profile regardless of status
          // This screen is used both for setup (Incomplete status) and editing (Active status)
          if (businessStatus === 'Incomplete') {
            console.log('Business profile has Incomplete status. User needs to complete required fields.');
          } else if (businessStatus === 'Active') {
            console.log('Business profile is Active. User can edit their profile.');
          } else {
            console.log('Business profile has status:', businessStatus);
          }
          
          if (profileData.business_id) {
            setBusinessId(profileData.business_id);
            console.log('Found existing business ID in profile:', profileData.business_id);
          } 
          else {
            console.log('No business_id found in profile, navigating to BusinessPricing');
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
          console.log('No business profile found, navigating to BusinessPricing');
          navigation.navigate('BusinessPricing');
          return;
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

  // Handle industry input changes with autocomplete
  const handleIndustryChange = (text) => {
    setIndustry(text);

    if (text.trim().length >= 2) {
      const suggestions = searchIndustries(text);
      setIndustrySuggestions(suggestions);
      setShowIndustrySuggestions(suggestions.length > 0);
    } else {
      setIndustrySuggestions([]);
      setShowIndustrySuggestions(false);
    }
  };

  const selectIndustrySuggestion = (selectedIndustry) => {
    setIndustry(selectedIndustry);
    setShowIndustrySuggestions(false);
    setIndustrySuggestions([]);
  };

  // AI-powered business description generator
  const generateBusinessDescription = async () => {
    if (!businessName || !industry) {
      Alert.alert(
        'Missing Information',
        'Please enter your business name and industry first to generate a description.'
      );
      return;
    }

    try {
      setIsGeneratingDescription(true);

      const { data, error } = await supabase.functions.invoke('generate_business_description', {
        body: {
          businessName,
          industry,
          existingDescription: businessDescription || null,
        },
      });

      if (error) throw error;

      if (data && data.description) {
        setBusinessDescription(data.description);
        Alert.alert(
          'Description Generated!',
          'AI has generated a professional business description. You can edit it as needed.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error generating description:', error);
      Alert.alert(
        'Generation Failed',
        'Failed to generate description. Please try again or write it manually.'
      );
    } finally {
      setIsGeneratingDescription(false);
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

  // Validate all required fields and provide detailed feedback
  const validateForm = () => {
    const errors = [];

    // Required fields validation
    if (!businessName.trim()) {
      errors.push('• Business Name is required');
    }

    if (!industry.trim()) {
      errors.push('• Industry is required');
    }

    if (!businessDescription.trim()) {
      errors.push('• Business Description is required');
    }

    if (!phone.trim()) {
      errors.push('• Phone Number is required');
    } else if (!validatePhone(phone)) {
      errors.push('• Phone Number is invalid');
    }

    if (!email.trim()) {
      errors.push('• Email Address is required');
    } else if (!validateEmail(email)) {
      errors.push('• Email Address is invalid');
    }

    if (!city.trim()) {
      errors.push('• City is required');
    }

    if (!state.trim()) {
      errors.push('• State is required');
    }

    if (!locationType) {
      errors.push('• Location Type is required (Storefront, Office, or No Physical Location)');
    }

    if (!coverageType) {
      errors.push('• Coverage Area is required');
    }

    // Optional field validations
    if (website && !validateWebsite(website)) {
      errors.push('• Website URL is invalid');
    }

    return errors;
  };

  // Form submission handler
  const handleSubmit = async () => {
    console.log('Submit button pressed');
    setIsSubmitting(true);

    try {
      // Validate all fields
      const validationErrors = validateForm();

      if (validationErrors.length > 0) {
        const errorMessage = validationErrors.join('\n');
        Alert.alert(
          'Please Complete Required Fields',
          errorMessage,
          [{ text: 'OK' }]
        );
        showToast('Please complete all required fields', false);
        throw new Error("Validation: Missing required fields");
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
        business_status: 'Active', // Set status to Active when profile is completed
        is_active: true, // Activate the profile
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

      // Trigger AI enrichment and embeddings generation
      console.log('Triggering business profile enrichment...');
      try {
        const { data: enrichData, error: enrichError } = await supabase.functions.invoke('enrich_business_profile', {
          body: {
            business_id: currentBusinessIdFromResult,
            business_data: {
              business_name: businessName.trim(),
              industry: industry.trim(),
              description: businessDescription.trim(),
              city: city.trim(),
              state: state.trim(),
              zip_code: zipCode.trim(),
              coverage_type: coverageType,
              coverage_radius: coverageRadius ? parseFloat(coverageRadius) : null,
              service_areas: coverageDetails ? [coverageDetails] : [],
            },
          },
        });

        if (enrichError) {
          console.error('Enrichment error:', enrichError);
          // Don't fail the whole save if enrichment fails - it can be regenerated later
        } else {
          console.log('Business profile enriched successfully:', enrichData);
        }
      } catch (enrichmentError) {
        console.error('Failed to trigger enrichment:', enrichmentError);
        // Continue - enrichment is a non-critical enhancement
      }

      // Check if this was completing an incomplete profile (changing from Incomplete to Active)
      const wasIncomplete = initialBusinessStatus === 'Incomplete';
      const successMessage = wasIncomplete
        ? 'Your business profile has been activated and enriched with AI!'
        : 'Profile updated and enriched successfully!';

      showToast(successMessage, true);
      Alert.alert(
        wasIncomplete ? 'Business Profile Activated!' : 'Profile Saved',
        wasIncomplete
          ? 'Your business profile has been activated! You can now access business mode.'
          : `Your business profile has been updated successfully!`,
        [{
          text: 'OK',
          onPress: () => {
            // If profile was just completed from Incomplete, navigate to business mode
            if (wasIncomplete) {
              navigation.navigate('BusinessAnalytics');
            } else {
              navigation.goBack();
            }
          }
        }]
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
        console.error('No business ID available for saving employees');
        return;
      }

      console.log('Saving business employees with business ID:', businessIdValue);

      const employeesData = employees.map(emp => ({
        business_id: businessIdValue,
        business_name: businessName,
        employee_full_name: emp.full_name.trim(),
        employee_phone_number: emp.employee_phone_number.trim(),
        business_role: emp.business_role.trim(),
        business_job_title: emp.business_job_title.trim(),
        user_id: emp.isCurrentUser ? userId : null,
      }));

      console.log('Prepared employee data:', JSON.stringify(employeesData));

      const { error: deleteError } = await supabase
        .from('business_employees')
        .delete()
        .eq('business_id', businessIdValue);

      if (deleteError) {
        console.error('Error deleting existing employees:', deleteError);
        throw deleteError;
      }

      const { data, error } = await supabase
        .from('business_employees')
        .insert(employeesData)
        .select();

      if (error) {
        console.error('Error inserting employee data:', error);
        throw error;
      }

      console.log('Business employees saved successfully:', data);
      return data;
    } catch (error) {
      console.error('Error in saveBusinessEmployees:', error);
      showToast(`Failed to save employee data: ${error.message}`, false);
      return null;
    }
  };

  // Update hours function
  const handleHourChange = (index, field, value) => {
    const newHours = [...hours];
    newHours[index][field] = value;
    setHours(newHours);
  };

  // Toggle closed status for a day
  const toggleDayClosed = (index) => {
    const newHours = [...hours];
    newHours[index].isClosed = !newHours[index].isClosed;
    if (newHours[index].isClosed) {
      newHours[index].open = '';
      newHours[index].close = '';
      newHours[index].is24Hours = false;
    }
    setHours(newHours);
  };

  // Toggle 24 hours status for a day
  const toggle24Hours = (index) => {
    const newHours = [...hours];
    newHours[index].is24Hours = !newHours[index].is24Hours;
    if (newHours[index].is24Hours) {
      newHours[index].open = '12:00 AM';
      newHours[index].close = '11:59 PM';
    } else {
      newHours[index].open = '';
      newHours[index].close = '';
    }
    setHours(newHours);
  };

  // Phone number formatting
  const formatPhone = (text) => {
    const cursorPosition = phoneSelection.start;
    const prevPhone = phone;
    
    const specialPositions = [0, 4, 5, 9];
    const digitSlots = [1, 2, 3, 6, 7, 8, 10, 11, 12, 13];
    
    const isBackspaceAtSpecial = 
      text.length < prevPhone.length && 
      specialPositions.includes(cursorPosition);
    
    if (isBackspaceAtSpecial) {
      const prevDigitPos = Math.max(...digitSlots.filter(pos => pos < cursorPosition));
      
      let newPhoneChars = prevPhone.split('');
      newPhoneChars[prevDigitPos] = ' ';
      
      const digits = newPhoneChars.join('').replace(/\D/g, '');
      
      let masked = '(   )    -    '.split('');
      for (let i = 0; i < digits.length; i++) {
        masked[digitSlots[i]] = digits[i];
      }
      
      setPhone(masked.join(''));
      setPhoneSelection({ start: prevDigitPos, end: prevDigitPos });
      return;
    }
    
    const digits = text.replace(/\D/g, '').slice(0, 10);
    
    let masked = '(   )    -    '.split('');
    
    for (let i = 0; i < digits.length; i++) {
      masked[digitSlots[i]] = digits[i];
    }
    
    for (let i = digits.length; i < digitSlots.length; i++) {
      masked[digitSlots[i]] = ' ';
    }
    
    setPhone(masked.join(''));
    
    if (digits.length < prevPhone.replace(/\D/g, '').length) {
      if (digits.length > 0) {
        const lastDigitPos = digitSlots[digits.length - 1];
        setPhoneSelection({ start: lastDigitPos + 1, end: lastDigitPos + 1 });
      } else {
        setPhoneSelection({ start: digitSlots[0], end: digitSlots[0] });
      }
    } else {
      if (digits.length > 0) {
        const newPos = digitSlots[digits.length - 1] + 1;
        
        if (newPos === 4) {
          setPhoneSelection({ start: 6, end: 6 });
        } else if (newPos === 9) {
          setPhoneSelection({ start: 10, end: 10 });
        } else {
          setPhoneSelection({ start: newPos, end: newPos });
        }
      } else {
        setPhoneSelection({ start: digitSlots[0], end: digitSlots[0] });
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0D47A1" />
        <Text style={styles.loadingText}>Loading profile data...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />

      {/* Header matching MobileHeader structure */}
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          {/* Left Section - Back Button */}
          <View style={styles.leftSection}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate('Search');
                }
              }}
            >
              <Ionicons name="arrow-back" size={24} color="#1E88E5" />
            </TouchableOpacity>
          </View>

          {/* Center Section - Title */}
          <View style={styles.centerSection}>
            <Text style={styles.headerTitle}>Business Profile</Text>
          </View>

          {/* Right Section - Smart Tools Button */}
          <View style={styles.rightSection}>
            <TouchableOpacity
              style={styles.aiAssistantButton}
              onPress={() => setShowSmartToolsMenu(!showSmartToolsMenu)}
            >
              <Ionicons name="construct" size={24} color="#667eea" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Smart Tools Menu */}
        {showSmartToolsMenu && (
          <View style={styles.smartToolsMenu}>
            <TouchableOpacity
              style={styles.smartToolItem}
              onPress={() => {
                setShowSmartToolsMenu(false);
                generateBusinessDescription();
              }}
              disabled={isGeneratingDescription}
            >
              <Ionicons name="sparkles" size={20} color="#667eea" />
              <Text style={styles.smartToolText}>Generate Business Description</Text>
              {isGeneratingDescription && <ActivityIndicator size="small" color="#667eea" />}
            </TouchableOpacity>
            <View style={styles.smartToolDivider} />
            <TouchableOpacity
              style={styles.smartToolItem}
              onPress={() => {
                setShowSmartToolsMenu(false);
                Alert.alert('Coming Soon', 'Industry suggestions feature is coming soon!');
              }}
            >
              <Ionicons name="bulb-outline" size={20} color="#667eea" />
              <Text style={styles.smartToolText}>Industry Suggestions</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('PlanManagementScreen', {
                initialBusinessId: businessId,
                initialCurrentSubscription: currentSubscription,
                initialAvailablePlans: availablePlans,
                onPlanChangeUpdate: (updatedSubscription) => {
                  setCurrentSubscription(updatedSubscription);
                },
              })}
            >
              <Ionicons name="card-outline" size={20} color="#1E88E5" />
              <Text style={styles.actionButtonText}>Manage Plan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('BusinessEmployeeScreen', {
                businessId: businessId,
                userId: userId,
                currentUserFullName: currentUserFullName,
                currentUserPhoneNumber: currentUserPhoneNumber,
                initialEmployees: employees,
                initialCurrentPlanInfo: currentPlanInfo,
                initialAvailablePlans: availablePlans,
                onEmployeesUpdate: handleEmployeesUpdate,
                onPlanInfoUpdate: handlePlanInfoUpdate,
              })}
            >
              <Ionicons name="person-add-outline" size={20} color="#1E88E5" />
              <Text style={styles.actionButtonText}>Manage Employees</Text>
            </TouchableOpacity>
          </View>

          {/* Logo and Business Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Business Logo</Text>
            <View style={styles.logoContainer}>
              {logoImage ? (
                <View style={styles.logoImageContainer}>
                  <Image source={{ uri: logoImage }} style={styles.logoImage} />
                  <TouchableOpacity
                    style={styles.removeLogoButton}
                    onPress={() => setLogoImage(null)}
                  >
                    <Ionicons name="close" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.logoPlaceholder} onPress={pickLogo}>
                  <Ionicons name="camera" size={40} color="#5C6BC0" />
                  <Text style={styles.logoPlaceholderText}>Upload Logo</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Business Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Business Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Business Name *</Text>
              <TextInput
                style={styles.textInput}
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="Enter your business name"
                placeholderTextColor="#A0A0A0"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Industry *</Text>
              <TextInput
                style={styles.textInput}
                value={industry}
                onChangeText={handleIndustryChange}
                placeholder="e.g. Hair Salon, Plumbing, Restaurant"
                placeholderTextColor="#A0A0A0"
              />

              {/* Industry suggestions dropdown */}
              {showIndustrySuggestions && industrySuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  {industrySuggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionItem}
                      onPress={() => selectIndustrySuggestion(suggestion)}
                    >
                      <Ionicons name="business-outline" size={16} color="#667eea" />
                      <Text style={styles.suggestionText}>{suggestion}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Business Description *</Text>
                <TouchableOpacity
                  style={styles.aiHelperButton}
                  onPress={generateBusinessDescription}
                  disabled={isGeneratingDescription}
                >
                  {isGeneratingDescription ? (
                    <ActivityIndicator size="small" color="#667eea" />
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={16} color="#667eea" />
                      <Text style={styles.aiHelperButtonText}>AI Generate</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={businessDescription}
                onChangeText={setBusinessDescription}
                placeholder="Describe your business, products, and services"
                placeholderTextColor="#A0A0A0"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Coverage Area */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Coverage Area</Text>
            <Text style={styles.helperText}>
              Specify where your business provides services or products
            </Text>
            
            <View style={styles.coverageTypeContainer}>
              {[
                { key: 'local', icon: 'location', label: 'Local' },
                { key: 'regional', icon: 'map', label: 'Regional' },
                { key: 'national', icon: 'flag', label: 'National' }
              ].map((type) => (
                <TouchableOpacity
                  key={type.key}
                  style={[
                    styles.coverageTypeButton,
                    coverageType === type.key && styles.coverageTypeButtonActive
                  ]}
                  onPress={() => setCoverageType(type.key)}
                >
                  <Ionicons
                    name={type.icon}
                    size={24}
                    color={coverageType === type.key ? '#FFFFFF' : '#5C6BC0'}
                  />
                  <Text style={[
                    styles.coverageTypeText,
                    coverageType === type.key && styles.coverageTypeTextActive
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Coverage Details</Text>
              <TextInput
                style={styles.textInput}
                value={coverageDetails}
                onChangeText={setCoverageDetails}
                placeholder={
                  coverageType === 'local' ? "Enter city name or zip code" :
                  coverageType === 'regional' ? "Enter region or state names" :
                  coverageType === 'national' ? "Enter country name" :
                  coverageType === 'international' ? "Enter countries or continents" :
                  "Select a coverage type above first"
                }
                placeholderTextColor="#A0A0A0"
              />
            </View>

            {coverageType === 'local' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Service Radius (miles)</Text>
                <TextInput
                  style={styles.textInput}
                  value={coverageRadius}
                  onChangeText={setCoverageRadius}
                  keyboardType="numeric"
                  placeholder="10"
                  placeholderTextColor="#A0A0A0"
                />
                <View style={styles.radiusButtonsContainer}>
                  {[5, 10, 25, 50, 100].map((radius) => (
                    <TouchableOpacity
                      key={radius}
                      style={[
                        styles.radiusButton,
                        parseInt(coverageRadius) === radius && styles.radiusButtonActive
                      ]}
                      onPress={() => setCoverageRadius(radius.toString())}
                    >
                      <Text style={[
                        styles.radiusButtonText,
                        parseInt(coverageRadius) === radius && styles.radiusButtonTextActive
                      ]}>
                        {radius}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Contact Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number *</Text>
              <TextInput
                style={styles.textInput}
                value={phone}
                onChangeText={formatPhone}
                placeholder="(   )    -    "
                placeholderTextColor="#A0A0A0"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address *</Text>
              <TextInput
                style={styles.textInput}
                value={email}
                onChangeText={setEmail}
                placeholder="business@example.com"
                placeholderTextColor="#A0A0A0"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Website</Text>
              <TextInput
                style={styles.textInput}
                value={website}
                onChangeText={setWebsite}
                placeholder="www.yourbusiness.com"
                placeholderTextColor="#A0A0A0"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Street Address</Text>
              <TextInput
                style={styles.textInput}
                value={address}
                onChangeText={setAddress}
                placeholder="123 Business St"
                placeholderTextColor="#A0A0A0"
              />
            </View>

            <View style={styles.contactRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.inputLabel}>City</Text>
                <TextInput
                  style={styles.textInput}
                  value={city}
                  onChangeText={setCity}
                  placeholder="City"
                  placeholderTextColor="#A0A0A0"
                />
              </View>
              
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>State</Text>
                <TextInput
                  style={styles.textInput}
                  value={state}
                  onChangeText={setState}
                  placeholder="State"
                  placeholderTextColor="#A0A0A0"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Zip Code</Text>
              <TextInput
                style={styles.textInput}
                value={zipCode}
                onChangeText={setZipCode}
                placeholder="12345"
                placeholderTextColor="#A0A0A0"
                keyboardType="numeric"
              />
            </View>

            {/* Location Type */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Business Location Type</Text>
              <View style={styles.locationTypeContainer}>
                {[
                  { key: 'storefront', icon: 'storefront-outline', label: 'Storefront' },
                  { key: 'office', icon: 'business-outline', label: 'Office' },
                  { key: 'not_brick_mortar', icon: 'globe-outline', label: 'Not Brick & Mortar' }
                ].map((type) => (
                  <TouchableOpacity
                    key={type.key}
                    style={[
                      styles.locationTypeButton,
                      locationType === type.key && styles.locationTypeButtonActive
                    ]}
                    onPress={() => setLocationType(type.key)}
                  >
                    <Ionicons
                      name={type.icon}
                      size={24}
                      color={locationType === type.key ? '#FFFFFF' : '#5C6BC0'}
                    />
                    <Text style={[
                      styles.locationTypeText,
                      locationType === type.key && styles.locationTypeTextActive
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Map Preview for physical locations */}
            {(locationType === 'storefront' || locationType === 'office') && 
             address && city && state && zipCode && mapRegion && MapView && (
              <View style={styles.mapContainer}>
                <Text style={styles.inputLabel}>Location Preview</Text>
                <MapView
                  style={styles.map}
                  region={mapRegion}
                  scrollEnabled={false}
                  zoomEnabled={false}
                >
                  {location && Marker && (
                    <Marker
                      coordinate={location}
                      title={businessName}
                      description={`${address}, ${city}, ${state} ${zipCode}`}
                    />
                  )}
                </MapView>
              </View>
            )}
          </View>

          {/* Hours of Operation */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hours of Operation</Text>
            {hours.map((item, index) => (
              <View key={index} style={styles.hourRow}>
                <Text style={styles.hourDay}>{item.day}</Text>
                <View style={styles.hourInputs}>
                  <TextInput
                    style={[
                      styles.hourInput,
                      (item.isClosed || item.is24Hours) && styles.disabledInput
                    ]}
                    value={item.open}
                    onChangeText={(text) => handleHourChange(index, 'open', text)}
                    placeholder="9:00 AM"
                    placeholderTextColor="#A0A0A0"
                    editable={!item.isClosed && !item.is24Hours}
                  />
                  <Text style={styles.hourSeparator}>-</Text>
                  <TextInput
                    style={[
                      styles.hourInput,
                      (item.isClosed || item.is24Hours) && styles.disabledInput
                    ]}
                    value={item.close}
                    onChangeText={(text) => handleHourChange(index, 'close', text)}
                    placeholder="5:00 PM"
                    placeholderTextColor="#A0A0A0"
                    editable={!item.isClosed && !item.is24Hours}
                  />
                </View>
                <View style={styles.hourButtons}>
                  <TouchableOpacity
                    onPress={() => toggle24Hours(index)}
                    style={[
                      styles.hourButton,
                      item.is24Hours ? styles.activeButton : styles.inactiveButton,
                      item.isClosed && styles.disabledButton
                    ]}
                    disabled={item.isClosed}
                  >
                    <Text style={[
                      styles.hourButtonText,
                      item.is24Hours ? styles.activeButtonText : styles.inactiveButtonText
                    ]}>24h</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => toggleDayClosed(index)}
                    style={[
                      styles.hourButton,
                      item.isClosed ? styles.activeButton : styles.inactiveButton
                    ]}
                  >
                    <Text style={[
                      styles.hourButtonText,
                      item.isClosed ? styles.activeButtonText : styles.inactiveButtonText
                    ]}>Closed</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          {/* Business Photos */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Business Photos</Text>
            <Text style={styles.helperText}>
              Upload up to 5 high-quality photos of your business, products, or services
            </Text>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.photoScrollView}
            >
              <View style={styles.photoGrid}>
                {businessPhotos.map((photo, index) => (
                  <View key={index} style={styles.photoContainer}>
                    <Image source={{ uri: photo }} style={styles.photo} />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => removePhoto(index)}
                    >
                      <Ionicons name="close" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
                
                {businessPhotos.length < 5 && (
                  <TouchableOpacity
                    style={styles.addPhotoButton}
                    onPress={pickBusinessPhotos}
                  >
                    <Ionicons name="camera" size={30} color="#5C6BC0" />
                    <Text style={styles.addPhotoButtonText}>Add Photo</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Saving Profile...' : (profileId || businessId ? 'Update Business Profile' : 'Create Business Profile')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* AI Assistant Modal - DEPRECATED: Replaced with targeted AI helpers */}
      {/*
      <Modal
        visible={showAIAssistant}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowAIAssistant(false)}
      >
        <BusinessProfileInterviewChat
          businessId={businessId}
          onComplete={async (result) => {
            setShowAIAssistant(false);
            await loadBusinessProfile();
            Alert.alert(
              'Profile Information Collected!',
              'Your business information has been saved. To complete your profile, please upload a logo and business photos.',
              [
                {
                  text: 'Upload Logo Now',
                  onPress: () => pickLogo(),
                },
                {
                  text: 'Upload Later',
                  style: 'cancel',
                },
              ]
            );
          }}
          onCancel={() => setShowAIAssistant(false)}
        />
      </Modal>
      */}

      <Toast />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#0D47A1',
  },
  // Header styles matching MobileHeader component
  headerContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    height: 62,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E7FF',
    elevation: 2,
    zIndex: 10,
    justifyContent: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0,
    width: 40,
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 0,
    width: 40,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0D47A1',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    marginVertical: 15,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E88E5',
    gap: 8,
  },
  actionButtonText: {
    color: '#1E88E5',
    fontWeight: '600',
    fontSize: 14,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  logoImageContainer: {
    width: 150,
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  removeLogoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPlaceholder: {
    width: 150,
    height: 150,
    backgroundColor: '#F5F7FF',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#5C6BC0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPlaceholderText: {
    color: '#5C6BC0',
    fontSize: 14,
    marginTop: 8,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F5F7FF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  coverageTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 8,
  },
  coverageTypeButton: {
    alignItems: 'center',
    backgroundColor: '#F5F7FF',
    borderWidth: 1,
    borderColor: '#5C6BC0',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 8,
    width: '31%',
    justifyContent: 'center',
    minHeight: 75,
  },
  coverageTypeButtonActive: {
    backgroundColor: '#5C6BC0',
    borderColor: '#3F51B5',
  },
  coverageTypeText: {
    color: '#5C6BC0',
    fontWeight: '500',
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },
  coverageTypeTextActive: {
    color: '#FFFFFF',
  },
  radiusButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 8,
  },
  radiusButton: {
    backgroundColor: '#F5F7FF',
    borderWidth: 1,
    borderColor: '#5C6BC0',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  radiusButtonActive: {
    backgroundColor: '#5C6BC0',
    borderColor: '#3F51B5',
  },
  radiusButtonText: {
    color: '#5C6BC0',
    fontWeight: '500',
    fontSize: 14,
  },
  radiusButtonTextActive: {
    color: '#FFFFFF',
  },
  contactRow: {
    flexDirection: 'row',
  },
  locationTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  locationTypeButton: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#D1D9E6',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 75,
  },
  locationTypeButtonActive: {
    backgroundColor: '#5C6BC0',
    borderColor: '#3F51B5',
  },
  locationTypeText: {
    color: '#5C6BC0',
    fontWeight: '500',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
  },
  locationTypeTextActive: {
    color: '#FFFFFF',
  },
  mapContainer: {
    marginTop: 15,
    marginBottom: 20,
  },
  map: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 8,
  },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  hourDay: {
    width: 80,
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  hourInputs: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  hourInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  disabledInput: {
    backgroundColor: '#E0E0E0',
    color: '#A0A0A0',
  },
  hourSeparator: {
    marginHorizontal: 5,
    fontSize: 14,
    color: '#666',
  },
  hourButtons: {
    flexDirection: 'row',
    gap: 5,
  },
  hourButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
  },
  activeButton: {
    backgroundColor: '#5C6BC0',
    borderColor: '#3F51B5',
  },
  inactiveButton: {
    backgroundColor: '#F5F7FF',
    borderColor: '#D1D9E6',
  },
  disabledButton: {
    backgroundColor: '#E0E0E0',
    borderColor: '#BDBDBD',
  },
  hourButtonText: {
    fontWeight: '500',
    fontSize: 12,
  },
  activeButtonText: {
    color: '#FFFFFF',
  },
  inactiveButtonText: {
    color: '#5C6BC0',
  },
  photoScrollView: {
    marginTop: 10,
  },
  photoGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  photoContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    resizeMode: 'cover',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoButton: {
    width: 120,
    height: 120,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#5C6BC0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FF',
  },
  addPhotoButtonText: {
    color: '#5C6BC0',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#0D47A1',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#A0A0A0',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  aiAssistantButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F5F7FF',
  },
  // Smart Tools Menu styles
  smartToolsMenu: {
    position: 'absolute',
    top: 62,
    right: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
    minWidth: 240,
  },
  smartToolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  smartToolText: {
    marginLeft: 12,
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  smartToolDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 4,
  },
  // Label row with AI helper button
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiHelperButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F5F7FF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#667eea',
  },
  aiHelperButtonText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#667eea',
    fontWeight: '600',
  },
  // Industry suggestions dropdown
  suggestionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  suggestionText: {
    marginLeft: 10,
    fontSize: 15,
    color: '#333',
  },
});

export default BusinessProfileScreen;
