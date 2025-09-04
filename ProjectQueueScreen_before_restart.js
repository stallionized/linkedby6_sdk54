import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MobileBottomNavigation from './MobileBottomNavigation';
import MobileHeader from './MobileHeader';
import { supabase } from './supabaseClient';
import { getSession } from './Auth';
import CreateProjectSlider from './CreateProjectSlider';
import BusinessProfileSlider from './BusinessProfileSlider';
import AddToProjectSlider from './AddToProjectSlider';
import ConnectionGraphDisplay from './ConnectionGraphDisplay';

const { width: screenWidth } = Dimensions.get('window');

// Define colors
const colors = {
  backgroundWhite: '#FFFFFF',
  primary: '#0D47A1',
  primaryLight: '#1E88E5',
  textDark: '#1F2937',
  textMedium: '#6B7280',
  textWhite: '#FFFFFF',
  borderLight: '#E5E7EB',
  inputBackground: '#FFFFFF',
  inputBorder: '#D1D5DB',
  cardBackground: '#F9FAFB',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

// Function to generate a consistent color from a business name
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

// LogoContainer component for business logos
const LogoContainer = ({ business }) => {
  const mappedBusiness = {
    business_id: business.id,
    business_name: business.name,
    image_url: business.logo
  };
  
  const bgColor = mappedBusiness.image_url ? '#e9ecef' : getColorFromName(mappedBusiness.business_name || 'Business');
  
  return (
    <View style={[styles.logoContainer, { backgroundColor: bgColor }]}>
      {mappedBusiness.image_url ? (
        <Image 
          source={{ uri: mappedBusiness.image_url }}
          style={styles.logo}
          resizeMode="contain"
        />
      ) : (
        <Text style={styles.logoPlaceholder}>
          {mappedBusiness.business_name ? mappedBusiness.business_name.charAt(0).toUpperCase() : 'B'}
        </Text>
      )}
    </View>
  );
};

const ProjectQueueScreen = ({ navigation, route }) => {
  const [queuedBusinesses, setQueuedBusinesses] = useState([]);
  const [isCreateProjectSliderVisible, setIsCreateProjectSliderVisible] = useState(false);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserPhoneNumber, setCurrentUserPhoneNumber] = useState(null);
  const [currentUserFullName, setCurrentUserFullName] = useState('You');
  const [connectionPaths, setConnectionPaths] = useState({});
  const [loadingPaths, setLoadingPaths] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  // Business profile slider states
  const [businessSliderVisible, setBusinessSliderVisible] = useState(false);
  const [addToProjectSliderVisible, setAddToProjectSliderVisible] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);
  
  // Load user session and fetch data
  const loadUserData = async () => {
    try {
      setError(null);
      
      const session = await getSession();
      if (!session || !session.user) {
        setError('User not logged in');
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
      console.error('Error in loadUserData:', err);
      setError('An error occurred while loading your data');
    }
  };

  // Fetch data on screen focus
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadUserData().finally(() => setLoading(false));
    }, [])
  );

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (currentUserId) {
      await fetchUserProjectBusinesses(currentUserId);
    }
    setRefreshing(false);
  }, [currentUserId]);

  // Fetch connection paths when user phone number and businesses are available
  useEffect(() => {
    if (currentUserPhoneNumber && queuedBusinesses.length > 0) {
      console.log('🔗 Fetching connection paths for queued businesses...');
      queuedBusinesses.forEach(business => {
        // Only fetch if we don't already have a connection path for this business
        if (!connectionPaths[business.id] && !loadingPaths[business.id]) {
          fetchConnectionPath(business.id);
        }
      });
    }
  }, [currentUserPhoneNumber, queuedBusinesses]);

  // Fetch connection paths for project businesses
  useEffect(() => {
    if (currentUserPhoneNumber && projects.length > 0) {
      console.log('🔗 Fetching connection paths for project businesses...');
      projects.forEach(project => {
        project.businesses.forEach(business => {
          // Only fetch if we don't already have a connection path for this business
          if (!connectionPaths[business.id] && !loadingPaths[business.id]) {
            fetchConnectionPath(business.id);
          }
        });
      });
    }
  }, [currentUserPhoneNumber, projects]);
  
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
            state
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
          id: item.business_profiles.business_id,
          name: item.business_profiles.business_name || 'Unnamed Business',
          industry: item.business_profiles.industry || 'Unknown Industry',
          logo: item.business_profiles.image_url,
          logoBackgroundColor: item.business_profiles.image_url ? '#e9ecef' : getColorFromName(item.business_profiles.business_name || 'Business'),
          description: item.business_profiles.description || '',
          location: [item.business_profiles.city, item.business_profiles.state].filter(Boolean).join(', '),
          rating: 4.0
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
    setProjects(Array.from(projectMap.values()));
  };

  // Update business project assignment in Supabase
  const updateBusinessProject = async (businessId, projectId, projectName, projectDescription) => {
    if (!currentUserId) return;
    
    try {
      const { data: existingData, error: checkError } = await supabase
        .from('user_project_businesses')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('business_id', businessId);
        
      if (checkError) {
        throw checkError;
      }
      
      let result;
      
      if (existingData && existingData.length > 0) {
        result = await supabase
          .from('user_project_businesses')
          .update({
            project_id: projectId,
            project_name: projectName,
            project_description: projectDescription
          })
          .eq('id', existingData[0].id)
          .select();
      } else {
        result = await supabase
          .from('user_project_businesses')
          .insert({
            user_id: currentUserId,
            business_id: businessId,
            project_id: projectId,
            project_name: projectName,
            project_description: projectDescription
          })
          .select();
      }
      
      if (result.error) {
        throw result.error;
      }
      
      return result;
    } catch (err) {
      console.error('Error in updateBusinessProject:', err);
      throw err;
    }
  };
  
  // Remove business from Supabase
  const removeBusinessFromSupabase = async (businessId) => {
    if (!currentUserId) return;
    
    try {
      const { error } = await supabase
        .from('user_project_businesses')
        .delete()
        .eq('user_id', currentUserId)
        .eq('business_id', businessId);
        
      if (error) {
        console.error('Error removing business:', error);
        Alert.alert('Error', 'Failed to remove business from queue');
      }
    } catch (err) {
      console.error('Error in removeBusinessFromSupabase:', err);
      Alert.alert('Error', 'An error occurred while removing the business');
    }
  };
  
  // Create project in Supabase
  const createProjectInSupabase = async (projectId, projectName, description) => {
    if (!currentUserId) return;
    
    try {
      const { error: projectError } = await supabase
        .from('user_projects')
        .upsert({
          user_id: currentUserId,
          project_id: projectId,
          project_name: projectName,
          project_description: description,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
      if (projectError) {
        throw projectError;
      }
      
      const businessesToUpdate = projects
        .find(p => p.id === projectId)?.businesses || [];
      
      if (businessesToUpdate.length > 0) {
        for (const business of businessesToUpdate) {
          await updateBusinessProject(business.id, projectId, projectName, description);
        }
      }
    } catch (err) {
      console.error('Error in createProjectInSupabase:', err);
      throw err;
    }
  };

  // Move business to project
  const moveBusinessToProject = async (business, project) => {
    try {
      // Update local state immediately
      const updatedProjects = projects.map(p => {
        if (p.id === project.id) {
          if (!p.businesses.some(b => b.id === business.id)) {
            return {
              ...p,
              businesses: [...p.businesses, business]
            };
          }
        }
        return p;
      });
      
      const updatedQueuedBusinesses = queuedBusinesses.filter(b => b.id !== business.id);
      
      setProjects(updatedProjects);
      setQueuedBusinesses(updatedQueuedBusinesses);
      
      // Update database
      await updateBusinessProject(business.id, project.id, project.name, project.description);
    } catch (error) {
      console.error('Error moving business to project:', error);
      Alert.alert('Error', 'Failed to move business to project');
    }
  };

  // Remove business from project
  const removeBusinessFromProject = async (business, projectId) => {
    try {
      // Update local state immediately
      const updatedProjects = projects.map(p => {
        if (p.id === projectId) {
          return {
            ...p,
            businesses: p.businesses.filter(b => b.id !== business.id)
          };
        }
        return p;
      });
      
      const updatedQueuedBusinesses = [...queuedBusinesses, business];
      
      setProjects(updatedProjects);
      setQueuedBusinesses(updatedQueuedBusinesses);
      
      // Update database
      const { data: existingData } = await supabase
        .from('user_project_businesses')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('business_id', business.id);
        
      if (existingData && existingData.length > 0) {
        await supabase
          .from('user_project_businesses')
          .update({
            project_id: null,
            project_name: null,
            project_description: null
          })
          .eq('id', existingData[0].id);
      }
    } catch (error) {
      console.error('Error removing business from project:', error);
      Alert.alert('Error', 'Failed to remove business from project');
    }
  };
  
  // Remove business from queue completely
  const removeBusinessFromQueue = (businessId) => {
    setQueuedBusinesses(queuedBusinesses.filter(b => b.id !== businessId));
    removeBusinessFromSupabase(businessId);
  };
  
  // Generate a unique project ID
  const generateProjectId = () => {
    return `project_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  };

  // Delete project
  const deleteProject = async (projectId) => {
    try {
      const projectToDelete = projects.find(p => p.id === projectId);
      
      if (!projectToDelete) {
        Alert.alert('Error', 'Project not found');
        return;
      }
      
      const hasBusinesses = projectToDelete.businesses.length > 0;
      
      if (hasBusinesses) {
        Alert.alert(
          'Delete Project',
          'This project contains business cards. What would you like to do?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete Project & Businesses',
              style: 'destructive',
              onPress: () => executeProjectDeletion(projectId, 'delete')
            },
            {
              text: 'Delete Project Only',
              onPress: () => executeProjectDeletion(projectId, 'unassign')
            }
          ]
        );
      } else {
        Alert.alert(
          'Delete Project',
          'Are you sure you want to delete this project?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => executeProjectDeletion(projectId, 'none')
            }
          ]
        );
      }
    } catch (err) {
      console.error('Error in deleteProject:', err);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };
  
  // Execute project deletion
  const executeProjectDeletion = async (projectId, businessAction) => {
    try {
      const projectToDelete = projects.find(p => p.id === projectId);
      
      if (!projectToDelete) {
        Alert.alert('Error', 'Project not found');
        return;
      }
      
      // Update local state
      if (projectToDelete.businesses.length > 0 && businessAction === 'unassign') {
        setQueuedBusinesses([...queuedBusinesses, ...projectToDelete.businesses]);
      }
      
      setProjects(projects.filter(p => p.id !== projectId));
      
      // Update database
      if (businessAction === 'delete') {
        await Promise.all([
          deleteProjectFromSupabase(projectId),
          ...projectToDelete.businesses.map(business => removeBusinessFromSupabase(business.id))
        ]);
      } else {
        await deleteProjectFromSupabase(projectId);
      }
      
      Alert.alert('Success', 'Project deleted successfully');
    } catch (error) {
      console.error('Error deleting project:', error);
      Alert.alert('Error', 'Failed to delete project');
    }
  };

  // Delete project from Supabase
  const deleteProjectFromSupabase = async (projectId) => {
    if (!currentUserId) return;
    
    try {
      const { data: projectBusinesses } = await supabase
        .from('user_project_businesses')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('project_id', projectId);
        
      for (const item of projectBusinesses || []) {
        await supabase
          .from('user_project_businesses')
          .update({
            project_id: null,
            project_name: null,
            project_description: null
          })
          .eq('id', item.id);
      }
      
      await supabase
        .from('user_projects')
        .delete()
        .eq('user_id', currentUserId)
        .eq('project_id', projectId);
    } catch (err) {
      console.error('Error deleting project from Supabase:', err);
      throw err;
    }
  };

  // Fetch connection path for a business
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

  // Render queued business card (full-width like RecommendedBusinessesScreen)
  const renderQueuedBusinessCard = ({ item }) => (
    <TouchableOpacity style={styles.businessCard} onPress={() => handleBusinessPress(item.id)}>
      <View style={styles.businessCardHeader}>
        <TouchableOpacity onPress={() => handleBusinessLogoPress(item.id)}>
          <LogoContainer business={item} />
        </TouchableOpacity>
        
        <View style={styles.businessCardInfo}>
          <Text style={styles.businessName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.businessIndustry} numberOfLines={1}>{item.industry}</Text>
          {item.location && (
            <View style={styles.businessLocation}>
              <Ionicons name="location-outline" size={14} color={colors.textMedium} />
              <Text style={styles.businessLocationText} numberOfLines={1}>{item.location}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.businessCardActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => removeBusinessFromQueue(item.id)}
          >
            <Ionicons name="close" size={20} color={colors.error} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleAddToProjectClick(item.id)}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.primaryLight} />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Six Degrees Connection Visualization */}
      <View style={styles.connectionVisualization}>
        {loadingPaths[item.id] ? (
          <View style={styles.connectionContainer}>
            <ActivityIndicator size="small" color={colors.primaryLight} />
            <Text style={styles.connectionText}>Finding connection...</Text>
          </View>
        ) : connectionPaths[item.id] ? (
          connectionPaths[item.id].found && connectionPaths[item.id].data ? (
            <View style={styles.connectionFound}>
              <ConnectionGraphDisplay 
                pathData={connectionPaths[item.id].raw}
                businessName={item.name}
                currentUserFullName={currentUserFullName}
                compact={true}
              />
            </View>
          ) : (
            <View style={styles.connectionContainer}>
              <Ionicons name="people-outline" size={16} color={colors.textMedium} />
              <Text style={styles.connectionText}>
                {connectionPaths[item.id].message || "No connection within 6 degrees"}
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

  // Render project business card
  const renderProjectBusinessCard = ({ item, projectId }) => (
    <View style={styles.projectBusinessCard}>
      <TouchableOpacity 
        style={styles.removeButton}
        onPress={() => removeBusinessFromProject(item, projectId)}
      >
        <MaterialIcons name="close" size={18} color={colors.error} />
      </TouchableOpacity>
      
      <LogoContainer business={item} />
      <View style={styles.businessCardContent}>
        <Text style={styles.businessName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.businessIndustry} numberOfLines={1}>{item.industry}</Text>
        <View style={styles.ratingContainer}>
          <MaterialIcons name="star" size={16} color="#FFD700" />
          <Text style={styles.ratingText}>{item.rating || "4"}</Text>
        </View>
      </View>
    </View>
  );

  // Render project card
  const renderProjectCard = ({ item }) => (
    <View style={styles.projectCard}>
      <View style={styles.projectHeader}>
        <Text style={styles.projectName}>{item.name}</Text>
        <View style={styles.projectActions}>
          <TouchableOpacity 
            style={styles.projectActionButton}
            onPress={() => {
              setSelectedProject(item);
              setIsEditingProject(true);
              setIsCreateProjectSliderVisible(true);
            }}
          >
            <MaterialIcons name="edit" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.projectActionButton}
            onPress={() => deleteProject(item.id)}
          >
            <MaterialIcons name="delete" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
      
      <Text style={styles.projectDescription} numberOfLines={2}>
        {item.description || 'No description provided'}
      </Text>
      
      <View style={styles.projectBusinessesContainer}>
        {item.businesses.length > 0 ? (
          <FlatList
            data={item.businesses}
            renderItem={({ item: business }) => renderProjectBusinessCard({ item: business, projectId: item.id })}
            keyExtractor={business => business.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.projectBusinessesList}
          />
        ) : (
          <View style={styles.emptyProjectContainer}>
            <Text style={styles.emptyProjectText}>
              No businesses assigned yet
            </Text>
            <Text style={styles.emptyProjectHint}>
              Move businesses from the queue above
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      
      {/* Mobile Header */}
      <MobileHeader 
        navigation={navigation}
        title="My Queue"
        showBackButton={false}
        rightActions={[
          {
            icon: 'refresh',
            onPress:
