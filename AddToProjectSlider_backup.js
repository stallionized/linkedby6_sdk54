import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator,
  FlatList,
  Alert,
  Modal,
  SafeAreaView,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { supabase } from './supabaseClient';
import { getSession } from './Auth';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
  backdrop: 'rgba(0, 0, 0, 0.5)',
};

const AddToProjectSlider = ({ isVisible, onClose, businessId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [businessData, setBusinessData] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [isCreatingNewProject, setIsCreatingNewProject] = useState(false);

  // Load user session and fetch data
  useEffect(() => {
    if (isVisible && businessId) {
      loadData();
    }
  }, [isVisible, businessId]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isVisible) {
      setSelectedProjectId(null);
      setIsCreatingNewProject(false);
      setNewProjectName('');
      setNewProjectDescription('');
      setError(null);
    }
  }, [isVisible]);

  // Load all necessary data
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get current user session
      const session = await getSession();
      if (!session || !session.user) {
        setError('User not logged in');
        setLoading(false);
        return;
      }
      
      setCurrentUserId(session.user.id);
      
      // Fetch business data
      await fetchBusinessData(businessId);
      
      // Fetch user's projects
      await fetchUserProjects(session.user.id);
      
    } catch (err) {
      console.error('Error loading data:', err);
      setError('An error occurred while loading data');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch business data
  const fetchBusinessData = async (id) => {
    try {
      const { data, error } = await supabase
        .from('business_profiles')
        .select('business_id, business_name, industry, image_url')
        .eq('business_id', id)
        .single();
        
      if (error) {
        throw error;
      }
      
      if (data) {
        setBusinessData(data);
      } else {
        setError('Business not found');
      }
    } catch (err) {
      console.error('Error fetching business data:', err);
      setError('Failed to load business data');
    }
  };
  
  // Fetch user's projects
  const fetchUserProjects = async (userId) => {
    try {
      // Create a map to deduplicate projects
      const projectMap = new Map();
      
      // Get all unique projects from user_project_businesses
      const { data: projectBusinesses, error: pbError } = await supabase
        .from('user_project_businesses')
        .select('project_id, project_name')
        .eq('user_id', userId)
        .not('project_id', 'is', null);
        
      if (pbError) {
        throw pbError;
      }
      
      if (projectBusinesses && projectBusinesses.length > 0) {
        projectBusinesses.forEach(item => {
          if (item.project_id && item.project_name) {
            projectMap.set(item.project_id, {
              id: item.project_id,
              name: item.project_name
            });
          }
        });
      }
      
      // Also fetch standalone projects from user_projects table
      const { data: standaloneProjects, error: projectsError } = await supabase
        .from('user_projects')
        .select('project_id, project_name')
        .eq('user_id', userId);
        
      if (projectsError) {
        console.error('Error fetching standalone projects:', projectsError);
        // Non-critical error, continue with what we have
      } else if (standaloneProjects && standaloneProjects.length > 0) {
        standaloneProjects.forEach(project => {
          if (!projectMap.has(project.project_id)) {
            projectMap.set(project.project_id, {
              id: project.project_id,
              name: project.project_name
            });
          }
        });
      }
      
      // Convert map to array
      const projectsArray = Array.from(projectMap.values());
      console.log('Fetched projects:', projectsArray.length);
      setProjects(projectsArray);
    } catch (err) {
      console.error('Error fetching user projects:', err);
      setError('Failed to load projects');
    }
  };
  
  // Add business to project
  const addBusinessToProject = async (projectId, projectName, projectDescription = '') => {
    if (!currentUserId || !businessId) {
      console.error('Missing user ID or business ID');
      return;
    }
    
    try {
      setLoading(true);
      console.log(`Adding business ${businessId} to project ${projectId} in database`);
      
      // Check if business is already in any project
      const { data: existingData, error: existingError } = await supabase
        .from('user_project_businesses')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('business_id', businessId);
        
      if (existingError) {
        throw existingError;
      }
      
      let result;
      
      if (existingData && existingData.length > 0) {
        // Update existing record
        console.log(`Found existing record with ID ${existingData[0].id}, updating...`);
        
        result = await supabase
          .from('user_project_businesses')
          .update({
            project_id: projectId,
            project_name: projectName,
            project_description: projectDescription
          })
          .eq('id', existingData[0].id);
          
        if (result.error) {
          console.error('Error updating business project:', result.error);
          throw result.error;
        }
      } else {
        // Insert new record
        console.log(`No existing record found, inserting new record...`);
        
        result = await supabase
          .from('user_project_businesses')
          .insert({
            user_id: currentUserId,
            business_id: businessId,
            project_id: projectId,
            project_name: projectName,
            project_description: projectDescription
          });
          
        if (result.error) {
          console.error('Error inserting business project:', result.error);
          throw result.error;
        }
      }
      
      console.log(`Business ${businessId} successfully assigned to project ${projectId}`);
      console.log('Database update result:', result);
      
      // Show success message
      Alert.alert(
        'Success',
        `Business added to ${projectName}`,
        [{ text: 'OK', onPress: onClose }]
      );
      
      return result;
    } catch (err) {
      console.error('Error adding business to project:', err);
      Alert.alert('Error', 'Failed to add business to project');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Add business to unassigned queue
  const addBusinessToQueue = async () => {
    if (!currentUserId || !businessId) {
      console.error('Missing user ID or business ID');
      return;
    }
    
    try {
      setLoading(true);
      
      // Check if business is already in the queue
      const { data: existingData, error: existingError } = await supabase
        .from('user_project_businesses')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('business_id', businessId);
        
      if (existingError) {
        throw existingError;
      }
      
      if (existingData && existingData.length > 0) {
        // Update existing record to remove project assignment
        const { error: updateError } = await supabase
          .from('user_project_businesses')
          .update({
            project_id: null,
            project_name: null
          })
          .eq('user_id', currentUserId)
          .eq('business_id', businessId);
          
        if (updateError) {
          throw updateError;
        }
      } else {
        // Insert new record without project assignment
        const { error: insertError } = await supabase
          .from('user_project_businesses')
          .insert({
            user_id: currentUserId,
            business_id: businessId,
            project_id: null,
            project_name: null
          });
          
        if (insertError) {
          throw insertError;
        }
      }
      
      // Show success message
      Alert.alert(
        'Success',
        'Business added to your queue',
        [{ text: 'OK', onPress: onClose }]
      );
      
    } catch (err) {
      console.error('Error adding business to queue:', err);
      Alert.alert('Error', 'Failed to add business to queue');
    } finally {
      setLoading(false);
    }
  };
  
  // Generate a unique project ID
  const generateProjectId = () => {
    // Generate a unique string ID with timestamp and random string
    return `project_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  };
  
  // Create new project and add business to it
  const createNewProject = async () => {
    if (!newProjectName.trim()) {
      Alert.alert('Error', 'Please enter a project name');
      return;
    }
    
    try {
      setLoading(true);
      
      // Generate a unique ID for the project
      const projectId = generateProjectId();
      
      console.log(`Creating project with ID: ${projectId}`);
      
      // Create an entry in the user_projects table
      const { error: projectError } = await supabase
        .from('user_projects')
        .upsert({
          user_id: currentUserId,
          project_id: projectId,
          project_name: newProjectName,
          project_description: newProjectDescription,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
      if (projectError) {
        console.error('Error creating project in user_projects:', projectError);
        throw projectError;
      }
      
      console.log(`Project ${projectId} successfully created in database`);
      
      // Add business to the new project
      await addBusinessToProject(projectId, newProjectName, newProjectDescription);
      
      console.log(`Business ${businessId} successfully added to project ${projectId}`);
      
      // Reset form
      setNewProjectName('');
      setNewProjectDescription('');
      setIsCreatingNewProject(false);
      
    } catch (err) {
      console.error('Error in createNewProject:', err);
      Alert.alert('Error', 'Failed to create project. Please try again.');
      setLoading(false);
    }
  };
  
  // Handle adding to selected project
  const handleAddToProject = async () => {
    if (isCreatingNewProject) {
      await createNewProject();
    } else if (selectedProjectId) {
      const project = projects.find(p => p.id === selectedProjectId);
      if (project) {
        try {
          // Fetch project description if available
          const { data, error } = await supabase
            .from('user_project_businesses')
            .select('project_description')
            .eq('project_id', project.id)
            .eq('user_id', currentUserId)
            .limit(1)
            .single();
            
          const description = data?.project_description || '';
          await addBusinessToProject(project.id, project.name, description);
        } catch (err) {
          console.error('Error fetching project description:', err);
          // Proceed without description if there's an error
          await addBusinessToProject(project.id, project.name, '');
        }
      }
    } else {
      await addBusinessToQueue();
    }
  };
  
  // Render a project item
  const renderProjectItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.projectItem,
        selectedProjectId === item.id && styles.selectedProjectItem
      ]}
      onPress={() => {
        setSelectedProjectId(item.id);
        setIsCreatingNewProject(false);
      }}
      activeOpacity={0.7}
    >
      <MaterialIcons
        name={selectedProjectId === item.id ? "radio-button-checked" : "radio-button-unchecked"}
        size={24}
        color={selectedProjectId === item.id ? colors.primary : colors.textMedium}
      />
      <Text style={styles.projectName}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={40} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={loadData}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Business Info */}
        {businessData && (
          <View style={styles.businessInfo}>
            <Text style={styles.businessName}>{businessData.business_name}</Text>
            <Text style={styles.businessIndustry}>{businessData.industry}</Text>
          </View>
        )}
        
        {/* Unassigned Option */}
        <TouchableOpacity
          style={[
            styles.projectItem,
            selectedProjectId === null && !isCreatingNewProject && styles.selectedProjectItem
          ]}
          onPress={() => {
            setSelectedProjectId(null);
            setIsCreatingNewProject(false);
          }}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name={selectedProjectId === null && !isCreatingNewProject ? "radio-button-checked" : "radio-button-unchecked"}
            size={24}
            color={selectedProjectId === null && !isCreatingNewProject ? colors.primary : colors.textMedium}
          />
          <Text style={styles.projectName}>Unassigned</Text>
        </TouchableOpacity>
        
        {/* Projects List */}
        <Text style={styles.sectionTitle}>Existing Projects</Text>
        {projects.length > 0 ? (
          <FlatList
            data={projects}
            renderItem={renderProjectItem}
            keyExtractor={item => item.id}
            style={styles.projectsList}
            scrollEnabled={false}
          />
        ) : (
          <Text style={styles.noProjectsText}>No projects found</Text>
        )}
        
        {/* Create New Project Option */}
        {!isCreatingNewProject ? (
          <TouchableOpacity
            style={styles.createNewButton}
            onPress={() => {
              setIsCreatingNewProject(true);
              setSelectedProjectId(null);
            }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="add" size={24} color={colors.primary} />
            <Text style={styles.createNewText}>Create New Project</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.createNewForm}>
            <Text style={styles.formTitle}>Create New Project</Text>
            <TextInput
              style={styles.input}
              placeholder="Project Name"
              value={newProjectName}
              onChangeText={setNewProjectName}
              placeholderTextColor={colors.textMedium}
              autoCapitalize="words"
              returnKeyType="next"
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Project Description (optional)"
              value={newProjectDescription}
              onChangeText={setNewProjectDescription}
              multiline
              numberOfLines={4}
              placeholderTextColor={colors.textMedium}
              autoCapitalize="sentences"
              returnKeyType="done"
            />
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setIsCreatingNewProject(false);
                  setNewProjectName('');
                  setNewProjectDescription('');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.createButton]}
                onPress={createNewProject}
                activeOpacity={0.7}
                disabled={!newProjectName.trim()}
              >
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <StatusBar style="dark" />
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView 
            style={styles.keyboardAvoidingView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <View style={styles.container}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <Text style={styles.title}>Add to Project</Text>
                  {businessData && (
                    <Text style={styles.subtitle}>{businessData.business_name}</Text>
                  )}
                </View>
                <TouchableOpacity 
                  style={styles.closeButton} 
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="close" size={24} color={colors.textMedium} />
                </TouchableOpacity>
              </View>
              
              {/* Content */}
              <View style={styles.content}>
                {renderContent()}
              </View>
              
              {/* Action Buttons */}
              {!loading && !error && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelActionButton]}
                    onPress={onClose}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelActionButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.addActionButton]}
                    onPress={handleAddToProject}
                    activeOpacity={0.7}
                    disabled={loading}
                  >
                    <Text style={styles.addActionButtonText}>
                      {isCreatingNewProject
                        ? 'Create & Add'
                        : selectedProjectId
                        ? 'Add to Project'
                        : 'Add to Queue'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.backdrop,
    justifyContent: 'flex-end',
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    backgroundColor: colors.backgroundWhite,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: screenHeight * 0.9,
    minHeight: screenHeight * 0.5,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMedium,
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  scrollContent: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textMedium,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 200,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.textWhite,
    fontSize: 16,
    fontWeight: '600',
  },
  businessInfo: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  businessName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
    marginBottom: 4,
  },
  businessIndustry: {
    fontSize: 14,
    color: colors.textMedium,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: 12,
    marginTop: 8,
  },
  projectsList: {
    marginBottom: 16,
  },
  projectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: colors.backgroundWhite,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  selectedProjectItem: {
    backgroundColor: '#E3F2FD',
    borderColor: colors.primary,
  },
  projectName: {
    fontSize: 16,
    color: colors.textDark,
    marginLeft: 12,
    flex: 1,
  },
  noProjectsText: {
    fontSize: 14,
    color: colors.textMedium,
    textAlign: 'center',
    marginVertical: 20,
    fontStyle: 'italic',
  },
  createNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    marginVertical: 16,
    backgroundColor: colors.backgroundWhite,
  },
  createNewText: {
    fontSize: 16,
    color: colors.primary,
    marginLeft: 12,
    fontWeight: '600',
  },
  createNewForm: {
    marginVertical: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: 16,
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    color: colors.textDark,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    maxHeight: 120,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cancelButtonText: {
    color: colors.textDark,
    fontSize: 16,
    fontWeight: '500',
  },
  createButton: {
    backgroundColor: colors.primary,
  },
  createButtonText: {
    color: colors.textWhite,
    fontWeight: '600',
    fontSize: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.backgroundWhite,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  cancelActionButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cancelActionButtonText: {
    color: colors.textDark,
    fontSize: 16,
    fontWeight: '600',
  },
  addActionButton: {
    backgroundColor: colors.primary,
  },
  addActionButtonText: {
    color: colors.textWhite,
    fontWeight: '600',
    fontSize: 16,
  },
});

export default AddToProjectSlider;
