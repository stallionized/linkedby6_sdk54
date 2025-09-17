import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Linking,
  Platform,
  TextInput,
  Dimensions,
  Alert,
  PanResponder
} from 'react-native';
import { supabase } from './supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from './Auth';

// Import review components
import ReviewEntryForm from './components/ReviewEntryForm';

// Import voice call components
import WebRTCService from './services/WebRTCService';
import IncomingCallModal from './components/IncomingCallModal';
import ActiveCallScreen from './components/ActiveCallScreen';

// Import web browser component
import WebBrowserSlider from './components/WebBrowserSlider';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Mobile-optimized constants - UPDATED: Full screen width
const SLIDER_WIDTH = screenWidth; // CHANGED: Use full screen width instead of 90%
const HEADER_HEIGHT = 60;

// Configuration for Neo4j API endpoint (for relationship tracking only)
const TRUST_BULLSEYE_API_URL = 'https://trustbullseyeserver-vv6l.onrender.com';

// Set to false to disable bullseye if causing issues
const ENABLE_TRUST_BULLSEYE = true;

// Function to generate consistent color from business name (same as SearchScreen)
const getColorFromName = (name) => {
  const colors = [
    '#FF5733', '#33A8FF', '#FF33A8', '#A833FF', '#33FF57',
    '#FFD433', '#FF8333', '#3357FF', '#33FFEC', '#8CFF33'
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

// Enhanced color extraction function (same as RecommendedBusinessesScreen and SearchScreen)
const extractDominantColor = async (business) => {
  try {
    // Smart color extraction based on the business name and industry
    const businessName = business.businessName?.toLowerCase() || '';
    const industry = business.industry?.toLowerCase() || '';
    
    // Define color mappings for common business types
    const colorMappings = {
      // Automotive
      'auto': '#1E3A8A', 'car': '#1E3A8A', 'automotive': '#1E3A8A', 'dealership': '#1E3A8A',
      'leasing': '#0F172A', 'rental': '#374151',
      
      // Technology
      'tech': '#3B82F6', 'software': '#3B82F6', 'digital': '#3B82F6', 'it': '#3B82F6',
      
      // Food & Restaurant
      'restaurant': '#DC2626', 'food': '#DC2626', 'cafe': '#92400E', 'bakery': '#D97706',
      
      // Health & Medical
      'medical': '#059669', 'health': '#059669', 'dental': '#059669', 'clinic': '#059669',
      
      // Finance
      'bank': '#1E40AF', 'finance': '#1E40AF', 'insurance': '#1E40AF', 'investment': '#1E40AF',
      
      // Real Estate
      'real estate': '#7C2D12', 'property': '#7C2D12', 'construction': '#92400E',
      
      // Retail
      'retail': '#7C3AED', 'store': '#7C3AED', 'shop': '#7C3AED', 'boutique': '#7C3AED',
      
      // Services
      'consulting': '#374151', 'service': '#374151', 'agency': '#374151',
      
      // Default colors for specific business names
      'fast lane': '#0F172A', // Dark color for Fast Lane Leasing
    };
    
    // Check for specific business name matches first
    for (const [key, color] of Object.entries(colorMappings)) {
      if (businessName.includes(key)) {
        return color;
      }
    }
    
    // Check industry matches
    for (const [key, color] of Object.entries(colorMappings)) {
      if (industry.includes(key)) {
        return color;
      }
    }
    
    // Fallback to original color generation but with better colors
    const betterColors = [
      '#1E3A8A', '#DC2626', '#059669', '#7C2D12', '#7C3AED',
      '#0F172A', '#374151', '#92400E', '#1E40AF', '#BE185D'
    ];
    
    let hash = 0;
    const nameToHash = businessName || 'business';
    for (let i = 0; i < nameToHash.length; i++) {
      hash = nameToHash.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % betterColors.length;
    return betterColors[index];
    
  } catch (error) {
    console.log('Error extracting color, using fallback');
    return getColorFromName(business.businessName || 'Business');
  }
};

const BusinessProfileSlider = ({ isVisible, onClose, businessId, userId, viewSource = 'other', navigation }) => {
  const slideAnim = useRef(new Animated.Value(SLIDER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pan = useRef(new Animated.ValueXY()).current;
  
  // Use navigation hook to ensure navigation works from any screen
  const navigationHook = useNavigation();
  
  // Get authenticated user
  const { user } = useAuth();

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dx > 0) {
          pan.setValue({ x: gestureState.dx, y: 0 });
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > SLIDER_WIDTH * 0.4 || gestureState.vx > 0.5) {
          onClose();
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;
  
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [error, setError] = useState(null);
  const [logoBgColor, setLogoBgColor] = useState('#e9ecef');
  const [reviewMode, setReviewMode] = useState(false);
  const [emailMode, setEmailMode] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailStatus, setEmailStatus] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  
  // Track when the slider was opened (for duration tracking)
  const [viewStartTime, setViewStartTime] = useState(null);
  const [viewId, setViewId] = useState(null);

  // Trust Bullseye states
  const [bullseyeData, setBullseyeData] = useState([]);
  const [bullseyeLoading, setBullseyeLoading] = useState(false);
  const [bullseyeError, setBullseyeError] = useState(null);
  const [selectedDegree, setSelectedDegree] = useState(null);

  // Reviews states for direct Supabase integration with pagination
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState(null);
  const [currentReviewPage, setCurrentReviewPage] = useState(1);
  const [totalReviewPages, setTotalReviewPages] = useState(1);
  const [totalReviewCount, setTotalReviewCount] = useState(0);
  const REVIEWS_PER_PAGE = 2;

  // Voice call states
  const [showIncomingCall, setShowIncomingCall] = useState(false);
  const [showActiveCall, setShowActiveCall] = useState(false);
  const [callState, setCallState] = useState('idle'); // 'idle', 'calling', 'incoming', 'active', 'ended'
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [activeCallData, setActiveCallData] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);

  // Web browser states
  const [showWebBrowser, setShowWebBrowser] = useState(false);
  const [browserUrl, setBrowserUrl] = useState('');

  // Bullseye configuration - updated for stroke-based concentric rings
  const centerX = 150;
  const centerY = 150;

  // Get radius for each ring (degree of separation)
  const getRadiusForDegree = (degree) => {
    const baseRadius = 15;
    return baseRadius * degree;
  };

  // Handle ring press
  const handleRingPress = (degree) => {
    setSelectedDegree(selectedDegree === degree ? null : degree);
  };

  // Function to create connections in Neo4j
  const createUserConnection = async (userId1, userId2, connectionType, strength = 1) => {
    try {
      console.log(`Creating connection: ${userId1} -> ${userId2}, type: ${connectionType}`);
      
      const response = await fetch(`${TRUST_BULLSEYE_API_URL}/users/create-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId1,
          userId2,
          connectionType,
          strength
        })
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('Connection created successfully:', data.connection);
      } else {
        console.error('Failed to create connection:', data.error);
      }
    } catch (error) {
      console.error('Error creating connection:', error);
    }
  };

  // Function to get connection strength recommendation
  const getConnectionStrengthRecommendation = (interactionType, frequency = 1) => {
    const baseStrengths = {
      'viewed_profile': 1,
      'called_business': 3,
      'emailed_business': 2,
      'messaged_business': 3,
      'reviewed_business': 4,
      'direct_message': 5,
      'mutual_reviewer': 1,
      'referral': 3,
      'worked_together': 5
    };

    const baseStrength = baseStrengths[interactionType] || 1;
    const frequencyMultiplier = Math.min(2, 1 + (frequency - 1) * 0.2);
    
    return Math.min(10, Math.round(baseStrength * frequencyMultiplier));
  };

  // Fetch bullseye data - combining Supabase reviews with Neo4j relationships
  const fetchBullseyeData = async () => {
    if (!businessId || !userId || !ENABLE_TRUST_BULLSEYE) return;

    try {
      setBullseyeLoading(true);
      setBullseyeError(null);

      console.log('Fetching bullseye data for business:', businessId);

      // Step 1: Get all reviews for this business from Supabase
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select(`
          review_id,
          user_id,
          business_id,
          recommendation,
          comment,
          tags,
          created_at
        `)
        .eq('business_id', businessId);

      if (reviewsError) {
        console.error('Error fetching reviews from Supabase:', reviewsError);
        throw new Error('Failed to fetch reviews from database');
      }

      console.log(`Found ${reviews?.length || 0} reviews for business`);

      if (!reviews || reviews.length === 0) {
        setBullseyeData([
          { degree: 1, totalReviews: 0, positiveReviews: 0, negativeReviews: 0, positiveWithConcerns: 0, positivePercentage: 0 },
          { degree: 2, totalReviews: 0, positiveReviews: 0, negativeReviews: 0, positiveWithConcerns: 0, positivePercentage: 0 },
          { degree: 3, totalReviews: 0, positiveReviews: 0, negativeReviews: 0, positiveWithConcerns: 0, positivePercentage: 0 },
          { degree: 4, totalReviews: 0, positiveReviews: 0, negativeReviews: 0, positiveWithConcerns: 0, positivePercentage: 0 },
          { degree: 5, totalReviews: 0, positiveReviews: 0, negativeReviews: 0, positiveWithConcerns: 0, positivePercentage: 0 },
          { degree: 6, totalReviews: 0, positiveReviews: 0, negativeReviews: 0, positiveWithConcerns: 0, positivePercentage: 0 }
        ]);
        return;
      }

      // Step 2: Get degrees of separation for each reviewer from Neo4j
      try {
        const response = await fetch(
          `${TRUST_BULLSEYE_API_URL}/api/trust-bullseye`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              authenticatedUserId: userId,
              businessId: businessId
            })
          }
        );

        let separationData = {};
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            separationData = data.separationData || {};
            console.log('Got separation data from Neo4j:', separationData);
          } else {
            console.warn('Neo4j separation API failed, using default degrees');
          }
        } else {
          console.warn('Neo4j server not available, using default degrees');
        }

        // Step 3: Combine review data with separation degrees
        const reviewsWithSeparation = reviews.map(review => ({
          ...review,
          degreesOfSeparation: (() => {
            let degrees = separationData[review.user_id];
            if (review.user_id === userId || degrees === 0 || degrees === null || degrees === undefined) {
              return 1;
            }
            return degrees > 6 ? 7 : degrees;
          })()
        }));

        // Step 4: Aggregate data by degrees of separation
        const aggregated = {};
        
        for (let degree = 1; degree <= 6; degree++) {
          aggregated[degree] = {
            degree,
            totalReviews: 0,
            positiveReviews: 0,
            negativeReviews: 0,
            positiveWithConcerns: 0,
            positivePercentage: 0
          };
        }

        reviewsWithSeparation.forEach(review => {
          const degree = review.degreesOfSeparation;
          
          if (degree >= 1 && degree <= 6) {
            aggregated[degree].totalReviews++;
            
            switch (review.recommendation) {
              case 'positive':
                aggregated[degree].positiveReviews++;
                break;
              case 'negative':
                aggregated[degree].negativeReviews++;
                break;
              case 'positive_with_concerns':
                aggregated[degree].positiveWithConcerns++;
                break;
              default:
                console.log('Unknown recommendation value:', review.recommendation);
                aggregated[degree].positiveReviews++;
            }
          }
        });

        // Calculate percentages
        Object.values(aggregated).forEach(degreeData => {
          if (degreeData.totalReviews > 0) {
            degreeData.positivePercentage = 
              (degreeData.positiveReviews / degreeData.totalReviews) * 100;
          }
        });

        const bullseyeArray = Object.values(aggregated);
        setBullseyeData(bullseyeArray);

        console.log('Bullseye data aggregated:', bullseyeArray);

      } catch (neo4jError) {
        console.warn('Neo4j API failed, showing reviews without separation data:', neo4jError);
        
        const fallbackData = [
          { degree: 1, totalReviews: 0, positiveReviews: 0, negativeReviews: 0, positiveWithConcerns: 0, positivePercentage: 0 },
          { degree: 2, totalReviews: 0, positiveReviews: 0, negativeReviews: 0, positiveWithConcerns: 0, positivePercentage: 0 },
          { degree: 3, totalReviews: 0, positiveReviews: 0, negativeReviews: 0, positiveWithConcerns: 0, positivePercentage: 0 },
          { degree: 4, totalReviews: 0, positiveReviews: 0, negativeReviews: 0, positiveWithConcerns: 0, positivePercentage: 0 },
          { degree: 5, totalReviews: 0, positiveReviews: 0, negativeReviews: 0, positiveWithConcerns: 0, positivePercentage: 0 },
          { degree: 6, totalReviews: 0, positiveReviews: 0, negativeReviews: 0, positiveWithConcerns: 0, positivePercentage: 0 }
        ];
        setBullseyeData(fallbackData);
      }

    } catch (err) {
      console.error('Error fetching bullseye data:', err);
      
      let errorMessage = 'Failed to load trust network data';
      if (err.message.includes('reviews')) {
        errorMessage = 'Failed to load reviews from database';
      } else if (err.message.includes('CORS') || err.message.includes('Network error')) {
        errorMessage = 'Network connection failed';
      }
      
      setBullseyeError(errorMessage);
      setBullseyeData([]);
    } finally {
      setBullseyeLoading(false);
    }
  };

  // Calculate color intensity based on positive percentage
  const getColorForPercentage = (percentage, hasReviews = false, isGreyedOut = false) => {
    if (isGreyedOut || !hasReviews || percentage === 0) {
      return '#E5E7EB';
    }

    const intensity = Math.max(0.2, percentage / 100);
    const red = Math.floor(13 * (1 - intensity * 0.5));
    const green = Math.floor(71 * (1 - intensity * 0.3));
    const blue = Math.floor(161 * intensity);
    
    return `rgb(${red}, ${green}, ${blue})`;
  };

  // Fetch reviews directly from Supabase with pagination
  const fetchReviews = async (page = 1) => {
    if (!businessId) return;

    try {
      setReviewsLoading(true);
      setReviewsError(null);

      console.log(`Fetching reviews for business: ${businessId}, page: ${page}`);

      const { count, error: countError } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId);

      if (countError) {
        console.error('Error counting reviews:', countError);
        throw new Error('Failed to count reviews');
      }

      const totalReviews = count || 0;
      const totalPages = Math.ceil(totalReviews / REVIEWS_PER_PAGE);
      setTotalReviewPages(totalPages);
      setTotalReviewCount(totalReviews);

      const startIndex = (page - 1) * REVIEWS_PER_PAGE;
      
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select(`
          review_id,
          business_id,
          user_id,
          recommendation,
          comment,
          tags,
          created_at
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .range(startIndex, startIndex + REVIEWS_PER_PAGE - 1);

      if (reviewsError) {
        console.error('Error fetching reviews:', reviewsError);
        throw new Error('Failed to fetch reviews');
      }

      console.log(`Fetched ${reviewsData?.length || 0} reviews for page ${page}`);
      setReviews(reviewsData || []);
      setCurrentReviewPage(page);

    } catch (err) {
      console.error('Error in fetchReviews:', err);
      setReviewsError(err.message);
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  // Handle review page navigation
  const handleReviewPageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalReviewPages) {
      fetchReviews(newPage);
    }
  };

  // Format review date for display
  const formatReviewDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Unknown date';
    }
  };

  // Get recommendation color and icon
  const getRecommendationStyle = (recommendation) => {
    switch (recommendation) {
      case 'positive':
        return { color: '#059669', icon: '👍', text: 'Positive' };
      case 'negative':
        return { color: '#DC2626', icon: '👎', text: 'Negative' };
      case 'positive_with_concerns':
        return { color: '#D97706', icon: '⚠️', text: 'Positive with Concerns' };
      default:
        return { color: '#6B7280', icon: '❓', text: 'Unknown' };
    }
  };

  // Get summary text for a degree
  const getSummaryText = (data) => {
    if (data.totalReviews === 0) {
      return 'No reviews';
    }
    return `${data.totalReviews} review${data.totalReviews > 1 ? 's' : ''}\n${Math.round(data.positivePercentage)}% positive`;
  };

  // Render Reviews Section with Built-in Pagination
  const renderReviewsSection = () => {
    if (reviewsLoading) {
      return (
        <View style={styles.reviewsLoadingContainer}>
          <ActivityIndicator size="large" color="#0D47A1" />
          <Text style={styles.reviewsLoadingText}>Loading reviews...</Text>
        </View>
      );
    }

    if (reviewsError) {
      return (
        <View style={styles.reviewsErrorContainer}>
          <Text style={styles.reviewsErrorText}>Error loading reviews: {reviewsError}</Text>
          <TouchableOpacity style={styles.reviewsRetryButton} onPress={() => fetchReviews(1)}>
            <Text style={styles.reviewsRetryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!reviews || reviews.length === 0) {
      return (
        <View style={styles.reviewsEmptyContainer}>
          <Text style={styles.reviewsEmptyText}>No reviews yet</Text>
          <Text style={styles.reviewsEmptySubtext}>Be the first to review this business!</Text>
        </View>
      );
    }

    return (
      <View style={styles.reviewsContainer}>
        <View style={styles.reviewsSummary}>
          <Text style={styles.reviewsSummaryText}>
            Showing {reviews.length} of {totalReviewCount} review{totalReviewCount !== 1 ? 's' : ''}
          </Text>
        </View>

        <View style={styles.reviewsList}>
          {reviews.map((review) => {
            const recommendationStyle = getRecommendationStyle(review.recommendation);
            
            return (
              <View key={review.review_id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewRecommendation}>
                    <Text style={styles.reviewIcon}>{recommendationStyle.icon}</Text>
                    <Text style={[styles.reviewRecommendationText, { color: recommendationStyle.color }]}>
                      {recommendationStyle.text}
                    </Text>
                  </View>
                  <Text style={styles.reviewDate}>
                    {formatReviewDate(review.created_at)}
                  </Text>
                </View>

                {review.comment && (
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                )}

                {review.tags && Array.isArray(review.tags) && review.tags.length > 0 && (
                  <View style={styles.reviewTags}>
                    {review.tags.map((tag, index) => (
                      <View key={index} style={styles.reviewTag}>
                        <Text style={styles.reviewTagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {totalReviewPages > 1 && (
          <View style={styles.paginationContainer}>
            <TouchableOpacity
              style={[
                styles.paginationButton,
                currentReviewPage === 1 && styles.paginationButtonDisabled
              ]}
              onPress={() => handleReviewPageChange(currentReviewPage - 1)}
              disabled={currentReviewPage === 1}
            >
              <Ionicons name="chevron-back" size={20} color={currentReviewPage === 1 ? '#ccc' : '#0D47A1'} />
              <Text style={[
                styles.paginationButtonText,
                currentReviewPage === 1 && styles.paginationButtonTextDisabled
              ]}>
                Previous
              </Text>
            </TouchableOpacity>

            <View style={styles.paginationInfo}>
              <Text style={styles.paginationText}>
                Page {currentReviewPage} of {totalReviewPages}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.paginationButton,
                currentReviewPage === totalReviewPages && styles.paginationButtonDisabled
              ]}
              onPress={() => handleReviewPageChange(currentReviewPage + 1)}
              disabled={currentReviewPage === totalReviewPages}
            >
              <Text style={[
                styles.paginationButtonText,
                currentReviewPage === totalReviewPages && styles.paginationButtonTextDisabled
              ]}>
                Next
              </Text>
              <Ionicons name="chevron-forward" size={20} color={currentReviewPage === totalReviewPages ? '#ccc' : '#0D47A1'} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };
  
  // Cleanup function to update view duration when component unmounts or closes
  useEffect(() => {
    return () => {
      if (!isVisible && viewId && viewStartTime) {
        updateViewDuration();
      }
    };
  }, [isVisible, viewId, viewStartTime]);

  // WebRTC callback handlers
  const handleCallStateChange = (state, callData) => {
    console.log('Call state changed:', state, callData);
    setCallState(state);
    
    // Enhance call data with business profile information
    const enhancedCallData = {
      ...callData,
      contactName: profileData?.businessName,
      businessLogo: profileData?.logo,
      industry: profileData?.industry,
      callType: 'business'
    };
    
    switch (state) {
      case 'incoming':
        setIncomingCallData(enhancedCallData);
        setShowIncomingCall(true);
        setShowActiveCall(false);
        break;
      case 'calling':
        setActiveCallData(enhancedCallData);
        setShowIncomingCall(false);
        setShowActiveCall(true);
        break;
      case 'active':
        setActiveCallData(enhancedCallData);
        setShowIncomingCall(false);
        setShowActiveCall(true);
        break;
      case 'ended':
        setShowIncomingCall(false);
        setShowActiveCall(false);
        setIncomingCallData(null);
        setActiveCallData(null);
        setCallState('idle');
        break;
      case 'error':
        setShowIncomingCall(false);
        setShowActiveCall(false);
        setIncomingCallData(null);
        setActiveCallData(null);
        setCallState('idle');
        Alert.alert('Call Error', callData?.error || 'An error occurred during the call');
        break;
    }
  };

  const handleRemoteStream = (stream) => {
    setRemoteStream(stream);
  };

  const handleLocalStream = (stream) => {
    setLocalStream(stream);
  };

  // Register callback handlers with the globally initialized WebRTC service
  useEffect(() => {
    if (user && user.id) {
      console.log('User available for WebRTC calls, registering callbacks:', user.id);
      
      // Update the WebRTC service callbacks to use this component's handlers
      WebRTCService.callStateCallback = handleCallStateChange;
      WebRTCService.remoteStreamCallback = handleRemoteStream;
      WebRTCService.localStreamCallback = handleLocalStream;
    }

    // Cleanup: reset callbacks when component unmounts
    return () => {
      if (WebRTCService.callStateCallback === handleCallStateChange) {
        WebRTCService.callStateCallback = null;
      }
      if (WebRTCService.remoteStreamCallback === handleRemoteStream) {
        WebRTCService.remoteStreamCallback = null;
      }
      if (WebRTCService.localStreamCallback === handleLocalStream) {
        WebRTCService.localStreamCallback = null;
      }
    };
  }, [user]);

  // Fetch bullseye data and reviews when component mounts
  useEffect(() => {
    if (isVisible && businessId && userId) {
      if (ENABLE_TRUST_BULLSEYE) {
        fetchBullseyeData();
      }
      fetchReviews(1);
    }
  }, [businessId, userId, isVisible]);

  // Animate the slider in and out
  useEffect(() => {
    if (isVisible) {
      pan.setValue({ x: 0, y: 0 }); // Reset pan position when opening
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: false,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: false,
        })
      ]).start();
      
      setReviewMode(false);
      setEmailMode(false);
      setEmailStatus('');
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: SLIDER_WIDTH,
          tension: 50,
          friction: 7,
          useNativeDriver: false,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        })
      ]).start();
    }
  }, [isVisible, slideAnim, fadeAnim]);
  
  // Extract dominant color from logo image when profileData changes
  useEffect(() => {
    const setInitialColor = async () => {
      if (profileData) {
        const smartColor = await extractDominantColor(profileData);
        setLogoBgColor(smartColor);
      } else {
        setLogoBgColor('#e9ecef');
      }
    };
    setInitialColor();
  }, [profileData]);

  // Function to record profile view with detailed tracking
  const recordProfileView = async (viewSource = 'other') => {
    if (!businessId || !userId) {
      console.log('[recordProfileView] Missing businessId or userId:', { businessId, userId });
      return;
    }

    try {
      console.log('[recordProfileView] Recording detailed view:', { businessId, userId, viewSource });
      
      const trackingData = {
        p_business_id: businessId,
        p_viewer_user_id: userId,
        p_view_source: viewSource
      };

      const { data, error } = await supabase.rpc('record_business_profile_view_detailed', trackingData);

      if (error) {
        console.error('[recordProfileView] Error recording detailed view:', error);
        const { error: fallbackError } = await supabase.rpc('record_business_profile_view', {
          p_business_id: businessId,
          p_viewer_user_id: userId,
          p_view_source: viewSource
        });
        if (fallbackError) {
          console.error('[recordProfileView] Fallback also failed:', fallbackError);
        }
      } else {
        console.log('[recordProfileView] Successfully recorded detailed profile view, ID:', data);
        setViewId(data);
        setViewStartTime(new Date());
      }
    } catch (e) {
      console.error('[recordProfileView] Exception recording view:', e);
    }
  };

  // Function to update view duration when slider closes
  const updateViewDuration = async () => {
    if (!viewId || !viewStartTime) return;

    try {
      const duration = Math.floor((new Date() - viewStartTime) / 1000);
      console.log('[updateViewDuration] View duration:', duration, 'seconds');

      const { error } = await supabase
        .from('business_profile_view_details')
        .update({ view_duration_seconds: duration })
        .eq('id', viewId);

      if (error) {
        console.error('[updateViewDuration] Error updating duration:', error);
      }
    } catch (e) {
      console.error('[updateViewDuration] Exception updating duration:', e);
    }
  };

  // Fetch business profile data when businessId changes
  useEffect(() => {
    const fetchBusinessProfile = async () => {
      if (!businessId || !isVisible) return;
      
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching business profile by business_id:', businessId);
        
        const { data, error } = await supabase
          .from('business_profiles')
          .select('*')
          .eq('business_id', businessId)
          .single();
          
        if (error) {
          console.error('Error fetching business profile by business_id:', error);
          setError('Failed to load business profile');
          setLoading(false);
          return;
        }
        
        if (data) {
          const transformedData = {
            logo: data.image_url,
            logoBackgroundColor: '#e9ecef',
            businessName: data.business_name || 'Business Name',
            industry: data.industry || 'Industry',
            description: data.description || 'Business description will appear here...',
            contactInfo: {
              phone: data.phone || 'Not specified',
              email: data.contact_email || 'Not specified',
              website: data.website || '',
              address: data.address || '',
              city: data.city || '',
              state: data.state || '',
              zipCode: data.zip_code || '',
              locationType: data.location_type || '',
            },
            coverageArea: {
              type: data.coverage_type || 'Not specified',
              details: data.coverage_details || '',
              radius: data.coverage_type === 'local' ? data.coverage_radius?.toString() : '',
            },
            businessPhotos: data.business_photos || [],
            hours: data.hours || [],
            businessId: data.business_id,
            businessOwnerId: data.owner_user_id,
          };
          
          setProfileData(transformedData);
          setLoading(false);
          
          recordProfileView(viewSource);
          return;
        } else {
          setError('Business profile not found');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error in fetchBusinessProfile:', error);
        setError('An error occurred while loading the business profile');
        setLoading(false);
      }
    };
    
    fetchBusinessProfile();
  }, [businessId, isVisible]);
  
  // Function to format phone number for display
  const formatPhoneNumber = (phone) => {
    if (!phone || phone === 'Not specified') return phone;
    
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length === 11 && cleaned[0] === '1') {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    
    return phone;
  };
  
  // Function to handle phone call using WebRTC
  const handlePhoneCall = async () => {
    if (!user || !user.id) {
      Alert.alert('Error', 'You must be logged in to make calls');
      return;
    }

    if (!profileData.businessId) {
      Alert.alert('Error', 'Cannot call this business - no business ID available');
      return;
    }

    try {
      console.log('Starting WebRTC call to business:', profileData.businessName);
      setCallState('calling');
      
      // Ensure WebRTC service is initialized before making the call
      await WebRTCService.ensureInitialized();
      
      await WebRTCService.startCall(
        profileData.businessId, 
        profileData.businessName,
        'business'
      );

      // Track the call attempt
      trackContactClick('phone_call', {
        phone_number: profileData.contactInfo?.phone || 'WebRTC Call',
        button_location: 'quick_contact',
        call_type: 'webrtc',
        business_id: profileData.businessId
      });
    } catch (error) {
      console.error('Error starting call:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Unable to start the call. Please try again.';
      if (error.message.includes('not initialized')) {
        errorMessage = 'Call service is not ready. Please try again in a moment.';
      } else if (error.message.includes('logged in')) {
        errorMessage = 'Please ensure you are logged in and try again.';
      } else if (error.message.includes('database')) {
        errorMessage = 'Voice calling is temporarily unavailable. Please try again later.';
      }
      
      Alert.alert('Call Failed', errorMessage);
      setCallState('idle');
    }
  };
  
  // Function to handle email
  const handleEmail = (email) => {
    if (!email || email === 'Not specified') return;
    
    trackContactClick('external_email', {
      email_address: email,
      button_location: 'quick_contact'
    });
    
    const emailUrl = `mailto:${email}`;
    Linking.canOpenURL(emailUrl)
      .then(supported => {
        if (supported) {
          Linking.openURL(emailUrl);
        } else {
          Alert.alert("Error", "Email not supported on this device");
        }
      })
      .catch(err => console.error('Error opening email app:', err));
  };

  const handleInternalEmailSend = async () => {
    if (!profileData || !profileData.businessId || !userId) {
      setEmailStatus('Error: Missing required information.');
      return;
    }
    if (!emailSubject.trim() || !emailBody.trim()) {
      setEmailStatus('Error: Subject and body cannot be empty.');
      return;
    }

    setEmailStatus('Sending...');
    try {
      const { error: insertError } = await supabase
        .from('internal_emails')
        .insert({
          sender_user_id: userId,
          recipient_business_id: profileData.businessId,
          subject: emailSubject,
          body: emailBody,
        });

      if (insertError) {
        console.error('Error sending internal email:', insertError);
        setEmailStatus(`Error: ${insertError.message}`);
      } else {
        setEmailStatus('Email sent successfully!');
        
        trackContactClick('internal_email', {
          email_address: profileData.contactInfo.email,
          action: 'email_sent',
          email_subject: emailSubject,
          button_location: 'email_form'
        });
        
        setEmailSubject('');
        setEmailBody('');
        setTimeout(() => {
          setEmailMode(false);
          setEmailStatus('');
        }, 2000);
      }
    } catch (e) {
      console.error('Exception sending internal email:', e);
      setEmailStatus('Error: An unexpected error occurred.');
    }
  };
  
  // Function to handle website visit
  const handleWebsite = (website) => {
    if (!website) return;

    trackContactClick('website_visit', {
      website_url: website,
      button_location: 'quick_contact'
    });
    
    let url = website;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    // Open in internal web browser slider instead of external browser
    setBrowserUrl(url);
    setShowWebBrowser(true);
  };
  
  // Function to format day of week
  const formatDay = (day) => {
    return day.charAt(0).toUpperCase() + day.slice(1);
  };

  // Comprehensive contact tracking function with Neo4j integration
  const trackContactClick = async (contactMethod, additionalDetails = {}) => {
    console.log('[trackContactClick] Tracking contact:', { 
      businessId: profileData?.businessId, 
      method: contactMethod, 
      details: additionalDetails 
    });

    if (!profileData?.businessId || !contactMethod) {
      console.error('[trackContactClick] Missing required data:', { 
        businessId: profileData?.businessId, 
        contactMethod 
      });
      return;
    }

    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !authUser) {
        console.error('[trackContactClick] Could not get authenticated user:', authError);
        return;
      }

      const trackingData = {
        business_id: profileData.businessId,
        user_id: authUser.id,
        contact_method: contactMethod,
        contact_details: {
          ...additionalDetails,
          business_name: profileData.businessName,
          timestamp: new Date().toISOString(),
          source: 'business_profile_slider'
        }
      };

      console.log('[trackContactClick] Inserting tracking data:', trackingData);

      const { data: newData, error: newError } = await supabase
        .from('business_contact_tracking')
        .insert([trackingData])
        .select();

      if (newError) {
        console.error('[trackContactClick] Error inserting into business_contact_tracking:', newError);
      } else {
        console.log('[trackContactClick] Successfully tracked in business_contact_tracking:', newData);
      }

      // Create connection in Neo4j when users interact
      if (profileData.businessOwnerId && authUser.id !== profileData.businessOwnerId) {
        let connectionType = 'viewed_profile';
        let strength = 1;

        switch (contactMethod) {
          case 'phone_call':
            connectionType = 'called_business';
            strength = getConnectionStrengthRecommendation('called_business');
            break;
          case 'internal_email':
          case 'external_email':
            connectionType = 'emailed_business';
            strength = getConnectionStrengthRecommendation('emailed_business');
            break;
          case 'direct_message':
            connectionType = 'messaged_business';
            strength = getConnectionStrengthRecommendation('messaged_business');
            break;
          case 'review_submission':
            connectionType = 'reviewed_business';
            strength = getConnectionStrengthRecommendation('reviewed_business');
            break;
          case 'website_visit':
            connectionType = 'visited_website';
            strength = getConnectionStrengthRecommendation('visited_website');
            break;
          default:
            connectionType = 'interacted_with_business';
            strength = getConnectionStrengthRecommendation('viewed_profile');
        }

        await createUserConnection(
          authUser.id,
          profileData.businessOwnerId,
          connectionType,
          strength
        );
      }

    } catch (e) {
      console.error('[trackContactClick] Exception during tracking:', e);
    }
  };
  
  // Function to format hours
  const formatHours = (hourData) => {
    if (hourData.isClosed) {
      return 'Closed';
    }
    
    if (hourData.is24Hours) {
      return 'Open 24 Hours';
    }
    
    if (hourData.open && hourData.close) {
      return `${hourData.open} - ${hourData.close}`;
    }
    
    return 'Hours not specified';
  };
  
  // Handle review submission success with Supabase + Neo4j integration
  const handleReviewSubmitSuccess = async (review) => {
    console.log('Review submitted successfully to Supabase:', review);
    
    await trackContactClick('review_submission', {
      button_location: 'review_form',
      action: 'review_submitted',
      recommendation: review.recommendation,
      tags: review.tags
    });
    
    setReviewMode(false);
    setReviewSubmitted(true);
    
    setTimeout(() => {
      setReviewSubmitted(false);
    }, 5000);

    if (ENABLE_TRUST_BULLSEYE) {
      fetchBullseyeData();
    }
    fetchReviews(1);

    // Create connections with other reviewers in Neo4j
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (!authError && authUser && profileData.businessOwnerId) {
        const { data: otherReviews, error: reviewsError } = await supabase
          .from('reviews')
          .select('user_id')
          .eq('business_id', profileData.businessId)
          .neq('user_id', authUser.id);

        if (!reviewsError && otherReviews && otherReviews.length > 0) {
          for (const reviewData of otherReviews) {
            await createUserConnection(
              authUser.id,
              reviewData.user_id,
              'mutual_reviewer',
              getConnectionStrengthRecommendation('mutual_reviewer')
            );
          }
          console.log(`Created connections with ${otherReviews.length} other reviewers`);
        }
      }
    } catch (error) {
      console.error('Error creating reviewer connections in Neo4j:', error);
    }
  };

  // Function to check for existing conversation with business
  const checkExistingConversation = async (userId, businessId) => {
    try {
      const { data: existingConversation, error } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', userId)
        .eq('business_id', businessId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error checking existing conversation:', error);
        return null;
      }

      return existingConversation;
    } catch (error) {
      console.error('Error in checkExistingConversation:', error);
      return null;
    }
  };

  // Function to create new conversation
  const createNewConversation = async (userId, businessId) => {
    try {
      const { data: newConversation, error } = await supabase
        .from('conversations')
        .insert({
          user_id: userId,
          business_id: businessId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating new conversation:', error);
        return null;
      }

      return newConversation;
    } catch (error) {
      console.error('Error in createNewConversation:', error);
      return null;
    }
  };

  // Handle direct message with Neo4j connection creation
  const handleDirectMessage = async (businessId) => {
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        console.error('User not authenticated:', authError);
        return;
      }

      if (!businessId || !profileData) {
        console.error('Missing business information:', { businessId, profileData });
        return;
      }

      // Create Neo4j connection if business owner exists
      if (profileData.businessOwnerId) {
        await createUserConnection(
          authUser.id,
          profileData.businessOwnerId,
          'direct_message',
          getConnectionStrengthRecommendation('direct_message')
        );
      }

      await trackContactClick('direct_message', {
        button_location: 'quick_contact',
        action: 'start_conversation'
      });

      // Check for existing conversation
      let conversation = await checkExistingConversation(authUser.id, businessId);
      
      // If no existing conversation, create a new one
      if (!conversation) {
        conversation = await createNewConversation(authUser.id, businessId);
        
        if (!conversation) {
          console.error('Failed to create conversation');
          return;
        }
      }

      // Navigate to conversation screen using the navigation hook
      navigationHook.navigate('Conversation', {
        conversationId: conversation.id,
        contact: {
          id: businessId,
          name: profileData.businessName,
          lastSeen: 'last seen recently',
          isBusinessConversation: true,
        },
        isBusinessMode: false,
        userBusinessProfile: null,
      });
      
    } catch (error) {
      console.error('Error handling direct message:', error);
    }
  };

  // Render Trust Bullseye component
  const renderTrustBullseye = () => {
    if (bullseyeLoading) {
      return (
        <View style={styles.trustBullseyeLoadingContainer}>
          <ActivityIndicator size="large" color="#0D47A1" />
          <Text style={styles.trustBullseyeLoadingText}>Loading trust network...</Text>
        </View>
      );
    }

    if (bullseyeError) {
      return (
        <View style={styles.trustBullseyeErrorContainer}>
          <Text style={styles.trustBullseyeErrorText}>Error: {bullseyeError}</Text>
          <TouchableOpacity style={styles.trustBullseyeRetryButton} onPress={fetchBullseyeData}>
            <Text style={styles.trustBullseyeRetryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const hasAnyReviews = Array.isArray(bullseyeData) && bullseyeData.some(data => data && data.totalReviews > 0);

    if (!hasAnyReviews) {
      return (
        <View style={styles.trustBullseyeContainer}>
          <Text style={styles.trustBullseyeTitle}>Trust Network Reviews</Text>
          <Text style={styles.trustBullseyeSubtitle}>
            Reviews by degrees of separation from you
          </Text>

          <View style={styles.bullseyeContainer}>
            <Svg width={300} height={300} viewBox="0 0 300 300">
              {[6, 5, 4, 3, 2, 1].map((degree) => {
                const radius = getRadiusForDegree(degree);
                const greyColor = '#F3F4F6';
                const strokeWidth = 14;
                
                return (
                  <Circle
                    key={degree}
                    cx={centerX}
                    cy={centerY}
                    r={radius}
                    fill="transparent"
                    stroke={greyColor}
                    strokeWidth={strokeWidth}
                  />
                );
              })}

              <Circle
                cx={centerX}
                cy={centerY}
                r={8}
                fill="#F3F4F6"
                stroke="#E5E7EB"
                strokeWidth={1}
              />

              <SvgText
                x={centerX}
                y={centerY - 5}
                textAnchor="middle"
                fontSize="12"
                fontWeight="bold"
                fill="#9CA3AF"
              >
                No
              </SvgText>
              <SvgText
                x={centerX}
                y={centerY + 8}
                textAnchor="middle"
                fontSize="12"
                fontWeight="bold"
                fill="#9CA3AF"
              >
                Reviews
              </SvgText>
            </Svg>

            <View style={styles.trustBullseyeLegend}>
              <Text style={styles.trustBullseyeLegendTitle}>Degrees of Separation</Text>
              {[1, 2, 3, 4, 5, 6].map((degree) => (
                <View key={degree} style={styles.trustBullseyeLegendItem}>
                  <View
                    style={[
                      styles.trustBullseyeLegendColor,
                      { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
                    ]}
                  />
                  <View style={styles.trustBullseyeLegendTextContainer}>
                    <Text style={styles.trustBullseyeLegendDegree}>{degree} degree{degree > 1 ? 's' : ''}</Text>
                    <Text style={styles.trustBullseyeLegendStats}>No reviews yet</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.trustBullseyeNoDataContainer}>
            <Text style={styles.trustBullseyeNoDataText}>No trust network reviews yet</Text>
            <Text style={styles.trustBullseyeNoDataSubtext}>
              When people in your network review this business, their reviews will appear here based on how closely connected they are to you.
            </Text>
          </View>

          <View style={styles.trustBullseyeExplanation}>
            <Text style={styles.trustBullseyeExplanationText}>
              The bullseye will show reviews from your trust network. The center represents 1st-degree 
              connections (direct connections), with each ring representing an additional degree of separation. 
              Darker blue will indicate higher positive review percentages once reviews are available.
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.trustBullseyeContainer}>
        <Text style={styles.trustBullseyeTitle}>Trust Network Reviews</Text>
        <Text style={styles.trustBullseyeSubtitle}>
          Reviews by degrees of separation from you
        </Text>

        <View style={styles.bullseyeContainer}>
          <Svg width={300} height={300} viewBox="0 0 300 300">
            {Array.isArray(bullseyeData) && [6, 5, 4, 3, 2, 1].map((degree) => {
              const data = bullseyeData.find(d => d && d.degree === degree);
              if (!data) return null;
              
              const radius = getRadiusForDegree(degree);
              const color = getColorForPercentage(data.positivePercentage, data.totalReviews > 0, false);
              const strokeWidth = selectedDegree === degree ? 18 : 14;
              const strokeOpacity = selectedDegree === degree ? 1 : 0.8;
              
              return (
                <Circle
                  key={degree}
                  cx={centerX}
                  cy={centerY}
                  r={radius}
                  fill="transparent"
                  stroke={color}
                  strokeWidth={strokeWidth}
                  strokeOpacity={strokeOpacity}
                  onPress={() => handleRingPress(degree)}
                />
              );
            }).filter(Boolean)}

            {Array.isArray(bullseyeData) && (() => {
              const centerData = bullseyeData.find(d => d && d.degree === 1);
              const centerColor = centerData ? getColorForPercentage(centerData.positivePercentage, centerData.totalReviews > 0, false) : '#F3F4F6';
              const isSelected = selectedDegree === 1;
              
              return (
                <Circle
                  cx={centerX}
                  cy={centerY}
                  r={isSelected ? 12 : 8}
                  fill={centerColor}
                  stroke={isSelected ? '#0D47A1' : '#E5E7EB'}
                  strokeWidth={isSelected ? 3 : 1}
                  onPress={() => handleRingPress(1)}
                />
              );
            })()}
          </Svg>

          <View style={styles.trustBullseyeLegend}>
            <Text style={styles.trustBullseyeLegendTitle}>Degrees of Separation</Text>
            {Array.isArray(bullseyeData) && bullseyeData.map((data) => {
              if (!data) return null;
              return (
                <TouchableOpacity
                  key={data.degree}
                  style={[
                    styles.trustBullseyeLegendItem,
                    selectedDegree === data.degree && styles.trustBullseyeSelectedLegendItem
                  ]}
                  onPress={() => handleRingPress(data.degree)}
                >
                  <View
                    style={[
                      styles.trustBullseyeLegendColor,
                      {
                        backgroundColor: getColorForPercentage(
                          data.positivePercentage,
                          data.totalReviews > 0,
                          false
                        ),
                      },
                    ]}
                  />
                  <View style={styles.trustBullseyeLegendTextContainer}>
                    <Text style={styles.trustBullseyeLegendDegree}>{data.degree} degree{data.degree > 1 ? 's' : ''}</Text>
                    <Text style={styles.trustBullseyeLegendStats}>
                      {getSummaryText(data)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }).filter(Boolean)}
          </View>
        </View>

        {selectedDegree && Array.isArray(bullseyeData) && (
          <View style={styles.trustBullseyeDetailsContainer}>
            {(() => {
              const selectedData = bullseyeData.find(d => d && d.degree === selectedDegree);
              if (!selectedData) return null;
              
              return (
                <View style={styles.trustBullseyeDetailsContent}>
                  <Text style={styles.trustBullseyeDetailsTitle}>
                    {selectedDegree} Degree{selectedDegree > 1 ? 's' : ''} of Separation
                  </Text>
                  <View style={styles.trustBullseyeDetailsStats}>
                    <View style={styles.trustBullseyeStatItem}>
                      <Text style={styles.trustBullseyeStatNumber}>{selectedData.totalReviews || 0}</Text>
                      <Text style={styles.trustBullseyeStatLabel}>Total Reviews</Text>
                    </View>
                    <View style={styles.trustBullseyeStatItem}>
                      <Text style={styles.trustBullseyeStatNumber}>{selectedData.positiveReviews || 0}</Text>
                      <Text style={styles.trustBullseyeStatLabel}>Positive</Text>
                    </View>
                    <View style={styles.trustBullseyeStatItem}>
                      <Text style={styles.trustBullseyeStatNumber}>{selectedData.positiveWithConcerns || 0}</Text>
                      <Text style={styles.trustBullseyeStatLabel}>With Concerns</Text>
                    </View>
                    <View style={styles.trustBullseyeStatItem}>
                      <Text style={styles.trustBullseyeStatNumber}>{selectedData.negativeReviews || 0}</Text>
                      <Text style={styles.trustBullseyeStatLabel}>Negative</Text>
                    </View>
                  </View>
                  <View style={styles.trustBullseyePercentageContainer}>
                    <Text style={styles.trustBullseyePercentageText}>
                      {Math.round(selectedData.positivePercentage || 0)}% Positive Rating
                    </Text>
                  </View>
                </View>
              );
            })()}
          </View>
        )}

        <View style={styles.trustBullseyeExplanation}>
          <Text style={styles.trustBullseyeExplanationText}>
            The bullseye shows reviews from your trust network. The center represents 1st-degree 
            connections (direct connections), with each ring representing an additional degree of separation. 
            Darker blue indicates higher positive review percentages.
          </Text>
        </View>
      </View>
    );
  };
  
  if (!isVisible) {
    return null;
  }

  const renderEmailForm = () => (
    <ScrollView 
      style={styles.scrollableContent} 
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.mainInfoCard}>
        <View style={[styles.logoContainer, { backgroundColor: logoBgColor }]}>
          {profileData.logo ? (
            <Image source={{ uri: profileData.logo }} style={styles.logo} />
          ) : (
            <Text style={styles.logoPlaceholder}>
              {profileData.businessName.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
        <View style={styles.businessInfoContainer}>
          <Text style={styles.businessName}>{profileData.businessName}</Text>
          <Text style={styles.industryText}>Sending an internal email</Text>
        </View>
      </View>

      <View style={styles.emailFormContainer}>
        <Text style={styles.emailFormLabel}>Subject:</Text>
        <TextInput
          style={styles.emailInput}
          placeholder="Enter email subject"
          value={emailSubject}
          onChangeText={setEmailSubject}
          placeholderTextColor="#6B7280"
        />

        <Text style={styles.emailFormLabel}>Body:</Text>
        <TextInput
          style={[styles.emailInput, styles.emailBodyInput]}
          placeholder="Compose your email..."
          value={emailBody}
          onChangeText={setEmailBody}
          multiline
          numberOfLines={6}
          placeholderTextColor="#6B7280"
        />

        {emailStatus ? (
          <Text 
            style={[
              styles.emailStatusText, 
              emailStatus.startsWith('Error:') ? styles.emailStatusError : styles.emailStatusSuccess
            ]}
          >
            {emailStatus}
          </Text>
        ) : null}

        <TouchableOpacity 
          style={styles.sendEmailButton} 
          onPress={handleInternalEmailSend} 
          disabled={emailStatus === 'Sending...'}
        >
          {emailStatus === 'Sending...' ? (
            <ActivityIndicator size="small" color="#fff" style={styles.buttonIcon} />
          ) : (
            <Ionicons name="send-outline" size={20} color="#fff" style={styles.buttonIcon} />
          )}
          <Text style={styles.sendEmailButtonText}>
            {emailStatus === 'Sending...' ? 'Sending...' : 'Send Email'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}> 
      <Animated.View 
        style={[
          styles.slider, 
          { 
            transform: [{ translateX: Animated.add(slideAnim, pan.x) }],
            width: SLIDER_WIDTH,
          }
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.header}>
          <Text style={styles.headerText}>
            {emailMode ? `Email ${profileData?.businessName || 'Business'}` : reviewMode ? 'Leave a Review' : 'Business Profile'}
          </Text>
          <TouchableOpacity 
            onPress={() => {
              if (emailMode) {
                setEmailMode(false);
                setEmailStatus('');
              } else if (reviewMode) {
                setReviewMode(false);
              } else {
                onClose();
              }
            }} 
            style={styles.closeButton}
          >
            <Icon name={emailMode || reviewMode ? "arrow-left" : "close"} size={24} color="#333" />
          </TouchableOpacity>
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0D47A1" />
            <Text style={styles.loadingText}>Loading business profile...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.closeErrorButton} onPress={onClose}>
              <Text style={styles.closeErrorButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        ) : profileData ? (
          <View style={styles.sliderContent}>
            {emailMode ? renderEmailForm() : (
              <ScrollView 
                style={styles.scrollableContent} 
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={true}
              >
                <View style={styles.mainInfoCard}>
                  <View style={[
                    styles.logoContainer,
                    { backgroundColor: logoBgColor }
                  ]}>
                    {profileData.logo ? (
                      <Image source={{ uri: profileData.logo }} style={styles.logo} />
                    ) : (
                      <Text style={styles.logoPlaceholder}>
                        {profileData.businessName.charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  
                  <View style={styles.businessInfoContainer}>
                    <Text style={styles.businessName}>{profileData.businessName}</Text>
                    
                    {profileData.industry && (
                      <View style={styles.infoRow}>
                        <Ionicons name="briefcase-outline" size={18} color="#666" style={styles.infoIcon} />
                        <Text style={styles.industryText}>{profileData.industry}</Text>
                      </View>
                    )}
                    
                    {profileData.coverageArea && profileData.coverageArea.type && (
                      <View style={styles.infoRow}>
                        <Ionicons 
                          name={
                            profileData.coverageArea.type === 'local' ? 'location-outline' :
                            profileData.coverageArea.type === 'regional' ? 'map-outline' :
                            profileData.coverageArea.type === 'national' ? 'flag-outline' :
                            'globe-outline'
                          } 
                          size={18} 
                          color="#666" 
                          style={styles.infoIcon} 
                        />
                        <Text style={styles.coverageText}>
                          {profileData.coverageArea.type.charAt(0).toUpperCase() + profileData.coverageArea.type.slice(1)}
                          {profileData.coverageArea.type === 'local' && profileData.coverageArea.radius &&
                            ` (${profileData.coverageArea.radius} miles radius)`}
                          {profileData.coverageArea.details && ` - ${profileData.coverageArea.details}`}
                        </Text>
                      </View>
                    )}
                    
                    {!reviewMode && (
                      <View style={styles.quickContactContainer}>
                        {profileData.contactInfo?.phone && profileData.contactInfo.phone !== 'Not specified' && (
                          <TouchableOpacity 
                            style={styles.quickContactButton}
                            onPress={() => handlePhoneCall(profileData.contactInfo.phone)}
                          >
                            <Ionicons name="call-outline" size={20} color="#0D47A1" />
                            <Text style={styles.quickContactText}>Call</Text>
                          </TouchableOpacity>
                        )}
                        
                        {profileData.contactInfo?.email && profileData.contactInfo.email !== 'Not specified' && (
                          <TouchableOpacity 
                            style={styles.quickContactButton}
                            onPress={() => {
                              trackContactClick('internal_email', {
                                email_address: profileData.contactInfo.email,
                                button_location: 'quick_contact',
                                action: 'open_internal_email_form'
                              });
                              setEmailMode(true);
                            }}
                          >
                            <Ionicons name="mail-outline" size={20} color="#0D47A1" />
                            <Text style={styles.quickContactText}>Email</Text>
                          </TouchableOpacity>
                        )}
                        
                        {profileData.contactInfo?.website && (
                          <TouchableOpacity 
                            style={styles.quickContactButton}
                            onPress={() => handleWebsite(profileData.contactInfo.website)}
                          >
                            <Ionicons name="globe-outline" size={20} color="#0D47A1" />
                            <Text style={styles.quickContactText}>Website</Text>
                          </TouchableOpacity>
                        )}
                        
                        <TouchableOpacity 
                          style={styles.quickContactButton}
                          onPress={() => handleDirectMessage(profileData.businessId, navigation)}
                        >
                          <Ionicons name="chatbubble-outline" size={20} color="#0D47A1" />
                          <Text style={styles.quickContactText}>Message</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
                
                {!reviewMode && (
                  <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="information-circle-outline" size={22} color="#0D47A1" />
                      <Text style={styles.sectionTitle}>About</Text>
                    </View>
                    <Text style={styles.sectionContent}>{profileData.description}</Text>
                  </View>
                )}
                
                {!reviewMode && profileData.hours && profileData.hours.length > 0 && (
                  <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="time-outline" size={22} color="#0D47A1" />
                      <Text style={styles.sectionTitle}>Hours of Operation</Text>
                    </View>
                    
                    <View style={styles.hoursContainer}>
                      {profileData.hours.map((hourData, index) => (
                        <View key={index} style={styles.hourRow}>
                          <Text style={styles.dayText}>{formatDay(hourData.day)}</Text>
                          <Text style={[
                            styles.hoursText,
                            hourData.isClosed && styles.closedText,
                            hourData.is24Hours && styles.openText
                          ]}>
                            {formatHours(hourData)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                
                {!reviewMode && userId && ENABLE_TRUST_BULLSEYE && (
                  <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="shield-checkmark-outline" size={22} color="#0D47A1" />
                      <Text style={styles.sectionTitle}>Trust Network</Text>
                    </View>
                    {renderTrustBullseye()}
                  </View>
                )}

                
                {reviewMode ? (
                  <ReviewEntryForm 
                    businessId={businessId} 
                    userId={userId} 
                    onSubmitSuccess={handleReviewSubmitSuccess}
                    onCancel={() => setReviewMode(false)}
                  />
                ) : (
                  <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="star-outline" size={22} color="#0D47A1" />
                      <Text style={styles.sectionTitle}>Reviews</Text>
                    </View>
                    {renderReviewsSection()}
                  </View>
                )}
                
                {!reviewMode && (
                  <TouchableOpacity 
                    style={styles.leaveReviewButton}
                    onPress={() => {
                      trackContactClick('review_button_click', {
                        button_location: 'bottom_of_profile',
                        action: 'open_review_form'
                      });
                      setReviewMode(true);
                    }}
                  >
                    <Ionicons name="create-outline" size={20} color="#fff" style={styles.buttonIcon} />
                    <Text style={styles.leaveReviewButtonText}>Leave a Review</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        ) : (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>No business profile data available</Text>
            <TouchableOpacity style={styles.closeErrorButton} onPress={onClose}>
              <Text style={styles.closeErrorButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Incoming Call Modal */}
        {showIncomingCall && incomingCallData && (
          <IncomingCallModal
            visible={showIncomingCall}
            callerData={incomingCallData}
            onAccept={async () => {
              try {
                await WebRTCService.acceptCall();
                setShowIncomingCall(false);
                setShowActiveCall(true);
              } catch (error) {
                console.error('Error accepting call:', error);
                Alert.alert('Call Error', 'Failed to accept the call');
              }
            }}
            onDecline={async () => {
              try {
                await WebRTCService.endCall();
                setShowIncomingCall(false);
                setCallState('idle');
              } catch (error) {
                console.error('Error declining call:', error);
              }
            }}
          />
        )}

        {/* Active Call Screen */}
        {showActiveCall && activeCallData && (
          <ActiveCallScreen
            visible={showActiveCall}
            callData={activeCallData}
            localStream={localStream}
            remoteStream={remoteStream}
            isMuted={isMuted}
            isSpeakerOn={isSpeakerOn}
            callDuration={callDuration}
            onEndCall={async () => {
              try {
                await WebRTCService.endCall();
                setShowActiveCall(false);
                setCallState('idle');
              } catch (error) {
                console.error('Error ending call:', error);
              }
            }}
            onToggleMute={async () => {
              try {
                const newMuteState = await WebRTCService.toggleMute();
                setIsMuted(newMuteState);
              } catch (error) {
                console.error('Error toggling mute:', error);
              }
            }}
            onToggleSpeaker={async () => {
              try {
                const newSpeakerState = await WebRTCService.toggleSpeaker();
                setIsSpeakerOn(newSpeakerState);
              } catch (error) {
                console.error('Error toggling speaker:', error);
              }
            }}
          />
        )}

        {/* Web Browser Slider */}
        {showWebBrowser && (
          <WebBrowserSlider
            isVisible={showWebBrowser}
            onClose={() => setShowWebBrowser(false)}
            url={browserUrl}
            businessName={profileData?.businessName}
          />
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: SLIDER_WIDTH, // Now full screen width
    height: '100%',
    overflow: 'hidden',
    // REMOVED: borderLeftWidth and borderLeftColor for full width
    zIndex: 100,
  },
  slider: {
    position: 'absolute',
    right: 0,
    width: SLIDER_WIDTH, // Now full screen width
    height: '100%',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
    // REMOVED: borderTopLeftRadius and borderBottomLeftRadius for full width
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  sliderContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  scrollableContent: {
    flex: 1,
    position: 'relative',
    height: '100%',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#0D47A1',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 20,
  },
  closeErrorButton: {
    backgroundColor: '#0D47A1',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  closeErrorButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mainInfoCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  logoPlaceholder: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  businessInfoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  businessName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0D47A1',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoIcon: {
    marginRight: 8,
  },
  industryText: {
    fontSize: 16,
    color: '#555',
    flex: 1,
  },
  coverageText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  quickContactContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  quickContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  quickContactText: {
    color: '#0D47A1',
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0D47A1',
    marginLeft: 8,
  },
  sectionContent: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  hoursContainer: {
    marginTop: 5,
  },
  hourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    width: 100,
  },
  hoursText: {
    fontSize: 16,
    color: '#333',
  },
  closedText: {
    color: '#DC2626',
  },
  openText: {
    color: '#059669',
  },
  leaveReviewButton: {
    backgroundColor: '#0D47A1',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  leaveReviewButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginRight: 8,
  },
  // Email Form Styles
  emailFormContainer: {
    padding: 16,
  },
  emailFormLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emailInput: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
    color: '#111827',
  },
  emailBodyInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  sendEmailButton: {
    backgroundColor: '#0D47A1',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  sendEmailButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emailStatusText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
  },
  emailStatusSuccess: {
    color: '#059669',
  },
  emailStatusError: {
    color: '#DC2626',
  },
  // Reviews Section Styles
  reviewsContainer: {
    marginTop: 8,
  },
  reviewsLoadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  reviewsLoadingText: {
    marginTop: 10,
    color: '#0D47A1',
    fontSize: 14,
  },
  reviewsErrorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  reviewsErrorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  reviewsRetryButton: {
    backgroundColor: '#0D47A1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  reviewsRetryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  reviewsEmptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  reviewsEmptyText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    marginBottom: 8,
  },
  reviewsEmptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  reviewsSummary: {
    marginBottom: 16,
  },
  reviewsSummaryText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  reviewsList: {
    marginBottom: 16,
  },
  reviewCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewRecommendation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  reviewRecommendationText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  reviewDate: {
    fontSize: 12,
    color: '#666',
  },
  reviewComment: {
    fontSize: 15,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
  reviewTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  reviewTag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
  },
  reviewTagText: {
    fontSize: 12,
    color: '#0D47A1',
    fontWeight: '500',
  },
  // Pagination Styles
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationButtonText: {
    fontSize: 14,
    color: '#0D47A1',
    fontWeight: '500',
    marginHorizontal: 4,
  },
  paginationButtonTextDisabled: {
    color: '#ccc',
  },
  paginationInfo: {
    alignItems: 'center',
  },
  paginationText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  // Trust Bullseye Styles
  trustBullseyeContainer: {
    padding: 16,
  },
  trustBullseyeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0D47A1',
    textAlign: 'center',
    marginBottom: 4,
  },
  trustBullseyeSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  bullseyeContainer: {
    alignItems: 'center',
  },
  trustBullseyeLoadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  trustBullseyeLoadingText: {
    marginTop: 10,
    color: '#0D47A1',
    fontSize: 16,
  },
  trustBullseyeErrorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  trustBullseyeErrorText: {
    color: '#DC2626',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  trustBullseyeRetryButton: {
    backgroundColor: '#0D47A1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  trustBullseyeRetryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  trustBullseyeNoDataContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginTop: 16,
  },
  trustBullseyeNoDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '500',
  },
  trustBullseyeNoDataSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  trustBullseyeLegend: {
    marginTop: 20,
    width: '100%',
  },
  trustBullseyeLegendTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  trustBullseyeLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  trustBullseyeSelectedLegendItem: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#0D47A1',
  },
  trustBullseyeLegendColor: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  trustBullseyeLegendTextContainer: {
    flex: 1,
  },
  trustBullseyeLegendDegree: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  trustBullseyeLegendStats: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  trustBullseyeDetailsContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  trustBullseyeDetailsContent: {
    alignItems: 'center',
  },
  trustBullseyeDetailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0D47A1',
    marginBottom: 16,
  },
  trustBullseyeDetailsStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 16,
  },
  trustBullseyeStatItem: {
    alignItems: 'center',
  },
  trustBullseyeStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0D47A1',
  },
  trustBullseyeStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  trustBullseyePercentageContainer: {
    backgroundColor: '#0D47A1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  trustBullseyePercentageText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  trustBullseyeExplanation: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#0D47A1',
  },
  trustBullseyeExplanationText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
});

export default BusinessProfileSlider;
