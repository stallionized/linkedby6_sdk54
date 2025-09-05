import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from './supabaseClient';
import { getSession } from './Auth';
import { useFocusEffect } from '@react-navigation/native';

// Import mobile components
import MobileHeader from './MobileHeader';
import MobileBottomNavigation from './MobileBottomNavigation';
import BusinessProfileSlider from './BusinessProfileSlider';
import AddToProjectSlider from './AddToProjectSlider';
import ConnectionGraphDisplay from './ConnectionGraphDisplay';
import CreateProjectSlider from './CreateProjectSlider';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Colors palette (matching RecommendedBusinessesScreen)
const colors = {
  primaryBlue: '#1E88E5',
  lightBlue: '#90CAF9',
  darkBlue: '#0D47A1',
  backgroundGray: '#F5F7FA',
  cardWhite: '#FFFFFF',
  textDark: '#263238',
  textMedium: '#546E7A',
  textLight: '#90A4AE',
  borderLight: '#E0E7FF',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

// Function to generate consistent color from business name (same as RecommendedBusinessesScreen)
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

// Business Logo Component (same as RecommendedBusinessesScreen)
const BusinessLogo = ({ business }) => {
  const [bgColor, setBgColor] = useState(getColorFromName(business.business_name || 'Business'));
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Function to extract dominant color from image
  const extractDominantColor = async (imageUri) => {
    try {
      // For now, we'll use a smart color extraction based on the business name and industry
      // This provides better color matching than random colors
      const businessName = business.business_name?.toLowerCase() || '';
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
      return getColorFromName(business.business_name || 'Business');
    }
  };
  
  // Update background color when image loads
  const handleImageLoad = async () => {
    setImageLoaded(true);
    if (business.image_url) {
      const dominantColor = await extractDominantColor(business.image_url);
      setBgColor(dominantColor);
    }
  };
  
  // Set initial color based on business info
  React.useEffect(() => {
    const setInitialColor = async () => {
      const smartColor = await extractDominantColor(business.image_url);
      setBgColor(smartColor);
    };
    setInitialColor();
  }, [business.business_name, business.industry]);
  
  return (
    <View style={[styles.businessLogo, { backgroundColor: bgColor }]}>
      {business.image_url ? (
        <Image 
          source={{ uri: business.image_url }} 
          style={styles.businessLogoImage}
          onLoad={handleImageLoad}
          onError={() => setImageLoaded(false)}
        />
      ) : (
        <Text style={styles.businessLogoText}>
          {business.business_name ? business.business_name.charAt(0).toUpperCase() : 'B'}
        </Text>
      )}
    </View>
  );
};

// Business Card Component (same layout as RecommendedBusinessesScreen)
const BusinessCard = ({ 
  business, 
  onPress, 
  onAddToProject, 
  onBusinessLogoPress,
  onRemove,
  connectionPath,
  loadingConnection,
  currentUserFullName,
  showRemoveButton = false
}) => {
  return (
    <TouchableOpacity style={styles.businessCard} onPress={() => onPress(business.business_id)}>
      <View style={styles.businessCardHeader}>
        <TouchableOpacity onPress={() => onBusinessLogoPress(business.business_id)}>
          <BusinessLogo business={business} />
        </TouchableOpacity>
        
        <View style={styles.businessCardInfo}>
          <Text style={styles.businessName} numberOfLines={2}>{business.business_name}</Text>
          {business.industry && (
            <Text style={styles.businessIndustry} numberOfLines={1}>{business.industry}</Text>
          )}
          <View style={styles.businessLocation}>
            <Ionicons name="location-outline" size={14} color={colors.textMedium} />
            <Text style={styles.businessLocationText} numberOfLines={1}>
              {business.city && business.state ? `${business.city}, ${business.state}` : 
               business.zip_code || 'Location not specified'}
            </Text>
          </View>
          
          {/* Coverage Info */}
          {business.coverage_type && (
            <View style={styles.coverageInfo}>
              <Ionicons name="business-outline" size={12} color={colors.textMedium} />
              <Text style={styles.coverageText}>
                {business.coverage_type.charAt(0).toUpperCase() + business.coverage_type.slice(1)}
                {business.coverage_type === 'local' && business.coverage_radius && 
                  ` (${business.coverage_radius}mi)`}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.businessCardActions}>
          {showRemoveButton && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onRemove(business.business_id)}
            >
              <Ionicons name="close" size={20} color={colors.error} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onAddToProject(business.business_id)}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.primaryBlue} />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Six Degrees Connection Visualization */}
      <View style={styles.connectionVisualization}>
        {loadingConnection ? (
          <View style={styles.connectionContainer}>
            <ActivityIndicator size="small" color={colors.primaryBlue} />
            <Text style={styles.connectionText}>Finding connection...</Text>
          </View>
        ) : connectionPath ? (
          connectionPath.found && connectionPath.data ? (
            <View style={styles.connectionFound}>
              <ConnectionGraphDisplay 
                pathData={connectionPath.raw}
                businessName={business.business_name}
                currentUserFullName={currentUserFullName}
                compact={true} // Mobile compact version
              />
            </View>
          ) : (
            <View style={styles.connectionContainer}>
              <Ionicons name="people-outline" size={16} color={colors.textMedium} />
              <Text style={styles.connectionText}>
                {connectionPath.message || "No connection within 6 degrees"}
              </Text>
            </View>
          )
        ) : (
          <View style={styles.connectionContainer}>
            <Image 
              source={require('./assets/cropped_6_degrees_network_map.png')} 
              style={styles.networkImage}
              resizeMode="contain"
            />
            <Text style={styles.connectionText}>Connection network</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const ProjectQueueScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [queuedBusinesses, setQueuedBusinesses] = useState([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserPhoneNumber, setCurrentUserPhoneNumber] = useState(null);
  const [currentUserFullName, setCurrentUserFullName] = useState('You');
  const [connectionPaths, setConnectionPaths] = useState({});
  const [loadingPaths, setLoadingPaths] = useState({});
  
  // Project management states
  const [isCreateProjectSliderVisible, setIsCreateProjectSliderVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isEditingProject, setIsEditingProject] = useState(false);
  
  // Business profile slider states
  const [businessSliderVisible, setBusinessSliderVisible] = useState(false);
  const [addToProjectSliderVisible, setAddToProjectSliderVisible] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);

  // Load user data and queue
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const session = await getSession();
        if (!session) {
          setError('Please log in to view your project queue');
          setIsLoading(false);
          return;
        }
        
        setCurrentUserId(session.user.id);
        
        // Fetch user profile data
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('user_phone_number, full_name')
          .eq('user_id', session.user.id)
          .single();
          
        if (profileError && profileError.code !== 'PGRST116') {
          console.error('❌ Error fetching user profile data:', profileError);
        } else if (profileData) {
          if (profileData.user_phone_number) {
            setCurrentUserPhoneNumber(profileData.user_phone_number);
            console.log('✅ User phone number loaded from profile:', profileData.user_phone_number);
          } else if (session.user.phone) {
            setCurrentUserPhoneNumber(session.user.phone);
            console.log('✅ User phone number loaded from auth:', session.user.phone);
          }
          
          if (profileData.full_name) {
            setCurrentUserFullName(profileData.full_name);
            console.log('✅ User full name loaded:', profileData.full_name);
          } else if (session.user.user_metadata?.full_name) {
            setCurrentUserFullName(session.user.user_metadata.full_name);
          }
        }
        
        await fetchUserProjectBusinesses(session.user.id);
      } catch (err) {
        console.error('Error loading user data:', err);
        setError('Failed to load your project queue');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUserData();
  }, []);

  // Refresh queue when screen is focused
  useFocusEffect(
    useCallback(() => {
      const refreshQueue = async () => {
        if (currentUserId) {
          console.log('🔄 Screen focused - refreshing project queue');
          try {
            await fetchUserProjectBusinesses(currentUserId);
          } catch (err) {
            console.error('Error refreshing queue on focus:', err);
          }
        }
      };
      
      refreshQueue();
    }, [currentUserId])
  );

  // Filter businesses when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredBusinesses(queuedBusinesses);
    } else {
      const filtered = queuedBusinesses.filter(
        business => 
          business.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          business.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (business.city && business.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (business.state && business.state.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredBusinesses(filtered);
    }
  }, [searchQuery, queuedBusinesses]);

  // Fetch connection paths when user phone number and businesses are available
  useEffect(() => {
    if (currentUserPhoneNumber && queuedBusinesses.length > 0) {
      console.log('🔗 Fetching connection paths for queued businesses...');
      queuedBusinesses.forEach(business => {
        // Only fetch if we don't already have a connection path for this business
        if (!connectionPaths[business.business_id] && !loadingPaths[business.business_id]) {
          fetchConnectionPath(business.business_id);
        }
      });
    }
  }, [currentUserPhoneNumber, queuedBusinesses]);

  // Fetch user's project businesses from Supabase
  const fetchUserProjectBusinesses = async (userId) => {
    try {
      console.log('Fetching project businesses for user:', userId);
      
      const { data: projectBusinesses, error: fetchError } = await supabase
        .from('user_project_businesses')
        .select(`
          id,
          user_id,
          business_id,
          project_id,
          project_name,
          project_description,
          business_profiles:business_id(
            business_id,
            business_name,
            industry,
            image_url,
            description,
            city,
            state,
            zip_code,
            coverage_type,
            coverage_details,
            coverage_radius
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (fetchError) {
        console.error('Error fetching project businesses:', fetchError);
        setError('Failed to load your queue data');
        return;
      }
      
      const { data: standaloneProjects, error: projectsError } = await supabase
        .from('user_projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (projectsError) {
        console.error('Error fetching standalone projects:', projectsError);
      }
      
      processProjectBusinesses(projectBusinesses || [], standaloneProjects || []);
    } catch (err) {
      console.error('Error in fetchUserProjectBusinesses:', err);
      setError('Failed to load your queue data');
    }
  };
  
  // Process project businesses data
  const processProjectBusinesses = (projectBusinesses, standaloneProjects = []) => {
    const projectMap = new Map();
    const unassignedBusinesses = [];
    
    if (projectBusinesses && projectBusinesses.length > 0) {
      projectBusinesses.forEach(item => {
        if (!item.business_profiles) {
          return;
        }
        
        const business = {
          business_id: item.business_profiles.business_id,
          business_name: item.business_profiles.business_name || 'Unnamed Business',
          industry: item.business_profiles.industry || 'Unknown Industry',
          image_url: item.business_profiles.image_url,
          description: item.business_profiles.description || '',
          city: item.business_profiles.city,
          state: item.business_profiles.state,
          zip_code: item.business_profiles.zip_code,
          coverage_type: item.business_profiles.coverage_type,
          coverage_details: item.business_profiles.coverage_details,
          coverage_radius: item.business_profiles.coverage_radius
        };
        
        if (item.project_id && item.project_name) {
          if (!projectMap.has(item.project_id)) {
            projectMap.set(item.project_id, {
              id: item.project_id,
              name: item.project_name,
              description: item.project_description || '',
              businesses: [],
              createdAt: new Date().toISOString(),
              status: 'Active'
            });
          }
          
          const project = projectMap.get(item.project_id);
          project.businesses.push(business);
        } else {
          unassignedBusinesses.push(business);
        }
      });
    }
    
    if (standaloneProjects && standaloneProjects.length > 0) {
      standaloneProjects.forEach(project => {
        if (!projectMap.has(project.project_id)) {
          projectMap.set(project.project_id, {
            id: project.project_id,
            name: project.project_name,
            description: project.project_description || '',
            businesses: [],
            createdAt: project.created_at,
            status: 'Active'
          });
        }
      });
    }
    
    setQueuedBusinesses(unassignedBusinesses);
    setFilteredBusinesses(unassignedBusinesses);
    setProjects(Array.from(projectMap.values()));
  };

  // Fetch connection path
  const fetchConnectionPath = async (businessId) => {
    if (!currentUserPhoneNumber || !businessId) {
      console.warn(`Cannot fetch connection path for businessId: ${businessId}. Missing user phone or business ID.`);
      setConnectionPaths(prev => ({ 
        ...prev, 
        [businessId]: { found: false, message: "Connection search unavailable" } 
      }));
      return;
    }
    
    setLoadingPaths(prev => ({ ...prev, [businessId]: true }));
    
    try {
      const backendUrl = 'https://neo4j-query-service.onrender.com';
      
      const cypherQuery = `
        MATCH (start:Person {phone: "${currentUserPhoneNumber}"})
        MATCH (target:Business {business_id: "${businessId}"})
        MATCH path = shortestPath((start)-[:FAMILY_MEMBER|FRIEND|OWNS|EMPLOYEE_OF*..6]-(target))
        RETURN path, length(path) AS degrees
      `;
      
      console.log('🔍 Sending Cypher query to neo4j-query-service for business:', businessId);
      
      const response = await fetch(`${backendUrl}/execute-cypher`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: cypherQuery }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          message: `Failed to fetch connection path: ${response.status}` 
        }));
        throw new Error(errorData.message || `Failed to fetch connection path: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.records && data.records.length > 0) {
        console.log(`✅ Connection path found for business ${businessId}`);
        setConnectionPaths(prev => ({ 
          ...prev, 
          [businessId]: { found: true, data: data.records, raw: data } 
        }));
      } else {
        console.log(`❌ No connection found for business ${businessId}`);
        setConnectionPaths(prev => ({ 
          ...prev, 
          [businessId]: { found: false, message: "No connection within 6 degrees" } 
        }));
      }
    } catch (error) {
      console.warn(`⚠️ Error fetching connection path for business ${businessId}:`, error.message);
      setConnectionPaths(prev => ({ 
        ...prev, 
        [businessId]: { found: false, message: "Connection search unavailable" } 
      }));
    } finally {
      setLoadingPaths(prev => ({ ...prev, [businessId]: false }));
    }
  };

  // Remove business from queue
  const removeBusinessFromQueue = async (businessId) => {
    if (!currentUserId) {
      Alert.alert("Error", "You must be logged in to manage your queue.");
      return;
    }

    const business = queuedBusinesses.find(b => b.business_id === businessId);
    const businessName = business?.business_name || 'this business';
    
    Alert.alert(
      "Remove from Queue",
      `Are you sure you want to remove "${businessName}" from your queue?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('user_project_businesses')
                .delete()
                .match({ user_id: currentUserId, business_id: businessId });
              if (error) throw error;
              
              // Update local state
              const updatedBusinesses = queuedBusinesses.filter(business => business.business_id !== businessId);
              setQueuedBusinesses(updatedBusinesses);
              setFilteredBusinesses(updatedBusinesses.filter(business => 
                business.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                business.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (business.city && business.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (business.state && business.state.toLowerCase().includes(searchQuery.toLowerCase()))
              ));
              
              Alert.alert("Success", `"${businessName}" has been removed from your queue.`);
            } catch (error) {
              console.error('Error removing from queue:', error);
              Alert.alert("Error", "Could not remove business from queue. Please try again.");
            }
          }
        }
      ]
    );
  };

  // Handle business card press
  const handleBusinessPress = (businessId) => {
    setSelectedBusinessId(businessId);
    setBusinessSliderVisible(true);
  };

  // Handle business logo press
  const handleBusinessLogoPress = (businessId) => {
    setSelectedBusinessId(businessId);
    setBusinessSliderVisible(true);
  };

  // Handle add to project
  const handleAddToProjectClick = (businessId) => {
    setSelectedBusinessId(businessId);
    setAddToProjectSliderVisible(true);
  };

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (currentUserId) {
      await fetchUserProjectBusinesses(currentUserId);
    }
    setRefreshing(false);
  }, [currentUserId]);

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <MobileHeader navigation={navigation} title="My Queue" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primaryBlue} />
          <Text style={styles.loadingText}>Loading your project queue...</Text>
        </View>
        <MobileBottomNavigation navigation={navigation} activeRoute="ProjectQueue" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <MobileHeader
        navigation={navigation}
        title="My Queue"
      />

      {/* Main Content */}
      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search-outline" size={20} color={colors.textMedium} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search your queue..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.textLight}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch}>
                <Ionicons name="close-circle" size={20} color={colors.textMedium} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Content Area */}
        <ScrollView
          style={styles.mainContent}
          contentContainerStyle={styles.resultsContent}
          showsVerticalScrollIndicator={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primaryBlue]}
            />
          }
        >
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : filteredBusinesses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="business-outline" size={64} color={colors.textLight} />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No matching businesses found' : 'Your queue is empty'}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery 
                  ? 'Try adjusting your search terms' 
                  : 'Search for businesses and add them to your queue to get started'
                }
              </Text>
              {!searchQuery && (
                <TouchableOpacity 
                  style={styles.findBusinessButton} 
                  onPress={() => navigation.navigate('Search')}
                >
                  <Ionicons name="search-outline" size={20} color={colors.cardWhite} />
                  <Text style={styles.findBusinessButtonText}>Find Businesses</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <>
              <Text style={styles.resultsCount}>
                Found {filteredBusinesses.length} business{filteredBusinesses.length !== 1 ? 'es' : ''}
                {searchQuery && ` for "${searchQuery}"`}
              </Text>
              
              {filteredBusinesses.map((business) => (
                <BusinessCard
                  key={business.business_id}
                  business={business}
                  onPress={handleBusinessPress}
                  onBusinessLogoPress={handleBusinessLogoPress}
                  onAddToProject={handleAddToProjectClick}
                  onRemove={removeBusinessFromQueue}
                  showRemoveButton={true}
                  connectionPath={connectionPaths[business.business_id]}
                  loadingConnection={loadingPaths[business.business_id]}
                  currentUserFullName={currentUserFullName}
                />
              ))}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Create Project Slider */}
      <CreateProjectSlider 
        isVisible={isCreateProjectSliderVisible}
        onClose={() => {
          setIsCreateProjectSliderVisible(false);
          setIsEditingProject(false);
          setSelectedProject(null);
        }}
        project={isEditingProject ? selectedProject : null}
        onSave={(project) => {
          // Handle project creation/editing logic here
          setIsEditingProject(false);
          setSelectedProject(null);
        }}
      />

      {/* Business Profile Slider */}
      <BusinessProfileSlider
        isVisible={businessSliderVisible}
        onClose={() => setBusinessSliderVisible(false)}
        businessId={selectedBusinessId}
        userId={currentUserId}
        viewSource="project_queue"
      />

      {/* Add to Project Slider */}
      <AddToProjectSlider
        isVisible={addToProjectSliderVisible}
        onClose={() => setAddToProjectSliderVisible(false)}
        businessId={selectedBusinessId}
        userId={currentUserId}
      />

      {/* Bottom Navigation */}
      <MobileBottomNavigation navigation={navigation} activeRoute="ProjectQueue" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
  },
  content: {
    flex: 1,
    marginBottom: 70, // Space for bottom navigation
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textMedium,
    fontWeight: '500',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.cardWhite,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundGray,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textDark,
    marginLeft: 8,
    marginRight: 8,
  },
  mainContent: {
    flex: 1,
  },
  resultsContent: {
    padding: 16,
    paddingBottom: 32,
  },
  resultsCount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: 16,
  },
  businessCard: {
    backgroundColor: colors.cardWhite,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  businessCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  businessLogo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  businessLogoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    resizeMode: 'contain',
  },
  businessLogoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.cardWhite,
  },
  businessCardInfo: {
    flex: 1,
    marginRight: 8,
  },
  businessName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textDark,
    marginBottom: 4,
    lineHeight: 22,
  },
  businessIndustry: {
    fontSize: 14,
    color: colors.textMedium,
    marginBottom: 6,
    fontWeight: '500',
  },
  businessLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  businessLocationText: {
    fontSize: 12,
    color: colors.textMedium,
    marginLeft: 4,
  },
  coverageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coverageText: {
    fontSize: 12,
    color: colors.textMedium,
    marginLeft: 4,
    fontWeight: '500',
  },
  businessCardActions: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    padding: 8,
    marginVertical: 2,
    borderRadius: 20,
  },
  connectionVisualization: {
    backgroundColor: colors.backgroundGray,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    minHeight: 60,
    justifyContent: 'center',
  },
  connectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionFound: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionText: {
    fontSize: 12,
    color: colors.textMedium,
    marginLeft: 8,
    fontWeight: '500',
  },
  networkImage: {
    height: 32,
    width: 60,
    marginRight: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyText: {
    marginTop: 24,
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textMedium,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  findBusinessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryBlue,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  findBusinessButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.cardWhite,
    marginLeft: 8,
  },
});

export default ProjectQueueScreen;
