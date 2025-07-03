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
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MobileBottomNavigation from './MobileBottomNavigation';
import MobileHeader from './MobileHeader';
import { supabase } from './supabaseClient';
import { getSession } from './Auth';
import CreateProjectSlider from './CreateProjectSlider';

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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
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

  // Render queued business card
  const renderQueuedBusinessCard = ({ item }) => (
    <View style={styles.queuedBusinessCard}>
      <TouchableOpacity 
        style={styles.removeButton}
        onPress={() => removeBusinessFromQueue(item.id)}
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
      
      {/* Action buttons */}
      <View style={styles.cardActions}>
        <Text style={styles.actionHint}>Tap to add to project</Text>
        {projects.length > 0 && (
          <FlatList
            data={projects.slice(0, 3)} // Show only first 3 projects
            keyExtractor={project => project.id}
            renderItem={({ item: project }) => (
              <TouchableOpacity
                style={styles.projectQuickAction}
                onPress={() => moveBusinessToProject(item, project)}
              >
                <Text style={styles.projectQuickActionText} numberOfLines={1}>
                  {project.name}
                </Text>
              </TouchableOpacity>
            )}
            horizontal
            showsHorizontalScrollIndicator={false}
          />
        )}
      </View>
    </View>
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
            onPress: onRefresh
          }
        ]}
      />
      
      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your queue...</Text>
        </View>
      )}
      
      {/* Error Message */}
      {error && !loading && (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={40} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              setError(null);
              loadUserData().finally(() => setLoading(false));
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Content */}
      {!loading && !error && (
        <View style={styles.contentContainer}>
          {/* Create Project Button */}
          <View style={styles.createProjectSection}>
            <TouchableOpacity 
              style={styles.createProjectButton}
              onPress={() => {
                setSelectedProject(null);
                setIsEditingProject(false);
                setIsCreateProjectSliderVisible(true);
              }}
            >
              <MaterialIcons name="add" size={24} color={colors.textWhite} />
              <Text style={styles.createProjectButtonText}>Create New Project</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={[{ type: 'queue' }, { type: 'projects' }]}
            keyExtractor={(item, index) => `${item.type}-${index}`}
            renderItem={({ item }) => {
              if (item.type === 'queue') {
                return (
                  <View style={styles.queueSection}>
                    <View style={styles.sectionHeaderContainer}>
                      <Text style={styles.sectionHeader}>Unassigned Businesses</Text>
                      <Text style={styles.sectionSubheader}>
                        {queuedBusinesses.length === 0 
                          ? 'Search and add businesses to your queue' 
                          : `${queuedBusinesses.length} business${queuedBusinesses.length !== 1 ? 'es' : ''} in queue`}
                      </Text>
                    </View>
                    
                    {queuedBusinesses.length > 0 ? (
                      <FlatList
                        data={queuedBusinesses}
                        renderItem={renderQueuedBusinessCard}
                        keyExtractor={business => business.id}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.queuedBusinessesContainer}
                      />
                    ) : (
                      <View style={styles.emptyQueueContainer}>
                        <MaterialIcons name="business" size={40} color={colors.primaryLight} />
                        <Text style={styles.emptyQueueText}>
                          Search for businesses to add them to your queue
                        </Text>
                      </View>
                    )}
                  </View>
                );
              } else {
                return (
                  <View style={styles.projectsSection}>
                    <View style={styles.sectionHeaderContainer}>
                      <Text style={styles.sectionHeader}>My Projects</Text>
                      <Text style={styles.sectionSubheader}>
                        {projects.length} project{projects.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    
                    {projects.length > 0 ? (
                      <FlatList
                        data={projects}
                        renderItem={renderProjectCard}
                        keyExtractor={project => project.id}
                        scrollEnabled={false}
                        contentContainerStyle={styles.projectsContainer}
                      />
                    ) : (
                      <View style={styles.emptyProjectsContainer}>
                        <MaterialIcons name="folder-open" size={40} color={colors.primaryLight} />
                        <Text style={styles.emptyProjectsText}>
                          Create your first project to organize your businesses
                        </Text>
                        <TouchableOpacity 
                          style={styles.createFirstProjectButton}
                          onPress={() => {
                            setSelectedProject(null);
                            setIsEditingProject(false);
                            setIsCreateProjectSliderVisible(true);
                          }}
                        >
                          <Text style={styles.createFirstProjectText}>Create First Project</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              }
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
              />
            }
            contentContainerStyle={styles.scrollContainer}
            style={styles.scrollView}
          />
        </View>
      )}

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
          if (isEditingProject) {
            setProjects(projects.map(p => 
              p.id === project.id ? project : p
            ));
            
            createProjectInSupabase(project.id, project.name, project.description)
              .then(() => {
                Alert.alert('Project Updated', `Project "${project.name}" has been updated`);
              })
              .catch(error => {
                console.error('Error updating project in database:', error);
                Alert.alert('Warning', 'The project was updated in view, but there may have been an issue saving this change to the database.');
              });
          } else {
            setProjects([project, ...projects]);
            
            createProjectInSupabase(project.id, project.name, project.description)
              .then(() => {
                Alert.alert('Project Created', `Project "${project.name}" created successfully`);
              })
              .catch(error => {
                console.error('Error creating project in database:', error);
                Alert.alert('Warning', 'The project was created in view, but there may have been an issue saving it to the database.');
              });
          }
          
          setIsEditingProject(false);
          setSelectedProject(null);
        }}
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNavigation 
        navigation={navigation}
        activeRoute="ProjectQueue"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundWhite,
  },
  contentContainer: {
    flex: 1,
    paddingBottom: 90, // Account for bottom navigation
  },
  createProjectSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  createProjectButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createProjectButtonText: {
    color: colors.textWhite,
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.primary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.textWhite,
    fontWeight: '600',
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  sectionSubheader: {
    fontSize: 14,
    color: colors.textMedium,
  },
  
  // Queue section styles
  queueSection: {
    marginBottom: 30,
    padding: 15,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
  },
  queuedBusinessesContainer: {
    paddingVertical: 10,
  },
  queuedBusinessCard: {
    width: screenWidth * 0.4,
    maxWidth: 180,
    backgroundColor: colors.backgroundWhite,
    borderRadius: 12,
    padding: 15,
    marginRight: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  logoContainer: {
    width: 50,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  logoPlaceholder: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textWhite,
  },
  businessCardContent: {
    marginBottom: 10,
  },
  businessName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  businessIndustry: {
    fontSize: 12,
    color: colors.textMedium,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 12,
    color: colors.textDark,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    backgroundColor: colors.backgroundWhite,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  cardActions: {
    marginTop: 5,
  },
  actionHint: {
    fontSize: 10,
    color: colors.textMedium,
    marginBottom: 5,
  },
  projectQuickAction: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 5,
  },
  projectQuickActionText: {
    fontSize: 10,
    color: colors.textWhite,
    fontWeight: '500',
  },
  emptyQueueContainer: {
    alignItems: 'center',
    padding: 30,
  },
  emptyQueueText: {
    fontSize: 14,
    color: colors.textMedium,
    textAlign: 'center',
    marginTop: 10,
  },
  
  // Projects section styles
  projectsSection: {
    marginBottom: 20,
  },
  projectsContainer: {
    paddingVertical: 10,
  },
  projectCard: {
    backgroundColor: colors.backgroundWhite,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  projectName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    flex: 1,
  },
  projectActions: {
    flexDirection: 'row',
  },
  projectActionButton: {
    padding: 8,
    marginLeft: 5,
  },
  projectDescription: {
    fontSize: 14,
    color: colors.textMedium,
    marginBottom: 15,
  },
  projectBusinessesContainer: {
    minHeight: 80,
  },
  projectBusinessesList: {
    paddingVertical: 5,
  },
  projectBusinessCard: {
    width: 120,
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    padding: 10,
    marginRight: 10,
    position: 'relative',
  },
  emptyProjectContainer: {
    alignItems: 'center',
    padding: 20,
  },
  emptyProjectText: {
    fontSize: 14,
    color: colors.textMedium,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyProjectHint: {
    fontSize: 12,
    color: colors.textMedium,
    textAlign: 'center',
    marginTop: 4,
  },
  emptyProjectsContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyProjectsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textMedium,
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 20,
  },
  createFirstProjectButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  createFirstProjectText: {
    color: colors.textWhite,
    fontWeight: '600',
    fontSize: 16,
  },
});

export default ProjectQueueScreen;
